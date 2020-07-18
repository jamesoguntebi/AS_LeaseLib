/** For testing the test framework. */
export default abstract class SimpleTest {
  private readonly output = [];
  private successes = 0;
  private failures = 0;

  constructor(name: string) {
    this.output.push(name);
  }

  abstract run(): void;

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
  protected runUnit(testName: string, testFn: () => void) {
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