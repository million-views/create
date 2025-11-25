#!/usr/bin/env node

/**
 * Logger API for template setup scripts.
 *
 * @module lib/environment/tools/logger
 */

import { SetupSandboxError } from '../utils.mjs';

/**
 * Create a logger API for setup scripts.
 *
 * @param {Object} logger - Logger with info/warn methods
 * @returns {Object} Frozen logger API
 */
export function buildLoggerApi(logger) {
  if (!logger || typeof logger.info !== 'function' || typeof logger.warn !== 'function') {
    throw new SetupSandboxError('Logger must have info and warn methods');
  }

  return Object.freeze({
    info(message, data) {
      if (data !== undefined) {
        logger.info(`${message} ${JSON.stringify(data)}`);
      } else {
        logger.info(message);
      }
    },
    warn(message, data) {
      if (data !== undefined) {
        logger.warn(`${message} ${JSON.stringify(data)}`);
      } else {
        logger.warn(message);
      }
    },
    table(rows) {
      logger.info('Table data:');
      logger.info(JSON.stringify(rows, null, 2));
    }
  });
}
