"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const SocketServer_1 = require("./SocketServer");
const pino = require("pino");
const Manager_1 = require("../storage/Manager");
const events_1 = require("../events");
const index_1 = require("../index");
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
class SocketDeviceHandler {
    constructor(socket, user) {
        this.socket = socket;
        this.user = user;
    }
    getDevice() {
        return this.device;
    }
    refreshUser() {
        return Manager_1.manager.getUser(this.user._id)
            .then(user => {
            this.user = user;
        });
    }
    addSocketHandler() {
        logger.debug("[SOCKET DEVICE EVENT] Registering socket handling for " + this.user.name + "...");
        this.socket.on(events_1.ClientDeviceEvents.UPDATE_DEVICE, (updatedDevice) => {
            if (updatedDevice._id.toString() === this.device._id.toString()) {
                this.device = Object.assign(Object.assign({}, this.device), updatedDevice);
            }
            logger.debug("[SOCKET DEVICE EVENT] Updating device '" + this.device.name + "' of" + this.user.name);
            return Promise.all([
                SocketServer_1.default.sendToUser(this.user._id, events_1.ServerDeviceEvents.DEVICE_CHANGED, updatedDevice),
                Manager_1.manager.updateDevice(updatedDevice._id, updatedDevice)
            ]);
        });
        // PRODUCER MANAGEMENT (only to active stage)
        this.socket.on(events_1.ClientStageEvents.ADD_PRODUCER, (producer) => Manager_1.manager.addProducer(this.user, this.device, producer.kind, producer.routerId)
            .then(producer => 
        // We have to get the current user object ... TODO: Find a way to automatically update the user
        this.refreshUser().then(() => {
            logger.debug("[SOCKET DEVICE EVENT] Added producer for device '" + this.device.name + "' by" + this.user.name);
            if (this.user.stageId)
                return SocketServer_1.default.sendToJoinedStageMembers(this.user.stageId, events_1.ServerStageEvents.PRODUCER_ADDED, producer);
        })));
        this.socket.on(events_1.ClientStageEvents.CHANGE_PRODUCER, (id, producer) => Manager_1.manager.updateProducer(this.device, id, producer)
            .then(producer => this.refreshUser()
            .then(() => {
            logger.debug("[SOCKET DEVICE EVENT] Updated producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
            if (this.user.stageId)
                return SocketServer_1.default.sendToJoinedStageMembers(this.user.stageId, events_1.ServerStageEvents.PRODUCER_CHANGED, producer);
        })));
        this.socket.on(events_1.ClientStageEvents.REMOVE_PRODUCER, (id) => Manager_1.manager.removeProducer(this.device, id)
            .then(producer => this.refreshUser().then(() => {
            logger.debug("[SOCKET DEVICE EVENT] Removed producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
            if (this.user.stageId)
                return SocketServer_1.default.sendToJoinedStageMembers(this.user.stageId, events_1.ServerStageEvents.GROUP_REMOVED, producer._id);
        })));
        this.socket.on("disconnect", () => {
            if (!this.device.mac) {
                logger.debug("[SOCKET DEVICE EVENT] Removed device '" + this.device.name + "' of " + this.user.name);
                return Promise.all([
                    SocketServer_1.default.sendToUser(this.user._id, events_1.ServerDeviceEvents.DEVICE_REMOVED, this.device),
                    Manager_1.manager.removeDevice(this.device._id)
                ]);
            }
            else {
                logger.debug("[SOCKET DEVICE EVENT] Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                return Manager_1.manager.updateDevice(this.device._id, {
                    online: false
                }).then((device) => {
                    if (!device.online) {
                        console.error("Fix me");
                        device.online = false;
                    }
                    return SocketServer_1.default.sendToUser(this.user._id, events_1.ServerDeviceEvents.DEVICE_CHANGED, device);
                });
            }
        });
        logger.debug("[SOCKET DEVICE EVENT] Registered socket handling for " + this.user.name + "!");
    }
    sendRemoteDevices() {
        logger.debug("[SOCKET DEVICE EVENT] Send remote devices to device " + this.device.name + " of " + this.user.name + "...");
        // Send other devices
        return Manager_1.manager.getDevicesByUser(this.user)
            .then(remoteDevices => remoteDevices.forEach(remoteDevice => {
            console.log("Have remote device " + remoteDevice._id);
            if (remoteDevice._id.toString() !== this.device._id.toString()) {
                return SocketServer_1.default.sendToDevice(this.socket, events_1.ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
            }
        })).then(() => logger.debug("[SOCKET DEVICE EVENT] Sent remote devices to device " + this.device.name + " of " + this.user.name + "!"));
    }
    generateDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug("[SOCKET DEVICE EVENT] Generating device for user " + this.user.name + "...");
            let initialDevice;
            if (this.socket.handshake.query && this.socket.handshake.query.device) {
                initialDevice = JSON.parse(this.socket.handshake.query.device);
                if (initialDevice.mac) {
                    // Try to get device by mac
                    this.device = yield Manager_1.manager.getDeviceByUserAndMac(this.user, initialDevice.mac);
                    if (this.device) {
                        return Manager_1.manager.updateDevice(this.device._id, Object.assign(Object.assign({}, initialDevice), { online: true })).then(device => {
                            SocketServer_1.default.sendToUser(this.user._id, events_1.ServerDeviceEvents.DEVICE_CHANGED, device);
                            SocketServer_1.default.sendToDevice(this.socket, events_1.ServerDeviceEvents.LOCAL_DEVICE_READY, device);
                            logger.debug("[SOCKET DEVICE EVENT] Finished generating device for user " + this.user.name + " by reuse with mac address");
                            return device;
                        });
                    }
                }
            }
            // We have to create the device
            const device = Object.assign(Object.assign({ canVideo: false, canAudio: false, sendAudio: false, sendVideo: false, receiveAudio: false, receiveVideo: false, name: "" }, initialDevice), { userId: this.user._id, online: true });
            this.device = yield Manager_1.manager.createDevice(this.user, index_1.serverAddress, device);
            SocketServer_1.default.sendToUser(this.user._id, events_1.ServerDeviceEvents.DEVICE_ADDED, this.device);
            SocketServer_1.default.sendToDevice(this.socket, events_1.ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
            logger.debug("[SOCKET DEVICE EVENT] Finished generating device for user " + this.user.name + " by creating new.");
            return this.device;
        });
    }
}
exports.default = SocketDeviceHandler;
//# sourceMappingURL=SocketDeviceEvent.js.map