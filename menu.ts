import BalanceSheet from "./balance_sheet";
import EmailSender from "./email_sender";

export function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lease Tools')
      .addItem('Send Payment Received Mail', 'sendPaymentReceivedMail')
      .addItem('Add full payment', 'addFullPayment')
      .addItem('Add rent due transaction', 'addRentDueTransaction')
      .addToUi();
}

export function addFullPayment() {
  BalanceSheet.addPayment();
  EmailSender.sendPaymentThanks();
}

export function sendPaymentReceivedMail() {
  EmailSender.sendPaymentThanks();
}

export function addRentDueTransaction() {
  BalanceSheet.addRentDue();
}