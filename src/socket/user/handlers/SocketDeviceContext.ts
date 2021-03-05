import { ObjectId } from "mongodb";
import { omit } from "lodash";
import { ITeckosSocket } from "teckos";
import {
  Device,
  GlobalAudioProducer,
  GlobalVideoProducer,
  SoundCard,
  OvTrack,
  User,
} from "../../../types";
import { ClientDeviceEvents, ServerDeviceEvents } from "../../../events";
import MongoRealtimeDatabase from "../../../database/MongoRealtimeDatabase";
import {
  AddAudioProducerPayload,
  AddSoundCardPayload,
  AddTrackPayload,
  AddVideoProducerPayload,
  ChangeSoundCardPayload,
  ChangeTrackPayload,
  RemoveAudioProducerPayload,
  RemoveSoundCardPayload,
  RemoveTrackPayload,
  RemoveVideoProducerPayload,
} from "../../../payloads";
import logger from "../../../logger";

const { trace, error } = logger("socket:device");

class SocketDeviceContext {
  private readonly serverAddress: string;

  private readonly database: MongoRealtimeDatabase;

  private readonly user: User;

  private readonly socket: ITeckosSocket;

  private device: Device;

  constructor(
    serverAddress: string,
    database: MongoRealtimeDatabase,
    user: User,
    socket: ITeckosSocket
  ) {
    this.serverAddress = serverAddress;
    this.user = user;
    this.database = database;
    this.socket = socket;
  }

