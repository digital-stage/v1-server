import {User} from "./User";
import {Stage} from "./Stage";
import {Group} from "./Group";
import {StageMember} from "./StageMember";
import {CustomGroup} from "./CustomGroup";
import {CustomStageMember} from "./CustomStageMember";
import {RemoteVideoProducer} from "./RemoteVideoProducer";
import {RemoteAudioProducer} from "./RemoteAudioProducer";
import {CustomRemoteAudioProducer} from "./CustomRemoteAudioProducer";
import {RemoteOvTrack} from "./RemoteOvTrack";
import {CustomRemoteOvTrack} from "./CustomRemoteOvTrack";

export interface StagePackage {
    users: User[];

    stage?: Stage;
    groups?: Group[];
    stageMembers: StageMember[];
    customGroups: CustomGroup[];
    customStageMembers: CustomStageMember[];
    videoProducers: RemoteVideoProducer[];
    audioProducers: RemoteAudioProducer[];
    customAudioProducers: CustomRemoteAudioProducer[];
    ovTracks: RemoteOvTrack[];
    customOvTracks: CustomRemoteOvTrack[];
}
