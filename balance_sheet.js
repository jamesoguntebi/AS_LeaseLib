"use strict";
exports.__esModule = true;
var config_1 = require("./config");
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var jas_range_1 = require("./jas_range");
var BalanceSheet = /** @class */ (function () {
    function BalanceSheet() {
    }
    BalanceSheet.getBalance = function () {
        var sheet = jas_spreadsheet_1["default"].findSheet('balance');
        var firstDataRow = sheet.getFrozenRows() + 1;
        var balanceColumn = jas_spreadsheet_1["default"].findColumn('balance', sheet);
        return new jas_range_1.CellData(sheet.getRange(firstDataRow, balanceColumn)).number();
    };
    /** Throws on validation failure. */
    BalanceSheet.validateActiveSheet = function () {
        // Assert the sheet exists, there is a balance column, and a data row with
        // any number in it for the balance.
        BalanceSheet.getBalance();
        // Assert the other columns exist.
        var sheet = jas_spreadsheet_1["default"].findSheet('balance');
        jas_spreadsheet_1["default"].findColumn('date', sheet);
        jas_spreadsheet_1["default"].findColumn('description', sheet);
        jas_spreadsheet_1["default"].findColumn('transaction', sheet);
    };
    /**
     * Adds a rent due transaction today the balance sheet if today is Rent Due
     * day.
     */
    BalanceSheet.maybeAddRentOrInterestTransaction = function () {
        var _a, _b;
        var currentDayOfMonth = new Date().getDate();
        var config = config_1["default"].get();
        if (((_a = config.rentConfig) === null || _a === void 0 ? void 0 : _a.dueDayOfMonth) === currentDayOfMonth) {
            BalanceSheet.insertRow({
                date: new Date(),
                description: 'Rent due',
                transaction: -config.rentConfig.monthlyAmount
            });
            Logger.log("Added 'Rent Due' transaction!");
        }
        else if (((_b = config.loanConfig) === null || _b === void 0 ? void 0 : _b.interestDayOfMonth) === currentDayOfMonth) {
            if (config.loanConfig.interestRate > 0) {
                BalanceSheet.insertRow({
                    date: new Date(),
                    description: 'Monthly interest',
                    transaction: 'interest'
                });
                Logger.log("Added 'Monthly Interest' transaction!");
            }
        }
    };
    /**
     * Adds a payment to the balance sheet. The default amount is the full rent
     * amount.
     */
    BalanceSheet.addPayment = function (amount, date) {
        BalanceSheet.insertRow({
            date: date,
            description: config_1["default"].get().rentConfig ? 'Rent payment' : 'Loan payment',
            transaction: amount
        });
    };
    BalanceSheet.insertRow = function (balanceRow) {
        var sheet = jas_spreadsheet_1["default"].findSheet('balance');
        var headerRow = sheet.getFrozenRows();
        sheet.insertRowAfter(headerRow);
        var newRow = headerRow + 1;
        var balanceColumn = jas_spreadsheet_1["default"].findColumn('balance', sheet);
        var previousBalanceCellA1 = sheet.getRange(newRow + 1, balanceColumn).getA1Notation();
        var setCell = function (columnName, value) {
            var column = jas_spreadsheet_1["default"].findColumn(columnName, sheet);
            sheet.getRange(newRow, column).setValue(value);
        };
        setCell('date', balanceRow.date);
        setCell('description', balanceRow.description);
        if (typeof balanceRow.transaction === 'number') {
            setCell('transaction', balanceRow.transaction);
        }
        else {
            var prevBal = previousBalanceCellA1;
            if (!config_1["default"].get().loanConfig) {
                throw new Error('Cannot add interest for non-loan configs.');
            }
            var interestRate = config_1["default"].get().loanConfig.interestRate;
            setCell('transaction', "= if (" + prevBal + " >= 0, - " + prevBal + " * " + interestRate + " / 12, 0)");
        }
        var transactionCell = sheet.getRange(newRow, jas_spreadsheet_1["default"].findColumn('transaction', sheet));
        setCell('balance', "= " + previousBalanceCellA1 + " - " + transactionCell.getA1Notation());
    };
    return BalanceSheet;
}());
exports["default"] = BalanceSheet;
