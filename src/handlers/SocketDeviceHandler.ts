import { ObjectId } from 'mongodb';
import * as pino from 'pino';
import { omit } from 'lodash';
import {
  Device,
  GlobalAudioProducer,
  GlobalVideoProducer,
  SoundCard,
  Track,
  TrackPreset,
  User,
} from '../model.server';
import { ClientDeviceEvents, ServerDeviceEvents } from '../events';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import {
  AddAudioProducerPayload, AddSoundCardPayload, AddTrackPayload, AddTrackPresetPayload,
  AddVideoProducerPayload, ChangeSoundCardPayload, ChangeTrackPayload, ChangeTrackPresetPayload,
  RemoveAudioProducerPayload, RemoveSoundCardPayload, RemoveTrackPayload, RemoveTrackPresetPayload,
  RemoveVideoProducerPayload,
} from '../payloads';
import ISocket from '../socket/ISocket';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

class SocketDeviceHandler {
  private readonly serverAddress: string;

  private readonly database: MongoRealtimeDatabase;

  private readonly user: User;

  private readonly socket: ISocket;

  private device: Device;

  constructor(
    serverAddress: string,
    database: MongoRealtimeDatabase,
    user: User,
    socket: ISocket,
  ) {
    this.serverAddress = serverAddress;
    this.user = user;
    this.database = database;
    this.socket = socket;
  }

  init() {
    this.socket.on(ClientDeviceEvents.UPDATE_DEVICE, (payload: Partial<Device>) => {
      if (!payload._id) return Promise.resolve();
      return this.database.updateDevice(this.user._id, payload._id, omit(payload, '_id'));
    });

    this.socket.on(ClientDeviceEvents.ADD_AUDIO_PRODUCER, (
      payload: AddAudioProducerPayload,
      fn: (error: string | null, producer?: GlobalAudioProducer) => void,
    ) => {
      const routerId = new ObjectId(payload.routerId);
      // Get current stage id
      return this.database.createAudioProducer({
        routerId,
        routerProducerId: payload.routerProducerId,
        deviceId: this.device._id,
        userId: this.user._id,
      })
        .then((producer) => fn(null, producer))
        .catch((error) => fn(error.message));
    });
    this.socket.on(ClientDeviceEvents.REMOVE_AUDIO_PRODUCER, (
      payload: RemoveAudioProducerPayload,
      fn: (error?: string) => void,
    ) => {
      const id = new ObjectId(payload);
      return this.database.deleteAudioProducer(this.user._id, id)
        .then(() => {
          fn();
        })
        .catch((error) => {
          logger.error(error);
          fn(error.message);
        });
    });

    this.socket.on(ClientDeviceEvents.ADD_VIDEO_PRODUCER, (
      payload: AddVideoProducerPayload,
      fn: (error: string | null, producer?: GlobalVideoProducer) => void,
    ) => {
      // Get current stage id
      logger.debug(`[SOCKET DEVICE HANDLER] ADD VIDEO PRODUCER ${payload.routerId}`);
      const routerId = new ObjectId(payload.routerId);
      return this.database.createVideoProducer({
        routerId,
        routerProducerId: payload.routerProducerId,
        deviceId: this.device._id,
        userId: this.user._id,
      })
        .then((producer) => fn(null, producer))
        .catch((error) => fn(error.message));
    });
    this.socket.on(ClientDeviceEvents.REMOVE_VIDEO_PRODUCER, (payload: RemoveVideoProducerPayload,
      fn: (error?: string) => void) => {
      const id = new ObjectId(payload);
      logger.debug(`[SOCKET DEVICE HANDLER] REMOVE VIDEO PRODUCER ${payload}`);
      return this.database.deleteVideoProducer(this.user._id, id)
        .then(() => {
          fn();
        })
        .catch((error) => {
          logger.error(error);
          fn(error.message);
        });
    });

    this.socket.on(ClientDeviceEvents.ADD_SOUND_CARD, (payload: AddSoundCardPayload,
      fn: (soundCard: SoundCard) => void) => this.database.createSoundCard({
      name: '',
      numInputChannels: 0,
      numOutputChannels: 0,
      sampleRate: 48000,
      periodSize: 96,
      numPeriods: 2,
      driver: 'JACK',
      ...payload.initial,
      trackPresetId: payload.initial.trackPresetId
        ? new ObjectId(payload.initial.trackPresetId) : undefined,
      userId: this.user._id,
    })
      .then((soundCard) => fn(soundCard)));
    this.socket.on(ClientDeviceEvents.CHANGE_SOUND_CARD, (
      payload: ChangeSoundCardPayload,
      fn: (soundCard: Partial<SoundCard>) => void,
    ) => {
      const id = new ObjectId(payload.id);
      const trackPresetId = payload.update.trackPresetId
        ? new ObjectId(payload.update.trackPresetId) : undefined;
      this.database.updateSoundCard(this.device._id, id, {
        ...payload.update,
        trackPresetId,
      })
        .then(() => fn({
          ...payload.update,
          trackPresetId,
          _id: id,
        }));
    });
    this.socket.on(ClientDeviceEvents.REMOVE_SOUND_CARD, (
      id: RemoveSoundCardPayload,
      fn: () => void,
    ) => this.database.deleteSoundCard(this.device._id, new ObjectId(id))
      .then(() => fn()));

    this.socket.on(ClientDeviceEvents.ADD_TRACK_PRESET, (
      payload: AddTrackPresetPayload,
      fn: (trackPreset: TrackPreset) => void,
    ) => {
      const soundCardId = new ObjectId(payload.initial.soundCardId);
      return this.database.createTrackPreset({
        name: '',
        outputChannels: [],
        ...payload.initial,
        soundCardId,
        userId: this.user._id,
      })
        .then((trackPreset) => fn(trackPreset));
    });
    this.socket.on(ClientDeviceEvents.CHANGE_TRACK_PRESET, (
      payload: ChangeTrackPresetPayload,
      fn: (trackPreset: Partial<TrackPreset>) => void,
    ) => {
      const id = new ObjectId(payload.id);
      return this.database.updateTrackPreset(this.device._id, id, payload.update)
        .then(() => fn({
          ...payload.update,
          _id: id,
        }));
    });
    this.socket.on(ClientDeviceEvents.REMOVE_TRACK_PRESET, (
      id: RemoveTrackPresetPayload,
      fn: () => void,
    ) => this.database.deleteTrackPreset(this.device._id, new ObjectId(id))
      .then(() => fn()));

    this.socket.on(ClientDeviceEvents.ADD_TRACK, (
      payload: AddTrackPayload,
      fn: (track: Track) => void,
    ) => {
      if (payload.initial.trackPresetId) {
        const trackPresetId = new ObjectId(payload.initial.trackPresetId);
        return this.database.createTrack({
          channel: payload.initial.channel || 0,
          gain: payload.initial.gain || 0,
          volume: payload.initial.volume || 1,
          directivity: payload.initial.directivity || 'omni',
          trackPresetId,
          online: true,
          userId: this.user._id,
        })
          .then((track) => fn(track));
      }
      return Promise.resolve();
    });
    this.socket.on(ClientDeviceEvents.CHANGE_TRACK, (
      payload: ChangeTrackPayload,
      fn: (track: Partial<Track>) => void,
    ) => {
      const id = new ObjectId(payload.id);
      return this.database.updateTrack(this.device._id, id, payload.update)
        .then(() => fn({
          ...payload.update,
          _id: id,
        }));
    });
    this.socket.on(ClientDeviceEvents.REMOVE_TRACK, (
      id: RemoveTrackPayload,
      fn: () => void,
    ) => this.database.deleteTrack(this.device._id, new ObjectId(id))
      .then(() => fn()));

    this.socket.on('disconnect', async () => {
      if (this.device && !this.device.mac) {
        logger.debug(`Removed device '${this.device.name}' of ${this.user.name}`);
        return this.database.deleteDevice(this.device._id)
          .then(() => this.database.renewOnlineStatus(this.user._id));
      }
      logger.debug(`Switched device '${this.device.name}' of ${this.user.name} to offline`);
      return this.database.updateDevice(this.user._id, this.device._id, { online: false })
        .then(() => this.database.renewOnlineStatus(this.user._id));
    });
    logger.debug(`[SOCKET DEVICE HANDLER] Registered handler for user ${this.user.name} at socket ${this.socket.id}`);
  }

