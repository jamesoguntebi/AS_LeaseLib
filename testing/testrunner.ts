import BalanceSheetTest from "../balance_sheet_test";
import EmailSenderTest from "../email_sender_test";
import EmailCheckerTest from "../email_checker_test";
import ConfigTest from "../config_test";
import JasRangeTest from "../jas_range_test";
import JasSpreadsheetTest from "../jas_spreadsheet_test";
import Tester from "./tester";
import ClientSheetManagerTest from "../client_sheet_manager_test";
import { JASLib } from "jas_api"

export function runTests(params: TestRunnerOptions | string = {}) {
  if (typeof params === 'string') {
    params = {testClassNames: params.split(',')};
  }
  TestRunner.run(params as TestRunnerOptions);
  return Logger.getLog();
}

export function runTestsAndHideSuccesses(
    params: TestRunnerOptions | string = {}) {
  if (typeof params === 'string') {
    params = {testClassNames: params.split(',')};
  }
  params.showSuccesses = false;
  TestRunner.run(params as TestRunnerOptions);
  return Logger.getLog();
}

export function runTestsWithLogs(params: TestRunnerOptions | string = {}) {
  if (typeof params === 'string') {
    params = {testClassNames: params.split(',')};
  }
  params.suppressLogs = false;
  TestRunner.run(params as TestRunnerOptions);
  return Logger.getLog();
}

export default class TestRunner {
  private static readonly LEASE_TEMPLATE_SPREADSHEET_ID =
      '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw';

  static run({
    spreadsheetId = TestRunner.LEASE_TEMPLATE_SPREADSHEET_ID,
    suppressLogs = true,
    showSuccesses = true,
    testClassNames = undefined,
  }: TestRunnerOptions) {
    _JasLibContext.spreadsheetId = spreadsheetId;

    let testClasses: Array<new() => JASLib.Test> = [
      BalanceSheetTest,
      ClientSheetManagerTest,
      ConfigTest,
      EmailCheckerTest,
      EmailSenderTest,
      JasRangeTest,
      JasSpreadsheetTest,
    ];

    if (testClassNames) {
      const testClassesSet = new Set(testClassNames);
      testClasses = testClasses.filter(tc => testClassesSet.has(tc.name));
      if (!testClasses.length) {
        throw new Error(`No tests found among ${testClassNames}`)
      }
    }

    const tests = testClasses.map(tc => new tc());

    JASLib.TestRunner.run(tests,
        {suppressLogs, showSuccesses, testerClass: Tester});
  }
}

interface TestRunnerOptions extends JASLib.TestRunnerOptions {
  spreadsheetId?: string;
  testClassNames?: string[];
}