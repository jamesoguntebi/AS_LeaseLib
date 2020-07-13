import JasSpreadsheet from './jas_spreadsheet';
import { Tester } from './testing/tester';
import { Test } from './testing/testrunner';

type Range = GoogleAppsScript.Spreadsheet.Range;

export default class JasSpreadsheetTest implements Test {
  readonly name: string = 'JasSpreadsheetTest';

  run(t: Tester) {
    t.describe('findSheet', () => {
      t.it('finds present sheet', () => {
        t.expect(() => JasSpreadsheet.findSheet('balance')).toNotThrow();
      });

      t.it('does fuzzy matching, ignoring case', () => {
        t.expect(() => JasSpreadsheet.findSheet('BAL')).toNotThrow();
        t.expect(() => JasSpreadsheet.findSheet('CONFI')).toNotThrow();
      });

      t.it('throws for absent sheet', () => {
        t.expect(() => JasSpreadsheet.findSheet('no such sheet')).toThrow();
      });
    });
  }
}
