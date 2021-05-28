import {JASLib} from 'jas_api';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config, {PaymentType} from './config';
import EmailChecker from './email_checker';
import EmailSender from './email_sender';
import Tester from './testing/tester';




export default class EmailCheckerTest implements JASLib.Test {
  private setConfigWithPaymentTypes(t: Tester, ...paymentTypes: PaymentType[]) {
    t.setConfig(
        Config.getLoanConfigForTest(undefined, {searchQuery: {paymentTypes}}));
  }

  private expectLabelCounts(
      t: Tester,
      expectedCounts: {pending?: number, done?: number, failed?: number}) {
    if (expectedCounts.pending !== undefined) {
      t.expect(JASLib.FakeGmailApp
                   .getUserLabelByName(EmailChecker.PENDING_LABEL_NAME)!
                   .getThreads()
                   .length)
          .toBe(expectedCounts.pending);
    }
    if (expectedCounts.done !== undefined) {
      t.expect(
           JASLib.FakeGmailApp.getUserLabelByName(EmailChecker.DONE_LABEL_NAME)!
               .getThreads()
               .length)
          .toBe(expectedCounts.done);
    }
    if (expectedCounts.failed !== undefined) {
      t.expect(
           JASLib.FakeGmailApp
               .getUserLabelByName(EmailChecker.FAILED_LABEL_NAME)!.getThreads()
               .length)
          .toBe(expectedCounts.failed);
    }
  }

  private createZelleMessage(searchName: string): JASLib.GmailMessageParams {
    return {
      subject: 'We deposited your Zelle payment',
      from: 'email@transfers.ally.com',
      plainBody: 'We have successfully deposited the $100.00 ' +
          `Zelle® payment from ${searchName}`,
    };
  }

  private createVenmoMessage(searchName: string): JASLib.GmailMessageParams {
    return {
      subject: `${searchName} paid you $100.00`,
      from: 'venmo@venmo.com',
    };
  }

