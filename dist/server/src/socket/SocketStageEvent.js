"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientStageEvents = exports.ServerStageEvents = void 0;
const SocketServer_1 = require("./SocketServer");
const Manager_1 = require("../storage/Manager");
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
class SocketStageHandler {
    constructor(socket, user) {
        this.socket = socket;
        this.user = user;
    }
    addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (payload) => Manager_1.manager.createStage(this.user, payload.name, payload.password).then(stage => SocketServer_1.default.sendToStage(stage._id, ServerStageEvents.STAGE_ADDED, stage)));
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (id, stage) => Manager_1.manager.updateStage(this.user, id, stage)
            .then(() => SocketServer_1.default.sendToStage(id, ServerStageEvents.STAGE_CHANGED, id)));
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id) => Manager_1.manager.removeStage(this.user, id)
            .then(() => SocketServer_1.default.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id)));
        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload) => Manager_1.manager.addGroup(this.user, payload.stageId, payload.name).then(group => SocketServer_1.default.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group)));
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (id, group) => Manager_1.manager.updateGroup(this.user, id, group).then(() => SocketServer_1.default.sendToStage(this.user._id, ServerStageEvents.GROUP_CHANGED, group)));
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id) => Manager_1.manager.removeGroup(this.user, id).then(() => SocketServer_1.default.sendToStage(this.user._id, ServerStageEvents.GROUP_REMOVED, id)));
        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id, groupMember) => Manager_1.manager.updateStageMember(this.user, id, groupMember)
            .then(stageMember => SocketServer_1.default.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, Object.assign(Object.assign({}, groupMember), { _id: id }))));
        // this.user STAGE MANAGEMENT (join, leave)
        this.socket.on(ClientStageEvents.JOIN_STAGE, (payload) => Manager_1.manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
            .then(groupMember => Promise.all([
            SocketServer_1.default.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember),
            Manager_1.manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => SocketServer_1.default.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, stage))
        ])));
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () => Promise.all([
            SocketServer_1.default.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT),
            Manager_1.manager.leaveStage(this.user)
        ]));
        // Handle internal events
        this.socket.on(ServerStageEvents.STAGE_READY, () => {
            console.log("Stage joined");
        });
    }
    generateStage() {
        return Promise.all([
            // Send active stage
            Manager_1.manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => SocketServer_1.default.sendToDevice(this.socket, ServerStageEvents.STAGE_READY, stage)),
            // Send non-active stages
            Manager_1.manager.getStagesByUser(this.user)
                .then(stages => {
                stages.forEach(stage => {
                    // Send stage
                    SocketServer_1.default.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
                    // Send associated models
                    return Promise.all([
                        // Send groups
                        Manager_1.manager.getGroupsByStage(stage._id)
                            .then(groups => groups.forEach(group => SocketServer_1.default.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
                        // Send group members
                        Manager_1.manager.generateGroupMembersByStage(stage._id)
                            .then(groupMember => groupMember.forEach(stageMember => SocketServer_1.default.sendToDevice(this.socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
                    ]);
                });
            })
        ]);
    }
}
exports.default = SocketStageHandler;
//# sourceMappingURL=SocketStageEvent.js.map