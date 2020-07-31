import Config from "./config";
import { SSLib } from "ss_api";
import Util from "./util";

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
    return new SSLib.CellData(
        sheet.getRange(firstDataRow, balanceColumn)).number();
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
    const sheet = BalanceSheet.getSheet();
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

  static updateStatusCell() {
    const config = Config.get();

    let statusText = '';
    const textStyles: TextStyle[] = [];

    const addFormatted =
        (text: string, {isBold = false, color = ''} = {}) => {
          const start = statusText.length;
          const end = start + text.length;
          const styleBuilder = SpreadsheetApp.newTextStyle();
          if (color) styleBuilder.setForegroundColor(color);
          if (isBold) styleBuilder.setBold(true);
          const style = styleBuilder.build();
          textStyles.push({start, end, style});
          statusText += text;
        };

    statusText += `Hi ${config.customerDisplayName}!\n\n`;

    statusText += `Your current balance is `;
    addFormatted(Util.formatMoney(BalanceSheet.getBalance()),
        {isBold: true, color: 'green'});
    statusText += '.';

    const lastPayment = BalanceSheet.findLastPayment();
    if (lastPayment) {
      statusText += `\n\nYour last payment of `;
      addFormatted(Util.formatMoney(lastPayment.amount), {isBold: true});
      statusText += ` was applied on ${lastPayment.date}.`
    }

    if (config.rentConfig) {
      statusText += `\n\nRent is due soon.`;
    } else if (config.loanConfig!.interestRate) {
      statusText += `\n\nInterest will be applied soon.`;
    }

    const rtBuilder = SpreadsheetApp.newRichTextValue().setText(statusText);
    for (const ts of textStyles) {
      rtBuilder.setTextStyle(ts.start, ts.end, ts.style);
    }

    const sheet = BalanceSheet.getSheet();
    sheet.getRange(1, 1).setRichTextValue(rtBuilder.build());
  }

  private static findLastPayment(): {amount: number, date: Date}|null {
    const sheet = BalanceSheet.getSheet();
    const firstDataRow = sheet.getFrozenRows() + 1;
    const lastRow = sheet.getLastRow();
    const trxColumn = SSLib.JasSpreadsheet.findColumn('transaction', sheet);
    const dateColumn = SSLib.JasSpreadsheet.findColumn('date', sheet);

    for (let row = firstDataRow; row <= lastRow; row++) {
      const trxCell = sheet.getRange(row, trxColumn);
      if (!trxCell.isBlank()) {
        const amount = new SSLib.CellData(trxCell).number();
        if (amount > 0) {
          const date = sheet.getRange(row, dateColumn).getValue() as Date;
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
  date: Date,
  description: string,
  transaction: number | 'interest',
}

interface TextStyle {
  start: number;
  end: number;
  style: GoogleAppsScript.Spreadsheet.TextStyle;
}