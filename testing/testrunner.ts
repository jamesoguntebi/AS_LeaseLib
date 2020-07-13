import JasRangeTest from "../jas_range_test";
import { Tester } from "./tester";
import JasSpreadsheetTest from "../jas_spreadsheet_test";

export default class TestRunner {
  private static readonly LEASE_TEMPLATE_SPREADSHEET_ID =
      '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

  static run({
      spreadsheetId = TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID,
      verbose = false,
      testClassNames = undefined,
  }: TestRunnerParams) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    Logger.log({testClassNames});

    let testClasses: Array<new() => Test> = [
      JasRangeTest,
      JasSpreadsheetTest,
    ];

    if (testClassNames) {
      const testClassesSet = new Set(testClassNames);
      testClasses = testClasses.filter(tc => testClassesSet.has(tc.name));
    }

    if (!testClasses.length) {
      throw new Error(`No tests found among ${testClassNames}`)
    }

    let successTotal = 0;
    let failureTotal = 0;
    const outputTotal = ['Testing...\n'];

    for (const testClass of testClasses) {
      const test = new testClass();
      const tester = new Tester(verbose);
      test.run(tester);
      const {successCount, failureCount, output} = tester.getTestResults();
      successTotal += successCount;
      failureTotal += failureCount;
      outputTotal.push(
          `${test.name} -- ${Tester.getStats(successCount, failureCount)}`);
      if (failureCount || verbose) outputTotal.push(...output, '');
    }

    outputTotal.push('');
    outputTotal.push(
        `Total -- ${Tester.getStats(successTotal, failureTotal)}`);
    outputTotal.push('');

    Logger.log(outputTotal.join('\n'));
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