  async generateDevice(initialDevice?: Partial<Device>): Promise<Device> {
    logger.debug(`Generating device for user ${this.user.name}...`);
    if (initialDevice && initialDevice.mac) {
      // Try to get device by mac
      this.device = await this.database.readDeviceByUserAndMac(this.user._id, initialDevice.mac);
      if (this.device) {
        this.device.online = true;
        return this.database.updateDevice(this.user._id, this.device._id, { online: true })
          .then(() => this.device);
      }
    }
    // We have to create the device
    const device: Omit<Device, '_id'> = {
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
      soundCardIds: [],
      name: '',
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
      this.device,
    );
    logger.debug(`Finished generating device for user ${this.user.name} by creating new.`);
    return this.device;
  }

  public sendRemoteDevices(): Promise<void> {
    // Send other devices
    return this.database.readDevicesByUser(this.user._id)
      .then((remoteDevices) => remoteDevices.forEach((remoteDevice) => {
        if (remoteDevice._id.toString() !== this.device._id.toString()) {
          logger.debug(`Sent remote device ${remoteDevice._id} to device ${this.device.name} of ${this.user.name}!`);
          MongoRealtimeDatabase.sendToDevice(
            this.socket,
            ServerDeviceEvents.DEVICE_ADDED,
            remoteDevice,
          );
        }
      }));
  }
}

export default SocketDeviceHandler;
