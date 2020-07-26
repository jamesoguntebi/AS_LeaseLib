"use strict";
exports.__esModule = true;
var jas_range_1 = require("./jas_range");
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var JasRangeTest = /** @class */ (function () {
    function JasRangeTest() {
        this.name = 'JasRangeTest';
    }
    JasRangeTest.prototype.run = function (t) {
        var sheet = jas_spreadsheet_1["default"].findSheet('balance');
        t.describe('getFixedA1Notation', function () {
            t.it('adds dollar sign symbol', function () {
                t.expect(jas_range_1["default"].getFixedA1Notation(sheet.getRange(1, 1)))
                    .toEqual("'Balance'!$A$1");
            });
            t.it('throws for multi-cell range', function () {
                var range = sheet.getRange(1, 1, 2, 2);
                t.expect(function () { return jas_range_1["default"].getFixedA1Notation(range); })
                    .toThrow('multi-cell');
            });
        });
        t.describe('CellData', function () {
            var defaultRange;
            var defaultOldValue;
            t.beforeEach(function () {
                defaultRange = sheet.getRange(2, 2, 1, 1);
                defaultOldValue = defaultRange.getValue();
            });
            t.afterEach(function () { return defaultRange.setValue(defaultOldValue); });
            t.it('throws for multi-cell range', function () {
                var range = sheet.getRange(1, 1, 2, 2);
                t.expect(function () { return new jas_range_1.CellData(range); }).toThrow('multi-cell');
            });
            t.it('throws for wrong type', function () {
                defaultRange.setValue(3);
                t.expect(function () { return new jas_range_1.CellData(defaultRange).string(); })
                    .toThrow('expected string');
            });
            t.it('handles optional calls', function () {
                defaultRange.clear({ contentsOnly: true });
                t.expect(new jas_range_1.CellData(defaultRange).stringOptional())
                    .toEqual(undefined);
            });
            t.it('finds string array', function () {
                defaultRange.setValue(',,apples,bananas\ncarrots  ,,\n\ndragonfruit, edameme');
                t.expect(new jas_range_1.CellData(defaultRange).stringArray()).toEqual(['apples', 'bananas', 'carrots', 'dragonfruit', 'edameme']);
            });
        });
    };
    return JasRangeTest;
}());
exports["default"] = JasRangeTest;
