export interface AudioTrack {
  id: string;
  name: string;
  color: string;
  volume: number; // 0 to 1.5
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  isRecording: boolean;
  audioBuffer: AudioBuffer | null;
  recordedChunks?: Float32Array[];
  peaks?: number[];
  visible: boolean;
}

export type VSTPluginType = 
  | 'eq5'
  | 'reverb'
  | 'delay'
  | 'bitcrusher'
  | 'compressor'
  | 'chorus'
  | 'distortion'
  | 'noisegate';

export interface VSTPluginParams {
  eq5: {
    low: number; // dB (-15 to 15)
    lowMid: number;
    mid: number;
    highMid: number;
    high: number;
    enabled: boolean;
  };
  reverb: {
    roomSize: number; // 0 to 1
    dampening: number; // 0 to 1
    wet: number; // 0 to 1
    dry: number; // 0 to 1
    enabled: boolean;
  };
  delay: {
    time: number; // 0.05 to 1.0s
    feedback: number; // 0 to 0.95
    wet: number; // 0 to 1
    pingPong: boolean;
    enabled: boolean;
  };
  bitcrusher: {
    bits: number; // 1 to 16 (8-bit Win 3.1 default!)
    normFreq: number; // 0.05 to 1 (downsamples to 11kHz / 22kHz)
    mix: number;
    enabled: boolean;
  };
  compressor: {
    threshold: number; // -60 to 0 dB
    ratio: number; // 1 to 20
    attack: number; // 0.001 to 1.0s
    release: number; // 0.05 to 1.0s
    knee: number;
    enabled: boolean;
  };
  chorus: {
    rate: number; // 0.1 to 8 Hz
    depth: number; // 0 to 1
    delay: number; // 0.005 to 0.05
    mix: number;
    enabled: boolean;
  };
  distortion: {
    drive: number; // 0 to 100
    tone: number; // 100 to 10000 Hz
    type: 'soft' | 'hard' | 'fuzz' | 'tube';
    mix: number;
    enabled: boolean;
  };
  noisegate: {
    threshold: number; // -80 to -10 dB
    release: number; // 0.01 to 0.5s
    enabled: boolean;
  };
}

export interface VSTPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  params: VSTPluginParams;
}

export interface SoundRecorderProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  tracks: {
    id: string;
    name: string;
    color: string;
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
    audioData?: string; // base64 or stored in indexedDB
    sampleRate: number;
    channels: number;
  }[];
  vstParams: VSTPluginParams;
  bpm: number;
  cloudSynced: boolean;
  cloudId?: string;
  sizeBytes?: number;
}

export interface WaveformSelection {
  startTime: number;
  endTime: number;
  activeTrackId?: string;
}

export interface ExportSettings {
  format: 'wav' | 'mp3' | 'webm' | 'ogg';
  wavBitDepth: 16 | 24 | 32;
  sampleRate: 11025 | 22050 | 44100 | 48000 | 96000;
  mp3Bitrate: 128 | 192 | 256 | 320;
  channels: 1 | 2;
  normalize: boolean;
  exportStems: boolean;
  includeVst: boolean;
  filename: string;
}

export type PlaybackState = 'stopped' | 'playing' | 'recording' | 'paused';

export type Win31Theme = 'classic' | 'win95' | 'cyberpunk' | 'amber' | 'dark';
