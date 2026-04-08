/**
 * Manages the Python sidecar process lifecycle.
 *
 * - Spawns the FastAPI embeddings server on demand.
 * - Discovers the dynamically-assigned port from stdout.
 * - Provides typed HTTP request helpers (/health, /encode, /classify).
 * - Auto-kills on app quit; restarts if the process exits unexpectedly.
 * - Idle timeout: kills the sidecar after 5 minutes of inactivity to save RAM.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import http from 'node:http';
import { app } from 'electron';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncodeResult {
  embeddings: number[][];
}

export interface ClassifyItem {
  label: string;
  score: number;
}

export interface ClassifyResult {
  results: ClassifyItem[];
}

export interface SidecarStatus {
  running: boolean;
  port: number | null;
  model: string | null;
  pid: number | null;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let proc: ChildProcess | null = null;
let port: number | null = null;
let starting = false;
let startPromise: Promise<void> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STARTUP_TIMEOUT_MS = 120 * 1000;  // 2 minutes (model download on first run)

// ---------------------------------------------------------------------------
// Python discovery
// ---------------------------------------------------------------------------

function findPython(): string {
  // Prefer python3, fall back to python. Users can override via PYTHON_PATH env.
  return process.env['PYTHON_PATH'] ?? 'python3';
}

function scriptPath(): string {
  // In dev, the script is at project root. In production, it would be bundled
  // alongside the app — Phase 8 packaging will adjust this path.
  return join(app.getAppPath(), 'python', 'embeddings_server.py');
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('[sidecar] Idle timeout — stopping sidecar');
    stopSidecar();
  }, IDLE_TIMEOUT_MS);
}

export function stopSidecar(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (proc) {
    console.log(`[sidecar] Killing PID ${proc.pid}`);
    proc.kill('SIGTERM');
    proc = null;
    port = null;
    starting = false;
    startPromise = null;
  }
}

/**
 * Ensure the sidecar is running. Returns once the server is healthy.
 * If already running, resolves immediately (and resets idle timer).
 */
export function ensureSidecar(): Promise<void> {
  if (port !== null && proc !== null) {
    resetIdleTimer();
    return Promise.resolve();
  }
  if (startPromise) return startPromise;

  startPromise = doStart();
  return startPromise;
}

async function doStart(): Promise<void> {
  starting = true;
  const pythonBin = findPython();
  const script = scriptPath();

  console.log(`[sidecar] Spawning: ${pythonBin} ${script} --port 0`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(pythonBin, [script, '--port', '0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    proc = child;

    let resolved = false;
    let stdoutBuf = '';

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Sidecar startup timed out'));
        stopSidecar();
      }
    }, STARTUP_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdoutBuf += text;
      process.stdout.write(`[sidecar:stdout] ${text}`);

      // Look for the port announcement.
      const match = stdoutBuf.match(/SIDECAR_PORT=(\d+)/);
      if (match && !resolved) {
        port = parseInt(match[1], 10);
        console.log(`[sidecar] Port discovered: ${port}`);
        clearTimeout(timeout);
        resolved = true;
        starting = false;
        resetIdleTimer();
        resolve();
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[sidecar:stderr] ${chunk.toString()}`);
    });

    child.on('exit', (code, signal) => {
      console.log(`[sidecar] Exited (code=${code}, signal=${signal})`);
      proc = null;
      port = null;
      starting = false;
      startPromise = null;
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(new Error(`Sidecar exited with code ${code} before becoming ready`));
      }
    });

    child.on('error', (err) => {
      console.error('[sidecar] Spawn error:', err);
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(new Error(`Failed to spawn Python sidecar: ${err.message}`));
      }
    });
  });
}

// Kill sidecar on app quit.
app.on('before-quit', stopSidecar);

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function httpRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (port === null) {
      reject(new Error('Sidecar not running'));
      return;
    }

    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        },
        timeout: 300_000 // 5 min for large batch encodes
      },
      (res) => {
        let buf = '';
        res.on('data', (chunk) => (buf += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Sidecar HTTP ${res.statusCode}: ${buf}`));
            return;
          }
          try {
            resolve(JSON.parse(buf) as T);
          } catch {
            reject(new Error(`Invalid JSON from sidecar: ${buf.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sidecarHealth(): Promise<SidecarStatus> {
  if (!proc || port === null) {
    return { running: false, port: null, model: null, pid: null };
  }
  try {
    const h = await httpRequest<{ status: string; model: string; dim: number }>('GET', '/health');
    resetIdleTimer();
    return { running: true, port, model: h.model, pid: proc.pid ?? null };
  } catch {
    return { running: false, port, model: null, pid: proc?.pid ?? null };
  }
}

export async function sidecarEncode(texts: string[]): Promise<number[][]> {
  await ensureSidecar();
  resetIdleTimer();
  const res = await httpRequest<EncodeResult>('POST', '/encode', { texts });
  return res.embeddings;
}

export async function sidecarClassify(
  text: string,
  labels: string[],
  topK = 5
): Promise<ClassifyItem[]> {
  await ensureSidecar();
  resetIdleTimer();
  const res = await httpRequest<ClassifyResult>('POST', '/classify', {
    text,
    labels,
    top_k: topK
  });
  return res.results;
}
