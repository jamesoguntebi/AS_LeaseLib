import JasSpreadsheetApp, { CellData } from "./jas_spreadsheet_app";

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export default class Config {
  static get(): LeaseConfig {
    const configSheet = JasSpreadsheetApp.findSheet('config');
    const valueColumn = JasSpreadsheetApp.findColumn('value', configSheet);
    console.log({valueColumn});

    const getCellData = (configName: string) => {
      const configRow = JasSpreadsheetApp.findRow(configName, configSheet);
      console.log({configRow});
      return new CellData(
          configSheet.getRange(configRow, valueColumn).getValue());
    };

    return {
      renter: {
        firstName: getCellData('renter first name').string(),
        lastName: getCellData('renter last name').string(),
        email: getCellData('renter email').string(),
      },
      rentAmount: getCellData('monthly rent').number(),
      rentDueDayOfMonth: getCellData('monthly due date').number(),
      emailCC: getCellData('email cc').string(),
      linkToSheetHref: getCellData('link to sheet href').string(),
      linkToSheetText: getCellData('link to sheet text').string(),
    };
  }
}

export interface LeaseConfig {
  renter: Renter;
  rentAmount: number;
  rentDueDayOfMonth: number;
  emailCC: string;
  linkToSheetHref: string;
  linkToSheetText: string;
}

interface Renter {
  firstName: string;
  lastName: string;
  email: string;
}