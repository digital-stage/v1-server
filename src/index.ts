import * as socketIO from "socket.io";
import GoogleAuthentication from "./auth/GoogleAuthentication";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as express from "express";
import * as cors from "cors";
import HandleSocketRequests from "./socket/HandleSocketRequests";
import {MongoStorage} from "./storage/mongo/MongoStorage";
import {IStorage} from "./storage/IStorage";
import Auth from "./auth/IAuthentication";

// Express server
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));
app.options('*', cors());
const server = process.env.NODE_ENV === "development" ? app.listen(4000) : https.createServer({
    key: fs.readFileSync(
        path.resolve(process.env.SSL_KEY || './ssl/key.pem')
    ),
    cert: fs.readFileSync(
        path.resolve(process.env.SSL_CRT || './ssl/cert.pem')
    ),
    ca: process.env.SSL_CA ? fs.readFileSync(path.resolve(process.env.SSL_CA)) : undefined,
    requestCert: true,
    rejectUnauthorized: false
}, app);

// Socket Server
const io: socketIO.Server = socketIO(server);

// Database API
const storage: IStorage = new MongoStorage();

// Auth API
const authentication: Auth.IAuthentication = new GoogleAuthentication();

// Call necessary init methods
const init = () => Promise.all([
    storage.init()
]);

init()
    .then(() => {
        // REST HANDLING
        //HandleRestStageRequests(app, storage, authentication);

        // SOCKET HANDLING
        HandleSocketRequests(io, storage, authentication);
    });
