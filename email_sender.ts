import Util from './_util';
import BalanceSheet from './balance_sheet';
import Config from './config';

export default class EmailSender {
  static sendPaymentThanks(amount: number) {
    const config = Config.get();
    const balanceNum = BalanceSheet.getBalance();

    let balanceColor: string;
    if (config.rentConfig && balanceNum) {
      balanceColor = balanceNum > 0 ? Colors.RED_BALANCE : Colors.GREEN_BALANCE;
    }

    const templateParams: PaymentEmailTemplateParams = {
      balance: Util.formatMoney(balanceNum),
      balanceColor,
      linkHref: config.linkToSheetHref,
      linkText: config.linkToSheetText,
      paymentAmount: Util.formatMoney(amount),
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
        config.customerEmails.join(', '), 'Received your payment - Thanks!',
        nonHtmlBody, {
          bcc: config.emailBCCs.join(', '),
          cc: config.emailCCs.join(', '),
          name: config.emailDisplayName,
          htmlBody: template.evaluate().getContent(),
        });
  }

  static sendTestPaymentMessage(amount = 50) {
    const dayInMillis = 24 * 60 * 60 * 1000;
    const minSameThreadTime = Date.now() - dayInMillis;
    const subject = 'AS Lease Lib Test Payment';
    const body = `Payment amount: $${amount}`;

    const thread =
        GmailApp.search(`subject:(${subject})`)
            .find(t => t.getLastMessageDate().getTime() > minSameThreadTime);

    if (thread) {
      thread.reply(body);
    } else {
      GmailApp.sendEmail('jaoguntebi@gmail.com', subject, body);
    }
  }
}

/** Keep in sync with email_template_payment.html. */
interface PaymentEmailTemplateParams {
  balance: string, balanceColor: string, customerDisplayName: string,
      linkHref: string, linkText: string, paymentAmount: string,
}
