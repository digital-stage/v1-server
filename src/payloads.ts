import {ThreeDimensionAudioProperties} from "./model.utils";
import {RouterId} from "./model.server";

// DEVICE
export interface AddAudioProducerPayload {
    routerId: string,
    routerProducerId: string
}

export type RemoveAudioProducerPayload = string;


export interface AddVideoProducerPayload {
    routerId: string,
    routerProducerId: string
}

export interface ChangeVideoProducerPayload {
    id: string,
    producer: Partial<{
        routerId: RouterId;
        routerProducerId: string;
    }>
}

export type RemoveVideoProducerPayload = string;

export interface AddSoundCardPayload {
    id: string,
    initial: {
        name: string;
        driver: "JACK" | "ALSA" | "ASIO" | "WEBRTC";
        numInputChannels?: number;
        numOutputChannels?: number;
        trackPresetId?: string;
        sampleRate?: number;
        periodSize?: number;
        numPeriods?: number; // default to 2
    }
}

export interface ChangeSoundCardPayload {
    id: string,
    update: Partial<{
        name: string;
        driver: "JACK" | "ALSA" | "ASIO" | "WEBRTC";
        numInputChannels?: number;
        numOutputChannels?: number;
        trackPresetId?: string;
        sampleRate?: number;
        periodSize?: number;
        numPeriods?: number; // default to 2
    }>
}

export type RemoveSoundCardPayload = string;

export interface AddTrackPresetPayload {
    id: string,
    initial: {
        soundCardId: string;
        name: string;
        outputChannels: number[];
    }
}

export interface ChangeTrackPresetPayload {
    id: string,
    update: Partial<{
        name: string;
        outputChannels: number[];
    }>
}

export type RemoveTrackPresetPayload = string;

export interface AddTrackPayload {
    id: string,
    initial: {
        trackPresetId: string;
        channel: number;
        gain?: number;
        volume?: number;
        directivity: "omni" | "cardioid";
    }
}

export interface ChangeTrackPayload {
    id: string,
    update: Partial<{
        channel: number;
        gain: number;
        volume: number;
        directivity: "omni" | "cardioid";
    }>
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
        //admins: string[];
    }>
}

export type RemoveStagePayload = string;

// GROUP
export interface AddGroupPayload {
    stageId: string;
    name: string;
    volume?: number;
}

export interface ChangeGroupPayload {
    id: string;
    update: Partial<{
        name: string;
        volume: number;
    }>
}

export type RemoveGroupPayload = string;

// STAGE MEMBER
export interface ChangeStageMemberPayload {
    id: string;
    update: Partial<{
        isDirector: boolean;
    } & ThreeDimensionAudioProperties>
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
export interface AddCustomGroupPayload {
    groupId: string;
    volume: number;
}

export interface SetCustomGroupPayload {
    groupId: string;
    volume: number;
}

export interface UpdateCustomGroupPayload {
    id: string;
    volume: number;
}

export type RemoveCustomGroupPayload = string;

// CUSTOM STAGE MEMBER
export interface AddCustomStageMemberPayload extends Partial<ThreeDimensionAudioProperties> {
    stageMemberId: string;
}

export interface SetCustomStageMemberPayload {
    stageMemberId: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export interface UpdateCustomStageMemberPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export type RemoveCustomStageMemberPayload = string;


// CUSTOM STAGE MEMBER AUDIO
export interface AddCustomStageMemberAudioPayload extends Partial<ThreeDimensionAudioProperties> {
    stageMemberAudioId: string;
}

export interface SetCustomStageMemberAudioPayload {
    stageMemberAudioId: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export interface UpdateCustomStageMemberAudioPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export type RemoveCustomStageMemberAudioPayload = string;

// CUSTOM STAGE MEMBER OV
export interface AddCustomStageMemberOvPayload extends Partial<ThreeDimensionAudioProperties> {
    stageMemberOvTrackId: string;
    gain: number;
    directivity: "omni" | "cardioid"
}

export interface SetCustomStageMemberOvPayload {
    stageMemberOvTrackId: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export interface UpdateCustomStageMemberOvPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>
}

export type RemoveCustomStageMemberOvPayload = string;

// JOIN STAGE
export interface JoinStagePayload {
    stageId: string,
    groupId: string,
    password?: string
}

export interface LeaveStagePayload {
}

export type LeaveStageForGoodPayload = string;
