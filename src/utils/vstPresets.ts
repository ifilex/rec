import { VSTPluginParams, VSTPreset } from '../types/audio';

export const defaultVstParams: VSTPluginParams = {
  eq5: {
    low: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    high: 0,
    enabled: false,
  },
  reverb: {
    roomSize: 0.5,
    dampening: 0.3,
    wet: 0.25,
    dry: 0.8,
    enabled: false,
  },
  delay: {
    time: 0.28,
    feedback: 0.4,
    wet: 0.3,
    pingPong: true,
    enabled: false,
  },
  bitcrusher: {
    bits: 8,
    normFreq: 0.25,
    mix: 1.0,
    enabled: false,
  },
  compressor: {
    threshold: -20,
    ratio: 4,
    attack: 0.005,
    release: 0.25,
    knee: 20,
    enabled: false,
  },
  chorus: {
    rate: 1.5,
    depth: 0.6,
    delay: 0.02,
    mix: 0.4,
    enabled: false,
  },
  distortion: {
    drive: 15,
    tone: 3500,
    type: 'tube',
    mix: 0.3,
    enabled: false,
  },
  noisegate: {
    threshold: -50,
    release: 0.05,
    enabled: false,
  },
};

export const factoryVstPresets: VSTPreset[] = [
  {
    id: 'clean_bypass',
    name: 'Bypass Total (Sonido Puro)',
    description: 'Señal limpia directa sin ningún procesamiento DSP.',
    category: 'Estándar',
    params: {
      ...defaultVstParams,
    },
  },
  {
    id: 'win31_soundblaster',
    name: 'Windows 3.1 Sound Blaster Pro 1992',
    description: 'Auténtico sonido retro 8-bit a 11.025 kHz con saturación de transformador clásico.',
    category: 'Retro Vintage',
    params: {
      ...defaultVstParams,
      eq5: { low: 2, lowMid: 3, mid: -1, highMid: -4, high: -8, enabled: true },
      bitcrusher: { bits: 8, normFreq: 0.25, mix: 1.0, enabled: true },
      distortion: { drive: 12, tone: 4000, type: 'soft', mix: 0.35, enabled: true },
    },
  },
  {
    id: 'studio_master',
    name: 'Mastering de Estudio Hi-Fi',
    description: 'Brillo en agudos, control dinámico y presencia cristalina para locuciones o música.',
    category: 'Mastering',
    params: {
      ...defaultVstParams,
      eq5: { low: 1.5, lowMid: -1, mid: 0.5, highMid: 2.5, high: 3.5, enabled: true },
      compressor: { threshold: -18, ratio: 3.5, attack: 0.01, release: 0.2, knee: 15, enabled: true },
      reverb: { roomSize: 0.25, dampening: 0.4, wet: 0.12, dry: 0.95, enabled: true },
    },
  },
  {
    id: 'vocal_space',
    name: 'Vocal Espacial & Delay Estéreo',
    description: 'Eco estéreo envolvente con reverb ambiental para voces y sintetizadores.',
    category: 'Efectos Espaciales',
    params: {
      ...defaultVstParams,
      delay: { time: 0.32, feedback: 0.45, wet: 0.35, pingPong: true, enabled: true },
      reverb: { roomSize: 0.7, dampening: 0.2, wet: 0.35, dry: 0.8, enabled: true },
      chorus: { rate: 1.2, depth: 0.5, delay: 0.025, mix: 0.3, enabled: true },
    },
  },
  {
    id: 'retro_telephone',
    name: 'Teléfono / Radio AM Vintage',
    description: 'Corte radical de graves y agudos simulando un auricular telefónico o radio de transistores.',
    category: 'Efectos Creativos',
    params: {
      ...defaultVstParams,
      eq5: { low: -15, lowMid: 4, mid: 8, highMid: 2, high: -15, enabled: true },
      distortion: { drive: 25, tone: 2500, type: 'hard', mix: 0.4, enabled: true },
      compressor: { threshold: -28, ratio: 8, attack: 0.001, release: 0.1, knee: 5, enabled: true },
    },
  },
  {
    id: '80s_arena_reverb',
    name: 'Arena 80s Rock / Gated Reverb',
    description: 'Reverb masiva de estadio con saturación y compresión para baterías o instrumentos.',
    category: 'Vintage',
    params: {
      ...defaultVstParams,
      reverb: { roomSize: 0.88, dampening: 0.1, wet: 0.5, dry: 0.7, enabled: true },
      distortion: { drive: 18, tone: 4500, type: 'tube', mix: 0.25, enabled: true },
      compressor: { threshold: -24, ratio: 6, attack: 0.002, release: 0.3, knee: 10, enabled: true },
    },
  },
];
