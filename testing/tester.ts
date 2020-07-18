import Config, { ConfigParams } from "../config";

export class Tester {
  private static readonly INDENT_PER_LEVEL = 2;
  private indentation = Tester.INDENT_PER_LEVEL;

  // Empty state allows beforeEach and afterEach, hence one context starting in
  // the stack.
  private currentDescriptionContext = this.getEmptyDescriptionContext();
  private descriptionContextStack: DescriptionContext[] =
      [this.currentDescriptionContext];

  private isInsideUnit = false;

  constructor(private readonly verbose: boolean) {}

  setConfig(config: ConfigParams) {
    const spy = Spy.isSpy(Config.get) ?
        Spy.assertSpy(Config.get) : this.spyOn(Config, 'get');
    spy.and.returnValue(config);
  }

  describe(description: string, testFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for describe()');
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

  xdescribe(description: string, testFn: () => void): void {
    this.output(`\n${description} (skipped)`);
  }

  beforeAll(beforeFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for beforeAll()');
    }
    this.currentDescriptionContext.beforeAlls.push(beforeFn);
  }

  beforeEach(beforeFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for beforeEach()');
    }
    this.currentDescriptionContext.beforeEaches.push(beforeFn);
  }

  afterEach(afterFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for beforeEach()');
    }
    this.currentDescriptionContext.afterEaches.push(afterFn);
  }

  afterAll(afterFn: () => void): void {
    if (this.isInsideUnit) {
      throw new Error('Illegal context for afterAll()');
    }
    this.currentDescriptionContext.afterAlls.push(afterFn);
  }

  maybeExecuteBeforeAlls() {
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
      throw new Error(
          'Cannot nest it() units. Use a describe() for the outer.');
    }

    this.maybeExecuteBeforeAlls();

    const startTime = Date.now();

    for (const context of this.descriptionContextStack) {
      for (const beforeEach of context.beforeEaches) beforeEach();
    }

    this.isInsideUnit = true;
    let success: boolean;

    try {
      testFn();
      success = true;
      this.currentDescriptionContext.successCount++;
    } catch (e) {
      success = false;
      this.indent();
      if (e instanceof Error) {
        this.output(e.stack || e.message);
      } else {
        this.output('Exception during test execution. No error object.')
      }
      this.dedent();
      this.currentDescriptionContext.failureCount++;
    }

    this.isInsideUnit = false;

    for (const context of this.descriptionContextStack) {
      for (const afterEach of context.afterEaches) afterEach();
      for (const spy of context.spies) spy.clearCalls();
    }

    if (this.verbose || !success) {
      const s = success ? '✓' : '✗';
      this.output(`${s} ${unitTestName} (in ${Date.now() - startTime} ms)`);
    };
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
      throw new Error('Spies cannot be installed inside unit tests.');
    }
    if (typeof object[method] !== 'function') {
      throw new Error('Can only spy on functions');
    }
    const spy = new Spy(object, method);
    this.currentDescriptionContext.spies.push(spy);
    return spy;
  }

  matcher(argsMatcher: (args: unknown[]) => boolean) {
    return new SpyMatcher(argsMatcher);
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

class Expectation<T> {
  /** The inverse of this expectation. */
  readonly not: Expectation<T>;
  readonly notString: string;

  constructor(
    private readonly actual: T,
    private readonly isInverse = false,
    notSource?: Expectation<T>
  ) {
    this.not = notSource ?? new Expectation(actual, !this.isInverse, this);
    this.notString = this.isInverse ? 'not ' : '';
  }

  toEqual(expected: T) {
    const equals = Expectation.equals(this.actual, expected);
    if (equals && this.isInverse) {
      throw new Error(`Expected anything but ${expected}.`);
    } else if (!equals && !this.isInverse) {
      throw new Error(`Expected ${expected}, got ${this.actual}.`);
    }
  }

  toThrow(expectedErrorMessage?: string) {
    if (typeof this.actual !== 'function') {
      throw new Error('Expectation is not a function');
    }

    const errorMatchesMessage = (e: unknown): boolean => {
      if (!(e instanceof Error) || !expectedErrorMessage) return false;

      const errorContent = e.stack || e.message || '';
      return errorContent
        .toLowerCase()
        .includes(expectedErrorMessage.toLowerCase());
    };

    const DO_NOT_CATCH = String(Math.random());
    try {
      this.actual();
      if (!this.isInverse) throw new Error(DO_NOT_CATCH);
    } catch (e) {
      if (!this.isInverse && e.message === DO_NOT_CATCH) {
        throw new Error('Expected function to throw.');
      }

      if (!expectedErrorMessage) {
        const expectationMsg = `Expected function ${this.notString}to throw.`;
        if (e instanceof Error) {
          Expectation.augmentAndThrow(e, expectationMsg);
        } else {
          throw new Error(expectationMsg);
        }
      }

      if (this.isInverse === errorMatchesMessage(e)) {
        Expectation.augmentAndThrow(
          e,
          `Expected error ${this.notString}to include '${expectedErrorMessage}'`
        );
      }
    }
  }

  toContain(expectedContents: unknown) {
    if (typeof this.actual === 'string') {
      if (typeof expectedContents !== 'string') {
        throw new Error(
          `Cannot check containment in a string. Got ${typeof expectedContents}`
        );
      }
      if (this.isInverse === this.actual.includes(expectedContents)) {
        throw new Error(
          `Expected ${this.actual} ${this.notString}to contain '${expectedContents}'.`
        );
      }
      return;
    }

    if (typeof Array.isArray(this.actual)) {
      if (
        this.isInverse ===
        ((this.actual as unknown) as any[]).includes(expectedContents)
      ) {
        throw new Error(
          `Expected ${this.actual} ${this.notString}to contain '${expectedContents}'.`
        );
      }
      return;
    }

    throw new Error('Can only check containment of arrays and strings.');
  }

  toHaveBeenCalled() {
    const spy = Spy.assertSpy(this.actual);
    if (this.isInverse === !!spy.getCalls().length) {
      throw new Error(`Expected ${spy} ${this.notString}to have been called.`);
    }
  }

  toHaveBeenCalledTimes(expected: number) {
    const spy = Spy.assertSpy(this.actual);
    const actual = spy.getCalls().length;
    if (this.isInverse === (actual === expected)) {
      throw new Error(
        `Expected ${spy} ${
          this.notString
        }to have been called ${expected} times.${
          this.isInverse ? '' : ` Called ${actual} times.`
        }`
      );
    }
  }

  toHaveBeenCalledLike(spyMatcher: SpyMatcher) {
    const spy = Spy.assertSpy(this.actual);
    const someCallMatches = spy.getCalls().some((callArgs: unknown[]) => {
      return spyMatcher.argsMatcher(callArgs);
    });
    if (this.isInverse === someCallMatches) {
      throw new Error(
        `Expected ${spy} ${this.notString}to have been called ` +
          `according to this matcher.`
      );
    }
  }

  toHaveBeenCalledWith(...expectedArgs: unknown[]) {
    const spy = Spy.assertSpy(this.actual);
    const someCallMatches = spy.getCalls().some((callArgs: unknown[]) => {
      return Expectation.arrayEquals(expectedArgs, callArgs);
    });
    if (this.isInverse === someCallMatches) {
      throw new Error(
        `Expected ${spy} ${this.notString}to have been called ` +
          `with the given parameters.`
      );
    }
  }

  toBeUndefined() {
    if (this.isInverse === (this.actual === undefined)) {
      throw new Error(
        `Expected ${this.actual} ${this.notString}to be undefined.`
      );
    }
  }

  private static augmentAndThrow(e: Error, expectationMsg: string): never {
    e.message = `${expectationMsg}\n${e.message}`;
    e.stack = `${expectationMsg}\n${e.stack}`;
    throw e;
  }

  private static isPOJO(arg: unknown): arg is Record<string, unknown> {
    if (arg == null || typeof arg !== 'object') {
      return false;
    }
    const proto = Object.getPrototypeOf(arg);
    // Prototype may be null if you used `Object.create(null)`
    // Checking `proto`'s constructor is safe because `getPrototypeOf()`
    // explicitly crosses the boundary from object data to object metadata.
    return !proto || proto.constructor.name === 'Object';
  }

  private static equals<U>(a: U, b: U): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return Expectation.arrayEquals(a, b);
    }

    if (Expectation.isPOJO(a) && Expectation.isPOJO(b)) {
      return Expectation.pojoEquals(a, b);
    }

    return a === b;
  }

  private static arrayEquals(arr1: unknown[], arr2: unknown[]): boolean {
    if (arr1.length !== arr2.length) return false;
    const end = Math.max(arr1.length, arr2.length);
    return arr1.every((el, i) => Expectation.equals(arr1, arr2));
  }

  private static pojoEquals(
    obj1: Record<string, unknown>,
    obj2: Record<string, unknown>
  ): boolean {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
    for (const key in obj1) {
      if (!Expectation.equals(obj1[key], obj2[key])) return false;
    }
    return true;
  }
}

class Spy<TObj, TProp extends keyof TObj> {
  private static readonly MARKER = '__jas_spy__';
  private readonly calls: unknown[][] = [];
  private storedProperty: TObj[TProp];

  readonly and: SpyAction;

  static isSpy(object: unknown): boolean {
    return !!object[Spy.MARKER];
  }

  static assertSpy(object: unknown): Spy<any, any> {
    const spy = object[Spy.MARKER] as Spy<any, any> | undefined;
    if (!spy) throw new Error('Object is not a spy.');
    return spy;
  }

  constructor(private readonly object: TObj, private readonly property: TProp) {
    this.storedProperty = object[property];
    this.and = new SpyAction(this.storedProperty as unknown as Function);

    const newFunctionProperty = ((...params) => {
      this.calls.push(params);
      return this.and.call(params);
    }) as unknown as TObj[TProp];
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

class SpyMatcher {
  constructor(readonly argsMatcher: (...any) => boolean) {}
}
