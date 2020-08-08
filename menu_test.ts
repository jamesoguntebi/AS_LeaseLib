import {JASLib} from 'jas_api';

import {Menu} from './menu';
import Tester from './testing/tester';

export class MenuTest implements JASLib.Test {
  readonly name = 'MenuTest';

  run(t: Tester) {
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
  }
}
