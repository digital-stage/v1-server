import {Device} from "../model.common";
import {storage} from "../storage/Storage";
import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import * as pino from "pino";

export enum ServerDeviceEvents {
    DEVICE_READY = "device-ready",
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",
}

export enum ClientDeviceEvents {
    UPDATE_DEVICE = "update-device"
}

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

namespace SocketDeviceEvent {
    export async function generateDevice(userId: string, socket: socketIO.Socket) {
        logger.info("Generating device");
        /**
         * DEVICE MANAGEMENT
         */
        let committedDevice: Device = undefined;
        let device: Device = null;
        if (socket.handshake.query && socket.handshake.query.device) {
            committedDevice = JSON.parse(socket.handshake.query.device);
            if (committedDevice.mac) {
                logger.debug("MAC given: " + committedDevice.mac);
                device = await storage.getDeviceByUserAndMac(userId, committedDevice.mac);
                if (device) {
                    console.log("Device found with mac and user: " + userId + " " + committedDevice.mac);
                    await storage.updateDevice(device._id, {
                        online: true
                    });
                    device.online = true;
                    SocketServer.sendToUser(userId, ServerDeviceEvents.DEVICE_CHANGED, device);
                } else {
                    console.log("Device NOT found with mac and user: " + userId + " " + committedDevice.mac);
                }
            } else {
                logger.debug("No MAC given");
            }
        }
        if (!device) {
            const initialDevice: Omit<Device, "id"> = {
                ...committedDevice,
                online: true,
                videoProducer: [],
                audioProducer: [],
                ovProducer: []
            }
            logger.debug("Creating device");
            device = await storage.createDevice(userId, initialDevice);
            SocketServer.sendToUser(userId, ServerDeviceEvents.DEVICE_ADDED, device);
        }

        socket.on("disconnect", () => {
            if (!device.mac) {
                console.log("Remove device")
                storage.removeDevice(device._id)
                    .then((device) =>
                        SocketServer.sendToUser(userId, ServerDeviceEvents.DEVICE_REMOVED, device)
                    );
            } else {
                console.log("Keep device, but switch offline")
                storage.updateDevice(device._id, {
                    online: false
                }).then((device) => {
                    if (!device.online) {
                        console.error("Fix me");
                        device.online = false;
                    }
                    return SocketServer.sendToUser(userId, ServerDeviceEvents.DEVICE_CHANGED, device);
                })
            }
        });

        /**
         * SEND INITIAL DATA
         */
        // Send this local device
        SocketServer.sendToDevice(socket, ServerDeviceEvents.DEVICE_READY, device);

        // Send other devices
        storage.getDevicesByUser(userId)
            .then(remoteDevices => {
                remoteDevices.forEach(remoteDevice => {
                    if (remoteDevice._id.toString() !== device._id.toString()) {
                        SocketServer.sendToDevice(socket, ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
                    }
                })
            });
        logger.info("Finished generating device");
    }

    export function loadDeviceEvents(userId: string, socket: socketIO.Socket) {
        socket.on(ClientDeviceEvents.UPDATE_DEVICE, (d: Partial<Device>) => {
            SocketServer.sendToUser(userId, ServerDeviceEvents.DEVICE_CHANGED, d);
            storage.updateDevice(d._id, d).then(updated => {
                console.log("Finished writing");
            });
            console.log("Finished sending");
            // Don't wait:
        });
        logger.info("Device Events registered");
    }

}
export default SocketDeviceEvent;