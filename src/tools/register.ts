import { mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, resolveDataDir, resolveInstall } from '../config.js';
import { runCli, withSession } from '../engine.js';
import { EXPORT_FORMATS, INPUT_EXTENSIONS, INTERCHANGE_FORMAT_IDS, TICKS_PER_SECOND, toSeconds } from '../formats.js';
import { resolveOutputPath, stemOf, toEnginePath } from '../paths.js';
import { controlPortOpen, filmcraftRunning, openInFilmCraft } from './app.js';
import {
  EditSpec, ExportOptions, audioEffectHint, buildConcat, buildEdit, collectInputs, editableOptionsSchema, effectSchema,
  exportActive, exportOptionsSchema, exportPresets, importMedia, inspectSequence, openMedia, pieceSchema, planExport,
  probeMedia, removeEmptyPreviews, saveEditable, splitMedia, textSchema,
} from './operations.js';

type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
type ToolResult = { content: Content[]; isError?: boolean };

function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const inputsSchema = {
  input_path: z.string().optional().describe('Absolute path of one video, audio or image file.'),
  input_paths: z.array(z.string()).max(500).optional().describe('Absolute paths of several files.'),
  input_dir: z.string().optional().describe(`Absolute folder: every media file directly inside it (non-recursive; ${INPUT_EXTENSIONS.length} extensions).`),
};

function inputsOf(a: { input_path?: string; input_paths?: string[]; input_dir?: string }): string[] {
  return collectInputs([...(a.input_path ? [a.input_path] : []), ...(a.input_paths ?? [])], a.input_dir);
}

const editSchema = {
  start: z.number().min(0).optional().describe('Keep the source from this time (seconds).'),
  end: z.number().min(0).optional().describe('Keep the source up to this time (seconds).'),
  effects: z
    .array(effectSchema)
    .max(50)
    .optional()
    .describe(
      'Video effects in order, e.g. [{"effect":"gaussian_blur","params":{"blurriness":15}},{"effect":"vignette","params":{"amount":-60}}]. ' +
        '130 effects (list_catalog kind=video_effects): blur, sharpen, black_white, proc_amp, levels, tint, mosaic, posterize, noise, glow, ' +
        'rgb_split, lens_flare, light_leaks, camera_shake, mirror, twirl, wave_warp, crop, horizontal_flip, drop_shadow, lumetri... ' +
        'Intrinsic "motion" (position, scale, rotation) and "opacity" can be set and keyframed too.',
    ),
  color_preset: z
    .string()
    .optional()
    .describe('Lumetri look: Teal Shadows, Warm Skin · Night Exterior · Golden Dusk · Steel Blue · Hard Sun · Faded Print · Silver Retention · Cross Processed · Warm Negative · Neutral Mono · Hard Mono · Sepia Tone · Cold Mono · Lift Shadows · Protect Highlights · Half Saturation · Boost Vibrance · Legal Range Squeeze.'),
  texts: z.array(textSchema).max(30).optional().describe('Titles / captions burned over the picture, each with its own timing, placement and style.'),
  speed_percent: z.number().min(1).max(10000).optional().describe('Playback speed (200 = twice as fast, 50 = slow motion). Duration changes accordingly.'),
  reverse: z.boolean().optional().describe('Play backwards.'),
  audio_effects: z.array(effectSchema).max(30).optional().describe(audioEffectHint),
  volume_db: z.number().min(-96).max(24).optional().describe('Clip volume change in dB.'),
  mute: z.boolean().optional().describe('Remove the sound.'),
  fade_in: z.number().min(0).optional().describe('Fade in from black (and audio) over these seconds.'),
  fade_out: z.number().min(0).optional().describe('Fade out to black (and audio) over these seconds.'),
  fade_transition: z.string().optional().describe('Transition used for fades (default dip_to_black; e.g. dip_to_white, cross_dissolve).'),
};

