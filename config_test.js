"use strict";
exports.__esModule = true;
var config_1 = require("./config");
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var ConfigTest = /** @class */ (function () {
    function ConfigTest() {
        this.name = 'ConfigTest';
        this.storedConfigValues = new Map();
        this.configSheet = jas_spreadsheet_1["default"].findSheet('config');
        this.valueColumn = jas_spreadsheet_1["default"].findColumn('value', this.configSheet);
    }
    ConfigTest.prototype.replaceConfigValue = function (t, configName, replaceFn) {
        var _this = this;
        if (!this.storedConfigValues.get(configName)) {
            this.storedConfigValues.set(configName, []);
        }
        t.beforeAll(function () {
            var row = jas_spreadsheet_1["default"].findRow(configName, _this.configSheet);
            var range = _this.configSheet.getRange(row, _this.valueColumn);
            _this.storedConfigValues.get(configName).push(range.getValue());
            replaceFn(range);
        });
        t.afterAll(function () {
            var row = jas_spreadsheet_1["default"].findRow(configName, _this.configSheet);
            var range = _this.configSheet.getRange(row, _this.valueColumn);
            range.setValue(_this.storedConfigValues.get(configName).pop());
        });
    };
    ConfigTest.prototype.setValue = function (t, configName, value) {
        this.replaceConfigValue(t, configName, function (r) {
            if (Array.isArray(value))
                value = value.join(', ');
            r.setValue(value);
        });
    };
    ConfigTest.prototype.clearValue = function (t, configName) {
        this.replaceConfigValue(t, configName, function (r) { return r.clear(); });
    };
    ConfigTest.prototype.run = function (t) {
        var _this = this;
        /**
         * Writing the config to the sheet is a test-only operation. Reading it back
         * from the sheet is needed in prod. The roundtrip guarantees that both work
         * together.
         */
        t.describe('write and read config', function () {
            var F = config_1["default"].FIELD;
            var writeConfig = function (c) {
                _this.setValue(t, F.customerDisplayName, c.customerDisplayName);
                _this.setValue(t, F.customerEmails, c.customerEmails);
                _this.setValue(t, F.emailCCs, c.emailCCs);
                _this.setValue(t, F.emailBCCs, c.emailBCCs);
                _this.setValue(t, F.emailDisplayName, c.emailDisplayName);
                _this.setValue(t, F.linkToSheetHref, c.linkToSheetHref);
                _this.setValue(t, F.linkToSheetText, c.linkToSheetText);
                _this.setValue(t, F.searchQuery_paymentTypes, c.searchQuery.paymentTypes);
                _this.setValue(t, F.searchQuery_searchName, c.searchQuery.searchName);
                if (c.loanConfig) {
                    _this.setValue(t, F.loanConfig_interestRate, c.loanConfig.interestRate);
                    _this.setValue(t, F.loanConfig_interestDayOfMonth, c.loanConfig.interestDayOfMonth);
                    _this.clearValue(t, F.rentConfig_monthlyAmount);
                    _this.clearValue(t, F.rentConfig_dueDayOfMonth);
                }
                else {
                    _this.setValue(t, F.rentConfig_monthlyAmount, c.rentConfig.monthlyAmount);
                    _this.setValue(t, F.rentConfig_dueDayOfMonth, c.rentConfig.dueDayOfMonth);
                    _this.clearValue(t, F.loanConfig_interestRate);
                    _this.clearValue(t, F.loanConfig_interestDayOfMonth);
                }
            };
            var configSpecs = [
                { name: 'loan', config: config_1["default"].getLoanConfigForTest() },
                { name: 'rent', config: config_1["default"].getRentConfigForTest() },
            ];
            var _loop_1 = function (name_1, config) {
                t.describe("after writing " + name_1 + " config", function () {
                    writeConfig(config);
                    t.it('reads back the config', function () {
                        t.expect(config_1["default"].get()).toEqual(config);
                    });
                });
            };
            for (var _i = 0, configSpecs_1 = configSpecs; _i < configSpecs_1.length; _i++) {
                var _a = configSpecs_1[_i], name_1 = _a.name, config = _a.config;
                _loop_1(name_1, config);
            }
        });
        t.describe('validate throws for', function () {
            t.it('neither rent nor loan config', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ loanConfig: undefined }); })
                    .toThrow('No renter or borrower config');
            });
            t.it('both rent and loan config', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ rentConfig: config_1["default"].DEFAULT.rentConfig }); })
                    .toThrow('Both renter and borrower config');
            });
            t.it('negative day of month', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { loanConfig: { interestDayOfMonth: -10 } }); })
                    .toThrow('Day of month');
                t.expect(function () { return config_1["default"].getRentConfigForTest(undefined, { rentConfig: { dueDayOfMonth: -1 } }); })
                    .toThrow('Day of month');
            });
            t.it('day of month too high', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { loanConfig: { interestDayOfMonth: 29 } }); })
                    .toThrow('Day of month');
                t.expect(function () { return config_1["default"].getRentConfigForTest(undefined, { rentConfig: { dueDayOfMonth: 100 } }); })
                    .toThrow('Day of month');
            });
            t.it('invalid interest rate', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { loanConfig: { interestRate: -0.04 } }); })
                    .toThrow('Interest rate');
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { loanConfig: { interestRate: 4.5 } }); })
                    .toThrow('Interest rate');
            });
            t.it('no payment types', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { searchQuery: { paymentTypes: [] } }); })
                    .toThrow('At least one payment type');
            });
            t.it('no search query name', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest(undefined, { searchQuery: { searchName: '' } }); })
                    .toThrow('Search query name is required');
            });
            t.it('no customer display name', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ customerDisplayName: '' }); })
                    .toThrow('Customer display name is required');
            });
            t.it('no customer emails', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ customerEmails: [] }); })
                    .toThrow('At least one customer email is required');
            });
            t.it('invalid customer emails', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ customerEmails: ['alpha@beta.gamma', 'hello'] }); })
                    .toThrow('Invalid email format');
            });
            t.it('no bot email display name', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ emailDisplayName: '' }); })
                    .toThrow('Email display name is required');
            });
            t.it('invalid email ccs', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ emailCCs: ['alpha@beta.gamma', 'hello'] }); })
                    .toThrow('Invalid email format');
            });
            t.it('invalid email bccs', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ emailBCCs: ['alpha@beta.gamma', 'hello'] }); })
                    .toThrow('Invalid email format');
            });
            t.it('invalid link to sheet href', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ linkToSheetHref: 'not-a-url' }); })
                    .toThrow('Invalid link');
            });
            t.it('link to sheet without href', function () {
                t.expect(function () { return config_1["default"].getLoanConfigForTest({ linkToSheetText: 'balance sheet', linkToSheetHref: undefined }); })
                    .toThrow('Link text is useless without href');
            });
        });
    };
    return ConfigTest;
}());
exports["default"] = ConfigTest;
