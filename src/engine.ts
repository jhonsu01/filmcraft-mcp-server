import { ChildProcessWithoutNullStreams, execFile, spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createInterface } from 'readline';
import { COMMAND_TIMEOUT_SEC, resolveDataDir, resolveInstall } from './config.js';

/** A FilmCraft command that the engine rejected (unknown id, bad params, not available right now...). */
export class FilmCraftCommandError extends Error {
  constructor(
    public readonly command: string,
    message: string,
  ) {
    super(`${command}: ${message}`);
    this.name = 'FilmCraftCommandError';
  }
}

let running = 0;
/** Engine sessions still open (index.ts waits for them before exiting). */
export function pendingRuns(): number {
  return running;
}

export function requireCli(): string {
  const install = resolveInstall();
  if (!install.cli) {
    throw new Error(
      `filmcraft-cli not found (looked in ${install.searched.slice(0, 6).join(', ')} and PATH). Install FilmCraft ` +
        '(https://github.com/storytold/filmcraft/releases; on macOS also the filmcraft-cli zip) or set FILMCRAFT_DIR / FILMCRAFT_CLI.',
    );
  }
  return install.cli;
}

interface Pending {
  resolve: (v: RpcResponse) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

interface RpcResponse {
  result?: { content?: { type: string; text?: string; data?: string; mimeType?: string }[]; isError?: boolean };
  error?: { message: string };
}

export interface SessionOptions {
  /** Drive the running app (`filmcraft --control PORT`) instead of a private headless engine. */
  bridge?: string;
}

/**
 * One FilmCraft engine: `filmcraft-cli mcp` over stdio. The engine keeps the project in memory,
 * so the ids a command returns (items, clips, sequences) can be used by the next one.
 * Requests are sent one at a time: the engine answers concurrently and the edits depend on each other.
 * Each session runs in its own temporary folder (FilmCraft writes "FilmCraft Previews" into the cwd).
 */
export class FilmCraftSession {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private stderr = '';
  private closed = false;
  private readonly workDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(cli: string, opts: SessionOptions) {
    this.workDir = mkdtempSync(path.join(os.tmpdir(), 'fcmcp-'));
    const args: string[] = [];
    const dataDir = resolveDataDir();
    if (dataDir && !opts.bridge) args.push('--data-dir', dataDir);
    if (opts.bridge) args.push('--bridge', opts.bridge);
    args.push('mcp');
    this.proc = spawn(cli, args, { cwd: this.workDir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    running++;
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (d: string) => {
      this.stderr = (this.stderr + d).slice(-4000);
    });
    const rl = createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => this.onLine(line));
    this.proc.on('error', (e) => this.failAll(e));
    this.proc.on('exit', (code) => this.failAll(new Error(`FilmCraft engine exited (code ${code}). ${this.stderr.trim()}`.trim())));
  }

  static async open(opts: SessionOptions = {}): Promise<FilmCraftSession> {
    const s = new FilmCraftSession(requireCli(), opts);
    try {
      await s.rpc('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'filmcraft-mcp-server', version: '1' },
      });
      s.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    } catch (e) {
      s.close();
      throw e;
    }
    return s;
  }

  private send(msg: unknown): void {
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  private onLine(line: string): void {
    let msg: { id?: number } & RpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof msg.id !== 'number') return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    p.resolve(msg);
  }

  private failAll(e: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    this.pending.clear();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    running--;
    try {
      rmSync(this.workDir, { recursive: true, force: true });
    } catch {
      // a preview file still locked: the OS temp cleanup takes it later
    }
  }

  private rpc(method: string, params: unknown, timeoutSec = COMMAND_TIMEOUT_SEC): Promise<RpcResponse> {
    const run = () =>
      new Promise<RpcResponse>((resolve, reject) => {
        if (this.closed) return reject(new Error('FilmCraft engine is closed.'));
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`FilmCraft engine timed out after ${timeoutSec} s (${method}).`));
        }, timeoutSec * 1000);
        this.pending.set(id, { resolve, reject, timer });
        this.send({ jsonrpc: '2.0', id, method, params });
      });
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Call one of the engine's MCP tools; returns its raw content. */
  async tool(name: string, args: Record<string, unknown>): Promise<NonNullable<RpcResponse['result']>> {
    const r = await this.rpc('tools/call', { name, arguments: args });
    if (r.error) throw new FilmCraftCommandError(name, r.error.message);
    const result = r.result ?? {};
    if (result.isError) throw new FilmCraftCommandError(name, textOf(result) || 'failed');
    return result;
  }

  /** Run one engine command (same ids and params as `filmcraft-cli commands`) and return its JSON result. */
  async run<T = unknown>(id: string, params: Record<string, unknown> = {}): Promise<T> {
    const r = await this.rpc('tools/call', { name: 'command_run', arguments: { id, params } });
    if (r.error) throw new FilmCraftCommandError(id, r.error.message);
    const result = r.result ?? {};
    const text = textOf(result);
    if (result.isError) throw new FilmCraftCommandError(id, text || 'failed');
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  close(): void {
    if (this.closed) return;
    try {
      this.proc.stdin.end();
    } catch {
      // already gone
    }
    const p = this.proc;
    setTimeout(() => {
      if (p.exitCode === null) p.kill();
    }, 2000).unref();
    this.finish();
  }
}

function textOf(result: NonNullable<RpcResponse['result']>): string {
  return (result.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n')
    .trim();
}

/** Open a session, run fn, always close. */
export async function withSession<T>(fn: (s: FilmCraftSession) => Promise<T>, opts: SessionOptions = {}): Promise<T> {
  const s = await FilmCraftSession.open(opts);
  try {
    return await fn(s);
  } finally {
    s.close();
  }
}

/** One-shot CLI call (probe, --version, export --list-presets...): stdout as text. */
export function runCli(args: string[], timeoutSec = 120): Promise<string> {
  const cli = requireCli();
  return new Promise((resolve, reject) => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'fcmcp-'));
    execFile(
      cli,
      args,
      { cwd, windowsHide: true, timeout: timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' },
      (err, stdout, stderr) => {
        try {
          rmSync(cwd, { recursive: true, force: true });
        } catch {
          // ignore
        }
        if (err) reject(new Error(`filmcraft-cli ${args[0]}: ${(stderr || stdout || err.message).toString().trim()}`));
        else resolve(stdout);
      },
    );
  });
}
