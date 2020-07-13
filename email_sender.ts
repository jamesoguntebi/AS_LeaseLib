import Config from "./config";
import BalanceSheet from "./balance_sheet";

export default class EmailSender {
  static sendPaymentThanks(
        amount: number = Config.get().rentConfig.monthlyAmount) {
    const {to, subject, nonHtmlBody, cc, bcc, name, htmlBody} =
        EmailSender.getPaymentThanksParams(amount);
    GmailApp.sendEmail(to, subject, nonHtmlBody, {cc, bcc, name, htmlBody});
  }

  /** Separate method for testing. */
  static getPaymentThanksParams(amount: number): SendEmailParams {
    const config = Config.get();
    const balanceNum = BalanceSheet.getBalance();

    const templateParams: PaymentEmailTemplateParams = {
      balance: balanceNum.toLocaleString('en'),
      colorBalance: !!config.rentConfig && balanceNum > 0,
      linkHref: config.linkToSheetHref,
      linkText: config.linkToSheetText,
      paymentAmount: amount.toLocaleString('en'),
      customerDisplayName: config.customerDisplayName,
    };

    const nonHtmlBody = `Thank you for your payment of ${
        templateParams.paymentAmount}. Your balance is now $${
        templateParams.balance}.\n\nSee balance sheet: ${
        templateParams.linkHref}`;

    const template =
        HtmlService.createTemplateFromFile('email_template_payment');
    template.templateParams = templateParams;

    return {
      to: config.customerEmails.join(', '),
      subject: 'Received your payment - Thanks!',
      nonHtmlBody,
      bcc: config.emailBCCs.join(', '),
      cc: config.emailCCs.join(', '),
      name: config.emailDisplayName,
      htmlBody: template.evaluate().getContent(),
    };
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  nonHtmlBody: string,
  cc?: string,
  bcc?: string,
  name: string;
  htmlBody: string,
}

/** Keep in sync with email_template_payment.html. */
interface PaymentEmailTemplateParams {
  balance: string,
  colorBalance: boolean,
  customerDisplayName: string,
  linkHref: string,
  linkText: string,
  paymentAmount: string,
}