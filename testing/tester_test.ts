import SimpleTest from "./_simple_test";
import Tester from "./tester";
import Config from "../config";
import Util from "./util";

export default class TesterTest extends SimpleTest {
  private createFail(): () => void {
    return () => {
      throw new Error();
    };
  }

  private createSuccess(): () => void {
    return () => {};
  }

  private callBeforesAndAfters(
      t: Tester, getCaller: (id: string) => () => void, dPrefix: string) {
    t.beforeAll(getCaller(`${dPrefix}-ba1`));
    t.beforeAll(getCaller(`${dPrefix}-ba2`));

    t.beforeEach(getCaller(`${dPrefix}-be1`));
    t.beforeEach(getCaller(`${dPrefix}-be2`));

    t.afterEach(getCaller(`${dPrefix}-ae1`));
    t.afterEach(getCaller(`${dPrefix}-ae2`));

    t.afterAll(getCaller(`${dPrefix}-aa1`));
    t.afterAll(getCaller(`${dPrefix}-aa2`));
  }

  // Adds to test units to the Tester's current context. A success and a fail.
  private callIts(t: Tester, dPrefix: string) {
    t.it(`${dPrefix}-t1`, this.createFail());
    t.it(`${dPrefix}-t2`, this.createSuccess());
  }

  /**
   * Runs a bunch of describe(), it(), before*(), after*() scenarios on a new
   * Tester, and returns the test result. Also returns a map containing call
   * counts for before*() and after*() testing.
   */
  private doAllTestScenarios() {
    const t = new Tester();

    const calls = new Map<string, number>();
    const getCaller = (id: string) => {
      return function(cid: string) {
        if (!calls.get(cid)) calls.set(cid, 0);
        calls.set(cid, calls.get(cid) + 1);
      }.bind(null, id);
    };

    this.callBeforesAndAfters(t, getCaller, 'd0');

    t.describe('deepy nested describe', () => {
      this.callBeforesAndAfters(t, getCaller, 'd1');
      this.callIts(t, 'd1');

      t.describe('d1.1', () => {
        this.callBeforesAndAfters(t, getCaller, 'd1.1');
        this.callIts(t, 'd1.1');

        t.describe('d1.1.1', () => {
          this.callBeforesAndAfters(t, getCaller, 'd1.1.1');
          this.callIts(t, 'd1.1.1');
        });
      });
      t.describe('d1.2', () => {
        this.callBeforesAndAfters(t, getCaller, 'd1.2');
        this.callIts(t, 'd1.2');
      });
    });
    t.describe('second describe, its defined before befores and afters', () => {
      this.callIts(t, 'd2');
      this.callBeforesAndAfters(t, getCaller, 'd2');
    });
    t.describe('describe with no tests', () => {});
    t.describe('describe with only grandchild tests', () => {
      t.describe('d4.1', () => {
        this.callIts(t, 'd4.1');
      });
    });
    t.describe('describe with befores and afters and no tests', () => {
      this.callBeforesAndAfters(t, getCaller, 'd5');
    });
    t.describe('describe with befores and no afters', () => {
      t.beforeAll(getCaller(`d6-ba1`));
      t.beforeAll(getCaller(`d6-ba2`));
  
      t.beforeEach(getCaller(`d6-be1`));
      t.beforeEach(getCaller(`d6-be2`));

      this.callIts(t, 'd6');
    });
    t.describe('describe with after and no befores', () => {
      t.afterEach(getCaller(`d7-ae1`));
      t.afterEach(getCaller(`d7-ae2`));
  
      t.afterAll(getCaller(`d7-aa1`));
      t.afterAll(getCaller(`d7-aa2`));

      this.callIts(t, 'd7');
    });

    return {calls, ...t.finish()};
  }

  testSetConfig() {
    const t = new Tester();
    const loanConfig = Config.getLoanConfigForTest();
    const rentConfig = Config.getRentConfigForTest();

    Config.get = () => loanConfig;
    if (!Util.equals(Config.get(), loanConfig)) this.fail();

    t.setConfig(rentConfig);
    if (!Util.equals(Config.get(), rentConfig)) this.fail();

    const thirdConfig = Config.getLoanConfigForTest(
        {customerDisplayName: 'replace-display-name'});
    if (Util.equals(loanConfig, thirdConfig)) this.fail();
    if (Util.equals(rentConfig, thirdConfig)) this.fail();
    t.setConfig(thirdConfig);
    if (!Util.equals(Config.get(), thirdConfig)) this.fail();

    t.finish();
  }

  testFinish_stats() {
    const {successCount, failureCount} = this.doAllTestScenarios();

    if (successCount !== 8) this.fail();
    if (failureCount !== 8) this.fail();
  }

  testXdescribe() {
    const t = new Tester();

    t.it(`1`, this.createSuccess());
    t.it(`2`, this.createSuccess());

    t.xdescribe('level1', () => {
      t.it(`1`, this.createFail());
      t.it(`2`, this.createSuccess());

      t.describe('level2', () => {
        t.it(`1`, this.createFail());
        t.it(`2`, this.createFail());
      });
    });

    const {successCount, failureCount} = t.finish();
    if (successCount !== 2) this.fail();
    if (failureCount !== 0) this.fail();
  }

