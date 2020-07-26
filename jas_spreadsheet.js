"use strict";
exports.__esModule = true;
var JasSpreadsheet = /** @class */ (function () {
    function JasSpreadsheet() {
    }
    JasSpreadsheet.getSpreadsheet = function () {
        return SpreadsheetApp.openById(_JasLibContext.spreadsheetId);
    };
    JasSpreadsheet.findSheet = function (name) {
        var spreadsheet = SpreadsheetApp.openById(_JasLibContext.spreadsheetId);
        if (!spreadsheet) {
            throw new Error("Cannot find spreadsheet with id: " + _JasLibContext.spreadsheetId);
        }
        name = name.toLowerCase();
        var matches = [];
        for (var _i = 0, _a = spreadsheet.getSheets(); _i < _a.length; _i++) {
            var sheet = _a[_i];
            if (sheet.getName().toLowerCase().includes(name)) {
                matches.push(sheet);
            }
        }
        if (matches.length > 1) {
            throw new Error("Multiple sheets '" + matches.map(function (s) { return s.getName(); }).join(', ') + "' matched query '" + name + "'");
        }
        if (matches.length === 0) {
            throw new Error("Expected a sheet with a name including '" + name + "'.");
        }
        return matches[0];
    };
    /**
     * Returns the index of the first matching row. Throws if not found or if
     * multiple are found.
     */
    JasSpreadsheet.findRow = function (name, sheet) {
        name = name.toLowerCase();
        var headerCol = sheet.getFrozenColumns() || 1;
        var lastRow = sheet.getLastRow();
        var rowLabels = [];
        var matches = [];
        for (var row = 1; row <= lastRow; row++) {
            var rowLabel = String(sheet.getRange(row, headerCol).getValue());
            if (rowLabel.toLowerCase().includes(name)) {
                matches.push({ row: row, rowLabel: rowLabel });
            }
            else if (rowLabel) {
                rowLabels.push(rowLabel);
            }
        }
        if (matches.length > 1) {
            throw new Error("Multiple rows '" + matches.map(function (m) { return m.rowLabel; }).join(', ') + "' matched query '" + name + "'");
        }
        if (matches.length === 0) {
            throw new Error("Expected a row with a name including '" + name + "' in " +
                ("sheet '" + sheet.getName() + "'. ") +
                ("Row labels: " + rowLabels.join(', ')));
        }
        return matches[0].row;
    };
    /**
     * Returns the index of the first matching column. Throws if not found or if
     * multiple are found.
     */
    JasSpreadsheet.findColumn = function (name, sheet) {
        name = name.toLowerCase();
        var headerRow = sheet.getFrozenRows() || 1;
        var lastColumn = sheet.getLastColumn();
        var columnLabels = [];
        var matches = [];
        for (var col = 1; col <= lastColumn; col++) {
            var columnLabel = String(sheet.getRange(headerRow, col).getValue());
            if (columnLabel.toLowerCase().includes(name)) {
                matches.push({ col: col, columnLabel: columnLabel });
            }
            else {
                columnLabels.push(columnLabel);
            }
        }
        if (matches.length > 1) {
            throw new Error("Multiple columns '" + matches.map(function (m) { return m.columnLabel; }).join(', ') + "' matched query '" + name + "'");
        }
        if (matches.length === 0) {
            throw new Error("Expected a column with a name including '" + name + "' in " +
                ("sheet '" + sheet.getName() + "'. ") +
                ("Column labels: " + columnLabels.join(', ')));
        }
        return matches[0].col;
    };
    return JasSpreadsheet;
}());
exports["default"] = JasSpreadsheet;
