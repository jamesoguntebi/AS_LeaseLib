import Config, { ConfigParams } from '../config';
import { JASLib } from "jas_api"

export default class Tester extends JASLib.Tester {
  setConfig(config: ConfigParams) {
    const spy = JASLib.Spy.isSpy(Config.get) ?
        JASLib.Spy.assertSpy(Config.get) : this.spyOn(Config, 'get');
    spy.and.returnValue(config);
  }
}