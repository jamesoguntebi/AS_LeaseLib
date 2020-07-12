import 'jasmine';
import JasRange, { CellData } from './jas_range';
import JasSpreadsheetApp from './jas_spreadsheet_app';
import { Tester } from './testing/tester';
import { Test } from './testing/testrunner';

export default class JasRangeTest implements Test {
  readonly name: string = 'JasRangeTest';

  run(t: Tester) {
    const sheet = JasSpreadsheetApp.findSheet('balance');

    t.describe('getFixedA1Notation', () => {
      t.it('adds dollar sign symbol', () => {
        t.expect(JasRange.getFixedA1Notation(sheet.getRange(1, 1)))
            .toEqual(`'Balance'!$A$1`);
      });

      t.it('throws for multi-cell range', () => {
        const range = sheet.getRange(1, 1, 2, 2);
        t.expect(() => JasRange.getFixedA1Notation(range)).toThrow();
      });
    });

    t.describe('CellData', () => {
      t.it('throws for multi-cell range', () => {
        const range = sheet.getRange(1, 1, 2, 2);
        t.expect(() => new CellData(range)).toThrow();
      });

      t.it('throws for wrong type', () => {
        const range = sheet.getRange(1, 1, 1, 1);
        const oldValue = range.getValue();
        range.setValue(3);
        t.expect(() => new CellData(range).string()).toThrow();
        range.setValue(oldValue);
      });

      t.it('handles optional calls', () => {
        const range = sheet.getRange(1, 1, 1, 1);
        const oldValue = range.getValue();
        range.clear({contentsOnly: true});
        t.expect(new CellData(range).stringOptional()).toEqual(undefined);
        range.setValue(oldValue);
      });
    });
  }
}
