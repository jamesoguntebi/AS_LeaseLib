import {JASLib} from 'jas_api'
import {SSLib} from 'ss_api'

import Config, {ConfigField, ConfigParams} from './config';
import Tester from './testing/tester';

type Range = GoogleAppsScript.Spreadsheet.Range;

export default class ConfigTest implements JASLib.Test {
  private storedConfigValues: Map<string, unknown[]> = new Map();

  private readonly configSheet =
      SSLib.JasSpreadsheet.findSheet('config', _JasLibContext.spreadsheetId);
  private readonly valueColumn =
      SSLib.JasSpreadsheet.findColumn('value', this.configSheet);

  private replaceConfigValue(
      t: Tester, configName: string, replaceFn: (r: Range) => void) {
    if (!this.storedConfigValues.get(configName)) {
      this.storedConfigValues.set(configName, []);
    }

    t.beforeAll(() => {
      const row = SSLib.JasSpreadsheet.findRow(configName, this.configSheet);
      const range = this.configSheet.getRange(row, this.valueColumn);
      this.storedConfigValues.get(configName).push(range.getValue());
      replaceFn(range);
    });

    t.afterAll(() => {
      const row = SSLib.JasSpreadsheet.findRow(configName, this.configSheet);
      const range = this.configSheet.getRange(row, this.valueColumn);
      range.setValue(this.storedConfigValues.get(configName).pop());
    });
  }

  private setValue(t: Tester, configName: ConfigField, value: unknown) {
    this.replaceConfigValue(t, configName, (r: Range) => {
      if (Array.isArray(value)) value = value.join(', ');
      r.setValue(value);
    });
  }

  private clearValue(t: Tester, configName: ConfigField) {
    this.replaceConfigValue(t, configName, (r: Range) => r.clear());
  }

  run(t: Tester) {
    /**
     * Writing the config to the sheet is a test-only operation. Reading it back
     * from the sheet is needed in prod. The roundtrip guarantees that both work
     * together.
     */
    t.describe('write and read config', () => {
      const F = Config.FIELD;

      const writeConfig = (c: ConfigParams) => {
        this.setValue(t, F.customerDisplayName, c.customerDisplayName);
        this.setValue(t, F.customerEmails, c.customerEmails);
        this.setValue(t, F.emailCCs, c.emailCCs);
        this.setValue(t, F.emailBCCs, c.emailBCCs);
        this.setValue(t, F.emailDisplayName, c.emailDisplayName);
        this.setValue(t, F.linkToSheetHref, c.linkToSheetHref);
        this.setValue(t, F.linkToSheetText, c.linkToSheetText);
        this.setValue(
            t, F.searchQuery_paymentTypes, c.searchQuery.paymentTypes);
        this.setValue(t, F.searchQuery_searchName, c.searchQuery.searchName);

        if (c.loanConfig) {
          this.setValue(
              t, F.loanConfig_interestRate, c.loanConfig.interestRate);
          this.setValue(
              t, F.loanConfig_interestDayOfMonth,
              c.loanConfig.interestDayOfMonth);
          this.clearValue(t, F.rentConfig_monthlyAmount);
          this.clearValue(t, F.rentConfig_dueDayOfMonth);
        } else {
          this.setValue(
              t, F.rentConfig_monthlyAmount, c.rentConfig.monthlyAmount);
          this.setValue(
              t, F.rentConfig_dueDayOfMonth, c.rentConfig.dueDayOfMonth);
          this.clearValue(t, F.loanConfig_interestRate);
          this.clearValue(t, F.loanConfig_interestDayOfMonth);
        }
      };

      const configSpecs =
          [
            {name: 'loan', config: Config.getLoanConfigForTest()},
            {name: 'rent', config: Config.getRentConfigForTest()},
          ]

          for (const {name, config} of configSpecs) {
        t.describe(`after writing ${name} config`, () => {
          writeConfig(config);
          t.it('reads back the config', () => {
            t.expect(Config.get()).toEqual(config);
          });
        });
      }
    });

    t.describe('validate throws for', () => {
      t.it('neither rent nor loan config', () => {
        t.expect(() => Config.getLoanConfigForTest({
           loanConfig: undefined
         })).toThrow('No renter or borrower config');
      });

      t.it('both rent and loan config', () => {
        t.expect(() => Config.getLoanConfigForTest({
           rentConfig: Config.DEFAULT.rentConfig
         })).toThrow('Both renter and borrower config');
      });

      t.it('loan config without interest day of month', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestDayOfMonth: undefined}
         })).toThrow('Loans must have an interest day');

        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestRate: 0},
         })).not.toThrow();
      });

      t.it('negative day of month', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestDayOfMonth: -10}
         })).toThrow('Day of month');

        t.expect(() => Config.getRentConfigForTest(undefined, {
           rentConfig: {dueDayOfMonth: -1}
         })).toThrow('Day of month');
      });

      t.it('day of month too high', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestDayOfMonth: 29}
         })).toThrow('Day of month');

        t.expect(() => Config.getRentConfigForTest(undefined, {
           rentConfig: {dueDayOfMonth: 100}
         })).toThrow('Day of month');
      });

      t.it('invalid interest rate', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestRate: -0.04}
         })).toThrow('Interest rate');

        t.expect(() => Config.getLoanConfigForTest(undefined, {
           loanConfig: {interestRate: 4.5}
         })).toThrow('Interest rate');
      });

      t.it('invalid payment types', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           searchQuery: {paymentTypes: ['Paypal']}
         })).toThrow('Expected a payment type');
      });

      t.it('no search query name', () => {
        t.expect(() => Config.getLoanConfigForTest(undefined, {
           searchQuery: {searchName: ''}
         })).toThrow('Search query name is required');
      });

      t.it('no customer display name', () => {
        t.expect(() => Config.getLoanConfigForTest({
           customerDisplayName: ''
         })).toThrow('Customer display name is required');
      });

      t.it('no customer emails', () => {
        t.expect(() => Config.getLoanConfigForTest({
           customerEmails: []
         })).toThrow('At least one customer email is required');
      });

      t.it('invalid customer emails', () => {
        t.expect(() => Config.getLoanConfigForTest({
           customerEmails: ['alpha@beta.gamma', 'hello']
         })).toThrow('Invalid email format');
      });

      t.it('no bot email display name', () => {
        t.expect(() => Config.getLoanConfigForTest({
           emailDisplayName: ''
         })).toThrow('Email display name is required');
      });

      t.it('invalid email ccs', () => {
        t.expect(() => Config.getLoanConfigForTest({
           emailCCs: ['alpha@beta.gamma', 'hello']
         })).toThrow('Invalid email format');
      });

      t.it('invalid email bccs', () => {
        t.expect(() => Config.getLoanConfigForTest({
           emailBCCs: ['alpha@beta.gamma', 'hello']
         })).toThrow('Invalid email format');
      });

      t.it('invalid link to sheet href', () => {
        t.expect(() => Config.getLoanConfigForTest({
           linkToSheetHref: 'not-a-url'
         })).toThrow('Invalid link');
      });

      t.it('link to sheet without href', () => {
        t.expect(() => Config.getLoanConfigForTest({
           linkToSheetText: 'balance sheet',
           linkToSheetHref: undefined
         })).toThrow('Link text is useless without href');
      });
    });
  }
}
