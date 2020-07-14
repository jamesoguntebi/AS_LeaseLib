import JasRangeTest from "../jas_range_test";
import { Tester } from "./tester";
import JasSpreadsheetTest from "../jas_spreadsheet_test";
import EmailSenderTest from "../email_sender_test";
import EmailCheckerTest from "../email_checker_test";

export default class TestRunner {
  private static readonly LEASE_TEMPLATE_SPREADSHEET_ID =
      '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

  static run({
    spreadsheetId = TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID,
    verbose = true,
    testClassNames = undefined,
  }: TestRunnerParams) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    let testClasses: Array<new() => Test> = [
      EmailCheckerTest,
      // EmailSenderTest,
      // JasRangeTest,
      // JasSpreadsheetTest,
    ];

    if (testClassNames) {
      const testClassesSet = new Set(testClassNames);
      testClasses = testClasses.filter(tc => testClassesSet.has(tc.name));
      if (!testClasses.length) {
        throw new Error(`No tests found among ${testClassNames}`)
      }
    }

    let successTotal = 0;
    let failureTotal = 0;
    const outputTotal = ['Testing...\n'];
    const startTime = Date.now();

    for (const testClass of testClasses) {
      const testStartTime = Date.now();
      const test = new testClass();
      const tester = new Tester(verbose);
      test.run(tester);
      const {successCount, failureCount, output} = tester.getTestResults();
      successTotal += successCount;
      failureTotal += failureCount;
      const runTime = `(in ${Date.now() - testStartTime} ms)`;
      if (!failureCount) {
        outputTotal.push( `${test.name} ✓ ${runTime}`);
      } else {
        outputTotal.push(
            `${test.name} - ${failureCount} failures ${runTime}`);
      }
      if (failureCount || verbose) outputTotal.push(...output, '');
    }

    outputTotal.push('');
    outputTotal.push(
        `Total -- ${TestRunner.getStats(successTotal, failureTotal)} ` +
        `(in ${Date.now() - startTime} ms)`);
    outputTotal.push('');

    Logger.log(outputTotal.join('\n'));
  }
  
  private static getStats(success: number, failure: number): string {
    return `${success + failure} run, ${success} pass, ${failure} fail`;
  }
}

export interface Test {
  name: string;
  run: (t: Tester) => void;
}

export interface TestRunnerParams {
  spreadsheetId?: string;
  verbose?: boolean;
  testClassNames?: string[];
}