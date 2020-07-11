import BalanceSheet from "./balance_sheet";
import EmailSender from "./email_sender";
import Config from "./config";

export function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lease Tools')
      .addItem('Send Payment Received Mail', 'sendPaymentReceivedMail')
      .addItem('Add full payment', 'addFullPayment')
      .addItem('Add rent due transaction', 'addRentDueTransaction')
      .addToUi();
}

export function sendPaymentReceivedMail() {
  EmailSender.sendPaymentThanks();
}