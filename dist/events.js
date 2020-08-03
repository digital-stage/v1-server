"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEvents = exports.ClientEvents = void 0;
var ClientEvents;
(function (ClientEvents) {
})(ClientEvents = exports.ClientEvents || (exports.ClientEvents = {}));
var ServerEvents;
(function (ServerEvents) {
    ServerEvents["READY"] = "ready";
    ServerEvents["DEVICE_ADDED"] = "device-added";
    ServerEvents["DEVICE_CHANGED"] = "device-changed";
    ServerEvents["DEVICE_REMOVED"] = "device-removed";
})(ServerEvents = exports.ServerEvents || (exports.ServerEvents = {}));
//# sourceMappingURL=events.js.map