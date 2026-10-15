import React from 'react';
import { Win31Button } from './win31/Win31Button';
import { Info, Cpu, HardDrive, Zap, Radio } from 'lucide-react';

interface AudioPropertiesModalProps {
  currentBuffer: AudioBuffer | null;
  trackCount: number;
  onClose: () => void;
}

export const AudioPropertiesModal: React.FC<AudioPropertiesModalProps> = ({
  currentBuffer,
  trackCount,
  onClose,
}) => {
  const sampleRate = currentBuffer?.sampleRate || 44100;
  const channels = currentBuffer?.numberOfChannels || 2;
  const duration = currentBuffer?.duration || 0;
  const totalSamples = currentBuffer?.length || 0;
  const estimatedBytes = totalSamples * channels * 2; // 16-bit PCM estimate
  const kbSize = (estimatedBytes / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-md text-black shadow-2xl flex flex-col">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-white" />
            <span>Propiedades del Archivo de Sonido</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-[#dfdfdf] flex flex-col gap-3 text-xs font-sans">
          {/* Format Summary Card */}
          <div className="bg-[#c0c0c0] p-3 win31-sunken-soft flex flex-col gap-2">
            <div className="font-bold text-blue-900 border-b border-[#808080] pb-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              <span>Formato de Audio Digital en Memoria</span>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[11px]">
              <span className="text-gray-700">Formato:</span>
              <span className="font-bold text-black">Microsoft RIFF WAVE / PCM</span>

              <span className="text-gray-700">Frecuencia:</span>
              <span className="font-bold text-black">{sampleRate} Hz ({sampleRate / 1000} kHz)</span>

              <span className="text-gray-700">Canales:</span>
              <span className="font-bold text-black">{channels === 1 ? '1 (Mono)' : '2 (Estéreo)'}</span>

              <span className="text-gray-700">Duración:</span>
              <span className="font-bold text-black">{duration.toFixed(3)} segundos</span>

              <span className="text-gray-700">Muestras Totales:</span>
              <span className="font-bold text-black">{totalSamples.toLocaleString()} samples</span>

              <span className="text-gray-700">Pistas DAW:</span>
              <span className="font-bold text-black">{trackCount} pistas activas</span>

              <span className="text-gray-700">Tamaño aprox:</span>
              <span className="font-bold text-black">{kbSize} KB</span>
            </div>
          </div>

          {/* Latency & Engine info */}
          <div className="bg-[#c0c0c0] p-2.5 win31-sunken-soft flex flex-col gap-1 text-[10px]">
            <div className="font-bold text-black flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-800" />
              <span>Motor Web Audio de Latencia Cero:</span>
            </div>
            <div className="text-gray-700 leading-tight">
              Procesador ScriptProcessor / Direct Buffer stream con latencia interactiva calculada a &lt; 5.8 ms. Buffer de entrada directo a 32-bit Float sin interpolación destructiva.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 bg-[#c0c0c0] border-t border-[#808080] flex justify-end">
          <Win31Button onClick={onClose} size="md">
            <span>Aceptar</span>
          </Win31Button>
        </div>
      </div>
    </div>
  );
};