  testBeforeAll() {
    const {calls} = this.doAllTestScenarios();

    if (calls.get('d0-ba1') !== 1) this.fail();
    if (calls.get('d0-ba2') !== 1) this.fail();
    if (calls.get('d1-ba1') !== 1) this.fail();
    if (calls.get('d1-ba2') !== 1) this.fail();
    if (calls.get('d1.1-ba1') !== 1) this.fail();
    if (calls.get('d1.1-ba2') !== 1) this.fail();
    if (calls.get('d1.1.1-ba1') !== 1) this.fail();
    if (calls.get('d1.1.1-ba2') !== 1) this.fail();
    if (calls.get('d1.2-ba1') !== 1) this.fail();
    if (calls.get('d1.2-ba2') !== 1) this.fail();
    if (calls.get('d5-ba1') !== 1) this.fail();
    if (calls.get('d5-ba2') !== 1) this.fail();
    if (calls.get('d6-ba1') !== 1) this.fail();
    if (calls.get('d6-ba2') !== 1) this.fail();
  }

  testBeforeEach() {
    const {calls} = this.doAllTestScenarios();

    if (calls.get('d0-be1') !== 16) this.fail();
    if (calls.get('d0-be2') !== 16) this.fail();
    if (calls.get('d1-be1') !== 8) this.fail();
    if (calls.get('d1-be2') !== 8) this.fail();
    if (calls.get('d1.1-be1') !== 4) this.fail();
    if (calls.get('d1.1-be2') !== 4) this.fail();
    if (calls.get('d1.1.1-be1') !== 2) this.fail();
    if (calls.get('d1.1.1-be2') !== 2) this.fail();
    if (calls.get('d1.2-be1') !== 2) this.fail();
    if (calls.get('d1.2-be2') !== 2) this.fail();
    if (calls.get('d6-be1') !== 2) this.fail();
    if (calls.get('d6-be2') !== 2) this.fail();
  }

  testAfterEach() {
    const {calls} = this.doAllTestScenarios();

    if (calls.get('d0-ae1') !== 16) this.fail();
    if (calls.get('d0-ae2') !== 16) this.fail();
    if (calls.get('d1-ae1') !== 8) this.fail();
    if (calls.get('d1-ae2') !== 8) this.fail();
    if (calls.get('d1.1-ae1') !== 4) this.fail();
    if (calls.get('d1.1-ae2') !== 4) this.fail();
    if (calls.get('d1.1.1-ae1') !== 2) this.fail();
    if (calls.get('d1.1.1-ae2') !== 2) this.fail();
    if (calls.get('d1.2-ae1') !== 2) this.fail();
    if (calls.get('d1.2-ae2') !== 2) this.fail();
    if (calls.get('d7-ae1') !== 2) this.fail();
    if (calls.get('d7-ae2') !== 2) this.fail();
  }

  testAfterAll() {
    const {calls} = this.doAllTestScenarios();

    if (calls.get('d0-aa1') !== 1) this.fail();
    if (calls.get('d0-aa2') !== 1) this.fail();
    if (calls.get('d1-aa1') !== 1) this.fail();
    if (calls.get('d1-aa2') !== 1) this.fail();
    if (calls.get('d1.1-aa1') !== 1) this.fail();
    if (calls.get('d1.1-aa2') !== 1) this.fail();
    if (calls.get('d1.1.1-aa1') !== 1) this.fail();
    if (calls.get('d1.1.1-aa2') !== 1) this.fail();
    if (calls.get('d1.2-aa1') !== 1) this.fail();
    if (calls.get('d1.2-aa2') !== 1) this.fail();
    if (calls.get('d5-aa1') !== 1) this.fail();
    if (calls.get('d5-aa2') !== 1) this.fail();
    if (calls.get('d7-aa1') !== 1) this.fail();
    if (calls.get('d7-aa2') !== 1) this.fail();
  }

  testDescribe_illegalContext() {
    const t = new Tester();

    t.it('t1', () => {
      this.failIfNotThrows(() => t.describe('t1-d1', () => {}));
    });
  }

  testBeforesAndAfters_illegalContext() {
    const t = new Tester();

    t.it('t1', () => {
      this.failIfNotThrows(() => t.beforeAll(() => {}));
      this.failIfNotThrows(() => t.beforeEach(() => {}));
      this.failIfNotThrows(() => t.afterEach(() => {}));
      this.failIfNotThrows(() => t.afterAll(() => {}));
    });
  }

  testIt_illegalContext() {
    const t = new Tester();

    t.it('t1', () => {
      this.failIfNotThrows(() => t.it('t1.1', () => {}));
    });
  }
  
  testXit() {
    const t = new Tester();

    t.xit(`1`, this.createSuccess());
    t.it(`2`, this.createSuccess());

    t.describe('level1', () => {
      t.it(`1`, this.createFail());
      t.xit(`2`, this.createSuccess());

      t.describe('level2', () => {
        t.xit(`1`, this.createFail());
        t.it(`2`, this.createFail());
      });
    });

    const {successCount, failureCount} = t.finish();
    if (successCount !== 1) this.fail();
    if (failureCount !== 2) this.fail();
  }

  testSpyOn() {
    const t = new Tester();
    const object = {targetFn: () => 'a'};

    if (object.targetFn() !== 'a') this.fail();

    t.it('t1', () => {
      t.spyOn(object, 'targetFn').and.returnValue('a1');
      if (object.targetFn() !== 'a1') this.fail();
    });

    if (object.targetFn() !== 'a') this.fail();

    t.spyOn(object, 'targetFn').and.returnValue('b');
    if (object.targetFn() !== 'b') this.fail();

    t.describe('d', () => {
      if (object.targetFn() !== 'b') this.fail();

      t.it('t2', () => {
        t.spyOn(object, 'targetFn').and.returnValue('b1');
        if (object.targetFn() !== 'b1') this.fail();
      });
  
      if (object.targetFn() !== 'b') this.fail();

      t.spyOn(object, 'targetFn').and.returnValue('c');
      if (object.targetFn() !== 'c') this.fail();
    });

    if (object.targetFn() !== 'b') this.fail();

    t.finish();

    if (object.targetFn() !== 'a') this.fail();
  }
}