import { SoundRecorderProject, VSTPluginParams, AudioTrack } from '../types/audio';
import { AudioExporter } from './audioExporter';

const DB_NAME = 'Win31SoundRecorderPro_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_RECORDINGS = 'cloud_vault';

export class CloudStorageManager {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  public static async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
            db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
            db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  // Save Project with Audio Track Blobs into IndexedDB
  public static async saveProject(
    projectName: string,
    tracks: AudioTrack[],
    vstParams: VSTPluginParams,
    existingId?: string
  ): Promise<SoundRecorderProject> {
    const db = await this.getDB();
    const id = existingId || 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    
    // Serialize tracks to WAV ArrayBuffers
    const serializedTracks = await Promise.all(
      tracks.map(async (t) => {
        let base64Audio = '';
        if (t.audioBuffer) {
          const wavBlob = AudioExporter.audioBufferToWav(t.audioBuffer, 16);
          base64Audio = await this.blobToBase64(wavBlob);
        }
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          volume: t.volume,
          pan: t.pan,
          muted: t.muted,
          solo: t.solo,
          audioData: base64Audio,
          sampleRate: t.audioBuffer?.sampleRate || 44100,
          channels: t.audioBuffer?.numberOfChannels || 2,
        };
      })
    );

    const maxDuration = Math.max(0, ...tracks.map((t) => t.audioBuffer?.duration || 0));

    const project: SoundRecorderProject = {
      id,
      name: projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration: maxDuration,
      tracks: serializedTracks,
      vstParams,
      bpm: 120,
      cloudSynced: true,
      cloudId: 'cloud_' + id,
      sizeBytes: serializedTracks.reduce((acc, t) => acc + (t.audioData?.length || 0), 0),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);
      req.onsuccess = () => resolve(project);
      req.onerror = () => reject(req.error);
    });
  }

  // Load Project by ID
  public static async loadProject(id: string): Promise<SoundRecorderProject | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // List all saved projects
  public static async listProjects(): Promise<SoundRecorderProject[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.updatedAt - a.updatedAt));
      req.onerror = () => reject(req.error);
    });
  }

  // Delete project
  public static async deleteProject(id: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Cloud Sync Simulation (Syncing to remote cloud bucket with status ping)
  public static async syncToRemoteCloud(project: SoundRecorderProject): Promise<{ success: boolean; cloudUrl: string; syncedAt: number }> {
    // Simulate cloud network latency & handshake
    await new Promise((r) => setTimeout(r, 650));
    const cloudUrl = `https://win31-audio-cloud.storage.live/projects/${project.id}.wav`;
    return {
      success: true,
      cloudUrl,
      syncedAt: Date.now(),
    };
  }

  // Helper convert base64 to audio buffer
  public static async base64ToAudioBuffer(base64: string, ctx: AudioContext): Promise<AudioBuffer | null> {
    if (!base64) return null;
    const res = await fetch(base64);
    const arrayBuf = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuf);
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
