"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseEvents = void 0;
var DatabaseEvents;
(function (DatabaseEvents) {
    // User
    DatabaseEvents["UserAdded"] = "user-added";
    DatabaseEvents["UserChanged"] = "user-changed";
    DatabaseEvents["UserRemoved"] = "user-removed";
    // Device
    DatabaseEvents["DeviceAdded"] = "device-added";
    DatabaseEvents["DeviceChanged"] = "device-changed";
    DatabaseEvents["DeviceRemoved"] = "device-removed";
    // Producer
    DatabaseEvents["ProducerAdded"] = "producer-added";
    DatabaseEvents["ProducerChanged"] = "producer-changed";
    DatabaseEvents["ProducerRemoved"] = "producer-removed";
    // Stage
    DatabaseEvents["StageAdded"] = "stage-added";
    DatabaseEvents["StageChanged"] = "stage-changed";
    DatabaseEvents["StageRemoved"] = "stage-removed";
    // Stage Members
    DatabaseEvents["StageMemberAdded"] = "stage-member-added";
    DatabaseEvents["StageMemberChanged"] = "stage-member-added";
    DatabaseEvents["StageMemberRemoved"] = "stage-member-removed";
    // User Stage Member Volume
    DatabaseEvents["UserStageMemberVolumeAdded"] = "user-stage-member-volume-added";
    DatabaseEvents["UserStageMemberVolumeChanged"] = "user-stage-member-volume-changed";
    DatabaseEvents["UserStageMemberVolumeRemoved"] = "user-stage-member-volume-removed";
    // Group
    DatabaseEvents["GroupAdded"] = "group-added";
    DatabaseEvents["GroupChanged"] = "group-changed";
    DatabaseEvents["GroupRemoved"] = "group-removed";
    // User Group Volume
    DatabaseEvents["UserGroupVolumeAdded"] = "user-group-volume-added";
    DatabaseEvents["UserGroupVolumeChanged"] = "user-group-volume-changed";
    DatabaseEvents["UserGroupVolumeRemoved"] = "user-group-volume-removed";
    // Router
    DatabaseEvents["RouterAdded"] = "router-added";
    DatabaseEvents["RouterChanged"] = "router-changed";
    DatabaseEvents["RouterRemoved"] = "router-removed";
})(DatabaseEvents = exports.DatabaseEvents || (exports.DatabaseEvents = {}));
//# sourceMappingURL=IDatabase.js.map