import {Device, Producer, User} from "../model.common";
import * as socketIO from "socket.io";
import {ISocketServer} from "./SocketServer";
import * as pino from "pino";
import {ClientDeviceEvents, ClientStageEvents, ServerDeviceEvents, ServerStageEvents} from "../events";
import {serverAddress} from "../index";
import {IDeviceManager, IUserManager} from "../storage/IManager";
import {DeviceModel, DeviceType, ProducerModel, UserModel} from "../storage/mongo/model.mongo";
import {IEventReactor} from "./EventReactor";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});


class SocketDeviceHandler {
    private readonly server: ISocketServer;
    private readonly socket: socketIO.Socket;
    private device: DeviceType;
    private user: User;
    private readonly reactor: IEventReactor;

    public getDevice(): Device {
        return this.device;
    }

    constructor(server: ISocketServer, reactor: IEventReactor, socket: socketIO.Socket, user: User) {
        this.server = server;
        this.socket = socket;
        this.user = user;
        this.reactor = reactor;
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

    private refreshUser(): Promise<void> {
        return UserModel.findById(this.user._id)
            .then(user => {
                this.user = user
            })
    }

    public addSocketHandler() {
        this.trace("Registering socket handling for " + this.user.name + "...");
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (updatedDevice: Partial<Device>) => {
            this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, updatedDevice);
            if (updatedDevice._id.toString() === this.device._id.toString()) {
                this.debug("Updating local device of " + this.user.name);
                return this.device.updateOne(updatedDevice);
            }
            this.debug("Updating remote device of " + this.user.name);
            return Promise.all([
                this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, updatedDevice),
                DeviceModel.findByIdAndUpdate(updatedDevice._id, updatedDevice).lean().exec()
            ]);
        });

        // PRODUCER MANAGEMENT (only to active stage)
        this.socket.on(ClientStageEvents.ADD_PRODUCER, (initialProducer: Producer) => {
            const producer = new ProducerModel();
            producer.userId = this.user._id;
            producer.deviceId = this.device._id;
            producer.kind = initialProducer.kind;
            producer.routerId = initialProducer.routerId;
            return producer.save()
                .then(producer => this.refreshUser()
                    .then(() => {
                        this.debug("Added producer for device '" + this.device.name + "' by " + this.user.name);
                        if (this.user.stageId)
                            return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_ADDED, producer)
                    })
                )
        });
        this.socket.on(ClientStageEvents.CHANGE_PRODUCER, (id: string, producer: Partial<Producer>) =>
            ProducerModel.findOneAndUpdate({_id: id, deviceId: this.device._id}, producer)
                .then(producer => {
                        if (producer) {
                            return this.refreshUser()
                                .then(() => {
                                    this.debug("Updated producer '" + id + "' for device '" + this.device.name + "' by " + this.user.name);
                                    if (this.user.stageId)
                                        return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.PRODUCER_CHANGED, producer);
                                });
                        }
                    }
                )
        );
        this.socket.on(ClientStageEvents.REMOVE_PRODUCER, (id: string) =>
            ProducerModel.findOneAndRemove({_id: id, deviceId: this.device._id})
                .then(producer => {
                    if (producer) {
                        return this.refreshUser().then(() => {
                            this.debug("Removed producer '" + id + "' for device '" + this.device.name + "' by" + this.user.name);
                            if (this.user.stageId)
                                return this.server.sendToJoinedStageMembers(this.user.stageId, ServerStageEvents.GROUP_REMOVED, producer._id)
                        });
                    }
                }));


        this.socket.on("disconnect", () => {
            if (!this.device.mac) {
                this.debug("Removed device '" + this.device.name + "' of " + this.user.name);
                return Promise.all([
                    this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_REMOVED, this.device),
                    DeviceModel.findByIdAndRemove(this.device._id).lean().exec()
                ]);
            } else {
                this.debug("Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                return DeviceModel.findByIdAndUpdate(this.device._id, {
                    online: false
                })
                    .lean().exec()
                    .then((device) => this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, device));
            }
        });
        this.trace("Registered socket handling for " + this.user.name + "!");
    }

    public sendRemoteDevices(): Promise<void> {
        // Send other devices
        return DeviceModel.find({userId: this.user._id})
            .lean().exec()
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
                this.device = await DeviceModel.findOne({userId: this.user._id, mac: initialDevice.mac}).exec();
                if (this.device) {
                    this.device.online = true;
                    return this.device.save();
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
            server: serverAddress,
            userId: this.user._id,
            online: true
        };
        this.device = await new DeviceModel(device).save();
        this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_ADDED, this.device);
        this.server.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
        this.debug("Finished generating device for user " + this.user.name + " by creating new.");
        return this.device;
    }
}

export default SocketDeviceHandler;