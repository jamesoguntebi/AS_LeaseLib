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
      range.setValue(this.storedConfigValues.get(configName).pop());
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
    t.describe('for a loan config', () => {
      this.setConfigValue(t, 'loan interest rate', 0.0475);
      this.setConfigValue(t, 'loan monthly interest day', 1);
      this.clearConfigValue(t, 'rent monthly amount');
      this.clearConfigValue(t, 'rent monthly due day');

      t.it('validates sheet', () => {
        t.expect(() => Config.get()).toNotThrow();
      });
      
      t.it('finds correct values', () => {
        const config = Config.get();

        this.expectGeneralConfigFields(t, config);
        t.expect(config.rentConfig).toBeUndefined();
        t.expect(config.loanConfig.interestRate).toEqual(0.0475);
        t.expect(config.loanConfig.interestDayOfMonth).toEqual(1);
      });
    });

    t.describe('for a rent config', () => {
      this.clearConfigValue(t, 'loan interest rate');
      this.clearConfigValue(t, 'loan monthly interest day');
      this.setConfigValue(t, 'rent monthly amount', 500);
      this.setConfigValue(t, 'rent monthly due day', 10);

      t.it('validates sheet', () => {
        t.expect(() => Config.get()).toNotThrow();
      });
      
      t.it('finds correct values', () => {
        const config = Config.get();

        this.expectGeneralConfigFields(t, config);
        t.expect(config.loanConfig).toBeUndefined();
        t.expect(config.rentConfig.monthlyAmount).toEqual(500);
        t.expect(config.rentConfig.dueDayOfMonth).toEqual(10);
      });
    });
  }
}