import {JASLib} from 'jas_api';

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
  static readonly DISPLAY_NAME = 'OgunBank';

  static install(spreadsheet: Spreadsheet) {
    const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheet.getId());

    const menuItems = [
      ...MenuItems.Specs
    ].map(([displayName, {spreadsheetAgnostic, functionName}]) => {
      return {
        name: displayName,
        functionName: `menu_${functionName}${spreadsheetAgnostic ? '' : suffix}`
      };
    });

    spreadsheet.addMenu(Menu.DISPLAY_NAME, menuItems);
  }

  static registerPerClientFunctions() {
    const spreadsheetIds = ClientSheetManager.getAll();

    for (const [_, {spreadsheetAgnostic, functionName}] of MenuItems.Specs) {
      if (spreadsheetAgnostic) {
        globalThis[`menu_${functionName}`] = MenuItems[functionName];
      }
    }

    for (const spreadsheetId of spreadsheetIds) {
      const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheetId);

      for (const [_, {spreadsheetAgnostic, functionName}] of MenuItems.Specs) {
        if (!spreadsheetAgnostic) {
          globalThis[`menu_${functionName}${suffix}`] =
              (MenuItems[functionName] as Function).bind(null, spreadsheetId);
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

/** Visible for testing. */
export class MenuItems {
  // Map of menu display name to Menu function.
  static readonly Specs: Map<string, {
    functionName: JASLib.KeysOfType<typeof MenuItems, Function>,
    spreadsheetAgnostic?: boolean,
  }> =
      new Map([
        [
          'Register new spreadsheet',
          {functionName: 'registerNewClientSheet', spreadsheetAgnostic: true}
        ],
        [
          'Unregister this spreadsheet', {functionName: 'unregisterClientSheet'}
        ],
        ['Update status cell', {functionName: 'updateStatusCell'}],
      ]);

  static registerNewClientSheet() {
    const response = SpreadsheetApp.getUi().prompt(
        'Register new spreadsheet', 'ID of new spreadsheet:\n\n',
        SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() === SpreadsheetApp.getUi().Button.OK) {
      const spreadsheetId = response.getResponseText().trim();
      if (spreadsheetId) ClientSheetManager.register(spreadsheetId);
    } else {
      Logger.log('Registration cancelled');
    }
  }

  static unregisterClientSheet(spreadsheetId: string) {
    const response = SpreadsheetApp.getUi().alert(
        'Unregister this sheet',
        'Unregister this sheet from the OgunBank manager?\n\n',
        SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
    if (response === SpreadsheetApp.getUi().Button.OK) {
      ClientSheetManager.unregister(spreadsheetId);
      SpreadsheetApp.openById(spreadsheetId).removeMenu(Menu.DISPLAY_NAME);
    } else {
      Logger.log('Unregistration cancelled');
    }
  }

  static updateStatusCell(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    BalanceSheet.updateStatusCell();
  }
}

Menu.registerPerClientFunctions();
