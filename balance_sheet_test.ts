import Config from "./config";
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

      t.describe('for rent config', () => {
        t.beforeEach(() => {
          t.setConfig(Config.getRentConfigForTest({
            rentConfig: {
              dueDayOfMonth: new Date().getDate(),
              monthlyAmount: 873,
            },
          }));
        });

        t.it('inserts a row on due day', () => {
          BalanceSheet.maybeAddRentOrInterestTransaction();
          t.expect(BalanceSheet.insertRow).toHaveBeenCalledLike(t.matcher(
              (args: unknown[]) => {
                const rowArgs = args[0] as BalanceRow;
                t.expect(rowArgs.description).toEqual('Rent due');
                t.expect(rowArgs.transaction).toEqual(-873);
                return true;
              }));
        });
      });
    });
  }
}