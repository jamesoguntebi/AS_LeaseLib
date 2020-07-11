import Payments from "./payments";

export function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lease Tools')
      .addItem('Send Payment Received Mail', 'sendPaymentReceivedMail')
      .addItem('Add full payment', 'addFullPayment')
      .addToUi();
}

export function addFullPayment() {
  Payments.addPayment();
}