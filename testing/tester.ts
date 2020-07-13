export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;

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
      this.currentDescriptionContext.output.push(
          descriptionWithStats, ...lastContextOutput);
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
      output: this.currentDescriptionContext.output, 
    }
  }

  private indent() {
    this.indentation += Tester.INDENT_PER_LEVEL;
  }

  private dedent() {
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

  toThrow(expectedErrorMessage?: string) {
    if (typeof this.actual !== 'function') {
      this.throw('Expectation is not a function');
    }

    try {
      this.actual();
      this.throw('Expected function to throw.');
    } catch (e) {
      if (expectedErrorMessage) {
        const errorContent = e.stack || e.message || '';
        if (!errorContent.toLowerCase().includes(
                expectedErrorMessage.toLowerCase())) {
          this.augmentAndThrow(
              e, `Expected error to include '${expectedErrorMessage}'`);
        }
      }
    }
  }

  toNotThrow() {
    if (typeof this.actual !== 'function') {
      this.throw('Expectation is not a function');
    }

    try {
      this.actual();
    } catch (e) {
      const expectationMsg = 'Expected function not to throw.';
      if (e instanceof Error) {
        this.augmentAndThrow(e, expectationMsg);
      } else {
        this.throw(expectationMsg);
      }
    }
  }

  toContain(expectedContents: unknown) {
    if (typeof this.actual === 'string') {
      if (typeof expectedContents !== 'string') {
        throw new Error(`Cannot check containment in a string. Got ${
            typeof expectedContents}`)
      }
      if (!this.actual.includes(expectedContents)) {
        throw new Error(
          `Did not find '${expectedContents}' in '${this.actual}'.`);
      }
      return;
    }

    if (typeof Array.isArray(this.actual)) {
      if (!(this.actual as unknown as any[]).includes(expectedContents)) {
        throw new Error(
          `Did not find '${expectedContents}' in '${this.actual}'.`);
      }
      return;
    }

    throw new Error('Can only check containment of arrays and strings.');
  }

  private throw(message: string): never {
    const error = new Error(message);
    error.name = Expectation.ERROR_NAME;
    throw error;
  }

  private augmentAndThrow(e: Error, expectationMsg: string): never {
    e.message = `${expectationMsg}\n${e.message}`;
    e.stack = `${expectationMsg}\n${e.stack}`;
    throw e;
  }
}