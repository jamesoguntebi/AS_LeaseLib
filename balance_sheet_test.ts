import Config, { ConfigParams } from "./config";
import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import BalanceSheet, { BalanceRow } from "./balance_sheet";

export default class BalanceSheetTest implements Test {
  readonly name = 'BalanceSheetTest';

  run(t: Tester) {
    t.describe('maybeAddRentOrInterestTransaction', () => {
      t.beforeEach(() => {
        t.spyOn(BalanceSheet, 'insertRow');
      });

      const configTypes = {
        'rent config': {
          config: Config.getRentConfigForTest({
            rentConfig: {
              dueDayOfMonth: new Date().getDate(),
              monthlyAmount: 873,
            },
          }),
          expectedDecription: 'Rent due',
          expectedTransaction: -873,
        },
        'loan config': {
          config: Config.getLoanConfigForTest({
            loanConfig: {
              interestDayOfMonth: new Date().getDate(),
              interestRate: 0.06,
            },
          }),
          expectedDecription: 'Monthly interest',
          expectedTransaction: 'interest',
        }
      };

      for (const configType in configTypes) {
        t.describe(`for ${configType}`, () => {
          const {config, expectedDecription, expectedTransaction} =
              configTypes[configType];
          t.beforeEach(() => t.setConfig(config));
  
          t.it('inserts a row on due day', () => {
            BalanceSheet.maybeAddRentOrInterestTransaction();
            t.expect(BalanceSheet.insertRow).toHaveBeenCalledLike(t.matcher(
                (args: unknown[]) => {
                  const rowArgs = args[0] as BalanceRow;
                  t.expect(rowArgs.description).toEqual(expectedDecription);
                  t.expect(rowArgs.transaction).toEqual(expectedTransaction);
                  return true;
                }));
          });
        });
      }
    });
  }
}