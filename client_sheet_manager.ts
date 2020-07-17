import Config from "./config";
import BalanceSheet from "./balance_sheet";

export default class ClientSheetManager {
  private static readonly PROPERTY_NAME = 'REGISTERED_CLIENTS';

  /**
   * Sets each registered spreadhsheet as the current spreadsheet in the library
   * context, calling the callback each time.
   * @param fn 
   */
  static forEach(fn: (_: string) => void) {
    const storedSpreadsheetId = _JasLibContext.spreadsheetId;

    const spreadsheetIds = ClientSheetManager.getAll();
    Logger.log(`Registered clients: ${JSON.stringify(spreadsheetIds)}`);
    for (const spreadsheetId of spreadsheetIds) {
      _JasLibContext.spreadsheetId = spreadsheetId;
      fn(spreadsheetId);
      SpreadsheetApp.flush();
      // Sleeping after each spreadsheet operation is likely unecessary. It's
      // a safeguard to prevent cross-talk between client sheets.
      Utilities.sleep(500);
    }

    _JasLibContext.spreadsheetId = storedSpreadsheetId;
  }

  static register(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (registeredSet.has(spreadsheetId)) return;

    const storedSpreadsheetId = _JasLibContext.spreadsheetId;

    try {
      _JasLibContext.spreadsheetId = spreadsheetId;
      Config.get(); // This will validate that the Config sheet.
      BalanceSheet.validateActiveSheet();
    } catch (e) {
      Logger.log('Validation of new sheet failed with error:');
      Logger.log(e instanceof Error ? e.stack || e.message : 'Unknown error');
      return;
    } finally {
      _JasLibContext.spreadsheetId = storedSpreadsheetId;
    }

    registeredSet.add(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));

    Logger.log(`Library added client sheet ${spreadsheetId}`);
  }

  static unregister(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    if (!registeredSet.has(spreadsheetId)) return;
    
    registeredSet.delete(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));

    Logger.log(`Library is removing client sheet ${spreadsheetId}`);
  }

  private static getAll(): string[] {
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