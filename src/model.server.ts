import {serverAddress} from "./index";

export type StageId = string;
export type GroupId = string;
export type UserId = string;
export type StageMemberId = string;
export type DeviceId = string;
export type WebRTCDeviceId = string;
export type TrackPresetId = string;
export type RouterId = string;
export type CustomGroupVolumeId = string;
export type CustomStageMemberVolumeId = string;
export type CustomGroupMemberVolumeId = string;
export type VideoDeviceId = string;
export type GlobalProducerId = string;
export type RouterProducerId = string;
export type SoundCardId = string;
export type StageMemberProducerId = string;
export type SoundCardChannelId = string;
export type TrackId = string;
export type StageMemberTrackId = string;
export type CustomStageMemberTrackId = string;

export interface Router {
    _id: RouterId;
    url: string;
    ipv4: string;
    ipv6: string;
    port: number;
    availableSlots: number;
}

export interface User {
    _id: UserId,
    uid?: string;

    // SETTINGS
    name: string;
    avatarUrl?: string;

    stage?: string;          // <--- RELATION
    stageMember?: string;    // <--- RELATION
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
    user: UserId;
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
    inputVideoDevice?: WebRTCDeviceId;

    // WebRTC audio device
    inputAudioDevices: WebRTCDevice[];
    inputAudioDevice?: WebRTCDeviceId;
    outputAudioDevices: WebRTCDevice[];
    outputAudioDevice?: WebRTCDeviceId;

    // OV SoundCards
    soundCards: SoundCardId[];        // refers to all available sound devices
    soundCard?: SoundCardId;           // active sound device

    // Optional for ov-based clients
    senderJitter: number;
    receiverJitter: number;

    // Optimizations for performance
    producers: GlobalProducerId[];
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

    driver: "JACK" | "ALSA" | "ASIO" | "WEBRTC",

    numInputChannels: number;
    numOutputChannels: number;

    trackPresets: TrackPresetId[];
    trackPreset: TrackPresetId;     // Current default preset (outside or on new stages)

    sampleRate: number;
    periodSize: number;
    numPeriods: number; // default to 2
}

/**
 * A preset for channels / track configuration
 */
export interface TrackPreset {
    _id: TrackPresetId;
    soundCard: SoundCardId;
    name: string;
    tracks: TrackId[];
    outputChannels: number[];   // For the output use simple numbers TODO: @Giso, is this enough?
}

/**
 * A track is always assigned to a specific stage member and channel of an sound card.
 *
 */
export interface Track {
    _id: TrackId;
    readonly channel: number;
    stageMember: StageMemberId; // <--- RELATION
    trackPreset: TrackPresetId; // <--- RELATION Each track is assigned to a specific channel

    gain: number;
    volume: number;

    directivity: "omni" | "cardioid"
}

// WEBRTC specific
export interface WebRTCProducer {
    _id: GlobalProducerId;
    kind: "audio" | "video";
    routerId: RouterId;
    routerProducerId: RouterProducerId;
}

export interface VideoProducer extends WebRTCProducer {
    kind: "video";
}

export interface AudioProducer extends WebRTCProducer {
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
    stage: StageId;   // <--- RELATION

    // SETTINGS
    volume: number;
}

/**
 * Each user can overwrite the global group settings with personal preferences
 */
export interface CustomGroupVolume {
    _id: CustomGroupVolumeId;
    user: UserId;             // <--- RELATION
    stage: StageId;
    group: GroupId;           // <--- RELATION

    // SETTINGS
    volume: number;
}

/**
 * A stage member is the associated between a user and a stage.
 * Settings can be only modified by admins.
 */
export interface StageMember {
    _id: StageMemberId;
    name: string;       // synchronized with data from user object
    avatarUrl?: string; // synchronized with data from user object
    stage: StageId;
    group: GroupId;   // <--- RELATION
    user: UserId;     // <--- RELATION

    track: StageMemberTrackId[];

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
export interface CustomStageMemberVolume {
    _id: CustomStageMemberVolumeId;
    user: UserId;                 // <--- RELATION
    stageMember: StageMemberId;   // <--- RELATION

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
    stageMember: StageMemberId;

    kind: "webrtc" | "ov";

    // Either ov-based
    track?: TrackId;
    // or webrtc-based
    producer?: GlobalProducerId;

    gain: number;       // Overrides track gain (for stage)
    volume: number;     // Overrides track volume (for stage)

    directivity: "omni" | "cardioid"; // Overrides track directivity (for stage)

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
    producer: GlobalProducerId;
    track: undefined;
}

export interface StageMemberOvTrack extends StageMemberTrack {
    kind: "ov";
    track: GlobalProducerId;
    producer: undefined;
}


/**
 * Each user can overwrite the global stage member track settings with personal preferences.
 */
export interface CustomStageMemberTrack {
    _id: CustomStageMemberTrackId;
    stageMemberTrack: StageMemberTrackId;

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
