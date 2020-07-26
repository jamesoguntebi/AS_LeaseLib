"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var config_1 = require("../config");
var jas_api_1 = require("jas_api");
var Tester = /** @class */ (function (_super) {
    __extends(Tester, _super);
    function Tester() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Tester.prototype.setConfig = function (config) {
        var spy = jas_api_1.JASLib.Spy.isSpy(config_1["default"].get) ?
            jas_api_1.JASLib.Spy.assertSpy(config_1["default"].get) : this.spyOn(config_1["default"], 'get');
        spy.and.returnValue(config);
    };
    return Tester;
}(jas_api_1.JASLib.Tester));
exports["default"] = Tester;
