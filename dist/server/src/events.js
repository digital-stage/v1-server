"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientStageEvents = exports.ServerStageEvents = exports.ClientDeviceEvents = exports.ServerDeviceEvents = void 0;
var ServerDeviceEvents;
(function (ServerDeviceEvents) {
    ServerDeviceEvents["LOCAL_DEVICE_READY"] = "local-device-ready";
    ServerDeviceEvents["DEVICE_ADDED"] = "device-added";
    ServerDeviceEvents["DEVICE_CHANGED"] = "device-changed";
    ServerDeviceEvents["DEVICE_REMOVED"] = "device-removed";
})(ServerDeviceEvents = exports.ServerDeviceEvents || (exports.ServerDeviceEvents = {}));
var ClientDeviceEvents;
(function (ClientDeviceEvents) {
    ClientDeviceEvents["UPDATE_DEVICE"] = "update-device";
})(ClientDeviceEvents = exports.ClientDeviceEvents || (exports.ClientDeviceEvents = {}));
var ServerStageEvents;
(function (ServerStageEvents) {
    ServerStageEvents["STAGE_READY"] = "stage-ready";
    ServerStageEvents["STAGE_LEFT"] = "stage-left";
    ServerStageEvents["STAGE_JOINED"] = "stage-joined";
    ServerStageEvents["STAGE_ADDED"] = "stage-added";
    ServerStageEvents["STAGE_CHANGED"] = "stage-changed";
    ServerStageEvents["STAGE_REMOVED"] = "stage-removed";
    ServerStageEvents["GROUP_ADDED"] = "group-added";
    ServerStageEvents["GROUP_CHANGED"] = "group-changed";
    ServerStageEvents["GROUP_REMOVED"] = "group-removed";
    ServerStageEvents["GROUP_MEMBER_ADDED"] = "group-member-added";
    ServerStageEvents["GROUP_MEMBER_CHANGED"] = "group-member-changed";
    ServerStageEvents["GROUP_MEMBER_REMOVED"] = "group-member-removed";
    ServerStageEvents["CUSTOM_GROUP_VOLUME_ADDED"] = "custom-group-volume-added";
    ServerStageEvents["CUSTOM_GROUP_VOLUME_CHANGED"] = "custom-group-volume-changed";
    ServerStageEvents["CUSTOM_GROUP_VOLUME_REMOVED"] = "custom-group-volume-removed";
    ServerStageEvents["CUSTOM_GROUP_MEMBER_VOLUME_ADDED"] = "custom-group-member-volume-added";
    ServerStageEvents["CUSTOM_GROUP_MEMBER_CHANGED"] = "custom-group-member-volume-changed";
    ServerStageEvents["CUSTOM_GROUP_MEMBER_REMOVED"] = "custom-group-member-volume-removed";
    ServerStageEvents["PRODUCER_ADDED"] = "producer-added";
    ServerStageEvents["PRODUCER_CHANGED"] = "producer-changed";
    ServerStageEvents["PRODUCER_REMOVED"] = "producer-removed";
})(ServerStageEvents = exports.ServerStageEvents || (exports.ServerStageEvents = {}));
var ClientStageEvents;
(function (ClientStageEvents) {
    ClientStageEvents["ADD_STAGE"] = "add-stage";
    ClientStageEvents["JOIN_STAGE"] = "join-stage";
    ClientStageEvents["LEAVE_STAGE"] = "leave-stage";
    ClientStageEvents["SET_CUSTOM_GROUP_VOLUME"] = "set-custom-group-volume";
    ClientStageEvents["SET_CUSTOM_GROUP_MEMBER_VOLUME"] = "set-custom-group-member-volume";
    ClientStageEvents["ADD_PRODUCER"] = "add-producer";
    ClientStageEvents["CHANGE_PRODUCER"] = "add-producer";
    ClientStageEvents["REMOVE_PRODUCER"] = "remove-producer";
    // Following shall be only possible if client is admin of stage
    ClientStageEvents["CHANGE_STAGE"] = "change-stage";
    ClientStageEvents["REMOVE_STAGE"] = "remove-stage";
    ClientStageEvents["ADD_GROUP"] = "add-group";
    ClientStageEvents["CHANGE_GROUP"] = "update-group";
    ClientStageEvents["REMOVE_GROUP"] = "remove-group";
    ClientStageEvents["CHANGE_GROUP_MEMBER"] = "update-group-member";
})(ClientStageEvents = exports.ClientStageEvents || (exports.ClientStageEvents = {}));
//# sourceMappingURL=events.js.map