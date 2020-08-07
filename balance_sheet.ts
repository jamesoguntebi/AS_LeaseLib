import {SSLib} from 'ss_api';

import Util from './_util';
import Config from './config';

export function testUpdateStatusCell() {
  _JasLibContext.spreadsheetId = '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';
  BalanceSheet.updateStatusCell();
  return Logger.getLog();
}

export default class BalanceSheet {
  static getBalance(): number {
    const sheet = BalanceSheet.getSheet();
    const firstDataRow = sheet.getFrozenRows() + 1;
    const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
    return new SSLib.CellData(sheet.getRange(firstDataRow, balanceColumn))
        .number();
  }

  /**
   * Validates that the active sheet has the required row/column structure and
   * contents. Throws on validation failure.
   */
  static validateActiveSheet() {
    // Assert the sheet exists, there is a balance column, and a data row with
    // any number in it for the balance.
    BalanceSheet.getBalance();

    // Assert the other columns exist.
    const sheet = BalanceSheet.getSheet();
    SSLib.JasSpreadsheet.findColumn('date', sheet);
    SSLib.JasSpreadsheet.findColumn('description', sheet);
    SSLib.JasSpreadsheet.findColumn('transaction', sheet);

    // Assert the status cell exists.
    if (sheet.getFrozenRows() !== 2) {
      throw new Error('Expected 2 frozen rows in Balance sheet.');
    }
    const statusRange = sheet.getRange(1, sheet.getLastColumn());
    if (!statusRange.isPartOfMerge() ||
        statusRange.getMergedRanges().length !== 1) {
      throw new Error(
          'Expected 1st row in balance sheet to be one merged range.');
    }
  }

  /**
   * Adds a rent due or interest transaction if today is the day. If not, still
   * updates the status cell.
   */
  static dailyUpdate() {
    const currentDayOfMonth = BalanceSheet.getCurrentDayOfMonth();
    const config = Config.get();

    if (config.rentConfig?.dueDayOfMonth === currentDayOfMonth) {
      BalanceSheet.insertRow({
        date: new Date(),
        description: 'Rent due',
        transaction: -config.rentConfig.monthlyAmount,
      });
      Logger.log(`Added 'Rent Due' transaction!`);
    } else if (
        config.loanConfig?.interestDayOfMonth === currentDayOfMonth &&
        config.loanConfig.interestRate > 0) {
      BalanceSheet.insertRow({
        date: new Date(),
        description: 'Monthly interest',
        transaction: 'interest',
      });
      Logger.log(`Added 'Monthly Interest' transaction!`);
    } else {
      BalanceSheet.updateStatusCell();
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
    const sheet = BalanceSheet.getSheet();
    const headerRow = sheet.getFrozenRows();
    // TODO: Insert the row at the correct date location. This may need a custom
    // row sort. When the date is a tie, for loan configs, a payment should come
    // before the interest application to give the loaner the interest benefit.
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
    setCell(
        'balance',
        `= ${previousBalanceCellA1} - ${transactionCell.getA1Notation()}`);

    BalanceSheet.updateStatusCell();
  }

  /** Separate method for easier testing. */
  static getCurrentDayOfMonth(): number {
    return new Date().getDate();
  }

  static updateStatusCell() {
    BalanceSheet.validateActiveSheet();
    const config = Config.get();

    let statusText = '';
    const textStyles: TextStyle[] = [];

    const addFormatted = (text: string, {isBold = false, color = ''} = {}) => {
      const start = statusText.length;
      const end = start + text.length;
      const styleBuilder = SpreadsheetApp.newTextStyle();
      if (color) styleBuilder.setForegroundColor(color);
      if (isBold) styleBuilder.setBold(true);
      const style = styleBuilder.build();
      textStyles.push({start, end, style});
      statusText += text;
    };

    // Balance line.
    statusText += `Balance: `;
    const balance = BalanceSheet.getBalance();
    let color = '';
    if (config.rentConfig) {
      color = balance > 0 ? Colors.RED_BALANCE : Colors.GREEN_BALANCE;
    }
    addFormatted(Util.formatMoney(balance), {isBold: true, color});

    // Last payment line.
    const lastPayment = BalanceSheet.findLastPayment();
    if (lastPayment) {
      statusText += `\nLast payment: `;
      addFormatted(Util.formatMoney(lastPayment.amount), {isBold: true});
      statusText += `, ${Util.dateString(lastPayment.date)}`;
    }

    // Upcoming transaction line.
    if (config.rentConfig) {
      const {monthlyAmount, dueDayOfMonth} = config.rentConfig;
      statusText += `\nUpcoming: `;
      addFormatted(Util.formatMoney(monthlyAmount), {isBold: true});
      statusText += ` due ${Util.getNextDayOfMonthString(dueDayOfMonth)}`;
    } else if (config.loanConfig!.interestRate) {
      const {interestRate, interestDayOfMonth} = config.loanConfig;
      statusText += `\nUpcoming: `;
      const interestAmount = (interestRate / 12) * balance;
      addFormatted(Util.formatMoney(interestAmount), {isBold: true});
      statusText += ` interest to be applied ${
          Util.getNextDayOfMonthString(interestDayOfMonth)}`;
    }

    const rtBuilder = SpreadsheetApp.newRichTextValue().setText(statusText);
    for (const ts of textStyles) {
      rtBuilder.setTextStyle(ts.start, ts.end, ts.style);
    }

    const sheet = BalanceSheet.getSheet();
    const statusCell = sheet.getRange(1, 1);
    statusCell.setRichTextValue(rtBuilder.build());
    statusCell.setFontSize(12);

    // Line height is about 21px, + some top and bottom padding.
    const lines = (statusText.match(/\n/g) || []).length + 1;
    sheet.setRowHeight(1, lines * 21 + 16);
    statusCell.setVerticalAlignment('middle');
  }

  private static findLastPayment(): {amount: number; date: Date}|null {
    const sheet = BalanceSheet.getSheet();
    const firstDataRow = sheet.getFrozenRows() + 1;
    const lastRow = sheet.getLastRow();
    const trxColumn = SSLib.JasSpreadsheet.findColumn('transaction', sheet);
    const dateColumn = SSLib.JasSpreadsheet.findColumn('date', sheet);
    // TODO: Also check description. Probably make 'Rent payment' or
    // 'Loan payment' a const in Config? But what if Adrienne or James changes
    // the description manually in the sheet. Protect those ranges?

    for (let row = firstDataRow; row <= lastRow; row++) {
      const trxCell = sheet.getRange(row, trxColumn);
      if (!trxCell.isBlank()) {
        const amount = new SSLib.CellData(trxCell).number();
        if (amount > 0) {
          const date =
              new SSLib.CellData(sheet.getRange(row, dateColumn)).date();
          return {amount, date};
        }
      }
    }

    return null;
  }

  private static getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    return SSLib.JasSpreadsheet.findSheet(
        'balance', _JasLibContext.spreadsheetId);
  }
}

export interface BalanceRow {
  date: Date;
  description: string;
  transaction: number|'interest';
}

interface TextStyle {
  start: number;
  end: number;
  style: GoogleAppsScript.Spreadsheet.TextStyle;
}
