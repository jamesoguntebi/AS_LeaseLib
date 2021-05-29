import {JASLib} from 'jas_api';

import Util from './_util';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config, {ConfigParams, PaymentType} from './config';
import EmailChecker from './email_checker';
import EmailSender from './email_sender';
import Tester from './testing/tester';



export default class EmailCheckerTest implements JASLib.Test {
  private setConfigWithPaymentTypes(t: Tester, ...paymentTypes: PaymentType[]) {
    t.setConfig(
        Config.getLoanConfigForTest(undefined, {searchQuery: {paymentTypes}}));
  }

  private expectLabelCounts(t: Tester, expectedCounts: {
    pending?: number,
    done?: number,
    doneAuto?: number,
    failed?: number,
  }) {
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
    if (expectedCounts.doneAuto !== undefined) {
      t.expect(JASLib.FakeGmailApp
                   .getUserLabelByName(EmailChecker.DONE_AUTO_LABEL_NAME)!
                   .getThreads()
                   .length)
          .toBe(expectedCounts.doneAuto);
    }
    if (expectedCounts.failed !== undefined) {
      t.expect(
           JASLib.FakeGmailApp
               .getUserLabelByName(EmailChecker.FAILED_LABEL_NAME)!.getThreads()
               .length)
          .toBe(expectedCounts.failed);
    }
  }

  private getDefaultPaymentAmount(
      config: ConfigParams, paymentAmount: 'defaultAmount'|number = undefined) {
    let amount = 100;
    if (paymentAmount === 'defaultAmount') {
      amount = config.rentConfig?.monthlyAmount ||
          config.loanConfig?.defaultPayment || amount;
    } else if (typeof paymentAmount === 'number') {
      amount = paymentAmount;
    }
    return Util.formatMoney(amount, true /* forceCents */);
  }

  private createZelleMessage(
      config: ConfigParams,
      paymentAmount?: 'defaultAmount'|number): JASLib.GmailMessageParams {
    const amount = this.getDefaultPaymentAmount(config, paymentAmount);
    return {
      subject: 'We deposited your Zelle payment',
      from: 'email@transfers.ally.com',
      plainBody: `We have successfully deposited the ${amount} ` +
          `Zelle® payment from ${config.searchQuery.searchName}`,
    };
  }

  private createVenmoMessage(
      config: ConfigParams,
      paymentAmount?: 'defaultAmount'|number): JASLib.GmailMessageParams {
    const amount = this.getDefaultPaymentAmount(config, paymentAmount);
    return {
      subject: `${config.searchQuery.searchName} paid you ${amount}`,
      from: 'venmo@venmo.com',
    };
  }

