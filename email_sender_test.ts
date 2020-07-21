import { Test } from "./testing/testrunner";
import Tester from "./testing/tester";
import EmailSender from "./email_sender";
import Config from "./config";
import BalanceSheet from "./balance_sheet";

type SendEmailParameters = Parameters<typeof GmailApp.sendEmail>;

export default class EmailSenderTest implements Test{
  readonly name: string = 'EmailSenderTest';

  private expectSendMailToHaveBeenCalledLike(
      t: Tester, matcher: (params: SendEmailParameters) => boolean) {
    t.expect(GmailApp.sendEmail).toHaveBeenCalledLike(
      t.matcher((args: unknown[]) => matcher(args as SendEmailParameters)));
  }

  run(t: Tester) {
    t.beforeAll(() => {
      t.setConfig(Config.getLoanConfigForTest());
      t.spyOn(GmailApp, 'sendEmail');
    });

    t.describe('paymentThanksEmail', () => {
      t.beforeAll(() => {
        t.spyOn(BalanceSheet, 'getBalance').and.returnValue(100);
      });

      t.it('formats large numbers with comma', () => {
        EmailSender.sendPaymentThanks(1500);

        this.expectSendMailToHaveBeenCalledLike(
            t, (params: SendEmailParameters) => {
              t.expect(params[2]).toContain('1,500');
              t.expect(params[3].htmlBody).toContain('1,500');
              return true;
            });
      });

      const RED_BALANCE_STRING = 'style="color: #b34;"';

      const balanceSpecs = [
        {balance: 100, type: 'positive'},
        {balance: -100, type: 'negative'},
      ];
      const configSepcs = [
        {type: 'rent', config: Config.getRentConfigForTest()},
        {type: 'loan', config: Config.getLoanConfigForTest()},
      ];

      for (const {type: balanceType, balance} of balanceSpecs) {
        for (const {type: configType, config} of configSepcs) {
          t.describe(`when showing ${balanceType} balance for ${configType}`,
              () => {
                t.beforeAll(() => {
                  t.setConfig(config);
                  t.spyOn(BalanceSheet, 'getBalance').and.returnValue(balance);
                });
                
                const expectRed = configType === 'rent' && balance > 0;
                const testName = expectRed ?
                    `shows balance in red` : `does not show balance in red`;
                t.it(testName, () => {
                  EmailSender.sendPaymentThanks(1);
          
                  this.expectSendMailToHaveBeenCalledLike(
                      t, (params: SendEmailParameters) => {
                        const expectation = t.expect(params[3].htmlBody);
                        if (expectRed) {
                          expectation.toContain(RED_BALANCE_STRING);
                        } else {
                          expectation.not.toContain(RED_BALANCE_STRING);
                        }
                        return true;
                      });
                });
              });
        }
      }

      t.describe('for config fields', () => {
        t.beforeAll(() => t.setConfig(Config.DEFAULT));

        t.it('uses them', () => {
          EmailSender.sendPaymentThanks(1);
          
          this.expectSendMailToHaveBeenCalledLike(
              t, (params: SendEmailParameters) => {
                t.expect(params[0]).toEqual(
                    Config.DEFAULT.customerEmails.join(', '));
                t.expect(params[3].cc).toEqual(
                    Config.DEFAULT.emailCCs.join(', '));
                t.expect(params[3].bcc).toEqual(
                    Config.DEFAULT.emailBCCs.join(', '));
                t.expect(params[3].name).toEqual(
                    Config.DEFAULT.emailDisplayName);
                return true;
              });
        });

        t.describe('link to balance sheet', () => {
          t.it('shows when link config is present', () => {
            t.setConfig(Config.DEFAULT);
            EmailSender.sendPaymentThanks(1);
              
            this.expectSendMailToHaveBeenCalledLike(
                t, (params: SendEmailParameters) => {
                  t.expect(params[3].htmlBody).toContain('See balance sheet');
                  return true;
                });
          });

          t.it('falls back to href for display text', () => {
            t.setConfig(
                Config.getLoanConfigForTest({linkToSheetText: undefined}));
            EmailSender.sendPaymentThanks(1);
            const href = Config.get().linkToSheetHref;
              
            this.expectSendMailToHaveBeenCalledLike(
                t, (params: SendEmailParameters) => {
                  const {htmlBody} = params[3];
                  t.expect(htmlBody).toContain('See balance sheet');
                  t.expect(htmlBody).toContain(`${href}    </a>`);
                  return true;
                });
            // Enable spyOn within it()
            // - new ItContext
            // - simplify a bunch of tests to remove wrapping describe()
          });

          t.it('hides when link config is not present', () => {
            t.setConfig(Config.getLoanConfigForTest({
              linkToSheetHref: undefined, 
              linkToSheetText: undefined,
            }));
            EmailSender.sendPaymentThanks(1);
              
            this.expectSendMailToHaveBeenCalledLike(
                t, (params: SendEmailParameters) => {
                  const {htmlBody} = params[3];
                  t.expect(htmlBody).not.toContain('See balance sheet');
                  return true;
                });
          });
        });
      });
    });
  }
}