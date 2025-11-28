#!/usr/bin/env node
// @ts-nocheck
/**
 * DEPRECATED: This entry point is maintained for backward compatibility.
 * Use `bin/create/index.mts` with `scaffold` domain instead:
 *   create-scaffold new my-app  →  create scaffold new my-app
 *   create-scaffold list        →  create scaffold list
 * 
 * This shim will be removed in v2.0.0
 */
import { ScaffoldRouter } from '../create/domains/scaffold/index.mts';

const router = new ScaffoldRouter();
const args = process.argv.slice(2);
await router.execute(args);
