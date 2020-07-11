import Config, { PaymentType } from "./config";
import BalanceSheet from "./balance_sheet";

type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

export default class EmailChecker {
  static readonly LABEL_NAME = 'AS Payment Processing';

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
    const paymentsLabel = GmailApp.getUserLabelByName(EmailChecker.LABEL_NAME);
    if (!paymentsLabel) {
      throw new Error(`Gmail label ${EmailChecker.LABEL_NAME} not found.`);
    }

    const threads = paymentsLabel.getThreads();

    for (const thread of paymentsLabel.getThreads()) {
      let threadProcessed = false;
      const subjects = [];
      for (const message of thread.getMessages()) {
        subjects.push(message.getSubject());
        for (const paymentType of Config.get().searchQuery.paymentTypes) {
          const parser = EmailChecker.PARSERS.get(paymentType);
          const paymentAmount = parser(message);
          if (paymentAmount !== null) {
            BalanceSheet.addPayment(paymentAmount);
            threadProcessed = true;
            break;
          }
        }
      }

      if (!threadProcessed) {
        throw new Error(`Labeled thread did not have any successful parsers. ` +
            `Thread subjects: ${subjects.join(', ')}`);
      }
      thread.removeLabel(paymentsLabel);
    }
  }

  private static parseVenmoMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('venmo')) return null;
    const subjectRegEx =
        new RegExp(Config.get().searchQuery.searchName + 
            '.* paid you \\$([0-9]+(\.[0-9][0-9])?)');
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
}

type EmailParser = (message: GmailMessage) => number|null;