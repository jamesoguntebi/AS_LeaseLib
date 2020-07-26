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
var jas_spreadsheet_1 = require("./jas_spreadsheet");
var jas_range_1 = require("./jas_range");
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.get = function () {
        var F = Config.FIELD;
        var configSheet = jas_spreadsheet_1["default"].findSheet('config');
        var valueColumn = jas_spreadsheet_1["default"].findColumn('value', configSheet);
        var getCellData = function (configField) {
            var configRow = jas_spreadsheet_1["default"].findRow(configField, configSheet);
            return new jas_range_1.CellData(configSheet.getRange(configRow, valueColumn));
        };
        var rentConfig;
        var rentMonthlyAmountCellData = getCellData(F.rentConfig_monthlyAmount);
        var rentMonthlyDueDateCellData = getCellData(F.rentConfig_dueDayOfMonth);
        if (!rentMonthlyAmountCellData.isBlank() ||
            !rentMonthlyDueDateCellData.isBlank()) {
            rentConfig = {
                monthlyAmount: rentMonthlyAmountCellData.number(),
                dueDayOfMonth: rentMonthlyDueDateCellData.number()
            };
        }
        var loanConfig;
        var loanInterestRateCellData = getCellData(F.loanConfig_interestRate);
        var loanMonthlyInterestDayCellData = getCellData(F.loanConfig_interestDayOfMonth);
        if (!loanInterestRateCellData.isBlank() ||
            !loanMonthlyInterestDayCellData.isBlank()) {
            loanConfig = {
                interestRate: loanInterestRateCellData.number(),
                interestDayOfMonth: loanMonthlyInterestDayCellData.number()
            };
        }
        var paymentTypes = getCellData(F.searchQuery_paymentTypes)
            .string().split(/,|\n/)
            .map(function (pt) { return pt.trim(); })
            .map(function (pt) { return Config.assertIsPaymentType(pt); });
        return Config.validate({
            customerDisplayName: getCellData(F.customerDisplayName).string(),
            customerEmails: getCellData(F.customerEmails).stringArray(),
            emailCCs: getCellData(F.emailCCs).stringArray(),
            emailBCCs: getCellData(F.emailBCCs).stringArray(),
            emailDisplayName: getCellData(F.emailDisplayName).string(),
            linkToSheetHref: getCellData(F.linkToSheetHref).string(),
            linkToSheetText: getCellData(F.linkToSheetText).string(),
            loanConfig: loanConfig,
            rentConfig: rentConfig,
            searchQuery: {
                paymentTypes: paymentTypes,
                searchName: getCellData(F.searchQuery_searchName).string()
            }
        });
    };
    Config.validate = function (config) {
        if (config === void 0) { config = Config.get(); }
        if (!config.rentConfig && !config.loanConfig) {
            throw new Error('No renter or borrower config defined.');
        }
        if (config.rentConfig && config.loanConfig) {
            throw new Error('Both renter and borrower config defined.');
        }
        if (config.rentConfig) {
            Config.validateDayOfMonth(config.rentConfig.dueDayOfMonth);
            if (config.rentConfig.monthlyAmount < 0) {
                throw new Error('Illegal negative rent');
            }
        }
        if (config.loanConfig) {
            Config.validateDayOfMonth(config.loanConfig.interestDayOfMonth);
            if (config.loanConfig.interestRate < 0 ||
                config.loanConfig.interestRate > 1) {
                throw new Error('Interest rate must be between 0 and 1.');
            }
        }
        if (!config.searchQuery.paymentTypes.length) {
            throw new Error('At least one payment type is required in Config.');
        }
        if (!config.searchQuery.searchName) {
            throw new Error('Search query name is required in Config.');
        }
        if (!config.customerDisplayName) {
            throw new Error('Customer display name is required in Config.');
        }
        if (!config.customerEmails.length) {
            throw new Error('At least one customer email is required in Config.');
        }
        if (!config.customerEmails.every(Config.isEmail)) {
            throw new Error('Invalid email format for customer emails in Config.');
        }
        if (!config.emailDisplayName) {
            throw new Error('Email display name is required in Config.');
        }
        if (!config.emailCCs.every(Config.isEmail)) {
            throw new Error('Invalid email format for email cc in Config.');
        }
        if (!config.emailBCCs.every(Config.isEmail)) {
            throw new Error('Invalid email format for email bcc in Config.');
        }
        if (config.linkToSheetHref && !Config.isUrl(config.linkToSheetHref)) {
            throw new Error('Invalid link to balance sheet.');
        }
        if (config.linkToSheetText && !config.linkToSheetHref) {
            throw new Error('Link text is useless without href.');
        }
        return config;
    };
    Config.isEmail = function (s) {
        return /\S+@\S+\.\S+/.test(s);
    };
    Config.isUrl = function (s) {
        return /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(s);
    };
    Config.validateDayOfMonth = function (day) {
        if (!Number.isInteger(day) || day < 1 || day > 28) {
            throw new Error('Day of month must be a whole number from 1 to 28 to ' +
                'valid in all months.');
        }
    };
    Config.assertIsPaymentType = function (s) {
        if (!Config.PaymentTypeStrings.hasOwnProperty(s)) {
            throw new Error("Expected a payment type in [" + Object.keys(Config.PaymentTypeStrings)
                .map(function (key) { return Config.PaymentTypeStrings[key]; }).join(', ') + "]. " +
                ("Got " + s + "."));
        }
        return s;
    };
    Config.getLoanConfigForTest = function (override, overrides) {
        if (overrides === void 0) { overrides = {}; }
        return Config.getConfigForTest(__assign({ loanConfig: __assign({ interestRate: 0.05, interestDayOfMonth: 1 }, overrides.loanConfig) }, override), overrides);
    };
    Config.getRentConfigForTest = function (override, overrides) {
        if (overrides === void 0) { overrides = {}; }
        return Config.getConfigForTest(__assign({ rentConfig: __assign({ monthlyAmount: 3600, dueDayOfMonth: 15 }, overrides.rentConfig) }, override), overrides);
    };
    /** Only to be called from getRentConfigForTest or getLoanConfigForTest. */
    Config.getConfigForTest = function (override, overrides) {
        if (overrides === void 0) { overrides = {}; }
        return Config.validate(__assign({ customerDisplayName: 'Gandalf the White', customerEmails: ['mithrandir@gmail.com', 'thewhiterider@gmail.com'], emailCCs: ['legolas@gmail.com', 'aragorn@gmail.com'], emailBCCs: ['saruman@gmail.com', 'radagast@gmail.com'], emailDisplayName: 'Bank of Middle Earth Bot', linkToSheetHref: 'https://bankofmiddleearth.com/loans/gandalf', linkToSheetText: 'bankofmiddleearth.com/loans/gandalf', searchQuery: __assign({ paymentTypes: ['Zelle', 'Venmo'], searchName: 'Gandalf' }, overrides.searchQuery) }, override));
    };
    Config.PaymentTypeStrings = {
        Zelle: 'Zelle',
        Venmo: 'Venmo'
    };
    Config.DEFAULT = Config.getRentConfigForTest();
    // Keep in sync with ConfigParams below.
    Config.FIELD = {
        customerDisplayName: 'customer display name',
        customerEmails: 'customer emails',
        emailCCs: 'email cc',
        emailBCCs: 'email bcc',
        emailDisplayName: 'email display name',
        linkToSheetHref: 'link to sheet href',
        linkToSheetText: 'link to sheet text',
        loanConfig_interestRate: 'loan interest rate',
        loanConfig_interestDayOfMonth: 'loan monthly interest day',
        rentConfig_monthlyAmount: 'rent monthly amount',
        rentConfig_dueDayOfMonth: 'rent monthly due day',
        searchQuery_paymentTypes: 'payment types',
        searchQuery_searchName: 'gmail search name'
    };
    return Config;
}());
exports["default"] = Config;
