export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;
  private testOutput: string[] = [];
  private successCount = 0;
  private failureCount = 0;

  // Empty state allows beforeEach and afterEach, hence one context starting in
  // the stack.
  private currentDescriptionContext: DescriptionContext = {};
  private descriptionContextStack: DescriptionContext[] =
      [this.currentDescriptionContext];
  private beforeEachFns: Array<() => void> = [];
  private afterEachFns: Array<() => void> = [];

  private isInsideUnit = false;

  describe(description: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for describe()');
    }

    this.currentDescriptionContext = {};
    this.descriptionContextStack.push(this.currentDescriptionContext);
    this.output(description);
    this.indent();

    testFn();

    this.dedent();
    this.descriptionContextStack.pop();
  }

  beforeEach(beforeFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for beforeEach()');
    }
    if (this.currentDescriptionContext.beforeEach) {
      throw new Error('This description context already has beforeEach()');
    }
    this.currentDescriptionContext.beforeEach = beforeFn;
  }

  afterEach(afterFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for beforeEach()');
    }
    if (this.currentDescriptionContext.afterEach) {
      throw new Error('This description context already has afterEach()');
    }
    this.currentDescriptionContext.afterEach = afterFn;
  }

  it(unitTestName: string, testFn: () => void): void {
    this.isInsideUnit = true;

    for (const context of this.descriptionContextStack) context.beforeEach?.();

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

    for (const context of this.descriptionContextStack) context.afterEach?.();

    this.isInsideUnit = false;
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

  private isInDescriptionContext() {
    this.indentation -= Tester.INDENT_PER_LEVEL;
  }

  private output(result: string) {
    result.split('\n').forEach(line =>
        this.testOutput.push(Array(this.indentation + 1).join(' ') + line));
  }
}

export interface DescriptionContext {
  beforeEach?: () => void,
  afterEach?: () => void,
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
    const fail = () => this.throw(`Expected ${expected}, got ${this.actual}.`);

    if (Array.isArray(expected) && Array.isArray(this.actual)) {
      const end = Math.max(expected.length, this.actual.length);
      let pass = true;
      for (let i = 0; i < end; i++) {
        if (this.actual[i] !== expected[i]) {
          pass = false;
          break;
        }
      }
      if (!pass) fail();
      return;
    }

    if (this.actual !== expected) fail();
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