import * as socketIO from "socket.io";
import {MongoDatabase} from "../database/MongoDatabase";
import {Device, User} from "../model.server";
import {serverAddress} from "../index";
import {ClientDeviceEvents, ServerDeviceEvents} from "../events";
import * as pino from "pino";
import {IReactor} from "../Reactor";
import {omit} from "lodash";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export class SocketDeviceHandler {
    private readonly user: User;
    private readonly socket: socketIO.Socket;
    private readonly database: MongoDatabase;
    private readonly handler: IReactor;
    private device: Device;

    constructor(database: MongoDatabase, handler: IReactor, user: User, socket: socketIO.Socket) {
        this.user = user;
        this.database = database;
        this.socket = socket;
        this.handler = handler;
    }

    init() {
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (payload: Partial<Device>) => {
            if (!payload._id)
                return;
            return this.database.updateDevice(this.user._id, payload._id, omit(payload, '_id'));
        });

        this.socket.on("disconnect", async () => {
            console.log("DISCONNECTING");
            if (!this.device.mac) {
                logger.debug("Removed device '" + this.device.name + "' of " + this.user.name);
                return this.database.removeDevice(this.user._id, this.device._id);
            } else {
                logger.debug("Switched device '" + this.device.name + "' of " + this.user.name + " to offline");
                return this.database.updateDevice(this.user._id, this.device._id, {online: false});
            }

            /*if (this.user.stageMemberId) {
                if (await DeviceModel.count({userId: this.user._id, online: true}) === 0) {
                    return StageMemberModel.findByIdAndUpdate(this.user.stageMemberId, {online: false}).exec();
                }
            }*/
        });
    }

    async generateDevice(): Promise<Device> {
        logger.debug("Generating device for user " + this.user.name + "...");
        let initialDevice: Device;
        if (this.socket.handshake.query && this.socket.handshake.query.device) {
            initialDevice = JSON.parse(this.socket.handshake.query.device);
            if (initialDevice.mac) {
                // Try to get device by mac
                this.device = await this.database.readDeviceByMac(this.user._id, initialDevice.mac);
                if (this.device) {
                    this.device.online = true;
                    return this.database.updateDevice(this.user._id, this.device._id, {online: true})
                        .then(() => this.device);
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
            user: this.user._id,
            online: true
        };
        this.device = await this.database.createDevice(this.user._id, device);
        // In addition notify user (not in the socket group yet)
        this.handler.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
        logger.debug("Finished generating device for user " + this.user.name + " by creating new.");
        return this.device;
    }

    public sendRemoteDevices(): Promise<void> {
        // Send other devices
        return this.database.readDevicesByUser(this.user._id)
            .then(remoteDevices =>
                remoteDevices.forEach(remoteDevice => {
                    if (remoteDevice._id.toString() !== this.device._id.toString()) {
                        logger.debug("Sent remote device " + remoteDevice._id + " to device " + this.device.name + " of " + this.user.name + "!");
                        return this.handler.sendToDevice(this.socket, ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
                    }
                })
            );
    }
}