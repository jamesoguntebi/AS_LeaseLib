import JasSpreadsheet from "./jas_spreadsheet";
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
    const configSheet = JasSpreadsheet.findSheet('config');
    const valueColumn = JasSpreadsheet.findColumn('value', configSheet);

    const getCellData = (configName: string) => {
      const configRow = JasSpreadsheet.findRow(configName, configSheet);
      return new CellData(configSheet.getRange(configRow, valueColumn));
    };

    let rentConfig: RentConfig;
    const rentMonthlyAmountCellData = getCellData('rent monthly amount');
    const rentMonthlyDueDateCellData = getCellData('rent monthly due date');
    if (!rentMonthlyAmountCellData.isBlank() ||
        !rentMonthlyDueDateCellData.isBlank()) {
      rentConfig = {
        monthlyAmount: rentMonthlyAmountCellData.number(),
        dueDayOfMonth: rentMonthlyDueDateCellData.number(),
      };
    }

    let loanConfig: LoanConfig;
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

    const paymentTypes =
        getCellData('payment types').string().split(/,|\n/)
            .map(pt => pt.trim())
            .map(pt => Config.assertIsPaymentType(pt));
    if (!paymentTypes.length) {
      throw new Error('At least one payment type is required in Config.');
    }

    return Config.validate({
      customerDisplayName: getCellData('customer display name').string(),
      customerEmails: getCellData('customer emails').stringArray(),
      emailCCs: getCellData('email cc').stringArray(),
      emailBCCs: getCellData('email bcc').stringArray(),
      emailDisplayName: getCellData('email display name').string(),
      linkToSheetHref: getCellData('link to sheet href').string(),
      linkToSheetText: getCellData('link to sheet text').string(),
      loanConfig,
      rentConfig,
      searchQuery: {
        paymentTypes,
        searchName: getCellData('gmail search name').string(),
      },
    });
  }

  static getFixedCellNotation(field: ConfigField) {
    const configSheet = JasSpreadsheet.findSheet('config');
    const valueColumn = JasSpreadsheet.findColumn('value', configSheet);

    if (field === Config.Fields.LOAN_INTEREST_RATE) {
      const row = JasSpreadsheet.findRow(field, configSheet);
      return JasRange.getFixedA1Notation(
          configSheet.getRange(row, valueColumn));
    }
  }

  static validate(config: LeaseConfig = Config.get()): LeaseConfig {
    if (!config.rentConfig && !config.loanConfig) {
      throw new Error('No renter or borrower config defined.')
    }
    if (config.rentConfig && config.loanConfig) {
      throw new Error('Both renter or borrower config defined.')
    }

    if (config.rentConfig) {
      Config.validateDayOfMonth(config.rentConfig.dueDayOfMonth);
      if (config.rentConfig.monthlyAmount < 0) {
        throw new Error('Illegal negative rent');
      }
    }
    if (config.loanConfig) {
      Config.validateDayOfMonth(config.loanConfig.interestDayOfMonth);
      if (config.loanConfig.interestRate < 0 ||
          config.loanConfig.interestRate > 1) {
        throw new Error('Interest rate must be between 0 and 1.');
      }
    }

    if (!config.searchQuery.paymentTypes.length) {
      throw new Error('At least one payment type is required in Config.');
    }

    return config;
  }

  private static validateDayOfMonth(day: number) {
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      throw new Error('Day of month must be a whole number from 1 to 28 to ' +
          'valid in all months.');
    }
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

  static getLoanConfigForTest(override?: Partial<LeaseConfig>, overrides: {
    loanConfig?: Partial<LoanConfig>,
    searchQuery?: Partial<SearchQuery>,
  } = {}): LeaseConfig {
    return Config.getConfigForTest({
      loanConfig: {
        interestRate: 0.05,
        interestDayOfMonth: 1,
        ...overrides.loanConfig,
      },
      ...override,
    }, overrides);
  }

  static getRentConfigForTest(override?: Partial<LeaseConfig>, overrides: {
    rentConfig?: Partial<RentConfig>,
    searchQuery?: Partial<SearchQuery>,
  } = {}): LeaseConfig {
    return Config.getConfigForTest({
      rentConfig: {
        monthlyAmount: 3600,
        dueDayOfMonth: 15,
        ...overrides.rentConfig,
      },
      ...override,
    }, overrides);
  }

  /** Only to be called from getRentConfigForTest or getLoanConfigForTest. */
  private static getConfigForTest(override: Partial<LeaseConfig>, overrides: {
    searchQuery?: Partial<SearchQuery>,
  } = {}): LeaseConfig {
    return Config.validate({
      customerDisplayName: 'Gandalf the White',
      customerEmails: ['mithrandir@gmail.com', 'thewhiterider@gmail.com'],
      emailCCs: ['legolas@gmail.com', 'aragorn@gmail.com'],
      emailBCCs: ['saruman@gmail.com', 'radagast@gmail.com'],
      emailDisplayName: 'Gandalf',
      linkToSheetHref: 'https://bankofmiddleearth.com/loans/gandalf',
      linkToSheetText: 'bankofmiddleearth.com/loans/gandalf',
      searchQuery: {
        paymentTypes: ['Zelle', 'Venmo'],
        searchName: 'Gandalf',
        ...overrides.searchQuery,
      },
      ...override,
    });
  }
}

export interface LeaseConfig {
  customerDisplayName: string;
  customerEmails: string[];
  emailCCs: string[];
  emailBCCs: string[];
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