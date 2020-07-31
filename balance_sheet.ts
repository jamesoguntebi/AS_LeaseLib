import Config from "./config";
import { SSLib } from "ss_api"

export default class BalanceSheet {
  static getBalance(): number { 
    const sheet = SSLib.JasSpreadsheet.findSheet(
        'balance', _JasLibContext.spreadsheetId);
    const firstDataRow = sheet.getFrozenRows() + 1;
    const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
    return new SSLib.CellData(
        sheet.getRange(firstDataRow, balanceColumn)).number();
  }

  /** Throws on validation failure. */
  static validateActiveSheet() {
    // Assert the sheet exists, there is a balance column, and a data row with
    // any number in it for the balance.
    BalanceSheet.getBalance();

    // Assert the other columns exist.
    const sheet = SSLib.JasSpreadsheet.findSheet(
        'balance', _JasLibContext.spreadsheetId);
    SSLib.JasSpreadsheet.findColumn('date', sheet);
    SSLib.JasSpreadsheet.findColumn('description', sheet);
    SSLib.JasSpreadsheet.findColumn('transaction', sheet);
  }

  /**
   * Adds a rent due transaction today the balance sheet if today is Rent Due
   * day.
   */
  static maybeAddRentOrInterestTransaction() {
    const currentDayOfMonth = this.getCurrentDayOfMonth();
    const config = Config.get();

    if (config.rentConfig?.dueDayOfMonth === currentDayOfMonth) {
      BalanceSheet.insertRow({
        date: new Date(),
        description: 'Rent due',
        transaction: -config.rentConfig.monthlyAmount,
      });
      Logger.log(`Added 'Rent Due' transaction!`);
    } else if (config.loanConfig?.interestDayOfMonth === currentDayOfMonth) {
      if (config.loanConfig.interestRate > 0) {
        BalanceSheet.insertRow({
          date: new Date(),
          description: 'Monthly interest',
          transaction: 'interest',
        });
        Logger.log(`Added 'Monthly Interest' transaction!`);
      }
    }
  }

  /**
   * Adds a payment to the balance sheet. The default amount is the full rent
   * amount.
   */
  static addPayment(amount: number, date: Date) {
    BalanceSheet.insertRow({
      date,
      description: Config.get().rentConfig ? 'Rent payment' : 'Loan payment',
      transaction: amount,
    });
  }

  static insertRow(balanceRow: BalanceRow) {
    const sheet = SSLib.JasSpreadsheet.findSheet(
        'balance', _JasLibContext.spreadsheetId);
    const headerRow = sheet.getFrozenRows();
    sheet.insertRowAfter(headerRow);
    const newRow = headerRow + 1;
    const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
    const previousBalanceCellA1 =
        sheet.getRange(newRow + 1, balanceColumn).getA1Notation();

    const setCell = (columnName: string, value: any) => {
      const column = SSLib.JasSpreadsheet.findColumn(columnName, sheet);
      sheet.getRange(newRow, column).setValue(value);
    };

    setCell('date', balanceRow.date);
    setCell('description', balanceRow.description);

    if (typeof balanceRow.transaction === 'number') {
      setCell('transaction', balanceRow.transaction);
    } else {
      const prevBal = previousBalanceCellA1;
      if (!Config.get().loanConfig) {
        throw new Error('Cannot add interest for non-loan configs.');
      }
      const interestRate = Config.get().loanConfig.interestRate;
      setCell(
          'transaction',
          `= if (${prevBal} >= 0, - ${prevBal} * ${interestRate} / 12, 0)`);
    }

    const transactionCell = sheet.getRange(
        newRow, SSLib.JasSpreadsheet.findColumn('transaction', sheet));
    setCell('balance',
        `= ${previousBalanceCellA1} - ${transactionCell.getA1Notation()}`);
  }

  /** Separate method for easier testing. */
  static getCurrentDayOfMonth(): number {
    return new Date().getDate();
  }
}

export interface BalanceRow {
  date: Date,
  description: string,
  transaction: number | 'interest',
}