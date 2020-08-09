import {JASLib} from 'jas_api';

import ClientSheetManager from './client_sheet_manager';
import Config from './config';
import {Menu, MenuItems} from './menu';
import Tester from './testing/tester';

export class MenuTest implements JASLib.Test {
  readonly name = 'MenuTest';

  run(t: Tester) {
    const FakeDialogButtons = {
      CANCEL: 'CANCEL',
      CLOSE: 'CLOSE',
      NO: 'NO',
      OK: 'OK',
      YES: 'YES',
    };
    const FakeDialogButtonSets = {
      OK_CANCEL: 'OK_CANCEL',
      OK: 'OK',
      YES_NO: 'YES_NO',
      YES_NO_CANCEL: 'YES_NO_CANCEL',
    };

    const fakePrompt = (button: string, responseText: string) => {
      t.spyOn(SpreadsheetApp, 'getUi').and.returnValue({
        prompt: () => ({
          getSelectedButton: () => button,
          getResponseText: () => responseText,
        }),
        Button: FakeDialogButtons,
        ButtonSet: FakeDialogButtonSets,
      });
    };

    const fakeAlert = (button: string) => {
      t.spyOn(SpreadsheetApp, 'getUi').and.returnValue({
        alert: () => button,
        Button: FakeDialogButtons,
        ButtonSet: FakeDialogButtonSets,
      });
    };

    t.describe('validateSpreadsheetId', () => {
      t.it('throws for ids with too many special symbols', () => {
        t.expect(
             () => Menu.validateSpreadsheetId(
                 '1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAT_lw'))
            .toThrow('insufficiently unique function suffix');

        t.expect(
             () => Menu.validateSpreadsheetId(
                 '1vtpuR1GuzuwT1o9j62xSZlhg6_HgvjZEDXL56GoLpFI'))
            .not.toThrow();
      });
    });

    t.describe('registerNewClientSheet', () => {
      const spreadsheetId = 'thanks for playing';
      t.beforeAll(() => t.spyOn(ClientSheetManager, 'register'));

      t.it('registers for completed prompt', () => {
        fakePrompt(FakeDialogButtons.OK, spreadsheetId);

        MenuItems.registerNewClientSheet();

        t.expect(ClientSheetManager.register)
            .toHaveBeenCalledWith(spreadsheetId);
      });

      t.it('does nothing for canceled prompt', () => {
        fakePrompt(FakeDialogButtons.CLOSE, spreadsheetId);
        MenuItems.registerNewClientSheet();
        t.expect(ClientSheetManager.register).not.toHaveBeenCalled();
      });

      t.it('does nothing for closed prompt', () => {
        fakePrompt(FakeDialogButtons.CLOSE, spreadsheetId);
        MenuItems.registerNewClientSheet();
        t.expect(ClientSheetManager.register).not.toHaveBeenCalled();
      });

      t.it('does nothing for empty spreadsheed id', () => {
        fakePrompt(FakeDialogButtons.OK, '');
        MenuItems.registerNewClientSheet();
        t.expect(ClientSheetManager.register).not.toHaveBeenCalled();
      });
    });

    t.describe('unregisterClientSheet', () => {
      const spreadsheetId = 'thanks for playing';

      t.beforeAll(() => {
        t.spyOn(ClientSheetManager, 'unregister');
        t.spyOn(SpreadsheetApp, 'openById').and.returnValue({
          removeMenu: () => {}
        });
      });

      t.it('unregisters for confirmed alert', () => {
        fakeAlert(FakeDialogButtons.OK);

        MenuItems.unregisterClientSheet(spreadsheetId);

        t.expect(ClientSheetManager.unregister)
            .toHaveBeenCalledWith(spreadsheetId);
        t.expect(SpreadsheetApp.openById).toHaveBeenCalledWith(spreadsheetId);
      });

      t.it('does nothing for canceled alert', () => {
        fakeAlert(FakeDialogButtons.CANCEL);
        MenuItems.unregisterClientSheet(spreadsheetId);
        t.expect(ClientSheetManager.unregister).not.toHaveBeenCalled();
        t.expect(SpreadsheetApp.openById).not.toHaveBeenCalled();
      });

      t.it('does nothing for closed alert', () => {
        fakeAlert(FakeDialogButtons.CLOSE);
        MenuItems.unregisterClientSheet(spreadsheetId);
        t.expect(ClientSheetManager.unregister).not.toHaveBeenCalled();
        t.expect(SpreadsheetApp.openById).not.toHaveBeenCalled();
      });
    });

    t.describe('registerPerClientFunctions', () => {
      const suffix = Menu.spreadsheetIdToFunctionSuffix(
          TestData.LEASE_TEMPLATE_SPREADSHEET_ID);
      // The script registers the functions when it is interpreted. It requires
      // no call. This test relies on the configured menu items in menu.ts.

      t.it('registers spreadsheet-agnostic items', () => {
        t.expect(typeof globalThis['menu_registerNewClientSheet'])
            .toEqual('function');
        t.expect(globalThis[`menu_registerNewClientSheet${suffix}`])
            .toBeUndefined();
      });

      t.it('registers per-spreadsheet items', () => {
        t.expect(typeof globalThis[`menu_updateStatusCell${suffix}`])
            .toEqual('function');
        t.expect(globalThis['menu_updateStatusCell']).toBeUndefined();
      });
    });

    t.describe('validateConfig', () => {
      const fakeSpreadsheetUi = {
        alert: (_: string) => {},
      };

      t.beforeAll(() => {
        t.spyOn(fakeSpreadsheetUi, 'alert');
        t.spyOn(SpreadsheetApp, 'getUi').and.returnValue(fakeSpreadsheetUi);
      });

      t.it('shows correct alert for valid config', () => {
        t.setConfig(Config.DEFAULT);
        MenuItems.validateConfig('unused-sheet-id');
        t.expect(fakeSpreadsheetUi.alert)
            .toHaveBeenCalledWith('Config is valid!');
      });

      t.it('shows correct alert for invalid config', () => {
        t.spyOn(Config, 'get').and.callFake(() => {
          throw new Error('Invalid config');
        });
        MenuItems.validateConfig('unused-sheet-id');

        t.expect(fakeSpreadsheetUi.alert)
            .toHaveBeenCalledLike(t.matcher((args: unknown[]) => {
              return (args[0] as string).startsWith('Config is not valid!');
            }));
      });
    });
  }
}
