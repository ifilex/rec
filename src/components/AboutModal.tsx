import React from 'react';
import { Win31Button } from './win31/Win31Button';
import { Music, Award, ShieldCheck, Sparkles } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-md text-black shadow-2xl flex flex-col">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-white" />
            <span>Acerca de Grabadora de sonido</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 bg-[#dfdfdf] flex flex-col gap-3 text-xs font-sans">
          {/* Logo header */}
          <div className="flex items-center gap-3 border-b border-[#808080] pb-3">
            <div className="w-12 h-12 bg-linear-to-br from-[#000080] to-[#1084d0] win31-inset flex items-center justify-center shadow-inner shrink-0">
              <Music className="w-7 h-7 text-white drop-shadow" />
            </div>
            <div>
              <div className="font-bold text-sm text-black">
                Grabadora de sonido de Windows 3.1 Pro
              </div>
              <div className="text-[11px] text-gray-700">
                Versión 3.10.450 (Edición Multimedia Pro)
              </div>
              <div className="text-[10px] text-gray-600">
                Copyright © 1985-1992 Microsoft Corporation &amp; Studio Engine
              </div>
            </div>
          </div>

          {/* Features summary */}
          <div className="bg-[#c0c0c0] p-2.5 win31-sunken-soft flex flex-col gap-1.5 text-[11px]">
            <div className="font-bold text-black flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-900" />
              <span>Capacidades de la Edición Pro:</span>
            </div>
            <ul className="list-disc list-inside text-gray-800 space-y-0.5 text-[10px]">
              <li>Edición de forma de onda multipista con consola DAW</li>
              <li>Rack de efectos DSP / Plugins VST en tiempo real</li>
              <li>Exportación de alta fidelidad en MP3 a 320kbps y WAV PCM 32-bit</li>
              <li>Osciloscopio analógico verde de fósforo con medidores VU</li>
              <li>Sincronización en la nube con guardado automático</li>
              <li>Latencia mínima profesional para grabación en tiempo real</li>
            </ul>
          </div>

          {/* Memory & Enhanced mode stats */}
          <div className="bg-white p-2 win31-inset font-mono text-[10px] text-gray-700 flex flex-col gap-0.5">
            <div>Modo de ejecución: <strong>Windows 3.1 Modo 386 Mejorado</strong></div>
            <div>Memoria libre para audio: <strong>16,384 KB (16 MB)</strong></div>
            <div>Recursos del sistema disponibles: <strong>94% libres</strong></div>
            <div>Coprocesador matemático: <strong>Presente (Web Audio FPU)</strong></div>
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
