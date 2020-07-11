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
    };
  }
}

export interface LeaseConfig {
  renter: Renter;
  rentAmount: number;
  rentDueDayOfMonth: number;
  emailCC: string;
}

interface Renter {
  firstName: string;
  lastName: string;
  email: string;
}