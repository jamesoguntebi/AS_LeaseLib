import {JASLib} from 'jas_api';
import Tester from './testing/tester';

export class IntegrationTest implements JASLib.Test {
  run(t: Tester) {
    t.describe('doDailyUpdate', () => {
      t.it('works', () => {});
    });
  }
}
