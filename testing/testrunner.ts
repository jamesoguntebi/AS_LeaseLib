import JasRangeTest from "../jas_range_test";
import { Tester } from "./tester";
import JasRange from "../jas_range";

export default class TestRunner {
  private static readonly LEASE_TEMPLATE_SPREADSHEET_ID =
      '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

  static run(spreadsheetId: string = TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    const tests: Test[] = [
      new JasRangeTest(),
    ];

    for (const test of tests) {
      Logger.log('\n\n');
      const tester = new Tester();
      test.run(tester);
      Logger.log(tester.getTestResults());
    }
  }
}

export interface Test {
  run: (t: Tester) => void;
}