import { VSTPluginParams } from '../types/audio';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // DSP / VST nodes
  private eqFilters: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private distortionWetGain: GainNode | null = null;
  private distortionDryGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Recording internals
  private scriptProcessor: ScriptProcessorNode | null = null;
  private recordedBuffersL: Float32Array[] = [];
  private recordedBuffersR: Float32Array[] = [];
  private recordingSampleRate = 44100;
  private isRecordingInternal = false;

  // Active playback sources
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private playbackStartTime = 0;
  private pausedAt = 0;

  public getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({
        latencyHint: 'interactive', // Lowest possible latency
      });
      this.initDspNodes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private initDspNodes() {
    if (!this.ctx) return;

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // Analyser for oscilloscope & VU meter
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.65;

    // Input analyser for mic monitor
    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 512;
    this.inputAnalyser.smoothingTimeConstant = 0.5;

    // 5-band EQ
    const freqs = [80, 400, 1500, 4500, 10000];
    const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
    this.eqFilters = freqs.map((freq, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = types[idx];
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });

    // Compressor
    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 4;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // Delay
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.value = 0.0;

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // Distortion
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0);
    this.distortionNode.oversample = '4x';
    this.distortionWetGain = this.ctx.createGain();
    this.distortionWetGain.gain.value = 0.0;
    this.distortionDryGain = this.ctx.createGain();
    this.distortionDryGain.gain.value = 1.0;

    // Reverb (Algorithmic impulse response)
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildImpulseResponse(2.0, 2.0, false);
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0.0;
    this.reverbDryGain = this.ctx.createGain();
    this.reverbDryGain.gain.value = 1.0;

    // Wire master effects chain:
    // Source -> EQ[0..4] -> Distortion -> Compressor -> Delay/Reverb -> MasterGain -> Analyser -> Destination
    let current: AudioNode = this.eqFilters[0];
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }
    current = this.eqFilters[this.eqFilters.length - 1];

    // Connect to distortion
    current.connect(this.distortionNode);
    this.distortionNode.connect(this.distortionWetGain);
    current.connect(this.distortionDryGain);

    const postDistortion = this.ctx.createGain();
    this.distortionWetGain.connect(postDistortion);
    this.distortionDryGain.connect(postDistortion);

    // Connect to compressor
    postDistortion.connect(this.compressorNode);

    // Reverb split
    this.compressorNode.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.compressorNode.connect(this.reverbDryGain);

    const postReverb = this.ctx.createGain();
    this.reverbWetGain.connect(postReverb);
    this.reverbDryGain.connect(postReverb);

    // Delay split
    postReverb.connect(this.delayNode);
    postReverb.connect(this.masterGain);
    this.delayWetGain.connect(this.masterGain);

    // Master to Analyser to Destination
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public getEffectsInputNode(): AudioNode {
    this.getAudioContext();
    return this.eqFilters[0];
  }

  public updateDspParams(params: VSTPluginParams) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // EQ5
    if (this.eqFilters.length === 5) {
      this.eqFilters[0].gain.setValueAtTime(params.eq5.enabled ? params.eq5.low : 0, now);
      this.eqFilters[1].gain.setValueAtTime(params.eq5.enabled ? params.eq5.lowMid : 0, now);
      this.eqFilters[2].gain.setValueAtTime(params.eq5.enabled ? params.eq5.mid : 0, now);
      this.eqFilters[3].gain.setValueAtTime(params.eq5.enabled ? params.eq5.highMid : 0, now);
      this.eqFilters[4].gain.setValueAtTime(params.eq5.enabled ? params.eq5.high : 0, now);
    }

    // Delay
    if (this.delayNode && this.delayFeedback && this.delayWetGain) {
      this.delayNode.delayTime.setValueAtTime(params.delay.time, now);
      this.delayFeedback.gain.setValueAtTime(params.delay.feedback, now);
      this.delayWetGain.gain.setValueAtTime(params.delay.enabled ? params.delay.wet : 0, now);
    }

    // Reverb
    if (this.reverbWetGain && this.reverbDryGain && this.reverbConvolver) {
      const wet = params.reverb.enabled ? params.reverb.wet : 0;
      this.reverbWetGain.gain.setValueAtTime(wet, now);
      this.reverbDryGain.gain.setValueAtTime(params.reverb.enabled ? params.reverb.dry : 1.0, now);
    }

    // Distortion
    if (this.distortionNode && this.distortionWetGain && this.distortionDryGain) {
      if (params.distortion.enabled) {
        this.distortionNode.curve = this.makeDistortionCurve(params.distortion.drive, params.distortion.type);
        this.distortionWetGain.gain.setValueAtTime(params.distortion.mix, now);
        this.distortionDryGain.gain.setValueAtTime(1 - params.distortion.mix, now);
      } else {
        this.distortionWetGain.gain.setValueAtTime(0, now);
        this.distortionDryGain.gain.setValueAtTime(1.0, now);
      }
    }

    // Compressor
    if (this.compressorNode) {
      if (params.compressor.enabled) {
        this.compressorNode.threshold.setValueAtTime(params.compressor.threshold, now);
        this.compressorNode.ratio.setValueAtTime(params.compressor.ratio, now);
        this.compressorNode.attack.setValueAtTime(params.compressor.attack, now);
        this.compressorNode.release.setValueAtTime(params.compressor.release, now);
        this.compressorNode.knee.setValueAtTime(params.compressor.knee, now);
      } else {
        this.compressorNode.threshold.setValueAtTime(0, now);
        this.compressorNode.ratio.setValueAtTime(1, now);
      }
    }
  }

  private makeDistortionCurve(amount: number, type: 'soft' | 'hard' | 'fuzz' | 'tube' = 'soft'): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    if (k === 0) {
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = x;
      }
      return curve;
    }

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (type === 'hard') {
        curve[i] = Math.max(-0.7, Math.min(0.7, x * (1 + k / 10)));
      } else if (type === 'fuzz') {
        curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * (1 + k / 5))));
      } else if (type === 'tube') {
        curve[i] = Math.tanh(x * (1 + k / 15)) + 0.1 * Math.sin(x * Math.PI);
      } else {
        // Soft clipping
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  private buildImpulseResponse(duration: number, decay: number, reverse: boolean): AudioBuffer {
    const ctx = this.getAudioContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = reverse ? length - i : i;
      const factor = Math.pow(1 - n / length, decay);
      impulseL[i] = (Math.random() * 2 - 1) * factor;
      impulseR[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  // --- Real-time Recording with Low Latency & Mobile Compatibility ---
  public async startMicrophoneRecording(onChunkReceived?: (level: number) => void): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('navigator.mediaDevices.getUserMedia is not supported');
        return false;
      }

      // Try with mobile-friendly constraints, fall back to basic audio: true
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.micStream = stream;
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.micGain = ctx.createGain();
      this.micGain.gain.value = 1.0;

      this.micSource.connect(this.micGain);
      if (this.inputAnalyser) {
        this.micGain.connect(this.inputAnalyser);
      }

      this.recordingSampleRate = ctx.sampleRate;
      this.recordedBuffersL = [];
      this.recordedBuffersR = [];
      this.isRecordingInternal = true;

      // 4096 buffer size is most reliable on mobile browsers without dropping frames
      const bufferSize = 4096;
      this.scriptProcessor = ctx.createScriptProcessor(bufferSize, 2, 2);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRecordingInternal) return;
        const inputL = e.inputBuffer.getChannelData(0);
        const inputR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inputL;

        // Copy chunk
        this.recordedBuffersL.push(new Float32Array(inputL));
        this.recordedBuffersR.push(new Float32Array(inputR));

        if (onChunkReceived) {
          let max = 0;
          for (let i = 0; i < inputL.length; i += 32) {
            const abs = Math.abs(inputL[i]);
            if (abs > max) max = abs;
          }
          onChunkReceived(max);
        }
      };

      this.micGain.connect(this.scriptProcessor);

      // Connect to zero-gain node to pump Web Audio processing loop in WebKit/Safari
      // without feeding microphone audio back into device speakers
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      this.scriptProcessor.connect(silentGain);
      silentGain.connect(ctx.destination);

      return true;
    } catch (err) {
      console.error('Failed to open microphone:', err);
      return false;
    }
  }

  public stopMicrophoneRecording(): AudioBuffer | null {
    this.isRecordingInternal = false;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.recordedBuffersL.length === 0) {
      return null;
    }

    const ctx = this.getAudioContext();
    const totalLength = this.recordedBuffersL.reduce((acc, b) => acc + b.length, 0);
    const audioBuffer = ctx.createBuffer(2, totalLength, this.recordingSampleRate);
    const outL = audioBuffer.getChannelData(0);
    const outR = audioBuffer.getChannelData(1);

    let offset = 0;
    for (let i = 0; i < this.recordedBuffersL.length; i++) {
      outL.set(this.recordedBuffersL[i], offset);
      outR.set(this.recordedBuffersR[i], offset);
      offset += this.recordedBuffersL[i].length;
    }

    this.recordedBuffersL = [];
    this.recordedBuffersR = [];

    return audioBuffer;
  }

  // --- Multi-track & Master Playback Engine ---
  public playBuffers(
    tracks: { buffer: AudioBuffer; volume: number; pan: number; muted: boolean }[],
    startOffset = 0,
    onEnded?: () => void
  ) {
    this.stopPlayback();
    const ctx = this.getAudioContext();
    const effectsIn = this.getEffectsInputNode();

    let longestDuration = 0;
    let endedCount = 0;
    const playableTracks = tracks.filter((t) => !t.muted && t.buffer);

    if (playableTracks.length === 0) {
      if (onEnded) onEnded();
      return;
    }

    this.playbackStartTime = ctx.currentTime - startOffset;

    playableTracks.forEach((t) => {
      const source = ctx.createBufferSource();
      source.buffer = t.buffer;

      const trackGain = ctx.createGain();
      trackGain.gain.value = t.volume;

      const trackPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (trackPan) {
        trackPan.pan.value = Math.max(-1, Math.min(1, t.pan));
      }

      // Chain: Source -> Gain -> Pan -> Master Effects Input
      if (trackPan) {
        source.connect(trackGain);
        trackGain.connect(trackPan);
        trackPan.connect(effectsIn);
      } else {
        source.connect(trackGain);
        trackGain.connect(effectsIn);
      }

      source.onended = () => {
        endedCount++;
        if (endedCount >= playableTracks.length && onEnded) {
          onEnded();
        }
      };

      const duration = t.buffer.duration;
      if (duration > longestDuration) longestDuration = duration;

      if (startOffset < duration) {
        source.start(0, startOffset);
        this.activeSourceNodes.push(source);
      }
    });
  }

  public stopPlayback() {
    this.activeSourceNodes.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });
    this.activeSourceNodes = [];
  }

  public getMasterAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getWaveformData(analyser: AnalyserNode | null): Uint8Array {
    if (!analyser) return new Uint8Array(512).fill(128);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    return data;
  }

  public getFrequencyData(analyser: AnalyserNode | null): Uint8Array {
    if (!analyser) return new Uint8Array(256).fill(0);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  // --- Audio Buffer DSP Modifications (Classic Win 3.1 & Modern Editing) ---

  // 1. Reverse Buffer
  public reverseAudio(buffer: AudioBuffer): AudioBuffer {
    const ctx = this.getAudioContext();
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dst[i] = src[buffer.length - 1 - i];
      }
    }
    return newBuf;
  }

  // 2. Increase / Decrease Volume (+25% / -25%)
  public changeVolume(buffer: AudioBuffer, factor: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dst[i] = Math.max(-1.0, Math.min(1.0, src[i] * factor));
      }
    }
    return newBuf;
  }

  // 3. Change Speed (2x = double speed/pitch, 0.5x = half speed/pitch)
  public changeSpeed(buffer: AudioBuffer, speedFactor: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const newLength = Math.floor(buffer.length / speedFactor);
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < newLength; i++) {
        const origPos = i * speedFactor;
        const index0 = Math.floor(origPos);
        const index1 = Math.min(index0 + 1, buffer.length - 1);
        const frac = origPos - index0;
        dst[i] = src[index0] * (1 - frac) + src[index1] * frac;
      }
    }
    return newBuf;
  }

  // 4. Add Echo Effect (Classic Windows 3.1 Echo)
  public addEcho(buffer: AudioBuffer, delaySec = 0.25, feedback = 0.45): AudioBuffer {
    const ctx = this.getAudioContext();
    const delaySamples = Math.floor(delaySec * buffer.sampleRate);
    const totalLength = buffer.length + delaySamples * 3;
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, totalLength, buffer.sampleRate);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);

      // Copy original
      for (let i = 0; i < buffer.length; i++) {
        dst[i] = src[i];
      }

      // Add echoes
      for (let echo = 1; echo <= 4; echo++) {
        const offset = delaySamples * echo;
        const decay = Math.pow(feedback, echo);
        for (let i = 0; i < buffer.length; i++) {
          if (offset + i < totalLength) {
            dst[offset + i] += src[i] * decay;
            if (dst[offset + i] > 1.0) dst[offset + i] = 1.0;
            if (dst[offset + i] < -1.0) dst[offset + i] = -1.0;
          }
        }
      }
    }
    return newBuf;
  }

  // 5. Delete Before Current Position
  public deleteBeforePosition(buffer: AudioBuffer, positionSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const startSample = Math.min(buffer.length, Math.max(0, Math.floor(positionSec * buffer.sampleRate)));
    const newLength = buffer.length - startSample;
    if (newLength <= 0) return ctx.createBuffer(buffer.numberOfChannels, 1, buffer.sampleRate);

    const newBuf = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < newLength; i++) {
        dst[i] = src[startSample + i];
      }
    }
    return newBuf;
  }

  // 6. Delete After Current Position
  public deleteAfterPosition(buffer: AudioBuffer, positionSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const endSample = Math.min(buffer.length, Math.max(1, Math.floor(positionSec * buffer.sampleRate)));
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, endSample, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < endSample; i++) {
        dst[i] = src[i];
      }
    }
    return newBuf;
  }

  // 7. Normalize Audio (0 dBFS peak)
  public normalizeAudio(buffer: AudioBuffer): AudioBuffer {
    const ctx = this.getAudioContext();
    let maxPeak = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(src[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }

    if (maxPeak === 0 || maxPeak >= 0.99) return buffer;
    const multiplier = 0.98 / maxPeak;
    return this.changeVolume(buffer, multiplier);
  }

  // 8. 8-Bit Windows 3.1 Lo-Fi Bitcrusher (Simulation of 8-bit Sound Blaster @ 11025 Hz)
  public applyLoFiBitcrush(buffer: AudioBuffer, bits = 8, targetSampleRate = 11025): AudioBuffer {
    const ctx = this.getAudioContext();
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const stepRatio = buffer.sampleRate / targetSampleRate;
    const levels = Math.pow(2, bits);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      let heldSample = 0;

      for (let i = 0; i < buffer.length; i++) {
        if (i % Math.round(stepRatio) === 0) {
          // Quantize bits
          const raw = src[i];
          heldSample = Math.round(raw * (levels / 2)) / (levels / 2);
        }
        dst[i] = heldSample;
      }
    }
    return newBuf;
  }

  // 9. Cut / Copy / Paste / Silence / Trim Range
  public sliceBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const start = Math.max(0, Math.floor(startSec * buffer.sampleRate));
    const end = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
    const length = Math.max(1, end - start);

    const newBuf = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < length; i++) {
        dst[i] = src[start + i];
      }
    }
    return newBuf;
  }

  public deleteRange(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const start = Math.max(0, Math.floor(startSec * buffer.sampleRate));
    const end = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
    const removeCount = end - start;
    if (removeCount <= 0) return buffer;

    const newLength = Math.max(1, buffer.length - removeCount);
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      // Before
      for (let i = 0; i < start; i++) {
        dst[i] = src[i];
      }
      // After
      for (let i = end; i < buffer.length; i++) {
        dst[start + (i - end)] = src[i];
      }
    }
    return newBuf;
  }

  public insertBufferAt(target: AudioBuffer, insert: AudioBuffer, atSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const insertPos = Math.min(target.length, Math.max(0, Math.floor(atSec * target.sampleRate)));
    const totalLength = target.length + insert.length;
    const channels = Math.max(target.numberOfChannels, insert.numberOfChannels);
    const newBuf = ctx.createBuffer(channels, totalLength, target.sampleRate);

    for (let c = 0; c < channels; c++) {
      const tgtData = target.numberOfChannels > c ? target.getChannelData(c) : target.getChannelData(0);
      const insData = insert.numberOfChannels > c ? insert.getChannelData(c) : insert.getChannelData(0);
      const dst = newBuf.getChannelData(c);

      // Part 1
      for (let i = 0; i < insertPos; i++) {
        dst[i] = tgtData[i];
      }
      // Inserted
      for (let i = 0; i < insert.length; i++) {
        dst[insertPos + i] = insData[i];
      }
      // Part 2
      for (let i = insertPos; i < target.length; i++) {
        dst[insertPos + insert.length + (i - insertPos)] = tgtData[i];
      }
    }
    return newBuf;
  }

  public mixBuffers(buf1: AudioBuffer, buf2: AudioBuffer, offsetSec = 0): AudioBuffer {
    const ctx = this.getAudioContext();
    const offsetSamples = Math.floor(offsetSec * buf1.sampleRate);
    const totalLength = Math.max(buf1.length, offsetSamples + buf2.length);
    const channels = Math.max(buf1.numberOfChannels, buf2.numberOfChannels);
    const newBuf = ctx.createBuffer(channels, totalLength, buf1.sampleRate);

    for (let c = 0; c < channels; c++) {
      const b1 = buf1.numberOfChannels > c ? buf1.getChannelData(c) : buf1.getChannelData(0);
      const b2 = buf2.numberOfChannels > c ? buf2.getChannelData(c) : buf2.getChannelData(0);
      const dst = newBuf.getChannelData(c);

      for (let i = 0; i < buf1.length; i++) {
        dst[i] += b1[i];
      }
      for (let i = 0; i < buf2.length; i++) {
        const destIdx = offsetSamples + i;
        if (destIdx >= 0 && destIdx < totalLength) {
          dst[destIdx] += b2[i];
          if (dst[destIdx] > 1.0) dst[destIdx] = 1.0;
          if (dst[destIdx] < -1.0) dst[destIdx] = -1.0;
        }
      }
    }
    return newBuf;
  }

  public insertSilence(buffer: AudioBuffer, durationSec: number, atSec: number): AudioBuffer {
    const ctx = this.getAudioContext();
    const silenceBuf = ctx.createBuffer(buffer.numberOfChannels, Math.floor(durationSec * buffer.sampleRate), buffer.sampleRate);
    return this.insertBufferAt(buffer, silenceBuf, atSec);
  }

  public fadeInOut(buffer: AudioBuffer, type: 'in' | 'out', durationSec = 0.5): AudioBuffer {
    const ctx = this.getAudioContext();
    const samples = Math.min(buffer.length, Math.floor(durationSec * buffer.sampleRate));
    const newBuf = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      dst.set(src);

      if (type === 'in') {
        for (let i = 0; i < samples; i++) {
          const factor = i / samples;
          dst[i] *= factor;
        }
      } else {
        const start = buffer.length - samples;
        for (let i = 0; i < samples; i++) {
          const factor = 1 - i / samples;
          dst[start + i] *= factor;
        }
      }
    }
    return newBuf;
  }

  // --- Classic Windows 3.1 Preset Synthesizers ---
  public generateWin31Sound(type: 'tada' | 'chord' | 'ding' | 'chimes' | 'startup' | 'synthwave'): AudioBuffer {
    const ctx = this.getAudioContext();
    const sampleRate = ctx.sampleRate;

    if (type === 'ding') {
      // Classic pure bell chime ~1318 Hz (E6) with fast decay
      const duration = 0.8;
      const buf = ctx.createBuffer(1, Math.floor(duration * sampleRate), sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 7);
        data[i] = Math.sin(2 * Math.PI * 1318.5 * t) * env * 0.7 +
                  Math.sin(2 * Math.PI * 2637.0 * t) * env * 0.2;
      }
      return buf;
    } else if (type === 'chord') {
      // Major chord (C5 + E5 + G5 + C6) with FM brass synth sound
      const duration = 1.2;
      const buf = ctx.createBuffer(2, Math.floor(duration * sampleRate), sampleRate);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < left.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 2.8);
        let sample = 0;
        freqs.forEach((f, idx) => {
          const mod = Math.sin(2 * Math.PI * f * 2 * t) * 0.3;
          sample += Math.sin(2 * Math.PI * f * t + mod) * (0.25 / (idx + 1));
        });
        left[i] = sample * env;
        right[i] = sample * env;
      }
      return buf;
    } else if (type === 'chimes') {
      // Ascending arpeggio chimes: C6, D6, E6, G6, A6, C7
      const duration = 1.6;
      const buf = ctx.createBuffer(2, Math.floor(duration * sampleRate), sampleRate);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);
      const notes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
      for (let i = 0; i < left.length; i++) {
        const t = i / sampleRate;
        let sL = 0;
        let sR = 0;
        notes.forEach((freq, idx) => {
          const noteStart = idx * 0.12;
          if (t >= noteStart) {
            const localT = t - noteStart;
            const env = Math.exp(-localT * 4.5);
            const val = Math.sin(2 * Math.PI * freq * localT) * env * 0.3;
            if (idx % 2 === 0) {
              sL += val * 1.2;
              sR += val * 0.8;
            } else {
              sL += val * 0.8;
              sR += val * 1.2;
            }
          }
        });
        left[i] = sL;
        right[i] = sR;
      }
      return buf;
    } else if (type === 'tada') {
      // The Legendary Win 3.1 Ta-Da! (Horn fanfare: C, G, C-E-G triumphal chord)
      const duration = 1.8;
      const buf = ctx.createBuffer(2, Math.floor(duration * sampleRate), sampleRate);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);

      for (let i = 0; i < left.length; i++) {
        const t = i / sampleRate;
        let s = 0;
        if (t < 0.22) {
          // Note 1: C5
          const env = Math.sin((t / 0.22) * Math.PI);
          s = (Math.sin(2 * Math.PI * 523.25 * t) + 0.5 * Math.sin(2 * Math.PI * 1046.5 * t)) * env * 0.5;
        } else if (t < 0.44) {
          // Note 2: G5
          const t2 = t - 0.22;
          const env = Math.sin((t2 / 0.22) * Math.PI);
          s = (Math.sin(2 * Math.PI * 783.99 * t2) + 0.5 * Math.sin(2 * Math.PI * 1567.98 * t2)) * env * 0.6;
        } else {
          // Note 3: TADA Final Major Fanfare chord (C6, E6, G6)
          const t3 = t - 0.44;
          const env = Math.exp(-t3 * 2.2);
          const c6 = Math.sin(2 * Math.PI * 1046.5 * t3);
          const e6 = Math.sin(2 * Math.PI * 1318.51 * t3);
          const g6 = Math.sin(2 * Math.PI * 1567.98 * t3);
          s = (c6 * 0.4 + e6 * 0.35 + g6 * 0.3) * env * 0.9;
        }
        left[i] = s;
        right[i] = s;
      }
      return buf;
    } else {
      // Synthwave / 90s Groove Loop
      const duration = 2.4;
      const buf = ctx.createBuffer(2, Math.floor(duration * sampleRate), sampleRate);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);
      const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83];
      for (let i = 0; i < left.length; i++) {
        const t = i / sampleRate;
        const beat = (t * 2) % 1;
        const noteIdx = Math.floor(t * 2.5) % bassNotes.length;
        const f = bassNotes[noteIdx];
        const bass = Math.sin(2 * Math.PI * f * t) * Math.exp(-beat * 3) * 0.4;
        const kick = Math.sin(2 * Math.PI * (150 * Math.exp(-beat * 25)) * beat) * Math.exp(-beat * 10) * 0.5;
        const sample = bass + kick;
        left[i] = sample;
        right[i] = sample;
      }
      return buf;
    }
  }

  // Create an empty silent AudioBuffer with standard specs
  public createEmptyBuffer(durationSec = 5, channels = 2): AudioBuffer {
    const ctx = this.getAudioContext();
    return ctx.createBuffer(channels, Math.floor(durationSec * ctx.sampleRate), ctx.sampleRate);
  }
}

export const audioEngine = new AudioEngine();
