import Config from "./config";
import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import BalanceSheet, { BalanceRow } from "./balance_sheet";
import JasSpreadsheet from "./jas_spreadsheet";
import { CellData } from "./jas_range";

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

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

    /**
     * This test operates on a real sheet. So it is difficult to clean up.
     */
    t.describe('insertRow', () => {
      const spreadsheet = JasSpreadsheet.getSpreadsheet();
      let originalBalanceSheet: Sheet;
      let currentBalanceSheet: Sheet;
      const initialBalance = 500;
      
      t.beforeAll(() => {
        originalBalanceSheet = JasSpreadsheet.findSheet('balance');
        // This name should not match query 'balance':
        originalBalanceSheet.setName('__test_backup__');
      });

      t.beforeEach(() => {
        spreadsheet.setActiveSheet(originalBalanceSheet);
        currentBalanceSheet = spreadsheet.duplicateActiveSheet();
        currentBalanceSheet.setName('Balance');
        
        const balanceColumn =
            JasSpreadsheet.findColumn('balance', currentBalanceSheet);
        const firstDataRow = currentBalanceSheet.getFrozenRows() + 1;
        currentBalanceSheet.getRange(firstDataRow, balanceColumn).setValue(
            initialBalance);

        t.expect(BalanceSheet.getBalance()).toEqual(initialBalance);
      });

      t.afterEach(() => {
        spreadsheet.deleteSheet(currentBalanceSheet);
      });

      t.afterAll(() => {
        originalBalanceSheet.setName('Balance');
      });

      const expectNewRowValues = (
        transaction: number | string,
        balance: number,
        description: string
      ) => {
        const columns = [
          JasSpreadsheet.findColumn('transaction', currentBalanceSheet),
          JasSpreadsheet.findColumn('balance', currentBalanceSheet),
          JasSpreadsheet.findColumn('description', currentBalanceSheet),
        ];
        const dataRow = currentBalanceSheet.getFrozenRows() + 1;

        if (typeof transaction === 'number') {
          t.expect(
            new CellData(
              currentBalanceSheet.getRange(dataRow, columns[0])
            ).number()
          ).toEqual(transaction)
        } else {

        }

        t.expect(
          new CellData(
            currentBalanceSheet.getRange(dataRow, columns[1])
          ).number()
        ).toEqual(balance);

        t.expect(
          new CellData(
            currentBalanceSheet.getRange(dataRow, columns[2])
          ).string()
        ).toEqual(description);
      };

      t.it('increases rent', () => {
        BalanceSheet.insertRow({
          date: new Date(),
          transaction: -450,
          description: 'Partial rent due',
        });

        expectNewRowValues(-450, 950, 'Partial rent due');
      });

      t.it('decreases rent', () => {
        BalanceSheet.insertRow({
          date: new Date(),
          transaction: 450,
          description: 'Rent payment',
        });

        expectNewRowValues(450, 50, 'Rent payment');
      });

      // t.it('Adds interest', () => {
      //   BalanceSheet.insertRow({
      //     date: new Date(),
      //     transaction: 'interest',
      //     description: 'Interest due',
      //   });

      //   const expectedInterest = initialBalance * Config.get().lo
      //   expectNewRowValues(450, 50, 'Rent payment');
      // });
    });
  }
}