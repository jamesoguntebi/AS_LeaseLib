import Config from "./config";
import JasSpreadsheetApp from "./jas_spreadsheet_app";
import BalanceSheet from "./balance_sheet";

export default class Payments {
  /**
   * Adds a payment to the balance sheet. The default amount is the full rent
   * amount.
   */
  static addPayment(amount: number = Config.get().rentAmount) {
    BalanceSheet.insertRow({
      date: new Date(),
      description: 'Rent Payment',
      transaction: amount,
    });
  }
}