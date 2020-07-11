import BalanceSheet from "./balance_sheet";
import EmailChecker from "./email_checker";

export function maybeAddRentOrInterestTransaction() {
  return Executrix.run(() => BalanceSheet.maybeAddRentOrInterestTransaction());
}

export function checkedLabeledEmails() {
  return Executrix.run(() => EmailChecker.checkedLabeledEmails());
}

export function testing() {
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