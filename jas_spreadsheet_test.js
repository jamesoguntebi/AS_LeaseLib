"use strict";
exports.__esModule = true;
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var JasSpreadsheetTest = /** @class */ (function () {
    function JasSpreadsheetTest() {
        this.name = 'JasSpreadsheetTest';
    }
    JasSpreadsheetTest.prototype.run = function (t) {
        t.describe('findSheet', function () {
            t.it('finds present sheet', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findSheet('balance'); }).not.toThrow();
            });
            t.it('does fuzzy matching, ignoring case', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findSheet('BAL'); }).not.toThrow();
                t.expect(function () { return jas_spreadsheet_1["default"].findSheet('CONFI'); }).not.toThrow();
            });
            t.it('throws for absent sheet', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findSheet('no such sheet'); })
                    .toThrow('Expected a sheet');
            });
            t.describe('with multiple matching sheets', function () {
                var spreadsheet = SpreadsheetApp.openById(_JasLibContext.spreadsheetId);
                var newSheet;
                t.beforeEach(function () {
                    newSheet = spreadsheet.insertSheet();
                    newSheet.setName('Balad'); // To share prefix with 'Balance' sheet.
                });
                t.afterEach(function () {
                    spreadsheet.deleteSheet(newSheet);
                });
                t.it('throws for ambiguous query', function () {
                    t.expect(function () { return jas_spreadsheet_1["default"].findSheet('bala'); })
                        .toThrow('multiple sheets');
                });
            });
        });
        t.describe('findColumn', function () {
            var sheet = jas_spreadsheet_1["default"].findSheet('balance');
            t.it('finds present column', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findColumn('description', sheet); })
                    .not.toThrow();
            });
            t.it('does fuzzy matching, ignoring case', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findColumn('DESCR', sheet); }).not.toThrow();
                t.expect(function () { return jas_spreadsheet_1["default"].findColumn('TRANSACT', sheet); })
                    .not.toThrow();
            });
            t.it('throws for absent column', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findColumn('no such column', sheet); })
                    .toThrow('Expected a column');
            });
            t.it('throws for ambiguous column', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findColumn('d', sheet); })
                    .toThrow('multiple columns');
            });
        });
        t.describe('findRow', function () {
            var sheet = jas_spreadsheet_1["default"].findSheet('config');
            t.it('finds present row', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findRow('interest rate', sheet); })
                    .not.toThrow();
            });
            t.it('does fuzzy matching, ignoring case', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findRow('PAYMENT T', sheet); })
                    .not.toThrow();
                t.expect(function () { return jas_spreadsheet_1["default"].findRow('EMAIL DIS', sheet); })
                    .not.toThrow();
            });
            t.it('throws for absent row', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findRow('no such row', sheet); })
                    .toThrow('Expected a row');
            });
            t.it('throws for ambiguous row', function () {
                t.expect(function () { return jas_spreadsheet_1["default"].findRow('customer', sheet); })
                    .toThrow('multiple rows');
            });
        });
    };
    return JasSpreadsheetTest;
}());
exports["default"] = JasSpreadsheetTest;
