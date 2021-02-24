import { ObjectId } from 'mongodb';
import ThreeDimensionAudioProperties from './ThreeDimensionAudioProperties';

export type StageId = ObjectId;
export type GroupId = ObjectId;
export type UserId = ObjectId;
export type StageMemberId = ObjectId;
export type DeviceId = ObjectId;
export type WebRTCDeviceId = ObjectId;
export type TrackPresetId = ObjectId;
export type RouterId = ObjectId;
export type CustomGroupId = ObjectId;
export type CustomStageMemberId = ObjectId;
export type VideoDeviceId = ObjectId;
export type GlobalAudioProducerId = ObjectId;
export type GlobalVideoProducerId = ObjectId;
export type SoundCardId = ObjectId;
export type StageMemberProducerId = ObjectId;
export type SoundCardChannelId = ObjectId;
export type TrackId = ObjectId;
export type StageMemberVideoProducerId = ObjectId;
export type StageMemberAudioProducerId = ObjectId;
export type CustomStageMemberAudioProducerId = ObjectId;
export type StageMemberOvTrackId = ObjectId;
export type CustomStageMemberOvTrackId = ObjectId;

export interface Router {
  _id: RouterId;
  wsPrefix: string;
  restPrefix: string;
  url: string;
  path: string;
  ipv4: string;
  ipv6: string;
  port: number;
  availableRTCSlots: number;
  availableOVSlots: number;

  // Optimizations for performance and redundancy
  server?: string;
}

export interface User {
  _id: UserId;
  uid?: string;

  // SETTINGS
  name: string;
  avatarUrl?: string;

  stageId?: StageId; // <--- RELATION
  stageMemberId?: StageMemberId; // <--- RELATION
}

export interface Device {
  _id: DeviceId;
  userId: UserId;
  online: boolean;
  mac?: string;
  name: string;
  canVideo: boolean;
  canAudio: boolean;
  canOv: boolean;
  sendVideo: boolean;
  sendAudio: boolean;
  receiveVideo: boolean;
  receiveAudio: boolean;

  // WebRTC video device
  inputVideoDevices: WebRTCDevice[];
  inputVideoDeviceId?: WebRTCDeviceId;

  // WebRTC audio device
  inputAudioDevices: WebRTCDevice[];
  inputAudioDeviceId?: WebRTCDeviceId;
  outputAudioDevices: WebRTCDevice[];
  outputAudioDeviceId?: WebRTCDeviceId;

  // WebRTC options
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  noiseSuppression?: boolean;

  // OV SoundCards
  soundCardNames: string[];
  soundCardName?: string;

  // Optional for ov-based clients
  senderJitter?: number;
  receiverJitter?: number;

  // Optimizations for performance
  server: string;
}

export interface WebRTCDevice {
  id: WebRTCDeviceId;
  label: string;
}

export interface SoundCard { // ov-specific
  _id: SoundCardId;
  userId: UserId;
  name: string; // unique together with userId

  isDefault?: boolean;

  driver: 'JACK' | 'ALSA' | 'ASIO' | 'WEBRTC',

  numInputChannels: number;
  numOutputChannels: number;

  trackPresetId?: TrackPresetId; // Current default preset (outside or on new stages)

  sampleRate: number;
  sampleRates: number[];
  periodSize: number;
  numPeriods: number; // default to 2

  softwareLatency?: number;

  // Optimizations for performance
  // trackPresets: TrackPresetId[];
}

/**
 * A preset for channels / track configuration
 */
export interface TrackPreset {
  _id: TrackPresetId;
  userId: UserId; // <--- RELATION
  soundCardId: SoundCardId; // <--- RELATION
  name: string;
  inputChannels: number[];
  outputChannels: number[]; // For the output use simple numbers TODO: @Giso, is this enough?

  // Optimization
  // trackIds: TrackId[];
}

/**
 * A track is always assigned to a specific stage member and channel of an sound card.
 *
 */
export interface Track {
  _id: TrackId;
  trackPresetId: TrackPresetId; // <--- RELATION
  channel: number; // UNIQUE WITH TRACK PRESET ID

  online: boolean;

  gain: number;
  volume: number;

  directivity: 'omni' | 'cardioid'

  // Optimizations for performance
  userId: UserId;
  // soundCardId: SoundCardId;
}

// WEBRTC specific
interface GlobalProducer {
  deviceId: DeviceId; // <-- RELATION

  routerId: RouterId | 'STANDALONE';
  routerProducerId: string;

  // Optimizations for performance
  userId: UserId;
}

export interface GlobalVideoProducer extends GlobalProducer {
  _id: GlobalVideoProducerId;
}

export interface GlobalAudioProducer extends GlobalProducer {
  _id: GlobalAudioProducerId;
}

