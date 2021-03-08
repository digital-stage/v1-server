import { User } from "./User";
import { Stage } from "./Stage";
import { Group } from "./Group";
import { StageMember } from "./StageMember";
import { CustomStageMemberVolume } from "./CustomStageMemberVolume";
import { RemoteVideoProducer } from "./RemoteVideoProducer";
import { RemoteAudioProducer } from "./RemoteAudioProducer";
import { CustomRemoteAudioProducerVolume } from "./CustomRemoteAudioProducerVolume";
import { RemoteOvTrack } from "./RemoteOvTrack";
import { CustomRemoteOvTrackPosition } from "./CustomRemoteOvTrackPosition";
import { CustomGroupVolume } from "./CustomGroupVolume";
import { CustomGroupPosition } from "./CustomGroupPosition";
import { CustomStageMemberPosition } from "./CustomStageMemberPosition";
import { CustomRemoteAudioProducerPosition } from "./CustomRemoteAudioProducerPosition";
import { CustomRemoteOvTrackVolume } from "./CustomRemoteOvTrackVolume";

export interface StagePackage {
  users: User[];

  stage?: Stage;
  groups?: Group[];
  stageMembers: StageMember[];
  customGroupVolumes: CustomGroupVolume[];
  customGroupPositions: CustomGroupPosition[];
  customStageMemberVolumes: CustomStageMemberVolume[];
  customStageMemberPositions: CustomStageMemberPosition[];
  remoteVideoProducers: RemoteVideoProducer[];
  remoteAudioProducers: RemoteAudioProducer[];
  customRemoteAudioProducerVolumes: CustomRemoteAudioProducerVolume[];
  customRemoteAudioProducerPositions: CustomRemoteAudioProducerPosition[];
  remoteOvTracks: RemoteOvTrack[];
  customRemoteOvTrackVolumes: CustomRemoteOvTrackVolume[];
  customRemoteOvTrackPositions: CustomRemoteOvTrackPosition[];
}
