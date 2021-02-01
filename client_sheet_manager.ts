import {JASLib} from 'jas_api';
import {SSLib} from 'ss_api';

import Util from './_util';
import BalanceSheet from './balance_sheet';
import Config from './config';
import {Menu} from './menu';
import {Triggers} from './triggers';



export default class ClientSheetManager {
  private static readonly PROPERTY_NAME = 'REGISTERED_CLIENTS';

  /**
   * Sets each registered spreadhsheet as the current spreadsheet in the library
   * context, calling the callback each time.
   * @param fn Return true to break loop.
   */
  static forEach(fn: (_: string) => boolean | void) {
    const storedSpreadsheetId = _JasLibContext.spreadsheetId;

    const spreadsheetIds = ClientSheetManager.getAll();
    Logger.log(`Registered clients: ${JSON.stringify(spreadsheetIds)}`);
    for (const spreadsheetId of spreadsheetIds) {
      _JasLibContext.spreadsheetId = spreadsheetId;
      if (fn(spreadsheetId)) break;

      // Applies all pending Spreadsheet changes.
      SpreadsheetApp.flush();

      // Sleeping after each spreadsheet operation is likely unecessary. It's
      // a safeguard to prevent cross-talk between client sheets.
      Utilities.sleep(500);
    }

    _JasLibContext.spreadsheetId = storedSpreadsheetId;
  }

  /**
   * Registers a sheet as a new client sheet, first validating that it has
   * valid config and contents.
   */
  static register(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (registeredSet.has(spreadsheetId)) return;

    const storedSpreadsheetId = _JasLibContext.spreadsheetId;

    try {
      _JasLibContext.spreadsheetId = spreadsheetId;

      // So that dates in the sheet don't get off-by-1 errors.
      SSLib.JasSpreadsheet.getSpreadsheet(spreadsheetId)
          .setSpreadsheetTimeZone(Util.DEFAULT_TIME_ZONE);

      Config.get();  // This will validate that the Config sheet.
      BalanceSheet.validateActiveSheet();
      Menu.validateSpreadsheetId(spreadsheetId);
    } catch (e) {
      Logger.log('Validation of new sheet failed with error:');
      Logger.log(
          JASLib.Util.isError(e) ? e.stack || e.message : 'Unknown error');
      throw e;
    } finally {
      _JasLibContext.spreadsheetId = storedSpreadsheetId;
    }

    Triggers.installForClientSheet(spreadsheetId);
    registeredSet.add(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));

    Logger.log(`Registered client sheet ${spreadsheetId}`);
  }

  static unregister(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (!registeredSet.has(spreadsheetId)) return;

    registeredSet.delete(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));

    Triggers.updateOpenAndEditTriggers();

    Logger.log(`Unregistered client sheet ${spreadsheetId}`);
  }

  /** Returns all client sheet spreadsheet ids. */
  static getAll(): string[] {
    const propertyValue = PropertiesService.getScriptProperties().getProperty(
        ClientSheetManager.PROPERTY_NAME);
    if (!propertyValue) return [];

    try {
      const clientList = JSON.parse(propertyValue);
      if (clientList instanceof Array &&
          clientList.every(clientId => typeof clientId === 'string')) {
        return clientList;
      } else {
        throw new Error(`Stored client sheet id list has incorrect format: ${
            propertyValue}`);
      }
    } catch (e) {
      Logger.log('Failure to parse stored client sheet id list.');
      throw e;
    }
  }
}
