"use strict";
exports.__esModule = true;
exports.runTestsWithLogs = exports.runTestsAndHideSuccesses = exports.runTests = void 0;
var balance_sheet_test_1 = require("../balance_sheet_test");
var email_sender_test_1 = require("../email_sender_test");
var email_checker_test_1 = require("../email_checker_test");
var config_test_1 = require("../config_test");
var jas_range_test_1 = require("../jas_range_test");
var jas_spreadsheet_test_1 = require("../jas_spreadsheet_test");
var tester_1 = require("./tester");
var client_sheet_manager_test_1 = require("../client_sheet_manager_test");
var jas_api_1 = require("jas_api");
function runTests(params) {
    if (params === void 0) { params = {}; }
    if (typeof params === 'string') {
        params = { testClassNames: params.split(',') };
    }
    TestRunner.run(params);
    return Logger.getLog();
}
exports.runTests = runTests;
function runTestsAndHideSuccesses(params) {
    if (params === void 0) { params = {}; }
    if (typeof params === 'string') {
        params = { testClassNames: params.split(',') };
    }
    params.showSuccesses = false;
    TestRunner.run(params);
    return Logger.getLog();
}
exports.runTestsAndHideSuccesses = runTestsAndHideSuccesses;
function runTestsWithLogs(params) {
    if (params === void 0) { params = {}; }
    if (typeof params === 'string') {
        params = { testClassNames: params.split(',') };
    }
    params.suppressLogs = false;
    TestRunner.run(params);
    return Logger.getLog();
}
exports.runTestsWithLogs = runTestsWithLogs;
var TestRunner = /** @class */ (function () {
    function TestRunner() {
    }
    TestRunner.run = function (_a) {
        var _b = _a.spreadsheetId, spreadsheetId = _b === void 0 ? TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID : _b, _c = _a.suppressLogs, suppressLogs = _c === void 0 ? true : _c, _d = _a.showSuccesses, showSuccesses = _d === void 0 ? true : _d, _e = _a.testClassNames, testClassNames = _e === void 0 ? undefined : _e;
        _JasLibContext.spreadsheetId = spreadsheetId;
        var testClasses = [
            balance_sheet_test_1["default"],
            client_sheet_manager_test_1["default"],
            config_test_1["default"],
            email_checker_test_1["default"],
            email_sender_test_1["default"],
            jas_range_test_1["default"],
            jas_spreadsheet_test_1["default"],
        ];
        if (testClassNames) {
            var testClassesSet_1 = new Set(testClassNames);
            testClasses = testClasses.filter(function (tc) { return testClassesSet_1.has(tc.name); });
            if (!testClasses.length) {
                throw new Error("No tests found among " + testClassNames);
            }
        }
        var tests = testClasses.map(function (tc) { return new tc(); });
        jas_api_1.JASLib.TestRunner.run(tests, { suppressLogs: suppressLogs, showSuccesses: showSuccesses, testerClass: tester_1["default"] });
    };
    TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID = '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';
    return TestRunner;
}());
exports["default"] = TestRunner;
