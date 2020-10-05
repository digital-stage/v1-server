import {ObjectId} from "mongodb";
export type StageId = string | ObjectId;
export type GroupId = string | ObjectId;
export type UserId = string | ObjectId;
export type StageMemberId = string | ObjectId;
export type DeviceId = string | ObjectId;
export type WebRTCDeviceId = string | ObjectId;
export type TrackPresetId = string | ObjectId;
export type RouterId = string | ObjectId;
export type CustomGroupId = string | ObjectId;
export type CustomStageMemberId = string | ObjectId;
export type VideoDeviceId = string | ObjectId;
export type GlobalProducerId = string | ObjectId;
export type RouterProducerId = string | ObjectId;
export type SoundCardId = string | ObjectId;
export type StageMemberProducerId = string | ObjectId;
export type SoundCardChannelId = string | ObjectId;
export type TrackId = string | ObjectId;
export type StageMemberTrackId = string | ObjectId;
export type CustomStageMemberTrackId = string | ObjectId;

export interface Router {
    _id: RouterId;
    url: string;
    ipv4: string;
    ipv6: string;
    port: number;
    availableSlots: number;
}

export interface User {
    _id: UserId | ObjectId;
    uid?: string;

    // SETTINGS
    name: string;
    avatarUrl?: string;

    stageId?: StageId;          // <--- RELATION
    stageMemberId?: StageMemberId;    // <--- RELATION
}

/***
 * Ich bin in einer Stage, wähle eine Soundkarte aus.
 * Nun möchte ich alle Eingangskanäle und Ausgangskanäle angezeigt bekommen.
 * Es gibt 8 Eingangskanäle und 4 Ausgangskanäle.
 * Hier wähle ich die Eingangskanäle 1, 2 und 3 aus.
 * Nun werden im Hintergrund 3 Producer erzeugt, welche jeweils den Kanal 1, 2 und 3 übertragen.
 * Alle anderen in der Stage bekommen diese Information.
 *
 * In der Positionierungs-Karte sehe ich nun neben meinem Avatar 3 weitere Icons.
 * Der Admin verschiebt diese für mich in die richtige Position.
 * Außerdem regelt er das Gain der einzelnen Kanälen.
 * Zusätzlich regelt er ebenfalls das Playback-Volume aller Kanäle, sodass sie zusammen passen.
 * Alle anderen bekommen die neuen Information.
 *
 * Bei allen anderen nimmt der ovclient automatisch die Verbindung mit diesen Tracks auf und gibt diese auf deren
 * Lautsprecher aus.
 *
 * Nun wechsle ich die Stage. Dort wähle ich evtl. eine andere Soundkarte oder andere Kanäle aus.
 * Die Einstellungen sind in der neuen Stage nicht mehr die alten.
 *
 * Danach wechsle ich wieder zurück und wähle die Soundkarte von vorhin aus.
 * Die Channels sind alle bereits ausgewählt und so eingestellt wie zuvor.
 * Das betrifft gain, position, rotation und volume.
 * Evtl. haben ein paar andere Nutzer ein personalisiertes volume eingestellt - auch das ist weiterhin vorhanden.
 * Es scheint, als wäre ich nicht gewechselt - konnte mich einfach wieder anmelden und alle einstellungen waren wie gehabt.
 *
 */

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
    inputVideoDeviceIds: WebRTCDeviceId[];
    inputVideoDeviceId?: WebRTCDeviceId;

    // WebRTC audio device
    inputAudioDeviceIds: WebRTCDeviceId[];
    inputAudioDeviceId?: WebRTCDeviceId;
    outputAudioDeviceIds: WebRTCDeviceId[];
    outputAudioDeviceId?: WebRTCDeviceId;

    // OV SoundCards
    soundCardIds: SoundCardId[];        // refers to all available sound devices
    soundCardId?: SoundCardId;           // active sound device

    // Optional for ov-based clients
    senderJitter: number;
    receiverJitter: number;

    // Optimizations for performance
    producerIds: GlobalProducerId[];
    server: string;
}

export interface WebRTCDevice {
    id: WebRTCDeviceId;
    label: string;
}

export interface SoundCard {    // ov-specific
    _id: SoundCardId;
    name: string;       // unique together with deviceId
    deviceId: DeviceId; // <--- RELATION
    userId: UserId;

    driver: "JACK" | "ALSA" | "ASIO" | "WEBRTC",

    numInputChannels: number;
    numOutputChannels: number;

    trackPresets: TrackPresetId[];
    trackPreset?: TrackPresetId;     // Current default preset (outside or on new stages)

    sampleRate: number;
    periodSize: number;
    numPeriods: number; // default to 2
}

/**
 * A preset for channels / track configuration
 */
