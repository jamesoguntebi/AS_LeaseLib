import Spy from "./spy";
import SimpleTest from "./_simple_test";
import Util from "./util";

export default class SpyTest extends SimpleTest {
  private createSpy(targetFn?: Function):
      {spy: Spy<any, any>, spiedFn: Function} {
    const object = {isASpy: targetFn ? targetFn : () => {}};
    return {spy: new Spy(object, 'isASpy'), spiedFn: object.isASpy};
  }

  testAssertSpyFailsNonSpies() {
    const object = {notASpy: () => {}};
    try {
      Spy.assertSpy(object.notASpy);
      this.fail();
    } catch {}
  }

  testAssertSpyPassesSpies() {
    try {
      Spy.assertSpy(this.createSpy().spiedFn);
    } catch {
      this.fail();
    }
  }

  testCallCount() {
    const {spy, spiedFn} = this.createSpy();
    const expectedCount = 4;
    for (let i = 0; i < expectedCount; i++) spiedFn();

    if (spy.getCalls().length !== expectedCount) this.fail();
  }

  testCallArgs() {
    const {spy, spiedFn} = this.createSpy();

    spiedFn(42, 'DiscMage', null);
    spiedFn(undefined, [1, 5, 9]);
    spiedFn(0, {a: 'apples', b: 'bananas', c: 'carrots'});

    const calls = spy.getCalls();
    if (!Util.equals(calls[0], [42, 'DiscMage', null])) this.fail();
    if (!Util.equals(calls[1], [undefined, [1, 5, 9]])) this.fail();
    if (!Util.equals(
        calls[2], [0, {a: 'apples', b: 'bananas', c: 'carrots'}])) {
      this.fail();
    }
  }

  testReset() {
    const {spy, spiedFn} = this.createSpy();
    spy.reset();

    try {
      Spy.assertSpy(spiedFn);
      this.fail();
    } catch {}
  }

  testClearCalls() {
    const {spy, spiedFn} = this.createSpy();
    for (let i = 0; i < 5; i++) spiedFn();
    spy.clearCalls();

    if (spy.getCalls().length !== 0) this.fail();
  }

  testDefaultSpyAction() {
    let name = 'Gandalf the Grey';
    const upgrade = () => name = 'Gandalf the White';
    const {spy, spiedFn} = this.createSpy(upgrade);

    spiedFn();

    if (spy.getCalls().length !== 1) this.fail();
    if (name !== 'Gandalf the Grey') this.fail();
  }

  testAndCallThrough() {
    const upgrade = (color: string) => `Gandalf the ${color}`;
    const {spy, spiedFn} = this.createSpy(upgrade);
    spy.and.callThrough();

    const upgraded = spiedFn('White');

    if (spy.getCalls().length !== 1) this.fail();
    if (upgraded !== 'Gandalf the White') this.fail();
  }

  testAndCallFake() {
    const upgrade = (color: string) => `Gandalf the ${color}`;
    const {spy, spiedFn} = this.createSpy(upgrade);
    spy.and.callFake((color: string) => `Saruman the ${color}`);

    const faked = spiedFn('White');

    if (spy.getCalls().length !== 1) this.fail();
    if (faked !== 'Saruman the White') this.fail();
  }

  testAndReturnValue() {
    let name = 'Gandalf the Grey';
    const getName = () => name;
    const {spy, spiedFn} = this.createSpy(getName);
    spy.and.returnValue('Mithrandir');

    const retrievedName = spiedFn();

    if (spy.getCalls().length !== 1) this.fail();
    if (retrievedName !== 'Mithrandir') this.fail();
  }
}