export interface Stage {
  _id: StageId;
  name: string;

  // SETTINGS
  admins: UserId[];
  password: string | null;
  // 3D Room specific
  width: number;
  length: number;
  height: number;
  absorption: number;
  damping: number;

  ovServer?: {
    router: RouterId;
    ipv4: string;
    ipv6?: string;
    port: number;
  }
}

/**
 * A group can be only modified by admins
 */
export interface Group extends ThreeDimensionAudioProperties {
  _id: GroupId;
  name: string;
  stageId: StageId; // <--- RELATION
}

/**
 * Each user can overwrite the global group settings with personal preferences
 */
export interface CustomGroup extends ThreeDimensionAudioProperties {
  _id: CustomGroupId;
  userId: UserId; // <--- RELATION
  groupId: GroupId; // <--- RELATION

  // Optimizations for performance
  // stageId: StageId;
}

/**
 * A stage member is the associated between a user and a stage.
 * Settings can be only modified by admins.
 */
export interface StageMember extends ThreeDimensionAudioProperties {
  _id: StageMemberId;
  groupId: GroupId; // <--- RELATION
  userId: UserId; // <--- RELATION

  online: boolean;

  // SETTINGS (modifiable only by admins)
  isDirector: boolean;

  // Optimizations for performance
  stageId: StageId;
  // videoProducers: StageMemberVideoProducerId[];
  // audioProducers: StageMemberAudioProducerId[];
  // ovTracks: StageMemberOvTrackId[];
}

/**
 * Each user can overwrite the global stage member settings with personal preferences
 */
export interface CustomStageMember extends ThreeDimensionAudioProperties {
  _id: CustomStageMemberId;
  userId: UserId; // <--- RELATION
  stageMemberId: StageMemberId; // <--- RELATION

  // Optimizations for performance
  stageId: StageId;
}

export interface StageMemberVideoProducer {
  _id: StageMemberVideoProducerId;
  stageMemberId: StageMemberId; // <-- RELATION
  globalProducerId: GlobalVideoProducerId; // <-- RELATION

  online: boolean;

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}

export interface StageMemberAudioProducer extends ThreeDimensionAudioProperties {
  _id: StageMemberVideoProducerId;
  stageMemberId: StageMemberId; // <-- RELATION
  globalProducerId: GlobalAudioProducerId; // <-- RELATION

  online: boolean;

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}

export interface CustomStageMemberAudioProducer extends ThreeDimensionAudioProperties {
  _id: CustomStageMemberAudioProducerId;
  userId: UserId; // <-- RELATION
  stageMemberAudioProducerId: StageMemberAudioProducerId; // <-- RELATION

  // Optimizations for performance
  stageId: StageId;
}

/**
 * A stage member track is a track,
 * that has been published and assigned to the related stage member.
 * So all other stage members will receive this track.
 *
 * Important: a track can point to an ov-based track or an webrtc-based producer (!)
 *
 * However, spatial audio settings are stored for both,
 * maybe for integrating webrtc and ov later and use
 * the web audio api panner for 3D audio interpolation later.
 */
export interface StageMemberOvTrack extends Track, ThreeDimensionAudioProperties {
  _id: StageMemberOvTrackId;
  trackId: TrackId; // <-- RELATION
  stageMemberId: StageMemberId; // <-- RELATION

  online: boolean;

  gain: number; // Overrides track gain (for stage)

  directivity: 'omni' | 'cardioid'; // Overrides track directivity (for stage)

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}

/**
 * Each user can overwrite the global stage member track settings with personal preferences.
 */
export interface CustomStageMemberOvTrack extends ThreeDimensionAudioProperties {
  _id: CustomStageMemberOvTrackId;

  userId: UserId; // <-- RELATION
  stageMemberOvTrackId: StageMemberOvTrackId; // <-- RELATION

  gain: number; // Overrides track gain (for user)

  directivity: 'omni' | 'cardioid'; // Overrides track directivity (for user)

  // Optimizations for performance
  stageId: StageId;
}

export interface StagePackage {
  users: User[];

  stage?: Stage;
  groups?: Group[];
  stageMembers: StageMember[];
  customGroups: CustomGroup[];
  customStageMembers: CustomStageMember[];
  videoProducers: StageMemberVideoProducer[];
  audioProducers: StageMemberAudioProducer[];
  customAudioProducers: CustomStageMemberAudioProducer[];
  ovTracks: StageMemberOvTrack[];
  customOvTracks: CustomStageMemberOvTrack[];
}

export interface InitialStagePackage extends StagePackage {
  stageId: StageId;
  groupId: GroupId;
}

export interface ChatMessage {
  userId: UserId;
  stageMemberId: StageMemberId;
  message: string;
  time: number;
}

export {
  ThreeDimensionAudioProperties,
};
