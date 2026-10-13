// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs Windows + FilmCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// Uses FilmCraft's built-in synthetic demo footage only (no personal media).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

const out = mkdtempSync(join(tmpdir(), 'fc-e2e-'));
const src = join(out, 'Vídeo ñandú');
mkdirSync(src, { recursive: true });

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [process.env.E2E_BUNDLE || 'dist/bundle.cjs'] }));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const parse = (res) => JSON.parse(res.content.find((c) => c.type === 'text').text);
const LINKED = [];
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const body = parse(res);
  if (body && body.files_markdown) LINKED.push(body.files_markdown);
  if (res.isError) console.log('      ', JSON.stringify(body).slice(0, 400));
  return { ...body, _raw: res };
};
const t0 = Date.now();

const { tools } = await client.listTools();
check(tools.length === 11, `11 tools exposed (${tools.map((t) => t.name).join(', ')})`);

const status = await call('get_filmcraft_status', {});
check(status.ready && /filmcraft-cli/.test(status.version), `FilmCraft ready: ${status.version} at ${status.cli}`);
check(status.catalog?.video_effects >= 100 && status.catalog?.lumetri_presets >= 10, `catalog: ${JSON.stringify(status.catalog)}`);

const fx = await call('list_catalog', { kind: 'video_effects', filter: 'blur' });
check(fx.success && fx.effects.some((e) => e.id === 'gaussian_blur' && e.params.includes('blurriness')), `list_catalog blur: ${fx.count} effects`);
const cmds = await call('list_catalog', { kind: 'commands', filter: 'timeline.' });
check(cmds.count >= 10, `list_catalog commands timeline.*: ${cmds.count}`);

// synthetic source: FilmCraft's demo footage, exported through run_commands with $steps references
const aurora = join(src, 'aurora.mp4');
const made = await call('run_commands', {
  steps: [
    { id: 'file.importDemoFootage', params: { scene: 'Aurora' } },
    { id: 'project.select', params: { items: ['$steps[0].items[0]'] } },
    { id: 'file.newSequenceFromClip', params: {} },
    { id: 'sequence.settings', params: { width: 640, height: 360 } },
    { id: 'timeline.select', params: { clips: ['$steps[2].clips[0]'], add: false, toggle: false } },
    { id: 'clip.fitToFrame', params: { clips: ['$steps[2].clips[0]'] } },
  ],
  export_path: aurora,
  preset: 'Match Source – Adaptive Medium Bitrate',
});
if (!made.success) console.log(JSON.stringify(made).slice(0, 1500));
check(made.success && existsSync(aurora), `run_commands built a test clip: ${made.export?.frames} frames`);

const info = await call('get_media_info', { input_path: aurora });
check(info.success && info.video?.width === 640 && info.duration_seconds > 6, `info: ${info.video?.width}x${info.video?.height} @${info.video?.fps} fps, ${info.duration_seconds} s, audio ${info.audio?.codec ?? 'none'}`);

const split = await call('split_video', { input_path: aurora, segment_seconds: 2, output_dir: join(out, 'split'), save_project: true });
const r0 = split.results?.[0];
const expected = Math.floor(info.duration_seconds / 2) + (info.duration_seconds % 2 >= 0.25 ? 1 : 0);
check(split.success && r0.count === expected, `split 2 s: ${r0?.count} pieces (expected ${expected}) in ${r0?.output_dir}`);
const p1 = r0?.files?.[0]?.path;
const p1info = p1 ? await call('get_media_info', { input_path: p1 }) : {};
check(Math.abs((p1info.duration_seconds ?? 0) - 2) < 0.05, `first piece is ${p1info.duration_seconds} s`);
check(r0?.editable?.fcproj && existsSync(r0.editable.fcproj), `split editable project: ${r0?.editable?.fcproj}`);

