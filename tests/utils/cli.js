import { spawn } from 'child_process';

/**
 * Execute the CLI entry point with the provided arguments and options.
 * Returns stdout/stderr along with exit metadata.
 */
export function execCLI(cliPath, args, options = {}) {
  const { cwd = process.cwd(), env = {}, timeout = 10000 } = options;

  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const killTimer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        exitCode: -1,
        stdout,
        stderr: `${stderr}\nTest timeout`,
        timedOut: true
      });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(killTimer);
      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut: false
      });
    });

    child.on('error', (error) => {
      clearTimeout(killTimer);
      resolve({
        exitCode: -1,
        stdout,
        stderr: `${stderr}${error.message}`,
        error: true
      });
    });
  });
}

/**
 * Spawn a generic command and resolve once complete.
 */
export function execCommand(command, args, options = {}) {
  const { cwd = process.cwd(), env = {} } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        const error = new Error(`Command failed: ${command} ${args.join(' ')}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    child.on('error', reject);
  });
}
