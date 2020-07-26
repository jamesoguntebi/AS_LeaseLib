"use strict";
exports.__esModule = true;
var config_1 = require("./config");
var balance_sheet_1 = require("./balance_sheet");
var EmailSender = /** @class */ (function () {
    function EmailSender() {
    }
    EmailSender.sendPaymentThanks = function (amount) {
        var config = config_1["default"].get();
        var balanceNum = balance_sheet_1["default"].getBalance();
        var templateParams = {
            balance: balanceNum.toLocaleString('en'),
            colorBalance: !!config.rentConfig && balanceNum > 0,
            linkHref: config.linkToSheetHref,
            linkText: config.linkToSheetText,
            paymentAmount: amount.toLocaleString('en'),
            customerDisplayName: config.customerDisplayName
        };
        var nonHtmlBody = "Thank you for your payment of " + templateParams.paymentAmount + ". Your balance is now $" + templateParams.balance + ".\n\nSee balance sheet: " + templateParams.linkHref;
        var template = HtmlService.createTemplateFromFile('email_template_payment');
        template.templateParams = templateParams;
        GmailApp.sendEmail(config.customerEmails.join(', '), 'Received your payment - Thanks!', nonHtmlBody, {
            bcc: config.emailBCCs.join(', '),
            cc: config.emailCCs.join(', '),
            name: config.emailDisplayName,
            htmlBody: template.evaluate().getContent()
        });
    };
    return EmailSender;
}());
exports["default"] = EmailSender;
