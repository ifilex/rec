import React, { useState } from 'react';
import { ExportSettings, AudioTrack } from '../types/audio';
import { Win31Button } from './win31/Win31Button';
import { Download, FileAudio, Check, Sparkles, HardDrive, Music } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportDialogProps {
  tracks: AudioTrack[];
  currentFileName: string;
  onExport: (settings: ExportSettings) => Promise<void>;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  tracks,
  currentFileName,
  onExport,
  onClose,
}) => {
  const [format, setFormat] = useState<'wav' | 'mp3'>('mp3');
  const [wavBitDepth, setWavBitDepth] = useState<16 | 24 | 32>(16);
  const [mp3Bitrate, setMp3Bitrate] = useState<128 | 192 | 256 | 320>(320);
  const [sampleRate, setSampleRate] = useState<11025 | 22050 | 44100 | 48000 | 96000>(44100);
  const [normalize, setNormalize] = useState(true);
  const [includeVst, setIncludeVst] = useState(true);
  const [filename, setFilename] = useState(currentFileName.replace(/\.[^/.]+$/, '') || 'GRABACION_WIN31');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDoExport = async () => {
    setIsExporting(true);
    try {
      await onExport({
        format,
        wavBitDepth,
        sampleRate,
        mp3Bitrate,
        channels: 2,
        normalize,
        exportStems: false,
        includeVst,
        filename,
      });

      setIsSuccess(true);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#000080', '#00ff44', '#ffff00', '#ffffff'],
      });
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-lg text-black shadow-2xl flex flex-col">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Download className="w-4 h-4 text-white" />
            <span>Exportar Audio en Alta Calidad (MP3 / WAV)</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-[#dfdfdf] flex flex-col gap-3 text-xs font-sans">
          {/* File Name */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-gray-800">Nombre del archivo:</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-white text-black px-2 py-1 win31-inset flex-1 font-mono text-xs font-semibold"
              />
              <span className="font-mono font-bold text-gray-700 bg-[#c0c0c0] px-2 py-1 win31-sunken-soft">
                .{format}
              </span>
            </div>
          </div>

          {/* Format selection */}
          <div className="bg-[#c0c0c0] p-2.5 win31-sunken-soft flex flex-col gap-2">
            <span className="font-bold text-black border-b border-[#808080] pb-0.5">Formato de Exportación:</span>
            
            <div className="grid grid-cols-2 gap-2">
              <label
                onClick={() => setFormat('mp3')}
                className={`p-2 win31-raised-soft cursor-pointer flex flex-col gap-1 ${
                  format === 'mp3' ? 'bg-[#cce4ff] border-blue-600 ring-1 ring-blue-700' : 'bg-[#c0c0c0]'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>MP3 Comprimido</span>
                  <input
                    type="radio"
                    name="fmt"
                    checked={format === 'mp3'}
                    onChange={() => setFormat('mp3')}
                    className="accent-blue-800"
                  />
                </div>
                <span className="text-[10px] text-gray-700 leading-tight">
                  Ideal para web, streaming y compartir con máxima compatibilidad.
                </span>
              </label>

              <label
                onClick={() => setFormat('wav')}
                className={`p-2 win31-raised-soft cursor-pointer flex flex-col gap-1 ${
                  format === 'wav' ? 'bg-[#cce4ff] border-blue-600 ring-1 ring-blue-700' : 'bg-[#c0c0c0]'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>WAV Sin Pérdidas</span>
                  <input
                    type="radio"
                    name="fmt"
                    checked={format === 'wav'}
                    onChange={() => setFormat('wav')}
                    className="accent-blue-800"
                  />
                </div>
                <span className="text-[10px] text-gray-700 leading-tight">
                  Calidad de estudio PCM Master puro sin compresión de artefactos.
                </span>
              </label>
            </div>
          </div>

          {/* Bitrate / Bit Depth Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {format === 'mp3' ? (
              <div className="flex flex-col gap-1 bg-[#c0c0c0] p-2 win31-sunken-soft">
                <label className="font-bold text-gray-800">Calidad MP3 (Bitrate):</label>
                <select
                  value={mp3Bitrate}
                  onChange={(e) => setMp3Bitrate(parseInt(e.target.value) as any)}
                  className="bg-white text-black px-2 py-1 win31-inset text-xs font-mono"
                >
                  <option value={320}>320 kbps (Máxima Fidelidad Estudio)</option>
                  <option value={256}>256 kbps (Alta Calidad)</option>
                  <option value={192}>192 kbps (Estándar)</option>
                  <option value={128}>128 kbps (Ligero)</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1 bg-[#c0c0c0] p-2 win31-sunken-soft">
                <label className="font-bold text-gray-800">Profundidad WAV PCM:</label>
                <select
                  value={wavBitDepth}
                  onChange={(e) => setWavBitDepth(parseInt(e.target.value) as any)}
                  className="bg-white text-black px-2 py-1 win31-inset text-xs font-mono"
                >
                  <option value={16}>16-Bit PCM (Estándar CD Audio / Win 3.1)</option>
                  <option value={24}>24-Bit PCM (Estudio Profesional)</option>
                  <option value={32}>32-Bit IEEE Float (Rango Dinámico Total)</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1 bg-[#c0c0c0] p-2 win31-sunken-soft">
              <label className="font-bold text-gray-800">Frecuencia de Muestreo:</label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value) as any)}
                className="bg-white text-black px-2 py-1 win31-inset text-xs font-mono"
              >
                <option value={44100}>44.1 kHz (CD Audio Estándar)</option>
                <option value={48000}>48.0 kHz (Audio Digital / Video HD)</option>
                <option value={96000}>96.0 kHz (Hi-Res Audio Master)</option>
                <option value={22050}>22.05 kHz (Vintage 90s)</option>
                <option value={11025}>11.025 kHz (Windows 3.1 Clásico)</option>
              </select>
            </div>
          </div>

          {/* Processing checkboxes */}
          <div className="flex flex-col gap-1.5 bg-[#c0c0c0] p-2 win31-sunken-soft">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
                className="accent-blue-800 w-4 h-4"
              />
              <span>Normalizar volumen automáticamente a 0 dBFS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={includeVst}
                onChange={(e) => setIncludeVst(e.target.checked)}
                className="accent-blue-800 w-4 h-4"
              />
              <span>Incluir efectos activos de la cadena de plugins VST</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 bg-[#c0c0c0] border-t border-[#808080] flex items-center justify-between">
          <Win31Button onClick={onClose} size="md">
            <span>Cancelar</span>
          </Win31Button>

          <Win31Button
            onClick={handleDoExport}
            disabled={isExporting}
            size="lg"
            className="bg-[#000080] text-white hover:bg-[#1084d0] font-bold"
          >
            {isExporting ? (
              <span>Codificando {format.toUpperCase()}...</span>
            ) : isSuccess ? (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4" />
                ¡Exportado!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                Guardar archivo localmente
              </span>
            )}
          </Win31Button>
        </div>
      </div>
    </div>
  );
};
