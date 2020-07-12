import 'jasmine';
import JasRange from './jas_range';

type Range = GoogleAppsScript.Spreadsheet.Range;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

describe('JasRange', () => {
  describe('getFixedA1Notation', () => {
    it('adds dollar sign symbol', () => {
      expect(JasRange.getFixedA1Notation(createTestRange('A3', 'The Sheet')))
          .toEqual(`'The Sheet'!$A$3`);
    });
  });
});

function createTestRange(a1Notation: string, sheetName: string): Range {
  return {
    getA1Notation: () => 'A3',
    getSheet: () => ({
      getName: () => sheetName,
    } as Sheet),
    getHeight: () => 1,
    getWidth: () => 1,
    getValue: () => 'hi',
  } as Range;
}