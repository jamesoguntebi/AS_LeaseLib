import {JASLib} from 'jas_api'

import Util from './_util';
import Tester from './testing/tester';

export default class UtilTest implements JASLib.Test {
  readonly name: string = 'UtilTest';

  run(t: Tester) {
    const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

    t.describe('formatMoney', () => {
      t.it('adds commas in large numbers', () => {
        t.expect(Util.formatMoney(1500)).toBe('$1,500');
      });

      t.it('handles negative numbers', () => {
        t.expect(Util.formatMoney(-50)).toBe('-$50');
      });

      t.it('rounds decimals', () => {
        t.expect(Util.formatMoney(15.12848)).toBe('$15.13');
      });

      t.it('always uses 2 digits when there are cents', () => {
        t.expect(Util.formatMoney(15.1)).toBe('$15.10');
      });

      t.it('combines correct formatting', () => {
        t.expect(Util.formatMoney(-4119283.12848)).toBe('-$4,119,283.13');
      });
    });

    t.describe('dateString', () => {
      t.it('handles today', () => {
        t.expect(Util.dateString(new Date())).toBe('today');
      });

      t.it('handles yesterday', () => {
        const date = new Date();
        date.setTime(date.getTime() - DAY_IN_MILLIS);
        t.expect(Util.dateString(date)).toBe('yesterday');
      });

      t.it('handles tomorrow', () => {
        const date = new Date();
        date.setTime(date.getTime() + DAY_IN_MILLIS);
        t.expect(Util.dateString(date)).toBe('tomorrow');
      });

      t.it('handles days in this year', () => {
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        const monthSpecs = [
          {month: 1, monthName: 'Feb'},
          {month: 4, monthName: 'May'},
          {month: 7, monthName: 'Aug'},
          {month: 10, monthName: 'Nov'},
        ];
        for (const {month, monthName} of monthSpecs) {
          // This test fails if we happen to run the test on a day that is
          // yesterday, today, or tomorrow of the month spec day.
          if (month === thisMonth) continue;
          t.expect(Util.dateString(new Date(thisYear, month, 15)))
              .toBe(`on ${monthName} 15`);
        }
      });

      t.it('handles days in other year', () => {
        const thisYear = new Date().getFullYear();
        const monthSpecs = [
          {month: 1, monthName: 'Feb'},
          {month: 4, monthName: 'May'},
          {month: 7, monthName: 'Aug'},
          {month: 10, monthName: 'Nov'},
        ];
        const years = [thisYear - 1, thisYear + 1];
        for (const {month, monthName} of monthSpecs) {
          for (const year of years) {
            t.expect(Util.dateString(new Date(year, month, 15)))
                .toBe(`on ${monthName} 15, ${year}`);
          }
        }
      });

      t.describe('validateRecurringDayOfMonth', () => {
        t.it('rejects illegal values', () => {
          t.expect(() => Util.validateRecurringDayOfMonth(-1)).toThrow();
          t.expect(() => Util.validateRecurringDayOfMonth(0)).toThrow();
          t.expect(() => Util.validateRecurringDayOfMonth(29)).toThrow();
          t.expect(() => Util.validateRecurringDayOfMonth(30)).toThrow();
          t.expect(() => Util.validateRecurringDayOfMonth(31)).toThrow();
          t.expect(() => Util.validateRecurringDayOfMonth(1.5)).toThrow();
        });

        t.it('accepts legal values', () => {
          for (let day = 1; day <= 28; day++) {
            t.expect(() => Util.validateRecurringDayOfMonth(day)).not.toThrow();
          }
        });
      });
    });
  }
}
