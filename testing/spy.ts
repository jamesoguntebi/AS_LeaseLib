export default class Spy<TObj, TProp extends keyof TObj> {
  static isSpy(object: unknown): object is {[Spy.MARKER]: Spy<any, any>} {
    return !!(object as {[Spy.MARKER]?: unknown})[Spy.MARKER];
  }

  static assertSpy(object: unknown): Spy<any, any> {
    if (!Spy.isSpy(object)) throw new Error('Object is not a spy.');
    return object[Spy.MARKER];
  }

  private static readonly MARKER = '__jas_spy__';
  private readonly calls: unknown[][] = [];
  private storedProperty: TObj[TProp];

  readonly and: SpyAction;

  constructor(private readonly object: TObj, private readonly property: TProp) {
    this.storedProperty = object[property];
    this.and = new SpyAction(this.storedProperty as unknown as Function);

    const newFunctionProperty = ((...params: unknown[]) => {
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
    const objectString = this.object['constructor'].name === 'Function' ?
        this.object['name'] : this.object['constructor'].name;
    return `${objectString}.${this.property}`;
  }
}

export class SpyAction {
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
        return this.fakeCall!(...params);
    }
  }

  callThrough() {
    this.actionType = SpyActionType.CALL_THROUGH;
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
