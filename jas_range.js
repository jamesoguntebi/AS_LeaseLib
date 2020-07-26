"use strict";
exports.__esModule = true;
exports.CellData = void 0;
var JasRange = /** @class */ (function () {
    function JasRange() {
    }
    /**
     * Returns A1 notation for a range, including the sheet name, with fixed row
     * and fixed column.
     */
    JasRange.getFixedA1Notation = function (range) {
        new CellData(range); // To assert it is a single cell.
        var nonFixedA1 = range.getA1Notation();
        var sheet = range.getSheet().getName();
        var row = nonFixedA1.match(/[a-zA-Z]+/);
        var column = nonFixedA1.match(/[0-9]+/);
        return "'" + sheet + "'!$" + row + "$" + column;
    };
    return JasRange;
}());
exports["default"] = JasRange;
var CellData = /** @class */ (function () {
    function CellData(range) {
        this.range = range;
        if (range.getHeight() !== 1 || range.getWidth() !== 1) {
            throw new Error('CellData is invalid for multi-cell ranges.');
        }
        this.data = range.getValue();
    }
    CellData.prototype.isBlank = function () {
        return this.range.isBlank();
    };
    CellData.prototype.string = function () {
        if (this.isBlank() || typeof this.data !== 'string') {
            throw new Error("Expected string in cell " + this.getCellString());
        }
        return this.data;
    };
    CellData.prototype.stringOptional = function () {
        return this.isBlank() ? undefined : this.string();
    };
    CellData.prototype.stringArray = function () {
        return this.isBlank() ? [] :
            this.string().split(/,|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    };
    CellData.prototype.number = function () {
        if (this.isBlank() || typeof this.data !== 'number') {
            throw new Error("Expected number in cell " + this.getCellString());
        }
        return this.data;
    };
    CellData.prototype.getCellString = function () {
        return this.range.getSheet().getName() + "!" + this.range.getA1Notation();
    };
    return CellData;
}());
exports.CellData = CellData;
