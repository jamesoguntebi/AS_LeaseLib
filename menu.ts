import BalanceSheet from "./balance_sheet";
import Email from "./email";

export function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lease Tools')
      .addItem('Send Payment Received Mail', 'sendPaymentReceivedMail')
      .addItem('Add full payment', 'addFullPayment')
      .addItem('Add rent due transaction', 'addRentDueTransaction')
      .addToUi();
}

export function addFullPayment() {
  BalanceSheet.addPayment();
  Email.sendPaymentThanks();
}

export function sendPaymentReceivedMail() {
  Email.sendPaymentThanks();
}

export function addRentDueTransaction() {
  BalanceSheet.addRentDue();
}