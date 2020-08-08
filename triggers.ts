import {Executrix} from './api';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import EmailChecker from './email_checker';
import Config from './config';

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

export function trigger_testing() {
  Logger.log('Trigger testing');
}

export class Triggers {
  static updateOpenAndEditTriggers() {
    for (const trigger of ScriptApp.getScriptTriggers()) {
      if (trigger.getEventType() === ScriptApp.EventType.ON_EDIT ||
          trigger.getEventType() === ScriptApp.EventType.ON_OPEN) {
        Logger.log(`Deleting trigger with id: ${trigger.getUniqueId()}`);
        ScriptApp.deleteTrigger(trigger);
      }
    }

    const spreadsheetIds = ClientSheetManager.getAll();

    for (const spreadSheetId of spreadsheetIds) {
      ScriptApp.newTrigger('trigger_onEdit')
          .forSpreadsheet(spreadSheetId)
          .onEdit()
          .create();
      ScriptApp.newTrigger('trigger_onOpen')
          .forSpreadsheet(spreadSheetId)
          .onOpen()
          .create();
    }

    Logger.log(`Installed open and edit triggers for ${
        spreadsheetIds.length} client sheets.`);
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
    e.source.addMenu(
        'testing', [{name: 'test 1', functionName: 'trigger_testing'}]);
  }

  static onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
    const sheetName = e.range.getSheet().getName();
    Logger.log(`Handling open event for sheet '${
        sheetName}' in spreadsheet '${e.source.getName()}'`);
    
    if (sheetName === Config.SHEET_NAME) {
      Debouncer.debounce(`${e.source.getId()}-${sheetName}`,
          10000, Triggers.debouncedConfigCheck.bind(null, e.source.getId()));
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
}

class Debouncer {
  // JAS - Lease Lib - Debounce - Keys
  private static readonly PROPERTY_NAME = 'jas_ll_d_k';

  static debounce(key: string, delayMs: number, fn: (this: void) => void) {
    const data = Debouncer.getOrCreateProperty();
    const startTime = Date.now();
    data.set(key, startTime);
    Debouncer.setProperty(data);

    Utilities.sleep(delayMs);

    const dataLater = Debouncer.getOrCreateProperty();
    if (dataLater.get(key) === startTime) {
      fn();
      Debouncer.setProperty(data);
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
      if (
        mapEntry.length !== 2 ||
        typeof mapEntry[0] !== 'string' ||
        typeof mapEntry[1] !== 'number'
      ) {
        fail();
      }
    }

    return new Map(propertyJson as Array<[string, number]>);
  }

  private static setProperty(data: DebouncerData) {
    PropertiesService.getScriptProperties().setProperty(
      Debouncer.PROPERTY_NAME,
      JSON.stringify([...data])
    );
  }
}

type DebouncerData = Map<string, number>;