  run(t: Tester) {
    const SHEET_CONFIGS = [
      Config.getLoanConfigForTest(undefined, {
        searchQuery: {searchName: 'Gandalf', paymentTypes: ['Zelle', 'Venmo']}
      }),
      Config.getLoanConfigForTest(
          undefined,
          {searchQuery: {searchName: 'Legolas', paymentTypes: ['Zelle']}}),
      Config.getLoanConfigForTest(
          undefined,
          {searchQuery: {searchName: 'Aragorn', paymentTypes: ['Venmo']}})
    ];

    const ZELLE_MESSAGES =
        SHEET_CONFIGS.filter(c => c.searchQuery.paymentTypes.includes('Zelle'))
            .map(c => this.createZelleMessage(c.searchQuery.searchName));
    const VENMO_MESSAGES =
        SHEET_CONFIGS.filter(c => c.searchQuery.paymentTypes.includes('Venmo'))
            .map(c => this.createVenmoMessage(c.searchQuery.searchName));
    const ZELLE_MESSAGE = ZELLE_MESSAGES[0];
    const VENMO_MESSAGE = VENMO_MESSAGES[0];
    const INVALID_MESSAGE: JASLib.GmailMessageParams = {
      subject: `Not a valid lease/loan email`,
      from: 'invalid@venmo.com',
    };

    const setDataWithPendingMessages =
        (threadMessages: JASLib.GmailMessageParams[][],
         extraLabels: string[] = []) => {
          JASLib.FakeGmailApp.setData({
            labels: [
              {
                name: EmailChecker.PENDING_LABEL_NAME,
                threads: threadMessages.map(
                    (messages, t) => ({
                      id: `t${t}`,
                      messages: messages.map(
                          (message, m) => ({...message, id: `t${t}-m${m}`}))
                    })),
              },
              {name: EmailChecker.DONE_LABEL_NAME},
              {name: EmailChecker.FAILED_LABEL_NAME},
              ...extraLabels.map(name => ({name}))
            ],
          });
        };

    t.beforeAll(() => {
      t.spyOn(GmailApp, 'getUserLabelByName')
          .and.callFake(JASLib.FakeGmailApp.getUserLabelByName);
      t.spyOn(BalanceSheet, 'addPayment');
      t.spyOn(EmailSender, 'sendPaymentThanks');

      // Call the function with the test configs.
      t.spyOn(ClientSheetManager, 'forEach').and.callFake((fn: Function) => {
        for (const config of SHEET_CONFIGS) {
          t.setConfig(config);
          fn();
        }
      });
    });

    t.beforeEach(() => {
      const fakeProperties = new JASLib.FakeProperties();
      t.spyOn(PropertiesService, 'getScriptProperties')
          .and.callFake(() => fakeProperties);
    });

    t.describe('checkLabeledEmailsForAllSheets', () => {
      t.it('throws for invalid pending email', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[INVALID_MESSAGE]]);

        t.expect(() => EmailChecker.checkLabeledEmailsForAllSheets())
            .toThrow('Failed to parse labeled threads');
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 0, failed: 1});
      });

      t.it('does not throw for valid pending email', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);

        t.expect(() => EmailChecker.checkLabeledEmailsForAllSheets())
            .not.toThrow();
        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('processes multiple valid emails in multiple threads', () => {
        setDataWithPendingMessages([
          ZELLE_MESSAGES,  // Thread 1
          VENMO_MESSAGES,  // Thread 2
        ]);
        EmailChecker.checkLabeledEmailsForAllSheets();

        const messageCount = ZELLE_MESSAGES.length + VENMO_MESSAGES.length;
        t.expect(EmailSender.sendPaymentThanks)
            .toHaveBeenCalledTimes(messageCount);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(messageCount);
        this.expectLabelCounts(t, {pending: 0, done: 2, failed: 0});
      });

      t.it('processes message only once', () => {
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);
        EmailChecker.checkLabeledEmailsForAllSheets();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        EmailChecker.checkLabeledEmailsForAllSheets();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('processes later messages in thread', () => {
        setDataWithPendingMessages([[ZELLE_MESSAGES[0]]]);
        EmailChecker.checkLabeledEmailsForAllSheets();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        setDataWithPendingMessages([[ZELLE_MESSAGES[0], ZELLE_MESSAGES[1]]]);
        EmailChecker.checkLabeledEmailsForAllSheets();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        setDataWithPendingMessages(
            [[ZELLE_MESSAGES[0], ZELLE_MESSAGES[1], ZELLE_MESSAGES[0]]]);
        EmailChecker.checkLabeledEmailsForAllSheets();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(3);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(3);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('removes old messages from storage', () => {
        let currentTime = 1000;
        t.spyOn(Date, 'now').and.callFake(() => currentTime);

        setDataWithPendingMessages([[{...ZELLE_MESSAGE, date: new Date(999)}]]);

        EmailChecker.checkLabeledEmailsForAllSheets();
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(1);

        currentTime += 1000;
        EmailChecker.checkLabeledEmailsForAllSheets();
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(1);

        currentTime += EmailChecker.TEST_ONLY.STORAGE_MESSAGE_TTL_MS + 1;
        EmailChecker.checkLabeledEmailsForAllSheets();
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(0);
      });
    });

    t.describe('checkLabeledEmailsForCurrentSheet', () => {
      type PaymentTypeSpec = {
        message: JASLib.GmailMessageParams,
        otherType: PaymentType,
        type: PaymentType,
      };
      const paymentTypeSpecs: PaymentTypeSpec[] = [
        {type: 'Venmo', otherType: 'Zelle', message: VENMO_MESSAGE},
        {type: 'Zelle', otherType: 'Venmo', message: ZELLE_MESSAGE},
      ];

      for (const {type, message} of paymentTypeSpecs) {
        t.it(`processes ${type} email`, () => {
          this.setConfigWithPaymentTypes(t, type);
          setDataWithPendingMessages([[message]]);
          EmailChecker.checkLabeledEmailsForCurrentSheet();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
        });
      }

      for (const {type, message, otherType} of paymentTypeSpecs) {
        t.it(`ignores ${type} email in ${otherType} config`, () => {
          this.setConfigWithPaymentTypes(t, otherType);
          setDataWithPendingMessages([[message]]);
          EmailChecker.checkLabeledEmailsForCurrentSheet();

          t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
          this.expectLabelCounts(t, {pending: 1, done: 0, failed: 0});
        });
      }

      t.it('processes two valid emails in one thread', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[VENMO_MESSAGE, VENMO_MESSAGE]]);
        EmailChecker.checkLabeledEmailsForCurrentSheet();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('processes valid emails in two threads', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[VENMO_MESSAGE], [ZELLE_MESSAGE]]);
        EmailChecker.checkLabeledEmailsForCurrentSheet();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 2, failed: 0});
      });

      t.it('processes message only once', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle');
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);
        EmailChecker.checkLabeledEmailsForCurrentSheet();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        EmailChecker.checkLabeledEmailsForCurrentSheet();

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('checks config for required label', () => {
        const secondLabel = 'Second Label';
        t.setConfig(Config.getLoanConfigForTest(undefined, {
          searchQuery: {
            paymentTypes: ['Venmo'],
            labelName: secondLabel,
          },
        }));

        // When the message has Pending label but not the second label.
        setDataWithPendingMessages([[VENMO_MESSAGE]]);
        EmailChecker.checkLabeledEmailsForCurrentSheet();

        // Expect the message not to get parsed.
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 1, done: 0, failed: 0});

        // When the message has both labels.
        setDataWithPendingMessages([[VENMO_MESSAGE]], [secondLabel]);
        JASLib.FakeGmailApp.getUserLabelByName(EmailChecker.PENDING_LABEL_NAME)
            .getThreads()[0]!.addLabel(
                JASLib.FakeGmailApp.getUserLabelByName(secondLabel));
        EmailChecker.checkLabeledEmailsForCurrentSheet();

        // Expect the message to get parsed.
        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.it('does not crash for config without search types', () => {
        t.setConfig(Config.getLoanConfigForTest(undefined, {
          searchQuery: {paymentTypes: []},
        }));

        // Valid messages in two threads.
        setDataWithPendingMessages([[VENMO_MESSAGE], [ZELLE_MESSAGE]]);

        // Expect the call not to throw.
        t.expect(() => EmailChecker.checkLabeledEmailsForCurrentSheet())
            .not.toThrow();

        // Expect nothing to have happened.
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 2, done: 0, failed: 0});
      });
    });
  }
}
