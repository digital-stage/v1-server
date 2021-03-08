import ThreeDimensionProperties from "./types/ThreeDimensionProperties";
import { ThreeDimensionAudioProperties } from "./types";

export interface StageManaged {
  id: string;
  ovServer: {
    ipv4: string;
    ipv6?: string;
    port: number;
    pin: number;
  };
}

export type StageUnManaged = string;

// DEVICE
export interface AddAudioProducerPayload {
  routerId: string;
  routerProducerId: string;
}

export type RemoveAudioProducerPayload = string;

export interface AddVideoProducerPayload {
  routerId: string;
  routerProducerId: string;
}

export interface ChangeVideoProducerPayload {
  id: string;
  producer: Partial<{
    routerId: string;
    routerProducerId: string;
  }>;
}

export type RemoveVideoProducerPayload = string;

export interface AddSoundCardPayload {
  name: string;
  label?: string;
  driver: "jack" | "alsa" | "asio" | "webrtc";
  numInputChannels?: number;
  numOutputChannels?: number;
  trackPresetId?: string;
  sampleRate?: number;
  periodSize?: number;
  numPeriods?: number; // default to 2
}

export interface ChangeSoundCardPayload {
  id: string;
  update: Partial<{
    name: string;
    label: string;
    driver: "jack" | "alsa" | "asio" | "webrtc";
    numInputChannels?: number;
    numOutputChannels?: number;
    trackPresetId?: string;
    sampleRate?: number;
    periodSize?: number;
    numPeriods?: number; // default to 2
  }>;
}

export type RemoveSoundCardPayload = string;

export interface AddTrackPresetPayload {
  soundCardId: string;
  name?: string;
  inputChannels?: number[];
  outputChannels?: number[];
}

export interface ChangeTrackPresetPayload {
  id: string;
  update: Partial<{
    name: string;
    inputChannels: number[];
    outputChannels: number[];
  }>;
}

export type RemoveTrackPresetPayload = string;

export interface AddTrackPayload {
  soundCardId: string;
  channel: number;
}

export interface ChangeTrackPayload {
  id: string;
  update: Partial<{
    channel: number;
    gain: number;
    volume: number;
    directivity: "omni" | "cardioid";
  }>;
}

export type RemoveTrackPayload = string;

// STAGE
export type AddStagePayload = Partial<{
  name: string;
  password?: string;
  width?: number;
  length?: number;
  height?: number;
  absorption?: number;
  damping?: number;
  admins?: string[];
}>;

export interface ChangeStagePayload {
  id: string;
  update: Partial<{
    name: string;
    password: string;
    width: number;
    length: number;
    height: number;
    absorption: number;
    damping: number;
    // admins: string[];
  }>;
}

export type RemoveStagePayload = string;

// GROUP
export interface AddGroupPayload
  extends Partial<ThreeDimensionAudioProperties> {
  stageId: string;
  name: string;
}

export interface ChangeGroupPayload {
  id: string;
  update: Partial<ThreeDimensionAudioProperties>;
}

export type RemoveGroupPayload = string;

// STAGE MEMBER
export interface ChangeStageMemberPayload {
  id: string;
  update: Partial<
    {
      isDirector: boolean;
    } & ThreeDimensionAudioProperties
  >;
}

export type RemoveStageMemberPayload = string;

// STAGE MEMBER AUDIO PRODUCER
export interface ChangeStageMemberAudioProducerPayload {
  id: string;
  update: Partial<ThreeDimensionAudioProperties>;
}

// STAGE MEMBER OV TRACK
export interface ChangeStageMemberOvTrackPayload {
  id: string;
  update: Partial<ThreeDimensionAudioProperties>;
}

// CUSTOM GROUP
export interface SetCustomGroupVolumePayload {
  groupId: string;
  update: { volume?: number; muted?: boolean };
}
export type RemoveCustomGroupVolumePayload = string;
export interface SetCustomGroupPositionPayload {
  groupId: string;
  update: Partial<ThreeDimensionProperties>;
}
export type RemoveCustomGroupPositionPayload = string;

// CUSTOM STAGE MEMBER
export interface SetCustomStageMemberVolumePayload {
  stageMemberId: string;
  update: { volume?: number; muted?: boolean };
}
export type RemoveCustomStageMemberVolumePayload = string;
export interface SetCustomStageMemberPositionPayload {
  stageMemberId: string;
  update: Partial<ThreeDimensionProperties>;
}
export type RemoveCustomStageMemberPositionPayload = string;

// CUSTOM STAGE MEMBER AUDIO
export interface SetCustomRemoteAudioVolumePayload {
  remoteAudioProducerId: string;
  update: { volume?: number; muted?: boolean };
}
export type RemoveCustomRemoteAudioVolumePayload = string;
export interface SetCustomRemoteAudioPositionPayload {
  remoteAudioProducerId: string;
  update: Partial<ThreeDimensionProperties>;
}
export type RemoveCustomRemoteAudioPositionPayload = string;

// CUSTOM STAGE MEMBER OV
export interface SetCustomRemoteOvVolumePayload {
  remoteOvTrackId: string;
  update: { volume?: number; muted?: boolean };
}
export type RemoveCustomRemoteOvVolumePayload = string;
export interface SetCustomRemoteOvPositionPayload {
  remoteOvTrackId: string;
  update: Partial<
    ThreeDimensionProperties & {
      directivity: "omni" | "cardioid";
    }
  >;
}
export type RemoveCustomRemoteOvPositionPayload = string;

// JOIN STAGE
export interface JoinStagePayload {
  stageId: string;
  groupId: string;
  password?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LeaveStagePayload {}

export type LeaveStageForGoodPayload = string;

export type SendChatMessagePayload = string;

// User
export interface ChangeUserPayload {
  name: string;
  avatarUrl?: string;
}
