import {Executrix} from './api';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config from './config';
import EmailChecker from './email_checker';
import {Menu} from './menu';

export function updateOpenAndEditTriggers() {
  return Executrix.run(() => Triggers.updateOpenAndEditTriggers());
}

export function updateClockTriggers() {
  return Executrix.run(() => Triggers.updateClockTriggers());
}

export function trigger_onOpen(e: GoogleAppsScript.Events.SheetsOnOpen) {
  return Executrix.run(() => Triggers.onOpen(e));
}

export function trigger_onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  return Executrix.run(() => Triggers.onEdit(e));
}

export function dailyBalanceUpdate() {
  return Executrix.run(() => {
    ClientSheetManager.forEach(BalanceSheet.dailyUpdate);
  });
}

export function routineCheckLabeledEmails() {
  return Executrix.run(() => EmailChecker.checkLabeledEmailsForAllSheets());
}

/**
 * Programmatically handles triggers. See them in the web ui at:
 * https://script.google.com/home/triggers
 *
 * Writing Tests for this is tricky because it would require either
 * a) Faking the entire Trigger API to provide fake but meaningful data.
 * b) Temporarily storing real triggers and the replacing them after the test.
 */
export class Triggers {
  private static readonly ON_EDIT_TRIGGERS_ENABLED = false;

  static updateOpenAndEditTriggers() {
    for (const trigger of ScriptApp.getScriptTriggers()) {
      if (trigger.getEventType() === ScriptApp.EventType.ON_EDIT ||
          trigger.getEventType() === ScriptApp.EventType.ON_OPEN) {
        Logger.log(`Deleting trigger with id: ${trigger.getUniqueId()}`);
        ScriptApp.deleteTrigger(trigger);
      }
    }

    const spreadsheetIds = ClientSheetManager.getAll();

    for (const spreadsheetId of spreadsheetIds) {
      Triggers.installForClientSheet(spreadsheetId);
    }

    Logger.log(`Installed open and edit triggers for ${
        spreadsheetIds.length} client sheets.`);
  }

  static installForClientSheet(spreadsheetId: string) {
    if (Triggers.ON_EDIT_TRIGGERS_ENABLED) {
      ScriptApp.newTrigger('trigger_onEdit')
          .forSpreadsheet(spreadsheetId)
          .onEdit()
          .create();
    }

    ScriptApp.newTrigger('trigger_onOpen')
        .forSpreadsheet(spreadsheetId)
        .onOpen()
        .create();
  }

  static updateClockTriggers() {
    for (const trigger of ScriptApp.getScriptTriggers()) {
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
        Logger.log(`Deleting trigger with id: ${trigger.getUniqueId()}`);
        ScriptApp.deleteTrigger(trigger);
      }
    }

    ScriptApp.newTrigger('routineCheckLabeledEmails')
        .timeBased()
        .everyMinutes(5)
        .create();
    Logger.log(`Installed trigger for routineCheckLabeledEmails.`);

    ScriptApp.newTrigger('dailyBalanceUpdate')
        .timeBased()
        .everyDays(1)
        .atHour(0)
        .nearMinute(15)  // Window is 15 minutes, we want to be >0.
        .create();
    Logger.log(`Installed trigger for dailyBalanceUpdate.`);
  }

  static onOpen(e: GoogleAppsScript.Events.SheetsOnOpen) {
    Logger.log(`Handling open event for spreadsheet '${e.source.getName()}'`);
    Menu.install(e.source);
  }

  static onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
    const spreadsheetId = e.source.getId();
    let sheetName = e.range.getSheet().getName();
    Logger.log(`Handling edit event for sheet '${sheetName}' in spreadsheet '${
        e.source.getName()}'`);

    sheetName = sheetName.toLowerCase().trim();

    const debounceKey = `${spreadsheetId}-${sheetName}`;
    if (sheetName === Config.SHEET_NAME.toLowerCase()) {
      Logger.log('Asking to debounce on config sheet.');
      Debouncer.debounce(
          debounceKey, 4000,
          () => Triggers.debouncedConfigCheck(spreadsheetId));
    } else if (sheetName === BalanceSheet.SHEET_NAME.toLowerCase()) {
      Debouncer.debounce(
          debounceKey, 4000,
          () => Triggers.debouncedStatusCellUpdate(spreadsheetId));
    }
  }

  private static debouncedConfigCheck(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    try {
      Config.get();
      Logger.log('Config is valid.');
    } catch (e) {
      Logger.log('Config is invalid.');
    }
  }

  private static debouncedStatusCellUpdate(spreadsheetId: string) {
    _JasLibContext.spreadsheetId = spreadsheetId;
    BalanceSheet.updateStatusCell();
  }
}

class Debouncer {
  // JAS - Lease Lib - Debounce - Keys
  private static readonly PROPERTY_NAME = 'jas_ll_d_k';

  static debounce(key: string, delayMs: number, fn: (this: void) => void) {
    if (delayMs < 3000) {
      throw new Error('Debouncing requires a delay of at least 3 seconds.');
    }

    const data = Debouncer.getOrCreateProperty();
    const startTime = Date.now();
    data.set(key, startTime);
    Debouncer.setProperty(data);

    Utilities.sleep(delayMs);

    const dataLater = Debouncer.getOrCreateProperty();
    Logger.log('dataLater: ' + JSON.stringify([...dataLater]));
    if (dataLater.get(key) === startTime) {
      Logger.log('Firing call.');
      fn();
      dataLater.delete(key);
      Debouncer.setProperty(dataLater);
    } else {
      Logger.log('Call debounced.')
    }
  }

  private static getOrCreateProperty(): DebouncerData {
    let propertyValue = PropertiesService.getScriptProperties().getProperty(
        Debouncer.PROPERTY_NAME);
    if (!propertyValue) propertyValue = '[]';

    const fail = () => {
      throw new Error(`Malford debouncer data: ${propertyValue}`);
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
          typeof mapEntry[1] !== 'number') {
        fail();
      }
    }

    return new Map(propertyJson as Array<[string, number]>);
  }

  private static setProperty(data: DebouncerData) {
    PropertiesService.getScriptProperties().setProperty(
        Debouncer.PROPERTY_NAME, JSON.stringify([...data]));
  }
}

type DebouncerData = Map<string, number>;
