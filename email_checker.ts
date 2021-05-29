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
  static readonly DONE_AUTO_LABEL_NAME = 'AS Payment Processed (Auto)';
  static readonly FAILED_LABEL_NAME = 'AS Payment Process Failed';

  // Prefix: JAS - Lease Lib - EmailChecker
  private static readonly STORAGE_PROPERTIES = {
    CHECKED_QUERY_THREADS: 'jas_ll_ec_cqt',
    PARSED_MESSAGE_IDS: 'jas_ll_ec_pmi',
  }

  // 30 days
  private static readonly STORAGE_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  /** The first match in the RE must be the deposit amount. */
  static readonly PARSERS = new Map<PaymentType, EmailParser>([
    ['Test', EmailChecker.parseTestMessage],
    ['Venmo', EmailChecker.parseVenmoMessage],
    ['Zelle', EmailChecker.parseZelleMessage],
  ]);

  /** Checks labeled emails against all client sheets sheet for payments. */
  static checkEmails(whichSheets: 'allSheets'|'currentSheet') {
    // Threads that are manually labeled as payment threads.
    const pendingLabel =
        EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    const pendingThreads = pendingLabel.getThreads();
    const pendingThreadIds = pendingThreads.map(t => t.getId());

    const queriedThreads = GmailApp.search(EmailChecker.RECENT_PAYMENTS_QUERY);
    const queriedThreadIds = new Set<string>();

    const allThreads = [...pendingThreads];
    for (const qt of queriedThreads) {
      if (!pendingThreadIds.includes(qt.getId())) {
        allThreads.push(qt);
        queriedThreadIds.add(qt.getId());
      }
    }

    /** Ids of threads in which at least one message was parsed. */
    const idsOfParsedThreads = new Set<string>();
    /** Ids of messages that have been parsed recently. */
    const parsedMessageIds =
        new Map(EmailChecker.readParsedMessages().map(pm => [pm.id, pm]));

    // If there are no pending threads, skip checking all the client sheets. We
    // could just bail early, but we still want to `writeParsedMessages()` below
    // in order to purge old messages.
    if (allThreads.length) {
      if (whichSheets === 'allSheets') {
        ClientSheetManager.forEach(() => {
          const parsedThreadIds = EmailChecker.checkEmailsHelper(
              pendingLabel, allThreads, parsedMessageIds, queriedThreadIds);
          for (const id of parsedThreadIds) idsOfParsedThreads.add(id);
          // Returning true breaks loop to avoid opening all sheets
          // unnecessarily.
          return !allThreads.length;
        });
      } else {
        EmailChecker.checkEmailsHelper(
            pendingLabel, allThreads, parsedMessageIds, queriedThreadIds);
      }
    }

    // Even if no messages were parsed, still update storage. The method also
    // checks for old messages and removes them.
    EmailChecker.writeParsedMessages([...parsedMessageIds.values()]);

    // If any of the pending threads didn't have at least one message parsed:
    if (whichSheets === 'allSheets' &&
        pendingThreadIds.some(id => !idsOfParsedThreads.has(id))) {
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

  /**
   * @returns The ids of threads in which at least one message was successfully
   *    parsed.
   */
  private static checkEmailsHelper(
      pendingLabel: GmailLabel, threads: GmailThread[],
      parsedMessageIds: Map<string, ParsedMessage>,
      queriedThreadIds = new Set<string>()): Set<string> {
    const config = Config.get();
    const defaultPaymentAmount =
        config.rentConfig?.monthlyAmount || config.loanConfig?.defaultPayment;

    if (!config.searchQuery.paymentTypes.length) return new Set();

    if (!pendingLabel) {
      pendingLabel = EmailChecker.assertLabel(EmailChecker.PENDING_LABEL_NAME);
    }
    if (!threads) {
      threads = pendingLabel.getThreads();
    }
    const doneLabel = EmailChecker.assertLabel(EmailChecker.DONE_LABEL_NAME);
    const doneAutoLabel =
        EmailChecker.assertLabel(EmailChecker.DONE_AUTO_LABEL_NAME);

    const idsOfParsedThreads = new Set<string>();

    // Reverse order since we remove items during processing.
    for (let i = threads.length - 1; i >= 0; i--) {
      const thread = threads[i];
      const isQueriedThread = queriedThreadIds.has(thread.getId());
      let processedMessagesCount = 0;

      // For threads that are retrieved automatically from search, don't require
      // the search label.
      if (config.searchQuery.labelName && !isQueriedThread) {
        const labelName = config.searchQuery.labelName!.toLowerCase();
        if (!thread.getLabels().some(
                l => l.getName().toLowerCase() === labelName)) {
          continue;
        }
      }

      // TODO: For query threads that have been checked before (read from
      // storage) and whose message count hasn't changed, `continue`.

      for (const message of thread.getMessages()) {
        const id = message.getId();
        if (parsedMessageIds.has(id)) continue;

        for (const paymentType of config.searchQuery.paymentTypes) {
          const parser = EmailChecker.PARSERS.get(paymentType);
          const paymentAmount = parser(message);

          if (paymentAmount === null) continue;

          // Only process a queried thread if the payment amount is the same as
          // the default payment.
          if (isQueriedThread && paymentAmount !== defaultPaymentAmount) {
            continue;
          }

          // AS Date and JS Date are slightly different, so we cannot pass
          // AS Date directly.
          const paymentDate = new Date();
          paymentDate.setTime(message.getDate().getTime());

          BalanceSheet.addPayment(paymentAmount, paymentDate);
          EmailSender.sendPaymentThanks(paymentAmount);
          Logger.log(`Processed email with subject: '${message.getSubject()}'`);

          try {
            if (isQueriedThread) {
              thread.addLabel(doneAutoLabel);
            } else {
              thread.removeLabel(pendingLabel);
              thread.addLabel(doneLabel);
            }
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

      // Only remove the thread if all messages are parsed, so that other client
      // sheets don't need to parse this thread. If some messages are parsed by
      // sheet A and the rest by sheet B, then this won't handle that case, but
      // that should be rare, and this is only an optimization.
      if (processedMessagesCount === thread.getMessageCount()) {
        threads.splice(i, 1);
      }

      // TODO: If this is a queried thread, and it didn't match any client
      // sheets, write it to storage.
    }

    return idsOfParsedThreads;
  }

  private static parseVenmoMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('venmo')) return null;
    const subjectRegEx = new RegExp(
        Config.get().searchQuery.searchName +
            '.* paid you \\$([0-9,]+(\.[0-9][0-9])?)',
        'i');
    const regExResult = subjectRegEx.exec(message.getSubject());
    if (!regExResult) return null;
    return Number(regExResult[1].replace(/,/g, '')) || null;
  }

  private static parseZelleMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('ally')) return null;

    if (!/payment|deposited|deposit/.test(message.getSubject())) return null;

    const bodyRegEx = new RegExp(
        'deposited.*\\$([0-9,]+(\.[0-9][0-9])?).*payment.*from ' +
            Config.get().searchQuery.searchName,
        'i');
    const regExResult = bodyRegEx.exec(message.getPlainBody());
    if (!regExResult) return null;
    return Number(regExResult[1].replace(/,/g, '')) || null;
  }

  private static parseTestMessage(message: GmailMessage): number|null {
    if (!message.getFrom().toLowerCase().includes('jaoguntebi@gmail.com')) {
      return null;
    }
    if (!message.getSubject().includes('AS Lease Lib Test Payment')) {
      return null;
    }

    const bodyRegEx =
        new RegExp('Payment\ amount:\ \\$([0-9,]+(\.[0-9][0-9])?)');
    const regExResult = bodyRegEx.exec(message.getPlainBody());
    if (!regExResult) return null;
    return Number(regExResult[1].replace(/,/g, ''));
  }

  private static assertLabel(labelName: string): GmailLabel {
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) throw new Error(`Gmail label ${labelName} not found.`);
    return label;
  }

  private static readParsedMessages(): ParsedMessage[] {
    const propertyValue = PropertiesService.getScriptProperties().getProperty(
        EmailChecker.STORAGE_PROPERTIES.PARSED_MESSAGE_IDS);
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
      ('Failure to parse stored ParsedMessage list.');
      throw e;
    }
  }

  private static writeParsedMessages(messages: ParsedMessage[]) {
    const purgeThreshold = Date.now() - EmailChecker.STORAGE_MESSAGE_TTL_MS;
    messages = messages.filter(m => m.timestamp > purgeThreshold);

    PropertiesService.getScriptProperties().setProperty(
        EmailChecker.STORAGE_PROPERTIES.PARSED_MESSAGE_IDS,
        JSON.stringify(messages));
  }

  static TEST_ONLY = {
    readParsedMessages: EmailChecker.readParsedMessages,
    STORAGE_MESSAGE_TTL_MS: EmailChecker.STORAGE_MESSAGE_TTL_MS,
  }

  // Gmail query for threads that look like payment emails in the last hour.
  // Excludes threads that have already been processed.
  private static readonly RECENT_PAYMENTS_QUERY = `newer_than:1h (` +
      [
        // Zelle messages
        `subject:(payment|deposited|deposit) zelle ` +
            `("deposited your payment"|"deposited your zelle payment"|"into your account")`,
        // Venmo messages
        `from:venmo subject:"paid you"`,
        // Test messages
        `(subject:"AS Lease Lib Test Payment")`,
      ].map(subquery => `(${subquery})`)
          .join(` OR `) +
      `)`;
}

type EmailParser = (message: GmailMessage) => number|null;

interface ParsedMessage {
  id: string;
  timestamp: number;
}
