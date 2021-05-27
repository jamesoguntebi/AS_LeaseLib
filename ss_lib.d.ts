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
        private readonly data;
        private readonly cellString;
        private readonly cellIsBlank;
        /**
         * @param rangeOrValue A range instance or a value retrieved from
         *     sheet.getSheetValues() or range.getValue()
         * @param cellString A description of the cell to use in error messages.
         */
        constructor(rangeOrValue: Range | any, cellString?: string);
        isBlank(): boolean;
        untypedData(): unknown;
        string(defaultValue?: string): string;
        stringOptional(): string | undefined;
        stringArray(): string[];
        number(defaultValue?: number): number;
        numberOptional(): number | undefined;
        date(includeTime?: boolean): Date;
        private static isDateValue;
    }
}
declare module "jas_spreadsheet" {
    import { CellData } from "jas_range";
    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
    export class JasSpreadsheet {
        static getSpreadsheet(spreadsheetId: string): Spreadsheet;
        static findSheet(name: string, spreadsheetId: string): Sheet;
        static createSheetCache(sheet: Sheet, row?: number, column?: number, numRows?: number, numColumns?: number): SheetCache;
        /**
         * Returns the index of the first matching row. Throws if not found or if
         * multiple are found.
         * @deprecated Prefer findRowInCache. Much faster.
         */
        static findRow(name: string, sheet: Sheet): number;
        /**
         * The same as findRow, but uses a SheetCache. Note that cache row and
         * column indices are 0-based.
         */
        static findRowInCache(name: string, cache: SheetCache): number;
        /**
         * Returns the index of the first matching column. Throws if not found or if
         * multiple are found.
         * @deprecated Prefer findColumnInCache. Much faster.
         */
        static findColumn(name: string, sheet: Sheet): number;
        /**
         * The same as findColumn, but uses a SheetCache. Note that cache row and
         * column indices are 0-based.
         */
        static findColumnInCache(name: string, cache: SheetCache): number;
    }
    export interface SheetCache {
        /** 2d array of CellDatas. */
        data: CellData[][];
        /** Last frozen column. */
        headerColumn: number;
        /** Last frozen row. */
        headerRow: number;
        /** Sheet name. */
        name: string;
    }
}
declare module "apihelper" {
    export { CellData, JasRange } from "jas_range";
    export { JasSpreadsheet } from "jas_spreadsheet";
}
declare module "jas_range_test" {
    import { JASLib } from 'jas_api';
    export default class JasRangeTest implements JASLib.Test {
        /** This is the Lease Spreadsheet Template. */
        private readonly spreadsheetId;
        run(t: JASLib.Tester): void;
    }
}
declare module "jas_spreadsheet_test" {
    import { JASLib } from 'jas_api';
    export default class JasSpreadsheetTest implements JASLib.Test {
        /** This is the Lease Spreadsheet Template. */
        private readonly spreadsheetId;
        run(t: JASLib.Tester): void;
    }
}
declare module "ss_api" {
    import * as SSLib from 'apihelper';
    export { SSLib };
}
declare module "testing/testrunner" {
    import { JASLib } from 'jas_api';
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
