type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class JasSpreadsheet {
  static findSheet(name: string): Sheet {
    const spreadsheet = SpreadsheetApp.openById(_JasLibContext.spreadsheetId);

    if (!spreadsheet) {
      throw new Error(`Cannot find spreadsheet with id: ${
        _JasLibContext.spreadsheetId}`);
    }

    name = name.toLowerCase();
    const matches: Sheet[] = [];
    for (const sheet of spreadsheet.getSheets()) {
      if (sheet.getName().toLowerCase().includes(name)) {
        matches.push(sheet);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Multiple sheets '${
          matches.map(s => s.getName()).join(', ')}' matched query '${name}'`);
    }
    if (matches.length === 0) {
      throw new Error(`Expected a sheet with a name including '${name}'.`);
    }
    return matches[0];
  }

  /**
   * Returns the index of the first matching row. Throws if not found or if
   * multiple are found.
   */
  static findRow(name: string, sheet: Sheet): number {
    name = name.toLowerCase();
    const headerCol = sheet.getFrozenColumns() || 1;
    const lastRow = sheet.getLastRow();
    const rowLabels: string[] = [];
    const matches: Array<{row: number, rowLabel: string}> = [];

    for (let row = 1; row <= lastRow; row++) {
      const rowLabel = String(sheet.getRange(row, headerCol).getValue());
      if (rowLabel.toLowerCase().includes(name)) {
        matches.push({row, rowLabel});
      } else if (rowLabel) {
        rowLabels.push(rowLabel);
      }
    }

    if (matches.length > 1) {
      throw new Error(`Multiple rows '${
          matches.map(m => m.rowLabel).join(', ')}' matched query '${name}'`);
    }
    if (matches.length === 0) {
      throw new Error(`Expected a row with a name including '${name}' in ` + 
          `sheet '${sheet.getName()}'. ` + 
          `Row labels: ${rowLabels.join(', ')}`);
    }
    return matches[0].row;
  }

  /**
   * Returns the index of the first matching column. Throws if not found or if
   * multiple are found.
   */
  static findColumn(name: string, sheet: Sheet): number {
    name = name.toLowerCase();
    const headerRow = sheet.getFrozenRows() || 1;
    const lastColumn = sheet.getLastColumn();
    const columnLabels: string[] = [];
    const matches: Array<{col: number, columnLabel: string}> = [];

    for (let col = 1; col <= lastColumn; col++) {
      const columnLabel = String(sheet.getRange(headerRow, col).getValue());
      if (columnLabel.toLowerCase().includes(name)) {
        matches.push({col, columnLabel});
      } else {
        columnLabels.push(columnLabel);
      }
    }

    if (matches.length > 1) {
      throw new Error(`Multiple columns '${
          matches.map(m => m.columnLabel).join(', ')}' matched query '${name}'`);
    }
    if (matches.length === 0) {
      throw new Error(`Expected a column with a name including '${name}' in ` + 
          `sheet '${sheet.getName()}'. ` + 
          `Column labels: ${columnLabels.join(', ')}`);
    }

    return matches[0].col;
  }
}