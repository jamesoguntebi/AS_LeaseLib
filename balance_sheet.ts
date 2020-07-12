import Config from "./config";
import JasSpreadsheetApp from "./jas_spreadsheet_app";
import { CellData } from "./jas_range";


export default class BalanceSheet {
  static getBalance(): number { 
    const sheet = JasSpreadsheetApp.findSheet('balance');
    const firstDataRow = sheet.getFrozenRows() + 1;
    const balanceColumn = JasSpreadsheetApp.findColumn('balance', sheet);
    return new CellData(sheet.getRange(firstDataRow, balanceColumn)).number();
  }

  /**
   * Adds a rent due transaction today the balance sheet if today is Rent Due
   * day.
   */
  static maybeAddRentOrInterestTransaction() {
    const currentDayOfMonth = new Date().getDate();
    const config = Config.get();

    if (config.rentConfig?.dueDayOfMonth === currentDayOfMonth) {
      BalanceSheet.insertRow({
        date: new Date(),
        description: 'Rent Due',
        transaction: -config.rentConfig.monthlyAmount,
      });
      Logger.log(`Added 'Rent Due' transaction!`);
    } else if (config.loanConfig?.interestDayOfMonth === currentDayOfMonth) {
      if (config.loanConfig.interestRate > 0) {
        BalanceSheet.insertRow({
          date: new Date(),
          description: 'Monthly Interest',
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
      description: Config.get().rentConfig ? 'Rent Payment' : 'Loan Payment',
      transaction: amount,
    });
  }

  private static insertRow(balanceRow: BalanceRow) {
    const sheet = JasSpreadsheetApp.findSheet('balance');
    const headerRow = sheet.getFrozenRows();
    sheet.insertRowAfter(headerRow);
    const newRow = headerRow + 1;
    const balanceColumn = JasSpreadsheetApp.findColumn('balance', sheet);
    const previousBalanceCellA1 =
        sheet.getRange(newRow + 1, balanceColumn).getA1Notation();

    const setCell = (columnName: string, value: any) => {
      const column = JasSpreadsheetApp.findColumn(columnName, sheet);
      sheet.getRange(newRow, column).setValue(value);
    };

    setCell('date', balanceRow.date);
    setCell('description', balanceRow.description);

    if (typeof balanceRow.transaction === 'number') {
      setCell('transaction', balanceRow.transaction);
    } else {
      const prevBal = previousBalanceCellA1;
      const interestRate =
          Config.getFixedCellNotation(Config.Fields.LOAN_INTEREST_RATE);
      setCell(
          'transaction',
          `= if (${prevBal} >= 0, - ${prevBal} * ${interestRate} / 12, 0)`);
    }

    const transactionCell =
        sheet.getRange(
            newRow, JasSpreadsheetApp.findColumn('transaction', sheet));
    setCell('balance',
        `= ${previousBalanceCellA1} - ${transactionCell.getA1Notation()}`);
  }
}

interface BalanceRow {
  date: Date,
  description: string,
  transaction: number | 'interest',
}