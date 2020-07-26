"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var balance_sheet_1 = require("./balance_sheet");
var client_sheet_manager_1 = require("./client_sheet_manager");
var config_1 = require("./config");
var email_sender_1 = require("./email_sender");
var EmailChecker = /** @class */ (function () {
    function EmailChecker() {
    }
    EmailChecker.checkLabeledEmailsForAllSheets = function () {
        var pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
        var pendingThreads = pendingLabel.getThreads();
        if (!pendingThreads.length) {
            return;
        }
        client_sheet_manager_1["default"].forEach(function () { return EmailChecker.checkedLabeledEmails(pendingLabel, pendingThreads); });
    };
    /** Searches among labeled emails. */
    EmailChecker.checkedLabeledEmails = function (pendingLabel, pendingThreads) {
        if (!pendingLabel) {
            pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
        }
        if (!pendingThreads) {
            pendingThreads = pendingLabel.getThreads();
        }
        var doneLabel = EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);
        var alreadyProcessed = EmailChecker.getAllProcessedEmailsPendingLabelUpdate();
        var tryUpdateOldProcessedThreadLabels = false;
        for (var _i = 0, pendingThreads_1 = pendingThreads; _i < pendingThreads_1.length; _i++) {
            var thread = pendingThreads_1[_i];
            if (alreadyProcessed.has(thread.getId()))
                continue;
            for (var _a = 0, _b = thread.getMessages(); _a < _b.length; _a++) {
                var message = _b[_a];
                for (var _c = 0, _d = config_1["default"].get().searchQuery.paymentTypes; _c < _d.length; _c++) {
                    var paymentType = _d[_c];
                    var parser = EmailChecker.PARSERS.get(paymentType);
                    var paymentAmount = parser(message);
                    if (paymentAmount !== null) {
                        // AS Date and JS Date are slightly different, so we cannot pass
                        // AS Date directly.
                        var paymentDate = new Date();
                        paymentDate.setTime(message.getDate().getTime());
                        balance_sheet_1["default"].addPayment(paymentAmount, paymentDate);
                        email_sender_1["default"].sendPaymentThanks(paymentAmount);
                        Logger.log("Processed email with subject: '" + message.getSubject() + "'");
                        try {
                            thread.removeLabel(pendingLabel);
                            thread.addLabel(doneLabel);
                            // This means that label updates worked. Try to update labels for
                            // awaiting threads.
                            tryUpdateOldProcessedThreadLabels = true;
                        }
                        catch (_e) {
                            Logger.log("Updating labels for thread with message subject " + message.getSubject() + " failed.");
                            EmailChecker.addProcessedEmailPendingLabelUpdate(thread.getId());
                        }
                        break;
                    }
                }
            }
        }
        if (tryUpdateOldProcessedThreadLabels) {
            for (var _f = 0, alreadyProcessed_1 = alreadyProcessed; _f < alreadyProcessed_1.length; _f++) {
                var threadId = alreadyProcessed_1[_f];
                var thread = GmailApp.getThreadById(threadId);
                try {
                    thread.removeLabel(pendingLabel);
                    thread.addLabel(doneLabel);
                    Logger.log('Updated labels for thread that failed label update ' +
                        'previously.');
                    alreadyProcessed["delete"](threadId);
                }
                catch (_g) {
                    Logger.log('Expected label update to succeed. But it failed.');
                }
            }
            PropertiesService.getScriptProperties().setProperty(EmailChecker.PROPERTY_KEY, JSON.stringify(Array.from(alreadyProcessed)));
        }
    };
    EmailChecker.assertNoPendingThreads = function () {
        var pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
        var threads = pendingLabel.getThreads();
        if (threads.length) {
            var threadSubjects = pendingLabel.getThreads().map(function (t) { return t.getMessages()
                .map(function (m) { return m.getSubject(); }); });
            throw new Error("Failed to parse labeled threads with subjects: " + threadSubjects);
        }
        ;
    };
    EmailChecker.parseVenmoMessage = function (message) {
        if (!message.getFrom().toLowerCase().includes('venmo'))
            return null;
        var subjectRegEx = new RegExp(config_1["default"].get().searchQuery.searchName +
            '.* paid you \\$([0-9]+(\.[0-9][0-9])?)', 'i');
        var regExResult = subjectRegEx.exec(message.getSubject());
        if (!regExResult)
            return null;
        return Number(regExResult[1]);
    };
    EmailChecker.parseZelleMessage = function (message) {
        if (!message.getFrom().toLowerCase().includes('ally'))
            return null;
        if (!/payment|deposited|deposit/.test(message.getSubject()))
            return null;
        var bodyRegEx = new RegExp('deposited.*\\$([0-9]+(\.[0-9][0-9])?).*payment.*from ' +
            config_1["default"].get().searchQuery.searchName, 'i');
        var regExResult = bodyRegEx.exec(message.getPlainBody());
        if (!regExResult)
            return null;
        return Number(regExResult[1]);
    };
    /**
     * Searches all emails for messages that look like payments from the renter.
     */
    EmailChecker.queryAllEmails = function () {
        var config = config_1["default"].get();
        var paymentTypes = config.searchQuery.paymentTypes;
        var query = "newer_than:25d older_than:20d (" +
            __spreadArrays(paymentTypes.map(function (pt) { return "(" + EmailChecker.PAYMENT_QUERIES.get(pt); })).join(' OR ') /*+
    `) + ${config.searchQuery.searchName}`*/;
        var threads = GmailApp.search(query);
        var messages = [];
        threads.forEach(function (thread) { return thread.getMessages()
            .forEach(function (message) {
            messages.push({
                subject: message.getSubject(),
                body: message.getPlainBody(),
                from: message.getFrom()
            });
        }); });
    };
    EmailChecker.assertLabel = function (labelName) {
        var label = GmailApp.getUserLabelByName(labelName);
        if (!label)
            throw new Error("Gmail label " + labelName + " not found.");
        return label;
    };
    EmailChecker.addProcessedEmailPendingLabelUpdate = function (threadId) {
        var existingIds = EmailChecker.getAllProcessedEmailsPendingLabelUpdate();
        existingIds.add(threadId);
        PropertiesService.getScriptProperties().setProperty(EmailChecker.PROPERTY_KEY, JSON.stringify(Array.from(existingIds)));
    };
    EmailChecker.getAllProcessedEmailsPendingLabelUpdate = function () {
        var propertyValue = PropertiesService.getScriptProperties().getProperty(EmailChecker.PROPERTY_KEY);
        if (!propertyValue)
            return new Set();
        try {
            var idList = JSON.parse(propertyValue);
            if (idList instanceof Array &&
                idList.every(function (id) { return typeof id === 'string'; })) {
                return new Set(idList);
            }
            else {
                throw new Error("Stored processed email thread id list has " +
                    ("incorrect format: " + propertyValue));
            }
        }
        catch (e) {
            Logger.log('Failure to parse processed email thread id list.');
            throw e;
        }
    };
    // James Apps Script - Lease Lib - Email Checker -
    // Processed email pending label update
    EmailChecker.PROPERTY_KEY = 'jas_ll_ec_peplu';
    EmailChecker.PENDING_LABEL_NAME = 'AS Payment Process Pending';
    EmailChecker.DONE_LABEL_NAME = 'AS Payment Processed';
    EmailChecker.PAYMENT_QUERIES = new Map([
        [
            'Zelle',
            'subject:(payment|deposited|deposit) zelle ' +
                '("deposited your payment"|"deposited your zelle payment"|"into your account")',
        ],
        ['Venmo', '(from:venmo subject:"paid you")'],
    ]);
    /** The first match in the RE must be the deposit amount. */
    EmailChecker.PARSERS = new Map([
        ['Venmo', EmailChecker.parseVenmoMessage],
        ['Zelle', EmailChecker.parseZelleMessage],
    ]);
    return EmailChecker;
}());
exports["default"] = EmailChecker;
