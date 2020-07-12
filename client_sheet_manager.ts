export default class ClientSheetManager {
  private static readonly PROPERTY_NAME = 'REGISTERED_CLIENTS';

  /**
   * Sets each registered spreadhsheet as the current spreadsheet in the library
   * context, calling the callback each time.
   * @param fn 
   */
  static forEach(fn: (_: string) => void) {
    for (const spreadsheetId of ClientSheetManager.getAll()) {
      _JasLibContext.spreadsheetId = spreadsheetId;
      fn(spreadsheetId);
      SpreadsheetApp.flush();
      // Sleeping after each spreadsheet operation is likely unecessary. It's
      // a safeguard to prevent cross-talk between client sheets.
      Utilities.sleep(2000);
    }
  }

  static register(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    registeredSet.add(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));
  }

  static unregister(spreadsheetId: string) {
    const registeredSet = new Set(ClientSheetManager.getAll());
    registeredSet.delete(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty(
        ClientSheetManager.PROPERTY_NAME,
        JSON.stringify(Array.from(registeredSet)));
  }

  private static getAll(): RegisteredClientsValue {
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
    return [];
  }
}

type RegisteredClientsValue = string[];