import React from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Win31Button } from './win31/Win31Button';
import { Music, Play, Plus, Volume2 } from 'lucide-react';

interface SoundSchemesModalProps {
  onLoadSound: (buffer: AudioBuffer, name: string) => void;
  onClose: () => void;
}

export const SoundSchemesModal: React.FC<SoundSchemesModalProps> = ({
  onLoadSound,
  onClose,
}) => {
  const sounds: { id: 'tada' | 'chord' | 'ding' | 'chimes' | 'startup' | 'synthwave'; name: string; file: string; desc: string }[] = [
    {
      id: 'tada',
      name: 'Ta-Da! Fanfarria Triunfal',
      file: 'TADA.WAV',
      desc: 'La fanfarria legendaria de Windows 3.1 con trompetas y acorde mayor triunfal.',
    },
    {
      id: 'chord',
      name: 'Acorde Mayor FM Brass',
      file: 'CHORD.WAV',
      desc: 'El acorde estéreo sintetizado utilizado en avisos y alertas de Windows 3.1.',
    },
    {
      id: 'ding',
      name: 'Campanilla Ding Cristalina',
      file: 'DING.WAV',
      desc: 'Campanilla pura de advertencia y notificación del sistema.',
    },
    {
      id: 'chimes',
      name: 'Carillón Arpegio Espacial',
      file: 'CHIMES.WAV',
      desc: 'Cascada armónica de campanas tubulares arpegiadas estéreo.',
    },
    {
      id: 'synthwave',
      name: 'Groove 90s Synth & Beat',
      file: 'SYNTH90S.WAV',
      desc: 'Patrón de bajo y bombo electrónico de los 90 para probar efectos y loop.',
    },
  ];

  const handlePlayPreview = (type: 'tada' | 'chord' | 'ding' | 'chimes' | 'startup' | 'synthwave') => {
    const buf = audioEngine.generateWin31Sound(type);
    audioEngine.playBuffers([{ buffer: buf, volume: 1.0, pan: 0, muted: false }]);
  };

  const handleLoadIntoSession = (type: 'tada' | 'chord' | 'ding' | 'chimes' | 'startup' | 'synthwave', file: string) => {
    const buf = audioEngine.generateWin31Sound(type);
    onLoadSound(buf, file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-lg text-black shadow-2xl flex flex-col">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-white" />
            <span>Esquemas de Sonido Clásicos de Windows 3.1 (1992)</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-[#dfdfdf] flex flex-col gap-2.5 text-xs font-sans">
          <p className="text-gray-700 text-xs">
            Seleccione un sonido retro original para escuchar una muestra o cargarlo directamente en el editor:
          </p>

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {sounds.map((snd) => (
              <div
                key={snd.id}
                className="p-2.5 bg-[#c0c0c0] win31-raised-soft flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-black">
                    <span className="font-mono text-blue-900 bg-white px-1 win31-inset text-[11px]">{snd.file}</span>
                    <span>{snd.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-700 mt-0.5">{snd.desc}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Win31Button
                    size="sm"
                    onClick={() => handlePlayPreview(snd.id)}
                    title="Escuchar sonido"
                  >
                    <Play className="w-3 h-3 text-emerald-800 fill-emerald-800" />
                    <span>Oír</span>
                  </Win31Button>
                  <Win31Button
                    size="sm"
                    onClick={() => handleLoadIntoSession(snd.id, snd.file)}
                    title="Cargar en la pista activa"
                    className="bg-[#000080] text-white hover:bg-[#1084d0]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Cargar</span>
                  </Win31Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 bg-[#c0c0c0] border-t border-[#808080] flex justify-end">
          <Win31Button onClick={onClose} size="md">
            <span>Cerrar</span>
          </Win31Button>
        </div>
      </div>
    </div>
  );
};