export function registerTools(server: McpServer): void {
  server.registerTool(
    'split_video',
    {
      title: 'Split video into segments',
      description:
        'Cut one or many video (or audio) files into consecutive pieces of segment_seconds with FilmCraft\'s engine, frame-accurate. ' +
        'Every input gets its own folder of numbered pieces (<name>_001.mp4, <name>_002.mp4...): output_dir/<input name>/ when ' +
        'output_dir is given (group_by_input), otherwise <input folder>/<input name>_segments/. Pieces keep the source frame size, ' +
        'rate and sound unless preset/format/width/height/fps say otherwise. save_project / interchange also write the source cut at ' +
        'every boundary as an editable timeline. Returns every file with its start/end time.',
      inputSchema: {
        ...inputsSchema,
        segment_seconds: z.number().min(0.05).max(86400).default(10).describe('Length of each piece in seconds. The last piece can be shorter.'),
        output_dir: z.string().optional().describe('Absolute folder for the pieces (created if missing).'),
        group_by_input: z.boolean().default(true).describe("With output_dir: put each input's pieces in a subfolder named after the input."),
        prefix: z.string().optional().describe('File name prefix. Default: the input file name.'),
        min_last_seconds: z.number().min(0).default(0.25).describe('Drop the final piece when it is shorter than this (avoids 1-frame tails; 0 = always keep it).'),
        start: z.number().min(0).optional().describe('Only split from this time (seconds).'),
        end: z.number().min(0).optional().describe('Only split up to this time (seconds).'),
        ...exportOptionsSchema,
        ...editableOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        const results: Record<string, unknown>[] = [];
        let ok = 0;
        let files = 0;
        for (const input of inputs) {
          const stem = stemOf(input);
          const outDir = args.output_dir
            ? args.group_by_input
              ? path.join(args.output_dir, stem)
              : args.output_dir
            : path.join(path.dirname(input), `${stem}_segments`);
          if (args.output_dir && !path.isAbsolute(args.output_dir)) throw new Error('output_dir must be an absolute path.');
          try {
            const r = await withSession((s) =>
              splitMedia(s, {
                input,
                outputDir: outDir,
                segmentSeconds: args.segment_seconds,
                prefix: args.prefix ? (inputs.length > 1 && !args.group_by_input ? `${args.prefix}_${stem}` : args.prefix) : undefined,
                minLastSeconds: args.min_last_seconds,
                start: args.start,
                end: args.end,
                output: args,
                editable: args,
              }),
            );
            ok++;
            files += Number(r['count'] ?? 0);
            results.push(r);
          } catch (e) {
            results.push({ success: false, input, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return json({ success: ok === inputs.length, inputs: inputs.length, succeeded: ok, total_files: files, results }, ok === 0);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'edit_video',
    {
      title: 'Edit video: effects, color, text, speed, audio',
      description:
        'Apply an edit to one or many files and export each result (default <name>_edit.mp4 next to the input): keep a range, ' +
        'video effects with parameters and keyframes, a Lumetri color look, burned-in texts (titles, captions, lower thirds; ' +
        'animated with effects like grow/move/spin), speed / reverse, audio effects and volume, fades. ' +
        'save_project / interchange also keep the edit editable (.fcproj, OTIO, FCPXML, XML, EDL, AAF). ' +
        'Example: {"effects":[{"effect":"vignette"}],"color_preset":"Golden Dusk","texts":[{"text":"Hola","placement":"bottom","color":"#ffcc00"}]}.',
      inputSchema: {
        ...inputsSchema,
        ...editSchema,
        output_path: z.string().optional().describe('Absolute output file (single input only).'),
        output_dir: z.string().optional().describe('Absolute folder for the results. Default: next to each input.'),
        suffix: z.string().default('_edit').describe('Added to the file name when output_path is not given.'),
        ...exportOptionsSchema,
        ...editableOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (args.output_path && inputs.length > 1) throw new Error('output_path only works with one input; use output_dir.');
        if (args.output_dir) mkdirSync(args.output_dir, { recursive: true });
        const results: Record<string, unknown>[] = [];
        let ok = 0;
        for (const input of inputs) {
          try {
            results.push(await withSession(async (s) => editOne(s, input, args, args)));
            ok++;
          } catch (e) {
            results.push({ success: false, input, error: e instanceof Error ? e.message : String(e) });
          }
        }
        if (inputs.length === 1) return json(results[0], !ok);
        return json({ success: ok === inputs.length, total: inputs.length, succeeded: ok, results }, ok === 0);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'trim_video',
    {
      title: 'Trim video',
      description:
        'Keep only the part between start and end (seconds) of a video or audio file, optionally with fades, and save it as a new file ' +
        '(default <name>_trim.<ext> next to the input).',
      inputSchema: {
        input_path: z.string().describe('Absolute path of the file.'),
        start: z.number().min(0).default(0).describe('Start time in seconds.'),
        end: z.number().min(0).optional().describe('End time in seconds. Default: end of the file.'),
        fade_in: z.number().min(0).optional().describe('Fade-in length in seconds.'),
        fade_out: z.number().min(0).optional().describe('Fade-out length in seconds.'),
        output_path: z.string().optional().describe('Absolute output file.'),
        ...exportOptionsSchema,
        ...editableOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        return json(
          await withSession((s) =>
            editOne(s, input, { start: args.start, end: args.end, fade_in: args.fade_in, fade_out: args.fade_out }, { ...args, suffix: '_trim' }),
          ),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'concat_videos',
    {
      title: 'Join videos',
      description:
        'Put videos, images and audio files one after another on a timeline and export one file, with an optional transition between ' +
        'them (cross_dissolve, dip_to_black, push, slide, whip, zoom_blur, glitch... 112 in list_catalog kind=video_transitions). ' +
        'The timeline takes the frame size/rate of the first file unless width/height/fps are given; other sizes are fitted.',
      inputSchema: {
        inputs: z.array(z.union([z.string(), pieceSchema])).min(1).max(500).describe('Files in order (paths or {path,start,end,seconds}).'),
        output_path: z.string().describe('Absolute output file.'),
        transition: z.string().optional().describe('Video transition id between consecutive files.'),
        transition_seconds: z.number().min(0).default(0.5),
        timeline_width: z.number().int().positive().optional().describe('Timeline width (default: the first file).'),
        timeline_height: z.number().int().positive().optional().describe('Timeline height.'),
        timeline_fps: z.number().positive().optional().describe('Timeline frame rate.'),
        fit: z.enum(['fit', 'fill', 'none']).default('fit').describe('How files of another size fill the frame.'),
        ...exportOptionsSchema,
        ...editableOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const pieces = args.inputs.map((i) => (typeof i === 'string' ? { path: i } : i));
        collectInputs(pieces.map((p) => p.path));
        return json(
          await withSession(async (s) => {
            const built = await buildConcat(s, pieces, { ...args, width: args.timeline_width, height: args.timeline_height, fps: args.timeline_fps });
            const plan = await planExport(args, built.hasVideo, args.output_path);
            const out = resolveOutputPath({ inputPath: pieces[0].path, ext: plan.ext, outputPath: args.output_path, overwrite: args.overwrite });
            if ('error' in out) throw new Error(out.error);
            const exp = await exportActive(s, out.path, plan.params);
            const editable = await saveEditable(s, out.path, args);
            return {
              success: true,
              output: exp,
              duration_seconds: Math.round(toSeconds(built.seq.duration) * 1000) / 1000,
              pieces: built.placed,
              ...(Object.keys(editable).length ? { editable } : {}),
            };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'convert_media',
    {
      title: 'Convert / export media',
      description:
        'Re-export one or many files with FilmCraft: change codec/container (H.264 MP4, ProRes / DNxHR / MJPEG MOV, MXF, animated GIF, ' +
        'PNG/TIFF/BMP stills), frame size, frame rate, bitrate or loudness, use an export preset (YouTube, Vimeo, Social Vertical, ' +
        'ProRes, DNxHR...), or extract the sound as WAV/AIFF. Imports MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, MP3, WAV, FLAC, AIFF, ' +
        'Ogg, M4A, PNG, JPEG, TIFF and more.',
      inputSchema: {
        ...inputsSchema,
        output_path: z.string().optional().describe('Absolute output file (single input only).'),
        output_dir: z.string().optional().describe('Absolute folder for the results. Default: next to each input.'),
        start: z.number().min(0).optional().describe('Only this part: from (seconds).'),
        end: z.number().min(0).optional().describe('Only this part: to (seconds).'),
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (args.output_path && inputs.length > 1) throw new Error('output_path only works with one input; use output_dir.');
        const results: Record<string, unknown>[] = [];
        let ok = 0;
        for (const input of inputs) {
          try {
            results.push(
              await withSession(async (s) => {
                const opened = await openMedia(s, input, { start: args.start, end: args.end });
                const plan = await planExport(args, opened.video.length > 0, args.output_path);
                const out = resolveOutputPath({
                  inputPath: input,
                  ext: plan.ext,
                  suffix: '_conv',
                  outputPath: args.output_path,
                  outputDir: args.output_dir,
                  overwrite: args.overwrite,
                });
                if ('error' in out) throw new Error(out.error);
                return { success: true, input, output: await exportActive(s, out.path, plan.params) };
              }),
            );
            ok++;
          } catch (e) {
            results.push({ success: false, input, error: e instanceof Error ? e.message : String(e) });
          }
        }
        if (inputs.length === 1) return json(results[0], !ok);
        return json({ success: ok === inputs.length, total: inputs.length, succeeded: ok, results }, ok === 0);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_media_info',
    {
      title: 'Media file info',
      description: 'Container, duration, video codec / size / frame rate / pixel format and audio codec / channels / sample rate of a media file.',
      inputSchema: { input_path: z.string().describe('Absolute path of the file.') },
      annotations: READ,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        return json({ success: true, input, ...(await probeMedia(input)) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_frame',
    {
      title: 'Render a frame',
      description:
        'Render one frame of a media file or a .fcproj project (at seconds) to PNG and show it. Useful to check an edit, a look or a title ' +
        'before exporting. Saved as output_path or <name>_frame_<seconds>s.png next to the input.',
      inputSchema: {
        input_path: z.string().describe('Absolute path of a media file or a .fcproj project.'),
        seconds: z.number().min(0).default(0).describe('Time in seconds.'),
        max_side: z.number().int().min(64).max(8192).default(960).describe('Longest side of the PNG.'),
        output_path: z.string().optional().describe('Absolute .png path.'),
        overwrite: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        const out = resolveOutputPath({
          inputPath: input,
          ext: 'png',
          suffix: `_frame_${String(args.seconds).replace('.', '_')}s`,
          outputPath: args.output_path,
          overwrite: args.overwrite,
        });
        if ('error' in out) throw new Error(out.error);
        const image = await withSession(async (s) => {
          if (/\.fcproj$/i.test(input)) await s.run('file.open', { path: toEnginePath(input) });
          else await openMedia(s, input);
          const r = await s.tool('render_frame', { seconds: args.seconds, max_side: args.max_side });
          const img = (r.content ?? []).find((c) => c.type === 'image');
          if (!img?.data) throw new Error('FilmCraft returned no image.');
          return img;
        });
        if (/\.fcproj$/i.test(input)) removeEmptyPreviews(input);
        writeFileSync(out.path, Buffer.from(image.data!, 'base64'));
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, input, seconds: args.seconds, output: out.path }, null, 2) },
            { type: 'image', data: image.data!, mimeType: image.mimeType ?? 'image/png' },
          ],
        };
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'list_catalog',
    {
      title: 'List effects, looks, presets, commands',
      description:
        'What FilmCraft can do: video_effects (130, with parameter names), audio_effects (58), video_transitions (112), ' +
        'audio_transitions, lumetri_presets (color looks), export_presets, or engine commands (666, for run_commands). ' +
        'filter narrows by id/name/folder.',
      inputSchema: {
        kind: z.enum(['video_effects', 'audio_effects', 'video_transitions', 'audio_transitions', 'lumetri_presets', 'export_presets', 'commands']),
        filter: z.string().optional().describe('Case-insensitive text to match.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'export_presets') {
          const list = (await exportPresets()).filter((p) => match(p.name, p.category, p.format, p.description));
          return json({ success: true, count: list.length, presets: list.map(({ name, category, format, extension, frameSize, description }) => ({ name, category, format, extension, frameSize, description })) });
        }
        if (args.kind === 'commands') {
          const all = JSON.parse(await runCli(['commands', '--json'])) as { id: string; label: string; params: string; menu?: string[] }[];
          const list = all.filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
          return json({ success: true, count: list.length, commands: list.slice(0, 300).map((c) => ({ id: c.id, label: c.label, params: c.params })), truncated: list.length > 300 });
        }
        return json(
          await withSession(async (s) => {
            if (args.kind === 'lumetri_presets') {
              const r = await s.run<{ presets: { name: string; folder: string; description: string }[] }>('lumetri.presets');
              const list = r.presets.filter((p) => match(p.name, p.folder, p.description));
              return { success: true, count: list.length, presets: list };
            }
            const kinds: Record<string, string> = { video_effects: 'Video', audio_effects: 'Audio', video_transitions: 'VideoTransition', audio_transitions: 'AudioTransition' };
            const kind = kinds[args.kind];
            const r = await s.run<{ id: string; name: string; folder: string | null; params: string[] }[]>('effects.list', { kind });
            const list = r.filter((e) => match(e.id, e.name, e.folder));
            return { success: true, count: list.length, effects: list.map((e) => ({ id: e.id, name: e.name, folder: e.folder, params: e.params })) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_commands',
    {
      title: 'Run FilmCraft engine commands',
      description:
        'Advanced: run any of FilmCraft\'s 666 engine commands in order (ids and params from list_catalog kind=commands, e.g. ' +
        'timeline.razor, effects.setParam, graphics.newShape, captions.import, sequence.transcribe, markers.add, mixer.addInsert). ' +
        'Optionally open a .fcproj or import media first (a sequence is opened from the first import), save the project afterwards ' +
        'and/or export the active sequence. Params can use "$items[0]"... for imported item ids, "$video[0]" / "$audio[0]" for the ' +
        'clips of that first sequence and "$steps[N].path.to[0]" for a value returned by step N (0-based), e.g. "$steps[0].items[0]". ' +
        'live=true drives the open FilmCraft app instead (started with its control channel).',
      inputSchema: {
        steps: z.array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() })).max(500).default([]),
        project_path: z.string().optional().describe('Absolute .fcproj to open first.'),
        import_paths: z.array(z.string()).max(200).optional().describe('Absolute media files to import first.'),
        stop_on_error: z.boolean().default(true),
        save_project_as: z.string().optional().describe('Absolute .fcproj path to save the result to.'),
        export_path: z.string().optional().describe('Absolute file: export the active sequence at the end.'),
        ...exportOptionsSchema,
        live: z.boolean().default(false).describe(`Send the commands to the running FilmCraft app (control port ${CONTROL_PORT}).`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        if (args.project_path) collectInputs([args.project_path]);
        const imports = args.import_paths?.length ? collectInputs(args.import_paths) : [];
        if (args.live && !(await controlPortOpen())) throw new Error('FilmCraft is not listening on its control port: call open_in_filmcraft first.');
        const outcome = await withSession(
            async (s) => {
              const vars: Record<string, number[]> = { items: [], video: [], audio: [] };
              if (args.project_path) await s.run('file.open', { path: toEnginePath(args.project_path) });
              if (imports.length) {
                vars['items'] = await importMedia(s, imports);
                await s.run('project.select', { items: [vars['items'][0]] });
                await s.run('file.newSequenceFromClip', { items: [vars['items'][0]] });
                const seq = await inspectSequence(s);
                vars['video'] = seq.video.flatMap((t) => t.items.map((c) => c.clip));
                vars['audio'] = seq.audio.flatMap((t) => t.items.map((c) => c.clip));
              }
              const results: Record<string, unknown>[] = [];
              const stepValues: unknown[] = [];
              let failed = 0;
              for (const step of args.steps) {
                try {
                  const value = await s.run(step.id, substitute(step.params ?? {}, vars, stepValues) as Record<string, unknown>);
                  stepValues.push(value);
                  results.push({ id: step.id, ok: true, result: value });
                } catch (e) {
                  failed++;
                  stepValues.push(undefined);
                  results.push({ id: step.id, ok: false, error: e instanceof Error ? e.message : String(e) });
                  if (args.stop_on_error) break;
                }
              }
              const out: Record<string, unknown> = { success: failed === 0, completed: results.length - failed, failed, ids: vars, results };
              if (failed === 0 || !args.stop_on_error) {
                if (args.save_project_as) {
                  await s.run('file.saveAs', { path: toEnginePath(args.save_project_as) });
                  removeEmptyPreviews(args.save_project_as);
                  out['saved'] = args.save_project_as;
                }
                if (args.export_path) {
                  const plan = await planExport(args, true, args.export_path);
                  const target = resolveOutputPath({ inputPath: args.export_path + '.__src', ext: plan.ext, outputPath: args.export_path, overwrite: args.overwrite });
                  if ('error' in target) throw new Error(target.error);
                  out['export'] = await exportActive(s, target.path, plan.params);
                }
              }
              return out;
            },
            args.live ? { bridge: `127.0.0.1:${CONTROL_PORT}` } : {},
          );
        return json(outcome, !outcome['success']);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_filmcraft',
    {
      title: 'Open in FilmCraft',
      description:
        'Open files in the FilmCraft desktop app for manual editing: a .fcproj opens as the project; media files are imported and the ' +
        'first one opens in its own sequence. Starts FilmCraft with its control channel when it is not listening yet.',
      inputSchema: { paths: z.array(z.string()).min(1).max(50).describe('Absolute paths (.fcproj or media).') },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        collectInputs(args.paths);
        return json(await openInFilmCraft(args.paths));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_filmcraft_status',
    {
      title: 'FilmCraft status',
      description: 'Check the FilmCraft installation: executables, version, whether the app is running / listening for control, catalog sizes and supported formats.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = {
        ready: !!install.cli,
        platform: `${install.platform} ${process.arch}`,
        install_dir: install.dir,
        cli: install.cli ?? null,
        app: install.app ?? null,
      };
      try {
        if (!install.cli) throw new Error(`filmcraft-cli not found (searched ${install.searched.length} folders). Install FilmCraft or set FILMCRAFT_DIR / FILMCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).trim();
        status['app_running'] = await filmcraftRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['data_dir'] = resolveDataDir() ?? null;
        await withSession(async (s) => {
          const counts: Record<string, number> = {};
          for (const kind of ['Video', 'Audio', 'VideoTransition', 'AudioTransition']) {
            counts[kind] = (await s.run<unknown[]>('effects.list', { kind })).length;
          }
          status['catalog'] = {
            video_effects: counts['Video'],
            audio_effects: counts['Audio'],
            video_transitions: counts['VideoTransition'],
            audio_transitions: counts['AudioTransition'],
            lumetri_presets: (await s.run<{ presets: unknown[] }>('lumetri.presets')).presets.length,
            export_presets: (await exportPresets()).length,
          };
        });
        status['export_formats'] = EXPORT_FORMATS;
        status['editable_formats'] = ['fcproj', ...INTERCHANGE_FORMAT_IDS];
        status['input_extensions'] = INPUT_EXTENSIONS;
        status['ticks_per_second'] = TICKS_PER_SECOND;
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}

/** Edit one file in a session and export it (+ editable outputs). */
async function editOne(
  s: import('../engine.js').FilmCraftSession,
  input: string,
  spec: EditSpec,
  out: ExportOptions & { output_path?: string; output_dir?: string; suffix?: string; save_project?: boolean; interchange?: (typeof INTERCHANGE_FORMAT_IDS)[number][] },
): Promise<Record<string, unknown>> {
  const { opened, applied } = await buildEdit(s, input, spec);
  const plan = await planExport(out, opened.video.length > 0, out.output_path);
  const target = resolveOutputPath({
    inputPath: input,
    ext: plan.ext,
    suffix: out.suffix ?? '_edit',
    outputPath: out.output_path,
    outputDir: out.output_dir,
    overwrite: out.overwrite,
  });
  if ('error' in target) throw new Error(target.error);
  const exp = await exportActive(s, target.path, plan.params);
  const editable = await saveEditable(s, target.path, out);
  return {
    success: true,
    input,
    output: exp,
    duration_seconds: Math.round(toSeconds(opened.seq.duration) * 1000) / 1000,
    applied,
    ...(Object.keys(editable).length ? { editable } : {}),
  };
}

/**
 * Replace "$items[0]" / "$video[1]" / "$audio[0]" with the ids collected before the steps, and
 * "$steps[2].items[0]" / "$steps[0].clip" with values from the result of an earlier step.
 */
export function substitute(value: unknown, vars: Record<string, number[]>, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const m = /^\$(items|video|audio)\[(\d+)\]$/.exec(value);
    if (m) {
      const v = vars[m[1]]?.[Number(m[2])];
      if (v === undefined) throw new Error(`${value} is not available (imported ${vars['items']?.length ?? 0} items).`);
      return v;
    }
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, vars, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, vars, steps)]));
  return value;
}