export interface TrackPreset {
    _id: TrackPresetId;
    userId: UserId;
    deviceId: DeviceId;
    soundCardId: SoundCardId;
    name: string;
    trackIds: TrackId[];
    outputChannels: number[];   // For the output use simple numbers TODO: @Giso, is this enough?
}

/**
 * A track is always assigned to a specific stage member and channel of an sound card.
 *
 */
export interface Track {
    _id: TrackId;
    channel: number;
    deviceId: DeviceId;
    userId: UserId;
    stageId?: StageId;             // <--- RELATION
    trackPresetId: TrackPresetId; // <--- RELATION Each track is assigned to a specific channel

    online: boolean;

    gain: number;
    volume: number;

    directivity: "omni" | "cardioid"
}

// WEBRTC specific
export interface GlobalProducer {
    _id: GlobalProducerId;
    kind: "audio" | "video";

    deviceId: DeviceId;
    userId: UserId;

    stageId?: StageId;

    routerId: RouterId;
    routerProducerId: RouterProducerId;
}

export interface GlobalVideoProducer extends GlobalProducer {
    kind: "video";
}

export interface GlobalAudioProducer extends GlobalProducer {
    kind: "audio";
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
}

/**
 * A group can be only modified by admins
 */
export interface Group {
    _id: GroupId;
    name: string;
    stageId: StageId;   // <--- RELATION

    // SETTINGS
    volume: number;
}

/**
 * Each user can overwrite the global group settings with personal preferences
 */
export interface CustomGroup {
    _id: CustomGroupId;
    userId: UserId;             // <--- RELATION
    stageId: StageId;
    groupId: GroupId;           // <--- RELATION

    // SETTINGS
    volume: number;
}

/**
 * A stage member is the associated between a user and a stage.
 * Settings can be only modified by admins.
 */
export interface StageMember {
    _id: StageMemberId;
    stageId: StageId;
    groupId: GroupId;   // <--- RELATION
    userId: UserId;     // <--- RELATION

    tracks: StageMemberTrackId[];

    online: boolean;

    // SETTINGS (modifiable only by admins)
    isDirector: boolean;
    volume: number;
    // Position relative to stage
    x: number;  //TODO: Circular assignment inside room
    y: number;
    z: number;
    // Rotation relative to stage
    rX: number;
    rY: number;
    rZ: number;
}

/**
 * Each user can overwrite the global stage member settings with personal preferences
 */
export interface CustomStageMember {
    _id: CustomStageMemberId;
    userId: UserId;                 // <--- RELATION
    stageMemberId: StageMemberId;   // <--- RELATION

    // SETTINGS
    volume: number;
    // Position relative to stage
    x: number;  //TODO: Circular assignment inside room
    y: number;
    z: number;
    // Rotation relative to stage
    rX: number;
    rY: number;
    rZ: number;
}

/**
 * A stage member track is a track, that has been published and assigned to the related stage member.
 * So all other stage members will receive this track.
 *
 * Important: a track can point to an ov-based track or an webrtc-based producer (!)
 *
 * However, spatial audio settings are stored for both, maybe for integrating webrtc and ov later and use
 * the web audio api panner for 3D audio interpolation later.
 */
export interface StageMemberTrack {
    _id: StageMemberTrackId;

    stageId: StageId;
    stageMemberId: StageMemberId;
    userId: UserId;

    kind: "webrtc" | "ov";

    online: boolean;

    // Either ov-based
    trackId?: TrackId;
    // or webrtc-based
    producerId?: GlobalProducerId;

    gain: number;       // Overrides track gain (for stage)
    volume: number;     // Overrides track volume (for stage)

    directivity?: "omni" | "cardioid"; // Overrides track directivity (for stage)

    // Position relative to stage member
    x: number;  //TODO: Circular assignment inside room
    y: number;
    z: number;
    // Rotation relative to stage
    rX: number;
    rY: number;
    rZ: number;
}

export interface StageMemberWebTrack extends StageMemberTrack {
    kind: "webrtc";
    producerId: GlobalProducerId;
    trackId: undefined;
}

export interface StageMemberOvTrack extends StageMemberTrack {
    kind: "ov";
    trackId: GlobalProducerId;
    producerId: undefined;
}


/**
 * Each user can overwrite the global stage member track settings with personal preferences.
 */
export interface CustomStageMemberTrack {
    _id: CustomStageMemberTrackId;

    stageId: StageId;
    stageMemberTrackId: StageMemberTrackId;

    gain: number;       // Overrides track gain (for user)
    volume: number;     // Overrides track volume (for user)

    directivity: "omni" | "cardioid"; // Overrides track directivity (for user)

    // Position relative to stage member
    x: number;  //TODO: Circular assignment inside room
    y: number;
    z: number;
    // Rotation relative to stage
    rX: number;
    rY: number;
    rZ: number;
}
