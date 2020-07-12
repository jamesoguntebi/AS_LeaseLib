export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private descriptionStack: string[] = [];
  private indentation = 0;
  private testOutput: string[] = [];

  describe(description: string, testFn: () => void): void {
    this.output(description);
    this.indent();
    this.descriptionStack.push(description);
    testFn();
    this.descriptionStack.pop();
  }

  it(unitTestName: string, testFn: () => void): void {
    try {
      testFn();
      this.output(`PASS -- ${unitTestName}`);
    } catch (e) {
      this.output(`FAIL -- ${unitTestName}`);
      this.indent();
      if (e instanceof Error) {
        this.output(e.name === Expectation.ERROR_NAME ?
            e.message : (e.stack || e.message));
      } else {
        this.output('Exception during test execution. No error object.')
      }
      this.dedent();
    }
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  getTestResults(): string {
    return this.testOutput.join('\n');
  }

  private indent() {
    this.indentation += Tester.INDENT_PER_LEVEL;
  }

  private dedent() {
    this.indentation -= Tester.INDENT_PER_LEVEL;
  }

  private output(result: string) {
    result.split('\n').forEach(line =>
        this.testOutput.push(Array(this.indentation + 1).join(' ') + line));
  }
}

class Expectation<T> {
  static readonly ERROR_NAME = '__expectation_error__';

  constructor(private readonly actual: T) {}

  toEqual(expected: T) {
    if (this.actual !== expected) {
      const error = new Error(`Expected ${expected}, got ${this.actual}.`);
      error.name = Expectation.ERROR_NAME;
      throw error;
    }
  }
}