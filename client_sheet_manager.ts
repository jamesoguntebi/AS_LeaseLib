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
    const spreadsheetNames = ClientSheetManager.getOrCreateSpreadsheetNames();

    Logger.log(`Registered clients: ${
        JSON.stringify([...spreadsheetNames.values()])}`);

    for (const spreadsheetId of spreadsheetIds) {
      _JasLibContext.spreadsheetId = spreadsheetId;

      spreadsheetNames.set(
          spreadsheetId,
          SSLib.JasSpreadsheet.getSpreadsheet(spreadsheetId).getName());

      if (fn(spreadsheetId)) break;

      // Applies all pending Spreadsheet changes.
      SpreadsheetApp.flush();

      // Sleeping after each spreadsheet operation is likely unecessary. It's
      // a safeguard to prevent cross-talk between client sheets.
      Utilities.sleep(500);
    }

    ClientSheetManager.setSpreadsheetNames(spreadsheetNames);

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
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS,
        JSON.stringify(Array.from(registeredSet)));

    Logger.log(`Registered client sheet ${spreadsheetId}`);
  }

  static unregister(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (!registeredSet.has(spreadsheetId)) return;

    registeredSet.delete(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS,
        JSON.stringify(Array.from(registeredSet)));

    Triggers.updateOpenAndEditTriggers();

    Logger.log(`Unregistered client sheet ${spreadsheetId}`);
  }

  /** Returns all client sheet spreadsheet ids. */
  static getAll(): string[] {
    const propertyValue = PropertiesService.getScriptProperties().getProperty(
        ClientSheetManager.STORAGE_PROPERTIES.REGISTERED_CLIENTS);
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

  private static getOrCreateSpreadsheetNames(): Map<string, string> {
    let propertyValue = PropertiesService.getScriptProperties().getProperty(
        ClientSheetManager.STORAGE_PROPERTIES.CLIENT_SHEET_NAMES);
    if (!propertyValue) propertyValue = '[]';

    const fail = () => {
      throw new Error(`Malford client sheet name map: ${propertyValue}`);
    };

    let propertyJson = [];
    try {
      propertyJson = JSON.parse(propertyValue);
    } catch (e) {
      fail();
    }

    if (!Array.isArray(propertyJson)) fail();

    for (const mapEntry of propertyJson) {
      if (!Array.isArray(mapEntry)) fail();
      if (mapEntry.length !== 2 || typeof mapEntry[0] !== 'string' ||
          typeof mapEntry[1] !== 'string') {
        fail();
      }
    }

    return new Map(propertyJson as Array<[string, string]>);
  }

  private static setSpreadsheetNames(data: Map<string, string>) {
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.STORAGE_PROPERTIES.CLIENT_SHEET_NAMES,
        JSON.stringify([...data]));
  }
}
