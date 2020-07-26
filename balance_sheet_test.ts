import Config from './config';
import Tester from './testing/tester';
import BalanceSheet, { BalanceRow } from './balance_sheet';
import { JASLib } from "jas_api"
import { SSLib } from "ss_api"

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class BalanceSheetTest implements JASLib.Test {
  readonly name = 'BalanceSheetTest';

  private expectInsertRowToHaveBeenCalledLike(
    t: Tester,
    matcher: (params: BalanceRow) => boolean
  ) {
    t.expect(BalanceSheet.insertRow).toHaveBeenCalledLike(
      t.matcher((args: unknown[]) => {
        return matcher((args as Parameters<typeof BalanceSheet.insertRow>)[0]);
      })
    );
  }

  run(t: Tester) {
    const getSpreadsheet = () => {
      return SSLib.JasSpreadsheet.getSpreadsheet(_JasLibContext.spreadsheetId);
    };

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
      },
    ];

    t.describe('maybeAddRentOrInterestTransaction', () => {
      t.beforeAll(() => t.spyOn(BalanceSheet, 'insertRow'));

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
        },
      ];

      for (const typeObj of configSpecs) {
        for (const replaceDate of [true, false]) {
          const dateString = replaceDate
              ? `not on transaction day`
              : `on transaction day`;
          const {
            configType,
            config,
            expectedDecription,
            expectedTransaction,
          } = typeObj;

          t.describe(`for ${configType} ${dateString}`, () => {
            t.beforeEach(() => {
              t.setConfig(config);
              if (replaceDate) {
                // Replace the day of month with some other day.
                const fakeMonthDay = ((new Date().getDate() + 1) % 28) + 1;
                t.spyOn(Date.prototype, 'getDate').and.returnValue(
                  fakeMonthDay
                );
              }
            });

            const testString =
              `${replaceDate ? 'does not insert' : 'inserts'} a row on ` +
              `due day`;
            t.it(testString, () => {
              BalanceSheet.maybeAddRentOrInterestTransaction();
              if (replaceDate) {
                t.expect(BalanceSheet.insertRow).not.toHaveBeenCalled();
              } else {
                this.expectInsertRowToHaveBeenCalledLike(
                  t,
                  (row: BalanceRow) => {
                    t.expect(row.description).toEqual(expectedDecription);
                    t.expect(row.transaction).toEqual(expectedTransaction);
                    return true;
                  }
                );
              }
            });
          });
        }
      }
    });

    t.describe('addPayment', () => {
      t.beforeAll(() => t.spyOn(BalanceSheet, 'insertRow'));

      const configSpecs = [
        {
          ...baseConfigSpecs[0],
          expectedDecription: 'Rent payment',
        },
        {
          ...baseConfigSpecs[1],
          expectedDecription: 'Loan payment',
        },
      ];

      for (const {configType, config, expectedDecription} of configSpecs) {
        t.it(`inserts a row for ${configType}`, () => {
          t.setConfig(config);
          BalanceSheet.addPayment(159, new Date());

          this.expectInsertRowToHaveBeenCalledLike(t, (row: BalanceRow) => {
            t.expect(row.description).toEqual(expectedDecription);
            t.expect(row.transaction).toEqual(159);
            return true;
          });
        });
      }
    });

    /**
     * This test operates on a real sheet. So it is difficult to clean up.
     */
    t.describe('insertRow', () => {
      const spreadsheet = getSpreadsheet();
      let originalBalanceSheet: Sheet;
      let sheet: Sheet;
      const initialBalance = 500;

      t.beforeAll(() => {
        originalBalanceSheet = SSLib.JasSpreadsheet.findSheet(
            'balance', _JasLibContext.spreadsheetId);
        // This name should not match query 'balance':
        originalBalanceSheet.setName('__test_backup__');
      });

      t.beforeEach(() => {
        spreadsheet.setActiveSheet(originalBalanceSheet);
        sheet = spreadsheet.duplicateActiveSheet();
        sheet.setName('Balance');

        const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
        const firstDataRow = sheet.getFrozenRows() + 1;
        sheet.getRange(firstDataRow, balanceColumn).setValue(initialBalance);

        t.expect(BalanceSheet.getBalance()).toEqual(initialBalance);

        t.setConfig(Config.getLoanConfigForTest());
      });

      t.afterEach(() => {
        spreadsheet.deleteSheet(sheet);
      });

      t.afterAll(() => {
        originalBalanceSheet.setName('Balance');
      });

      const expectNewRowValues = (
        transaction: number,
        balance: number,
        description: string
      ) => {
        const checkSpecs = [
          { colName: 'transaction', expectedValue: transaction },
          { colName: 'balance', expectedValue: balance },
          { colName: 'description', expectedValue: description },
        ];
        const dataRow = sheet.getFrozenRows() + 1;
        for (const { colName, expectedValue } of checkSpecs) {
          const column = SSLib.JasSpreadsheet.findColumn(colName, sheet);
          t.expect(sheet.getRange(dataRow, column).getValue()).toEqual(
            expectedValue
          );
        }
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

      t.it('adds interest', () => {
        BalanceSheet.insertRow({
          date: new Date(),
          transaction: 'interest',
          description: 'Interest',
        });

        const expectedInterest =
          (-initialBalance * Config.get().loanConfig!.interestRate) / 12;
        const expectedBalance = initialBalance - expectedInterest;
        expectNewRowValues(expectedInterest, expectedBalance, 'Interest');
      });
    });

    t.describe('validateActiveSheet', () => {
      const spreadsheet = getSpreadsheet();
      let originalBalanceSheet: Sheet;
      let sheet: Sheet;

      t.beforeAll(() => {
        originalBalanceSheet = SSLib.JasSpreadsheet.findSheet(
            'balance', _JasLibContext.spreadsheetId);
        // This name should not match query 'balance':
        originalBalanceSheet.setName('__test_backup__');
      });

      t.beforeEach(() => {
        spreadsheet.setActiveSheet(originalBalanceSheet);
        sheet = spreadsheet.duplicateActiveSheet();
        sheet.setName('Balance');
      });

      t.afterEach(() => {
        spreadsheet.deleteSheet(sheet);
      });

      t.afterAll(() => {
        originalBalanceSheet.setName('Balance');
      });

      t.it('accepts untampered template spreadsheet', () => {
        t.expect(() => BalanceSheet.validateActiveSheet()).not.toThrow();
      });

      t.it('throws for no data row', () => {
        // It is illegal to delete all unfrozen rows, so insert a blank row at
        // the end before doing so.
        sheet.insertRowAfter(sheet.getLastRow());
        sheet.deleteRows(
            sheet.getFrozenRows() + 1,
            sheet.getLastRow() - sheet.getFrozenRows() - 1);
        t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
      });

      t.it('throws for invalid last balance cell', () => {
        const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
        const firstDataRow = sheet.getFrozenRows() + 1;
        sheet.getRange(firstDataRow, balanceColumn).setValue('start balance');
        t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
      });

      t.describe('when checking columns', () => {
        t.it('throws for missing date', () => {
          sheet.deleteColumn(SSLib.JasSpreadsheet.findColumn('date', sheet));
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing transaction', () => {
          sheet.deleteColumn(
              SSLib.JasSpreadsheet.findColumn('transaction', sheet));
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing balance', () => {
          sheet.deleteColumn(SSLib.JasSpreadsheet.findColumn('balance', sheet));
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing description', () => {
          sheet.deleteColumn(
              SSLib.JasSpreadsheet.findColumn('description', sheet));
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });
      });
    });
  }
}
