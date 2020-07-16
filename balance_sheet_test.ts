import Config, { ConfigParams } from "./config";
import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import BalanceSheet, { BalanceRow } from "./balance_sheet";

export default class BalanceSheetTest implements Test {
  readonly name = 'BalanceSheetTest';

  private expectInsertRowToHaveBeenCalledLike(
      t: Tester, matcher: (params: BalanceRow) => boolean) {
    t.expect(BalanceSheet.insertRow).toHaveBeenCalledLike(
      t.matcher((args: unknown[]) => {
        return matcher((args as Parameters<typeof BalanceSheet.insertRow>)[0]);
      }));
  }

  run(t: Tester) {
    const baseConfigSpecs = [
      {
        configType: 'rent config',
        config: Config.getRentConfigForTest({
          rentConfig: {
            dueDayOfMonth: new Date().getDate(),
            monthlyAmount: 873,
          },
        }),
      },
      {
        configType: 'loan config',
        config: Config.getLoanConfigForTest({
          loanConfig: {
            interestDayOfMonth: new Date().getDate(),
            interestRate: 0.06,
          },
        }),
      }
    ];

    t.describe('maybeAddRentOrInterestTransaction', () => {
      t.beforeEach(() => t.spyOn(BalanceSheet, 'insertRow'));

      const configSpecs = [
        {
          ...baseConfigSpecs[0],
          expectedDecription: 'Rent due',
          expectedTransaction: -873,
        },
        {
          ...baseConfigSpecs[1],
          expectedDecription: 'Monthly interest',
          expectedTransaction: 'interest' as const,
        }
      ];

      for (const typeObj of configSpecs) {
        for (const replaceDate of [true, false]) {
          const dateString =
              replaceDate ? `not on transaction day` : `on transaction day`;
          const {configType, config, expectedDecription, expectedTransaction} =
              typeObj;

          t.describe(`for ${configType} ${dateString}`, () => {
            t.beforeEach(() => {
              t.setConfig(config);
              if (replaceDate) {
                // Replace the day of month with some other day.
                const fakeMonthDay = (new Date().getDate() + 1) % 28 + 1;
                t.spyOn(Date.prototype, 'getDate').and.returnValue(
                    fakeMonthDay);
              }
            });
    
            const testString =
                `${replaceDate ? 'does not insert' : 'inserts'} a row on ` +
                `due day`;
            t.it(testString, () => {
              BalanceSheet.maybeAddRentOrInterestTransaction();
              if (replaceDate) {
                t.expect(BalanceSheet.insertRow).toNotHaveBeenCalled();
              } else {
                this.expectInsertRowToHaveBeenCalledLike(
                  t, (row: BalanceRow) => {
                    t.expect(row.description).toEqual(expectedDecription);
                    t.expect(row.transaction).toEqual(expectedTransaction);
                    return true;
                  });
              }
            });
          });
        }
      }
    });

    t.describe('addPayment', () => {
      t.beforeEach(() => t.spyOn(BalanceSheet, 'insertRow'));

      const configSpecs = [
        {
          ...baseConfigSpecs[0],
          expectedDecription: 'Rent payment',
        },
        {
          ...baseConfigSpecs[1],
          expectedDecription: 'Loan payment',
        }
      ];

      for (const {configType, config, expectedDecription} of configSpecs) {
        t.describe(`for ${configType}`, () => {
          t.beforeEach(() => t.setConfig(config));
  
          t.it('inserts a row', () => {
            BalanceSheet.addPayment(159, new Date());

            this.expectInsertRowToHaveBeenCalledLike(
              t, (row: BalanceRow) => {
                t.expect(row.description).toEqual(expectedDecription);
                t.expect(row.transaction).toEqual(159);
                return true;
              });
          });
        });
      }
    });
  }
}