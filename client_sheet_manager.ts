import {JASLib} from 'jas_api';
import {SSLib} from 'ss_api';

import Util from './_util';
import BalanceSheet from './balance_sheet';
import Config from './config';
import {Menu} from './menu';
import {Triggers} from './triggers';



export default class ClientSheetManager {
  // Prefix: JAS - Lease Lib - ClientSheetManager
  private static readonly STORAGE_PROPERTIES = {
    REGISTERED_CLIENTS: 'jas_ll_csm_rc',
    CLIENT_SHEET_NAMES: 'jas_ll_csm_csn',
  };

  /**
   * Sets each registered spreadhsheet as the current spreadsheet in the library
   * context, calling the callback each time.
   * @param fn Return true to break loop.
   */
  static forEach(fn: (_: string) => boolean | void) {
    const storedSpreadsheetId = _JasLibContext.spreadsheetId;

    const spreadsheetIds = ClientSheetManager.getAll();
    const spreadsheetNames = ClientSheetManager.readStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.CLIENT_SHEET_NAMES);

    Logger.log(
        `Registered clients: ${JSON.stringify(spreadsheetNames, null, 2)}`);

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

      // Don't do this in unit tests because
      // a) we only need to do it once
      // b) it doesn't work in the test environment
      if (!UNIT_TESTING) {
        // So that dates in the sheet don't get off-by-1 errors.
        SSLib.JasSpreadsheet.getSpreadsheet(spreadsheetId)
            .setSpreadsheetTimeZone(Util.DEFAULT_TIME_ZONE);
      }

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
    ClientSheetManager.writeStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS,
        [...registeredSet.values()]);

    Logger.log(`Registered client sheet ${spreadsheetId}`);
  }

  static unregister(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (!registeredSet.has(spreadsheetId)) return;

    registeredSet.delete(spreadsheetId);
    ClientSheetManager.writeStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS,
        [...registeredSet.values()]);

    Triggers.updateOpenAndEditTriggers();

    Logger.log(`Unregistered client sheet ${spreadsheetId}`);
  }

  /** Returns all client sheet spreadsheet ids. */
  static getAll(): string[] {
    return ClientSheetManager.readStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS);
  }

  static getClientSheetNames() {
    return ClientSheetManager.readStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.CLIENT_SHEET_NAMES);
  }

  static updateClientSheetNames() {
    const spreadsheetNames: string[] = [];

    ClientSheetManager.forEach((spreadsheetId) => {
      spreadsheetNames.push(
          SSLib.JasSpreadsheet.getSpreadsheet(spreadsheetId).getName());
    });

    ClientSheetManager.writeStringArray(
        ClientSheetManager.STORAGE_PROPERTIES.CLIENT_SHEET_NAMES,
        spreadsheetNames);

    return spreadsheetNames;
  }

  /** Returns all client sheet spreadsheet ids. */
  private static readStringArray(propertyName: string): string[] {
    const propertyValue =
        PropertiesService.getScriptProperties().getProperty(propertyName);
    if (!propertyValue) return [];

    try {
      const stringList = JSON.parse(propertyValue);
      if (stringList instanceof Array &&
          stringList.every(entry => typeof entry === 'string')) {
        return stringList;
      } else {
        throw new Error(`Stored ${propertyName} list has incorrect format: ${
            propertyValue}`);
      }
    } catch (e) {
      Logger.log(`Failure to parse stored ${propertyName} list.`);
      throw e;
    }
  }

  /** Returns all client sheet spreadsheet ids. */
  private static writeStringArray(propertyName: string, value: string[]) {
    PropertiesService.getScriptProperties().setProperty(
        propertyName, JSON.stringify(Array.from(value)));
  }
}
