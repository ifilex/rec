import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AudioTrack, PlaybackState, VSTPluginParams, WaveformSelection, 
  ExportSettings, SoundRecorderProject, Win31Theme 
} from './types/audio';
import { audioEngine } from './utils/audioEngine';
import { AudioExporter } from './utils/audioExporter';
import { CloudStorageManager } from './utils/cloudStorage';
import { defaultVstParams } from './utils/vstPresets';

import { Win31Window } from './components/win31/Win31Window';
import { Win31Menu, MenuActionHandlers } from './components/win31/Win31Menu';
import { Win31Button } from './components/win31/Win31Button';
import { OscilloscopeDisplay } from './components/OscilloscopeDisplay';
import { WaveformEditor } from './components/WaveformEditor';
import { MultiTrackMixer } from './components/MultiTrackMixer';
import { VSTRackModal } from './components/VSTRackModal';
import { ExportDialog } from './components/ExportDialog';
import { CloudVaultModal } from './components/CloudVaultModal';
import { SoundSchemesModal } from './components/SoundSchemesModal';
import { AudioPropertiesModal } from './components/AudioPropertiesModal';
import { AboutModal } from './components/AboutModal';
import { SaveAsModal } from './components/SaveAsModal';

import { 
  Play, Square, Circle, Rewind, FastForward, Sliders, Cloud, 
  Radio, HardDrive, Music, Check, Sparkles, FolderOpen, Save,
  Maximize2, RefreshCw, Upload, Volume2, ShieldCheck, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Theme & Window State
  const [theme, setTheme] = useState<Win31Theme>('classic');
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);

  // Audio Engine & Playback State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [inputLevel, setInputLevel] = useState<number>(0);

  // Tracks State
  const [tracks, setTracks] = useState<AudioTrack[]>(() => {
    // Initial sample sound: Windows 3.1 Tada
    const tadaBuf = audioEngine.generateWin31Sound('tada');
    return [
      {
        id: 'track-1',
        name: 'Pista 1 (TADA.WAV)',
        color: '#000080',
        volume: 1.0,
        pan: 0,
        muted: false,
        solo: false,
        isRecording: true,
        audioBuffer: tadaBuf,
        visible: true,
      },
    ];
  });
  const [activeTrackId, setActiveTrackId] = useState<string>('track-1');
  const [isMultiTrackView, setIsMultiTrackView] = useState<boolean>(true);

  // Undo History & Clipboard
  const [undoStack, setUndoStack] = useState<AudioTrack[][]>([]);
  const [audioClipboard, setAudioClipboard] = useState<AudioBuffer | null>(null);

  // Waveform Selection
  const [selection, setSelection] = useState<WaveformSelection>({
    startTime: 0,
    endTime: 0,
  });

  // DSP / VST Parameters
  const [vstParams, setVstParams] = useState<VSTPluginParams>(defaultVstParams);
  const [vstBypass, setVstBypass] = useState<boolean>(false);

  // Project & Cloud State
  const [projectName, setProjectName] = useState<string>('TADA.WAV');
  const [projectId, setProjectId] = useState<string>('proj_initial');
  const [autoCloud, setAutoCloud] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Ahora');

  // Modals Visibility
  const [showVstModal, setShowVstModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showSchemesModal, setShowSchemesModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Hidden File Pickers Refs
  const openFileInputRef = useRef<HTMLInputElement | null>(null);
  const insertFileInputRef = useRef<HTMLInputElement | null>(null);
  const mixFileInputRef = useRef<HTMLInputElement | null>(null);

  // Playback timer ref
  const playbackIntervalRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);

  // Get active track
  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];
  const activeBuffer = activeTrack?.audioBuffer || null;

  // Calculate overall project duration
  useEffect(() => {
    const maxDur = Math.max(0, ...tracks.map((t) => t.audioBuffer?.duration || 0));
    setDuration(maxDur);
  }, [tracks]);

  // Update VST DSP engine parameters
  useEffect(() => {
    if (vstBypass) {
      audioEngine.updateDspParams(defaultVstParams);
    } else {
      audioEngine.updateDspParams(vstParams);
    }
  }, [vstParams, vstBypass]);

  // Save state to Undo Stack before modifying audio
  const pushUndoState = useCallback(() => {
    const snapshot = tracks.map((t) => ({ ...t }));
    setUndoStack((prev) => [...prev.slice(-15), snapshot]);
  }, [tracks]);

  // --- Transport Controls ---

  // Stop Playback / Recording
  const handleStop = useCallback(() => {
    if (playbackState === 'recording') {
      const recordedBuf = audioEngine.stopMicrophoneRecording();
      if (recordedBuf && recordedBuf.length > 0) {
        pushUndoState();
        setTracks((prev) => {
          const hasRecordingTarget = prev.some((t) => t.isRecording || t.id === activeTrackId);
          if (!hasRecordingTarget && prev.length > 0) {
            return prev.map((t, idx) =>
              idx === 0
                ? {
                    ...t,
                    audioBuffer: t.audioBuffer
                      ? audioEngine.insertBufferAt(t.audioBuffer, recordedBuf, t.audioBuffer.duration)
                      : recordedBuf,
                  }
                : t
            );
          }
          return prev.map((t) => {
            if (t.isRecording || t.id === activeTrackId) {
              const updatedBuf = t.audioBuffer
                ? audioEngine.insertBufferAt(t.audioBuffer, recordedBuf, t.audioBuffer.duration)
                : recordedBuf;
              return { ...t, audioBuffer: updatedBuf };
            }
            return t;
          });
        });
      }
    }

    audioEngine.stopPlayback();
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setPlaybackState('stopped');
    setInputLevel(0);
  }, [playbackState, activeTrackId, pushUndoState]);

  // Start Playback
  const handlePlay = useCallback(async () => {
    const ctx = audioEngine.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    if (playbackState === 'playing') return;
    if (playbackState === 'recording') {
      handleStop();
    }

    const playable = tracks
      .filter((t) => t.audioBuffer && t.audioBuffer.length > 0)
      .map((t) => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
      }));

    if (playable.length === 0) {
      return;
    }

    const startOffset = currentTime >= duration ? 0 : currentTime;
    setCurrentTime(startOffset);
    playbackStartOffsetRef.current = startOffset;
    playbackStartTimeRef.current = performance.now() / 1000;

    audioEngine.playBuffers(playable, startOffset, () => {
      handleStop();
      setCurrentTime(duration);
    });

    setPlaybackState('playing');

    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    playbackIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() / 1000 - playbackStartTimeRef.current;
      const currentPos = Math.min(duration, playbackStartOffsetRef.current + elapsed);
      setCurrentTime(currentPos);
      if (currentPos >= duration && duration > 0) {
        handleStop();
      }
    }, 30);
  }, [playbackState, currentTime, duration, tracks, handleStop]);

  // Start Recording
  const handleRecord = useCallback(async () => {
    // Immediate gesture resume for audio context on touch / click
    const ctx = audioEngine.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    if (playbackState === 'recording') {
      handleStop();
      return;
    }
    if (playbackState === 'playing') {
      handleStop();
    }

    const success = await audioEngine.startMicrophoneRecording((level) => {
      setInputLevel(level);
    });

    if (success) {
      setPlaybackState('recording');
      playbackStartTimeRef.current = performance.now() / 1000;
      playbackStartOffsetRef.current = currentTime;

      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() / 1000 - playbackStartTimeRef.current;
        setCurrentTime(playbackStartOffsetRef.current + elapsed);
      }, 30);
    } else {
      alert('No se pudo acceder al micrófono. Verifique los permisos del navegador.');
    }
  }, [playbackState, currentTime, handleStop]);

  // Rewind to beginning
  const handleRewind = () => {
    handleStop();
    setCurrentTime(0);
  };

  // Fast forward to end
  const handleFastForward = () => {
    handleStop();
    setCurrentTime(duration);
  };

  // Scrubber seek
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clamped);
    if (playbackState === 'playing') {
      audioEngine.stopPlayback();
      const playable = tracks.map((t) => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
      }));
      playbackStartOffsetRef.current = clamped;
      playbackStartTimeRef.current = performance.now() / 1000;
      audioEngine.playBuffers(playable, clamped, () => {
        handleStop();
        setCurrentTime(duration);
      });
    }
  };

  // --- Audio Editing Actions ---

  const updateActiveBuffer = useCallback(
    (newBuffer: AudioBuffer) => {
      pushUndoState();
      setTracks((prev) =>
        prev.map((t) => (t.id === activeTrackId ? { ...t, audioBuffer: newBuffer } : t))
      );
    },
    [activeTrackId, pushUndoState]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setTracks(lastState);
  }, [undoStack]);

  const handleCopy = useCallback(() => {
    if (!activeBuffer) return;
    if (selection.endTime > selection.startTime + 0.01) {
      const slice = audioEngine.sliceBuffer(activeBuffer, selection.startTime, selection.endTime);
      setAudioClipboard(slice);
    } else {
      setAudioClipboard(activeBuffer);
    }
  }, [activeBuffer, selection]);

  const handleCut = useCallback(() => {
    if (!activeBuffer) return;
    handleCopy();
    if (selection.endTime > selection.startTime + 0.01) {
      const updated = audioEngine.deleteRange(activeBuffer, selection.startTime, selection.endTime);
      updateActiveBuffer(updated);
      setSelection({ startTime: 0, endTime: 0 });
    }
  }, [activeBuffer, selection, handleCopy, updateActiveBuffer]);

  const handlePaste = useCallback(() => {
    if (!audioClipboard || !activeBuffer) return;
    const updated = audioEngine.insertBufferAt(activeBuffer, audioClipboard, currentTime);
    updateActiveBuffer(updated);
  }, [audioClipboard, activeBuffer, currentTime, updateActiveBuffer]);

  const handleTrim = useCallback(() => {
    if (!activeBuffer || selection.endTime <= selection.startTime) return;
    const trimmed = audioEngine.sliceBuffer(activeBuffer, selection.startTime, selection.endTime);
    updateActiveBuffer(trimmed);
    setCurrentTime(0);
    setSelection({ startTime: 0, endTime: 0 });
  }, [activeBuffer, selection, updateActiveBuffer]);

  const handleDeleteBefore = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.deleteBeforePosition(activeBuffer, currentTime);
    updateActiveBuffer(updated);
    setCurrentTime(0);
  }, [activeBuffer, currentTime, updateActiveBuffer]);

  const handleDeleteAfter = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.deleteAfterPosition(activeBuffer, currentTime);
    updateActiveBuffer(updated);
  }, [activeBuffer, currentTime, updateActiveBuffer]);

  // Classic Win 3.1 Effects
  const handleVolUp = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.changeVolume(activeBuffer, 1.25);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleVolDown = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.changeVolume(activeBuffer, 0.75);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleSpeedUp = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.changeSpeed(activeBuffer, 2.0);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleSpeedDown = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.changeSpeed(activeBuffer, 0.5);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleAddEcho = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.addEcho(activeBuffer, 0.22, 0.45);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleReverse = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.reverseAudio(activeBuffer);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleNormalize = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.normalizeAudio(activeBuffer);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleFadeIn = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.fadeInOut(activeBuffer, 'in', 0.5);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleFadeOut = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.fadeInOut(activeBuffer, 'out', 0.5);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleBitcrushRetro = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.applyLoFiBitcrush(activeBuffer, 8, 11025);
    updateActiveBuffer(updated);
  }, [activeBuffer, updateActiveBuffer]);

  const handleInsertSilence = useCallback(() => {
    if (!activeBuffer) return;
    const updated = audioEngine.insertSilence(activeBuffer, 1.0, currentTime);
    updateActiveBuffer(updated);
  }, [activeBuffer, currentTime, updateActiveBuffer]);

  // Multi-track actions
  const handleAddTrack = useCallback(() => {
    const newId = `track-${tracks.length + 1}`;
    const colors = ['#000080', '#008000', '#800080', '#800000', '#008080', '#ff8800'];
    const trackColor = colors[tracks.length % colors.length];

    const newTrack: AudioTrack = {
      id: newId,
      name: `Pista ${tracks.length + 1}`,
      color: trackColor,
      volume: 1.0,
      pan: 0,
      muted: false,
      solo: false,
      isRecording: false,
      audioBuffer: audioEngine.createEmptyBuffer(2, 2),
      visible: true,
    };
    pushUndoState();
    setTracks((prev) => [...prev, newTrack]);
    setActiveTrackId(newId);
  }, [tracks, pushUndoState]);

  const handleDeleteTrack = useCallback(
    (id: string) => {
      if (tracks.length <= 1) return;
      pushUndoState();
      setTracks((prev) => prev.filter((t) => t.id !== id));
      if (activeTrackId === id) {
        const remaining = tracks.filter((t) => t.id !== id);
        setActiveTrackId(remaining[0].id);
      }
    },
    [tracks, activeTrackId, pushUndoState]
  );

  const handleUpdateTrack = useCallback((id: string, updates: Partial<AudioTrack>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const handleMixdownTracks = useCallback(async () => {
    const mixBuffer = await AudioExporter.renderMixdown(tracks);
    pushUndoState();
    const masterTrack: AudioTrack = {
      id: `master-${Date.now()}`,
      name: 'Pista Mezcla Master',
      color: '#000080',
      volume: 1.0,
      pan: 0,
      muted: false,
      solo: false,
      isRecording: false,
      audioBuffer: mixBuffer,
      visible: true,
    };
    setTracks([masterTrack]);
    setActiveTrackId(masterTrack.id);
  }, [tracks, pushUndoState]);

  // File Operations (Open, Save, Export)
  const handleOpenLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const decoded = await AudioExporter.loadAudioFile(file);
      pushUndoState();
      setProjectName(file.name);
      setTracks([
        {
          id: 'track-1',
          name: file.name,
          color: '#000080',
          volume: 1.0,
          pan: 0,
          muted: false,
          solo: false,
          isRecording: true,
          audioBuffer: decoded,
          visible: true,
        },
      ]);
      setActiveTrackId('track-1');
      setCurrentTime(0);
    } catch (err) {
      alert('Error al abrir o decodificar el archivo de audio: ' + err);
    }
  };

  const handleInsertFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBuffer) return;
    try {
      const decoded = await AudioExporter.loadAudioFile(file);
      const inserted = audioEngine.insertBufferAt(activeBuffer, decoded, currentTime);
      updateActiveBuffer(inserted);
    } catch (err) {
      alert('Error al insertar archivo: ' + err);
    }
  };

  const handleMixFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBuffer) return;
    try {
      const decoded = await AudioExporter.loadAudioFile(file);
      const mixed = audioEngine.mixBuffers(activeBuffer, decoded, currentTime);
      updateActiveBuffer(mixed);
    } catch (err) {
      alert('Error al mezclar archivo: ' + err);
    }
  };

  // Save Audio directly to System (Prompting destination in user's device/OS)
  const handleSaveToSystem = useCallback(
    async (customFilename?: string, format: 'wav' | 'mp3' = 'wav') => {
      const nameToUse = customFilename || projectName || 'GRABACION.WAV';
      setCloudSyncStatus('syncing');
      try {
        const result = await AudioExporter.saveToSystem(tracks, nameToUse, format);
        if (result.success) {
          setProjectName(result.filename);
          setLastSavedTime(new Date().toLocaleTimeString());
          setCloudSyncStatus('synced');
          // Also sync to background IndexedDB as emergency safety cache
          try {
            const saved = await CloudStorageManager.saveProject(
              result.filename,
              tracks,
              vstParams,
              projectId
            );
            setProjectId(saved.id);
          } catch {
            // ignore
          }
        } else {
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.error('Error al guardar en el sistema:', err);
        setCloudSyncStatus('idle');
      }
    },
    [projectName, tracks, vstParams, projectId]
  );

  // Save Project to IndexedDB / Cloud Vault
  const handleSaveProject = useCallback(async () => {
    setCloudSyncStatus('syncing');
    try {
      const saved = await CloudStorageManager.saveProject(projectName, tracks, vstParams, projectId);
      setProjectId(saved.id);
      setLastSavedTime(new Date().toLocaleTimeString());
      setCloudSyncStatus('synced');
    } catch (e) {
      console.error(e);
      setCloudSyncStatus('idle');
    }
  }, [projectName, tracks, vstParams, projectId]);

  // Auto-Save Interval
  useEffect(() => {
    if (!autoCloud) return;
    const interval = setInterval(() => {
      handleSaveProject();
    }, 45000);
    return () => clearInterval(interval);
  }, [autoCloud, handleSaveProject]);

  // Load project from Cloud Vault
  const handleLoadProjectFromVault = async (proj: SoundRecorderProject) => {
    const ctx = audioEngine.getAudioContext();
    const reconstructedTracks: AudioTrack[] = await Promise.all(
      proj.tracks.map(async (t) => {
        let buf: AudioBuffer | null = null;
        if (t.audioData) {
          buf = await CloudStorageManager.base64ToAudioBuffer(t.audioData, ctx);
        }
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          volume: t.volume,
          pan: t.pan,
          muted: t.muted,
          solo: t.solo,
          isRecording: false,
          audioBuffer: buf,
          visible: true,
        };
      })
    );

    setTracks(reconstructedTracks);
    if (reconstructedTracks.length > 0) {
      setActiveTrackId(reconstructedTracks[0].id);
    }
    setProjectName(proj.name);
    setProjectId(proj.id);
    setVstParams(proj.vstParams || defaultVstParams);
    setCurrentTime(0);
  };

  // Perform High-Fidelity Audio Export
  const handlePerformExport = async (settings: ExportSettings) => {
    const { blob, filename } = await AudioExporter.exportAudio(tracks, settings);
    AudioExporter.downloadBlob(blob, filename);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (playbackState === 'playing' || playbackState === 'recording') {
          handleStop();
        } else {
          handlePlay();
        }
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveToSystem(projectName, 'wav');
      } else if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setShowExportModal(true);
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        openFileInputRef.current?.click();
      } else if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setTracks([
          {
            id: 'track-1',
            name: 'Pista 1',
            color: '#000080',
            volume: 1.0,
            pan: 0,
            muted: false,
            solo: false,
            isRecording: true,
            audioBuffer: audioEngine.createEmptyBuffer(2, 2),
            visible: true,
          },
        ]);
        setActiveTrackId('track-1');
        setCurrentTime(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState, handlePlay, handleStop, handleUndo, handleSaveToSystem, projectName]);

  // Menu Handlers
  const menuHandlers: MenuActionHandlers = {
    onNew: () => {
      setTracks([
        {
          id: 'track-1',
          name: 'Pista 1',
          color: '#000080',
          volume: 1.0,
          pan: 0,
          muted: false,
          solo: false,
          isRecording: true,
          audioBuffer: audioEngine.createEmptyBuffer(2, 2),
          visible: true,
        },
      ]);
      setActiveTrackId('track-1');
      setCurrentTime(0);
      setProjectName('NUEVO.WAV');
    },
    onOpen: () => openFileInputRef.current?.click(),
    onSave: () => handleSaveToSystem(projectName, 'wav'),
    onSaveAs: () => setShowSaveAsModal(true),
    onExport: () => setShowExportModal(true),
    onRevert: () => handleUndo(),
    onUndo: handleUndo,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onInsertFile: () => insertFileInputRef.current?.click(),
    onMixFile: () => mixFileInputRef.current?.click(),
    onInsertSilence: handleInsertSilence,
    onDeleteBefore: handleDeleteBefore,
    onDeleteAfter: handleDeleteAfter,
    onTrim: handleTrim,
    onVolUp: handleVolUp,
    onVolDown: handleVolDown,
    onSpeedUp: handleSpeedUp,
    onSpeedDown: handleSpeedDown,
    onAddEcho: handleAddEcho,
    onReverse: handleReverse,
    onNormalize: handleNormalize,
    onFadeIn: handleFadeIn,
    onFadeOut: handleFadeOut,
    onBitcrushRetro: handleBitcrushRetro,
    onAddTrack: handleAddTrack,
    onToggleMultiTrack: () => setIsMultiTrackView((prev) => !prev),
    onMixdownTracks: handleMixdownTracks,
    onOpenVstRack: () => setShowVstModal(true),
    onToggleVstBypass: () => setVstBypass((prev) => !prev),
    onOpenCloudVault: () => setShowCloudModal(true),
    onSyncCloudNow: handleSaveProject,
    onToggleAutoCloud: () => setAutoCloud((prev) => !prev),
    onOpenSoundSchemes: () => setShowSchemesModal(true),
    onOpenProperties: () => setShowPropertiesModal(true),
    onOpenAbout: () => setShowAboutModal(true),
    onChangeTheme: (t) => setTheme(t),
  };

  // Background Theme Colors
  const bgClasses = {
    classic: 'bg-[#008080]',
    win95: 'bg-[#55aaaa]',
    amber: 'bg-[#1a1205]',
    cyberpunk: 'bg-[#0c051a]',
    dark: 'bg-[#18181b]',
  }[theme];

  const phosphorColor = theme === 'amber' ? 'amber' : theme === 'cyberpunk' ? 'cyan' : 'green';

  return (
    <div
      className={`w-screen h-screen ${bgClasses} flex flex-col justify-between overflow-hidden relative font-sans select-none`}
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={openFileInputRef}
        onChange={handleOpenLocalFile}
        accept="audio/*,.wav,.mp3,.ogg,.flac,.aac,.m4a"
        className="hidden"
      />
      <input
        type="file"
        ref={insertFileInputRef}
        onChange={handleInsertFile}
        accept="audio/*,.wav,.mp3,.ogg,.flac"
        className="hidden"
      />
      <input
        type="file"
        ref={mixFileInputRef}
        onChange={handleMixFile}
        accept="audio/*,.wav,.mp3,.ogg,.flac"
        className="hidden"
      />

      {/* Desktop Workspace */}
      <div className="flex-1 p-1 sm:p-4 flex items-start sm:items-center justify-center relative overflow-y-auto w-full pb-16 sm:pb-4">
        {/* Desktop Icons (Classic Windows 3.1 Program Manager icons - Hidden on mobile) */}
        <div className="absolute top-4 left-4 hidden lg:flex flex-col gap-5 text-white text-xs z-10">
          <div
            onClick={() => setIsWindowMinimized(false)}
            className="flex flex-col items-center gap-1 cursor-pointer group w-20 text-center"
          >
            <div className="w-10 h-10 bg-linear-to-b from-[#000080] to-[#1084d0] win31-inset flex items-center justify-center group-hover:scale-105 transition-transform">
              <Music className="w-6 h-6 text-white drop-shadow" />
            </div>
            <span className="font-semibold px-1 bg-black/40 group-hover:bg-[#000080] rounded-xs text-[11px] leading-tight">
              Grabadora de Sonido
            </span>
          </div>

          <div
            onClick={() => setShowVstModal(true)}
            className="flex flex-col items-center gap-1 cursor-pointer group w-20 text-center"
          >
            <div className="w-10 h-10 bg-[#c0c0c0] win31-outset flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sliders className="w-6 h-6 text-blue-900 drop-shadow" />
            </div>
            <span className="font-semibold px-1 bg-black/40 group-hover:bg-[#000080] rounded-xs text-[11px] leading-tight">
              Rack Plugins VST
            </span>
          </div>

          <div
            onClick={() => setShowCloudModal(true)}
            className="flex flex-col items-center gap-1 cursor-pointer group w-20 text-center"
          >
            <div className="w-10 h-10 bg-[#c0c0c0] win31-outset flex items-center justify-center group-hover:scale-105 transition-transform">
              <Cloud className="w-6 h-6 text-blue-800 drop-shadow" />
            </div>
            <span className="font-semibold px-1 bg-black/40 group-hover:bg-[#000080] rounded-xs text-[11px] leading-tight">
              Bóveda en la Nube
            </span>
          </div>

          <div
            onClick={() => setShowSchemesModal(true)}
            className="flex flex-col items-center gap-1 cursor-pointer group w-20 text-center"
          >
            <div className="w-10 h-10 bg-[#c0c0c0] win31-outset flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-amber-600 drop-shadow" />
            </div>
            <span className="font-semibold px-1 bg-black/40 group-hover:bg-[#000080] rounded-xs text-[11px] leading-tight">
              Sonidos Win 3.1
            </span>
          </div>
        </div>

        {/* Main Sound Recorder Window */}
        {!isWindowMinimized && (
          <Win31Window
            title={`Grabadora de sonido - ${projectName}`}
            isMaximized={isWindowMaximized}
            onMaximize={() => setIsWindowMaximized(!isWindowMaximized)}
            onMinimize={() => setIsWindowMinimized(true)}
            onClose={() => {
              if (confirm('¿Desea cerrar la grabadora de sonido?')) {
                window.location.reload();
              }
            }}
            width="w-full max-w-3xl"
            className="z-20 sm:my-auto"
          >
            {/* Windows 3.1 Menubar */}
            <Win31Menu
              handlers={menuHandlers}
              canUndo={undoStack.length > 0}
              canEdit={!!activeBuffer && activeBuffer.length > 0}
              isMultiTrack={isMultiTrackView}
              vstBypass={vstBypass}
              autoCloud={autoCloud}
              currentTheme={theme}
            />

            {/* Quick Action Strip (Horizontally swipeable on phone) */}
            <div className="bg-[#dfdfdf] win31-sunken-soft p-1.5 mb-2 flex items-center justify-between gap-1 text-xs overflow-x-auto whitespace-nowrap scrollbar-none touch-pan-x">
              <div className="flex items-center gap-1 shrink-0">
                <Win31Button
                  size="sm"
                  onClick={() => openFileInputRef.current?.click()}
                  title="Abrir archivo de audio desde el disco"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-900" />
                  <span>Abrir</span>
                </Win31Button>

                <Win31Button
                  size="sm"
                  onClick={() => handleSaveToSystem(projectName, 'wav')}
                  title="Guardar archivo en el sistema de su computadora o dispositivo"
                >
                  <Save className="w-3.5 h-3.5 text-black" />
                  <span>Guardar</span>
                </Win31Button>

                <Win31Button
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="font-bold text-blue-900"
                  title="Exportar en WAV o MP3"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </Win31Button>

                <Win31Button
                  size="sm"
                  onClick={() => setShowVstModal(true)}
                  active={vstParams.eq5.enabled || vstParams.reverb.enabled || vstParams.delay.enabled || vstParams.bitcrusher.enabled}
                  title="Configurar efectos de audio DSP/VST"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-900" />
                  <span>VST</span>
                </Win31Button>

                <Win31Button
                  size="sm"
                  onClick={() => setIsMultiTrackView(!isMultiTrackView)}
                  active={isMultiTrackView}
                  title="Alternar vista de edición multipista"
                >
                  <Radio className="w-3.5 h-3.5 text-black" />
                  <span>Multipista</span>
                </Win31Button>
              </div>

              {/* Cloud Sync Status Light */}
              <div
                onClick={() => setShowCloudModal(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-white win31-inset cursor-pointer shrink-0 ml-1"
                title="Estado de sincronización en la nube"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    cloudSyncStatus === 'syncing'
                      ? 'bg-amber-500 animate-spin'
                      : autoCloud
                      ? 'bg-emerald-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-[10px] font-mono text-gray-700">
                  {cloudSyncStatus === 'syncing' ? 'Sincronizando...' : 'Nube'}
                </span>
              </div>
            </div>

            {/* Main Upper Section: Time Status Display + Phosphor Oscilloscope */}
            <div className="bg-[#c0c0c0] win31-raised-soft p-1.5 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Left Column: Position & Length displays */}
              <div className="flex flex-row sm:flex-col justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-44 shrink-0 font-sans text-xs">
                {/* Position */}
                <div className="flex-1 sm:flex-initial flex flex-col">
                  <span className="text-gray-800 font-bold mb-0.5 text-[11px] sm:text-xs">Posición:</span>
                  <div className="bg-white text-black font-mono font-bold text-xs sm:text-sm px-1.5 sm:px-2 py-1 win31-inset text-right shadow-inner">
                    {currentTime.toFixed(2)}s
                  </div>
                </div>

                {/* Length */}
                <div className="flex-1 sm:flex-initial flex flex-col">
                  <span className="text-gray-800 font-bold mb-0.5 text-[11px] sm:text-xs">Longitud:</span>
                  <div className="bg-white text-black font-mono font-bold text-xs sm:text-sm px-1.5 sm:px-2 py-1 win31-inset text-right shadow-inner">
                    {duration.toFixed(2)}s
                  </div>
                </div>

                {/* State Tag */}
                <div className="hidden sm:block text-[10px] font-mono uppercase text-center py-0.5 font-bold tracking-wider win31-sunken-soft bg-[#d0d0d0]">
                  {playbackState === 'recording' ? (
                    <span className="text-red-700 animate-pulse flex items-center justify-center gap-1">
                      <Circle className="w-2.5 h-2.5 fill-red-600 text-red-600" />
                      GRABANDO...
                    </span>
                  ) : playbackState === 'playing' ? (
                    <span className="text-emerald-800 flex items-center justify-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" />
                      REPRODUCIENDO
                    </span>
                  ) : (
                    <span className="text-gray-700">DETENIDO</span>
                  )}
                </div>
              </div>

              {/* Center: The Iconic Green Phosphor CRT Oscilloscope */}
              <div className="w-full flex-1 flex flex-col min-w-0">
                <OscilloscopeDisplay
                  playbackState={playbackState}
                  currentBuffer={activeBuffer}
                  currentTime={currentTime}
                  duration={duration}
                  colorScheme={phosphorColor}
                  inputLevel={inputLevel}
                />
                {/* Mobile State Tag */}
                <div className="sm:hidden text-[9px] font-mono uppercase text-center py-0.5 font-bold tracking-wider win31-sunken-soft bg-[#d0d0d0] mt-1">
                  {playbackState === 'recording' ? (
                    <span className="text-red-700 animate-pulse flex items-center justify-center gap-1">
                      <Circle className="w-2 h-2 fill-red-600 text-red-600" />
                      GRABANDO MICROFONO...
                    </span>
                  ) : playbackState === 'playing' ? (
                    <span className="text-emerald-800 flex items-center justify-center gap-1">
                      <Play className="w-2 h-2 fill-emerald-700 text-emerald-700" />
                      REPRODUCIENDO
                    </span>
                  ) : (
                    <span className="text-gray-700">LISTO / DETENIDO</span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrubber / Slider Bar (Windows 3.1 classic style) */}
            <div className="bg-[#c0c0c0] win31-raised-soft px-1.5 sm:px-2 py-1 sm:py-1.5 my-1.5 flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 0.5))}
                className="w-7 h-7 sm:w-5 sm:h-5 bg-[#c0c0c0] win31-button flex items-center justify-center text-xs sm:text-[10px] font-bold active:win31-sunken-soft"
                title="Retroceder 0.5s"
              >
                ◀
              </button>

              <input
                type="range"
                min="0"
                max={Math.max(0.1, duration)}
                step="0.01"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-5 sm:h-4 accent-blue-900 cursor-pointer"
              />

              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 0.5))}
                className="w-7 h-7 sm:w-5 sm:h-5 bg-[#c0c0c0] win31-button flex items-center justify-center text-xs sm:text-[10px] font-bold active:win31-sunken-soft"
                title="Avanzar 0.5s"
              >
                ▶
              </button>
            </div>

            {/* Transport Control Buttons (The 5 Iconic Buttons with responsive touch targets) */}
            <div className="bg-[#c0c0c0] win31-sunken-soft p-1.5 sm:p-2 grid grid-cols-5 gap-1 sm:gap-3">
              {/* Rewind */}
              <Win31Button
                size="lg"
                onClick={handleRewind}
                title="Rebobinar al inicio"
                className="w-full h-11 sm:h-10 flex items-center justify-center"
              >
                <Rewind className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black" />
              </Win31Button>

              {/* Fast Forward */}
              <Win31Button
                size="lg"
                onClick={handleFastForward}
                title="Avanzar al final"
                className="w-full h-11 sm:h-10 flex items-center justify-center"
              >
                <FastForward className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black" />
              </Win31Button>

              {/* Play */}
              <Win31Button
                size="lg"
                active={playbackState === 'playing'}
                onClick={handlePlay}
                title="Reproducir audio (Barra espaciadora)"
                className="w-full h-11 sm:h-10 flex items-center justify-center"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black" />
              </Win31Button>

              {/* Stop */}
              <Win31Button
                size="lg"
                active={playbackState === 'stopped'}
                onClick={handleStop}
                title="Detener reproducción o grabación"
                className="w-full h-11 sm:h-10 flex items-center justify-center"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black" />
              </Win31Button>

              {/* Record (The classic red dot button) */}
              <Win31Button
                size="lg"
                active={playbackState === 'recording'}
                onClick={handleRecord}
                title="Grabar micrófono en tiempo real"
                className={`w-full h-11 sm:h-10 flex items-center justify-center ${playbackState === 'recording' ? 'bg-red-700 text-white' : ''}`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 border border-red-950 shadow-inner flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                </div>
              </Win31Button>
            </div>

            {/* Interactive Waveform Editor */}
            <WaveformEditor
              audioBuffer={activeBuffer}
              currentTime={currentTime}
              duration={duration}
              selection={selection}
              onSelectionChange={setSelection}
              onSeek={handleSeek}
              onCut={handleCut}
              onCopy={handleCopy}
              onTrim={handleTrim}
              onNormalize={handleNormalize}
              onFadeIn={handleFadeIn}
              onFadeOut={handleFadeOut}
              trackName={activeTrack.name}
            />

            {/* Multi-track DAW Panel */}
            {isMultiTrackView && (
              <MultiTrackMixer
                tracks={tracks}
                activeTrackId={activeTrackId}
                onSelectTrack={setActiveTrackId}
                onAddTrack={handleAddTrack}
                onDeleteTrack={handleDeleteTrack}
                onUpdateTrack={handleUpdateTrack}
                onMixdown={handleMixdownTracks}
                isRecording={playbackState === 'recording'}
              />
            )}

            {/* Status Bar */}
            <div className="min-h-6 bg-[#c0c0c0] win31-sunken-soft mt-1 flex flex-wrap items-center justify-between px-2 py-0.5 text-[10px] font-sans text-gray-800 gap-1">
              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                <span className="truncate max-w-[120px] sm:max-w-none">Pista: <strong>{activeTrack.name}</strong></span>
                <span>•</span>
                <span>Latencia: <strong>&lt; 5.8 ms</strong></span>
                <span>•</span>
                <span>DSP: <strong>{vstBypass ? 'Bypass' : 'Activo'}</strong></span>
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-gray-700">
                Auto-guardado: {lastSavedTime}
              </div>
            </div>
          </Win31Window>
        )}

        {/* Minimized Window Taskbar icon on Desktop */}
        {isWindowMinimized && (
          <div
            onClick={() => setIsWindowMinimized(false)}
            className="win31-window-border bg-[#c0c0c0] px-3 py-1.5 flex items-center gap-2 cursor-pointer shadow-xl fixed bottom-4 left-4 z-40"
          >
            <Music className="w-4 h-4 text-blue-900" />
            <span className="font-bold text-xs">Grabadora de sonido - {projectName}</span>
          </div>
        )}
      </div>

      {/* Mobile Bottom Quick-Action Dock (Visible only on mobile/tablet screens) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#c0c0c0] border-t-2 border-white win31-window-border p-1 z-40 flex items-center justify-around text-black text-[10px] shadow-2xl">
        <button
          onClick={() => setShowVstModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 cursor-pointer active:scale-95"
        >
          <Sliders className="w-4 h-4 text-purple-900" />
          <span className="font-semibold">VST</span>
        </button>

        <button
          onClick={() => setShowCloudModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 cursor-pointer active:scale-95"
        >
          <Cloud className="w-4 h-4 text-blue-900" />
          <span className="font-semibold">Nube</span>
        </button>

        <button
          onClick={() => setShowSchemesModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span className="font-semibold">Sonidos 3.1</span>
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 cursor-pointer active:scale-95"
        >
          <Music className="w-4 h-4 text-emerald-900" />
          <span className="font-semibold">Exportar</span>
        </button>

        <button
          onClick={() => setShowPropertiesModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 cursor-pointer active:scale-95"
        >
          <Zap className="w-4 h-4 text-gray-800" />
          <span className="font-semibold">Audio Info</span>
        </button>
      </div>

      {/* Modals & Dialogs */}
      {showVstModal && (
        <VSTRackModal
          params={vstParams}
          onChangeParams={setVstParams}
          onClose={() => setShowVstModal(false)}
        />
      )}

      {showExportModal && (
        <ExportDialog
          tracks={tracks}
          currentFileName={projectName}
          onExport={handlePerformExport}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showSaveAsModal && (
        <SaveAsModal
          currentFileName={projectName}
          onSave={async (filename, format) => {
            await handleSaveToSystem(filename, format);
          }}
          onClose={() => setShowSaveAsModal(false)}
        />
      )}

      {showCloudModal && (
        <CloudVaultModal
          onLoadProject={handleLoadProjectFromVault}
          onClose={() => setShowCloudModal(false)}
          currentProjectName={projectName}
          autoCloud={autoCloud}
          onToggleAutoCloud={() => setAutoCloud(!autoCloud)}
        />
      )}

      {showSchemesModal && (
        <SoundSchemesModal
          onLoadSound={(buffer, name) => {
            pushUndoState();
            setProjectName(name);
            setTracks([
              {
                id: 'track-1',
                name,
                color: '#000080',
                volume: 1.0,
                pan: 0,
                muted: false,
                solo: false,
                isRecording: true,
                audioBuffer: buffer,
                visible: true,
              },
            ]);
            setActiveTrackId('track-1');
            setCurrentTime(0);
          }}
          onClose={() => setShowSchemesModal(false)}
        />
      )}

      {showPropertiesModal && (
        <AudioPropertiesModal
          currentBuffer={activeBuffer}
          trackCount={tracks.length}
          onClose={() => setShowPropertiesModal(false)}
        />
      )}

      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}
