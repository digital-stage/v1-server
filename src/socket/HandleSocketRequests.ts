import * as socketIO from "socket.io";
import {IDatabase} from "../IDatabase";
import Auth, {IAuthentication} from "../auth/IAuthentication";
import Server from "../model.server";
import {ServerEvents} from "../events";

export default (io: socketIO.Server, database: IDatabase, authentication: IAuthentication) => {
    const sendToUser = (uid: string, event: string, payload?: any) => {
        io.to(uid).send(event, payload);
    };

    io.on("connection", (socket: socketIO.Socket) => {
        authentication.authorizeSocket(socket)
            .then(async (user: Auth.User) => {
                try {
                    console.log("NEW CONNECTION");
                    const sendToDevice = (event: string, payload?: any) => {
                        socket.emit(event, payload);
                    }

                    /**
                     * USER MANAGEMENT
                     */
                        // Check if user is already in database
                    let existingUser = await database.readUser(user.id);
                    if (!existingUser) {
                        await database.createUser(user);
                    } else {
                        user = existingUser;
                    }

                    /**
                     * DEVICE MANAGEMENT
                     */
                    let commitedDevice: Server.Device = undefined;
                    let device;
                    if (socket.handshake.query && socket.handshake.query.device) {
                        commitedDevice = JSON.parse(socket.handshake.query.device);
                        if (commitedDevice.mac) {
                            device = await database.readDeviceByUserAndMac(user.id, commitedDevice.mac);
                            if (device) {
                                console.log("Device found with mac and user: " + user.id + " " + commitedDevice.mac);
                                await database.updateDevice(device.id, {
                                    online: true
                                });
                                device.online = true;
                            } else {
                                console.log("Device NOT found with mac and user: " + user.id + " " + commitedDevice.mac);
                            }
                        }
                    }
                    if (!device) {
                        const initialDevice: Omit<Server.Device, "id"> = {
                            ...commitedDevice,
                            online: true,
                            userId: user.id,
                            videoProducer: [],
                            audioProducer: [],
                            ovProducer: []
                        }
                        device = await database.createDevice(initialDevice);
                    }

                    socket.on("disconnect", () => {
                        if (!device.mac) {
                            console.log("Remove device")
                            database.deleteDevice(device.id);
                        } else {
                            console.log("Keep device, but switch offline")
                            database.updateDevice(device.id, {
                                online: false
                            });
                        }
                    });

                    /**
                     * STAGE MANAGEMENT
                     */


                    socket.emit(ServerEvents.READY, device);
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