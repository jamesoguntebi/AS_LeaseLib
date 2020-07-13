import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";

type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;

export default class EmailCheckerTest implements Test {
  readonly name = 'EmailCheckerTest';

  run(t: Tester) {
    let gmailAppGetUserLabelByName: (string) => GmailLabel;

    t.beforeEach(() => {
      gmailAppGetUserLabelByName = GmailApp.getUserLabelByName;

    });

    t.describe('checkedLabeledEmails', () => {

    });
  }
}