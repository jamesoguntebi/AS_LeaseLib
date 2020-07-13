import JasSpreadsheet from './jas_spreadsheet';
import { Tester } from './testing/tester';
import { Test } from './testing/testrunner';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

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
        t.expect(() => JasSpreadsheet.findSheet('no such sheet'))
            .toThrow('Expected a sheet');
      });

      t.describe('with multiple matching sheets', () => {
        const spreadsheet =
            SpreadsheetApp.openById(_JasLibContext.spreadsheetId);
        let newSheet: Sheet;

        t.beforeEach(() => {
          newSheet = spreadsheet.insertSheet();
          newSheet.setName('Balad'); // To share prefix with 'Balance' sheet.
        });

        t.afterEach(() => {
          spreadsheet.deleteSheet(newSheet);
        });

        t.it('throws for ambiguous query', () => {
          t.expect(() => JasSpreadsheet.findSheet('bala'))
              .toThrow('multiple sheets');
        });
      });
    });

    t.describe('findColumn', () => {
      const sheet = JasSpreadsheet.findSheet('balance');

      t.it('finds present column', () => {
        t.expect(() => JasSpreadsheet.findColumn('description', sheet))
            .toNotThrow();
      });

      t.it('does fuzzy matching, ignoring case', () => {
        t.expect(() => JasSpreadsheet.findColumn('DESCR', sheet)).toNotThrow();
        t.expect(() => JasSpreadsheet.findColumn('TRANSACT', sheet))
            .toNotThrow();
      });

      t.it('throws for absent column', () => {
        t.expect(() => JasSpreadsheet.findColumn('no such column', sheet))
            .toThrow('Expected a column');
      });

      t.it('throws for ambiguous column', () => {
        t.expect(() => JasSpreadsheet.findColumn('d', sheet))
            .toThrow('multiple columns');
      });
    });

    t.describe('findRow', () => {
      const sheet = JasSpreadsheet.findSheet('config');

      t.it('finds present row', () => {
        t.expect(() => JasSpreadsheet.findRow('interest rate', sheet))
            .toNotThrow();
      });

      t.it('does fuzzy matching, ignoring case', () => {
        t.expect(() => JasSpreadsheet.findRow('PAYMENT T', sheet)).toNotThrow();
        t.expect(() => JasSpreadsheet.findRow('EMAIL DIS', sheet)).toNotThrow();
      });

      t.it('throws for absent row', () => {
        t.expect(() => JasSpreadsheet.findRow('no such row', sheet))
            .toThrow('Expected a row');
      });

      t.it('throws for ambiguous row', () => {
        t.expect(() => JasSpreadsheet.findRow('customer', sheet))
            .toThrow('multiple rows');
      });
    });
  }
}
