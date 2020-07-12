import 'jasmine';
import JasRange from './jas_range';
import JasSpreadsheetApp from './jas_spreadsheet_app';
import { Tester } from './testing/testglobals';
import { Test } from './testing/testrunner';

export default class JasRangeTest implements Test{
  run(t: Tester) {
    t.describe('JasRange', () => {
      t.describe('getFixedA1Notation', () => {
        t.it('adds dollar sign symbol', () => {
          t.expect(JasRange.getFixedA1Notation(
                  JasSpreadsheetApp.findSheet('balance').getRange(1, 1)))
              .toEqual(`'The Sheet'!$A$3`);
        });
      });
    });
  }
}
