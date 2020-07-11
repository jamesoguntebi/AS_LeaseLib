import JasSpreadsheetApp, { CellData } from "./jas_spreadsheet_app";

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class Config {
  static readonly PaymentTypeStrings: Record<string, string> = {
    Zelle: 'Zelle',
    Venmo: 'Venmo',
  }

  static get(): LeaseConfig {
    const configSheet = JasSpreadsheetApp.findSheet('config');
    const valueColumn = JasSpreadsheetApp.findColumn('value', configSheet);
    console.log({valueColumn});

    const getCellData = (configName: string) => {
      const configRow = JasSpreadsheetApp.findRow(configName, configSheet);
      return new CellData(
          configSheet.getRange(configRow, valueColumn).getValue());
    };

    const paymentTypesRow =
        JasSpreadsheetApp.findRow('payment types', configSheet);
    const paymentTypes =
        getCellData('payment types').string().split(',')
            .map(pt => pt.trim())
            .map(pt => Config.assertIsPaymentType(pt));

    return {
      renter: {
        firstName: getCellData('renter first name').string(),
        lastName: getCellData('renter last name').string(),
        emails: getCellData('renter email').string().split(/,|\n/)
                    .map(e => e.trim()).filter(e => !!e),
      },
      rentAmount: getCellData('monthly rent').number(),
      rentDueDayOfMonth: getCellData('monthly due date').number(),
      emailCC: getCellData('email cc').string(),
      emailDisplayName: getCellData('email display name').string(),
      linkToSheetHref: getCellData('link to sheet href').string(),
      linkToSheetText: getCellData('link to sheet text').string(),
      searchQuery: {
        paymentTypes,
        searchName: getCellData('gmail search name').string(),
      },
    };
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
  emailCC: string;
  emailDisplayName: string;
  linkToSheetHref: string;
  linkToSheetText: string;
  rentAmount: number;
  rentDueDayOfMonth: number;
  renter: Renter;
  searchQuery: SearchQuery;
}

interface Renter {
  firstName: string;
  lastName: string;
  emails: string[];
}

interface SearchQuery {
  paymentTypes: PaymentType[];
  searchName: string;
}

export type PaymentType = keyof typeof Config.PaymentTypeStrings;