"use strict";
exports.__esModule = true;
exports.testing = exports.unregisterClientSheet = exports.registerClientSheet = exports.template_checkedLabeledEmails = exports.template_maybeAddRentOrInterestTransaction = exports.checkedLabeledEmails = exports.maybeAddRentOrInterestTransaction = void 0;
var balance_sheet_1 = require("./balance_sheet");
var email_checker_1 = require("./email_checker");
var client_sheet_manager_1 = require("./client_sheet_manager");
var LEASE_TEMPLATE_SPREADSHEET_ID = '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';
_JasLibContext = { spreadsheetId: '' };
function maybeAddRentOrInterestTransaction() {
    return Executrix.run(function () {
        client_sheet_manager_1["default"].forEach(balance_sheet_1["default"].maybeAddRentOrInterestTransaction);
    });
}
exports.maybeAddRentOrInterestTransaction = maybeAddRentOrInterestTransaction;
function checkedLabeledEmails() {
    return Executrix.run(function () { return email_checker_1["default"].checkLabeledEmailsForAllSheets(); });
}
exports.checkedLabeledEmails = checkedLabeledEmails;
function template_maybeAddRentOrInterestTransaction() {
    _JasLibContext.spreadsheetId = LEASE_TEMPLATE_SPREADSHEET_ID;
    return Executrix.run(function () {
        balance_sheet_1["default"].maybeAddRentOrInterestTransaction();
    });
}
exports.template_maybeAddRentOrInterestTransaction = template_maybeAddRentOrInterestTransaction;
function template_checkedLabeledEmails() {
    _JasLibContext.spreadsheetId = LEASE_TEMPLATE_SPREADSHEET_ID;
    return Executrix.run(function () {
        email_checker_1["default"].checkedLabeledEmails();
    });
}
exports.template_checkedLabeledEmails = template_checkedLabeledEmails;
function registerClientSheet(spreadsheetId) {
    return Executrix.run(function () { return client_sheet_manager_1["default"].register(spreadsheetId); });
}
exports.registerClientSheet = registerClientSheet;
function unregisterClientSheet(spreadsheetId) {
    return Executrix.run(function () { return client_sheet_manager_1["default"].unregister(spreadsheetId); });
}
exports.unregisterClientSheet = unregisterClientSheet;
function testing(spreadsheetId) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    return Executrix.run(function () { return ({ result: 'testing' }); });
}
exports.testing = testing;
var Executrix = /** @class */ (function () {
    function Executrix() {
    }
    Executrix.run = function (job) {
        var start = Date.now();
        var jobRun = job();
        Logger.log("Runtime: " + (Date.now() - start) + " ms");
        var resultString = Logger.getLog();
        if (jobRun && jobRun.result) {
            resultString = "Result: " + jobRun.result + "\n\n" + resultString;
        }
        return '\n' + resultString;
    };
    return Executrix;
}());
