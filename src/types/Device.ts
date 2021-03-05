import { WebRTCDevice } from "./WebRTCDevice";
import { DeviceId, UserId, WebRTCDeviceId } from "./IdTypes";

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

  // Optional for ov-based clients
  receiverType: "ortf" | "hrtf";
  senderJitter?: number;
  receiverJitter?: number;
  p2p: boolean;
  renderReverb: boolean;
  reverbGain: number;
  renderISM: boolean;
  rawMode: boolean;
  egoGain: number;

  // Optimizations for performance
  server: string;

  // OV SoundCards
  soundCardName?: string;
  soundCardNames: string[];
}
