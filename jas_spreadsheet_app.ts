type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class JasSpreadsheetApp {
  static findSheet(name: string): Sheet {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    name = name.toLowerCase();
    for (const sheet of spreadsheet.getSheets()) {
      if (sheet.getName().toLowerCase().includes(name)) {
        return sheet;
      }
    }
    throw new Error(`Expected a sheet with a name including '${name}'.`);
  }

  /** Returns the index of the first matching row. Throws if not found. */
  static findRow(name: string, sheet: Sheet): number {
    name = name.toLowerCase();
    const headerCol = sheet.getFrozenColumns() || 1;
    const lastRow = sheet.getLastRow();
    const rowLabels: string[] = [];
    for (let row = 1; row <= lastRow; row++) {
      const rowLabel = String(sheet.getRange(row, headerCol).getValue());
      if (rowLabel.toLowerCase().includes(name)) {
        return row;
      } else if (rowLabel) {
        rowLabels.push(rowLabel);
      }
    }
    throw new Error(`Expected a row with a name including '${name}' in ` + 
        `sheet '${sheet.getName()}'. ` + 
        `Row labels: ${rowLabels.join(', ')}`);
  }

  /** Returns the index of the first matching column. Throws if not found. */
  static findColumn(name: string, sheet: Sheet): number {
    name = name.toLowerCase();
    const headerRow = sheet.getFrozenRows() || 1;
    const lastColumn = sheet.getLastColumn();
    const columnLabels: string[] = [];
    for (let col = 1; col <= lastColumn; col++) {
      const columnLabel = String(sheet.getRange(headerRow, col).getValue());
      if (columnLabel.toLowerCase().includes(name)) {
        return col;
      } else {
        columnLabels.push(columnLabel);
      }
    }
    throw new Error(`Expected a column with a name including '${name}' in ` + 
        `sheet '${sheet.getName()}'. ` + 
        `Column labels: ${columnLabels.join(', ')}`);
  }

  static getCellData(sheet: Sheet, row: number, column: number): CellData {
    return new CellData(sheet.getRange(row, column).getValue());
  }
}

export class CellData {
  constructor(private data: any) {}

  string(): string {
    if (typeof this.data !== 'string') {
      throw new Error('Expected string');
    }
    return this.data as string;
  }

  number(): number {
    if (typeof this.data !== 'number') {
      throw new Error('Expected number');
    }
    return this.data as number;
  }
}