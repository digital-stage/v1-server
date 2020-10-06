import * as socketIO from "socket.io";

import {
    Device,
    GlobalAudioProducer, GlobalAudioProducerId,
    GlobalVideoProducer, GlobalVideoProducerId,
    RouterId,
    SoundCard,
    Track,
    TrackPreset,
    User
} from "../model.server";
import {serverAddress} from "../index";
import {ClientDeviceEvents, ServerDeviceEvents} from "../events";
import * as pino from "pino";
import {omit} from "lodash";
import {MongoRealtimeDatabase} from "../database/MongoRealtimeDatabase";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export class SocketDeviceHandler {
    private readonly serverAddress: string;
    private readonly database: MongoRealtimeDatabase;
    private readonly user: User;
    private readonly socket: socketIO.Socket;
    private device: Device;

    constructor(serverAddress: string, database: MongoRealtimeDatabase, user: User, socket: socketIO.Socket) {
        this.serverAddress = serverAddress;
        this.user = user;
        this.database = database;
        this.socket = socket;
    }

    init() {
        this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (payload: Partial<Device>) => {
            if (!payload._id)
                return;
            return this.database.updateDevice(this.user._id, payload._id, omit(payload, '_id'));
        });

        this.socket.on(ClientDeviceEvents.ADD_AUDIO_PRODUCER, (
            payload: {
                routerId: RouterId,
                routerProducerId: string
            }, fn: (producer: GlobalAudioProducer) => void
        ) => {
            // Get current stage id
            return this.database.createAudioProducer({
                ...payload,
                deviceId: this.device._id,
                userId: this.user._id,
            })
                .then(producer => fn(producer));
        });
        this.socket.on(ClientDeviceEvents.CHANGE_AUDIO_PRODUCER, (id: GlobalAudioProducerId, producer: Partial<GlobalAudioProducer>, fn: (producer: GlobalAudioProducer) => void) =>
            //TODO: Validate data
            this.database.updateAudioProducer(this.device._id, id, producer)
                .then(producer => fn(producer))
        );
        this.socket.on(ClientDeviceEvents.REMOVE_AUDIO_PRODUCER, (id: GlobalAudioProducerId, fn: () => void) => {
                return this.database.deleteAudioProducer(this.device._id, id)
                    .then(() => fn())
            }
        );

        this.socket.on(ClientDeviceEvents.ADD_VIDEO_PRODUCER, (
            payload: {
                routerId: RouterId,
                routerProducerId: string
            }, fn: (producer: GlobalVideoProducer) => void
        ) => {
            // Get current stage id
            logger.debug("[SOCKET DEVICE HANDLER] ADD VIDEO PRODUCER " + payload.routerId);
            return this.database.createVideoProducer({
                ...payload,
                deviceId: this.device._id,
                userId: this.user._id,
            })
                .then(producer => fn(producer));
        });
        this.socket.on(ClientDeviceEvents.CHANGE_VIDEO_PRODUCER, (payload: { id: GlobalVideoProducerId, producer: Partial<GlobalVideoProducer> }, fn: (producer: GlobalVideoProducer) => void) =>
                //TODO: Validate data
            {
                logger.debug("[SOCKET DEVICE HANDLER] CHANGE VIDEO PRODUCER " + payload.id);
                return this.database.updateVideoProducer(this.device._id, payload.id, payload.producer)
                    .then(producer => fn(producer))
            }
        );
        this.socket.on(ClientDeviceEvents.REMOVE_VIDEO_PRODUCER, (id: GlobalVideoProducerId, fn: () => void) => {
            logger.debug("[SOCKET DEVICE HANDLER] REMOVE VIDEO PRODUCER " + id);
                return this.database.deleteVideoProducer(this.device._id, id)
                    .then(() => fn())
            }
        );

        this.socket.on(ClientDeviceEvents.ADD_SOUND_CARD, (id: string, initial: Partial<SoundCard>, fn: (soundCard: SoundCard) => void) =>
            //TODO: Validate data
            this.database.createSoundCard({
                name: "",
                numInputChannels: 0,
                numOutputChannels: 0,
                sampleRate: 48000,
                periodSize: 96,
                numPeriods: 2,
                driver: "JACK",
                ...initial,
                userId: this.user._id
            })
                .then(soundCard => fn(soundCard)));
        this.socket.on(ClientDeviceEvents.CHANGE_SOUND_CARD, (id: string, update: Partial<Omit<SoundCard, "_id">>, fn: (soundCard: SoundCard) => void) =>
            //TODO: Validate data
            this.database.updateSoundCard(this.device._id, id, update)
                .then(soundCard => fn(soundCard))
        );
        this.socket.on(ClientDeviceEvents.REMOVE_SOUND_CARD, (id: string, fn: () => void) =>
            this.database.deleteSoundCard(this.device._id, id)
                .then(() => fn())
        );

        this.socket.on(ClientDeviceEvents.ADD_TRACK_PRESET, (id: string, initial: Partial<Omit<TrackPreset, "_id">>, fn: (trackPreset: TrackPreset) => void) => {
            if (initial.soundCardId) {
                return this.database.createTrackPreset({
                    name: "",
                    outputChannels: [],
                    ...initial,
                    soundCardId: initial.soundCardId,
                    userId: this.user._id
                })
                    .then(trackPreset => fn(trackPreset));
            }
        });
        this.socket.on(ClientDeviceEvents.CHANGE_TRACK_PRESET, (id: string, update: Partial<TrackPreset>, fn: (trackPreset: TrackPreset) => void) =>
            this.database.updateTrackPreset(this.device._id, id, update)
                .then(trackPreset => fn(trackPreset))
        );
        this.socket.on(ClientDeviceEvents.REMOVE_TRACK_PRESET, (id: string, fn: () => void) =>
            this.database.deleteTrackPreset(this.device._id, id)
                .then(() => fn())
        );

        this.socket.on(ClientDeviceEvents.ADD_TRACK, (id: string, initial: Partial<Omit<Track, "_id">>, fn: (track: Track) => void) => {
            if (initial.trackPresetId && initial.soundCardId) {
                return this.database.createTrack({
                    channel: 0,
                    gain: 1,
                    volume: 1,
                    directivity: "omni",
                    ...initial,
                    trackPresetId: initial.trackPresetId,
                    soundCardId: initial.soundCardId,
                    online: true,
                    userId: this.user._id,
                })
                    .then(track => fn(track));
            }
        });
        this.socket.on(ClientDeviceEvents.CHANGE_TRACK, (id: string, update: Partial<Track>, fn: (track: Track) => void) =>
            this.database.updateTrack(this.device._id, id, update)
                .then(track => fn(track))
        );
        this.socket.on(ClientDeviceEvents.REMOVE_TRACK, (id: string, fn: () => void) =>
            this.database.deleteTrack(this.device._id, id)
                .then(() => fn())
        );

        this.socket.on("disconnect", async () => {
            console.log("DISCONNECTING");
            if (this.device && !this.device.mac) {
                logger.debug("Removed device '" + this.device.name + "' of " + this.user.name);
                return this.database.deleteDevice(this.device._id);
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
        logger.debug("[SOCKET DEVICE HANDLER] Registered handler for user " + this.user.name + " at socket " + this.socket.id);
    }

    async generateDevice(): Promise<Device> {
        logger.debug("Generating device for user " + this.user.name + "...");
        let initialDevice: Device;
        if (this.socket.handshake.query && this.socket.handshake.query.device) {
            initialDevice = JSON.parse(this.socket.handshake.query.device);
            if (initialDevice.mac) {
                // Try to get device by mac
                this.device = await this.database.readDeviceByUserAndMac(this.user._id, initialDevice.mac);
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
            soundCardIds: [],
            server: serverAddress,
            userId: this.user._id,
            online: true
        };
        this.device = await this.database.createDevice(device);
        // In addition notify user (not in the socket group yet)
        this.database.sendToDevice(this.socket, ServerDeviceEvents.LOCAL_DEVICE_READY, this.device);
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
                        return this.database.sendToDevice(this.socket, ServerDeviceEvents.DEVICE_ADDED, remoteDevice);
                    }
                })
            );
    }
}