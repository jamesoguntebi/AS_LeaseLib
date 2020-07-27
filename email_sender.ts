import Config from "./config";
import BalanceSheet from "./balance_sheet";

export function testEmailSending() {
  _JasLibContext.spreadsheetId = '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';
  EmailSender.sendPaymentThanks(1000);
  return Logger.getLog();
}

export default class EmailSender {
  private static MONEY_FORMATTER =
      new Intl.NumberFormat('en-us', {
        currency: "USD",
        minimumFractionDigits: 0,      
        maximumFractionDigits: 2,
      });

  static sendPaymentThanks(amount: number) {
    const config = Config.get();
    const balanceNum = BalanceSheet.getBalance();

    let balanceColor: string;
    if (config.rentConfig && balanceNum) {
      balanceColor = balanceNum > 0 ? '#b34' : '#192';
    }

    Logger.log('formatted balance: ' + EmailSender.formatMoney(balanceNum));
    Logger.log('balanceColor: ' + balanceColor);

    const templateParams: PaymentEmailTemplateParams = {
      balance: EmailSender.formatMoney(balanceNum),
      balanceColor,
      linkHref: config.linkToSheetHref,
      linkText: config.linkToSheetText,
      paymentAmount: EmailSender.formatMoney(amount),
      customerDisplayName: config.customerDisplayName,
    };

    const nonHtmlBody = `Thank you for your payment of ${
        templateParams.paymentAmount}. Your balance is now $${
        templateParams.balance}.\n\nSee balance sheet: ${
        templateParams.linkHref}`;

    const template =
        HtmlService.createTemplateFromFile('email_template_payment');
    template.templateParams = templateParams;

    GmailApp.sendEmail(
        config.customerEmails.join(', '),
        'Received your payment - Thanks!',
        nonHtmlBody,
        {
          bcc: config.emailBCCs.join(', '),
          cc: config.emailCCs.join(', '),
          name: config.emailDisplayName,
          htmlBody: template.evaluate().getContent(),
        });
  }

  static formatMoney(amount: number): string {
    let formatted = this.MONEY_FORMATTER.format(amount);
    if (amount < 0) {
      // Insert the dollar sign after the negative.
      formatted = `-$${formatted.substring(1)}`;
    } else {
      formatted = `$${formatted}`;
    }
    return formatted;
  }
}

/** Keep in sync with email_template_payment.html. */
interface PaymentEmailTemplateParams {
  balance: string,
  balanceColor: string,
  customerDisplayName: string,
  linkHref: string,
  linkText: string,
  paymentAmount: string,
}