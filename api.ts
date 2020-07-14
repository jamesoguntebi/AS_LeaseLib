import BalanceSheet from "./balance_sheet";
import EmailChecker from "./email_checker";
import { LibContext } from "./lib_context";
import ClientSheetManager from "./client_sheet_manager";
import TestRunner, { TestRunnerParams } from "./testing/testrunner";

const LEASE_TEMPLATE_SPREADSHEET_ID =
    '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

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
    EmailChecker.assertNoPendingThreads();
  });
}

export function template_maybeAddRentOrInterestTransaction() {
  _JasLibContext.spreadsheetId = LEASE_TEMPLATE_SPREADSHEET_ID;
  return Executrix.run(() => {
    BalanceSheet.maybeAddRentOrInterestTransaction();
  });
}

export function template_checkedLabeledEmails() {
  _JasLibContext.spreadsheetId = LEASE_TEMPLATE_SPREADSHEET_ID;
  return Executrix.run(() => {
    EmailChecker.checkedLabeledEmails();
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

export function runTests(params: TestRunnerParams | string = {}) {
  if (typeof params === 'string') {
    params = {testClassNames: params.split(',')};
  }
  return Executrix.run(() => TestRunner.run(params as TestRunnerParams));
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