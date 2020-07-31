import Tester from "./testing/tester";
import Util from "./util";
import { JASLib } from "jas_api"

export default class UtilTest implements JASLib.Test {
  readonly name: string = 'UtilTest';

  run(t: Tester) {
    t.describe('formatMoney', () => {
      t.it('adds commas in large numbers', () => {
        t.expect(Util.formatMoney(1500)).toEqual('$1,500');
      });

      t.it('handles negative numbers', () => {
        t.expect(Util.formatMoney(-50)).toEqual('-$50');
      });

      t.it('rounds decimals', () => {
        t.expect(Util.formatMoney(15.12848)).toEqual('$15.13');
      });

      t.it('combines correct formatting', () => {
        t.expect(Util.formatMoney(-4119283.12848)).toEqual('-$4,119,283.13');
      });
    });
  }
}