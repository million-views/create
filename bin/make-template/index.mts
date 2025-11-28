#!/usr/bin/env node
// @ts-nocheck
/**
 * DEPRECATED: This entry point is maintained for backward compatibility.
 * Use `bin/create/index.mts` with `template` domain instead:
 *   make-template init           →  create template init
 *   make-template convert ./dir  →  create template convert ./dir
 *   make-template config validate →  create template config validate
 * 
 * This shim will be removed in v2.0.0
 */
import { TemplateRouter } from '../create/domains/template/index.mts';

const router = new TemplateRouter();
const args = process.argv.slice(2);
await router.execute(args);
