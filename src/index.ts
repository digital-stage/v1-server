import * as socketIO from "socket.io";
import {IAuthentication} from "./auth/IAuthentication";
import {Device} from "./model";
import Database, {DatabaseEvents} from "./database";
import {ServerEvents} from "./events";
import DummyAuthentication from "./auth/DummyAuthentication";

const database: Database = new Database();
const authentication: IAuthentication = new DummyAuthentication();

const io: socketIO.Server = socketIO(4000);

const sendToUser = (uid: string, event: string, payload?: any) => {
    io.to(uid).send(event, payload);
}

database.on(DatabaseEvents.DEVICE_ADDED, (device: Device) =>
    sendToUser(device.userId, ServerEvents.DEVICE_ADDED, device)
);
database.on(DatabaseEvents.DEVICE_CHANGED, (device: Device) =>
    sendToUser(device.userId, ServerEvents.DEVICE_CHANGED, device)
);
database.on(DatabaseEvents.DEVICE_REMOVED, (device: Device) =>
    sendToUser(device.userId, ServerEvents.DEVICE_REMOVED, device)
);


io.on("connection", (socket: socketIO.Socket) => {
    authentication.authorizeSocket(socket)
        .then(async user => {
            console.log("NEW CONNECTION");
            const sendToDevice = (event: string, payload?: any) => {
                socket.emit(event, payload);
            }

            // Socket has been authorized
            // Check if user is already in database
            let existingUser = await database.getUser(user.id);
            if (!existingUser) {
                await database.storeUser(user);
            } else {
                user = existingUser;
            }

            // Create device
            let initialDevice = undefined;
            let device;
            if (socket.handshake.query && socket.handshake.query.device) {
                initialDevice = JSON.parse(socket.handshake.query.device);
                if (initialDevice.mac) {
                    device = await database.getDeviceByMac(socket.handshake.query.device.mac);
                }
            }
            if (!device) {
                device = await database.addDevice(user.id, initialDevice);
            }

            socket.on("disconnect", () => {
                console.log("Remove device")
                database.removeDevice(device.id);
            })

            console.log(device);
            socket.emit(ServerEvents.READY, device);
        })
        .catch((error) => {
            socket.error(error.message);
            console.error("INVALID CONNECTION ATTEMPT");
            socket.disconnect();
        });
});
