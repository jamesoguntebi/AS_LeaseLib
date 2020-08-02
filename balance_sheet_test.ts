import Config from './config';
import Tester from './testing/tester';
import BalanceSheet, {BalanceRow} from './balance_sheet';
import {JASLib} from 'jas_api';
import {SSLib} from 'ss_api';
import Util from './_util';

type Range = GoogleAppsScript.Spreadsheet.Range;
type RichTextValue = GoogleAppsScript.Spreadsheet.RichTextValue;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type TextStyle = GoogleAppsScript.Spreadsheet.TextStyle;

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

  private withTempBalanceSheet(t: Tester): {sheet?: Sheet} {
    const spreadsheet = SSLib.JasSpreadsheet.getSpreadsheet(
      _JasLibContext.spreadsheetId
    );
    let originalBalanceSheet: Sheet;
    let obj: {sheet?: Sheet} = {}; // To enable pass-by-reference.

    t.beforeAll(() => {
      originalBalanceSheet = SSLib.JasSpreadsheet.findSheet(
        'balance',
        _JasLibContext.spreadsheetId
      );
      // This name should not match query 'balance':
      originalBalanceSheet.setName('__test_backup__');
    });

    t.beforeEach(() => {
      spreadsheet.setActiveSheet(originalBalanceSheet);
      obj.sheet = spreadsheet.duplicateActiveSheet();
      obj.sheet.setName('Balance');
    });

    t.afterEach(() => {
      spreadsheet.deleteSheet(obj.sheet);
    });

    t.afterAll(() => {
      originalBalanceSheet.setName('Balance');
    });

    return obj;
  }

  private deleteAllDataRows(sheet: Sheet) {
    // It is illegal to delete all unfrozen rows, so insert a blank row at
    // the end before doing so.
    sheet.insertRowAfter(sheet.getLastRow());
    sheet.deleteRows(
      sheet.getFrozenRows() + 1,
      sheet.getLastRow() - sheet.getFrozenRows() - 1
    );
  }

  private getDateInThisYear(month: number, dayOfMonth: number): Date {
    return new Date(new Date().getFullYear(), month, dayOfMonth);
  }

  run(t: Tester) {
    // This should be in [1, 27] so that we can add 1 and still be in [1, 28].
    const configTransactionDayOfMonth = 5;

    const baseConfigSpecs = [
      {
        configType: 'rent config',
        config: Config.getRentConfigForTest({
          rentConfig: {
            dueDayOfMonth: configTransactionDayOfMonth,
            monthlyAmount: 873,
          },
        }),
      },
      {
        configType: 'loan config',
        config: Config.getLoanConfigForTest({
          loanConfig: {
            interestDayOfMonth: configTransactionDayOfMonth,
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
        for (const isTransactionDay of [true, false]) {
          const dateString = isTransactionDay
            ? `on transaction day`
            : `not on transaction day`;
          const {
            configType,
            config,
            expectedDecription,
            expectedTransaction,
          } = typeObj;

          t.describe(`for ${configType} ${dateString}`, () => {
            t.beforeEach(() => {
              t.setConfig(config);
              t.spyOn(Date.prototype, 'getDate').and.returnValue(
                configTransactionDayOfMonth + (isTransactionDay ? 0 : 1)
              );
            });

            const testString =
              `${isTransactionDay ? 'inserts' : 'does not insert'} a row ` +
              `on transaction day`;
            t.it(testString, () => {
              BalanceSheet.maybeAddRentOrInterestTransaction();
              if (!isTransactionDay) {
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

    t.describe('insertRow', () => {
      const initialBalance = 500;
      const sheetContainer = this.withTempBalanceSheet(t); // For pass-by-ref.
      let sheet: Sheet;

      t.beforeEach(() => {
        sheet = sheetContainer.sheet;
        const balanceColumn = SSLib.JasSpreadsheet.findColumn('balance', sheet);
        const firstDataRow = sheet.getFrozenRows() + 1;
        sheet.getRange(firstDataRow, balanceColumn).setValue(initialBalance);

        t.expect(BalanceSheet.getBalance()).toEqual(initialBalance);

        t.setConfig(Config.getLoanConfigForTest());
        t.spyOn(BalanceSheet, 'updateStatusCell');
      });

      const expectNewRowValues = (
        transaction: number,
        balance: number,
        description: string
      ) => {
        const checkSpecs = [
          {colName: 'transaction', expectedValue: transaction},
          {colName: 'balance', expectedValue: balance},
          {colName: 'description', expectedValue: description},
        ];
        const dataRow = sheet.getFrozenRows() + 1;
        for (const {colName, expectedValue} of checkSpecs) {
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
        t.expect(BalanceSheet.updateStatusCell).toHaveBeenCalled();
      });

      t.it('decreases rent', () => {
        BalanceSheet.insertRow({
          date: new Date(),
          transaction: 450,
          description: 'Rent payment',
        });

        expectNewRowValues(450, 50, 'Rent payment');
        t.expect(BalanceSheet.updateStatusCell).toHaveBeenCalled();
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
        t.expect(BalanceSheet.updateStatusCell).toHaveBeenCalled();
      });
    });

    t.describe('validateActiveSheet', () => {
      const sheetContainer = this.withTempBalanceSheet(t); // For pass-by-ref.
      let sheet: Sheet;
      t.beforeEach(() => (sheet = sheetContainer.sheet));

      t.it('accepts untampered template spreadsheet', () => {
        t.expect(() => BalanceSheet.validateActiveSheet()).not.toThrow();
      });

      t.it('throws for no data row', () => {
        this.deleteAllDataRows(sheet);
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
            SSLib.JasSpreadsheet.findColumn('transaction', sheet)
          );
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing balance', () => {
          sheet.deleteColumn(SSLib.JasSpreadsheet.findColumn('balance', sheet));
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing description', () => {
          sheet.deleteColumn(
            SSLib.JasSpreadsheet.findColumn('description', sheet)
          );
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow();
        });

        t.it('throws for missing status cell', () => {
          sheet.deleteRow(1);
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow(
            'Expected 2 frozen rows'
          );
        });

        t.it('throws for malformed status cell row', () => {
          sheet.getRange(1, 1, 1, sheet.getLastColumn()).breakApart();
          t.expect(() => BalanceSheet.validateActiveSheet()).toThrow(
            'Expected 1st row in balance sheet to be one merged range.'
          );
        });
      });
    });

    t.describe('updateStatusCell', () => {
      const sheetContainer = this.withTempBalanceSheet(t); // For pass-by-ref.
      let sheet: Sheet;
      let statusCell: Range;

      t.beforeEach(() => {
        sheet = sheetContainer.sheet;
        statusCell = sheet.getRange(1, 1);
      });

      const BLACK = '#000000';

      /**
       * Looks for the line with the at the given index or containing the given
       * substring and returns its text and contained styled runs.
       * @param line 0-indexed line or substring to look for.
       */
      const getLineInStatusCell = (
        substring: string
      ): {text: string; styledRuns: RichTextValue[]} | null => {
        const rtv = statusCell.getRichTextValue();
        const lines = rtv.getText().split('\n');
        let lineText: string;
        let startIndex = 0;

        // Return null if line string is not present.
        substring = substring.toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(substring)) {
            lineText = lines[i];
            break;
          }
          startIndex += lines[i].length + 1;
        }
        // No line number was found.
        if (!lineText) return null;

        const endIndex = startIndex + lineText.length;
        const styledRuns = rtv.getRuns().filter((run) => {
          const ts = run.getTextStyle();
          return (
            run.getStartIndex() >= startIndex &&
            run.getEndIndex() <= endIndex &&
            (ts.isBold() ||
              ts.getForegroundColor() !== BLACK ||
              ts.isItalic() ||
              ts.isUnderline() ||
              ts.isStrikethrough())
          );
        });
        return {text: lineText, styledRuns};
      };

      const deleteAllPaymentRows = () => {
        const transactionColumn = SSLib.JasSpreadsheet.findColumn(
          'transaction',
          sheet
        );
        const firstDataRow = sheet.getFrozenRows() + 1;
        const lastRow = sheet.getLastRow();
        for (let row = lastRow; row >= firstDataRow; row--) {
          const cell = sheet.getRange(row, transactionColumn);
          if (new SSLib.CellData(cell).number(0) > 0) {
            sheet.deleteRow(row);
          }
        }
      };

      t.it('validatesSheet', () => {
        sheet.deleteRow(1);
        t.expect(() => BalanceSheet.validateActiveSheet()).toThrow(
          'Expected 2 frozen rows'
        );
      });

      t.describe('balance line', () => {
        const getBalanceStyle = (): TextStyle => {
          const {text, styledRuns} = getLineInStatusCell('balance');
          t.expect(text).toContain('Balance');
          t.expect(styledRuns.length).toEqual(1);
          return styledRuns[0].getTextStyle();
        };

        t.it('has correct text with bolded balance', () => {
          t.setConfig(Config.getLoanConfigForTest());
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(1000);
          BalanceSheet.updateStatusCell();

          const {text, styledRuns} = getLineInStatusCell('balance');
          t.expect(text).toEqual('Balance: $1,000');
          t.expect(styledRuns[0].getText()).toEqual('$1,000');
        });

        t.it('never styles loan config balance', () => {
          t.setConfig(Config.getLoanConfigForTest());

          // Positive balance.
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(1000);
          BalanceSheet.updateStatusCell();
          t.expect(getBalanceStyle().getForegroundColor()).toEqual(BLACK);

          // Negative balance.
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(-1000);
          BalanceSheet.updateStatusCell();
          t.expect(getBalanceStyle().getForegroundColor()).toEqual(BLACK);
        });

        t.it('styles positive rent balance red', () => {
          t.setConfig(Config.getRentConfigForTest());
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(500);
          
          BalanceSheet.updateStatusCell();
          t.expect(getBalanceStyle().getForegroundColor()).toEqual(
            Colors.RED_BALANCE
          );
        });

        t.it('styles negative rent balance green', () => {
          t.setConfig(Config.getRentConfigForTest());
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(-500);
          
          BalanceSheet.updateStatusCell();
          t.expect(getBalanceStyle().getForegroundColor()).toEqual(
            Colors.GREEN_BALANCE
          );
        });
      });

      t.describe('last payment line', () => {
        /** @param payments Most-recent-first payment amounts. */
        const addFakePaymentHistory = (payments: number[]) => {
          deleteAllPaymentRows();

          // Add a row for each payment. Jun 17, May 17, ...
          const description = 'Test payment';
          for (let i = payments.length - 1; i >= 0; i--) {
            const date = this.getDateInThisYear(5 - i, 17);
            const transaction = payments[i];
            BalanceSheet.insertRow({date, description, transaction});
          }
        };

        t.it(`doesn't exist when there is no payment`, () => {
          t.setConfig(Config.getLoanConfigForTest());
          this.deleteAllDataRows(sheet);
          BalanceSheet.updateStatusCell();

          t.expect(getLineInStatusCell('last payment')).toEqual(null);
          t.expect(statusCell.getRichTextValue().getText()).not.toContain(
            'Last payment'
          );
        });

        t.it(
          'has correct text, with bold payment amount, choosing most recent payment',
          () => {
            t.setConfig(Config.getLoanConfigForTest());
            addFakePaymentHistory([500, 600]);
            BalanceSheet.updateStatusCell();

            const {text, styledRuns} = getLineInStatusCell('last payment');
            t.expect(text).toEqual('Last payment: $500, on Jun 17');
            t.expect(styledRuns[0].getText()).toEqual('$500');
          }
        );
      });

      t.describe('upcoming transaction line', () => {
        t.it(`doesn't exist for 0-interest loans`, () => {
          t.setConfig(
            Config.getLoanConfigForTest(undefined, {
              loanConfig: {interestRate: 0},
            })
          );
          BalanceSheet.updateStatusCell();

          t.expect(getLineInStatusCell('upcoming')).toEqual(null);
          t.expect(statusCell.getRichTextValue().getText()).not.toContain(
            'Upcoming'
          );
        });

        t.it('works for loan config', () => {
          const interestRate = 0.078;
          const balance = 3874.17;
          t.setConfig(
            Config.getLoanConfigForTest(undefined, {loanConfig: {interestRate}})
          );
          t.spyOn(BalanceSheet, 'getBalance').and.returnValue(balance);
          t.spyOn(Util, 'getNextDayOfMonth').and.returnValue(
            this.getDateInThisYear(3, 27)
          );
          BalanceSheet.updateStatusCell();

          const nextInterestAmount = balance * interestRate / 12;
          const {text, styledRuns} = getLineInStatusCell('upcoming');
          t.expect(text).toEqual(
            `Upcoming: $${nextInterestAmount.toFixed(
              2
            )} interest to be applied on Apr 27`
          );
          t.expect(styledRuns[0].getText()).toEqual(
            `$${nextInterestAmount.toFixed(2)}`
          );
        });

        t.it('works for rent config', () => {
          const monthlyAmount = 1671;
          t.setConfig(
            Config.getRentConfigForTest(undefined, {
              rentConfig: {monthlyAmount},
            })
          );
          t.spyOn(Util, 'getNextDayOfMonth').and.returnValue(
            this.getDateInThisYear(9, 3)
          );
          BalanceSheet.updateStatusCell();

          const {text, styledRuns} = getLineInStatusCell('upcoming');
          t.expect(text).toEqual(`Upcoming: $1,671 due on Oct 03`);
          t.expect(styledRuns[0].getText()).toEqual(`$1,671`);
        });
      });
      
      t.it('sets font size', () => {
        t.setConfig(Config.DEFAULT);
        BalanceSheet.updateStatusCell();
        t.expect(statusCell.getFontSize()).toEqual(12);
      });

      t.describe('sets row height', () => {
        t.it('for balance only', () => {
          // Zero-interest loan
          t.setConfig(
            Config.getLoanConfigForTest(undefined, {
              loanConfig: {interestRate: 0},
            })
          );
          // With no previous payments
          deleteAllPaymentRows();
          BalanceSheet.updateStatusCell();

          t.expect(sheet.getRowHeight(1)).toEqual(37);
        });

        t.it('for 2 rows', () => {
          t.setConfig(Config.DEFAULT);
          // With no previous payments
          deleteAllPaymentRows();
          BalanceSheet.updateStatusCell();

          t.expect(sheet.getRowHeight(1)).toEqual(58);
        });

        t.it('for 3 rows', () => {
          t.setConfig(Config.DEFAULT);
          // Ensure at least 1 payment exists.
          BalanceSheet.addPayment(178, new Date());
          BalanceSheet.updateStatusCell();

          t.expect(sheet.getRowHeight(1)).toEqual(79);
        });
      });
    });
  }
}
