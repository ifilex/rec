import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, FolderOpen, Save, Download, Undo, Copy, Scissors, 
  Volume2, VolumeX, FastForward, Rewind, Sparkles, Cloud, 
  Layers, Sliders, HelpCircle, Check, Music, Radio
} from 'lucide-react';

export interface MenuActionHandlers {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onRevert: () => void;
  
  onUndo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onInsertFile: () => void;
  onMixFile: () => void;
  onInsertSilence: () => void;
  onDeleteBefore: () => void;
  onDeleteAfter: () => void;
  onTrim: () => void;

  onVolUp: () => void;
  onVolDown: () => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onAddEcho: () => void;
  onReverse: () => void;
  onNormalize: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onBitcrushRetro: () => void;

  onAddTrack: () => void;
  onToggleMultiTrack: () => void;
  onMixdownTracks: () => void;

  onOpenVstRack: () => void;
  onToggleVstBypass: () => void;

  onOpenCloudVault: () => void;
  onSyncCloudNow: () => void;
  onToggleAutoCloud: () => void;

  onOpenSoundSchemes: () => void;
  onOpenProperties: () => void;
  onOpenAbout: () => void;
  onChangeTheme: (theme: 'classic' | 'win95' | 'cyberpunk' | 'amber') => void;
}

interface Win31MenuProps {
  handlers: MenuActionHandlers;
  canUndo: boolean;
  canEdit: boolean;
  isMultiTrack: boolean;
  vstBypass: boolean;
  autoCloud: boolean;
  currentTheme: string;
}

