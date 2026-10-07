import { execFile, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { CONTROL_PORT, resolveInstall } from '../config.js';
import { withSession } from '../engine.js';
import { toEnginePath } from '../paths.js';

/** Is something listening on the FilmCraft control port? */
export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

/** filmcraft.exe processes currently running. */
export function filmcraftRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq filmcraft.exe', '/NH'], { windowsHide: true }, (err, stdout) => {
      resolve(!err && /filmcraft\.exe/i.test(stdout));
    });
  });
}

/** Start the desktop app with its control channel and wait until it answers. */
export async function ensureLiveApp(port = CONTROL_PORT, waitSec = 45): Promise<{ started: boolean }> {
  if (await controlPortOpen(port)) return { started: false };
  const install = resolveInstall();
  if (!install.app) throw new Error(`filmcraft.exe not found in ${install.dir}. Set FILMCRAFT_DIR.`);
  const child = spawn(install.app, ['--control', String(port)], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  const deadline = Date.now() + waitSec * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await controlPortOpen(port)) return { started: true };
  }
  throw new Error(`FilmCraft started but its control port ${port} did not open within ${waitSec} s.`);
}

/**
 * Open files in the FilmCraft app: a .fcproj opens as the project; media files are imported
 * and the first one is opened in a sequence of its own.
 */
export async function openInFilmCraft(paths: string[], port = CONTROL_PORT): Promise<Record<string, unknown>> {
  const { started } = await ensureLiveApp(port);
  const projects = paths.filter((p) => /\.fcproj$/i.test(p));
  const media = paths.filter((p) => !/\.fcproj$/i.test(p));
  const opened: Record<string, unknown> = { started_app: started, control_port: port };
  await withSession(
    async (s) => {
      for (const p of projects) await s.run('file.open', { path: toEnginePath(p) });
      if (media.length) {
        const r = await s.run<{ items: number[]; errors: unknown[] }>('file.import', { paths: media.map(toEnginePath) });
        opened['imported_items'] = r.items;
        if (r.errors?.length) opened['import_errors'] = r.errors;
        if (r.items?.length) {
          await s.run('project.select', { items: [r.items[0]] });
          await s.run('file.newSequenceFromClip', { items: [r.items[0]] });
          opened['sequence_from'] = path.win32.basename(media[0]);
        }
      }
    },
    { bridge: `127.0.0.1:${port}` },
  );
  return { success: true, opened: paths, ...opened };
}
