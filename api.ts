import BalanceSheet from './balance_sheet';
import EmailChecker from './email_checker';

_JasLibContext = {
  spreadsheetId: ''
};

export function template_dailyBalanceUpdate() {
  _JasLibContext.spreadsheetId = TestData.LEASE_TEMPLATE_SPREADSHEET_ID;
  return Executrix.run(() => BalanceSheet.dailyUpdate());
}

export function template_checkLabeledEmails() {
  _JasLibContext.spreadsheetId = TestData.LEASE_TEMPLATE_SPREADSHEET_ID;
  return Executrix.run(() => {
    EmailChecker.checkLabeledEmails();
  });
}

export function testing(spreadsheetId: string) {
  _JasLibContext.spreadsheetId = spreadsheetId;
  return Executrix.run(() => ({result: 'testing'}));
}

export class Executrix {
  static run(job: () => JobRun | void): string {
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
