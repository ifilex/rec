import React, { useState } from 'react';
import { Win31Button } from './win31/Win31Button';
import { Save, Folder, HardDrive, FileAudio } from 'lucide-react';

interface SaveAsModalProps {
  currentFileName: string;
  onSave: (filename: string, format: 'wav' | 'mp3') => Promise<void>;
  onClose: () => void;
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({
  currentFileName,
  onSave,
  onClose,
}) => {
  const [filename, setFilename] = useState(
    currentFileName.replace(/\.[^/.]+$/, '') || 'GRABACION'
  );
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [selectedDir, setSelectedDir] = useState('MEDIA');
  const [selectedDrive, setSelectedDrive] = useState('c: [ms-dos_6]');
  const [isSaving, setIsSaving] = useState(false);

  const sampleDirs = ['..', 'MEDIA', 'SYSTEM', 'WINWORD', 'TEMP'];
  const sampleFiles = [
    'CHIMES.WAV',
    'CHORD.WAV',
    'DING.WAV',
    'RINGIN.WAV',
    'TADA.WAV',
  ];

  const handleConfirmSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!filename.trim()) return;
    setIsSaving(true);
    try {
      await onSave(filename.trim(), format);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="save-as-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none"
    >
      <div
        id="save-as-dialog-window"
        className="win31-window-border bg-[#c0c0c0] w-full max-w-md text-black shadow-2xl flex flex-col font-sans"
      >
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-white">
            <Save className="w-4 h-4" />
            <span>Guardar como</span>
          </div>
          <button
            id="close-save-as-btn"
            type="button"
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmSave} className="p-3 bg-[#c0c0c0] flex flex-col gap-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Left Column: File Name & Type */}
            <div className="sm:col-span-2 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-black flex items-center gap-1">
                  <span>Nombre de <span className="underline">a</span>rchivo:</span>
                </label>
                <div className="flex items-center">
                  <input
                    id="save-as-filename-input"
                    type="text"
                    autoFocus
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="bg-white text-black px-2 py-1 win31-inset flex-1 font-mono text-xs font-bold uppercase"
                  />
                  <span className="font-mono font-bold bg-[#dfdfdf] px-2 py-1 win31-sunken-soft text-black">
                    .{format.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Directories & Files explorer mockup */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[11px] text-black">
                    <span className="underline">D</span>irectorios:
                  </span>
                  <div className="text-[10px] text-gray-700 font-mono">c:\windows\media</div>
                  <div className="bg-white win31-inset h-24 overflow-y-auto p-1 font-mono text-xs text-black">
                    {sampleDirs.map((dir) => (
                      <div
                        key={dir}
                        onClick={() => setSelectedDir(dir)}
                        className={`flex items-center gap-1 px-1 py-0.5 cursor-pointer ${
                          selectedDir === dir ? 'bg-[#000080] text-white' : 'hover:bg-[#000080]/10 text-black'
                        }`}
                      >
                        <Folder className="w-3 h-3 shrink-0" />
                        <span>[{dir}]</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[11px] text-black">Archivos existentes:</span>
                  <div className="text-[10px] text-gray-700 font-mono">*.{format}</div>
                  <div className="bg-white win31-inset h-24 overflow-y-auto p-1 font-mono text-xs text-black">
                    {sampleFiles.map((file) => (
                      <div
                        key={file}
                        onClick={() => setFilename(file.replace(/\.[^/.]+$/, ''))}
                        className="flex items-center gap-1 px-1 py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white"
                      >
                        <FileAudio className="w-3 h-3 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format selection */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="font-semibold text-[11px] text-black">
                  Guardar como <span className="underline">t</span>ipo:
                </label>
                <select
                  id="save-as-format-select"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'wav' | 'mp3')}
                  className="bg-white text-black px-2 py-1 win31-inset font-sans text-xs cursor-pointer font-medium"
                >
                  <option value="wav">Archivos de sonido de Windows (*.WAV)</option>
                  <option value="mp3">Audio Comprimido MP3 (*.MP3)</option>
                </select>
              </div>

              {/* Drives */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[11px] text-black">
                  <span className="underline">U</span>nidades:
                </label>
                <div className="flex items-center gap-1 bg-white win31-inset px-2 py-1">
                  <HardDrive className="w-3.5 h-3.5 text-gray-700" />
                  <select
                    value={selectedDrive}
                    onChange={(e) => setSelectedDrive(e.target.value)}
                    className="bg-transparent text-black text-xs font-mono outline-none w-full cursor-pointer"
                  >
                    <option value="c: [ms-dos_6]">c: [ms-dos_6] - Disco Local</option>
                    <option value="a: [3.5_floppy]">a: [3.5_floppy] - Disquete</option>
                    <option value="d: [cd-rom]">d: [cd-rom] - CD de Audio</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="flex flex-col gap-2 justify-start pt-4 sm:pt-0">
              <Win31Button
                id="save-as-accept-btn"
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="w-full justify-center font-bold"
              >
                {isSaving ? 'Guardando...' : 'Aceptar'}
              </Win31Button>

              <Win31Button
                id="save-as-cancel-btn"
                type="button"
                onClick={onClose}
                className="w-full justify-center"
              >
                Cancelar
              </Win31Button>

              <div className="h-[1px] bg-[#808080] my-1" />

              <div className="p-2 bg-[#dfdfdf] win31-sunken-soft text-[10px] text-gray-700 leading-tight">
                <p className="font-semibold text-black mb-1">Destino en el Sistema:</p>
                <p>
                  El archivo se guardará directamente en su computadora o dispositivo móvil, solicitando la ubicación en el explorador de archivos.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
