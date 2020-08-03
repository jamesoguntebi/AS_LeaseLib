import BalanceSheet from "./balance_sheet";
import ClientSheetManager from "./client_sheet_manager";
import Config, { PaymentType } from "./config";
import EmailSender from "./email_sender";

type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type GmailThread = GoogleAppsScript.Gmail.GmailThread;

export default class EmailChecker {
  // James Apps Script - Lease Lib - Email Checker -
  // Processed email pending label update
  private static readonly PROPERTY_KEY = 'jas_ll_ec_peplu';
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

  static checkLabeledEmailsForAllSheets() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const pendingThreads = pendingLabel.getThreads();
    if (!pendingThreads.length) {
      return;
    }

    ClientSheetManager.forEach(
        () => EmailChecker.checkedLabeledEmails(pendingLabel, pendingThreads));    
  }

  /** Searches among labeled emails. */
  static checkedLabeledEmails(
      pendingLabel?: GmailLabel, pendingThreads?: GmailThread[]) {
    if (!pendingLabel) {
      pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    }
    if (!pendingThreads) {
      pendingThreads = pendingLabel.getThreads();
    }
    const doneLabel =
        EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);
    const alreadyProcessed =
        EmailChecker.getAllProcessedEmailsPendingLabelUpdate();
    let tryUpdateOldProcessedThreadLabels = false;
    const config = Config.get();

    for (const thread of pendingThreads) {
      if (alreadyProcessed.has(thread.getId())) continue;

      // TODO: Test this:
      if (config.searchQuery.labelName) {
        const labelName = config.searchQuery.labelName!.toLowerCase();
        if (
          !thread.getLabels().some(l => l.getName().toLowerCase() === labelName)
        ) {
          continue;
        }
      }

      for (const message of thread.getMessages()) {
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

              // This means that label updates worked. Try to update labels for
              // awaiting threads.
              tryUpdateOldProcessedThreadLabels = true;
            } catch {
              Logger.log(`Updating labels for thread with message subject ${
                  message.getSubject()} failed.`);
              EmailChecker.addProcessedEmailPendingLabelUpdate(thread.getId());
            }
            break;
          }
        }
      }
    }

    if (tryUpdateOldProcessedThreadLabels) {
      for (const threadId of alreadyProcessed) {
        const thread = GmailApp.getThreadById(threadId);
        try {
          thread.removeLabel(pendingLabel);
          thread.addLabel(doneLabel);
          Logger.log('Updated labels for thread that failed label update ' +
              'previously.');
          alreadyProcessed.delete(threadId);
        } catch {
          Logger.log('Expected label update to succeed. But it failed.')
        }
      }
      PropertiesService.getScriptProperties().setProperty(
          EmailChecker.PROPERTY_KEY,
          JSON.stringify(Array.from(alreadyProcessed)));
    }
  }

  static assertNoPendingThreads() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const threads = pendingLabel.getThreads();

    if (threads.length) {
      const threadSubjects = pendingLabel.getThreads().map(t => t.getMessages()
          .map(m => m.getSubject()));
      throw new Error(`Failed to parse labeled threads with subjects: ${
          threadSubjects}`)
    };
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
  }

  private static assertLabel(labelName: string): GmailLabel {
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) throw new Error(`Gmail label ${labelName} not found.`);
    return label;
  }

  private static addProcessedEmailPendingLabelUpdate(threadId: string) {
    const existingIds = EmailChecker.getAllProcessedEmailsPendingLabelUpdate();
    existingIds.add(threadId);
    PropertiesService.getScriptProperties().setProperty(
        EmailChecker.PROPERTY_KEY, JSON.stringify(Array.from(existingIds)));
  }

  private static getAllProcessedEmailsPendingLabelUpdate(): Set<string> {
    const propertyValue = PropertiesService.getScriptProperties().getProperty(
        EmailChecker.PROPERTY_KEY);
    if (!propertyValue) return new Set();

    try {
      const idList = JSON.parse(propertyValue);
      if (idList instanceof Array &&
        idList.every(id => typeof id === 'string')) {
        return new Set(idList);
      } else {
        throw new Error(`Stored processed email thread id list has ` +
            `incorrect format: ${propertyValue}`);
      }
    } catch (e) {
      Logger.log('Failure to parse processed email thread id list.');
      throw e;
    }
  }
}

type EmailParser = (message: GmailMessage) => number|null;