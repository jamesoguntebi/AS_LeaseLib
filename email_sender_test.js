"use strict";
exports.__esModule = true;
var email_sender_1 = require("./email_sender");
var config_1 = require("./config");
var balance_sheet_1 = require("./balance_sheet");
var EmailSenderTest = /** @class */ (function () {
    function EmailSenderTest() {
        this.name = 'EmailSenderTest';
    }
    EmailSenderTest.prototype.expectSendMailToHaveBeenCalledLike = function (t, matcher) {
        t.expect(GmailApp.sendEmail).toHaveBeenCalledLike(t.matcher(function (args) { return matcher(args); }));
    };
    EmailSenderTest.prototype.run = function (t) {
        var _this = this;
        t.beforeAll(function () {
            t.setConfig(config_1["default"].getLoanConfigForTest());
            t.spyOn(GmailApp, 'sendEmail');
        });
        t.describe('paymentThanksEmail', function () {
            t.beforeAll(function () {
                t.spyOn(balance_sheet_1["default"], 'getBalance').and.returnValue(100);
            });
            t.it('formats large numbers with comma', function () {
                email_sender_1["default"].sendPaymentThanks(1500);
                _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                    t.expect(params[2]).toContain('1,500');
                    t.expect(params[3].htmlBody).toContain('1,500');
                    return true;
                });
            });
            var RED_BALANCE_STRING = 'style="color: #b34;"';
            var balanceSpecs = [
                { balance: 100, type: 'positive' },
                { balance: -100, type: 'negative' },
            ];
            var configSepcs = [
                { type: 'rent', config: config_1["default"].getRentConfigForTest() },
                { type: 'loan', config: config_1["default"].getLoanConfigForTest() },
            ];
            var _loop_1 = function (balanceType, balance) {
                var _loop_2 = function (configType, config) {
                    t.describe("when showing " + balanceType + " balance for " + configType, function () {
                        t.beforeAll(function () {
                            t.setConfig(config);
                            t.spyOn(balance_sheet_1["default"], 'getBalance').and.returnValue(balance);
                        });
                        var expectRed = configType === 'rent' && balance > 0;
                        var testName = expectRed ?
                            "shows balance in red" : "does not show balance in red";
                        t.it(testName, function () {
                            email_sender_1["default"].sendPaymentThanks(1);
                            _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                                var expectation = t.expect(params[3].htmlBody);
                                if (expectRed) {
                                    expectation.toContain(RED_BALANCE_STRING);
                                }
                                else {
                                    expectation.not.toContain(RED_BALANCE_STRING);
                                }
                                return true;
                            });
                        });
                    });
                };
                for (var _i = 0, configSepcs_1 = configSepcs; _i < configSepcs_1.length; _i++) {
                    var _a = configSepcs_1[_i], configType = _a.type, config = _a.config;
                    _loop_2(configType, config);
                }
            };
            for (var _i = 0, balanceSpecs_1 = balanceSpecs; _i < balanceSpecs_1.length; _i++) {
                var _a = balanceSpecs_1[_i], balanceType = _a.type, balance = _a.balance;
                _loop_1(balanceType, balance);
            }
            t.describe('for config fields', function () {
                t.beforeAll(function () { return t.setConfig(config_1["default"].DEFAULT); });
                t.it('uses them', function () {
                    email_sender_1["default"].sendPaymentThanks(1);
                    _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                        t.expect(params[0]).toEqual(config_1["default"].DEFAULT.customerEmails.join(', '));
                        t.expect(params[3].cc).toEqual(config_1["default"].DEFAULT.emailCCs.join(', '));
                        t.expect(params[3].bcc).toEqual(config_1["default"].DEFAULT.emailBCCs.join(', '));
                        t.expect(params[3].name).toEqual(config_1["default"].DEFAULT.emailDisplayName);
                        return true;
                    });
                });
                t.describe('link to balance sheet', function () {
                    t.it('shows when link config is present', function () {
                        t.setConfig(config_1["default"].DEFAULT);
                        email_sender_1["default"].sendPaymentThanks(1);
                        _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                            t.expect(params[3].htmlBody).toContain('See balance sheet');
                            return true;
                        });
                    });
                    t.it('falls back to href for display text', function () {
                        t.setConfig(config_1["default"].getLoanConfigForTest({ linkToSheetText: undefined }));
                        email_sender_1["default"].sendPaymentThanks(1);
                        var href = config_1["default"].get().linkToSheetHref;
                        _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                            var htmlBody = params[3].htmlBody;
                            t.expect(htmlBody).toContain('See balance sheet');
                            t.expect(htmlBody).toContain(href + "    </a>");
                            return true;
                        });
                        // Enable spyOn within it()
                        // - new ItContext
                        // - simplify a bunch of tests to remove wrapping describe()
                    });
                    t.it('hides when link config is not present', function () {
                        t.setConfig(config_1["default"].getLoanConfigForTest({
                            linkToSheetHref: undefined,
                            linkToSheetText: undefined
                        }));
                        email_sender_1["default"].sendPaymentThanks(1);
                        _this.expectSendMailToHaveBeenCalledLike(t, function (params) {
                            var htmlBody = params[3].htmlBody;
                            t.expect(htmlBody).not.toContain('See balance sheet');
                            return true;
                        });
                    });
                });
            });
        });
    };
    return EmailSenderTest;
}());
exports["default"] = EmailSenderTest;
