import * as socketIO from "socket.io";
import {IAuthentication} from "./auth/IAuthentication";
import GoogleAuthentication from "./auth/GoogleAuthentication";
import {Device} from "./model";
import Database, {DatabaseEvents} from "./database";
import {ServerEvents} from "./events";

const database: Database = new Database();
const authentication: IAuthentication = new GoogleAuthentication();

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

            sendToDevice(ServerEvents.READY);
        })
        .catch((error) => {
            socket.error(error.message);
            socket.disconnect();
        });
});
