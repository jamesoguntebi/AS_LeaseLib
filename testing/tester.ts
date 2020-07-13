export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;
  private testOutput: string[] = [];

  // Empty state allows beforeEach and afterEach, hence one context starting in
  // the stack.
  private currentDescriptionContext: DescriptionContext =
      {successCount: 0, failureCount: 0, output: []};
  private descriptionContextStack: DescriptionContext[] =
      [this.currentDescriptionContext];

  private isInsideUnit = false;

  constructor(private readonly verbose: boolean) {}

  describe(description: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for describe()');
    }

    this.currentDescriptionContext =
        {successCount: 0, failureCount: 0, output: []};
    this.descriptionContextStack.push(this.currentDescriptionContext);
    this.indent();

    testFn();

    this.dedent();

    // Remove the description context, and handle its statistics and output.
    const {successCount, failureCount, output: lastContextOutput} =
        this.descriptionContextStack.pop();

    this.currentDescriptionContext =
        this.descriptionContextStack[this.descriptionContextStack.length - 1]; 

    this.currentDescriptionContext.successCount += successCount;
    this.currentDescriptionContext.failureCount += failureCount;
    
    if (this.verbose || failureCount) {
      const descriptionWithStats = Array(this.indentation + 1).join(' ') +
          `${description} -- ${Tester.getStats(successCount, failureCount)}`;
      this.testOutput.push(descriptionWithStats, ...lastContextOutput);
    }
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
      if (this.verbose) this.output(`PASS -- ${unitTestName}`);
      this.currentDescriptionContext.successCount++;
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
      this.currentDescriptionContext.failureCount++;
    }

    for (const context of this.descriptionContextStack) context.afterEach?.();

    this.isInsideUnit = false;
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  getTestResults(): TestResult {
    return {
      successCount: this.currentDescriptionContext.successCount,
      failureCount: this.currentDescriptionContext.failureCount,
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
    result.split('\n').forEach(line => {
      this.currentDescriptionContext.output.push(
          Array(this.indentation + 1).join(' ') + line);
    });
  }
  
  static getStats(success: number, failure: number): string {
    return `${success + failure} run, ${success} pass, ${failure} fail`;
  }
}

export interface DescriptionContext {
  beforeEach?: () => void,
  afterEach?: () => void,
  successCount: number,
  failureCount: number,
  output: string[];
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

  toNotThrow() {
    if (typeof this.actual !== 'function') {
      this.throw('Expectation is not a function');
    }

    try {
      this.actual();
    } catch (e) {
      this.throw('Expected function not to throw.');
    }
  }

  private throw(message: string): never {
    const error = new Error(message);
    error.name = Expectation.ERROR_NAME;
    throw error;
  }
}