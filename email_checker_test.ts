import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import EmailChecker from "./email_checker";
import { FakeGmailApp } from "./testing/fakes";
import BalanceSheet from "./balance_sheet";
import EmailSender from "./email_sender";

export default class EmailCheckerTest implements Test {
  readonly name = 'EmailCheckerTest';

  run(t: Tester) {
    t.beforeEach(() => {
      t.spyOn(GmailApp, 'getUserLabelByName').and
          .callFake(FakeGmailApp.getUserLabelByName);
      t.spyOn(BalanceSheet, 'addPayment');
      t.spyOn(EmailSender, 'sendPaymentThanks');
    });

    t.describe('checkedLabeledEmails', () => {
      t.describe('with invalid pending email', () => {
        t.beforeEach(() => {
          FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [{messages: [{}]}],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('throws on assertNoPendingThreads', () => {
          // When emails are checked.
          EmailChecker.checkedLabeledEmails();
          t.expect(EmailSender.sendPaymentThanks).toNotHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toNotHaveBeenCalled();

          t.expect(() => EmailChecker.assertNoPendingThreads())
              .toThrow('Failed to parse labeled threads');
        });
      });

      t.describe('with valid Zelle email', () => {
        t.beforeEach(() => {
          FakeGmailApp.setData({labels: [
            {
              name: EmailChecker.PENDING_LABEL_NAME,
              threads: [
                {
                  messages: [{
                    subject: 'We deposited your Zelle payment',
                    from: 'automation@ally.com',
                    plainBody: 'We have successfully deposited the $100.00 ' + 
                        'Zelle® payment from Firstname',
                  }],
                },
              ],
            },
            {name: EmailChecker.DONE_LABEL_NAME},
          ]});
        });

        t.it('Calls', () => {
          // When emails are checked.
          EmailChecker.checkedLabeledEmails();

          t.expect(EmailSender.sendPaymentThanks).toHaveBeenCalled();
          t.expect(BalanceSheet.addPayment).toHaveBeenCalled();
          t.expect(() => EmailChecker.assertNoPendingThreads()).toNotThrow();
        });
      });
    });
  }
}