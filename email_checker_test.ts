import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import EmailChecker from "./email_checker";
import { FakeGmailApp } from "./testing/fakes";

export default class EmailCheckerTest implements Test {
  readonly name = 'EmailCheckerTest';

  run(t: Tester) {
    let gmailAppGetUserLabelByName: typeof GmailApp.getUserLabelByName;

    t.beforeEach(() => {
      gmailAppGetUserLabelByName = GmailApp.getUserLabelByName;
      GmailApp.getUserLabelByName = FakeGmailApp.getUserLabelByName;
    });

    t.afterEach(() => {
      GmailApp.getUserLabelByName = gmailAppGetUserLabelByName;
    });

    t.describe('checkedLabeledEmails', () => {
      t.describe('with invalid pending email', () => {
        FakeGmailApp.setData({labels: [
          {
            name: EmailChecker.PENDING_LABEL_NAME,
            threads: [{messages: [{}]}],
          },
          {name: EmailChecker.DONE_LABEL_NAME},
        ]});

        t.it('throws on assertNoPendingThreads', () => {
          // When emails are checked.
          EmailChecker.checkedLabeledEmails();

          t.expect(() => EmailChecker.assertNoPendingThreads())
              .toThrow('Failed to parse labeled threads');
        });
      });
    });
  }
}