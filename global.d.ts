/// <reference path="./jas_lib.d.ts" />
/// <reference path="./ss_lib.d.ts" />

interface LibContext {
  spreadsheetId: string;
}

declare let _JasLibContext: LibContext;

/** Whether a unit test is taking place. */
declare let UNIT_TESTING = false;