  init() {
    this.socket.on(
      ClientDeviceEvents.UPDATE_DEVICE,
      (payload: Partial<Device>) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.UPDATE_DEVICE}`);
        if (!payload._id) return Promise.resolve();
        const deviceId = new ObjectId(payload._id);
        const update = omit(payload, "_id");
        return this.database
          .updateDevice(this.user._id, deviceId, update)
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientDeviceEvents.ADD_AUDIO_PRODUCER,
      (
        payload: AddAudioProducerPayload,
        fn: (error: string | null, producer?: GlobalAudioProducer) => void
      ) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.ADD_AUDIO_PRODUCER}`);
        const routerId = new ObjectId(payload.routerId);
        // Get current stage id
        this.database
          .createAudioProducer({
            routerId,
            routerProducerId: payload.routerProducerId,
            deviceId: this.device._id,
            userId: this.user._id,
          })
          .then((producer) => fn(null, producer))
          .catch((e) => fn(e.message));
      }
    );
    this.socket.on(
      ClientDeviceEvents.REMOVE_AUDIO_PRODUCER,
      (payload: RemoveAudioProducerPayload, fn: (error?: string) => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.REMOVE_AUDIO_PRODUCER}`);
        const id = new ObjectId(payload);
        this.database
          .deleteAudioProducer(this.user._id, id)
          .then(() => fn())
          .catch((e) => {
            error(e);
            fn(e.message);
          });
      }
    );

    this.socket.on(
      ClientDeviceEvents.ADD_VIDEO_PRODUCER,
      (
        payload: AddVideoProducerPayload,
        fn: (error: string | null, producer?: GlobalVideoProducer) => void
      ) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.ADD_VIDEO_PRODUCER}`);
        // Get current stage id
        trace(
          `ADD VIDEO PRODUCER FOR MS PRODUCER ${payload.routerProducerId} AND ROUTER ${payload.routerId}`
        );
        const routerId = new ObjectId(payload.routerId);
        this.database
          .createVideoProducer({
            routerId,
            routerProducerId: payload.routerProducerId,
            deviceId: this.device._id,
            userId: this.user._id,
          })
          .then((producer) => fn(null, producer))
          .catch((e) => fn(e.message));
      }
    );
    this.socket.on(
      ClientDeviceEvents.REMOVE_VIDEO_PRODUCER,
      (payload: RemoveVideoProducerPayload, fn: (error?: string) => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.REMOVE_VIDEO_PRODUCER}`);
        const id = new ObjectId(payload);
        trace(`REMOVE VIDEO PRODUCER ${payload}`);
        this.database
          .deleteVideoProducer(this.user._id, id)
          .then(() => fn())
          .catch((e) => {
            error(e);
            fn(e.message);
          });
      }
    );

    this.socket.on(
      ClientDeviceEvents.SET_SOUND_CARD,
      (payload: AddSoundCardPayload, fn?: (soundCard: SoundCard) => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.SET_SOUND_CARD}`);

        this.database
          .setSoundCard(this.user._id, this.device._id, payload.name, {
            deviceId: this.device._id,
            label: "",
            numInputChannels: 0,
            numOutputChannels: 0,
            sampleRate: 48000,
            periodSize: 96,
            numPeriods: 2,
            driver: "JACK",
            isDefault: false,
            sampleRates: [],
            inputChannels: [],
            outputChannels: [],
            ...payload,
          })
          .then((soundCard) => {
            if (fn) return fn(soundCard);
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientDeviceEvents.CHANGE_SOUND_CARD,
      (
        payload: ChangeSoundCardPayload,
        fn?: (soundCard: Partial<SoundCard>) => void
      ) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.CHANGE_SOUND_CARD}`);
        const id = new ObjectId(payload.id);
        this.database
          .updateSoundCard(this.device._id, id, {
            ...payload.update,
            deviceId: this.device._id,
          })
          .then(() => {
            if (fn) {
              return fn({
                ...payload.update,
                deviceId: this.device._id,
                _id: id,
              });
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientDeviceEvents.REMOVE_SOUND_CARD,
      (id: RemoveSoundCardPayload, fn?: () => void) => {
        trace(
          `${this.user.name}: ${ClientDeviceEvents.REMOVE_SOUND_CARD} with id ${id}`
        );
        this.database
          .deleteSoundCard(this.user._id, new ObjectId(id))
          .then(() => {
            if (fn) return fn();
            return null;
          })
          .catch((e) => error(e));
      }
    );
    /*
        this.socket.on(
            ClientDeviceEvents.ADD_TRACK_PRESET,
            (
                payload: AddTrackPresetPayload,
                fn: (trackPreset: TrackPreset) => void
            ) => {
                trace(`${this.user.name}: ${ClientDeviceEvents.ADD_TRACK_PRESET}`);
                const soundCardId = new ObjectId(payload.soundCardId);
                this.database
                    .createTrackPreset({
                        name: "",
                        inputChannels: [],
                        outputChannels: [],
                        ...payload,
                        soundCardId,
                        userId: this.user._id,
                    })
                    .then((trackPreset) => {
                        if (fn) return fn(trackPreset);
                        return null;
                    })
                    .catch((e) => error(e));
            }
        );
        this.socket.on(
            ClientDeviceEvents.CHANGE_TRACK_PRESET,
            (
                payload: ChangeTrackPresetPayload,
                fn: (trackPreset: Partial<TrackPreset>) => void
            ) => {
                trace(`${this.user.name}: ${ClientDeviceEvents.CHANGE_TRACK_PRESET}`);
                const id = new ObjectId(payload.id);
                this.database
                    .updateTrackPreset(this.user._id, id, payload.update)
                    .then(() => {
                        if (fn) {
                            return fn({
                                ...payload.update,
                                _id: id,
                            });
                        }
                        return null;
                    })
                    .catch((e) => error(e));
            }
        );
        this.socket.on(
            ClientDeviceEvents.REMOVE_TRACK_PRESET,
            (id: RemoveTrackPresetPayload, fn: () => void) => {
                trace(`${this.user.name}: ${ClientDeviceEvents.REMOVE_TRACK_PRESET}`);
                this.database
                    .deleteTrackPreset(this.user._id, new ObjectId(id))
                    .then(() => {
                        if (fn) return fn();
                        return null;
                    })
                    .catch((e) => error(e));
            }
        ); */

    this.socket.on(
      ClientDeviceEvents.ADD_TRACK,
      (payload: AddTrackPayload, fn: (track: OvTrack) => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.ADD_TRACK}`);
        if (payload.soundCardId && payload.channel) {
          const soundCardId = new ObjectId(payload.soundCardId);
          this.database
            .createOvTrack({
              channel: payload.channel,
              soundCardId,
              userId: this.user._id,
              deviceId: this.device._id,
            })
            .then((track) => fn(track))
            .catch((e) => error(e));
        }
      }
    );
    this.socket.on(
      ClientDeviceEvents.CHANGE_TRACK,
      (payload: ChangeTrackPayload, fn: (track: Partial<OvTrack>) => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.CHANGE_TRACK}`);
        const id = new ObjectId(payload.id);
        this.database
          .updateOvTrack(this.device._id, id, payload.update)
          .then(() =>
            fn({
              ...payload.update,
              _id: id,
            })
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientDeviceEvents.REMOVE_TRACK,
      (id: RemoveTrackPayload, fn: () => void) => {
        trace(`${this.user.name}: ${ClientDeviceEvents.CHANGE_TRACK}`);
        this.database
          .deleteOvTrack(this.device._id, new ObjectId(id))
          .then(() => fn())
          .catch((e) => error(e));
      }
    );

    this.socket.on("disconnect", async () => {
      if (this.device && !this.device.mac) {
        return this.database
          .deleteDevice(this.device._id)
          .then(() => this.database.renewOnlineStatus(this.user._id))
          .then(() =>
            trace(`Removed device '${this.device.name}' of ${this.user.name}`)
          )
          .catch((e) => error(e));
      }
      return this.database
        .updateDevice(this.user._id, this.device._id, { online: false })
        .then(() => this.database.renewOnlineStatus(this.user._id))
        .then(() =>
          trace(
            `Switched device '${this.device.name}' of ${this.user.name} to offline`
          )
        )
        .catch((e) => error(e));
    });
    trace(
      `Registered handler for user ${this.user.name} at socket ${this.socket.id}`
    );
  }

  async generateDevice(initialDevice?: Partial<Device>): Promise<Device> {
    trace(`Generating device for user ${this.user.name}...`);
    if (initialDevice && initialDevice.mac) {
      // Try to get device by mac
      this.device = await this.database.readDeviceByUserAndMac(
        this.user._id,
        initialDevice.mac
      );
      if (this.device) {
        this.device.online = true;
        return this.database
          .updateDevice(this.user._id, this.device._id, { online: true })
          .then(() => {
            MongoRealtimeDatabase.sendToDevice(
              this.socket,
              ServerDeviceEvents.LOCAL_DEVICE_READY,
              this.device
            );
            return this.device;
          });
      }
    }
    // We have to create the device
    const device: Omit<Device, "_id"> = {
      canVideo: false,
      canAudio: false,
      canOv: false,
      sendAudio: false,
      sendVideo: false,
      receiveAudio: false,
      receiveVideo: false,
      inputVideoDevices: [],
      inputAudioDevices: [],
      outputAudioDevices: [],
      soundCardNames: [],
      name: "",
      receiverType: "ortf",
      senderJitter: 10,
      receiverJitter: 10,
      p2p: true,
      renderReverb: true,
      reverbGain: 1,
      renderISM: false,
      rawMode: false,
      egoGain: 1,
      ...initialDevice,
      server: this.serverAddress,
      userId: this.user._id,
      online: true,
    };
    this.device = await this.database.createDevice(device);
    // In addition notify user (not in the socket group yet)
    MongoRealtimeDatabase.sendToDevice(
      this.socket,
      ServerDeviceEvents.LOCAL_DEVICE_READY,
      this.device
    );
    trace(
      `Finished generating device for user ${this.user.name} by creating new.`
    );
    return this.device;
  }

  public sendRemoteDevices(): Promise<void> {
    // Send other devices
    return this.database
      .readDevicesByUser(this.user._id)
      .then((remoteDevices) =>
        remoteDevices.forEach((remoteDevice) => {
          if (remoteDevice._id.toString() !== this.device._id.toString()) {
            trace(
              `Sent remote device ${remoteDevice._id} to device ${this.device.name} of ${this.user.name}!`
            );
            MongoRealtimeDatabase.sendToDevice(
              this.socket,
              ServerDeviceEvents.DEVICE_ADDED,
              remoteDevice
            );
          }
        })
      );
  }

  public sendSoundCards(): Promise<void> {
    trace("Sending device configurations");
    return this.database.sendDeviceConfigurationToDevice(
      this.socket,
      this.user
    );
  }
}

export default SocketDeviceContext;
