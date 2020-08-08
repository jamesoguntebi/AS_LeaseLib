import {Executrix} from './api';
import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import EmailChecker from './email_checker';

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
  }

  static onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
    Logger.log(`Handling open event for sheet '${
        e.range.getSheet().getName()}' in spreadsheet '${e.source.getName()}'`);
  }
}
