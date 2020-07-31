import Tester from "./testing/tester";
import EmailSender from "./email_sender";
import Config from "./config";
import BalanceSheet from "./balance_sheet";
import { JASLib } from "jas_api"

type SendEmailParameters = Parameters<typeof GmailApp.sendEmail>;

export default class EmailSenderTest implements JASLib.Test {
  readonly name: string = 'EmailSenderTest';

  private expectSendMailToHaveBeenCalledLike(
      t: Tester, matcher: (params: SendEmailParameters) => boolean) {
    t.expect(GmailApp.sendEmail).toHaveBeenCalledLike(
      t.matcher((args: unknown[]) => matcher(args as SendEmailParameters)));
  }

  private expectSentMailToContain(
      t: Tester, contents: string|string[], htmlOnly: boolean = false) {
    this.expectSendMailToHaveBeenCalledLike(
        t, (params: SendEmailParameters) => {
          if (!Array.isArray(contents)) contents = [contents];
          for (const content of contents) {
            if (!htmlOnly) t.expect(params[2]).toContain(content);
            t.expect(params[3].htmlBody).toContain(content);
          }
          return true;
        });
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

      const balanceSpecs = [
        {balance: 100, type: 'positive'},
        {balance: 0, type: 'no'},
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
                const expectGreen = configType === 'rent' && balance < 0;
                const testName = expectRed ? `shows balance in red` :
                    expectGreen ? `shows balance in green` :
                    `shows balance in black`;
                t.it(testName, () => {
                  EmailSender.sendPaymentThanks(1);
          
                  this.expectSendMailToHaveBeenCalledLike(
                      t, (params: SendEmailParameters) => {
                        const expectation = t.expect(params[3].htmlBody);
                        if (expectRed) {
                          expectation.toContain(Colors.RED_BALANCE);
                          expectation.not.toContain(Colors.GREEN_BALANCE);
                        } else if (expectGreen) {
                          expectation.toContain(Colors.GREEN_BALANCE);
                          expectation.not.toContain(Colors.RED_BALANCE);
                        } else {
                          expectation.not.toContain(Colors.RED_BALANCE);
                          expectation.not.toContain(Colors.GREEN_BALANCE);
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
            this.expectSentMailToContain(t, 'See balance sheet');
          });

          t.it('falls back to href for display text', () => {
            t.setConfig(
                Config.getLoanConfigForTest({linkToSheetText: undefined}));
            EmailSender.sendPaymentThanks(1);
            const href = Config.get().linkToSheetHref;
              
            this.expectSentMailToContain(t,
                ['See balance sheet', `${href}    </a>`], true /* htmlOnly */);
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