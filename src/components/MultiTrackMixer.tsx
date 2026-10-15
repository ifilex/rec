import React from 'react';
import { AudioTrack } from '../types/audio';
import { Plus, Trash2, Volume2, Mic, Eye, EyeOff, Radio } from 'lucide-react';
import { Win31Button } from './win31/Win31Button';

interface MultiTrackMixerProps {
  tracks: AudioTrack[];
  activeTrackId: string;
  onSelectTrack: (id: string) => void;
  onAddTrack: () => void;
  onDeleteTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<AudioTrack>) => void;
  onMixdown: () => void;
  isRecording: boolean;
}

export const MultiTrackMixer: React.FC<MultiTrackMixerProps> = ({
  tracks,
  activeTrackId,
  onSelectTrack,
  onAddTrack,
  onDeleteTrack,
  onUpdateTrack,
  onMixdown,
  isRecording,
}) => {
  return (
    <div className="win31-sunken-soft bg-[#dfdfdf] p-1.5 sm:p-2 flex flex-col gap-2 my-1 select-none">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#808080] pb-1.5 font-sans gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs text-black uppercase tracking-wider flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-blue-900" />
            Consola DAW ({tracks.length} Pistas)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Win31Button size="sm" onClick={onAddTrack} title="Añadir nueva pista vacía">
            <Plus className="w-3 h-3 text-black" />
            <span>Nueva</span>
          </Win31Button>
          <Win31Button size="sm" onClick={onMixdown} title="Combinar todas las pistas en una sola">
            <span>Mezclar</span>
          </Win31Button>
        </div>
      </div>

      {/* Track List */}
      <div className="flex flex-col gap-1.5 max-h-64 sm:max-h-56 overflow-y-auto pr-1">
        {tracks.map((track) => {
          const isActive = track.id === activeTrackId;
          const duration = track.audioBuffer?.duration || 0;

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`p-2 win31-raised-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                isActive ? 'bg-[#cce4ff] border-blue-600 ring-1 ring-blue-700' : 'bg-[#c0c0c0]'
              }`}
            >
              {/* Top Row / Track ID and Name */}
              <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[130px]">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black"
                    style={{ backgroundColor: track.color }}
                  />
                  <input
                    type="text"
                    value={track.name}
                    onChange={(e) => onUpdateTrack(track.id, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white text-black px-1.5 py-0.5 win31-inset text-xs w-28 sm:w-24 font-semibold"
                  />
                </div>
                <span className="text-[10px] text-gray-700 font-mono bg-white/70 px-1 py-0.5 win31-sunken-soft">
                  {duration > 0 ? `${duration.toFixed(1)}s` : '0.0s'}
                </span>

                {/* Arm, Mute, Solo Buttons on mobile top row */}
                <div className="flex sm:hidden items-center gap-1 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onUpdateTrack(track.id, { isRecording: !track.isRecording })}
                    className={`w-7 h-6 win31-button flex items-center justify-center font-bold text-[11px] ${
                      track.isRecording ? 'bg-red-600 text-white font-extrabold shadow-inner' : 'bg-[#c0c0c0] text-red-900'
                    }`}
                    title="Armar para grabación directa"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${track.isRecording ? 'bg-white' : 'bg-red-700'}`} />
                  </button>

                  <button
                    onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                    className={`w-7 h-6 win31-button flex items-center justify-center font-bold text-[11px] ${
                      track.muted ? 'bg-blue-900 text-white' : 'bg-[#c0c0c0] text-black'
                    }`}
                    title="Silenciar pista (Mute)"
                  >
                    M
                  </button>

                  <button
                    onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                    className={`w-7 h-6 win31-button flex items-center justify-center font-bold text-[11px] ${
                      track.solo ? 'bg-yellow-500 text-black' : 'bg-[#c0c0c0] text-black'
                    }`}
                    title="Pista en solitario (Solo)"
                  >
                    S
                  </button>
                  {tracks.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack(track.id);
                      }}
                      className="p-1 text-red-700 hover:text-red-900 win31-button cursor-pointer shrink-0 ml-1"
                      title="Eliminar pista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop Arm, Mute, Solo Buttons */}
              <div className="hidden sm:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onUpdateTrack(track.id, { isRecording: !track.isRecording })}
                  className={`w-6 h-5 win31-button flex items-center justify-center font-bold text-[10px] ${
                    track.isRecording ? 'bg-red-600 text-white font-extrabold shadow-inner' : 'bg-[#c0c0c0] text-red-900'
                  }`}
                  title="Armar para grabación directa"
                >
                  <div className={`w-2 h-2 rounded-full ${track.isRecording ? 'bg-white' : 'bg-red-700'}`} />
                </button>

                <button
                  onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                  className={`w-6 h-5 win31-button flex items-center justify-center font-bold text-[10px] ${
                    track.muted ? 'bg-blue-900 text-white' : 'bg-[#c0c0c0] text-black'
                  }`}
                  title="Silenciar pista (Mute)"
                >
                  M
                </button>

                <button
                  onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                  className={`w-6 h-5 win31-button flex items-center justify-center font-bold text-[10px] ${
                    track.solo ? 'bg-yellow-500 text-black' : 'bg-[#c0c0c0] text-black'
                  }`}
                  title="Pista en solitario (Solo)"
                >
                  S
                </button>
              </div>

              {/* Sliders Area (Volume & Pan) */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2 shrink-0 border-t border-[#a0a0a0] sm:border-t-0 pt-1 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-700 font-mono">Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) => onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })}
                    className="w-20 sm:w-16 h-4 sm:h-3 accent-blue-800"
                  />
                  <span className="text-[9px] font-mono text-gray-700 w-7">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>

                {/* Pan Slider */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-700 font-mono">Pan:</span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={track.pan}
                    onChange={(e) => onUpdateTrack(track.id, { pan: parseFloat(e.target.value) })}
                    className="w-16 sm:w-14 h-4 sm:h-3 accent-blue-800"
                  />
                  <span className="text-[9px] font-mono text-gray-700 w-5">
                    {track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 10))}` : track.pan > 0 ? `R${Math.round(track.pan * 10)}` : 'C'}
                  </span>
                </div>

                {/* Desktop Delete Track */}
                {tracks.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTrack(track.id);
                    }}
                    className="hidden sm:flex p-1 text-red-700 hover:text-red-900 win31-button cursor-pointer shrink-0 ml-1"
                    title="Eliminar pista"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
