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

// CUSTOM GROUP
export interface SetCustomGroupPayload {
    stageMemberId: string;
    volume: number;
}

// STAGE MEMBER
export interface ChangeStageMemberPayload {
    id: string;
    update: Partial<{
        isDirector: boolean;
    } & ThreeDimensionAudioProperties>
}

export type RemoveStageMemberPayload = string;

// CUSTOM STAGE MEMBER
export interface SetCustomStageMemberPayload {
    stageMemberId: string;
    update: Partial<ThreeDimensionAudioProperties>
}


// STAGE MEMBER AUDIO PRODUCER
export interface SetStageMemberAudioProducerPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>;
}

// CUSTOM STAGE MEMBER AUDIO PRODUCER
export interface SetCustomStageMemberAudioProducerPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>;
}

// STAGE MEMBER OV TRACK
export interface SetStageMemberOvTrackPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>;
}

// CUSTOM STAGE MEMBER OV TRACK
export interface SetCustomOvTrackPayload {
    id: string;
    update: Partial<ThreeDimensionAudioProperties>;
}

// JOIN STAGE
export interface JoinStagePayload {
    stageId: string,
    groupId: string,
    password?: string
}

export interface LeaveStagePayload {
}
