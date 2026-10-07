import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { FilmCraftSession, runCli } from '../engine.js';
import {
  AUDIO_ONLY_FORMATS, DEFAULT_VIDEO_PRESET, EXPORT_FORMATS, EXPORT_FORMAT_IDS, ExportFormat, INPUT_EXTENSIONS,
  INTERCHANGE_FORMAT_IDS, INTRINSIC_AUDIO_EFFECTS, INTRINSIC_VIDEO_EFFECTS, InterchangeFormat, TICKS_PER_SECOND,
  formatFromExtension, toSeconds, toTicks,
} from '../formats.js';
import { resolveOutputPath, sameExt, stemOf, toEnginePath } from '../paths.js';

// ---------------------------------------------------------------- inputs

/** Absolute, existing files from explicit paths plus every importable file directly inside dir. */
export function collectInputs(paths: string[], dir?: string): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.win32.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.win32.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.win32.join(dir, name);
      const ext = path.win32.extname(name).slice(1).toLowerCase();
      if (INPUT_EXTENSIONS.includes(ext) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files: give input_path, input_paths or input_dir.');
  return out;
}

// ---------------------------------------------------------------- probe

export interface MediaInfo {
  name: string;
  kind: string;
  container: string | null;
  duration_seconds: number;
  file_size: number;
  video: null | { codec: string; width: number; height: number; fps: number; pixel_format?: string; has_alpha?: boolean; bitrate?: number };
  audio: null | { codec: string; channels: number; sample_rate: number; bits_per_sample: number | null };
  raw: Record<string, unknown>;
}

