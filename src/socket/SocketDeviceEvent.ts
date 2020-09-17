import {Device, Producer, User} from "../model.common";
import * as socketIO from "socket.io";
import SocketServer, {ISocketServer} from "./SocketServer";
import * as pino from "pino";
import {ClientDeviceEvents, ClientStageEvents, ServerDeviceEvents, ServerStageEvents} from "../events";
import {serverAddress} from "../index";
import {IDeviceManager, IStageManager, IUserManager} from "../storage/IManager";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});


class SocketDeviceHandler {
    private readonly manager: IDeviceManager & IUserManager;
    private readonly server: ISocketServer;
    private readonly socket: socketIO.Socket;
    private device: Device;
    private user: User;

    public getDevice(): Device {
        return this.device;
    }

    constructor(manager: IDeviceManager & IUserManager, server: ISocketServer, socket: socketIO.Socket, user: User) {
        this.manager = manager;
        this.server = server;
        this.socket = socket;
        this.user = user;
    }

    private refreshUser(): Promise<void> {
        return this.manager.getUser(this.user._id)
            .then(user => {
                this.user = user
            });
    }

    private debug(message: string) {
        if (this.device) {
            return logger.debug("[SOCKET DEVICE EVENT](" + this.device._id + ") " + message);
        }
        return logger.debug("[SOCKET DEVICE EVENT] " + message);
    }

    private trace(message: string) {
        if (this.device) {
            return logger.trace("[SOCKET DEVICE EVENT](" + this.user + ") " + message);
        }
        return logger.trace("[SOCKET DEVICE EVENT] " + message);
    }

    public addSocketHandler() {
        this.trace("Registering socket handling for " + this.user.name + "...");
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (updatedDevice: Partial<Device>) => {
            if (updatedDevice._id.toString() === this.device._id.toString()) {
                this.device = {
                    ...this.device,
                    ...updatedDevice
                };
            }
            this.debug("Updating device of " + this.user.name);
            return Promise.all([
                this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, updatedDevice),
                this.manager.updateDevice(updatedDevice._id, updatedDevice)
            ]);
        });

        // PRODUCER MANAGEMENT (only to active stage)
        this.socket.on(ClientStageEvents.ADD_PRODUCER, (producer: Producer) =>
            this.manager.addProducer(this.user, this.device, producer.kind, producer.routerId)
                .then(producer =>
                    // We have to get the current user object ... TODO: Find a way to automatically update the user
                    this.refreshUser().then(() => {
                        this.debug("Added producer for device '" + this.device.name + "' by " + this.user.name);
                        if (this.user.stageId)
                            return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_ADDED, producer)
                    })));
        this.socket.on(ClientStageEvents.CHANGE_PRODUCER, (id: string, producer: Partial<Producer>) => this.manager.updateProducer(this.device, id, producer)
            .then(producer => this.refreshUser()
                .then(() => {
                    this.debug("Updated producer '" + id + "' for device '" + this.device.name + "' by " + this.user.name);
                    if (this.user.stageId)
                        return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_CHANGED, producer);
                })));
        this.socket.on(ClientStageEvents.REMOVE_PRODUCER, (id: string) =>
            this.manager.removeProducer(this.device, id)
                .then(producer => this.refreshUser().then(() => {
                    this.debug("Removed producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
                    if (this.user.stageId)
                        return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.GROUP_REMOVED, producer._id)
                })));


        this.socket.on("disconnect", () => {
            if (!this.device.mac) {
                this.debug("Removed device '" + this.device.name + "' of " + this.user.name);
                return Promise.all([
                    this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_REMOVED, this.device),
                    this.manager.removeDevice(this.device._id)
                ]);
            } else {
                this.debug("Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                return this.manager.updateDevice(this.device._id, {
                    online: false
                }).then((device) => {
                    if (!device.online) {
                        logger.error("Fix me");
                        device.online = false;
                    }
                    return this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, device);
                })
            }
        });
        this.trace("Registered socket handling for " + this.user.name + "!");
    }

    public sendRemoteDevices(): Promise<void> {
        // Send other devices
        return this.manager.getDevicesByUser(this.user)
            .then(remoteDevices =>
                remoteDevices.forEach(remoteDevice => {
                    if (remoteDevice._id.toString() !== this.device._id.toString()) {
                        this.debug("Sent remote device " + remoteDevice._id + " to device " + this.device.name + " of " + this.user.name + "!");
                        return this.server.sendToDevice(this.socket, ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
                    }
                })
            );
    }

    public async generateDevice(): Promise<Device> {
        this.debug("Generating device for user " + this.user.name + "...");
        let initialDevice: Device;
        if (this.socket.handshake.query && this.socket.handshake.query.device) {
            initialDevice = JSON.parse(this.socket.handshake.query.device);
            if (initialDevice.mac) {
                // Try to get device by mac
                this.device = await this.manager.getDeviceByUserAndMac(this.user, initialDevice.mac);
                if (this.device) {
                    return this.manager.updateDevice(this.device._id, {
                        ...initialDevice,
                        online: true
                    }).then(device => {
                        this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, device);
                        this.server.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, device);
                        this.trace("Finished generating device for user " + this.user.name + " by reuse with mac address");
                        return device;
                    });
                }
            }
        }
        // We have to create the device
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
        this.device = await this.manager.createDevice(this.user, serverAddress, device);
        this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_ADDED, this.device);
        this.server.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
        this.debug("Finished generating device for user " + this.user.name + " by creating new.");
        return this.device;
    }
}

export default SocketDeviceHandler;