export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;

  // Empty state allows beforeEach and afterEach, hence one context starting in
  // the stack.
  private currentDescriptionContext: DescriptionContext =
      {successCount: 0, failureCount: 0, output: [], spies: []};
  private descriptionContextStack: DescriptionContext[] =
      [this.currentDescriptionContext];

  private isInsideUnit = false;

  constructor(private readonly verbose: boolean) {}

  describe(description: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for describe()');
    }

    this.currentDescriptionContext =
        {successCount: 0, failureCount: 0, output: [], spies: []};
    this.descriptionContextStack.push(this.currentDescriptionContext);
    this.indent();

    testFn();

    this.dedent();

    // Remove the description context, and handle its statistics and output.
    const {successCount, failureCount, output: lastContextOutput, spies} =
        this.descriptionContextStack.pop();

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

    for (const spy of spies) spy.reset();
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
    if (this.isInsideUnit) {
      throw new Error(
          'Cannot nest it() units. Use a describe() for the outer.');
    }

    for (const context of this.descriptionContextStack) context.beforeEach?.();

    this.isInsideUnit = true;

    const startTime = Date.now();
    try {
      testFn();
      if (this.verbose) {
        this.output(`✓ ${unitTestName} (in ${Date.now() - startTime} ms)`);
      };
      this.currentDescriptionContext.successCount++;
    } catch (e) {
      this.output(`✗ ${unitTestName} (in ${Date.now() - startTime} ms)`);
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

    this.isInsideUnit = false;

    for (const context of this.descriptionContextStack) {
      context.afterEach?.();
      for (const spy of context.spies) spy.clearCalls();
    };
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  spyOn<T, K extends keyof T>(object: T, method: K): Spy<T, K> {
    if (this.isInsideUnit) {
      throw new Error('Spies cannot be installed inside unit tests.');
    }
    if (typeof object[method] !== 'function') {
      throw new Error('Can only spy on functions');
    }
    const spy = new Spy(object, method);
    this.currentDescriptionContext.spies.push(spy);
    return spy;
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
}

export interface DescriptionContext {
  beforeEach?: () => void,
  afterEach?: () => void,
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

  toHaveBeenCalled() {
    const spy = this.actual[Spy.MARKER] as Spy<any, any> | undefined;
    if (!spy) {
      throw new Error('Call expectations are only valid for Spies.')
    }

    if (!spy.getCalls().length) {
      throw new Error(`Expected ${spy} to have been called.`);
    }
  }

  toNotHaveBeenCalled() {
    const spy = this.actual[Spy.MARKER] as Spy<any, any> | undefined;
    if (!spy) {
      throw new Error('Call expectations are only valid for Spies.')
    }

    if (spy.getCalls().length) {
      throw new Error(`Expected ${spy} to not have been called.`);
    }
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

class Spy<T, K extends keyof T> {
  static readonly MARKER = '__jas_spy__';
  private readonly calls: unknown[][] = [];
  private storedProperty: T[K];

  readonly and: SpyAction;

  constructor(private readonly object: T, private readonly property: K) {
    this.storedProperty = object[property];
    this.and = new SpyAction(this.storedProperty as unknown as Function);

    const newFunctionProperty = ((...params) => {
      this.calls.push(params);
      return this.and.call(params);
    }) as unknown as T[K];
    newFunctionProperty[Spy.MARKER] = this;

    object[property] = newFunctionProperty;
  }

  reset() {
    this.object[this.property] = this.storedProperty;
  }

  clearCalls() {
    this.calls.length = 0;
  }

  getCalls() {
    return this.calls;
  }

  toString() {
    const objectString = this.object.constructor.name === 'Function' ?
        this.object['name'] : this.object.constructor.name;
    return `${objectString}.${this.property}`;
  }
}

class SpyAction {
  private actionType = SpyActionType.DO_NOTHING;
  private fakeCall: Function|null = null;

  constructor(private readonly defaultImplementation: Function) {}

  call(params: unknown[]): unknown {
    switch(this.actionType) {
      case SpyActionType.CALL_THROUGH:
        return this.defaultImplementation(...params);
      case SpyActionType.DO_NOTHING:
        break;
      case SpyActionType.FAKE:
        return this.fakeCall(...params);
    }
  }

  callThrough() {
    this.actionType = SpyActionType.CALL_THROUGH;
  }

  stub() {
    this.actionType = SpyActionType.DO_NOTHING;
  }

  callFake(fakeFn: Function) {
    this.actionType = SpyActionType.FAKE;
    this.fakeCall = fakeFn;
  }

  returnValue(retValue: unknown) {
    this.actionType = SpyActionType.FAKE;
    this.fakeCall = () => retValue;
  }
}

enum SpyActionType {
  CALL_THROUGH,
  DO_NOTHING,
  FAKE,
}