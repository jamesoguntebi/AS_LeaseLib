"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var config_1 = require("./config");
var balance_sheet_1 = require("./balance_sheet");
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var BalanceSheetTest = /** @class */ (function () {
    function BalanceSheetTest() {
        this.name = 'BalanceSheetTest';
    }
    BalanceSheetTest.prototype.expectInsertRowToHaveBeenCalledLike = function (t, matcher) {
        t.expect(balance_sheet_1["default"].insertRow).toHaveBeenCalledLike(t.matcher(function (args) {
            return matcher(args[0]);
        }));
    };
    BalanceSheetTest.prototype.run = function (t) {
        var _this = this;
        var baseConfigSpecs = [
            {
                configType: 'rent config',
                config: config_1["default"].getRentConfigForTest({
                    rentConfig: {
                        dueDayOfMonth: new Date().getDate(),
                        monthlyAmount: 873
                    }
                })
            },
            {
                configType: 'loan config',
                config: config_1["default"].getLoanConfigForTest({
                    loanConfig: {
                        interestDayOfMonth: new Date().getDate(),
                        interestRate: 0.06
                    }
                })
            },
        ];
        t.describe('maybeAddRentOrInterestTransaction', function () {
            t.beforeAll(function () { return t.spyOn(balance_sheet_1["default"], 'insertRow'); });
            var configSpecs = [
                __assign(__assign({}, baseConfigSpecs[0]), { expectedDecription: 'Rent due', expectedTransaction: -873 }),
                __assign(__assign({}, baseConfigSpecs[1]), { expectedDecription: 'Monthly interest', expectedTransaction: 'interest' }),
            ];
            for (var _i = 0, configSpecs_1 = configSpecs; _i < configSpecs_1.length; _i++) {
                var typeObj = configSpecs_1[_i];
                var _loop_1 = function (replaceDate) {
                    var dateString = replaceDate
                        ? "not on transaction day"
                        : "on transaction day";
                    var configType = typeObj.configType, config = typeObj.config, expectedDecription = typeObj.expectedDecription, expectedTransaction = typeObj.expectedTransaction;
                    t.describe("for " + configType + " " + dateString, function () {
                        t.beforeEach(function () {
                            t.setConfig(config);
                            if (replaceDate) {
                                // Replace the day of month with some other day.
                                var fakeMonthDay = ((new Date().getDate() + 1) % 28) + 1;
                                t.spyOn(Date.prototype, 'getDate').and.returnValue(fakeMonthDay);
                            }
                        });
                        var testString = (replaceDate ? 'does not insert' : 'inserts') + " a row on " +
                            "due day";
                        t.it(testString, function () {
                            balance_sheet_1["default"].maybeAddRentOrInterestTransaction();
                            if (replaceDate) {
                                t.expect(balance_sheet_1["default"].insertRow).not.toHaveBeenCalled();
                            }
                            else {
                                _this.expectInsertRowToHaveBeenCalledLike(t, function (row) {
                                    t.expect(row.description).toEqual(expectedDecription);
                                    t.expect(row.transaction).toEqual(expectedTransaction);
                                    return true;
                                });
                            }
                        });
                    });
                };
                for (var _a = 0, _b = [true, false]; _a < _b.length; _a++) {
                    var replaceDate = _b[_a];
                    _loop_1(replaceDate);
                }
            }
        });
        t.describe('addPayment', function () {
            t.beforeAll(function () { return t.spyOn(balance_sheet_1["default"], 'insertRow'); });
            var configSpecs = [
                __assign(__assign({}, baseConfigSpecs[0]), { expectedDecription: 'Rent payment' }),
                __assign(__assign({}, baseConfigSpecs[1]), { expectedDecription: 'Loan payment' }),
            ];
            var _loop_2 = function (configType, config, expectedDecription) {
                t.it("inserts a row for " + configType, function () {
                    t.setConfig(config);
                    balance_sheet_1["default"].addPayment(159, new Date());
                    _this.expectInsertRowToHaveBeenCalledLike(t, function (row) {
                        t.expect(row.description).toEqual(expectedDecription);
                        t.expect(row.transaction).toEqual(159);
                        return true;
                    });
                });
            };
            for (var _i = 0, configSpecs_2 = configSpecs; _i < configSpecs_2.length; _i++) {
                var _a = configSpecs_2[_i], configType = _a.configType, config = _a.config, expectedDecription = _a.expectedDecription;
                _loop_2(configType, config, expectedDecription);
            }
        });
        /**
         * This test operates on a real sheet. So it is difficult to clean up.
         */
        t.describe('insertRow', function () {
            var spreadsheet = jas_spreadsheet_1["default"].getSpreadsheet();
            var originalBalanceSheet;
            var sheet;
            var initialBalance = 500;
            t.beforeAll(function () {
                originalBalanceSheet = jas_spreadsheet_1["default"].findSheet('balance');
                // This name should not match query 'balance':
                originalBalanceSheet.setName('__test_backup__');
            });
            t.beforeEach(function () {
                spreadsheet.setActiveSheet(originalBalanceSheet);
                sheet = spreadsheet.duplicateActiveSheet();
                sheet.setName('Balance');
                var balanceColumn = jas_spreadsheet_1["default"].findColumn('balance', sheet);
                var firstDataRow = sheet.getFrozenRows() + 1;
                sheet.getRange(firstDataRow, balanceColumn).setValue(initialBalance);
                t.expect(balance_sheet_1["default"].getBalance()).toEqual(initialBalance);
                t.setConfig(config_1["default"].getLoanConfigForTest());
            });
            t.afterEach(function () {
                spreadsheet.deleteSheet(sheet);
            });
            t.afterAll(function () {
                originalBalanceSheet.setName('Balance');
            });
            var expectNewRowValues = function (transaction, balance, description) {
                var checkSpecs = [
                    { colName: 'transaction', expectedValue: transaction },
                    { colName: 'balance', expectedValue: balance },
                    { colName: 'description', expectedValue: description },
                ];
                var dataRow = sheet.getFrozenRows() + 1;
                for (var _i = 0, checkSpecs_1 = checkSpecs; _i < checkSpecs_1.length; _i++) {
                    var _a = checkSpecs_1[_i], colName = _a.colName, expectedValue = _a.expectedValue;
                    var column = jas_spreadsheet_1["default"].findColumn(colName, sheet);
                    t.expect(sheet.getRange(dataRow, column).getValue()).toEqual(expectedValue);
                }
            };
            t.it('increases rent', function () {
                balance_sheet_1["default"].insertRow({
                    date: new Date(),
                    transaction: -450,
                    description: 'Partial rent due'
                });
                expectNewRowValues(-450, 950, 'Partial rent due');
            });
            t.it('decreases rent', function () {
                balance_sheet_1["default"].insertRow({
                    date: new Date(),
                    transaction: 450,
                    description: 'Rent payment'
                });
                expectNewRowValues(450, 50, 'Rent payment');
            });
            t.it('adds interest', function () {
                balance_sheet_1["default"].insertRow({
                    date: new Date(),
                    transaction: 'interest',
                    description: 'Interest'
                });
                var expectedInterest = (-initialBalance * config_1["default"].get().loanConfig.interestRate) / 12;
                var expectedBalance = initialBalance - expectedInterest;
                expectNewRowValues(expectedInterest, expectedBalance, 'Interest');
            });
        });
        t.describe('validateActiveSheet', function () {
            var spreadsheet = jas_spreadsheet_1["default"].getSpreadsheet();
            var originalBalanceSheet;
            var sheet;
            t.beforeAll(function () {
                originalBalanceSheet = jas_spreadsheet_1["default"].findSheet('balance');
                // This name should not match query 'balance':
                originalBalanceSheet.setName('__test_backup__');
            });
            t.beforeEach(function () {
                spreadsheet.setActiveSheet(originalBalanceSheet);
                sheet = spreadsheet.duplicateActiveSheet();
                sheet.setName('Balance');
            });
            t.afterEach(function () {
                spreadsheet.deleteSheet(sheet);
            });
            t.afterAll(function () {
                originalBalanceSheet.setName('Balance');
            });
            t.it('accepts untampered template spreadsheet', function () {
                t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).not.toThrow();
            });
            t.it('throws for no data row', function () {
                // It is illegal to delete all unfrozen rows, so insert a blank row at
                // the end before doing so.
                sheet.insertRowAfter(sheet.getLastRow());
                sheet.deleteRows(sheet.getFrozenRows() + 1, sheet.getLastRow() - sheet.getFrozenRows() - 1);
                t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
            });
            t.it('throws for invalid last balance cell', function () {
                var balanceColumn = jas_spreadsheet_1["default"].findColumn('balance', sheet);
                var firstDataRow = sheet.getFrozenRows() + 1;
                sheet.getRange(firstDataRow, balanceColumn).setValue('start balance');
                t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
            });
            t.describe('when checking columns', function () {
                t.it('throws for missing date', function () {
                    sheet.deleteColumn(jas_spreadsheet_1["default"].findColumn('date', sheet));
                    t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
                });
                t.it('throws for missing transaction', function () {
                    sheet.deleteColumn(jas_spreadsheet_1["default"].findColumn('transaction', sheet));
                    t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
                });
                t.it('throws for missing balance', function () {
                    sheet.deleteColumn(jas_spreadsheet_1["default"].findColumn('balance', sheet));
                    t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
                });
                t.it('throws for missing description', function () {
                    sheet.deleteColumn(jas_spreadsheet_1["default"].findColumn('description', sheet));
                    t.expect(function () { return balance_sheet_1["default"].validateActiveSheet(); }).toThrow();
                });
            });
        });
    };
    return BalanceSheetTest;
}());
exports["default"] = BalanceSheetTest;