const edit = await call('edit_video', {
  input_path: p1,
  effects: [{ effect: 'vignette' }, { effect: 'gaussian_blur', params: { blurriness: 8 } }, { effect: 'motion', keyframes: { scale: [{ seconds: 0, value: 100 }, { seconds: 2, value: 120 }] } }],
  color_preset: 'Golden Dusk',
  texts: [
    { text: 'Prueba ñandú', placement: 'bottom', color: '#ffcc00', stroke_color: '#000000', size: 40 },
    { text: 'Arriba', placement: 'top', size: 30, start: 0.5, duration: 1, effects: [{ effect: 'grow' }] },
  ],
  audio_effects: [{ effect: 'highpass', params: { cutoff: 120 } }],
  save_project: true,
  interchange: ['otio', 'fcpxml'],
});
check(edit.success && existsSync(edit.output?.path), `edit_video: ${edit.output?.path} (${edit.output?.frames} frames)`);
check(edit.applied?.texts?.length === 2 && edit.applied?.color_preset === 'Golden Dusk', `applied: ${JSON.stringify(edit.applied)}`);
check(edit.editable && ['fcproj', 'otio', 'fcpxml'].every((k) => existsSync(edit.editable[k] ?? '')), `editable: ${Object.keys(edit.editable ?? {}).join(', ')}`);

const again = await call('edit_video', { input_path: p1, output_path: edit.output?.path, effects: [{ effect: 'invert' }] });
check(!again.success && /already exists/.test(again.error ?? ''), 'refuses to overwrite without overwrite:true');

const speed = await call('edit_video', { input_path: p1, speed_percent: 200, reverse: true, suffix: '_fast' });
check(speed.success && Math.abs(speed.duration_seconds - 1) < 0.05, `speed 200% reverse: ${speed.duration_seconds} s`);

const trim = await call('trim_video', { input_path: aurora, start: 1, end: 3.5, fade_in: 0.5, fade_out: 0.5 });
const trimInfo = trim.success ? await call('get_media_info', { input_path: trim.output.path }) : {};
check(trim.success && Math.abs(trimInfo.duration_seconds - 2.5) < 0.05, `trim with fades: ${trimInfo.duration_seconds} s`);

const files = r0.files.map((f) => f.path);
const cat = await call('concat_videos', { inputs: files.slice(0, 3), output_path: join(out, 'joined.mp4'), transition: 'cross_dissolve', transition_seconds: 0.5, interchange: ['xml'] });
check(cat.success && Math.abs(cat.duration_seconds - 6) < 0.1 && existsSync(cat.editable?.xml ?? ''), `concat 3 pieces + cross_dissolve: ${cat.duration_seconds} s`);

const conv = await call('convert_media', { input_paths: [files[0], files[1]], output_dir: join(out, 'gif'), format: 'gif', width: 320, height: 180 });
check(conv.success && conv.succeeded === 2, `convert to GIF: ${conv.results?.map((r) => r.output?.path).join(', ')}`);
const wav = await call('convert_media', { input_path: aurora, format: 'wav', output_dir: join(out, 'wav') });
const wavInfo = wav.success ? await call('get_media_info', { input_path: wav.output.path }) : {};
check(wav.success && wavInfo.video === null && wavInfo.audio, `extract audio: ${wav.output?.path}`);

const frame = await call('render_frame', { input_path: edit.output?.path, seconds: 1, max_side: 320 });
check(frame.success && frame._raw.content.some((c) => c.type === 'image') && existsSync(frame.output), `render_frame: ${frame.output}`);
const frameProj = await call('render_frame', { input_path: edit.editable?.fcproj, seconds: 1, max_side: 320 });
check(frameProj.success, `render_frame from .fcproj: ${frameProj.output}`);

const dirFiles = readdirSync(join(out, 'split', 'aurora'));
check(dirFiles.every((f) => statSync(join(out, 'split', 'aurora', f)).size > 0), `split folder: ${dirFiles.join(', ')}`);

// every result that names output files carries working links to them
const linkUrls = LINKED.flatMap((m) => [...m.matchAll(/\]\((file:\/\/\/[^)]+)\)/g)].map((x) => x[1]));
check(linkUrls.length > 0 && linkUrls.every((u) => !/[ ()]/.test(u) && existsSync(fileURLToPath(u))), `files_markdown: ${linkUrls.length} file:/// links in ${LINKED.length} results, all valid and existing`);

await client.close();
console.log(`\n${failed ? `${failed} FAILED` : 'ALL PASSED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · output in ${out}`);
process.exit(failed ? 1 : 0);
