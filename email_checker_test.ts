import Tester from "./testing/tester";
import EmailChecker from "./email_checker";
import BalanceSheet from "./balance_sheet";
import EmailSender from "./email_sender";
import Config, { PaymentType } from "./config";
import ClientSheetManager from "./client_sheet_manager";
import { JASLib } from "jas_api"

export default class EmailCheckerTest implements JASLib.Test {
  readonly name = 'EmailCheckerTest';

  private setConfigWithPaymentTypes(t: Tester, ...paymentTypes: PaymentType[]) {
    t.setConfig(Config.getLoanConfigForTest(
        undefined, {searchQuery: {paymentTypes}}));
  }

  run(t: Tester) {
    t.beforeAll(() => {
      t.spyOn(GmailApp, 'getUserLabelByName').and
          .callFake(JASLib.FakeGmailApp.getUserLabelByName);
      t.spyOn(BalanceSheet, 'addPayment');
      t.spyOn(EmailSender, 'sendPaymentThanks');

      // Don't call the function for every registered sheet, only call it once.
      t.spyOn(ClientSheetManager, 'forEach').and.callFake(
          (fn: Function) => fn());
    });

    t.describe('checkLabeledEmailsForAllSheets', () => {
      t.describe('with invalid pending email', () => {
        t.beforeEach(() => {
          this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
          JASLib.FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [{messages: [{}]}],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('throws on assertNoPendingThreads', () => {
          EmailChecker.checkLabeledEmailsForAllSheets();
          t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();

          t.expect(() => EmailChecker.assertNoPendingThreads())
              .toThrow('Failed to parse labeled threads');
        });
      });

      t.describe('with valid Zelle email', () => {
        t.beforeEach(() => {
          this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
          JASLib.FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [
                {messages: [EmailCheckerTest.ZELLE_MESSAGE]},
              ],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('handles the email', () => {
          EmailChecker.checkLabeledEmailsForAllSheets();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          t.expect(() => EmailChecker.assertNoPendingThreads()).not.toThrow();
          t.expect(JASLib.FakeGmailApp.getUserLabelByName(
              EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(1);
        });

        t.describe('with Venmo-only Config', () => {
          t.beforeEach(() => {
            this.setConfigWithPaymentTypes(t, 'Venmo');
          });
  
          t.it('does nothing', () => {
            EmailChecker.checkLabeledEmailsForAllSheets();
  
            t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
            t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
            t.expect(JASLib.FakeGmailApp.getUserLabelByName(
                EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(0);
          });
        });
      });

      t.describe('with valid Venmo email', () => {
        t.beforeEach(() => {
          this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
          JASLib.FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [
                {messages: [EmailCheckerTest.VENMO_MESSAGE]},
              ],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('handles the email', () => {
          EmailChecker.checkLabeledEmailsForAllSheets();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          t.expect(() => EmailChecker.assertNoPendingThreads()).not.toThrow();
          t.expect(JASLib.FakeGmailApp.getUserLabelByName(
              EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(1);
        });

        t.describe('with Zelle-only Config', () => {
          t.beforeEach(() => {
            this.setConfigWithPaymentTypes(t, 'Zelle');
          });
  
          t.it('does nothing', () => {
            EmailChecker.checkLabeledEmailsForAllSheets();
  
            t.expect(EmailSender.sendPaymentThanks).not.toHaveBeenCalled();
            t.expect(BalanceSheet.addPayment).not.toHaveBeenCalled();
            t.expect(JASLib.FakeGmailApp.getUserLabelByName(
                EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(0);
          });
        });
      });

      t.describe('with two valid emails in one thread', () => {
        t.beforeEach(() => {
          this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
          JASLib.FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [
                {
                  messages: [
                    EmailCheckerTest.VENMO_MESSAGE,
                    EmailCheckerTest.VENMO_MESSAGE,
                  ],
                },
              ],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('handles both emails', () => {
          EmailChecker.checkLabeledEmailsForAllSheets();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
          t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
          t.expect(() => EmailChecker.assertNoPendingThreads()).not.toThrow();
          t.expect(JASLib.FakeGmailApp.getUserLabelByName(
              EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(1);
        });
      });

      t.describe('with valid emails in two threads', () => {
        t.beforeEach(() => {
          this.setConfigWithPaymentTypes(t, 'Zelle', 'Venmo');
          JASLib.FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [
                {messages: [EmailCheckerTest.VENMO_MESSAGE]},
                {messages: [EmailCheckerTest.ZELLE_MESSAGE]},
              ],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('handles both emails', () => {
          EmailChecker.checkLabeledEmailsForAllSheets();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalledTimes(2);
          t.expect(BalanceSheet.addPayment).toHaveBeenCalledTimes(2);
          t.expect(() => EmailChecker.assertNoPendingThreads()).not.toThrow();
          t.expect(JASLib.FakeGmailApp.getUserLabelByName(
              EmailChecker.DONE_LABEL_NAME)?.getThreads().length).toEqual(2);
        });
      });
    });
  }

  private static readonly ZELLE_MESSAGE: JASLib.GmailMessageParams = {
    subject: 'We deposited your Zelle payment',
    from: 'email@transfers.ally.com',
    plainBody: 'We have successfully deposited the $100.00 ' + 
        `Zelle® payment from ${Config.DEFAULT.searchQuery.searchName}`,
  }
  private static readonly VENMO_MESSAGE: JASLib.GmailMessageParams = {
    subject: `${Config.DEFAULT.searchQuery.searchName} paid you $100.00`,
    from: 'venmo@venmo.com',
  }
}