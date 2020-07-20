import Config, { ConfigParams } from '../config';
import Spy from './spy';
import Expectation, { SpyMatcher } from './expectation';

export default class Tester {
  static readonly ERROR_NAME = 'TesterError';
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;

  // Empty state allows beforeEach and afterEach, hence one context starting in
  // the stack.
  private currentDescriptionContext = this.getEmptyDescriptionContext();
  private descriptionContextStack: DescriptionContext[] =
      [this.currentDescriptionContext];

  private isInsideUnit = false;

  constructor(private readonly verbose: boolean = true) {}

  setConfig(config: ConfigParams) {
    const spy = Spy.isSpy(Config.get) ?
        Spy.assertSpy(Config.get) : this.spyOn(Config, 'get');
    spy.and.returnValue(config);
  }

  describe(description: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError('Illegal context for describe()');
    }

    // If the current descriptionContext didn't execute it's beforeAlls yet
    // (because it had no it()s), execute them now.
    this.maybeExecuteBeforeAlls();

    this.currentDescriptionContext = this.getEmptyDescriptionContext();
    this.descriptionContextStack.push(this.currentDescriptionContext);
    this.indent();

    testFn();

    // If no it()s were called in this context, still call the beforeAlls, to
    // match any cleanup in afterAlls.
    this.maybeExecuteBeforeAlls();

    for (const afterAll of this.currentDescriptionContext.afterAlls) {
      afterAll();
    }

    this.dedent();

    // Remove the description context, and handle its statistics and output.
    const lastDescriptionContext = this.descriptionContextStack.pop();
    if (!lastDescriptionContext) {
      this.throwTesterError(
          'There should have been a description context here.');
    }
    const {successCount, failureCount, output: lastContextOutput, spies} =
        lastDescriptionContext;

    this.currentDescriptionContext =
        this.descriptionContextStack[this.descriptionContextStack.length - 1]; 

    this.currentDescriptionContext.successCount += successCount;
    this.currentDescriptionContext.failureCount += failureCount;
    
    if (this.verbose || failureCount) {
      const indentedDescription =
          Array(this.indentation + 1).join(' ') + description;
      this.currentDescriptionContext.output.push(
          '', indentedDescription, ...lastContextOutput);
    }

    // Reset spies in reverse order: First in, first out.
    for (const spy of spies.reverse()) spy.reset();
  }

  xdescribe(description: string, testFn: () => void): void {
    this.output(`\n${description} (skipped)`);
  }

  beforeAll(beforeFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError('Illegal context for beforeAll()');
    }
    this.currentDescriptionContext.beforeAlls.push(beforeFn);
  }

  beforeEach(beforeFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError('Illegal context for beforeEach()');
    }
    this.currentDescriptionContext.beforeEaches.push(beforeFn);
  }

  afterEach(afterFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError('Illegal context for beforeEach()');
    }
    this.currentDescriptionContext.afterEaches.push(afterFn);
  }

  afterAll(afterFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError('Illegal context for afterAll()');
    }
    this.currentDescriptionContext.afterAlls.push(afterFn);
  }

  private maybeExecuteBeforeAlls() {
    // It's a little tricky to tell when to call the beforeAlls, so we need to
    // make sure the are called only once.
    // - before the first it() in this describe()
    // - at the start of the first contained describe() (if there are no it()s)
    // - before the afterAlls() in this describe() if neither of the other two
    //   happen
    if (!this.currentDescriptionContext.successCount &&
        !this.currentDescriptionContext.failureCount &&
        !this.currentDescriptionContext.beforeAllsCalled) {
      for (const beforeAll of this.currentDescriptionContext.beforeAlls) {
        beforeAll();
      }
      this.currentDescriptionContext.beforeAllsCalled = true;
    }
  }

  it(unitTestName: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      this.throwTesterError(
          'Cannot nest it() units. Use a describe() for the outer.');
    }

    this.maybeExecuteBeforeAlls();

    const startTime = Date.now();

    for (const context of this.descriptionContextStack) {
      for (const beforeEach of context.beforeEaches) beforeEach();
    }

    let success: boolean;
    let failureOutput: string|undefined;

    try {
      this.isInsideUnit = true;
      testFn();
      success = true;
      this.currentDescriptionContext.successCount++;
    } catch (e) {
      if (e.name === Tester.ERROR_NAME) throw e;

      success = false;
      this.indent();
      failureOutput = e instanceof Error ?
          e.stack || e.message :
          'Exception during test execution. No error object.';
      this.dedent();
      this.currentDescriptionContext.failureCount++;
    } finally {
      this.isInsideUnit = false;
    }

    for (const context of this.descriptionContextStack) {
      for (const afterEach of context.afterEaches) afterEach();
      for (const spy of context.spies) spy.clearCalls();
    }

    if (this.verbose || !success) {
      const s = success ? '✓' : '✗';
      this.output(`${s} ${unitTestName} (in ${Date.now() - startTime} ms)`);
    };
    if (failureOutput) this.output(failureOutput);
  }

  xit(unitTestName: string, testFn: () => void): void {
    this.output(`○ ${unitTestName} (skipped)`);
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  spyOn<TObj, TProp extends keyof TObj>(object: TObj, method: TProp):
      Spy<TObj, TProp> {
    if (this.isInsideUnit) {
      this.throwTesterError('Spies cannot be installed inside unit tests.');
    }
    if (typeof object[method] !== 'function') {
      this.throwTesterError('Can only spy on functions');
    }
    const spy = new Spy(object, method);
    this.currentDescriptionContext.spies.push(spy);
    return spy;
  }

  matcher(argsMatcher: (args: unknown[]) => boolean) {
    return new SpyMatcher(argsMatcher);
  }

  finish(): TestResult {
    // Finish the root description context. Reset spies in reverse order: First
    // in, first out.
    const {afterAlls, spies} = this.currentDescriptionContext;
    this.maybeExecuteBeforeAlls();
    for (const afterAll of afterAlls) afterAll();
    for (const spy of spies.reverse()) spy.reset();

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

  private getEmptyDescriptionContext(): DescriptionContext {
    return {
      beforeAlls: [],
      beforeEaches: [],
      afterEaches: [],
      afterAlls: [],
      successCount: 0,
      failureCount: 0,
      output: [],
      spies: [],
    };
  }

  private throwTesterError(message: string) {
    const error = new Error(message);
    error.name = Tester.ERROR_NAME;
    throw error;
  }
}

export interface DescriptionContext {
  beforeAlls: Array<() => void>,
  beforeEaches: Array<() => void>,
  afterEaches: Array<() => void>,
  afterAlls: Array<() => void>,
  beforeAllsCalled?: boolean;
  successCount: number,
  failureCount: number,
  output: string[];
  spies: Spy<any, any>[];
}

export interface TestResult {
  successCount: number,
  failureCount: number,
  output: string[],
}