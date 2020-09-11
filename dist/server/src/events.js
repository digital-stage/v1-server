"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEvents = exports.ClientEvents = void 0;
var ClientEvents;
(function (ClientEvents) {
})(ClientEvents = exports.ClientEvents || (exports.ClientEvents = {}));
var ServerEvents;
(function (ServerEvents) {
    ServerEvents["INIT"] = "init";
    ServerEvents["READY"] = "ready";
    ServerEvents["STAGE_CHANGED"] = "stage-changed";
    ServerEvents["GROUP_CHANGED"] = "group-changed";
    ServerEvents["USER_CHANGED"] = "user-changed";
})(ServerEvents = exports.ServerEvents || (exports.ServerEvents = {}));
//# sourceMappingURL=events.js.map