import { describe, expect, it } from 'vitest';
import { cleanEnv, resolveInstall, resolveInt } from '../../src/config.js';
import { formatFromExtension, toSeconds, toTicks } from '../../src/formats.js';
import { resolveOutputPath, sameFile, stemOf, toEnginePath } from '../../src/paths.js';
import { splitBoundaries } from '../../src/tools/operations.js';
import { substitute } from '../../src/tools/register.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.filmcraft_dir}')).toBeUndefined();
    expect(cleanEnv('  "D:\\Apps\\FilmCraft" ')).toBe('D:\\Apps\\FilmCraft');
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\FC\\filmcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ FILMCRAFT_DIR: 'D:\\FC' }, exists, 'win32', 'C:\\Users\\u');
    expect(r.cli).toBe('D:\\FC\\filmcraft-cli.exe');
    expect(r.app).toBe('D:\\FC\\filmcraft.exe');
    expect(resolveInstall({ FILMCRAFT_DIR: 'D:\\FC\\filmcraft.exe' }, exists, 'win32').cli).toBe('D:\\FC\\filmcraft-cli.exe');
    expect(resolveInstall({ FILMCRAFT_DIR: 'D:\\none' }, exists, 'win32').cli).toBeUndefined();
  });
  it('Windows: default Program Files install', () => {
    const exists = (p: string) => p === 'C:\\Program Files\\FilmCraft\\filmcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, exists, 'win32').cli).toBe('C:\\Program Files\\FilmCraft\\filmcraft-cli.exe');
  });
  it('Linux: deb/rpm in /usr/bin, tar.gz root with bin/, PATH, AppImage app', () => {
    const deb = new Set(['/usr/bin/filmcraft-cli', '/usr/bin/filmcraft']);
    const r = resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u');
    expect([r.cli, r.app]).toEqual(['/usr/bin/filmcraft-cli', '/usr/bin/filmcraft']);
    const tar = new Set(['/home/u/filmcraft-0.2.1/bin/filmcraft-cli']);
    expect(resolveInstall({ FILMCRAFT_DIR: '/home/u/filmcraft-0.2.1' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/home/u/filmcraft-0.2.1/bin/filmcraft-cli');
    const onPath = new Set(['/srv/tools/filmcraft-cli']);
    expect(resolveInstall({ PATH: '/usr/sbin:/srv/tools' }, (p) => onPath.has(p), 'linux', '/home/u').cli).toBe('/srv/tools/filmcraft-cli');
    const img = '/home/u/Apps/filmcraft-0.2.1-linux-x86_64.AppImage';
    expect(resolveInstall({ FILMCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: FilmCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/FilmCraft.app/Contents/MacOS/FilmCraft', '/Users/u/bin/filmcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect(r.cli).toBe('/Users/u/bin/filmcraft-cli');
    expect(r.app).toBe('/Applications/FilmCraft.app/Contents/MacOS/FilmCraft');
    const inApp = new Set(['/Apps/FilmCraft.app/Contents/MacOS/filmcraft-cli']);
    expect(resolveInstall({ FILMCRAFT_DIR: '/Apps/FilmCraft.app' }, (p) => inApp.has(p), 'darwin', '/Users/u').cli).toBe('/Apps/FilmCraft.app/Contents/MacOS/filmcraft-cli');
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
  it('Windows: never overwrites by default, adds the extension, ignores case', () => {
    const taken = new Set(['D:\\v\\clip_edit.mp4']);
    const exists = (p: string) => taken.has(p);
    const w = { exists, platform: 'win32' as const };
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', suffix: '_edit', ...w })).toEqual({ path: 'D:\\v\\clip_edit_2.mp4' });
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\out', ...w })).toEqual({ path: 'D:\\v\\out.mp4' });
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\clip_edit.mp4', ...w })).toHaveProperty('error');
    expect(resolveOutputPath({ inputPath: 'D:\\v\\clip.mov', ext: 'mp4', outputPath: 'D:\\v\\x.wav', ...w })).toHaveProperty('error');
    expect(sameFile('D:\\V\\A.mp4', 'd:\\v\\a.mp4', 'win32')).toBe(true);
    expect(toEnginePath('D:\\v\\a.mp4', 'win32')).toBe('D:/v/a.mp4');
  });
  it('Linux / macOS: POSIX paths, case-sensitive on Linux', () => {
    const exists = (p: string) => p === '/home/u/v/clip_edit.mp4';
    expect(resolveOutputPath({ inputPath: '/home/u/v/clip.mov', ext: 'mp4', suffix: '_edit', exists, platform: 'linux' })).toEqual({ path: '/home/u/v/clip_edit_2.mp4' });
    expect(resolveOutputPath({ inputPath: '/v/a.mp4', ext: 'mp4', outputPath: 'rel/out.mp4', exists, platform: 'darwin' })).toHaveProperty('error');
    expect(sameFile('/v/A.mp4', '/v/a.mp4', 'linux')).toBe(false);
    expect(sameFile('/v/A.mp4', '/v/a.mp4', 'darwin')).toBe(true);
    expect(toEnginePath('/v/a\\b.mp4', 'linux')).toBe('/v/a\\b.mp4');
  });
  it('stems and formats', () => {
    expect(stemOf('D:\\a\\b.c\\clip_v2.5.mp4', 'win32')).toBe('clip_v2.5');
    expect(stemOf('/a/b.c/clip.final.mov', 'linux')).toBe('clip.final');
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
