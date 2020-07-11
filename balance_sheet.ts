import Config from "./config";
import JasSpreadsheetApp, { CellData } from "./jas_spreadsheet_app";


export default class BalanceSheet {
  static getBalance(): number { 
    const sheet = JasSpreadsheetApp.findSheet('balance');
    const firstDataRow = sheet.getFrozenRows() + 1;
    const balanceColumn = JasSpreadsheetApp.findColumn('balance', sheet);
    return new CellData(sheet.getRange(firstDataRow, balanceColumn).getValue())
        .number();
  }

  /**
   * Adds a rent due transaction today the balance sheet if today is Rent Due
   * day.
   */
  static maybeAddRentDue(amount: number = -Config.get().rentAmount) {
    if (Config.get().rentDueDayOfMonth === new Date().getDate()) {
      BalanceSheet.addRentDue(amount);
    }
  }

  /**
   * Adds a rent due transaction today the balance sheet if today is Rent Due
   * day.
   */
  static addRentDue(amount: number = -Config.get().rentAmount) {
    BalanceSheet.insertRow({
      date: new Date(),
      description: 'Rent Due',
      transaction: amount,
    });
  }

  /**
   * Adds a payment to the balance sheet. The default amount is the full rent
   * amount.
   */
  static addPayment(
      amount: number = Config.get().rentAmount, date: Date = new Date()) {
    BalanceSheet.insertRow({
      date,
      description: 'Rent Payment',
      transaction: amount,
    });
  }

  private static insertRow(balanceRow: BalanceRow) {
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