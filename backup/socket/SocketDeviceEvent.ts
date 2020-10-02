import {Device, Producer, RouterId, User} from "../model.common";
import * as socketIO from "socket.io";
import * as pino from "pino";
import {ClientDeviceEvents, ClientStageEvents, ServerDeviceEvents} from "../../src/events";
import {serverAddress} from "../../src";
import Model from "../storage/mongoose/model.mongo";
import IEventReactor from "../reactor/IEventReactor";
import ISocketServer from "../../src/ISocketServer";
import {DeviceType} from "../storage/mongoose/mongo.types";
import {omit} from "lodash";
import DeviceModel = Model.DeviceModel;
import ProducerModel = Model.ProducerModel;
import StageMemberModel = Model.StageMemberModel;

const logger = pino({level: process.env.LOG_LEVEL || 'info'});


class SocketDeviceHandler {
    private readonly server: ISocketServer;
    private readonly socket: socketIO.Socket;
    private device: DeviceType;
    private user: User;
    private readonly reactor: IEventReactor;

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

    public addSocketHandler() {
        this.trace("Registering socket handling for " + this.user.name + "...");
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (payload: Partial<Device>) => {
                if (payload._id.toString() === this.device._id.toString()) {
                    console.log("Updating local device");
                    // Update this device
                    this.device.updateOne(omit(payload, '_id'));
                    this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, {
                        ...payload,
                        _id: payload._id
                    });
                } else {
                    // Update remote devices
                    return DeviceModel.findOneAndUpdate({
                        _id: payload._id,
                        userId: this.user._id
                    }, omit(payload, '_id')).lean().exec()
                        .then(() => this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, {
                            ...payload,
                            _id: payload._id
                        }));
                }
            }
        );

        // PRODUCER MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_PRODUCER, (
            payload: {
                kind: "audio" | "video" | "ov",
                routerId: RouterId,
                routerProducerId: string
            }, fn: (producer: Producer) => void
        ) => {
            return this.reactor.addProducer(this.device, payload.kind, payload.routerId, payload.routerProducerId)
                .then(producer => fn(producer));
        });
        this.socket.on(ClientStageEvents.CHANGE_PRODUCER, (id: string, producer: Partial<Producer>, fn: (producer: Producer) => void) =>
            //TODO: Validate data
            this.reactor.changeProducer(this.device._id, id, producer)
                .then(producer => fn(producer))
        );
        this.socket.on(ClientStageEvents.REMOVE_PRODUCER, (id: string, fn: () => void) =>
            this.reactor.removeProducer(this.device._id, id)
                .then(() => fn())
        );

        this.socket.on("disconnect", async () => {
            console.log("DISCONNECTING");
            if (!this.device.mac) {
                this.debug("Removed device '" + this.device.name + "' of " + this.user.name);
                // Remove producers first
                const producers = await ProducerModel.find({deviceId: this.device._id}).lean().exec();
                for (const producer of producers) {
                    await this.reactor.removeProducer(this.device._id, producer._id)
                }
                this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_REMOVED, this.device._id);
                await this.device.remove();
            } else {
                this.debug("Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                await this.device.updateOne({
                    online: false
                })
                    .then(() => {
                        this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_CHANGED, {
                            online: false,
                            _id: this.device._id
                        });
                    })
            }

            if (this.user.stageMemberId) {
                if (await DeviceModel.count({userId: this.user._id, online: true}) === 0) {
                    return StageMemberModel.findByIdAndUpdate(this.user.stageMemberId, {online: false}).exec();
                }
            }
        });
        this.trace("Registered socket handling for " + this.user.name + "!");
    }

    public sendRemoteDevices(): Promise<void> {
        // Send other devices
        return Model.DeviceModel.find({userId: this.user._id})
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
                this.device = await Model.DeviceModel.findOne({userId: this.user._id, mac: initialDevice.mac}).exec();
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
        this.device = await new Model.DeviceModel(device).save();
        this.server.sendToUser(this.user._id, ServerDeviceEvents.DEVICE_ADDED, this.device);
        this.server.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
        this.debug("Finished generating device for user " + this.user.name + " by creating new.");
        return this.device;
    }
}

export default SocketDeviceHandler;