import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config, {PaymentType} from './config';
import EmailSender from './email_sender';

type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type GmailThread = GoogleAppsScript.Gmail.GmailThread;

export default class EmailChecker {
  static readonly PENDING_LABEL_NAME = 'AS Payment Process Pending';
  static readonly DONE_LABEL_NAME = 'AS Payment Processed';
  static readonly FAILED_LABEL_NAME = 'AS Payment Process Failed';

  /** The first match in the RE must be the deposit amount. */
  static readonly PARSERS = new Map<PaymentType, EmailParser>([
    ['Test', EmailChecker.parseTestMessage],
    ['Venmo', EmailChecker.parseVenmoMessage],
    ['Zelle', EmailChecker.parseZelleMessage],
  ]);

  static checkLabeledEmailsForAllSheets() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const pendingThreads = pendingLabel.getThreads();
    if (!pendingThreads.length) return;

    ClientSheetManager.forEach(() => {
      EmailChecker.checkLabeledEmails(pendingLabel, pendingThreads);
      return !pendingThreads.length;
    });

    // Any remaining threads failed to be parsed.
    if (pendingThreads.length) {
      const failedLabel =
          EmailChecker.assertLabel(EmailChecker.FAILED_LABEL_NAME);
      for (const thread of pendingThreads) {
        try {
          thread.removeLabel(pendingLabel);
          thread.addLabel(failedLabel);
        } catch {
          const subjects =
              thread.getMessages().map(m => m.getSubject()).join(', ');
          Logger.log(`Updating labels for thread with message subjects '${
              subjects}' failed.`);
        }
      }

      const threadSubjects =
          pendingLabel.getThreads()
              .map(t => t.getMessages().map(m => m.getSubject()))
              .join(', ');
      throw new Error(
          `Failed to parse labeled threads with subjects: ${threadSubjects}`)
    }
  }

  /** Searches among labeled emails. */
  static checkLabeledEmails(
      pendingLabel?: GmailLabel, pendingThreads?: GmailThread[]) {
    if (!pendingLabel) {
      pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    }
    if (!pendingThreads) {
      pendingThreads = pendingLabel.getThreads();
    }
    const doneLabel = EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);
    const config = Config.get();

    for (let i = pendingThreads.length - 1; i >= 0; i--) {
      const thread = pendingThreads[i];

      if (config.searchQuery.labelName) {
        const labelName = config.searchQuery.labelName!.toLowerCase();
        if (!thread.getLabels().some(
                l => l.getName().toLowerCase() === labelName)) {
          continue;
        }
      }

      for (const message of thread.getMessages()) {
        Logger.log('Checking message: ' +
            message.getPlainBody().substring(0, 10) + ', ' + message.getDate());
        for (const paymentType of config.searchQuery.paymentTypes) {
          const parser = EmailChecker.PARSERS.get(paymentType);
          const paymentAmount = parser(message);
          if (paymentAmount !== null) {
            // AS Date and JS Date are slightly different, so we cannot pass
            // AS Date directly.
            const paymentDate = new Date();
            paymentDate.setTime(message.getDate().getTime());

            BalanceSheet.addPayment(paymentAmount, paymentDate);
            EmailSender.sendPaymentThanks(paymentAmount);
            Logger.log(
                `Processed email with subject: '${message.getSubject()}'`);

            try {
              thread.removeLabel(pendingLabel);
              thread.addLabel(doneLabel);
            } catch {
              Logger.log(`Updating labels for thread with message subject ${
                  message.getSubject()} failed.`);
            }
            pendingThreads.splice(i, 1);
            Logger.log('processed. breaking');
            break;
          }
        }
      }
    }
  }

  private static parseVenmoMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('venmo')) return null;
    const subjectRegEx = new RegExp(
        Config.get().searchQuery.searchName +
            '.* paid you \\$([0-9]+(\.[0-9][0-9])?)',
        'i');
    const regExResult = subjectRegEx.exec(message.getSubject());
    if (!regExResult) return null;
    return Number(regExResult[1]);
  }

  private static parseZelleMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('ally')) return null;

    if (!/payment|deposited|deposit/.test(message.getSubject())) return null;

    const bodyRegEx = new RegExp(
        'deposited.*\\$([0-9]+(\.[0-9][0-9])?).*payment.*from ' +
            Config.get().searchQuery.searchName,
        'i');
    const regExResult = bodyRegEx.exec(message.getPlainBody());
    if (!regExResult) return null;
    return Number(regExResult[1]);
  }

  private static parseTestMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('jaoguntebi@gmail.com')) {
      return null;
    }
    if (!message.getSubject().includes('AS Lease Lib Test Payment')) {
      return null;
    } 

    const bodyRegEx =
        new RegExp('Payment\ amount:\ \\$([0-9]+(\.[0-9][0-9])?)');
    const regExResult = bodyRegEx.exec(message.getPlainBody());
    if (!regExResult) return null;
    return Number(regExResult[1]);
  }

  static readonly PAYMENT_QUERIES = new Map<PaymentType, string>([
    [
      'Zelle',
      'subject:(payment|deposited|deposit) zelle ' +
          '("deposited your payment"|"deposited your zelle payment"|"into your account")',
    ],
    ['Venmo', '(from:venmo subject:"paid you")'],
  ]);

  /**
   * Searches all emails for messages that look like payments from the renter.
   */
  static queryAllEmails() {
    const config = Config.get();

    const paymentTypes = config.searchQuery.paymentTypes;
    const query = `newer_than:25d older_than:20d (` +
        [
          ...paymentTypes.map(pt => `(${EmailChecker.PAYMENT_QUERIES.get(pt)}`)
        ].join(' OR ') /*+
     `) + ${config.searchQuery.searchName}`*/
        ;
    const threads = GmailApp.search(query);

    const messages = [];
    threads.forEach(thread => thread.getMessages().forEach(message => {
      messages.push({
        subject: message.getSubject(),
        body: message.getPlainBody(),
        from: message.getFrom(),
      });
    }));
  }

  private static assertLabel(labelName: string): GmailLabel {
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) throw new Error(`Gmail label ${labelName} not found.`);
    return label;
  }
}

type EmailParser = (message: GmailMessage) => number|null;
