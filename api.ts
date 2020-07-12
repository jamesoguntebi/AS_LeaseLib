import BalanceSheet from "./balance_sheet";
import EmailChecker from "./email_checker";
import { LibContext } from "./lib_context";
import ClientSheetManager from "./client_sheet_manager";

const TestOnlySheetIds: Record<string, string> = {
  RENNA_LEASE: '162oDHkMXPc18AMOE-LHEFYcT5O0S19Sgtx32u7hnWQ4',
}

declare global {
  var _JasLibContext: LibContext;
}

_JasLibContext = {spreadsheetId: ''};

export function maybeAddRentOrInterestTransaction() {
  return Executrix.run(() => {
    ClientSheetManager.forEach(BalanceSheet.maybeAddRentOrInterestTransaction);
  });
}

export function checkedLabeledEmails() {
  return Executrix.run(() => {
    ClientSheetManager.forEach(EmailChecker.checkedLabeledEmails);
  });
}

export function registerClientSheet(spreadsheetId: string) {
  return Executrix.run(
      () => ClientSheetManager.register(spreadsheetId));
}

export function unregisterClientSheet(spreadsheetId: string) {
  return Executrix.run(
      () => ClientSheetManager.unregister(spreadsheetId));
}

export function testing(spreadsheetId: string) {
  _JasLibContext.spreadsheetId = spreadsheetId;
  return Executrix.run(() => ({result: 'testing'}));
}

class Executrix {
  static run(job: () => JobRun|void): string {

    const start = Date.now();
    const jobRun = job();

    Logger.log(`Runtime: ${Date.now() - start} ms`);
    let resultString = Logger.getLog();

    if (jobRun && jobRun.result) {
      resultString = `Result: ${jobRun.result}\n\n${resultString}`;
    }

    return '\n' + resultString;
  }
}

interface JobRun {
  result?: any;
}