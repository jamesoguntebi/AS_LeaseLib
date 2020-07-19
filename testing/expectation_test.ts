import SimpleTest from "./_simple_test";
import Spy from "./spy";
import Expectation from "./expectation";

export default class ExpectationTest extends SimpleTest {
  constructor() {
    super('ExpectationTest');
  }

  private failIfThrows(fn: Function) {
    try {
      fn();
    } catch {
      this.fail();
    }
  }

  private failIfNotThrows(fn: Function) {
    try {
      fn();
      this.fail();
    } catch {}
  }

  private createSpy(targetFn?: Function):
      {spy: Spy<any, any>, spiedFn: Function} {
    const object = {isASpy: targetFn ? targetFn : () => {}};
    return {spy: new Spy(object, 'isASpy'), spiedFn: object.isASpy};
  }

  testToEqual() {
    this.failIfThrows(() => new Expectation(5).toEqual(5));
    this.failIfNotThrows(() => new Expectation(5).toEqual(6));
  }

  testNotToEqual() {
    this.failIfThrows(() => new Expectation(5).not.toEqual(6));
    this.failIfNotThrows(() => new Expectation(5).not.toEqual(5));
  }

  testToThrow() {
    const throwA = () => {throw new Error('a')};
    const noThrow = () => {};

    this.failIfThrows(() => new Expectation(throwA).toThrow());
    this.failIfNotThrows(() => new Expectation(noThrow).toThrow());

    this.failIfThrows(() => new Expectation(throwA).toThrow('a'));
    this.failIfNotThrows(() => new Expectation(throwA).toThrow('b'));
  }

  testNotToThrow() {
    const throwA = () => {throw new Error('a')};
    const noThrow = () => {};

    this.failIfThrows(() => new Expectation(noThrow).not.toThrow());
    this.failIfNotThrows(() => new Expectation(throwA).not.toThrow());

    this.failIfThrows(() => new Expectation(throwA).not.toThrow('b'));
    this.failIfThrows(() => new Expectation(noThrow).not.toThrow('a'));
    this.failIfThrows(() => new Expectation(noThrow).not.toThrow('b'));
    this.failIfNotThrows(() => new Expectation(throwA).not.toThrow('a'));
  }

  testToContain() {
    this.failIfThrows(() => new Expectation('hello').toContain('ello'));
    this.failIfNotThrows(() => new Expectation('hello').toContain('hi'));

    this.failIfThrows(() => new Expectation([1, 2, 3]).toContain(2));
    this.failIfNotThrows(() => new Expectation([1, 2, 3]).toContain(4));

    this.failIfNotThrows(() => new Expectation(11).toContain(10));
    this.failIfNotThrows(() => new Expectation({a: 'apples'}).toContain('a'));
    this.failIfNotThrows(() => new Expectation({a: 'apples'})
        .toContain('apples'));
  }

  testNotToContain() {
    this.failIfThrows(() => new Expectation('hello').not.toContain('hi'));
    this.failIfNotThrows(() => new Expectation('hello').not.toContain('ello'));

    this.failIfThrows(() => new Expectation([1, 2, 3]).not.toContain(4));
    this.failIfNotThrows(() => new Expectation([1, 2, 3]).not.toContain(2));
  }

  testToHaveBeenCalled() {
    const object = {notASpy: () => {}};
    object.notASpy();
    this.failIfNotThrows(
        () => new Expectation(object.notASpy).toHaveBeenCalled());
    
    const {spiedFn: calledSpyFn} = this.createSpy();
    const {spiedFn: notCalledSpyFn} = this.createSpy();

    calledSpyFn();

    this.failIfThrows(() => new Expectation(calledSpyFn).toHaveBeenCalled());
    this.failIfNotThrows(
        () => new Expectation(notCalledSpyFn).toHaveBeenCalled());
  }

  testNotToHaveBeenCalled() {
    const {spiedFn: calledSpyFn} = this.createSpy();
    const {spiedFn: notCalledSpyFn} = this.createSpy();

    calledSpyFn();

    this.failIfThrows(
        () => new Expectation(notCalledSpyFn).not.toHaveBeenCalled());
    this.failIfNotThrows(
        () => new Expectation(calledSpyFn).not.toHaveBeenCalled());
  }
}