export const Win31Menu: React.FC<Win31MenuProps> = ({
  handlers,
  canUndo,
  canEdit,
  isMultiTrack,
  vstBypass,
  autoCloud,
  currentTheme,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on click/tap outside
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, []);

  const handleMenuClick = (e: React.MouseEvent, menuName: string) => {
    e.stopPropagation();
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleMouseEnter = (menuName: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuName);
    }
  };

  const executeAction = (action: () => void) => {
    setOpenMenu(null);
    action();
  };

  return (
    <div ref={menuRef} className="bg-[#c0c0c0] border-b border-[#808080] mb-1.5 select-none relative z-40">
      <div className="flex flex-wrap items-center text-xs font-sans py-0.5 px-0.5 gap-y-0.5">
        {/* Archivo */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'archivo')}
            onMouseEnter={() => handleMouseEnter('archivo')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'archivo' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            <span className="underline">A</span>rchivo
          </button>
          {openMenu === 'archivo' && (
            <div className="absolute top-full left-0 bg-[#c0c0c0] win31-outset p-0.5 min-w-[210px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onNew);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Nuevo</span>
                <span className="text-[10px] opacity-75">Ctrl+N</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpen);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Abrir...</span>
                <span className="text-[10px] opacity-75">Ctrl+O</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onSave);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Guardar</span>
                <span className="text-[10px] opacity-75">Ctrl+S</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onSaveAs);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Guardar como...</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onExport);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between font-bold cursor-pointer"
              >
                <span>Exportar Audio (MP3/WAV)...</span>
                <span className="text-[10px] opacity-75">Ctrl+E</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onRevert);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Revertir cambios</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(() => window.location.reload());
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Reiniciar sesión</span>
                <span className="text-[10px] opacity-75">F5</span>
              </button>
            </div>
          )}
        </div>

        {/* Edición */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'edicion')}
            onMouseEnter={() => handleMouseEnter('edicion')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'edicion' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            <span className="underline">E</span>dición
          </button>
          {openMenu === 'edicion' && (
            <div className="absolute top-full left-0 bg-[#c0c0c0] win31-outset p-0.5 min-w-[240px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                disabled={!canUndo}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onUndo);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canUndo ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Deshacer</span>
                <span className="text-[10px] opacity-75">Ctrl+Z</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onCopy);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canEdit ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Copiar selección</span>
                <span className="text-[10px] opacity-75">Ctrl+C</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onCut);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canEdit ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Cortar selección</span>
                <span className="text-[10px] opacity-75">Ctrl+X</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onPaste);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Pegar al final</span>
                <span className="text-[10px] opacity-75">Ctrl+V</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onInsertFile);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Insertar archivo...</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onMixFile);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Mezclar con archivo...</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onInsertSilence);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Insertar silencio (1.0s)...</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onDeleteBefore);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canEdit ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Eliminar antes de la posición</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onDeleteAfter);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canEdit ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Eliminar después de la posición</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onTrim);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between font-semibold ${
                  canEdit ? 'hover:bg-[#000080] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Recortar selección</span>
              </button>
            </div>
          )}
        </div>

        {/* Efectos (Classic Win 3.1) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'efectos')}
            onMouseEnter={() => handleMouseEnter('efectos')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'efectos' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            Efec<span className="underline">t</span>os
          </button>
          {openMenu === 'efectos' && (
            <div className="absolute top-full left-0 sm:left-auto bg-[#c0c0c0] win31-outset p-0.5 min-w-[240px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onVolUp);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Aumentar volumen (en un 25%)</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onVolDown);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Disminuir volumen</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onSpeedUp);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Aumentar velocidad (al 100%)</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onSpeedDown);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Disminuir velocidad</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onAddEcho);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Añadir eco</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onReverse);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Invertir (Reproducir al revés)</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onNormalize);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Normalizar audio (0 dBFS)</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onFadeIn);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Fundido de entrada (Fade In)</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onFadeOut);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Fundido de salida (Fade Out)</span>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onBitcrushRetro);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between font-semibold cursor-pointer"
              >
                <span>Simulación 8-Bit Windows 3.1</span>
              </button>
            </div>
          )}
        </div>

        {/* Multipista */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'multipista')}
            onMouseEnter={() => handleMouseEnter('multipista')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'multipista' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            <span className="underline">M</span>ultipista
          </button>
          {openMenu === 'multipista' && (
            <div className="absolute top-full left-0 sm:left-auto bg-[#c0c0c0] win31-outset p-0.5 min-w-[230px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onToggleMultiTrack);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Vista Multipista DAW</span>
                {isMultiTrack && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onAddTrack);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Añadir nueva pista</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onMixdownTracks);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Mezclar todas las pistas (Mixdown)</span>
              </button>
            </div>
          )}
        </div>

        {/* Plugins VST */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'vst')}
            onMouseEnter={() => handleMouseEnter('vst')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'vst' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            Plugins <span className="underline">V</span>ST
          </button>
          {openMenu === 'vst' && (
            <div className="absolute top-full left-0 sm:left-auto bg-[#c0c0c0] win31-outset p-0.5 min-w-[240px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpenVstRack);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between font-bold cursor-pointer"
              >
                <span>Abrir Rack de Efectos VST...</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onToggleVstBypass);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Bypass Maestro de Efectos</span>
                {vstBypass && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
            </div>
          )}
        </div>

        {/* Nube */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'nube')}
            onMouseEnter={() => handleMouseEnter('nube')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'nube' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            <span className="underline">N</span>ube
          </button>
          {openMenu === 'nube' && (
            <div className="absolute top-full left-0 sm:left-auto right-0 sm:right-auto bg-[#c0c0c0] win31-outset p-0.5 min-w-[230px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpenCloudVault);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between font-bold cursor-pointer"
              >
                <span>Bóveda de Proyectos en la Nube...</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onSyncCloudNow);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Sincronizar ahora con la nube</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onToggleAutoCloud);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Guardado automático continuo</span>
                {autoCloud && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'opciones')}
            onMouseEnter={() => handleMouseEnter('opciones')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'opciones' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            <span className="underline">O</span>pciones
          </button>
          {openMenu === 'opciones' && (
            <div className="absolute top-full right-0 bg-[#c0c0c0] win31-outset p-0.5 min-w-[240px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpenSoundSchemes);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Esquemas de sonido Windows 3.1...</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpenProperties);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Propiedades de audio y latencia...</span>
              </button>
              <div className="h-[1px] bg-[#808080] my-0.5" />
              <div className="px-3 py-0.5 font-bold text-[10px] text-gray-600 uppercase">Tema Visual</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(() => handlers.onChangeTheme('classic'));
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Windows 3.1 Clásico (Azul & Teal)</span>
                {currentTheme === 'classic' && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(() => handlers.onChangeTheme('win95'));
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Windows 95 Gris Clásico</span>
                {currentTheme === 'win95' && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(() => handlers.onChangeTheme('amber'));
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Monitor CRT Ámbar Fósforo</span>
                {currentTheme === 'amber' && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(() => handlers.onChangeTheme('cyberpunk'));
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Cyberpunk 3.1 Neón</span>
                {currentTheme === 'cyberpunk' && <Check className="w-3 h-3 text-black group-hover:text-white" />}
              </button>
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => handleMenuClick(e, 'ayuda')}
            onMouseEnter={() => handleMouseEnter('ayuda')}
            className={`px-2.5 sm:px-2.5 py-1 sm:py-0.5 cursor-pointer hover:bg-[#000080] hover:text-white ${
              openMenu === 'ayuda' ? 'bg-[#000080] text-white' : 'text-black'
            }`}
          >
            A<span className="underline">y</span>uda
          </button>
          {openMenu === 'ayuda' && (
            <div className="absolute top-full right-0 bg-[#c0c0c0] win31-outset p-0.5 min-w-[210px] max-w-[92vw] text-xs shadow-2xl z-50 text-black">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(handlers.onOpenAbout);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer font-semibold"
              >
                <span>Acerca de Grabadora de sonido...</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
