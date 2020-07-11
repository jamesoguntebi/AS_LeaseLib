import Config from "./config";
import BalanceSheet from "./balance_sheet";

export default class EmailSender {
  static sendPaymentThanks(amount: number = Config.get().rentAmount) {
    const config = Config.get();

    const templateParams: PaymentEmailTemplateParams = {
      balance: BalanceSheet.getBalance(),
      linkHref: config.linkToSheetHref,
      linkText: config.linkToSheetText,
      paymentAmount: amount,
      customerDisplayName: config.customerDisplayName,
    };


    const nonHtmlBody = `Thank you for your payment of ${templateParams.paymentAmount}. ` +
        `Your balance is now $${templateParams.balance}.` + '\n\n' +
        `See balance sheet: ${templateParams.linkHref}`;

    const template = HtmlService.createTemplateFromFile('email_template_payment');
    template.templateParams = templateParams;

    GmailApp.sendEmail(
      config.customerEmails.join(', '),
      'Thanks for your lease payment',
      nonHtmlBody,
      {
        cc: config.emailCC,
        name: config.emailDisplayName,
        htmlBody: template.evaluate().getContent(),
      });
  }
}


/** Keep in sync with email_template_payment.html. */
interface PaymentEmailTemplateParams {
  balance: number,
  customerDisplayName: string,
  linkHref: string,
  linkText: string,
  paymentAmount: number,
}