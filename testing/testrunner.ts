import JasRangeTest from "../jas_range_test";
import { Tester } from "./tester";

export default class TestRunner {
  private static readonly LEASE_TEMPLATE_SPREADSHEET_ID =
      '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

  static run(spreadsheetId: string = TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID,
      verbose = false) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    const tests: Array<new() => Test> = [
      JasRangeTest,
    ];

    let successTotal = 0;
    let failureTotal = 0;
    const outputTotal = ['Testing...'];

    for (const testClass of tests) {
      const test = new testClass();
      const tester = new Tester();
      test.run(tester);
      const {successCount, failureCount, output} = tester.getTestResults();
      successTotal += successCount;
      failureTotal += failureCount;
      outputTotal.push('');
      outputTotal.push(
          `${test.name} -- ${TestRunner.getStats(successCount, failureCount)}`);
      if (failureCount || verbose) outputTotal.push(...output);
    }

    outputTotal.push('');
    outputTotal.push(
        `Total -- ${TestRunner.getStats(successTotal, failureTotal)}`);
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