/**
 * Object Primitives
 *
 * Pure object manipulation utilities with no policy dependencies.
 * These can be safely reused by any layer of the application.
 *
 * @module lib/primitives/object
 */

/**
 * Deep merge two objects.
 * Arrays are replaced, not merged. Undefined values are skipped.
 * @param target - Target object
 * @param source - Source object to merge
 * @returns New merged object
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return source as T;
  }

  const output = { ...target } as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof output[key] === 'object' &&
      output[key] !== null &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key] as object, value as object);
    } else {
      output[key] = value;
    }
  }

  return output as T;
}

/**
 * Deep equality check.
 * @param a - First value
 * @param b - Second value
 * @returns True if deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    const bArr = b as unknown[];
    if (a.length !== bArr.length) return false;
    return a.every((val, i) => deepEqual(val, bArr[i]));
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => deepEqual(objA[key], objB[key]));
}
