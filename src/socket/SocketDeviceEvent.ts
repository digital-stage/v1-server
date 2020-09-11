import {Device, Producer, User} from "../model.common";
import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import * as pino from "pino";
import {manager} from "../storage/mongo/MongoStageManager";
import {ClientStageEvents, ServerStageEvents} from "./SocketStageEvent";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

export enum ServerDeviceEvents {
    LOCAL_DEVICE_READY = "local-device-ready",
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",
}

export enum ClientDeviceEvents {
    UPDATE_DEVICE = "update-device"
}

class SocketDeviceHandler {
    private device: Device;
    private user: User;
    private readonly socket: socketIO.Socket;

    public getDevice(): Device {
        return this.device;
    }

    constructor(socket: socketIO.Socket, user: User) {
        this.socket = socket;
        this.user = user;
    }

    private refreshUser(): Promise<void> {
        return manager.getUser(this.user._id)
            .then(user => {
                this.user = user
            });
    }

    public addSocketHandler() {
        logger.debug("[SOCKET DEVICE EVENT] Registering socket handling for " + this.user.name + "...");
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (updatedDevice: Partial<Device>) => {
            if (updatedDevice._id.toString() === this.device._id.toString()) {
                this.device = {
                    ...this.device,
                    ...updatedDevice
                };
            }
            logger.debug("[SOCKET DEVICE EVENT] Updating device '" + this.device.name + "' of" + this.user.name);
            return Promise.all([
                SocketServer.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, updatedDevice),
                manager.updateDevice(updatedDevice._id, updatedDevice)
            ]);
        });

        // PRODUCER MANAGEMENT (only to active stage)
        this.socket.on(ClientStageEvents.ADD_PRODUCER, (producer: Producer) =>
            manager.addProducer(this.user, this.device, producer.kind, producer.routerId)
                .then(producer =>
                    // We have to get the current user object ... TODO: Find a way to automatically update the user
                    this.refreshUser().then(() => {
                        logger.debug("[SOCKET DEVICE EVENT] Added producer for device '" + this.device.name + "' by" + this.user.name);
                        if (this.user.stageId)
                            return SocketServer.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_ADDED, producer)
                    })));
        this.socket.on(ClientStageEvents.CHANGE_PRODUCER, (id: string, producer: Partial<Producer>) => manager.updateProducer(this.device, id, producer)
            .then(producer => this.refreshUser()
                .then(() => {
                    logger.debug("[SOCKET DEVICE EVENT] Updated producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
                    if (this.user.stageId)
                        return SocketServer.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_CHANGED, producer);
                })));
        this.socket.on(ClientStageEvents.REMOVE_PRODUCER, (id: string) =>
            manager.removeProducer(this.device, id)
                .then(producer => this.refreshUser().then(() => {
                    logger.debug("[SOCKET DEVICE EVENT] Removed producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
                    if (this.user.stageId)
                        return SocketServer.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.GROUP_REMOVED, producer._id)
                })));


        this.socket.on("disconnect", () => {
            if (!this.device.mac) {
                logger.debug("[SOCKET DEVICE EVENT] Removed device '" + this.device.name + "' of " + this.user.name);
                return Promise.all([
                    SocketServer.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_REMOVED, this.device),
                    manager.removeDevice(this.device._id)
                ]);
            } else {
                logger.debug("[SOCKET DEVICE EVENT] Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                return manager.updateDevice(this.device._id, {
                    online: false
                }).then((device) => {
                    if (!device.online) {
                        console.error("Fix me");
                        device.online = false;
                    }
                    return SocketServer.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, device);
                })
            }
        });
        logger.debug("[SOCKET DEVICE EVENT] Registered socket handling for " + this.user.name + "!");
    }

    public sendRemoteDevices(): Promise<void> {
        logger.debug("[SOCKET DEVICE EVENT] Send remote devices to device " + this.device.name + " of " + this.user.name + "...");
        // Send other devices
        return manager.getDevicesByUser(this.user)
            .then(remoteDevices =>
                remoteDevices.forEach(remoteDevice => {
                    console.log(remoteDevice);
                    if (remoteDevice._id.toString() !== this.device._id.toString()) {
                        return SocketServer.sendToDevice(this.socket, ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
                    }
                })).then(() => logger.debug("[SOCKET DEVICE EVENT] Sent remote devices to device " + this.device.name + " of " + this.user.name + "!"))
    }

    public async generateDevice(): Promise<Device> {
        logger.debug("[SOCKET DEVICE EVENT] Generating device for user " + this.user.name + "...");
        let initialDevice: Device;
        if (this.socket.handshake.query && this.socket.handshake.query.device) {
            initialDevice = JSON.parse(this.socket.handshake.query.device);
            if (initialDevice.mac) {
                // Try to get device by mac
                this.device = await manager.getDeviceByUserAndMac(this.user, initialDevice.mac);
                if (this.device) {
                    return manager.updateDevice(this.device._id, {
                        ...initialDevice,
                        online: true
                    }).then(device => {
                        SocketServer.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, device);
                        SocketServer.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, device);
                        logger.debug("[SOCKET DEVICE EVENT] Finished generating device for user " + this.user.name + " by reuse with mac address");
                        return device;
                    });
                }
            }
        }
        const device: Omit<Device, "_id"> = {
            canVideo: false,
            canAudio: false,
            sendAudio: false,
            sendVideo: false,
            receiveAudio: false,
            receiveVideo: false,
            name: "",
            ...initialDevice,
            userId: this.user._id,
            online: true
        };
        console.log(device);
        // We have to create the device
        this.device = await manager.createDevice(this.user, device);
        console.log(this.device);
        SocketServer.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_ADDED, this.device);
        SocketServer.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
        logger.debug("[SOCKET DEVICE EVENT] Finished generating device for user " + this.user.name + " by creating new.");
        return this.device;
    }
}

export default SocketDeviceHandler;