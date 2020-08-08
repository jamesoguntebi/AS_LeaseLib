import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

export class Menu {
  static install(spreadsheet: Spreadsheet) {
    const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheet.getId());

    spreadsheet.addMenu('OgunBank', [
      {
        name: 'Register new spreadsheet',
        functionName: `menu_${MenuFunctionName.REGISTER_NEW}${suffix}`
      },
      {
        name: 'Update status cell',
        functionName: `menu_${MenuFunctionName.UPDATE_STATUS_CELL}${suffix}`
      },
    ]);
  }

  static registerNew(spreadsheetId: string) {
    const response =
        SpreadsheetApp.getUi().prompt('Spreadsheet ID of new sheet:\n\n');
    if (response.getSelectedButton() === SpreadsheetApp.getUi().Button.OK ||
        response.getSelectedButton() === SpreadsheetApp.getUi().Button.YES) {
      ClientSheetManager.register(response.getResponseText().trim());
    } else {
      Logger.log('prompt cancelled');
    }
  }

  static updateStatusCell(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    BalanceSheet.updateStatusCell();
  }

  static registerPerClientFunctions() {
    const spreadsheetIds = ClientSheetManager.getAll();

    for (const spreadsheetId of spreadsheetIds) {
      const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheetId);

      globalThis[`menu_${MenuFunctionName.REGISTER_NEW}${suffix}`] =
          Menu.registerNew.bind(null, spreadsheetId);

      globalThis[`menu_${MenuFunctionName.UPDATE_STATUS_CELL}${suffix}`] =
          Menu.updateStatusCell.bind(null, spreadsheetId);
    }
  }

  private static spreadsheetIdToFunctionSuffix(id: string): string {
    // Combine the alphanumeric prefix and suffix.
    return '__' +
        /^[a-zA-Z0-9]+/.exec(id)[0].substring(0, 5) + '_' +
        /[a-zA-Z0-9]+$/.exec(id)[0].substring(0, 5);
  }

  /** Throws for invalid spreadsheet ids. */
  static validateSpreadsheetId(id: string) {
    if (Menu.spreadsheetIdToFunctionSuffix(id).length < 9) {
      throw 'Spreadsheet ID produces insufficiently unique function suffix.';
    }
  }
}

enum MenuFunctionName {
  REGISTER_NEW = 'registerNew',
  UPDATE_STATUS_CELL = 'updateStatusCell',
}

Menu.registerPerClientFunctions();
