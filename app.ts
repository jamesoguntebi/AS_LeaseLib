import BalanceSheet from "./balance_sheet";

export function maybeAddRentDueTransaction() {
  return Executrix.run(() => BalanceSheet.maybeAddRentDue());
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