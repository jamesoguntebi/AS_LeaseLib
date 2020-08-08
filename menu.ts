import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

/**
 * Installs a menu in every client sheet.
 *
 * The menu function handlers have only a name, which is invoked at menu click
 * time by the GAS infrastructure. The invokved function has no parameter, so
 * the only way for the function to know which sheet to operate on is to have
 * a unique function name.
 *
 * At script intrepration time, Menu#registerPerClientFunctions exposes on the
 * globalThis a function for every menu item for every client spreadsheet. The
 * function name is suffixed with a hash of the spreadsheet id.
 */
export class Menu {
  // Map of menu display name to Menu function.
  private static readonly ItemSpecs:
      Map<string,
          {spreadsheetAgnostic?: boolean, functionName: keyof typeof Menu}> =
          new Map([
            [
              'Register new spreadsheet',
              {functionName: 'registerNew', spreadsheetAgnostic: true}
            ],
            ['Update status cell', {functionName: 'updateStatusCell'}],
          ]);

  static install(spreadsheet: Spreadsheet) {
    const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheet.getId());

    const menuItems = [
      ...Menu.ItemSpecs
    ].map(([displayName, {spreadsheetAgnostic, functionName}]) => {
      return {
        name: displayName,
        functionName: `menu_${functionName}${spreadsheetAgnostic ? '' : suffix}`
      };
    });

    spreadsheet.addMenu('OgunBank', menuItems);
  }

  static registerNew() {
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

    for (const [_, {spreadsheetAgnostic, functionName}] of Menu.ItemSpecs) {
      if (spreadsheetAgnostic) {
        globalThis[`menu_${functionName}`] = Menu[functionName];
      }
    }

    for (const spreadsheetId of spreadsheetIds) {
      const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheetId);

      for (const [_, {spreadsheetAgnostic, functionName}] of Menu.ItemSpecs) {
        if (!spreadsheetAgnostic) {
          globalThis[`menu_${functionName}${suffix}`] =
              (Menu[functionName] as Function).bind(null, spreadsheetId);
        }
      }
    }
  }

  static spreadsheetIdToFunctionSuffix(id: string): string {
    // Combine the alphanumeric prefix and suffix.
    return '__' +
        /^[a-zA-Z0-9]+/.exec(id)[0].substring(0, 5) + '_' +
        /[a-zA-Z0-9]+$/.exec(id)[0].substring(0, 5);
  }

  /** Throws for invalid spreadsheet ids. */
  static validateSpreadsheetId(id: string) {
    if (Menu.spreadsheetIdToFunctionSuffix(id).length < 9) {
      throw new Error(
          'Spreadsheet ID produces insufficiently unique function suffix.');
    }
  }
}

Menu.registerPerClientFunctions();
