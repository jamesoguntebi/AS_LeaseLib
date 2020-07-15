import { Test } from "./testing/testrunner";
import { Tester } from "./testing/tester";
import Config, { ConfigParams } from "./config";
import JasSpreadsheet from "./jas_spreadsheet";

type Range = GoogleAppsScript.Spreadsheet.Range;

export default class ConfigTest implements Test {
  readonly name: string = 'ConfigTest';

  private storedConfigValues: Map<string, unknown[]> = new Map();

  private readonly configSheet = JasSpreadsheet.findSheet('config');
  private readonly valueColumn =
      JasSpreadsheet.findColumn('value', this.configSheet);

  private replaceConfigValue(
      t: Tester, configName: string, replaceFn: (r: Range) => void) {
    if (!this.storedConfigValues.get(configName)) {
      this.storedConfigValues.set(configName, []);
    }

    t.beforeAll(() => {
      const row = JasSpreadsheet.findRow(configName, this.configSheet);
      const range = this.configSheet.getRange(row, this.valueColumn);
      this.storedConfigValues.get(configName).push(range);
      replaceFn(range);
    });

    t.afterAll(() => {
      const row = JasSpreadsheet.findRow(configName, this.configSheet);
      const range = this.configSheet.getRange(row, this.valueColumn);
      const value = this.storedConfigValues.get(configName).pop();
      Logger.log(`Restoring cell value: ${value}`);
      range.setValue(value);
      // range.setValue(this.storedConfigValues.get(configName).pop());
    });
  }

  private setConfigValue(t: Tester, configName: string, value: unknown) {
    this.replaceConfigValue(t, configName, (r: Range) => r.setValue(value));
  }

  private clearConfigValue(t: Tester, configName: string) {
    this.replaceConfigValue(t, configName, (r: Range) => r.clear());
  }

  private expectGeneralConfigFields(t: Tester, config: ConfigParams) {
    t.expect(config.customerDisplayName).toEqual('Firstname');
    t.expect(config.customerEmails).toEqual(['joguntest@gmail.com']);
    t.expect(config.emailCCs).toEqual(['james.keep101@gmail.com']);
    t.expect(config.emailBCCs).toEqual(['jaoguntebi@gmail.com']);
    t.expect(config.emailDisplayName).toEqual('Oguntebi Bot');
    t.expect(config.linkToSheetText).toEqual('ogunfam.com/leasetemplate');
    t.expect(config.linkToSheetHref).toEqual(
        'https://ogunfam.com/leasetemplate');

    t.expect(config.searchQuery.paymentTypes).toEqual(['Venmo', 'Zelle']);
    t.expect(config.searchQuery.searchName).toEqual('Firstname');
  }

  run(t: Tester) {
    t.describe('get (creation)', () => {
      t.describe('for invalid payment types', () => {
        this.setConfigValue(t, 'payment types', 'Paypal');
        t.it('throws', () => t.expect(() => Config.get()).toThrow());
      });

      t.describe('for wrongly formatted payment types', () => {
        this.setConfigValue(t, 'payment types', 'Zelle Venmo');
        t.it('throws', () => t.expect(() => Config.get()).toThrow());
      });

      t.describe('for mispelled payment types', () => {
        this.setConfigValue(t, 'payment types', 'Zlle');
        t.it('throws', () => t.expect(() => Config.get()).toThrow());
      });
    });

    // t.describe('for a loan config', () => {
    //   this.setConfigValue(t, 'loan interest rate', 0.0475);
    //   this.setConfigValue(t, 'loan monthly interest day', 1);
    //   this.clearConfigValue(t, 'rent monthly amount');
    //   this.clearConfigValue(t, 'rent monthly due day');

    //   t.it('validates sheet', () => {
    //     t.expect(() => Config.get()).toNotThrow();
    //   });
      
    //   t.it('finds correct values', () => {
    //     const config = Config.get();

    //     this.expectGeneralConfigFields(t, config);
    //     t.expect(config.rentConfig).toBeUndefined();
    //     t.expect(config.loanConfig.interestRate).toEqual(0.0475);
    //     t.expect(config.loanConfig.interestDayOfMonth).toEqual(1);
    //   });
    // });

    // t.describe('for a rent config', () => {
    //   this.clearConfigValue(t, 'loan interest rate');
    //   this.clearConfigValue(t, 'loan monthly interest day');
    //   this.setConfigValue(t, 'rent monthly amount', 500);
    //   this.setConfigValue(t, 'rent monthly due day', 10);

    //   t.it('validates sheet', () => {
    //     t.expect(() => Config.get()).toNotThrow();
    //   });
      
    //   t.it('finds correct values', () => {
    //     const config = Config.get();

    //     this.expectGeneralConfigFields(t, config);
    //     t.expect(config.loanConfig).toBeUndefined();
    //     t.expect(config.rentConfig.monthlyAmount).toEqual(500);
    //     t.expect(config.rentConfig.dueDayOfMonth).toEqual(10);
    //   });
    // });

    t.describe('validate throws for', () => {
      t.it('neither rent nor loan config', () => {
        t.expect(() => Config.getLoanConfigForTest({loanConfig: undefined}))
            .toThrow();
      });

      t.it('both rent and loan config', () => {
        t.expect(
            () => Config.getLoanConfigForTest(
                {rentConfig: Config.DEFAULT.rentConfig}))
            .toThrow();
      });

      t.it('negative day of month', () => {
        t.expect(
            () => Config.getLoanConfigForTest(
                undefined, {loanConfig: {interestDayOfMonth: -10}}))
            .toThrow();

        t.expect(
          () => Config.getRentConfigForTest(
              undefined, {rentConfig: {dueDayOfMonth: -1}}))
          .toThrow();
      });

      t.it('day of month too high', () => {
        t.expect(
            () => Config.getLoanConfigForTest(
                undefined, {loanConfig: {interestDayOfMonth: 29}}))
            .toThrow();

        t.expect(
          () => Config.getRentConfigForTest(
              undefined, {rentConfig: {dueDayOfMonth: 100}}))
          .toThrow();
      });

      t.it('invalid interest rate', () => {
        t.expect(
            () => Config.getLoanConfigForTest(
                undefined, {loanConfig: {interestRate: -0.04}}))
            .toThrow();

        t.expect(
            () => Config.getLoanConfigForTest(
                undefined, {loanConfig: {interestRate: 4.5}}))
            .toThrow();
      });

      t.it('no payment types', () => {
        t.expect(
            () => Config.getLoanConfigForTest(
                undefined, {searchQuery: {paymentTypes: []}}))
            .toThrow();
      });

      t.it('no customer display name', () => {
        t.expect(() => Config.getLoanConfigForTest({customerDisplayName: ''}))
            .toThrow();
      });

      t.it('no customer emails', () => {
        t.expect(() => Config.getLoanConfigForTest({customerEmails: []}))
            .toThrow();
      });

      t.it('no bot email display name', () => {
        t.expect(() => Config.getLoanConfigForTest({emailDisplayName: ''}))
            .toThrow();
      });
    });
  }
}