export async function probeMedia(input: string): Promise<MediaInfo> {
  const raw = JSON.parse(await runCli(['probe', input, '--compact'])) as Record<string, any>;
  const v = raw['video'];
  const a = raw['audio'];
  return {
    name: raw['name'],
    kind: raw['kind'],
    container: raw['container'] ?? null,
    duration_seconds: round3(toSeconds(Number(raw['duration'] ?? 0))),
    file_size: raw['file_size'],
    video: v
      ? {
          codec: v.codec,
          width: v.width,
          height: v.height,
          fps: v.frame_rate ? round3(v.frame_rate.num / v.frame_rate.den) : 0,
          pixel_format: v.pixel_format,
          has_alpha: v.has_alpha,
          bitrate: v.bitrate,
        }
      : null,
    audio: a ? { codec: a.codec, channels: a.channels, sample_rate: a.sample_rate, bits_per_sample: a.bits_per_sample } : null,
    raw,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------- sequence helpers

interface EffectState {
  effect: string;
}
interface ClipState {
  clip: number;
  item: number;
  name: string;
  start: number;
  duration: number;
  startFrame: number;
  durationFrames: number;
  effects: EffectState[];
}
interface TrackState {
  id: number;
  name: string;
  items: ClipState[];
}
export interface SequenceState {
  id: number;
  name: string;
  duration: number;
  durationFrames: number;
  settings: { width: number; height: number; frame_rate: { num: number; den: number }; sample_rate: number };
  video: TrackState[];
  audio: TrackState[];
}

export async function inspectSequence(s: FilmCraftSession): Promise<SequenceState> {
  return s.run<SequenceState>('sequence.inspect');
}

function allClips(seq: SequenceState, kind: 'video' | 'audio'): ClipState[] {
  return seq[kind].flatMap((t) => t.items);
}

function findClip(seq: SequenceState, clip: number): ClipState | undefined {
  return [...allClips(seq, 'video'), ...allClips(seq, 'audio')].find((c) => c.clip === clip);
}

export function sequenceFps(seq: SequenceState): number {
  const fr = seq.settings.frame_rate;
  return fr.num / fr.den;
}

/** Several clip commands (clear, speed, fit) act on the timeline selection: select the clips first. */
export async function selectClips(s: FilmCraftSession, clips: number[]): Promise<void> {
  await s.run('timeline.select', { clips, add: false, toggle: false });
}

/**
 * Saving or opening a .fcproj makes "FilmCraft Previews/<project>" next to it for render files.
 * Headless edits never render previews, so remove those folders when they are empty.
 */
export function removeEmptyPreviews(projectPath: string): void {
  const root = path.win32.join(path.win32.dirname(projectPath), 'FilmCraft Previews');
  const own = path.win32.join(root, stemOf(projectPath));
  for (const dir of [own, root]) {
    try {
      if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
    } catch {
      // in use or not empty: leave it
    }
  }
}

export interface OpenedMedia {
  item: number;
  sequence: number;
  /** Clips of the source on the timeline (V1 / A1), after the optional range was applied. */
  video: number[];
  audio: number[];
  seq: SequenceState;
}

/** Import files into the engine's project; returns their item ids (throws on any import error). */
export async function importMedia(s: FilmCraftSession, inputs: string[]): Promise<number[]> {
  const r = await s.run<{ items: number[]; errors: unknown[] }>('file.import', { paths: inputs.map(toEnginePath) });
  if (r.errors?.length) throw new Error(`FilmCraft could not import: ${JSON.stringify(r.errors)}`);
  if (!r.items?.length) throw new Error('FilmCraft imported nothing.');
  return r.items;
}

/**
 * Import one file and open it as a sequence that matches it (frame size, rate, audio),
 * optionally keeping only [start, end) seconds of it starting at 0.
 */
export async function openMedia(s: FilmCraftSession, input: string, range?: { start?: number; end?: number }): Promise<OpenedMedia> {
  const [item] = await importMedia(s, [input]);
  await s.run('project.select', { items: [item] });
  const created = await s.run<{ sequence: number; clips: number[] }>('file.newSequenceFromClip', { items: [item] });
  let seq = await inspectSequence(s);
  const full = toSeconds(seq.duration);
  const start = Math.max(0, range?.start ?? 0);
  const end = Math.min(full, range?.end ?? full);
  if (end <= start) throw new Error(`Empty range: start ${start} s, end ${end} s (media is ${round3(full)} s).`);
  if (start > 0 || end < full) {
    const clips = [...allClips(seq, 'video'), ...allClips(seq, 'audio')].map((c) => c.clip);
    await selectClips(s, clips);
    await s.run('edit.clear', { clips });
    await s.run('timeline.place', {
      item,
      track: 'V1',
      audioTrack: 'A1',
      time: 0,
      sourceIn: toTicks(start),
      duration: toTicks(end - start),
    });
    seq = await inspectSequence(s);
  }
  return {
    item,
    sequence: created.sequence,
    video: allClips(seq, 'video').map((c) => c.clip),
    audio: allClips(seq, 'audio').map((c) => c.clip),
    seq,
  };
}

// ---------------------------------------------------------------- effects

export const effectSchema = z.object({
  effect: z
    .string()
    .describe('Effect id or name from list_catalog (e.g. "gaussian_blur", "vignette", "lumetri", "motion", "highpass").'),
  params: z
    .record(z.string(), z.any())
    .optional()
    .describe('Parameter values, e.g. {"blurriness": 20}. Numbers, booleans, "#rrggbb" colours, [x, y] points or choice names/indexes.'),
  keyframes: z
    .record(z.string(), z.array(z.object({ seconds: z.number().min(0), value: z.any() })).min(1))
    .optional()
    .describe('Animate parameters: {"scale": [{"seconds": 0, "value": 100}, {"seconds": 2, "value": 130}]} (seconds from the clip start).'),
});
export type EffectSpec = z.infer<typeof effectSchema>;

/** Apply a chain of effects to one timeline clip; returns what was applied. */
export async function applyEffectChain(
  s: FilmCraftSession,
  clip: number,
  chain: EffectSpec[],
  kind: 'video' | 'audio',
): Promise<string[]> {
  const applied: string[] = [];
  const intrinsic = kind === 'video' ? INTRINSIC_VIDEO_EFFECTS : INTRINSIC_AUDIO_EFFECTS;
  for (const fx of chain) {
    let ref: string | number = fx.effect;
    if (!intrinsic.includes(fx.effect)) {
      const before = effectIds(findClip(await inspectSequence(s), clip));
      await s.run('effects.apply', { clips: [clip], effect: fx.effect });
      const after = effectIds(findClip(await inspectSequence(s), clip));
      // effects.apply inserts the new effect after the user's effects: the first position that changed
      const idx = after.findIndex((id, i) => id !== before[i]);
      ref = idx >= 0 ? idx : fx.effect;
    }
    const clipStart = findClip(await inspectSequence(s), clip)?.start ?? 0;
    for (const [param, value] of Object.entries(fx.params ?? {})) {
      await s.run('effects.setParam', { clip, effect: ref, param, value });
    }
    for (const [param, kfs] of Object.entries(fx.keyframes ?? {})) {
      await s.run('effects.toggleAnimation', { clip, effect: ref, param });
      for (const kf of kfs) {
        await s.run('effects.setParam', { clip, effect: ref, param, value: kf.value, time: clipStart + toTicks(kf.seconds) });
      }
    }
    applied.push(fx.effect);
  }
  return applied;
}

function effectIds(c: ClipState | undefined): string[] {
  return (c?.effects ?? []).map((e) => e.effect);
}

// ---------------------------------------------------------------- text

export const textSchema = z.object({
  text: z.string().min(1).describe('The text (any language; \\n for new lines).'),
  start: z.number().min(0).default(0).describe('Appears at this time (seconds from the start of the result).'),
  duration: z.number().positive().optional().describe('Seconds on screen. Default: until the end.'),
  placement: z
    .enum(['top', 'center', 'bottom', 'top_left', 'top_right', 'bottom_left', 'bottom_right'])
    .default('bottom')
    .describe('Where to put it (ignored when position is given).'),
  position: z.tuple([z.number(), z.number()]).optional().describe('Exact [x, y] in frame pixels of the text origin (alignment point on the first baseline).'),
  size: z.number().positive().default(90).describe('Font size in pixels.'),
  font: z.string().optional().describe('Font family, e.g. "Inter", "Arial".'),
  font_style: z.string().optional().describe('e.g. "Bold", "Italic".'),
  color: z.string().optional().describe('Fill colour "#rrggbb". Default white.'),
  align: z.enum(['left', 'center', 'right']).optional().describe('Paragraph alignment (default from placement).'),
  stroke_color: z.string().optional().describe('Outline colour; enables the outline.'),
  stroke_width: z.number().min(0).optional().describe('Outline width in pixels (default 6 when stroke_color is set).'),
  background_color: z.string().optional().describe('Box behind the text; enables it.'),
  background_opacity: z.number().min(0).max(100).optional(),
  shadow: z.boolean().optional().describe('Drop shadow.'),
  opacity: z.number().min(0).max(100).optional(),
  rotation: z.number().optional().describe('Degrees.'),
  box_width: z.number().min(0).optional().describe('Wrap the text at this width (paragraph text).'),
  roll: z.enum(['roll', 'crawlLeft', 'crawlRight']).optional().describe('Credits roll (bottom to top) or crawl.'),
  props: z.record(z.string(), z.any()).optional().describe('Any other graphics.set property (tracking, leading, stroke_type, shadow_blur...).'),
  effects: z.array(effectSchema).max(20).optional().describe('Effects on the text clip, e.g. animations "grow", "move", "spin", "wiggle", "drop_shadow".'),
});
export type TextSpec = z.infer<typeof textSchema>;

export async function addText(s: FilmCraftSession, t: TextSpec, seq: SequenceState): Promise<{ clip: number; text: string }> {
  const total = toSeconds(seq.duration);
  const start = Math.min(t.start, Math.max(0, total - 1 / sequenceFps(seq)));
  const seconds = t.duration ?? Math.max(1 / sequenceFps(seq), total - start);
  const created = await s.run<{ clip: number; layer: number }>('graphics.newText', {
    text: t.text,
    size: t.size,
    seconds,
    time: toTicks(start),
    newClip: true,
    ...(t.font ? { font: t.font } : {}),
    ...(t.font_style ? { fontStyle: t.font_style } : {}),
  });
  const { width: w, height: h } = seq.settings;
  const margin = Math.round(Math.min(w, h) * 0.06);
  const place: Record<string, { pos: [number, number]; align: 'left' | 'center' | 'right' }> = {
    top: { pos: [w / 2, margin + t.size], align: 'center' },
    center: { pos: [w / 2, h / 2 + t.size / 3], align: 'center' },
    bottom: { pos: [w / 2, h - margin * 2], align: 'center' },
    top_left: { pos: [margin, margin + t.size], align: 'left' },
    top_right: { pos: [w - margin, margin + t.size], align: 'right' },
    bottom_left: { pos: [margin, h - margin * 2], align: 'left' },
    bottom_right: { pos: [w - margin, h - margin * 2], align: 'right' },
  };
  const p = place[t.placement];
  const props: Record<string, unknown> = {
    align: capitalize(t.align ?? p.align),
    position: t.position ?? p.pos.map(Math.round),
  };
  if (t.color) props['fill_color'] = t.color;
  if (t.stroke_color || t.stroke_width) {
    props['stroke'] = true;
    if (t.stroke_color) props['stroke_color'] = t.stroke_color;
    props['stroke_width'] = t.stroke_width ?? 6;
  }
  if (t.background_color || t.background_opacity !== undefined) {
    props['background'] = true;
    if (t.background_color) props['background_color'] = t.background_color;
    if (t.background_opacity !== undefined) props['background_opacity'] = t.background_opacity;
  }
  if (t.shadow !== undefined) props['shadow'] = t.shadow;
  if (t.opacity !== undefined) props['opacity'] = t.opacity;
  if (t.rotation !== undefined) props['rotation'] = t.rotation;
  if (t.box_width !== undefined) props['box_width'] = t.box_width;
  Object.assign(props, t.props ?? {});
  await s.run('graphics.set', { clip: created.clip, layer: created.layer, props });
  if (t.roll) await s.run('graphics.setRoll', { clip: created.clip, mode: t.roll });
  if (t.effects?.length) await applyEffectChain(s, created.clip, t.effects, 'video');
  return { clip: created.clip, text: t.text };
}

function capitalize(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// ---------------------------------------------------------------- export

export const exportOptionsSchema = {
  preset: z
    .string()
    .optional()
    .describe('Export preset name (list_catalog kind=export_presets), e.g. "Social Vertical 1080×1920", "YouTube 1080p Full HD", "Apple ProRes 422".'),
  format: z
    .enum(EXPORT_FORMAT_IDS)
    .optional()
    .describe('h264 (.mp4), prores/dnxhr/mjpeg (.mov), mxf-op1a/mxf-opatom (.mxf), gif, png/tiff/bmp (stills), wav/aiff (audio only). Default: from the output extension, else H.264 Match Source (video) or WAV (audio).'),
  width: z.number().int().positive().optional().describe('Output width in pixels.'),
  height: z.number().int().positive().optional().describe('Output height in pixels.'),
  fps: z.number().positive().optional().describe('Output frame rate.'),
  bitrate_kbps: z.number().int().positive().optional().describe('Video bitrate (H.264).'),
  quality: z.number().min(0).max(100).optional().describe('Encoder quality 0..100.'),
  include_audio: z.boolean().default(true).describe('false = export the picture without sound.'),
  loudness_lufs: z.number().max(0).optional().describe('Normalize the program loudness to this target (e.g. -14 for social, -23 for broadcast).'),
  prores_profile: z.enum(['proxy', 'lt', 'standard', 'hq']).optional(),
  overwrite: z.boolean().default(false).describe('Replace existing output files.'),
};

export const editableOptionsSchema = {
  save_project: z
    .boolean()
    .default(false)
    .describe('Also save the edit as a FilmCraft project (.fcproj) next to the result, to keep editing it in FilmCraft.'),
  interchange: z
    .array(z.enum(INTERCHANGE_FORMAT_IDS))
    .max(5)
    .optional()
    .describe('Also export the timeline for other editors: otio (OpenTimelineIO), fcpxml (Final Cut Pro / DaVinci), xml (Premiere / FCP7), edl, aaf (Avid / Pro Tools).'),
};

export interface ExportOptions {
  preset?: string;
  format?: ExportFormat;
  width?: number;
  height?: number;
  fps?: number;
  bitrate_kbps?: number;
  quality?: number;
  include_audio?: boolean;
  loudness_lufs?: number;
  prores_profile?: 'proxy' | 'lt' | 'standard' | 'hq';
  overwrite?: boolean;
}

export interface ExportPreset {
  name: string;
  format: string;
  extension: string;
  category: string;
  description: string;
  frameSize: [number, number] | null;
}

let presetCache: ExportPreset[] | undefined;
export async function exportPresets(): Promise<ExportPreset[]> {
  if (!presetCache) presetCache = JSON.parse(await runCli(['export', '--list-presets', '--compact'])) as ExportPreset[];
  return presetCache;
}

/** Decide preset/format and the file extension of an export. */
export async function planExport(
  opts: ExportOptions,
  hasVideo: boolean,
  outputPath?: string,
): Promise<{ ext: string; params: Record<string, unknown> }> {
  const params: Record<string, unknown> = {};
  let ext: string;
  if (opts.preset) {
    const presets = await exportPresets();
    const p = presets.find((x) => x.name === opts.preset) ?? presets.find((x) => x.name.toLowerCase() === opts.preset!.toLowerCase());
    if (!p) throw new Error(`Unknown export preset "${opts.preset}". Use list_catalog with kind=export_presets.`);
    params['preset'] = p.name;
    ext = p.extension;
    if (opts.format) params['format'] = opts.format;
  } else {
    const fromExt = outputPath ? formatFromExtension(path.win32.extname(outputPath)) : undefined;
    const fmt: ExportFormat = opts.format ?? fromExt ?? (hasVideo ? 'h264' : 'wav');
    if (!hasVideo && !AUDIO_ONLY_FORMATS.includes(fmt)) {
      throw new Error(`The source has no picture: export it as wav or aiff, not ${fmt}.`);
    }
    if (fmt === 'h264' && !opts.bitrate_kbps && opts.quality === undefined && !opts.format) params['preset'] = DEFAULT_VIDEO_PRESET;
    params['format'] = fmt;
    ext = EXPORT_FORMATS[fmt];
  }
  if (outputPath) {
    const cur = path.win32.extname(outputPath).slice(1);
    // .mov is a valid container for prores/dnxhr/mjpeg; keep what the caller asked for when compatible
    if (cur && sameExt(cur, ext)) ext = cur.toLowerCase();
  }
  if (opts.width) params['width'] = opts.width;
  if (opts.height) params['height'] = opts.height;
  if (opts.fps) params['fps'] = opts.fps;
  if (opts.bitrate_kbps) params['bitrateKbps'] = opts.bitrate_kbps;
  if (opts.quality !== undefined) params['quality'] = opts.quality;
  if (opts.include_audio === false) params['audio'] = false;
  if (opts.loudness_lufs !== undefined) params['loudnessLufs'] = opts.loudness_lufs;
  if (opts.prores_profile) params['proresProfile'] = opts.prores_profile;
  return { ext, params };
}

export interface ExportResult {
  path: string;
  bytes?: number;
  frames?: number;
  seconds_to_render?: number;
}

/** Export the active sequence (whole, or [start, end) seconds) and wait for the file. */
export async function exportActive(
  s: FilmCraftSession,
  outPath: string,
  params: Record<string, unknown>,
  range?: { start: number; end: number },
): Promise<ExportResult> {
  mkdirSync(path.win32.dirname(outPath), { recursive: true });
  const r = await s.run<{ result?: { bytes?: number; frames?: number; seconds?: number; path?: string } }>('file.exportMedia', {
    path: toEnginePath(outPath),
    ...params,
    ...(range ? { range: 'custom', startSeconds: range.start, endSeconds: range.end } : {}),
    wait: true,
  });
  if (!existsSync(outPath)) throw new Error(`FilmCraft finished but ${outPath} was not written.`);
  return { path: outPath, bytes: r?.result?.bytes, frames: r?.result?.frames, seconds_to_render: r?.result?.seconds };
}

/** Save the session as .fcproj and/or interchange files beside basePath (<dir>/<stem>.<ext>). */
export async function saveEditable(
  s: FilmCraftSession,
  basePath: string,
  opts: { save_project?: boolean; interchange?: InterchangeFormat[]; overwrite?: boolean },
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const dir = path.win32.dirname(basePath);
  const stem = stemOf(basePath);
  const target = (ext: string) => {
    const r = resolveOutputPath({ inputPath: path.win32.join(dir, `${stem}.__src`), ext, outputDir: dir, overwrite: opts.overwrite });
    if ('error' in r) throw new Error(r.error);
    return r.path;
  };
  if (opts.save_project) {
    const p = target('fcproj');
    await s.run('file.saveAs', { path: toEnginePath(p) });
    removeEmptyPreviews(p);
    out['fcproj'] = p;
  }
  for (const fmt of opts.interchange ?? []) {
    const p = target(fmt);
    if (fmt === 'aaf') await s.run('file.exportAaf', { path: toEnginePath(p) });
    else await s.run('file.exportInterchange', { format: fmt, path: toEnginePath(p) });
    out[fmt] = p;
  }
  return out;
}

// ---------------------------------------------------------------- split

export interface SplitPiece {
  index: number;
  path: string;
  start: number;
  end: number;
}

/** Piece boundaries: [start, end) every segment seconds; a tail shorter than minLast is dropped. */
export function splitBoundaries(total: number, segment: number, minLast: number, start = 0, end?: number): { start: number; end: number }[] {
  const stop = Math.min(total, end ?? total);
  const out: { start: number; end: number }[] = [];
  const eps = 1e-6;
  for (let t = start, i = 0; t < stop - eps; i++, t = start + i * segment) {
    const e = Math.min(stop, t + segment);
    out.push({ start: round6(t), end: round6(e) });
  }
  if (out.length > 1 && minLast > 0) {
    const last = out[out.length - 1];
    if (last.end - last.start < minLast - eps) out.pop();
  }
  return out;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export async function splitMedia(
  s: FilmCraftSession,
  opts: {
    input: string;
    outputDir: string;
    segmentSeconds: number;
    prefix?: string;
    minLastSeconds: number;
    start?: number;
    end?: number;
    output: ExportOptions;
    editable: { save_project?: boolean; interchange?: InterchangeFormat[] };
  },
): Promise<Record<string, unknown>> {
  const opened = await openMedia(s, opts.input);
  const hasVideo = opened.video.length > 0;
  const total = toSeconds(opened.seq.duration);
  const fps = sequenceFps(opened.seq);
  // cut on frame boundaries so every piece has whole frames
  const frame = hasVideo && fps > 0 ? 1 / fps : 0;
  const snap = (t: number) => (frame ? Math.round(t / frame) * frame : t);
  const bounds = splitBoundaries(total, opts.segmentSeconds, opts.minLastSeconds, opts.start ?? 0, opts.end).map((b) => ({
    start: round6(snap(b.start)),
    end: round6(Math.min(total, snap(b.end))),
  }));
  if (!bounds.length) throw new Error('Nothing to split in that range.');
  const plan = await planExport(opts.output, hasVideo);
  const prefix = opts.prefix ?? stemOf(opts.input);
  const digits = Math.max(3, String(bounds.length).length);
  mkdirSync(opts.outputDir, { recursive: true });
  const pieces: SplitPiece[] = [];
  for (let i = 0; i < bounds.length; i++) {
    const name = `${prefix}_${String(i + 1).padStart(digits, '0')}`;
    const r = resolveOutputPath({
      inputPath: path.win32.join(opts.outputDir, `${name}.__src`),
      ext: plan.ext,
      outputDir: opts.outputDir,
      overwrite: opts.output.overwrite,
    });
    if ('error' in r) throw new Error(r.error);
    await exportActive(s, r.path, plan.params, bounds[i]);
    pieces.push({ index: i + 1, path: r.path, start: bounds[i].start, end: bounds[i].end });
  }
  let editable: Record<string, string> = {};
  if (opts.editable.save_project || opts.editable.interchange?.length) {
    // the editable version: the source with a cut at every boundary on all tracks
    for (const b of bounds.slice(1)) await s.run('sequence.addEditAllTracks', { time: toTicks(b.start) });
    if (bounds[bounds.length - 1].end < total - 1e-6) await s.run('sequence.addEditAllTracks', { time: toTicks(bounds[bounds.length - 1].end) });
    editable = await saveEditable(s, path.win32.join(opts.outputDir, `${prefix}_split.__src`), { ...opts.editable, overwrite: opts.output.overwrite });
  }
  return {
    success: true,
    input: opts.input,
    output_dir: opts.outputDir,
    source_seconds: round3(total),
    segment_seconds: opts.segmentSeconds,
    count: pieces.length,
    files: pieces,
    ...(Object.keys(editable).length ? { editable } : {}),
  };
}

// ---------------------------------------------------------------- edit

export const audioEffectHint = 'Audio clip effects: volume{level dB}, amplify{gain}, highpass{cutoff}, lowpass{cutoff}, parametric_eq, dynamics, hard_limiter, denoise{amount}, dehummer, deesser, studio_reverb, delay, pitch_shifter{semitones}, speech_enhance...';

export interface EditSpec {
  start?: number;
  end?: number;
  effects?: EffectSpec[];
  color_preset?: string;
  texts?: TextSpec[];
  speed_percent?: number;
  reverse?: boolean;
  audio_effects?: EffectSpec[];
  volume_db?: number;
  mute?: boolean;
  fade_in?: number;
  fade_out?: number;
  fade_transition?: string;
}

/** Build the edit in the session (open + trim + effects + colour + speed + audio + fades + texts). */
export async function buildEdit(s: FilmCraftSession, input: string, spec: EditSpec): Promise<{ opened: OpenedMedia; applied: Record<string, unknown> }> {
  const opened = await openMedia(s, input, { start: spec.start, end: spec.end });
  const applied: Record<string, unknown> = {};
  const v = opened.video;
  const a = opened.audio;
  if (spec.speed_percent !== undefined || spec.reverse) {
    await selectClips(s, [...v, ...a]);
    await s.run('clip.speedDuration', {
      clips: [...v, ...a],
      speed: spec.speed_percent ?? 100,
      reverse: !!spec.reverse,
      ripple: true,
    });
    applied['speed_percent'] = spec.speed_percent ?? 100;
    if (spec.reverse) applied['reverse'] = true;
  }
  if (spec.effects?.length) {
    if (!v.length) throw new Error('effects need a picture; this file is audio only (use audio_effects).');
    for (const c of v) applied['effects'] = await applyEffectChain(s, c, spec.effects, 'video');
  }
  if (spec.color_preset) {
    if (!v.length) throw new Error('color_preset needs a picture.');
    await s.run('lumetri.applyPreset', { name: spec.color_preset, clips: v });
    applied['color_preset'] = spec.color_preset;
  }
  if (spec.audio_effects?.length) {
    if (!a.length) throw new Error('audio_effects: this file has no sound.');
    for (const c of a) applied['audio_effects'] = await applyEffectChain(s, c, spec.audio_effects, 'audio');
  }
  if (spec.volume_db !== undefined && a.length) {
    for (const c of a) await s.run('effects.setParam', { clip: c, effect: 'volume', param: 'level', value: spec.volume_db });
    applied['volume_db'] = spec.volume_db;
  }
  if (spec.mute && a.length) {
    await selectClips(s, a);
    await s.run('edit.clear', { clips: a });
    applied['mute'] = true;
  }
  const seq = await inspectSequence(s);
  const fps = sequenceFps(seq);
  const fades: string[] = [];
  const transition = spec.fade_transition ?? 'dip_to_black';
  const clipsNow = { v: allClips(seq, 'video').filter((c) => v.includes(c.clip)), a: spec.mute ? [] : allClips(seq, 'audio').filter((c) => a.includes(c.clip)) };
  for (const [edge, secs] of [['in', spec.fade_in], ['out', spec.fade_out]] as const) {
    if (!secs) continue;
    const frames = Math.max(1, Math.round(secs * fps));
    for (const c of clipsNow.v) await s.run('sequence.applyVideoTransition', { clip: c.clip, effect: transition, frames, edge });
    for (const c of clipsNow.a) await s.run('sequence.applyAudioTransition', { clip: c.clip, effect: 'constant_power', frames, edge });
    fades.push(`${edge} ${secs}s`);
  }
  if (fades.length) applied['fades'] = fades;
  if (spec.texts?.length) {
    if (!v.length) throw new Error('texts need a picture; this file is audio only.');
    const added = [];
    for (const t of spec.texts) added.push(await addText(s, t, seq));
    applied['texts'] = added.map((t) => t.text);
  }
  return { opened: { ...opened, seq: await inspectSequence(s) }, applied };
}

// ---------------------------------------------------------------- concat

export const pieceSchema = z.object({
  path: z.string().describe('Absolute path of a video, audio or image file.'),
  start: z.number().min(0).optional().describe('Use the file from this time (seconds).'),
  end: z.number().min(0).optional().describe('Use the file up to this time (seconds).'),
  seconds: z.number().positive().optional().describe('Still images: how long to show it (default 5 s).'),
});
export type PieceSpec = z.infer<typeof pieceSchema>;

export async function buildConcat(
  s: FilmCraftSession,
  pieces: PieceSpec[],
  opts: { transition?: string; transition_seconds: number; width?: number; height?: number; fps?: number; fit: 'fit' | 'fill' | 'none' },
): Promise<{ seq: SequenceState; hasVideo: boolean; placed: { path: string; start: number; end: number }[] }> {
  const items = await importMedia(s, pieces.map((p) => p.path));
  if (items.length !== pieces.length) throw new Error(`Imported ${items.length} of ${pieces.length} files.`);
  await s.run('project.select', { items: [items[0]] });
  await s.run('file.newSequenceFromClip', { items: [items[0]] });
  let seq = await inspectSequence(s);
  if (opts.width || opts.height || opts.fps) {
    await s.run('sequence.settings', {
      ...(opts.width ? { width: opts.width } : {}),
      ...(opts.height ? { height: opts.height } : {}),
      ...(opts.fps ? { fps: opts.fps } : {}),
    });
  }
  const firstClips = [...allClips(seq, 'video'), ...allClips(seq, 'audio')].map((c) => c.clip);
  await selectClips(s, firstClips);
  await s.run('edit.clear', { clips: firstClips });
  let t = 0;
  const placed: { path: string; start: number; end: number }[] = [];
  const videoClips: number[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const params: Record<string, unknown> = { item: items[i], track: 'V1', audioTrack: 'A1', time: toTicks(t) };
    if (p.start !== undefined) params['sourceIn'] = toTicks(p.start);
    if (p.end !== undefined) params['duration'] = toTicks(p.end - (p.start ?? 0));
    else if (p.seconds !== undefined) params['duration'] = toTicks(p.seconds);
    const r = await s.run<{ clips: number[] }>('timeline.place', params);
    seq = await inspectSequence(s);
    const mine = [...allClips(seq, 'video'), ...allClips(seq, 'audio')].filter((c) => r.clips.includes(c.clip));
    const len = Math.max(0, ...mine.map((c) => toSeconds(c.duration)));
    const vids = allClips(seq, 'video').filter((c) => r.clips.includes(c.clip)).map((c) => c.clip);
    videoClips.push(...vids);
    if (opts.fit !== 'none' && vids.length) {
      // fit / fill act on the timeline selection
      await selectClips(s, vids);
      await s.run(opts.fit === 'fit' ? 'clip.fitToFrame' : 'clip.fillFrame', { clips: vids });
    }
    placed.push({ path: p.path, start: round3(t), end: round3(t + len) });
    t += len;
  }
  if (opts.transition && opts.transition_seconds > 0) {
    const fps = sequenceFps(seq);
    const frames = Math.max(1, Math.round(opts.transition_seconds * fps));
    for (const c of videoClips.slice(0, -1)) {
      await s.run('sequence.applyVideoTransition', { clip: c, effect: opts.transition, frames, edge: 'out' });
    }
  }
  seq = await inspectSequence(s);
  return { seq, hasVideo: allClips(seq, 'video').length > 0, placed };
}

export { TICKS_PER_SECOND };
