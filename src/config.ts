import { existsSync } from 'fs';
import * as path from 'path';

/**
 * An unfilled MCPB user_config placeholder ("${user_config.x}") reaches the process
 * literally when the user left the field empty, so treat it as unset.
 */
export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/^"(.*)"$/, '$1');
  if (!v || v.includes('${')) return undefined;
  return v;
}

export const DEFAULT_FILMCRAFT_DIR = 'C:\\Program Files\\FilmCraft';

export interface FilmCraftInstall {
  dir: string;
  cli: string | undefined;
  app: string | undefined;
}

/**
 * FILMCRAFT_DIR may be the install folder or one of its executables;
 * FILMCRAFT_CLI points straight at filmcraft-cli.exe (wins over FILMCRAFT_DIR).
 */
export function resolveInstall(env: NodeJS.ProcessEnv = process.env, exists: (p: string) => boolean = existsSync): FilmCraftInstall {
  let dir = cleanEnv(env['FILMCRAFT_DIR']) ?? DEFAULT_FILMCRAFT_DIR;
  if (/\.exe$/i.test(dir)) dir = path.win32.dirname(dir);
  const cliEnv = cleanEnv(env['FILMCRAFT_CLI']);
  const cliCandidates = [cliEnv, path.win32.join(dir, 'filmcraft-cli.exe')].filter((p): p is string => !!p);
  const appCandidates = [path.win32.join(dir, 'filmcraft.exe')];
  if (cliEnv) appCandidates.push(path.win32.join(path.win32.dirname(cliEnv), 'filmcraft.exe'));
  return {
    dir,
    cli: cliCandidates.find((p) => exists(p)),
    app: appCandidates.find((p) => exists(p)),
  };
}

/** Optional FilmCraft data directory (user export presets) for the headless engine. */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return cleanEnv(env['FILMCRAFT_DATA_DIR']);
}

/** Positive integer from an env var, otherwise the default. */
export function resolveInt(envValue: string | undefined, def: number, max = 86400): number {
  if (!envValue || !/^\d+$/.test(envValue.trim())) return def;
  const n = Number(envValue.trim());
  return n > 0 && n <= max ? n : def;
}

/** Longest single engine command (a long export with heavy effects can take a while). */
export const COMMAND_TIMEOUT_SEC = resolveInt(process.env['FILMCRAFT_MCP_TIMEOUT'], 3600);

/** Control port of the live FilmCraft app (`filmcraft --control PORT`). */
export const CONTROL_PORT = resolveInt(cleanEnv(process.env['FILMCRAFT_CONTROL_PORT']), 9876, 65535);
