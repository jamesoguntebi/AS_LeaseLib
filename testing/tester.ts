export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;
  private testOutput: string[] = [];
  private successCount = 0;
  private failureCount = 0;

  describe(description: string, testFn: () => void): void {
    this.output(description);
    this.indent();
    testFn();
    this.dedent();
  }

  it(unitTestName: string, testFn: () => void): void {
    try {
      testFn();
      this.output(`PASS -- ${unitTestName}`);
      this.successCount++;
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
      this.failureCount++;
    }
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  getTestResults(): TestResult {
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      output: this.testOutput, 
    }
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

export interface TestResult {
  successCount: number,
  failureCount: number,
  output: string[],
}

class Expectation<T> {
  static readonly ERROR_NAME = '__expectation_error__';

  constructor(private readonly actual: T) {}

  toEqual(expected: T) {
    if (this.actual !== expected) {
      this.throw(`Expected ${expected}, got ${this.actual}.`);
    }
  }

  toThrow() {
    if (typeof this.actual !== 'function') {
      this.throw('Expectation is not a function');
    }

    try {
      this.actual();
      this.throw('Expected function to throw.');
    } catch (e) {}
  }

  private throw(message: string): never {
    const error = new Error(message);
    error.name = Expectation.ERROR_NAME;
    throw error;
  }
}