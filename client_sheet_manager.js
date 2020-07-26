"use strict";
exports.__esModule = true;
var config_1 = require("./config");
var balance_sheet_1 = require("./balance_sheet");
var ClientSheetManager = /** @class */ (function () {
    function ClientSheetManager() {
    }
    /**
     * Sets each registered spreadhsheet as the current spreadsheet in the library
     * context, calling the callback each time.
     * @param fn
     */
    ClientSheetManager.forEach = function (fn) {
        var storedSpreadsheetId = _JasLibContext.spreadsheetId;
        var spreadsheetIds = ClientSheetManager.getAll();
        Logger.log("Registered clients: " + JSON.stringify(spreadsheetIds));
        for (var _i = 0, spreadsheetIds_1 = spreadsheetIds; _i < spreadsheetIds_1.length; _i++) {
            var spreadsheetId = spreadsheetIds_1[_i];
            _JasLibContext.spreadsheetId = spreadsheetId;
            fn(spreadsheetId);
            SpreadsheetApp.flush();
            // Sleeping after each spreadsheet operation is likely unecessary. It's
            // a safeguard to prevent cross-talk between client sheets.
            Utilities.sleep(500);
        }
        _JasLibContext.spreadsheetId = storedSpreadsheetId;
    };
    ClientSheetManager.register = function (spreadsheetId) {
        var registeredSet = new Set(ClientSheetManager.getAll());
        if (registeredSet.has(spreadsheetId))
            return;
        var storedSpreadsheetId = _JasLibContext.spreadsheetId;
        try {
            _JasLibContext.spreadsheetId = spreadsheetId;
            config_1["default"].get(); // This will validate that the Config sheet.
            balance_sheet_1["default"].validateActiveSheet();
        }
        catch (e) {
            Logger.log('Validation of new sheet failed with error:');
            Logger.log(e instanceof Error ? e.stack || e.message : 'Unknown error');
            return;
        }
        finally {
            _JasLibContext.spreadsheetId = storedSpreadsheetId;
        }
        registeredSet.add(spreadsheetId);
        PropertiesService.getScriptProperties().setProperty(ClientSheetManager.PROPERTY_NAME, JSON.stringify(Array.from(registeredSet)));
        Logger.log("Library added client sheet " + spreadsheetId);
    };
    ClientSheetManager.unregister = function (spreadsheetId) {
        var registeredSet = new Set(ClientSheetManager.getAll());
        if (!registeredSet.has(spreadsheetId))
            return;
        registeredSet["delete"](spreadsheetId);
        PropertiesService.getScriptProperties().setProperty(ClientSheetManager.PROPERTY_NAME, JSON.stringify(Array.from(registeredSet)));
        Logger.log("Library removed client sheet " + spreadsheetId);
    };
    ClientSheetManager.getAll = function () {
        var propertyValue = PropertiesService.getScriptProperties().getProperty(ClientSheetManager.PROPERTY_NAME);
        if (!propertyValue)
            return [];
        try {
            var clientList = JSON.parse(propertyValue);
            if (clientList instanceof Array &&
                clientList.every(function (clientId) { return typeof clientId === 'string'; })) {
                return clientList;
            }
            else {
                throw new Error("Stored client sheet id list has incorrect format: " + propertyValue);
            }
        }
        catch (e) {
            Logger.log('Failure to parse stored client sheet id list.');
            throw e;
        }
    };
    ClientSheetManager.PROPERTY_NAME = 'REGISTERED_CLIENTS';
    return ClientSheetManager;
}());
exports["default"] = ClientSheetManager;
