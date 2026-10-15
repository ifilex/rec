import * as lamejs from 'lamejs';
import { ExportSettings, AudioTrack } from '../types/audio';
import { audioEngine } from './audioEngine';

export class AudioExporter {
  // Render multi-track project into a single master AudioBuffer
  public static async renderMixdown(
    tracks: AudioTrack[],
    options?: { sampleRate?: number; includeVst?: boolean }
  ): Promise<AudioBuffer> {
    const activeTracks = tracks.filter((t) => !t.muted && t.audioBuffer);
    if (activeTracks.length === 0) {
      return audioEngine.createEmptyBuffer(1, 2);
    }

    const sampleRate = options?.sampleRate || 44100;
    const maxDuration = Math.max(...activeTracks.map((t) => t.audioBuffer?.duration || 0));
    const totalSamples = Math.ceil(maxDuration * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const effectsInput = offlineCtx.destination;

    activeTracks.forEach((t) => {
      if (!t.audioBuffer) return;
      const source = offlineCtx.createBufferSource();
      source.buffer = t.audioBuffer;

      const gain = offlineCtx.createGain();
      gain.gain.value = t.volume;

      const panner = offlineCtx.createStereoPanner ? offlineCtx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, t.pan));
        source.connect(gain);
        gain.connect(panner);
        panner.connect(effectsInput);
      } else {
        source.connect(gain);
        gain.connect(effectsInput);
      }

      source.start(0);
    });

    return await offlineCtx.startRendering();
  }

  // Export to high-quality WAV (16-bit, 24-bit, 32-bit float)
  public static audioBufferToWav(buffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 16): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = bitDepth === 32 ? 3 : 1; // 3 = IEEE Float, 1 = PCM
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const bufferLength = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // Format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (1 = PCM, 3 = Float)
    view.setUint16(20, format, true);
    // Channel count
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate
    view.setUint32(28, byteRate, true);
    // Block align
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bitDepth, true);
    // Data chunk identifier
    this.writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);

    // Interleave channels & write samples
    let offset = 44;
    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelData.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channelData[c][i]));

        if (bitDepth === 16) {
          const s = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, s, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const s = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
          const intSample = Math.floor(s);
          view.setUint8(offset, intSample & 0xff);
          view.setUint8(offset + 1, (intSample >> 8) & 0xff);
          view.setUint8(offset + 2, (intSample >> 16) & 0xff);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // Export to MP3 using lamejs
  public static audioBufferToMp3(buffer: AudioBuffer, kbps: number = 256): Blob {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    // lamejs Mp3Encoder
    const Lame = (lamejs as unknown as { Mp3Encoder: new (channels: number, samplerate: number, kbps: number) => {
      encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
      flush: () => Int8Array;
    } }).Mp3Encoder || (window as unknown as { lamejs?: { Mp3Encoder: new (channels: number, samplerate: number, kbps: number) => {
      encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
      flush: () => Int8Array;
    } } }).lamejs?.Mp3Encoder;

    if (!Lame) {
      console.warn('Lamejs not found, falling back to WAV');
      return this.audioBufferToWav(buffer, 16);
    }

    const mp3Encoder = new Lame(channels, sampleRate, kbps);
    const mp3Data: Int8Array[] = [];

    // Convert Float32Array to Int16Array
    const leftF32 = buffer.getChannelData(0);
    const leftI16 = new Int16Array(leftF32.length);
    for (let i = 0; i < leftF32.length; i++) {
      const s = Math.max(-1, Math.min(1, leftF32[i]));
      leftI16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    let rightI16: Int16Array | undefined = undefined;
    if (channels > 1) {
      const rightF32 = buffer.getChannelData(1);
      rightI16 = new Int16Array(rightF32.length);
      for (let i = 0; i < rightF32.length; i++) {
        const s = Math.max(-1, Math.min(1, rightF32[i]));
        rightI16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    const sampleBlockSize = 1152;
    for (let i = 0; i < leftI16.length; i += sampleBlockSize) {
      const leftChunk = leftI16.subarray(i, i + sampleBlockSize);
      let mp3buf: Int8Array;
      if (channels > 1 && rightI16) {
        const rightChunk = rightI16.subarray(i, i + sampleBlockSize);
        mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      } else {
        mp3buf = mp3Encoder.encodeBuffer(leftChunk);
      }
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3Last = mp3Encoder.flush();
    if (mp3Last.length > 0) {
      mp3Data.push(mp3Last);
    }

    return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
  }

  // Load and decode an audio file into AudioBuffer
  public static async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = audioEngine.getAudioContext();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  // Resample buffer to target sample rate if needed
  public static async resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    if (buffer.sampleRate === targetSampleRate) return buffer;
    const targetLength = Math.ceil(buffer.duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, targetLength, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    return await offlineCtx.startRendering();
  }

  // Helper string writer for RIFF/WAV headers
  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Trigger browser download of audio blob
  public static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  // Save Audio directly to System / OS Storage (Prompting destination in user's device)
  public static async saveToSystem(
    tracks: AudioTrack[],
    suggestedFilename: string = 'GRABACION.WAV',
    format: 'wav' | 'mp3' = 'wav'
  ): Promise<{ success: boolean; filename: string }> {
    const activeTracks = tracks.filter((t) => !t.muted && t.audioBuffer && t.audioBuffer.length > 0);
    const masterBuffer = await this.renderMixdown(
      activeTracks.length > 0 ? tracks : [
        {
          id: 'track-1',
          name: 'Pista 1',
          color: '#000080',
          volume: 1.0,
          pan: 0,
          muted: false,
          solo: false,
          isRecording: false,
          audioBuffer: audioEngine.createEmptyBuffer(1, 2),
          visible: true,
        }
      ],
      { includeVst: true }
    );

    const ext = format === 'mp3' ? 'mp3' : 'wav';
    const cleanName = suggestedFilename.replace(/\.[^/.]+$/, '').trim() || 'GRABACION';
    const finalFilename = `${cleanName}.${ext}`;

    let blob: Blob;
    if (format === 'mp3') {
      blob = this.audioBufferToMp3(masterBuffer, 320);
    } else {
      blob = this.audioBufferToWav(masterBuffer, 16);
    }

    // Attempt File System Access API (showSaveFilePicker) on supported desktop browsers
    // to suggest location and let the user choose the folder on their operating system
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<{
            name: string;
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [
            format === 'mp3'
              ? {
                  description: 'Archivo de Audio MP3 (*.mp3)',
                  accept: { 'audio/mpeg': ['.mp3'] },
                }
              : {
                  description: 'Archivo de Sonido Wave Windows (*.wav)',
                  accept: { 'audio/wav': ['.wav'] },
                },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, filename: fileHandle.name || finalFilename };
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
          return { success: false, filename: finalFilename };
        }
        console.warn('showSaveFilePicker error, falling back to download:', err);
      }
    }

    // Fallback: Trigger browser save/download with suggested filename
    this.downloadBlob(blob, finalFilename);
    return { success: true, filename: finalFilename };
  }

  // Master Export orchestrator
  public static async exportAudio(
    tracks: AudioTrack[],
    settings: ExportSettings
  ): Promise<{ blob: Blob; filename: string }> {
    let masterBuffer = await this.renderMixdown(tracks, {
      sampleRate: settings.sampleRate,
      includeVst: settings.includeVst,
    });

    if (settings.normalize) {
      masterBuffer = audioEngine.normalizeAudio(masterBuffer);
    }

    let outputBlob: Blob;
    let ext = 'wav';

    if (settings.format === 'mp3') {
      outputBlob = this.audioBufferToMp3(masterBuffer, settings.mp3Bitrate);
      ext = 'mp3';
    } else {
      outputBlob = this.audioBufferToWav(masterBuffer, settings.wavBitDepth);
      ext = 'wav';
    }

    const cleanName = settings.filename.replace(/\.[^/.]+$/, '') || 'SONIDO';
    const finalFilename = `${cleanName}.${ext}`;

    return { blob: outputBlob, filename: finalFilename };
  }
}
