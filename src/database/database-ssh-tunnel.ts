import { ChildProcess, spawn } from 'node:child_process';
import * as net from 'node:net';
import * as path from 'node:path';

type TunnelConfig = {
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  privateKeyPath?: string;
};

let tunnelProcess: ChildProcess | undefined;
let tunnelPromise: Promise<TunnelConfig> | undefined;

export function isDatabaseSshTunnelEnabled(): boolean {
  return process.env.DB_SSH_CONNECTION === 'true';
}

export async function ensureDatabaseSshTunnel(): Promise<
  TunnelConfig | undefined
> {
  if (!isDatabaseSshTunnelEnabled()) {
    return undefined;
  }

  if (!tunnelPromise) {
    tunnelPromise = startDatabaseSshTunnel();
  }

  return tunnelPromise;
}

function buildTunnelConfig(): TunnelConfig {
  const sshHost = requireEnv('DB_SSH_HOST');
  const sshUser = requireEnv('DB_SSH_USER');
  const remoteHost = process.env.DB_SSH_REMOTE_HOST ?? requireEnv('DB_HOST');
  const remotePort = parsePort(
    process.env.DB_SSH_REMOTE_PORT ?? process.env.DB_PORT,
    'DB_SSH_REMOTE_PORT',
  );

  return {
    localHost: process.env.DB_SSH_LOCAL_HOST ?? '127.0.0.1',
    localPort: parsePort(
      process.env.DB_SSH_LOCAL_PORT ?? '3307',
      'DB_SSH_LOCAL_PORT',
    ),
    remoteHost,
    remotePort,
    sshHost,
    sshPort: parsePort(process.env.DB_SSH_PORT ?? '22', 'DB_SSH_PORT'),
    sshUser,
    privateKeyPath: process.env.DB_SSH_KEY_PATH,
  };
}

async function startDatabaseSshTunnel(): Promise<TunnelConfig> {
  const config = buildTunnelConfig();
  const args = [
    '-N',
    '-L',
    `${config.localHost}:${config.localPort}:${config.remoteHost}:${config.remotePort}`,
    '-p',
    String(config.sshPort),
    `${config.sshUser}@${config.sshHost}`,
  ];

  if (config.privateKeyPath) {
    args.splice(0, 0, '-i', path.resolve(config.privateKeyPath));
  }

  const useInteractiveAuth = !config.privateKeyPath;
  const child = spawn('ssh', args, {
    stdio: useInteractiveAuth ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  tunnelProcess = child;

  registerTunnelCleanup();

  child.stderr?.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error(`[db:ssh] ${message}`);
    }
  });

  child.on('exit', (code, signal) => {
    tunnelProcess = undefined;
    tunnelPromise = undefined;

    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`[db:ssh] tunnel exited with code ${code ?? 'unknown'}`);
    }
  });

  await waitForPort(
    config.localHost,
    config.localPort,
    parseTimeout(process.env.DB_SSH_CONNECT_TIMEOUT_MS ?? '30000'),
  );
  return config;
}

function waitForPort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error(
              `SSH tunnel did not open ${host}:${port} within ${timeoutMs}ms`,
            ),
          );
          return;
        }

        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

function registerTunnelCleanup(): void {
  const cleanup = () => {
    tunnelProcess?.kill();
  };

  process.once('exit', cleanup);
  process.once('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when DB_SSH_CONNECTION=true`);
  }

  return value;
}

function parsePort(value: string | undefined, name: string): number {
  const port = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }

  return port;
}

function parseTimeout(value: string): number {
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('DB_SSH_CONNECT_TIMEOUT_MS must be a positive integer');
  }

  return timeoutMs;
}
