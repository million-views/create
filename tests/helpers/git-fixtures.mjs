import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { File } from '../../lib/util/file.mts';
import { Shell } from '../../lib/util/shell.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/git-repos/templates');
const DEFAULT_BRANCH = 'main';
const DEFAULT_AUTHOR = {
  name: 'Git Fixture Bot',
  email: 'fixtures@example.com'
};
const DEFAULT_SHELL_OPTIONS = {
  timeout: 15000,
  stdio: ['ignore', 'pipe', 'pipe']
};

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function runGit(args, cwd, shellOverrides = {}) {
  return Shell.execCommand('git', args, {
    ...DEFAULT_SHELL_OPTIONS,
    ...shellOverrides,
    cwd
  });
}

async function copyDirectoryContents(src, dest) {
  await File.ensureDirectory(dest);
  await fs.cp(src, dest, { recursive: true });
}

export function resolveGitFixturePath(fixtureName) {
  return path.join(FIXTURE_ROOT, fixtureName);
}

export class GitFixtureManager {
  static async create(testContext = null, options = {}) {
    const prefix = options.prefix ?? 'git-fixture';
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
    const manager = new GitFixtureManager(baseDir, options);

    if (testContext?.after) {
      testContext.after(async () => {
        await manager.cleanup();
      });
    }

    return manager;
  }

  constructor(baseDir, options = {}) {
    this.baseDir = baseDir;
    this.cleaned = false;
    this.shellOptions = {
      ...DEFAULT_SHELL_OPTIONS,
      ...options.shell
    };
    this.author = {
      ...DEFAULT_AUTHOR,
      ...options.author
    };
  }

  async cleanup() {
    if (this.cleaned) {
      return;
    }
    this.cleaned = true;
    await File.safeCleanup(this.baseDir);
  }

  async createBareRepo(fixtureName, options = {}) {
    const fixturePath = resolveGitFixturePath(fixtureName);
    const errors = await File.validateDirectoryExists(fixturePath, `Git fixture "${fixtureName}"`);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const uniqueSuffix = `${fixtureName.replace(/[^a-z0-9-]/gi, '-')}-${Date.now()}-${randomSuffix()}`;
    const workDir = path.join(this.baseDir, `${uniqueSuffix}-workdir`);
    const bareDir = path.join(this.baseDir, `${uniqueSuffix}.git`);

    await File.safeCleanup(workDir);
    await File.safeCleanup(bareDir);
    await copyDirectoryContents(fixturePath, workDir);

    await runGit(['init'], workDir, this.shellOptions);
    await runGit(['config', 'user.name', this.author.name], workDir, this.shellOptions);
    await runGit(['config', 'user.email', this.author.email], workDir, this.shellOptions);
    await runGit(['add', '.'], workDir, this.shellOptions);
    await runGit(['commit', '-m', options.commitMessage ?? `Add ${fixtureName} fixture`], workDir, this.shellOptions);

    const branch = options.branch ?? DEFAULT_BRANCH;
    await runGit(['branch', '-M', branch], workDir, this.shellOptions);

    await Shell.execCommand('git', ['clone', '--bare', workDir, bareDir], {
      ...this.shellOptions,
      cwd: this.baseDir
    });

    const repoUrl = pathToFileURL(bareDir).href;
    return {
      fixtureName,
      repoPath: bareDir,
      repoUrl,
      branch
    };
  }
}
