/**
 * This file name needs an underscore before it to force it to be first
 * alphabetically. https://github.com/google/clasp/issues/72
 */

import Tester from "./tester";

/** For testing the test framework. */
export default abstract class SimpleTest {
  protected readonly output: string[] = [];
  private successes = 0;
  private failures = 0;

  constructor() {
    this.output.push(this.constructor.name);
  }

  run() {
    for (const key of Object.getOwnPropertyNames(this.constructor.prototype)) {
      if (key.startsWith('test') && typeof this[key] === 'function') {
        this.runUnit(key, this[key]);
      }
    }
  }

  finish(): string[] {
    this.output.push(`  ${this.successes + this.failures} run, ${
        this.successes} pass, ${this.failures} fail`)
    return this.output;
  }

  /**
   * @param testFn A function that should throw if the test unit fails. It will
   *     be bound to `this`, allowing callers to conviently call
   *     `runUnit('description', this.test1)`.
   */
  private runUnit(testName: string, testFn: () => void) {
    try {
      testFn.call(this);
      this.output.push(`  ✓ ${testName}`);
      this.successes++;
    } catch (e) {
      this.output.push(`  ✗ ${testName}`);
      this.failures++;
    }
  }

  /**
   * Throws an error that the Tester class always catches and rethrows, so that
   * when testing Tester, failures aren't suppressed. 
   */
  protected fail() {
    const error = new Error();
    error.name = Tester.ERROR_NAME;
    throw error;
  }

  protected failIfThrows(fn: Function) {
    try {
      fn();
    } catch {
      this.fail();
    }
  }

  protected failIfNotThrows(fn: Function) {
    const DO_NOT_CATCH = String(Math.random());
    try {
      fn();
      throw new Error(DO_NOT_CATCH);
    } catch (e) {
      if (e.message === DO_NOT_CATCH) this.fail();
    }
  }
}