/**
 * Git Fixture Utilities for Router Tests
 *
 * Provides helpers to stage git repositories for CLI router tests using file:// URLs.
 * Wraps the GitFixtureManager from tests/helpers/git-fixtures.mjs with a router-test-friendly API.
 */

import { GitFixtureManager } from '../helpers/git-fixtures.mjs';
import { Shell } from '../../lib/util/shell.mjs';

/**
 * Check if git is available in the system
 * @returns {Promise<boolean>} True if git is available
 */
export async function ensureGitAvailable() {
  try {
    await Shell.execCommand('git', ['--version'], {
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return true;
  } catch {
    throw new Error(
      'Git is not available. Please install git to run these tests.\n' +
      'Installation: https://git-scm.com/downloads'
    );
  }
}

/**
 * Stage a fixture repository for testing
 *
 * @param {string} fixtureName - Name of the fixture (e.g., 'simple-template', 'multi-template')
 * @param {object} options - Staging options
 * @param {string} [options.branch='main'] - Branch name
 * @param {string} [options.commitMessage] - Custom commit message
 * @param {object} [options.testContext] - Test context for automatic cleanup
 * @returns {Promise<{repoUrl: string, repoPath: string, branch: string}>}
 */
export async function stageFixtureRepo(fixtureName, options = {}) {
  const { testContext, ...managerOptions } = options;

  const manager = await GitFixtureManager.create(testContext, managerOptions);
  const repo = await manager.createBareRepo(fixtureName, managerOptions);

  return {
    repoUrl: repo.repoUrl,     // file:// URL for CLI usage
    repoPath: repo.repoPath,   // Absolute path to bare repo
    branch: repo.branch
  };
}
