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

  // JAS - Lease Lib - EmailChecker - parsedMessageIds
  private static readonly PROPERTY_NAME = 'jas_ll_ec_pmi';

  // 30 days
  private static readonly STORAGE_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  /** The first match in the RE must be the deposit amount. */
  static readonly PARSERS = new Map<PaymentType, EmailParser>([
    ['Test', EmailChecker.parseTestMessage],
    ['Venmo', EmailChecker.parseVenmoMessage],
    ['Zelle', EmailChecker.parseZelleMessage],
  ]);

  /** Checks labeled emails against all client sheets sheet for payments. */
  static checkLabeledEmailsForAllSheets() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const pendingThreads = pendingLabel.getThreads();

    /** Ids of threads in which at least one message was parsed. */
    const idsOfParsedThreads = new Set<string>();
    const totalPendingThreads = pendingThreads.length;

    const parsedMessageIds =
        new Map(EmailChecker.readParsedMessages().map(pm => [pm.id, pm]));

    // If there are no pending threads, skip checking all the client sheets. We
    // could just bail early, but we still want to `writeParsedMessages()` below
    // in order to purge old messages.
    if (pendingThreads.length) {
      ClientSheetManager.forEach(() => {
        const parsedThreadIds = EmailChecker.checkLabeledEmailsHelper(
            pendingLabel, pendingThreads, parsedMessageIds);
        for (const id of parsedThreadIds) idsOfParsedThreads.add(id);
        // Returning true breaks loop to avoid opening all sheets unnecessarily.
        return !pendingThreads.length;
      });
    }

    // Even if no messages were parsed, still update storage. The message also
    // checks for old messages and removes them.
    EmailChecker.writeParsedMessages([...parsedMessageIds.values()]);

    // Any remaining threads failed to be parsed.
    if (idsOfParsedThreads.size < totalPendingThreads) {
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
          pendingThreads.map(t => t.getMessages().map(m => m.getSubject()))
              .join(', ');
      throw new Error(
          `Failed to parse labeled threads with subjects: ${threadSubjects}`)
    }
  }

  /** Checks labeled emails against the current sheet for payments. */
  static checkLabeledEmailsForCurrentSheet() {
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const pendingThreads = pendingLabel.getThreads();
    if (!pendingThreads.length) return;

    const parsedMessageIds =
        new Map(EmailChecker.readParsedMessages().map(pm => [pm.id, pm]));

    EmailChecker.checkLabeledEmailsHelper(
        pendingLabel, pendingThreads, parsedMessageIds);

    // Even if no messages were parsed, still update storage. The message also
    // checks for old messages and removes them.
    EmailChecker.writeParsedMessages([...parsedMessageIds.values()]);
  }

  /**
   * @returns The ids of threads in which at least one message was successfully
   *    parsed.
   */
  private static checkLabeledEmailsHelper(
      pendingLabel: GmailLabel, pendingThreads: GmailThread[],
      parsedMessageIds: Map<string, ParsedMessage>): Set<string> {
    const config = Config.get();

    if (!config.searchQuery.paymentTypes.length) return new Set();

    if (!pendingLabel) {
      pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    }
    if (!pendingThreads) {
      pendingThreads = pendingLabel.getThreads();
    }
    const doneLabel = EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);

    const idsOfParsedThreads = new Set<string>();

    // Reverse order since we remove items during processing.
    for (let i = pendingThreads.length - 1; i >= 0; i--) {
      const thread = pendingThreads[i];
      let processedMessagesCount = 0;

      if (config.searchQuery.labelName) {
        const labelName = config.searchQuery.labelName!.toLowerCase();
        if (!thread.getLabels().some(
                l => l.getName().toLowerCase() === labelName)) {
          continue;
        }
      }

      for (const message of thread.getMessages()) {
        const id = message.getId();
        if (parsedMessageIds.has(id)) continue;

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

            parsedMessageIds.set(
                id, {id, timestamp: message.getDate().getTime()});
            processedMessagesCount++;
            idsOfParsedThreads.add(thread.getId());
            break;
          }
        }
      }

      // Only remove the thread if all messages are parsed, so that other client
      // sheets don't need to parse this thread. If some messages are parsed by
      // sheet A and the rest by sheet B, then this won't handle that case, but
      // that should be rare, and this is only an optimization.
      if (processedMessagesCount === thread.getMessageCount()) {
        pendingThreads.splice(i, 1);
      }
    }

    return idsOfParsedThreads;
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

  private static readonly PAYMENT_QUERIES = new Map<PaymentType, string>([
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

  private static readParsedMessages(): ParsedMessage[] {
    const propertyValue = PropertiesService.getScriptProperties().getProperty(
        EmailChecker.PROPERTY_NAME);
    if (!propertyValue) return [];

    function looksLikeAParsedMessage(x: unknown): x is ParsedMessage {
      return typeof x === 'object' && typeof x['id'] === 'string' &&
          typeof x['timestamp'] === 'number';
    }

    try {
      const pmList = JSON.parse(propertyValue);
      if (pmList instanceof Array && pmList.every(looksLikeAParsedMessage)) {
        return pmList;
      } else {
        throw new Error(
            `Stored ParsedMessage list has incorrect format: ${propertyValue}`);
      }
    } catch (e) {
      Logger.log('Failure to parse stored ParsedMessage list.');
      throw e;
    }
  }

  private static writeParsedMessages(messages: ParsedMessage[]) {
    const purgeThreshold = Date.now() - EmailChecker.STORAGE_MESSAGE_TTL_MS;
    messages = messages.filter(m => m.timestamp > purgeThreshold);

    PropertiesService.getScriptProperties().setProperty(
        EmailChecker.PROPERTY_NAME, JSON.stringify(messages));
  }

  static TEST_ONLY = {
    readParsedMessages: EmailChecker.readParsedMessages,
    STORAGE_MESSAGE_TTL_MS: EmailChecker.STORAGE_MESSAGE_TTL_MS,
  }
}

type EmailParser = (message: GmailMessage) => number|null;

interface ParsedMessage {
  id: string;
  timestamp: number;
}
