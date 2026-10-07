import { describe, expect, it } from 'vitest';
import { cleanEnv, resolveInstall, resolveInt } from '../../src/config.js';
import { formatFromExtension, toSeconds, toTicks } from '../../src/formats.js';
import { resolveOutputPath, stemOf } from '../../src/paths.js';
import { splitBoundaries } from '../../src/tools/operations.js';
import { substitute } from '../../src/tools/register.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.filmcraft_dir}')).toBeUndefined();
    expect(cleanEnv('  "D:\\Apps\\FilmCraft" ')).toBe('D:\\Apps\\FilmCraft');
  });
  it('resolves the install folder or an executable inside it', () => {
    const exists = (p: string) => /^D:\\FC\\filmcraft(-cli)?\.exe$/i.test(p);
    expect(resolveInstall({ FILMCRAFT_DIR: 'D:\\FC' }, exists)).toEqual({ dir: 'D:\\FC', cli: 'D:\\FC\\filmcraft-cli.exe', app: 'D:\\FC\\filmcraft.exe' });
    expect(resolveInstall({ FILMCRAFT_DIR: 'D:\\FC\\filmcraft.exe' }, exists).cli).toBe('D:\\FC\\filmcraft-cli.exe');
    expect(resolveInstall({ FILMCRAFT_DIR: 'D:\\none' }, exists).cli).toBeUndefined();
  });
  it('parses integers with a fallback', () => {
    expect(resolveInt('120', 5)).toBe(120);
    expect(resolveInt('x', 5)).toBe(5);
    expect(resolveInt('70000', 9876, 65535)).toBe(9876);
  });
});

describe('time', () => {
  it('converts seconds and ticks exactly', () => {
    expect(toTicks(2)).toBe(508_032_000_000);
    expect(toSeconds(2_550_744_000_000)).toBeCloseTo(10.0417, 4);
  });
});

describe('split boundaries', () => {
  it('cuts 10.04 s into five 2 s pieces and drops a 1-frame tail', () => {
    const b = splitBoundaries(10.0417, 2, 0.25);
    expect(b).toHaveLength(5);
    expect(b[4]).toEqual({ start: 8, end: 10 });
  });
  it('keeps the tail when minLast is 0, honours a range', () => {
    expect(splitBoundaries(10.0417, 2, 0)).toHaveLength(6);
    expect(splitBoundaries(30, 10, 0, 5, 25)).toEqual([
      { start: 5, end: 15 },
      { start: 15, end: 25 },
    ]);
  });
});

describe('paths', () => {
  it('never overwrites by default and adds the extension', () => {
    const taken = new Set(['D:\\v\\clip_edit.mp4']);
    const exists = (p: string) => taken.has(p);
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', suffix: '_edit', exists })).toEqual({ path: 'D:\\v\\clip_edit_2.mp4' });
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\out', exists })).toEqual({ path: 'D:\\v\\out.mp4' });
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\clip_edit.mp4', exists })).toHaveProperty('error');
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\x.wav', exists })).toHaveProperty('error');
  });
  it('stems and formats', () => {
    expect(stemOf('D:\\a\\b.c\\video_LTX-2.5_i2v.mp4')).toBe('video_LTX-2.5_i2v');
    expect(formatFromExtension('.MOV')).toBe('prores');
    expect(formatFromExtension('mp4')).toBe('h264');
  });
});

describe('run_commands variables', () => {
  it('replaces $items/$video/$audio references', () => {
    const vars = { items: [1, 2], video: [6], audio: [7] };
    expect(substitute({ clips: ['$video[0]', '$audio[0]'], item: '$items[1]', name: '$x' }, vars)).toEqual({ clips: [6, 7], item: 2, name: '$x' });
    expect(() => substitute('$items[5]', vars)).toThrow();
  });
});
