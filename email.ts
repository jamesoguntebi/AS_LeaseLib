import Config from "./config";
import BalanceSheet from "./balance_sheet";

export default class Email {
  static sendPaymentThanks(amount: number = Config.get().rentAmount) {
    const config = Config.get();

    const templateParams: PaymentEmailTemplateParams = {
      balance: BalanceSheet.getBalance(),
      linkHref: config.linkToSheetHref,
      linkText: config.linkToSheetText,
      paymentAmount: amount,
      renterFirstName: config.renter.firstName,
    };


    const nonHtmlBody = `Thank you for your payment of ${templateParams.paymentAmount}. ` +
        `Your balance is now $${templateParams.balance}.` + '\n\n' +
        `See balance sheet: ${templateParams.linkHref}`;

    const template = HtmlService.createTemplateFromFile('email_template_payment');
    template.templateParams = templateParams;

    MailApp.sendEmail({
      to: config.renter.email,
      cc: config.emailCC,
      subject: 'Thanks for your lease payment',
      name: 'Oguntebi Lease Bot',
      body: nonHtmlBody,
      htmlBody: template.evaluate().getContent(),
    });
  }
}


/** Keep in sync with email_template_payment.html. */
interface PaymentEmailTemplateParams {
  balance: number,
  linkHref: string,
  linkText: string,
  paymentAmount: number,
  renterFirstName: string,
}