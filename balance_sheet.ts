import Config from "./config";
import JasSpreadsheet from "./jas_spreadsheet";
import { CellData } from "./jas_range";


export default class BalanceSheet {
  static getBalance(): number { 
    const sheet = JasSpreadsheet.findSheet('balance');
    const firstDataRow = sheet.getFrozenRows() + 1;
    const balanceColumn = JasSpreadsheet.findColumn('balance', sheet);
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
    const sheet = JasSpreadsheet.findSheet('balance');
    const headerRow = sheet.getFrozenRows();
    sheet.insertRowAfter(headerRow);
    const newRow = headerRow + 1;
    const balanceColumn = JasSpreadsheet.findColumn('balance', sheet);
    const previousBalanceCellA1 =
        sheet.getRange(newRow + 1, balanceColumn).getA1Notation();

    const setCell = (columnName: string, value: any) => {
      const column = JasSpreadsheet.findColumn(columnName, sheet);
      sheet.getRange(newRow, column).setValue(value);
    };

    setCell('date', balanceRow.date);
    setCell('description', balanceRow.description);

    if (typeof balanceRow.transaction === 'number') {
      setCell('transaction', balanceRow.transaction);
    } else {
      const prevBal = previousBalanceCellA1;
      const interestRate =
          Config.getFixedCellNotation(Config.FIELD.loanConfig_interestRate);
      setCell(
          'transaction',
          `= if (${prevBal} >= 0, - ${prevBal} * ${interestRate} / 12, 0)`);
    }

    const transactionCell =
        sheet.getRange(newRow, JasSpreadsheet.findColumn('transaction', sheet));
    setCell('balance',
        `= ${previousBalanceCellA1} - ${transactionCell.getA1Notation()}`);
  }
}

export interface BalanceRow {
  date: Date,
  description: string,
  transaction: number | 'interest',
}