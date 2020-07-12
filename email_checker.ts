import Config, { PaymentType } from "./config";
import BalanceSheet from "./balance_sheet";
import EmailSender from "./email_sender";

type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

export default class EmailChecker {
  static readonly PENDING_LABEL_NAME = 'AS Payment Process Pending';
  static readonly DONE_LABEL_NAME = 'AS Payment Processed';

  static readonly PAYMENT_QUERIES = new Map<PaymentType, string>([
    [
      'Zelle',
      'subject:(payment|deposited|deposit) zelle ' +
          '("deposited your payment"|"deposited your zelle payment"|"into your account")',
    ],
    ['Venmo', '(from:venmo subject:"paid you")'],
  ]);

  /** The first match in the RE must be the deposit amount. */
  static readonly PARSERS = new Map<PaymentType, EmailParser>([
    ['Venmo', EmailChecker.parseVenmoMessage],
    ['Zelle', EmailChecker.parseZelleMessage],
  ]);

  /** Searches among labeled emails. */
  static checkedLabeledEmails() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const doneLabel =
        EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);

    for (const thread of pendingLabel.getThreads()) {
      for (const message of thread.getMessages()) {
        for (const paymentType of Config.get().searchQuery.paymentTypes) {
          const parser = EmailChecker.PARSERS.get(paymentType);
          const paymentAmount = parser(message);
          if (paymentAmount !== null) {
            const paymentDate = new Date();
            paymentDate.setTime(message.getDate().getTime());
            BalanceSheet.addPayment(paymentAmount, paymentDate);
            EmailSender.sendPaymentThanks(paymentAmount);
            Logger.log(
                `Processed email with subject: '${message.getSubject()}'`);
            thread.removeLabel(pendingLabel);
            thread.addLabel(doneLabel);
            break;
          }
        }
      }
    }
  }

  static assertNoUnproccessLabeledThreads() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const threads = pendingLabel.getThreads();

    for (const thread of pendingLabel.getThreads()) {
      const subjects = thread.getMessages().map(m => m.getSubject());
      Logger.log(`Labeled thread did not have any successful parsers. ` +
          `Thread subjects: ${subjects.join(', ')}`);
    }

    if (threads.length) throw new Error('Failed to parse labeled messages.');
  }

  private static parseVenmoMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('venmo')) return null;
    const subjectRegEx =
        new RegExp(Config.get().searchQuery.searchName + 
            '.* paid you \\$([0-9]+(\.[0-9][0-9])?)', 'i');
    const regExResult = subjectRegEx.exec(message.getSubject());
    if (!regExResult) return null;
    return Number(regExResult[1]);
  }

  private static parseZelleMessage(message: GmailMessage): number|null {
    // /deposited.*\$([0-9]+(\.[0-9][0-9])?).*payment/
    if (!message.getFrom().toLowerCase().includes('ally')) return null;

    if (!/payment|deposited|deposit/.test(message.getSubject())) return null;

    const bodyRegEx = 
        new RegExp(
            'deposited.*\\$([0-9]+(\.[0-9][0-9])?).*payment.*from ' +
                Config.get().searchQuery.searchName,
            'i');
    const regExResult = bodyRegEx.exec(message.getPlainBody());
    if (!regExResult) return null;
    return Number(regExResult[1]);
  }

  /**
   * Searches all emails for messages that look like payments from the renter.
   */
  static queryAllEmails() {
    const config = Config.get();

    const paymentTypes = config.searchQuery.paymentTypes;
    const query = `newer_than:25d older_than:20d (` +
        [...paymentTypes.map(pt => `(${EmailChecker.PAYMENT_QUERIES.get(pt)}`)]
            .join(' OR ') /*+
        `) + ${config.searchQuery.searchName}`*/;
    Logger.log({query});
    const threads = GmailApp.search(query);

    const messages = [];
    threads.forEach(thread => thread.getMessages()
        .forEach(message => {
          messages.push(
            {
              subject: message.getSubject(),
              body: message.getPlainBody(),
              from: message.getFrom(),
            });
        }));
    Logger.log({messages});
  }

  private static assertLabel(labelName: string): GmailLabel {
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      throw new Error(`Gmail label ${labelName} not found.`);
    }
    return label;
  }
}

type EmailParser = (message: GmailMessage) => number|null;