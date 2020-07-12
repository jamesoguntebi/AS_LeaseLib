import BalanceSheet from "./balance_sheet";
import EmailChecker from "./email_checker";
import { LibContext } from "./lib_context";

const TestOnlySheetIds: Record<string, string> = {
  RENNA_LEASE: '162oDHkMXPc18AMOE-LHEFYcT5O0S19Sgtx32u7hnWQ4',
}

declare global {
  var _JasLibContext: LibContext;
}

export function maybeAddRentOrInterestTransaction(spreadsheetId: string) {

  return Executrix.run(spreadsheetId, 
      () => BalanceSheet.maybeAddRentOrInterestTransaction());
}

export function checkedLabeledEmails(spreadsheetId: string) {
  return Executrix.run(
      spreadsheetId, () => EmailChecker.checkedLabeledEmails());
}

export function testing(spreadsheetId: string) {
  return Executrix.run(spreadsheetId, () => ({result: 'testing'}));
}

class Executrix {
  static run(spreadsheetId: string, job: () => JobRun|void): string {
    _JasLibContext = {spreadsheetId};

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