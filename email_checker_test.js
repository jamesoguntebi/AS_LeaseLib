"use strict";
exports.__esModule = true;
var email_checker_1 = require("./email_checker");
var balance_sheet_1 = require("./balance_sheet");
var email_sender_1 = require("./email_sender");
var config_1 = require("./config");
var client_sheet_manager_1 = require("./client_sheet_manager");
var jas_api_1 = require("jas_api");
var EmailCheckerTest = /** @class */ (function () {
    function EmailCheckerTest() {
        this.name = 'EmailCheckerTest';
    }
    EmailCheckerTest.prototype.setConfigWithPaymentTypes = function (t) {
        var paymentTypes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            paymentTypes[_i - 1] = arguments[_i];
        }
        t.setConfig(config_1["default"].getLoanConfigForTest(undefined, { searchQuery: { paymentTypes: paymentTypes } }));
    };
    EmailCheckerTest.prototype.run = function (t) {
        var _this = this;
        t.beforeAll(function () {
            t.spyOn(GmailApp, 'getUserLabelByName').and
                .callFake(jas_api_1.JASLib.FakeGmailApp.getUserLabelByName);
            t.spyOn(balance_sheet_1["default"], 'addPayment');
            t.spyOn(email_sender_1["default"], 'sendPaymentThanks');
            // Don't call the function for every registered sheet, only call it once.
            t.spyOn(client_sheet_manager_1["default"], 'forEach').and.callFake(function (fn) { return fn(); });
        });
        t.describe('checkLabeledEmailsForAllSheets', function () {
            t.describe('with invalid pending email', function () {
                t.beforeEach(function () {
                    _this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
                    jas_api_1.JASLib.FakeGmailApp.setData({ labels: [
                            {
                                name: email_checker_1["default"].PENDING_LABEL_NAME,
                                threads: [{ messages: [{}] }]
                            },
                            { name: email_checker_1["default"].DONE_LABEL_NAME },
                        ] });
                });
                t.it('throws on assertNoPendingThreads', function () {
                    email_checker_1["default"].checkLabeledEmailsForAllSheets();
                    t.expect(email_sender_1["default"].sendPaymentThanks).not.toHaveBeenCalled();
                    t.expect(balance_sheet_1["default"].addPayment).not.toHaveBeenCalled();
                    t.expect(function () { return email_checker_1["default"].assertNoPendingThreads(); })
                        .toThrow('Failed to parse labeled threads');
                });
            });
            t.describe('with valid Zelle email', function () {
                t.beforeEach(function () {
                    _this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
                    jas_api_1.JASLib.FakeGmailApp.setData({ labels: [
                            {
                                name: email_checker_1["default"].PENDING_LABEL_NAME,
                                threads: [
                                    { messages: [EmailCheckerTest.ZELLE_MESSAGE] },
                                ]
                            },
                            { name: email_checker_1["default"].DONE_LABEL_NAME },
                        ] });
                });
                t.it('handles the email', function () {
                    var _a;
                    email_checker_1["default"].checkLabeledEmailsForAllSheets();
                    t.expect(email_sender_1["default"].sendPaymentThanks).toHaveBeenCalled();
                    t.expect(balance_sheet_1["default"].addPayment).toHaveBeenCalled();
                    t.expect(function () { return email_checker_1["default"].assertNoPendingThreads(); }).not.toThrow();
                    t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(1);
                });
                t.describe('with Venmo-only Config', function () {
                    t.beforeEach(function () {
                        _this.setConfigWithPaymentTypes(t, 'Venmo');
                    });
                    t.it('does nothing', function () {
                        var _a;
                        email_checker_1["default"].checkLabeledEmailsForAllSheets();
                        t.expect(email_sender_1["default"].sendPaymentThanks).not.toHaveBeenCalled();
                        t.expect(balance_sheet_1["default"].addPayment).not.toHaveBeenCalled();
                        t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(0);
                    });
                });
            });
            t.describe('with valid Venmo email', function () {
                t.beforeEach(function () {
                    _this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
                    jas_api_1.JASLib.FakeGmailApp.setData({ labels: [
                            {
                                name: email_checker_1["default"].PENDING_LABEL_NAME,
                                threads: [
                                    { messages: [EmailCheckerTest.VENMO_MESSAGE] },
                                ]
                            },
                            { name: email_checker_1["default"].DONE_LABEL_NAME },
                        ] });
                });
                t.it('handles the email', function () {
                    var _a;
                    email_checker_1["default"].checkLabeledEmailsForAllSheets();
                    t.expect(email_sender_1["default"].sendPaymentThanks).toHaveBeenCalled();
                    t.expect(balance_sheet_1["default"].addPayment).toHaveBeenCalled();
                    t.expect(function () { return email_checker_1["default"].assertNoPendingThreads(); }).not.toThrow();
                    t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(1);
                });
                t.describe('with Zelle-only Config', function () {
                    t.beforeEach(function () {
                        _this.setConfigWithPaymentTypes(t, 'Zelle');
                    });
                    t.it('does nothing', function () {
                        var _a;
                        email_checker_1["default"].checkLabeledEmailsForAllSheets();
                        t.expect(email_sender_1["default"].sendPaymentThanks).not.toHaveBeenCalled();
                        t.expect(balance_sheet_1["default"].addPayment).not.toHaveBeenCalled();
                        t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(0);
                    });
                });
            });
            t.describe('with two valid emails in one thread', function () {
                t.beforeEach(function () {
                    _this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
                    jas_api_1.JASLib.FakeGmailApp.setData({ labels: [
                            {
                                name: email_checker_1["default"].PENDING_LABEL_NAME,
                                threads: [
                                    {
                                        messages: [
                                            EmailCheckerTest.VENMO_MESSAGE,
                                            EmailCheckerTest.VENMO_MESSAGE,
                                        ]
                                    },
                                ]
                            },
                            { name: email_checker_1["default"].DONE_LABEL_NAME },
                        ] });
                });
                t.it('handles both emails', function () {
                    var _a;
                    email_checker_1["default"].checkLabeledEmailsForAllSheets();
                    t.expect(email_sender_1["default"].sendPaymentThanks).toHaveBeenCalledTimes(2);
                    t.expect(balance_sheet_1["default"].addPayment).toHaveBeenCalledTimes(2);
                    t.expect(function () { return email_checker_1["default"].assertNoPendingThreads(); }).not.toThrow();
                    t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(1);
                });
            });
            t.describe('with valid emails in two threads', function () {
                t.beforeEach(function () {
                    _this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
                    jas_api_1.JASLib.FakeGmailApp.setData({ labels: [
                            {
                                name: email_checker_1["default"].PENDING_LABEL_NAME,
                                threads: [
                                    { messages: [EmailCheckerTest.VENMO_MESSAGE] },
                                    { messages: [EmailCheckerTest.ZELLE_MESSAGE] },
                                ]
                            },
                            { name: email_checker_1["default"].DONE_LABEL_NAME },
                        ] });
                });
                t.it('handles both emails', function () {
                    var _a;
                    email_checker_1["default"].checkLabeledEmailsForAllSheets();
                    t.expect(email_sender_1["default"].sendPaymentThanks).toHaveBeenCalledTimes(2);
                    t.expect(balance_sheet_1["default"].addPayment).toHaveBeenCalledTimes(2);
                    t.expect(function () { return email_checker_1["default"].assertNoPendingThreads(); }).not.toThrow();
                    t.expect((_a = jas_api_1.JASLib.FakeGmailApp.getUserLabelByName(email_checker_1["default"].DONE_LABEL_NAME)) === null || _a === void 0 ? void 0 : _a.getThreads().length).toEqual(2);
                });
            });
        });
    };
    EmailCheckerTest.ZELLE_MESSAGE = {
        subject: 'We deposited your Zelle payment',
        from: 'email@transfers.ally.com',
        plainBody: 'We have successfully deposited the $100.00 ' +
            ("Zelle\u00AE payment from " + config_1["default"].DEFAULT.searchQuery.searchName)
    };
    EmailCheckerTest.VENMO_MESSAGE = {
        subject: config_1["default"].DEFAULT.searchQuery.searchName + " paid you $100.00",
        from: 'venmo@venmo.com'
    };
    return EmailCheckerTest;
}());
exports["default"] = EmailCheckerTest;
