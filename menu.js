"use strict";
exports.__esModule = true;
exports.sendPaymentReceivedMail = exports.onOpen = void 0;
var email_sender_1 = require("./email_sender");
function onOpen() {
    SpreadsheetApp.getUi().createMenu('Lease Tools')
        .addItem('Send Payment Received Mail', 'sendPaymentReceivedMail')
        .addItem('Add full payment', 'addFullPayment')
        .addItem('Add rent due transaction', 'addRentDueTransaction')
        .addToUi();
}
exports.onOpen = onOpen;
function sendPaymentReceivedMail() {
    email_sender_1["default"].sendPaymentThanks();
}
exports.sendPaymentReceivedMail = sendPaymentReceivedMail;
