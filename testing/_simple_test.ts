/**
 * This file name needs an underscore before it to force it to be first
 * alphabetically. https://github.com/google/clasp/issues/72
 */

/** For testing the test framework. */
export default abstract class SimpleTest {
  protected readonly output = [];
  private successes = 0;
  private failures = 0;

  constructor(name: string) {
    this.output.push(name);
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
    } catch {
      this.output.push(`  ✗ ${testName}`);
      this.failures++;
    }
  }

  protected fail() {
    throw new Error();
  }
}