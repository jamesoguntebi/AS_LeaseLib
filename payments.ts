import Config from "./config";
import SpreadsheetAppUtil from "./spreadsheet_app_util";

export default class Payments {
  static addFullPayment() {
    SpreadsheetAppUtil.findSheet('balance').getRange(2, 2).setValue(
        Config.get().rentAmount);
  }
}