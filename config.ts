import { SSLib } from "ss_api"
import Util from "./_util";

export default class Config {
  static readonly PaymentTypeStrings: Record<string, string> = {
    Zelle: 'Zelle',
    Venmo: 'Venmo',
  }

  static readonly DEFAULT = Config.getRentConfigForTest();

  static get(): ConfigParams {
    const F = Config.FIELD;
    const configSheet = SSLib.JasSpreadsheet.findSheet(
        'config', _JasLibContext.spreadsheetId);
    const valueColumn = SSLib.JasSpreadsheet.findColumn('value', configSheet);

    const getCellData = (configField: ConfigField) => {
      const configRow = SSLib.JasSpreadsheet.findRow(configField, configSheet);
      return new SSLib.CellData(configSheet.getRange(configRow, valueColumn));
    };

    let rentConfig: RentConfig;
    const rentMonthlyAmountCellData = getCellData(F.rentConfig_monthlyAmount);
    const rentMonthlyDueDateCellData = getCellData(F.rentConfig_dueDayOfMonth);
    if (!rentMonthlyAmountCellData.isBlank() ||
        !rentMonthlyDueDateCellData.isBlank()) {
      rentConfig = {
        monthlyAmount: rentMonthlyAmountCellData.number(),
        dueDayOfMonth: rentMonthlyDueDateCellData.number(),
      };
    }

    let loanConfig: LoanConfig;
    const loanInterestRateCellData = getCellData(F.loanConfig_interestRate);
    const loanMonthlyInterestDayCellData =
        getCellData(F.loanConfig_interestDayOfMonth);
    if (!loanInterestRateCellData.isBlank() ||
        !loanMonthlyInterestDayCellData.isBlank()) {
      loanConfig = {
        interestRate: loanInterestRateCellData.number(),
        interestDayOfMonth: loanMonthlyInterestDayCellData.number(),
      };
    }

    const paymentTypes =
        getCellData(F.searchQuery_paymentTypes)
            .string().split(/,|\n/)
            .map(pt => pt.trim())
            .map(pt => Config.assertIsPaymentType(pt));

    return Config.validate({
      customerDisplayName: getCellData(F.customerDisplayName).string(),
      customerEmails: getCellData(F.customerEmails).stringArray(),
      emailCCs: getCellData(F.emailCCs).stringArray(),
      emailBCCs: getCellData(F.emailBCCs).stringArray(),
      emailDisplayName: getCellData(F.emailDisplayName).string(),
      linkToSheetHref: getCellData(F.linkToSheetHref).string(),
      linkToSheetText: getCellData(F.linkToSheetText).string(),
      loanConfig,
      rentConfig,
      searchQuery: {
        paymentTypes,
        searchName: getCellData(F.searchQuery_searchName).string(),
      },
    });
  }

  static validate(config: ConfigParams = Config.get()): ConfigParams {
    if (!config.rentConfig && !config.loanConfig) {
      throw new Error('No renter or borrower config defined.')
    }
    if (config.rentConfig && config.loanConfig) {
      throw new Error('Both renter and borrower config defined.')
    }

    if (config.rentConfig) {
      Util.validateRecurringDayOfMonth(config.rentConfig.dueDayOfMonth);
      if (config.rentConfig.monthlyAmount < 0) {
        throw new Error('Illegal negative rent');
      }
    }
    if (config.loanConfig) {
      Util.validateRecurringDayOfMonth(config.loanConfig.interestDayOfMonth);
      if (config.loanConfig.interestRate < 0 ||
          config.loanConfig.interestRate > 1) {
        throw new Error('Interest rate must be between 0 and 1.');
      }
    }

    if (!config.searchQuery.paymentTypes.length) {
      throw new Error('At least one payment type is required in Config.');
    }
    if (!config.searchQuery.searchName) {
      throw new Error('Search query name is required in Config.');
    }
    if (!config.customerDisplayName) {
      throw new Error('Customer display name is required in Config.');
    }
    if (!config.customerEmails.length) {
      throw new Error('At least one customer email is required in Config.');
    }
    if (!config.customerEmails.every(Config.isEmail)) {
      throw new Error('Invalid email format for customer emails in Config.');
    }
    if (!config.emailDisplayName) {
      throw new Error('Email display name is required in Config.');
    }
    if (!config.emailCCs.every(Config.isEmail)) {
      throw new Error('Invalid email format for email cc in Config.');
    }
    if (!config.emailBCCs.every(Config.isEmail)) {
      throw new Error('Invalid email format for email bcc in Config.');
    }
    if (config.linkToSheetHref && !Config.isUrl(config.linkToSheetHref)) {
      throw new Error('Invalid link to balance sheet.');
    }
    if (config.linkToSheetText && !config.linkToSheetHref) {
      throw new Error('Link text is useless without href.');
    }

    return config;
  }

  private static isEmail(s: string): boolean {
    return /\S+@\S+\.\S+/.test(s);
  }

  private static isUrl(s: string): boolean {
    return /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(s);
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

  static getLoanConfigForTest(override?: Partial<ConfigParams>, overrides: {
    loanConfig?: Partial<LoanConfig>,
    searchQuery?: Partial<SearchQuery>,
  } = {}): ConfigParams {
    return Config.getConfigForTest({
      loanConfig: {
        interestRate: 0.05,
        interestDayOfMonth: 1,
        ...overrides.loanConfig,
      },
      ...override,
    }, overrides);
  }

  static getRentConfigForTest(override?: Partial<ConfigParams>, overrides: {
    rentConfig?: Partial<RentConfig>,
    searchQuery?: Partial<SearchQuery>,
  } = {}): ConfigParams {
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
  private static getConfigForTest(override: Partial<ConfigParams>, overrides: {
    searchQuery?: Partial<SearchQuery>,
  } = {}): ConfigParams {
    return Config.validate({
      customerDisplayName: 'Gandalf the White',
      customerEmails: ['mithrandir@gmail.com', 'thewhiterider@gmail.com'],
      emailCCs: ['legolas@gmail.com', 'aragorn@gmail.com'],
      emailBCCs: ['saruman@gmail.com', 'radagast@gmail.com'],
      emailDisplayName: 'Bank of Middle Earth Bot',
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

  // Keep in sync with ConfigParams below.
  static readonly FIELD: Record<string, string> = {
    customerDisplayName: 'customer display name',
    customerEmails: 'customer emails',
    emailCCs: 'email cc',
    emailBCCs: 'email bcc',
    emailDisplayName: 'email display name',
    linkToSheetHref: 'link to sheet href',
    linkToSheetText: 'link to sheet text',
    loanConfig_interestRate: 'loan interest rate',
    loanConfig_interestDayOfMonth: 'loan monthly interest day',
    rentConfig_monthlyAmount: 'rent monthly amount',
    rentConfig_dueDayOfMonth: 'rent monthly due day',
    searchQuery_paymentTypes: 'payment types',
    searchQuery_searchName: 'gmail search name',
  }
}

  // Keep in sync with FIELD above.
export interface ConfigParams {
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

export type ConfigField = keyof typeof Config.FIELD;
export type PaymentType = keyof typeof Config.PaymentTypeStrings;