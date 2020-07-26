"use strict";
exports.__esModule = true;
var config_1 = require("./config");
var balance_sheet_1 = require("./balance_sheet");
var client_sheet_manager_1 = require("./client_sheet_manager");
var jas_api_1 = require("jas_api");
var ClientSheetManagerTest = /** @class */ (function () {
    function ClientSheetManagerTest() {
        this.name = 'ClientSheetManagerTest';
    }
    ClientSheetManagerTest.prototype.expectRegisteredCount = function (t, expected) {
        var count = 0;
        client_sheet_manager_1["default"].forEach(function () { return count++; });
        t.expect(count).toEqual(expected);
    };
    ClientSheetManagerTest.prototype.run = function (t) {
        var _this = this;
        var forceConfigSheetInvalid = false;
        var forceBalanceSheetInvalid = false;
        t.beforeAll(function () {
            t.spyOn(config_1["default"], 'get').and.callFake(function () {
                if (forceConfigSheetInvalid)
                    throw new Error('Config is invalid');
            });
            t.spyOn(balance_sheet_1["default"], 'validateActiveSheet').and.callFake(function () {
                if (forceBalanceSheetInvalid) {
                    throw new Error('Balance sheet is invalid');
                }
            });
            t.spyOn(SpreadsheetApp, 'flush');
            t.spyOn(Utilities, 'sleep');
        });
        t.beforeEach(function () {
            var fakeProperties = new jas_api_1.JASLib.FakeProperties();
            t.spyOn(PropertiesService, 'getScriptProperties').and
                .callFake(function () { return fakeProperties; });
        });
        t.describe('regsiter', function () {
            t.beforeEach(function () { return _this.expectRegisteredCount(t, 0); });
            t.it('registers valid spreadsheets', function () {
                forceConfigSheetInvalid = false;
                forceBalanceSheetInvalid = false;
                client_sheet_manager_1["default"].register('sheet-id');
                _this.expectRegisteredCount(t, 1);
            });
            t.it('skips a spreadsheet with an invalid config', function () {
                forceConfigSheetInvalid = true;
                forceBalanceSheetInvalid = false;
                client_sheet_manager_1["default"].register('sheet-id');
                _this.expectRegisteredCount(t, 0);
            });
            t.it('skips a spreadsheet with an invalid balance sheet', function () {
                forceConfigSheetInvalid = false;
                forceBalanceSheetInvalid = true;
                client_sheet_manager_1["default"].register('sheet-id');
                _this.expectRegisteredCount(t, 0);
            });
            t.it('skips an already registered spreadsheet', function () {
                forceConfigSheetInvalid = false;
                forceBalanceSheetInvalid = false;
                client_sheet_manager_1["default"].register('sheet-id');
                _this.expectRegisteredCount(t, 1);
                client_sheet_manager_1["default"].register('sheet-id');
                _this.expectRegisteredCount(t, 1);
            });
        });
        t.describe('unregsiter', function () {
            t.beforeEach(function () {
                forceConfigSheetInvalid = false;
                forceBalanceSheetInvalid = false;
                client_sheet_manager_1["default"].register('sheet-1');
                client_sheet_manager_1["default"].register('sheet-2');
                _this.expectRegisteredCount(t, 2);
            });
            t.it('unregisters existing spreadsheets', function () {
                client_sheet_manager_1["default"].unregister('sheet-1');
                _this.expectRegisteredCount(t, 1);
            });
            t.it('skips unknown spreadsheets', function () {
                client_sheet_manager_1["default"].unregister('some unknown spreadsheet');
                _this.expectRegisteredCount(t, 2);
            });
            t.it('skips already unregistered spreadsheets', function () {
                client_sheet_manager_1["default"].unregister('sheet-1');
                _this.expectRegisteredCount(t, 1);
                client_sheet_manager_1["default"].unregister('sheet-1');
                _this.expectRegisteredCount(t, 1);
            });
        });
        t.describe('forEach', function () {
            var eachFn = function () { };
            var observer = { eachFn: eachFn };
            t.beforeEach(function () {
                forceConfigSheetInvalid = false;
                forceBalanceSheetInvalid = false;
                client_sheet_manager_1["default"].register('sheet-1');
                client_sheet_manager_1["default"].register('sheet-2');
                client_sheet_manager_1["default"].register('sheet-3');
                t.spyOn(observer, 'eachFn');
            });
            t.it('touches every registered sheet', function () {
                client_sheet_manager_1["default"].forEach(observer.eachFn);
                t.expect(observer.eachFn).toHaveBeenCalledTimes(3);
                t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-1');
                t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-2');
                t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-3');
            });
            t.it('flushes each sheet', function () {
                client_sheet_manager_1["default"].forEach(eachFn);
                t.expect(SpreadsheetApp.flush).toHaveBeenCalledTimes(3);
            });
            t.it('sleeps after every sheet', function () {
                client_sheet_manager_1["default"].forEach(eachFn);
                t.expect(Utilities.sleep).toHaveBeenCalledTimes(3);
            });
        });
    };
    return ClientSheetManagerTest;
}());
exports["default"] = ClientSheetManagerTest;
