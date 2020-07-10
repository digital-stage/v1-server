/**
 *
 * House <-> Stage (one to many OR n to m - TODO: Discuss)
 * Stage <-> StageMember (one to many, StageMember extends User,)
 *
 * User <-> Device (one to many)
 * User <-> StageMember (one to one)
 * Device <-> Track (one to many)
 * StageMemberDevice <-> Device (one to one)
 * Track <->
 */

/***
 * USERS
 */
export interface User {
    id: string;
    name: string;
    avatarUrl?: string;
    stageId: string | null;    // the ACTIVE stage Id
}

/***
 * DEVICES
 */
export interface Device {
    id: string;
    userId: string;
    ipv4: string;
    ipv6: string;
    port: number;
    canVideo: boolean;  //TODO: Discuss if this shall be readable only by the owning user (since it will be currently merged with StageMemberDevice for each client ...)
    canAudio: boolean;  //TODO: Discuss if this shall be readable only by the owning user
    sendAudio: boolean;  //TODO: Discuss if this shall be readable only by the owning user
    sendVideo: boolean;  //TODO: Discuss if this shall be readable only by the owning user
    retrieveAudio: boolean;  //TODO: Discuss if this shall be readable only by the owning user
    retrieveVideo: boolean;  //TODO: Discuss if this shall be readable only by the owning user
    outputVolume: number;   //TODO: Discuss to outsource this, since it only belongs to the owning user
}

/***
 * HOUSES
 */
export interface House {
    id: string;
    logoUri?: string;
    cssUri?: string;
    name: string;
}

/***
 * STAGES
 */
export interface Stage {
    id: string;
    houseId: string;    //TODO: Discuss if we shall implement an n-m relation here, so outsourcing this to an relational object
    name: string;
    password?: string;
    width: number; // Unit: Meter
    height: number; // Unit: Meter
    length: number; // Unit: Meter
    absorption: number; // Between 0 and 1
    reflection: number; // Between 0 and 1
}

/***
 * STAGE MEMBERS (ONLY VISIBLE FOR OTHER STAGE MEMBERS)
 */
export interface StageMember extends User {
    // Equal for all users inside an stage, this is the relation between User and Stage, outsourced to another "table"
    stageId: string;    // indexed unique key
}

export interface StageMemberVolume {
    // NOT-EQUAL / Individual for each users inside an stage
    // Will usually be joined with StageMember for each receiving user
    userId: string;
    stageId: string;
    memberId: string;
    value: number;
}

export interface StageMemberDevice {
    // Equal for all users inside an stage, will be merged with Device on userId
    userId: string;  // indexed unique key
    stageId: string; // indexed unique key
    x: number; // Unit: Meter
    y: number; // Unit: Meter
    z: number; // Unit: Meter
}

// OPTIONAL for later:
export interface StageMemberDevicePosition {
    userId: string;     // unique in combination with stageId
    stageId: string;    // unique in combination with userId

    // NOT-EQUAL / Individual for each users inside an stage
    // Will usually be replacing the data of the StageMemberDevice for a user
    x: number; // Unit: Meter
    y: number; // Unit: Meter
    z: number; // Unit: Meter
}

/**
 * TRACKS
 */
// VIRTUAL, THERE WON'T BE A TRACK TABLE, ONLY AUDIO AND VIDEO TRACK
export interface ITrack {
    // Unique for all (stages, users, ...)
    id: string;
    name: string;
    deviceId: string;
    kind: "audio" | "video";
}

export interface AudioTrack extends ITrack {
    kind: "audio";
}

export interface VideoTrack extends ITrack {
    kind: "video";
}

export interface StageAudioTrackVolume {
    // NOT-EQUAL / Individual for each users inside an stage
    // Will usually be joined with AudioTrack for each receiving user
    userId: string;     // unique in combination with stageId and audioTrackId
    stageId: string;    // unique in combination with userId and audioTrackId
    audioTrackId: string;   // Refers to id of AudioTrack (further the inherited Track->id), unique in combination with userId and stageId
    value: number;
}

