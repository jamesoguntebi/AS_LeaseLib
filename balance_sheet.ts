import JasSpreadsheetApp from "./jas_spreadsheet_app";

export default class BalanceSheet {
  static insertRow(balanceRow: BalanceRow) {
    const sheet = JasSpreadsheetApp.findSheet('balance');
    const headerRow = sheet.getFrozenRows();
    sheet.insertRowAfter(headerRow);
    const newRow = headerRow + 1;

    const setCell = (columnName: string, value: any) => {
      const column = JasSpreadsheetApp.findColumn(columnName, sheet);
      sheet.getRange(newRow, column).setValue(value);
    };

    setCell('date', balanceRow.date);
    setCell('transaction', balanceRow.transaction);
    setCell('description', balanceRow.description);
    if (balanceRow.zelleId) {
      setCell('zelle id', balanceRow.zelleId);
    }

    const balanceColumn = JasSpreadsheetApp.findColumn('balance', sheet);
    const previousBalanceCell = sheet.getRange(newRow + 1, balanceColumn);
    const transactionCell =
        sheet.getRange(
            newRow, JasSpreadsheetApp.findColumn('transaction', sheet));
    setCell('balance',
        `= ${previousBalanceCell.getA1Notation()} - ${transactionCell.getA1Notation()}`);
  }
}

export interface BalanceRow {
  date: Date,
  transaction: number,
  description: string,
  zelleId?: string,
}