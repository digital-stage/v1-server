import * as socketIO from "socket.io";
import Auth from "../auth/IAuthentication";
import Server from "../model.server";
import {ServerEvents} from "../events";
import {IStorage} from "../storage/IStorage";
import Client from "../model.client";
import {Device} from "../model.common";


export default (io: socketIO.Server, storage: IStorage, authentication: Auth.IAuthentication) => {
    const sendToUser = (_id: string, event: string, payload?: any) => {
        console.log("SEND TO USER '" + _id + "': " + event + " --> " + JSON.stringify(payload));
        io.to(_id).emit(event, payload);
    };

    io.on("connection", (socket: socketIO.Socket) => {
        authentication.authorizeSocket(socket)
            .then(async (authUser: Auth.User) => {
                try {
                    console.log("NEW CONNECTION");
                    const sendToDevice = (event: string, payload?: any) => {
                        console.log("SEND TO DEVICE: " + event + " --> " + JSON.stringify(payload));
                        socket.emit(event, payload);
                    }

                    /**
                     * USER MANAGEMENT
                     */
                        // Check if user is already in database
                    let user: Server.User = await storage.getUserByUid(authUser.id);
                    if (!user) {
                        user = await storage.createUser(authUser.id, authUser.name, authUser.avatarUrl);
                    }

                    /**
                     * DEVICE MANAGEMENT
                     */
                    let commitedDevice: Device = undefined;
                    let device: Device = null;
                    if (socket.handshake.query && socket.handshake.query.device) {
                        commitedDevice = JSON.parse(socket.handshake.query.device);
                        if (commitedDevice.mac) {
                            console.log(user._id);
                            device = await storage.getDeviceByUserAndMac(user._id, commitedDevice.mac);
                            if (device) {
                                console.log("Device found with mac and user: " + user._id + " " + commitedDevice.mac);
                                await storage.updateDevice(device._id, {
                                    online: true
                                });
                                device.online = true;
                                sendToUser(user._id, ServerEvents.DEVICE_CHANGED, device);
                            } else {
                                console.log("Device NOT found with mac and user: " + user._id + " " + commitedDevice.mac);
                            }
                        }
                    }
                    if (!device) {
                        const initialDevice: Omit<Device, "id"> = {
                            ...commitedDevice,
                            online: true,
                            videoProducer: [],
                            audioProducer: [],
                            ovProducer: []
                        }
                        device = await storage.createDevice(user._id, initialDevice);
                        sendToUser(user._id, ServerEvents.DEVICE_ADDED, device);
                    }

                    socket.on("disconnect", () => {
                        if (!device.mac) {
                            console.log("Remove device")
                            storage.removeDevice(device._id);
                            sendToUser(user._id, ServerEvents.DEVICE_REMOVED, device);
                        } else {
                            console.log("Keep device, but switch offline")
                            storage.updateDevice(device._id, {
                                online: false
                            });
                            device.online = false;
                            sendToUser(user._id, ServerEvents.DEVICE_CHANGED, device);
                        }
                    });

                    socket.on("update-device", (d: Partial<Device>) => {
                        sendToUser(user._id, ServerEvents.DEVICE_CHANGED, d);
                        storage.updateDevice(d._id, d).then(updated => {
                            console.log("Finished writing");
                        });
                        console.log("Finished sending");
                        // Don't wait:
                    })

                    /**
                     * SEND INITIAL DATA
                     */
                    sendToDevice(ServerEvents.INIT, device);
                    let stage: Client.Stage = null;
                    if (user.stageId) {
                        stage = await storage.generateStage(user._id, user.stageId);
                    }

                    sendToDevice(ServerEvents.READY, stage);

                    // Finally join user stream
                    socket.join(user._id, err => {
                        if (err)
                            console.error(err)
                        console.log("Joined room: " + user._id);
                    });
                } catch (error) {
                    socket.error(error.message);
                    console.error("Internal error");
                    console.error(error);
                    socket.disconnect();
                }
            })
            .catch((error) => {
                socket.error("Invalid authorization");
                console.error("INVALID CONNECTION ATTEMPT");
                console.error(error);
                socket.disconnect();
            })
    });
}