import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import EmailSender from "./email_sender";
import Config from "./config";
import BalanceSheet from "./balance_sheet";

type SendEmailParameters = Parameters<typeof GmailApp.sendEmail>;

export default class EmailSenderTest implements Test{
  readonly name: string = 'EmailSenderTest';

  private assertWithSendEmailParams(
      t: Tester, matcher: (params: SendEmailParameters) => boolean) {
    t.expect(GmailApp.sendEmail).toHaveBeenCalledLike(
      t.matcher((args: unknown[]) => matcher(args as SendEmailParameters)));
  }

  run(t: Tester) {
    t.beforeEach(() => {
      t.setConfig(Config.getLoanConfigForTest());
      t.spyOn(GmailApp, 'sendEmail');
    });

    t.describe('paymentThanksEmail', () => {
      t.beforeEach(() => {
        t.spyOn(BalanceSheet, 'getBalance').and.returnValue(100);
      });

      t.it('formats large numbers with comma', () => {
        EmailSender.sendPaymentThanks(1500);

        this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
          t.expect(params[2]).toContain('1,500');
          t.expect(params[3].htmlBody).toContain('1,500');
          return true;
        });
      });

      const RED_BALANCE_STRING = 'style="color: #b34;"';

      t.describe('with positive balance', () => {
        t.beforeEach(() => {
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(100);
        });

        t.describe('with loan config', () => {
          t.beforeEach(() => {
            t.setConfig(Config.getLoanConfigForTest());
          });

          t.it('does not show balance in red', () => {
            EmailSender.sendPaymentThanks(1);
    
            this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
              t.expect(params[3].htmlBody).toNotContain(RED_BALANCE_STRING);
              return true;
            });
          });
        });

        t.describe('with rent config', () => {
          t.beforeEach(() => {
            t.setConfig(Config.getRentConfigForTest());
          });

          t.it('shows balance in red', () => {
            EmailSender.sendPaymentThanks(1);
    
            this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
              t.expect(params[3].htmlBody).toContain(RED_BALANCE_STRING);
              return true;
            });
          });
        });
      });

      t.describe('negative balance', () => {
        t.beforeEach(() => {
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(-100);
        });

        t.describe('with loan config', () => {
          t.beforeEach(() => {
            t.setConfig(Config.getLoanConfigForTest());
          });

          t.it('does not show balance in red', () => {
            EmailSender.sendPaymentThanks(1);
    
            this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
              t.expect(params[3].htmlBody).toNotContain(RED_BALANCE_STRING);
              return true;
            });
          });
        });

        t.describe('with rent config', () => {
          t.beforeEach(() => {
            t.setConfig(Config.getRentConfigForTest());
          });

          t.it('does not show balance in red', () => {
            EmailSender.sendPaymentThanks(1);
    
            this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
              t.expect(params[3].htmlBody).toNotContain(RED_BALANCE_STRING);
              return true;
            });
          });
        });
      });

      t.describe('for config fields', () => {
        t.beforeEach(() => {
          t.setConfig(Config.DEFAULT);
        });

        t.it('uses them', () => {
          EmailSender.sendPaymentThanks(1);
          
          this.assertWithSendEmailParams(t, (params: SendEmailParameters) => {
            t.expect(params[0]).toEqual(
                Config.DEFAULT.customerEmails.join(', '));
            t.expect(params[3].cc).toEqual(
                Config.DEFAULT.emailCCs.join(', '));
            t.expect(params[3].bcc).toEqual(
                Config.DEFAULT.emailBCCs.join(', '));
            t.expect(params[3].name).toEqual(Config.DEFAULT.emailDisplayName);
            return true;
          });
        });
      });
    });
  }
}