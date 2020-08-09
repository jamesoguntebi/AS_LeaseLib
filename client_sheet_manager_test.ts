import {JASLib} from 'jas_api'

import BalanceSheet from './balance_sheet';
import ClientSheetManager from './client_sheet_manager';
import Config from './config';
import {Menu} from './menu';
import Tester from './testing/tester';
import {Triggers} from './triggers';

export default class ClientSheetManagerTest implements JASLib.Test {
  readonly name = 'ClientSheetManagerTest';

  private expectRegisteredCount(t: Tester, expected: number) {
    let count = 0;
    ClientSheetManager.forEach(() => void count++);
    t.expect(count).toEqual(expected);
  }

  run(t: Tester) {
    let forceConfigSheetInvalid = false;
    let forceBalanceSheetInvalid = false;
    let forceMenuIdCheckInvalid = false;

    t.beforeAll(() => {
      t.spyOn(Config, 'get').and.callFake(() => {
        if (forceConfigSheetInvalid) throw new Error('Config is invalid');
      });
      t.spyOn(BalanceSheet, 'validateActiveSheet').and.callFake(() => {
        if (forceBalanceSheetInvalid) {
          throw new Error('Balance sheet is invalid');
        }
      });
      t.spyOn(Menu, 'validateSpreadsheetId').and.callFake(() => {
        if (forceMenuIdCheckInvalid) {
          throw new Error('Menu says spreadsheet id is invalid');
        }
      });
      t.spyOn(SpreadsheetApp, 'flush');
      t.spyOn(Utilities, 'sleep');
      t.spyOn(Triggers, 'installForClientSheet');
      t.spyOn(Triggers, 'updateOpenAndEditTriggers');
    });

    t.beforeEach(() => {
      const fakeProperties = new JASLib.FakeProperties();
      t.spyOn(PropertiesService, 'getScriptProperties')
          .and.callFake(() => fakeProperties);
    });

    t.describe('regsiter', () => {
      t.beforeEach(() => this.expectRegisteredCount(t, 0));

      t.it('registers valid spreadsheets', () => {
        forceConfigSheetInvalid = false;
        forceBalanceSheetInvalid = false;
        forceMenuIdCheckInvalid = false;
        ClientSheetManager.register('sheet-id');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.installForClientSheet).toHaveBeenCalled();
      });

      t.it('skips a spreadsheet with an invalid config', () => {
        forceConfigSheetInvalid = true;
        forceBalanceSheetInvalid = false;
        forceMenuIdCheckInvalid = false;
        ClientSheetManager.register('sheet-id');
        this.expectRegisteredCount(t, 0);
        t.expect(Triggers.installForClientSheet).not.toHaveBeenCalled();
      });

      t.it('skips a spreadsheet with an invalid balance sheet', () => {
        forceConfigSheetInvalid = false;
        forceBalanceSheetInvalid = true;
        forceMenuIdCheckInvalid = false;
        ClientSheetManager.register('sheet-id');
        this.expectRegisteredCount(t, 0);
        t.expect(Triggers.installForClientSheet).not.toHaveBeenCalled();
      });

      t.it(
          'skips a spreadsheet with an invalid id (for menu registration)',
          () => {
            forceConfigSheetInvalid = false;
            forceBalanceSheetInvalid = false;
            forceMenuIdCheckInvalid = true;
            ClientSheetManager.register('sheet-id');
            this.expectRegisteredCount(t, 0);
            t.expect(Triggers.installForClientSheet).not.toHaveBeenCalled();
          });

      t.it('skips an already registered spreadsheet', () => {
        forceConfigSheetInvalid = false;
        forceBalanceSheetInvalid = false;
        forceMenuIdCheckInvalid = false;
        ClientSheetManager.register('sheet-id');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.installForClientSheet).toHaveBeenCalledTimes(1);

        ClientSheetManager.register('sheet-id');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.installForClientSheet).toHaveBeenCalledTimes(1);
      });
    });

    t.describe('unregsiter', () => {
      t.beforeEach(() => {
        forceConfigSheetInvalid = false;
        forceBalanceSheetInvalid = false;
        ClientSheetManager.register('sheet-1');
        ClientSheetManager.register('sheet-2');
        this.expectRegisteredCount(t, 2);
      });

      t.it('unregisters existing spreadsheets', () => {
        ClientSheetManager.unregister('sheet-1');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.updateOpenAndEditTriggers).toHaveBeenCalled();
      });

      t.it('skips unknown spreadsheets', () => {
        ClientSheetManager.unregister('some unknown spreadsheet');
        this.expectRegisteredCount(t, 2);
        t.expect(Triggers.updateOpenAndEditTriggers).not.toHaveBeenCalled();
      });

      t.it('skips already unregistered spreadsheets', () => {
        ClientSheetManager.unregister('sheet-1');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.updateOpenAndEditTriggers).toHaveBeenCalledTimes(1);

        ClientSheetManager.unregister('sheet-1');
        this.expectRegisteredCount(t, 1);
        t.expect(Triggers.updateOpenAndEditTriggers).toHaveBeenCalledTimes(1);
      });
    });

    t.describe('forEach', () => {
      const eachFn = () => {};
      const observer = {eachFn};

      t.beforeEach(() => {
        forceConfigSheetInvalid = false;
        forceBalanceSheetInvalid = false;
        ClientSheetManager.register('sheet-1');
        ClientSheetManager.register('sheet-2');
        ClientSheetManager.register('sheet-3');

        t.spyOn(observer, 'eachFn');
      });

      t.it('touches every registered sheet', () => {
        ClientSheetManager.forEach(observer.eachFn);
        t.expect(observer.eachFn).toHaveBeenCalledTimes(3);
        t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-1');
        t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-2');
        t.expect(observer.eachFn).toHaveBeenCalledWith('sheet-3');
      });

      t.it('flushes each sheet', () => {
        ClientSheetManager.forEach(eachFn);
        t.expect(SpreadsheetApp.flush).toHaveBeenCalledTimes(3);
      });

      t.it('sleeps after every sheet', () => {
        ClientSheetManager.forEach(eachFn);
        t.expect(Utilities.sleep).toHaveBeenCalledTimes(3);
      });

      t.it('bails early', () => {
        const bailEarlyFn = (spreadsheetId: string) =>
            spreadsheetId.endsWith('2');
        const bailEarlyObserver = {bailEarlyFn};
        t.spyOn(bailEarlyObserver, 'bailEarlyFn').and.callThrough();

        ClientSheetManager.forEach(bailEarlyObserver.bailEarlyFn);
        t.expect(bailEarlyObserver.bailEarlyFn).toHaveBeenCalledTimes(2);
      });
    });
  }
}
