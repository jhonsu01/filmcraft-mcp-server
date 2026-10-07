import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/register.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'filmcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Edits video and audio with the engine of the locally installed FilmCraft (Windows, macOS, Linux), an open-source Premiere-class editor: ' +
        'split into N-second pieces, trim, apply video/audio effects, Lumetri color looks and burned-in texts, change speed, join ' +
        'with transitions, convert / export (H.264, ProRes, DNxHR, MXF, GIF, WAV...) and keep edits editable (.fcproj, OTIO, FCPXML, ' +
        'XML, EDL, AAF). All paths must be absolute; files are never overwritten unless overwrite is true. Call get_filmcraft_status ' +
        'first if unsure FilmCraft is installed, list_catalog for effect ids and parameters, render_frame to preview, ' +
        'run_commands for any of the 666 engine commands, open_in_filmcraft to continue in the app.',
    },
  );
  registerTools(server);
  return server;
}
