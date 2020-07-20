import SimpleTest from "./_simple_test";
import Spy from "./spy";
import Expectation, { SpyMatcher } from "./expectation";

export default class ExpectationTest extends SimpleTest {
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

  testToHaveBeenCalledTimes() {
    const {spiedFn} = this.createSpy();
    spiedFn();
    spiedFn();

    this.failIfThrows(() => new Expectation(spiedFn).toHaveBeenCalledTimes(2));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledTimes(3));
  }

  testNotToHaveBeenCalledTimes() {
    const {spiedFn} = this.createSpy();
    spiedFn();
    spiedFn();

    this.failIfThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledTimes(3));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledTimes(2));
  }

  testToHaveBeenCalledLike() {
    const {spiedFn} = this.createSpy();
    spiedFn('a');
    spiedFn('b');

    const aMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'a');
    const bMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'b');
    const cMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'c');

    this.failIfThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledLike(aMatcher));
    this.failIfThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledLike(bMatcher));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledLike(cMatcher));
  }

  testNotToHaveBeenCalledLike() {
    const {spiedFn} = this.createSpy();
    spiedFn('a');
    spiedFn('b');

    const aMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'a');
    const bMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'b');
    const cMatcher = new SpyMatcher((args: unknown[]) => args[0] === 'c');

    this.failIfThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledLike(cMatcher));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledLike(aMatcher));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledLike(bMatcher));
  }

  testToHaveBeenCalledWith() {
    const {spiedFn} = this.createSpy();
    spiedFn('a');
    spiedFn('b');

    this.failIfThrows(() => new Expectation(spiedFn).toHaveBeenCalledWith('a'));
    this.failIfThrows(() => new Expectation(spiedFn).toHaveBeenCalledWith('b'));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledWith('c'));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).toHaveBeenCalledWith('a', 'b'));
  }

  testNotToHaveBeenCalledWith() {
    const {spiedFn} = this.createSpy();
    spiedFn('a');
    spiedFn('b');

    this.failIfThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledWith('c'));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledWith('a'));
    this.failIfNotThrows(
        () => new Expectation(spiedFn).not.toHaveBeenCalledWith('b'));
  }

  testToBeUndefined() {
    let a: string, b: string = 'hi';
    this.failIfThrows(() => new Expectation(a).toBeUndefined());
    this.failIfNotThrows(() => new Expectation(b).toBeUndefined());
  }

  testNotToBeUndefined() {
    let a: string, b: string = 'hi';
    this.failIfThrows(() => new Expectation(b).not.toBeUndefined());
    this.failIfNotThrows(() => new Expectation(a).not.toBeUndefined());
  }
}