  private addCounterBasedIds(threadMessages: JASLib.GmailMessageParams[][]):
      JASLib.GmailThreadParams[] {
    return threadMessages.map(
        (messages, t) => ({
          id: `t${t}`,
          messages:
              messages.map((message, m) => ({...message, id: `t${t}-m${m}`}))
        }));
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
            .map(c => this.createZelleMessage(c));
    const VENMO_MESSAGES =
        SHEET_CONFIGS.filter(c => c.searchQuery.paymentTypes.includes('Venmo'))
            .map(c => this.createVenmoMessage(c));
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
                threads: this.addCounterBasedIds(threadMessages),
              },
              {name: EmailChecker.DONE_LABEL_NAME},
              {name: EmailChecker.DONE_AUTO_LABEL_NAME},
              {name: EmailChecker.FAILED_LABEL_NAME},
              ...extraLabels.map(name => ({name}))
            ],
          });
        };

    t.beforeAll(() => {
      t.spyOn(GmailApp, 'getUserLabelByName')
          .and.callFake(JASLib.FakeGmailApp.getUserLabelByName);
      t.spyOn(GmailApp, 'search').and.callFake(JASLib.FakeGmailApp.search);
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

      // Set at least empty data for all tests.
      setDataWithPendingMessages([]);
    });

    t.xdescribe('checkEmails for all sheets', () => {
      t.xit('throws for invalid pending email', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[INVALID_MESSAGE]]);

        t.expect(() => EmailChecker.checkEmails('allSheets'))
            .toThrow('Failed to parse labeled threads');
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 0, failed: 1});
      });

      t.xit('does not throw for valid pending email', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);

        t.expect(() => EmailChecker.checkEmails('allSheets')).not.toThrow();
        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('processes multiple valid emails in multiple threads', () => {
        setDataWithPendingMessages([
          ZELLE_MESSAGES,  // Thread 1
          VENMO_MESSAGES,  // Thread 2
        ]);
        EmailChecker.checkEmails('allSheets');

        const messageCount = ZELLE_MESSAGES.length + VENMO_MESSAGES.length;
        t.expect(EmailSender.sendPaymentThanks)
            .toHaveBeenCalledTimes(messageCount);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(messageCount);
        this.expectLabelCounts(t, {pending: 0, done: 2, failed: 0});
      });

      t.xit('processes message only once', () => {
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);
        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('processes later messages in thread', () => {
        setDataWithPendingMessages([[ZELLE_MESSAGES[0]]]);
        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        setDataWithPendingMessages([[ZELLE_MESSAGES[0], ZELLE_MESSAGES[1]]]);
        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        setDataWithPendingMessages(
            [[ZELLE_MESSAGES[0], ZELLE_MESSAGES[1], ZELLE_MESSAGES[0]]]);
        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(3);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(3);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('removes old messages from storage', () => {
        let currentTime = 1000;
        t.spyOn(Date, 'now').and.callFake(() => currentTime);

        setDataWithPendingMessages([[{...ZELLE_MESSAGE, date: new Date(999)}]]);

        EmailChecker.checkEmails('allSheets');
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(1);

        currentTime += 1000;
        EmailChecker.checkEmails('allSheets');
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(1);

        currentTime += EmailChecker.TEST_ONLY.STORAGE_MESSAGE_TTL_MS + 1;
        EmailChecker.checkEmails('allSheets');
        t.expect(EmailChecker.TEST_ONLY.readParsedMessages().length).toBe(0);
      });
    });

    t.xdescribe('checkEmails for current sheet', () => {
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
        t.xit(`processes ${type} email`, () => {
          this.setConfigWithPaymentTypes(t, type);
          setDataWithPendingMessages([[message]]);
          EmailChecker.checkEmails('currentSheet');

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
        });
      }

      for (const {type, message, otherType} of paymentTypeSpecs) {
        t.xit(`ignores ${type} email in ${otherType} config`, () => {
          this.setConfigWithPaymentTypes(t, otherType);
          setDataWithPendingMessages([[message]]);
          EmailChecker.checkEmails('currentSheet');

          t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
          this.expectLabelCounts(t, {pending: 1, done: 0, failed: 0});
        });
      }

      t.xit('processes payments with commas', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle');
        setDataWithPendingMessages(
            [[this.createZelleMessage(Config.get(), 1500)]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('processes two valid emails in one thread', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[VENMO_MESSAGE, VENMO_MESSAGE]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('processes valid emails in two threads', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
        setDataWithPendingMessages([[VENMO_MESSAGE], [ZELLE_MESSAGE]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(t, {pending: 0, done: 2, failed: 0});
      });

      t.xit('processes message only once', () => {
        this.setConfigWithPaymentTypes(t, 'Zelle');
        setDataWithPendingMessages([[ZELLE_MESSAGE]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('checks config for required label', () => {
        const secondLabel = 'Second Label';
        t.setConfig(Config.getLoanConfigForTest(undefined, {
          searchQuery: {
            paymentTypes: ['Venmo'],
            labelName: secondLabel,
          },
        }));

        // When the message has Pending label but not the second label.
        setDataWithPendingMessages([[VENMO_MESSAGE]]);
        EmailChecker.checkEmails('currentSheet');

        // Expect the message not to get parsed.
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 1, done: 0, failed: 0});

        // When the message has both labels.
        setDataWithPendingMessages([[VENMO_MESSAGE]], [secondLabel]);
        JASLib.FakeGmailApp.getUserLabelByName(EmailChecker.PENDING_LABEL_NAME)
            .getThreads()[0]!.addLabel(
                JASLib.FakeGmailApp.getUserLabelByName(secondLabel));
        EmailChecker.checkEmails('currentSheet');

        // Expect the message to get parsed.
        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});
      });

      t.xit('does not crash for config without search types', () => {
        t.setConfig(Config.getLoanConfigForTest(undefined, {
          searchQuery: {paymentTypes: []},
        }));

        // Valid messages in two threads.
        setDataWithPendingMessages([[VENMO_MESSAGE], [ZELLE_MESSAGE]]);

        // Expect the call not to throw.
        t.expect(() => EmailChecker.checkEmails('currentSheet')).not.toThrow();

        // Expect nothing to have happened.
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
        this.expectLabelCounts(t, {pending: 2, done: 0, failed: 0});
      });
    });

    t.describe('checkEmails for queried threads', () => {
      /**
       * Like this.setConfigWithPaymentTypes, but uses a rent config instead
       * of a loan config so that there is a default payment.
       */
      function setRentConfigWithPaymentTypes(
          t: Tester, ...paymentTypes: PaymentType[]) {
        t.setConfig(Config.getRentConfigForTest(
            undefined, {searchQuery: {paymentTypes}}));
      }

      t.xit('issues a valid query', () => {
        EmailChecker.checkEmails('currentSheet');

        t.expect(GmailApp.search)
            .toHaveBeenCalledLike(t.matcher((args: unknown[]) => {
              const query = args[0];
              if (typeof query !== 'string') return false;

              const expectedPrefix = `newer_than:1h `;
              if (!query.startsWith(expectedPrefix)) return false;

              const subqueries = query.substr(expectedPrefix.length);
              // Test that open and close parens are equal.
              return (subqueries.match(/\(/g) || []).length ===
                  (subqueries.match(/\)/g) || []).length;
            }));
      });

      type PaymentTypeSpec = {
        messageFactory: typeof EmailCheckerTest.prototype.createZelleMessage,
        type: PaymentType,
      };
      const paymentTypeSpecs: PaymentTypeSpec[] = [
        {type: 'Venmo', messageFactory: this.createVenmoMessage.bind(this)},
        {type: 'Zelle', messageFactory: this.createZelleMessage.bind(this)},
      ];

      for (const {type, messageFactory} of paymentTypeSpecs) {
        t.xit(`processes ${type} email`, () => {
          setRentConfigWithPaymentTypes(t, type);

          const message = messageFactory(Config.get(), 'defaultAmount');

          JASLib.FakeGmailApp.setSearchResults(
              this.addCounterBasedIds([[message]]));

          EmailChecker.checkEmails('currentSheet');

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          this.expectLabelCounts(
              t, {pending: 0, done: 0, doneAuto: 1, failed: 0});
        });
      }

      t.xit(`skips messages that don't match default payment`, () => {
        const monthlyAmount = 500;
        const config = Config.getRentConfigForTest(undefined, {
          rentConfig: {monthlyAmount},
          searchQuery: {paymentTypes: ['Zelle']},
        });
        t.setConfig(config);

        // When a message contains a payment amount different from the monthly
        // amount.
        const message = this.createZelleMessage(config, monthlyAmount - 1);
        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message]]));

        EmailChecker.checkEmails('currentSheet');

        // Expect it not to have gotten parsed.
        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();

        // When a message contains a payment amount equal to the monthly amount.
        const message2 = this.createZelleMessage(config, monthlyAmount);
        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message2]]));

        EmailChecker.checkEmails('currentSheet');

        // Expect it to have gotten parsed.
        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
        this.expectLabelCounts(
            t, {pending: 0, done: 0, doneAuto: 1, failed: 0});
      });

      t.xit(`skips payment messages that don't match client sheets`, () => {
        const config = Config.getRentConfigForTest(undefined, {
          searchQuery: {paymentTypes: ['Zelle']},
        });

        const message = this.createZelleMessage(config, 'defaultAmount');

        config.searchQuery.searchName = 'SomeOtherName';
        t.setConfig(config);

        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message]]));

        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
        t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
      });

      t.xit(`does not double-process labeled threads`, () => {
        const config = Config.getRentConfigForTest(undefined, {
          searchQuery: {paymentTypes: ['Zelle']},
        });
        t.setConfig(config);
        const message = this.createZelleMessage(config, 'defaultAmount');

        setDataWithPendingMessages([[message]]);

        // When search returns the same threads as are labeled.
        t.spyOn(GmailApp, 'search')
            .and.returnValue(
                JASLib.FakeGmailApp
                    .getUserLabelByName(
                        EmailChecker.PENDING_LABEL_NAME)!.getThreads());

        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(
            t, {pending: 0, done: 1, doneAuto: 0, failed: 0});
      });

      t.it('processes later message in thread', () => {
        const config = Config.getRentConfigForTest(undefined, {
          searchQuery: {paymentTypes: ['Zelle']},
        });
        t.setConfig(config);
        const message = this.createZelleMessage(config, 1);

        setDataWithPendingMessages([[message]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(t, {pending: 0, done: 1, failed: 0});

        // See in the previous expectation that no threads are marked pending.
        // When search returns the thread with a new payment message.
        const message2 = this.createZelleMessage(config, 'defaultAmount');
        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message, message2]]));
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        this.expectLabelCounts(
            t, {pending: 0, done: 1, doneAuto: 1, failed: 0});
      });

      t.it('allows later processing of labeled thread', () => {
        const config = Config.getRentConfigForTest(undefined, {
          searchQuery: {paymentTypes: ['Zelle']},
        });
        t.setConfig(config);
        const message = this.createZelleMessage(config, 'defaultAmount');

        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message]]));
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(
            t, {pending: 0, done: 0, doneAuto: 1, failed: 0});

        const message2 = this.createZelleMessage(config, 1);
        setDataWithPendingMessages([[message, message2]]);
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
        // `doneAuto` should be 1, but `setDataWithPendingMessages` clears
        // non-pending threads.
        this.expectLabelCounts(
            t, {pending: 0, done: 1, doneAuto: 0, failed: 0});
      });

      t.it('processes message only once', () => {
        const config = Config.getRentConfigForTest(undefined, {
          searchQuery: {paymentTypes: ['Zelle']},
        });
        t.setConfig(config);
        const message = this.createZelleMessage(config, 'defaultAmount');

        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([[message]]));
        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(
            t, {pending: 0, done: 0, doneAuto: 1, failed: 0});

        EmailChecker.checkEmails('currentSheet');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(1);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(1);
        this.expectLabelCounts(
            t, {pending: 0, done: 0, doneAuto: 1, failed: 0});
      });

      t.it('processes messages for multiple client sheets', () => {
        const zelleMessages =
            SHEET_CONFIGS
                .filter(c => c.searchQuery.paymentTypes.includes('Zelle'))
                .map(c => this.createZelleMessage(c, 'defaultAmount'));
        const venmoMessages =
            SHEET_CONFIGS
                .filter(c => c.searchQuery.paymentTypes.includes('Venmo'))
                .map(c => this.createVenmoMessage(c, 'defaultAmount'));

        JASLib.FakeGmailApp.setSearchResults(
            this.addCounterBasedIds([zelleMessages, venmoMessages]));

        EmailChecker.checkEmails('allSheets');

        t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(4);
        t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(4);
        this.expectLabelCounts(
            t, {pending: 0, done: 0, doneAuto: 2, failed: 0});
      });
    });
  }
}
