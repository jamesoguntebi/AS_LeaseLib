/// <reference types="google-apps-script" />
declare module "jas_range" {
    type Range = GoogleAppsScript.Spreadsheet.Range;
    export class JasRange {
        /**
         * Returns A1 notation for a range, including the sheet name, with fixed row
         * and fixed column.
         */
        static getFixedA1Notation(range: Range): string;
    }
    export class CellData {
        private range;
        private readonly data;
        constructor(range: Range);
        isBlank(): boolean;
        string(): string;
        stringOptional(): string | undefined;
        stringArray(): string[];
        number(): number;
        date(includeTime?: boolean): Date;
        private getCellString;
        private static isDateValue;
    }
}
declare module "jas_spreadsheet" {
    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
    export class JasSpreadsheet {
        static getSpreadsheet(spreadsheetId: string): Spreadsheet;
        static findSheet(name: string, spreadsheetId: string): Sheet;
        /**
         * Returns the index of the first matching row. Throws if not found or if
         * multiple are found.
         */
        static findRow(name: string, sheet: Sheet): number;
        /**
         * Returns the index of the first matching column. Throws if not found or if
         * multiple are found.
         */
        static findColumn(name: string, sheet: Sheet): number;
    }
}
declare module "apihelper" {
    export { JasRange, CellData } from "jas_range";
    export { JasSpreadsheet } from "jas_spreadsheet";
}
declare module "jas_range_test" {
    import { JASLib } from "jas_api";
    export default class JasRangeTest implements JASLib.Test {
        readonly name = "JasRangeTest";
        /** This is the Lease Spreadsheet Template. */
        private readonly spreadsheetId;
        run(t: JASLib.Tester): void;
    }
}
declare module "jas_spreadsheet_test" {
    import { JASLib } from "jas_api";
    export default class JasSpreadsheetTest implements JASLib.Test {
        readonly name = "JasSpreadsheetTest";
        /** This is the Lease Spreadsheet Template. */
        private readonly spreadsheetId;
        run(t: JASLib.Tester): void;
    }
}
declare module "ss_api" {
    import * as SSLib from "apihelper";
    export { SSLib };
}
declare module "testing/testrunner" {
    import { JASLib } from "jas_api";
    export function runTests(params?: TestRunnerOptions | string): string;
    export function runTestsAndHideSuccesses(params?: TestRunnerOptions | string): string;
    export function runTestsWithLogs(params?: TestRunnerOptions | string): string;
    export default class TestRunner {
        static run({ suppressLogs, showSuccesses, testClassNames, }: TestRunnerOptions): void;
    }
    interface TestRunnerOptions extends JASLib.TestRunnerOptions {
        testClassNames?: string[];
    }
}
