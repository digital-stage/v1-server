"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SocketServer_1 = require("./SocketServer");
const Manager_1 = require("../storage/Manager");
const events_1 = require("../events");
class SocketStageHandler {
    constructor(socket, user) {
        this.socket = socket;
        this.user = user;
    }
    addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(events_1.ClientStageEvents.ADD_STAGE, (payload) => {
            console.log("add-stage");
            console.log(payload);
            return Manager_1.manager.createStage(this.user, payload.name, payload.password)
                .then(stage => SocketServer_1.default.sendToStage(stage._id, events_1.ServerStageEvents.STAGE_ADDED, stage))
                .catch(error => console.error(error));
        });
        this.socket.on(events_1.ClientStageEvents.CHANGE_STAGE, (id, stage) => Manager_1.manager.updateStage(this.user, id, stage)
            .then(() => SocketServer_1.default.sendToStage(id, events_1.ServerStageEvents.STAGE_CHANGED, id)));
        this.socket.on(events_1.ClientStageEvents.REMOVE_STAGE, (id) => Manager_1.manager.removeStage(this.user, id)
            .then(stage => SocketServer_1.default.sendToStage(id, events_1.ServerStageEvents.STAGE_REMOVED, id)));
        // GROUP MANAGEMENT
        this.socket.on(events_1.ClientStageEvents.ADD_GROUP, (payload) => Manager_1.manager.addGroup(this.user, payload.stageId, payload.name).then(group => SocketServer_1.default.sendToStage(group.stageId, events_1.ServerStageEvents.GROUP_ADDED, group)));
        this.socket.on(events_1.ClientStageEvents.CHANGE_GROUP, (id, group) => Manager_1.manager.updateGroup(this.user, id, group).then(() => SocketServer_1.default.sendToStage(this.user._id, events_1.ServerStageEvents.GROUP_CHANGED, group)));
        this.socket.on(events_1.ClientStageEvents.REMOVE_GROUP, (id) => Manager_1.manager.removeGroup(this.user, id).then(() => SocketServer_1.default.sendToStage(this.user._id, events_1.ServerStageEvents.GROUP_REMOVED, id)));
        // STAGE MEMBER MANAGEMENT
        this.socket.on(events_1.ClientStageEvents.CHANGE_GROUP_MEMBER, (id, groupMember) => Manager_1.manager.updateStageMember(this.user, id, groupMember)
            .then(stageMember => SocketServer_1.default.sendToStage(stageMember.stageId, events_1.ServerStageEvents.GROUP_MEMBER_CHANGED, Object.assign(Object.assign({}, groupMember), { _id: id }))));
        // this.user STAGE MANAGEMENT (join, leave)
        this.socket.on(events_1.ClientStageEvents.JOIN_STAGE, (payload) => Manager_1.manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
            .then(groupMember => Promise.all([
            SocketServer_1.default.sendToStage(groupMember.stageId, events_1.ServerStageEvents.GROUP_MEMBER_ADDED, groupMember),
            Manager_1.manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => SocketServer_1.default.sendToUser(this.user._id, events_1.ServerStageEvents.STAGE_JOINED, stage))
        ])));
        this.socket.on(events_1.ClientStageEvents.LEAVE_STAGE, () => Promise.all([
            SocketServer_1.default.sendToUser(this.user._id, events_1.ServerStageEvents.STAGE_LEFT),
            Manager_1.manager.leaveStage(this.user)
        ]));
        // Handle internal events
        this.socket.on(events_1.ServerStageEvents.STAGE_READY, () => {
            console.log("Stage joined");
        });
    }
    generateStage() {
        return Promise.all([
            // Send active stage
            Manager_1.manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => SocketServer_1.default.sendToDevice(this.socket, events_1.ServerStageEvents.STAGE_READY, stage)),
            // Send non-active stages
            Manager_1.manager.getStagesByUser(this.user)
                .then(stages => {
                stages.forEach(stage => {
                    // Send stage
                    console.log("Sending managed stage " + stage.name);
                    SocketServer_1.default.sendToDevice(this.socket, events_1.ServerStageEvents.STAGE_ADDED, stage);
                    // Send associated models
                    return Promise.all([
                        // Send groups
                        Manager_1.manager.getGroupsByStage(stage._id)
                            .then(groups => groups.forEach(group => SocketServer_1.default.sendToDevice(this.socket, events_1.ServerStageEvents.GROUP_ADDED, group))),
                        // Send group members
                        Manager_1.manager.generateGroupMembersByStage(stage._id)
                            .then(groupMember => groupMember.forEach(stageMember => SocketServer_1.default.sendToDevice(this.socket, events_1.ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
                    ]);
                });
            })
        ]);
    }
}
exports.default = SocketStageHandler;
//# sourceMappingURL=SocketStageEvent.js.map