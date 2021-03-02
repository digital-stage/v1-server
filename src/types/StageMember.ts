import {GroupId, StageId, StageMemberId, UserId} from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

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

    ovStageDeviceId: number; // 0 - 30

    sendlocal: boolean;

    // Optimizations for performance
    stageId: StageId;
    // videoProducers: StageMemberVideoProducerId[];
    // audioProducers: StageMemberAudioProducerId[];
    // ovTracks: StageMemberOvTrackId[];
}
