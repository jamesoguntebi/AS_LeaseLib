import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import EmailSender from "./email_sender";

export default class EmailSenderTest implements Test{
  readonly name: string = 'EmailSenderTest';

  run(t: Tester) {
    t.beforeEach(() => {
      t.spyOn(GmailApp, 'sendEmail');
    });

    t.describe('paymentThanksEmail', () => {
      t.it('formats large numbers with comma', () => {
        const {nonHtmlBody, htmlBody} =
            EmailSender.getPaymentThanksParams(1500);
        t.expect(nonHtmlBody).toContain('1,500');
        t.expect(htmlBody).toContain('1,500');
      });
    });
  }
}