import 'jasmine';
import JasRange from './jas_range';
import JasSpreadsheetApp from './jas_spreadsheet_app';
import { Tester } from './testing/tester';
import { Test } from './testing/testrunner';

export default class JasRangeTest implements Test {
  readonly name: string = 'JasRangeTest';

  run(t: Tester) {
    t.describe('getFixedA1Notation', () => {
      t.it('adds dollar sign symbol', () => {
        t.expect(JasRange.getFixedA1Notation(
                JasSpreadsheetApp.findSheet('balance').getRange(1, 1)))
            .toEqual(`'Balance'!$A$1`);
      });

      t.it('throws for multi-cell range', () => {
        const range =
            JasSpreadsheetApp.findSheet('balance').getRange(1, 1, 2, 2);
        t.expect(() => JasRange.getFixedA1Notation(range)).toThrow();
      });
    });
  }
}
