import JasSpreadsheetApp from "./jas_spreadsheet_app";
import JasRange, { CellData } from "./jas_range";

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class Config {
  static readonly PaymentTypeStrings: Record<string, string> = {
    Zelle: 'Zelle',
    Venmo: 'Venmo',
  }

  /**
   * Allows callers to refer to a specific field for requesting it's range A1
   * location. The value is the lookup to find the row.
   */
  static readonly Fields: Record<string, string> = {
    LOAN_INTEREST_RATE: 'loan interest rate',
  }

  static get(): LeaseConfig {
    const configSheet = JasSpreadsheetApp.findSheet('config');
    const valueColumn = JasSpreadsheetApp.findColumn('value', configSheet);

    const getCellData = (configName: string) => {
      const configRow = JasSpreadsheetApp.findRow(configName, configSheet);
      return new CellData(configSheet.getRange(configRow, valueColumn));
    };

    const {rentConfig, loanConfig} = Config.validateRentOrLoanConfig();

    const paymentTypesRow =
        JasSpreadsheetApp.findRow('payment types', configSheet);
    const paymentTypes =
        getCellData('payment types').string().split(/,|\n/)
            .map(pt => pt.trim())
            .map(pt => Config.assertIsPaymentType(pt));

    return {
      customerDisplayName: getCellData('customer display name').string(),
      customerEmails: getCellData('customer emails').string().split(/,|\n/)
                    .map(e => e.trim()).filter(e => !!e),
      emailCC: getCellData('email cc').stringOptional(),
      emailDisplayName: getCellData('email display name').string(),
      linkToSheetHref: getCellData('link to sheet href').string(),
      linkToSheetText: getCellData('link to sheet text').string(),
      loanConfig,
      rentConfig,
      searchQuery: {
        paymentTypes,
        searchName: getCellData('gmail search name').string(),
      },
    };
  }

  static getFixedCellNotation(field: ConfigField) {
    const configSheet = JasSpreadsheetApp.findSheet('config');
    const valueColumn = JasSpreadsheetApp.findColumn('value', configSheet);

    if (field === Config.Fields.LOAN_INTEREST_RATE) {
      const row = JasSpreadsheetApp.findRow(field, configSheet);
      return JasRange.getFixedA1Notation(
          configSheet.getRange(row, valueColumn));
    }
  }

  private static validateRentOrLoanConfig():
      {rentConfig?: RentConfig, loanConfig?: LoanConfig} {
    const configSheet = JasSpreadsheetApp.findSheet('config');
    const valueColumn = JasSpreadsheetApp.findColumn('value', configSheet);

    const getCellData = (configName: string) => {
      const configRow = JasSpreadsheetApp.findRow(configName, configSheet);
      return new CellData(configSheet.getRange(configRow, valueColumn));
    };

    let rentConfig: RentConfig|undefined;
    const rentMonthlyAmountCellData = getCellData('rent monthly amount');
    const rentMonthlyDueDateCellData = getCellData('rent monthly due date');
    if (!rentMonthlyAmountCellData.isBlank() ||
        !rentMonthlyDueDateCellData.isBlank()) {
      rentConfig = {
        monthlyAmount: rentMonthlyAmountCellData.number(),
        dueDayOfMonth: rentMonthlyDueDateCellData.number(),
      };
    }

    let loanConfig: LoanConfig|undefined;
    const loanInterestRateCellData =
        getCellData(Config.Fields.LOAN_INTEREST_RATE);
    const loanMonthlyInterestDayCellData =
        getCellData('loan monthly interest day');
    if (!loanInterestRateCellData.isBlank() ||
        !loanMonthlyInterestDayCellData.isBlank()) {
      loanConfig = {
        interestRate: loanInterestRateCellData.number(),
        interestDayOfMonth: loanMonthlyInterestDayCellData.number(),
      };
    }

    if (!rentConfig && !loanConfig) {
      throw new Error('No renter or borrower config defined.')
    }

    if (rentConfig && loanConfig) {
      throw new Error('Both renter or borrower config defined.')
    }

    return {rentConfig, loanConfig};
  }

  private static assertIsPaymentType(s: string): PaymentType {
    if (!Config.PaymentTypeStrings.hasOwnProperty(s)) {
      throw new Error(`Expected a payment type in [${
          Object.keys(Config.PaymentTypeStrings)
              .map(key => Config.PaymentTypeStrings[key]).join(', ')}]. ` +
          `Got ${s}.`);
    }
    return s as PaymentType;
  }
}

export interface LeaseConfig {
  customerDisplayName: string;
  customerEmails: string[];
  emailCC?: string;
  emailDisplayName: string;
  linkToSheetHref: string;
  linkToSheetText: string;
  loanConfig?: LoanConfig;
  rentConfig?: RentConfig;
  searchQuery: SearchQuery;
}

interface RentConfig {
  monthlyAmount: number;
  dueDayOfMonth: number;
}

interface LoanConfig {
  interestRate: number;
  interestDayOfMonth: number;
}

interface SearchQuery {
  paymentTypes: PaymentType[];
  searchName: string;
}

export type ConfigField = keyof typeof Config.Fields;
export type PaymentType = keyof typeof Config.PaymentTypeStrings;