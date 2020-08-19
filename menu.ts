import {JASLib} from 'jas_api';

import {Executrix} from './api';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config from './config';
import EmailChecker from './email_checker';
import EmailSender from './email_sender';

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
  static readonly DISPLAY_NAME = '$ OgunBank 🏛';

  static install(spreadsheet: Spreadsheet) {
    const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheet.getId());

    // Braile Blank U+2800 that does not get collapsed by Docs menu item
    // renderer. This is one U+2800 and one regular space.
    const BLANK = '⠀ ';
    const menuItems = [...MenuItems.SpecsWithSeparators].map(spec => {
      if (!spec) return null;  // Menu separator.
      const {icon, displayName, spreadsheetAgnostic, functionName} = spec;
      return {
        name: `${icon}${BLANK}${displayName}`,
        functionName: `menu_${functionName}${spreadsheetAgnostic ? '' : suffix}`
      };
    });

    spreadsheet.addMenu(Menu.DISPLAY_NAME, menuItems);
  }

  static registerPerClientFunctions() {
    const spreadsheetIds = ClientSheetManager.getAll();

    for (const {spreadsheetAgnostic, functionName} of MenuItems.Specs) {
      if (spreadsheetAgnostic) {
        globalThis[`menu_${functionName}`] = () =>
            Executrix.run(MenuItems[functionName].bind(null));
      }
    }

    for (const spreadsheetId of spreadsheetIds) {
      const suffix = Menu.spreadsheetIdToFunctionSuffix(spreadsheetId);

      for (const {spreadsheetAgnostic, functionName} of MenuItems.Specs) {
        if (!spreadsheetAgnostic) {
          globalThis[`menu_${functionName}${suffix}`] = function(
                                                            spreadsheetId) {
            return Executrix.run(
                MenuItems[functionName].bind(null, spreadsheetId));
          }.bind(null, spreadsheetId);
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
  static readonly SpecsWithSeparators: Array<MenuItemSpec|null> = [
    // Icons from https://html-css-js.com/html/character-codes/icons/
    {
      icon: '🗹',
      displayName: 'Register new spreadsheet',
      functionName: 'registerNewClientSheet',
      spreadsheetAgnostic: true,
    },
    {
      icon: '🗵',
      displayName: 'Unregister this spreadsheet',
      functionName: 'unregisterClientSheet',
    },
    null /* Menu separator */,
    {
      icon: '🗘',
      displayName: 'Update status cell',
      functionName: 'updateStatusCell',
    },
    {
      icon: '🗓',
      displayName: 'Do daily update now',
      functionName: 'dailyUpdate',
    },
    {
      icon: '📧',
      displayName: 'Check email now',
      functionName: 'checkLabeledEmail',
    },
    {
      icon: '⚙',
      displayName: 'Validate config',
      functionName: 'validateConfig',
    },
    null /* Menu separator */,
    {
      icon: '📧',
      displayName: 'Send test payment email',
      functionName: 'sendTestPaymentEmail',
      spreadsheetAgnostic: true,
    },
  ];

  static readonly Specs: MenuItemSpec[] =
      MenuItems.SpecsWithSeparators.filter(spec => !!spec);

  static registerNewClientSheet() {
    const response = SpreadsheetApp.getUi().prompt(
        'Register new spreadsheet', 'ID of new spreadsheet:\n\n',
        SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() === SpreadsheetApp.getUi().Button.OK) {
      const spreadsheetId = response.getResponseText().trim();
      if (spreadsheetId) {
        try {
          ClientSheetManager.register(spreadsheetId);
          SpreadsheetApp.getUi().alert(`Spreadsheet registered!`);
        } catch (e) {
          SpreadsheetApp.getUi().alert(`Spreadsheet registration failed!\n\n${
              JASLib.Util.isError(e) ? e.stack || e.message : 'Unkown error'}`);
        }
      }
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
      SpreadsheetApp.getUi().alert(`Spreadsheet unregistered!`);
    } else {
      Logger.log('Unregistration cancelled');
    }
  }

  static updateStatusCell(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    BalanceSheet.updateStatusCell();
  }

  static dailyUpdate(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    BalanceSheet.dailyUpdate();
  }

  static checkLabeledEmail(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    EmailChecker.checkLabeledEmails();
  }

  static validateConfig(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    try {
      Config.get();
      SpreadsheetApp.getUi().alert(`Config is valid!`);
    } catch (e) {
      SpreadsheetApp.getUi().alert(`Config is not valid!\n\n${
          JASLib.Util.isError(e) ? e.stack || e.message : 'Unkown error'}`);
    }
  }

  static sendTestPaymentEmail() {
    const response = SpreadsheetApp.getUi().prompt(
        'Payment amount:\n\n', SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() === SpreadsheetApp.getUi().Button.OK) {
      const paymentAmount = Number(response.getResponseText().trim());
      if (paymentAmount) EmailSender.sendTestPaymentMessage(paymentAmount);
    } else {
      Logger.log('Test payment email cancelled');
    }
  }
}

type MenuItemSpec = {
  icon: string,  // See https://html-css-js.com/html/character-codes/icons/.
  displayName: string,
  functionName: JASLib.KeysOfType<typeof MenuItems, Function>,
  spreadsheetAgnostic?: boolean,
};

Menu.registerPerClientFunctions();
