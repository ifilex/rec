import React, { useState } from 'react';
import { Minus, Square, X, Music } from 'lucide-react';

interface Win31WindowProps {
  title: string;
  isActive?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  width?: string;
  height?: string;
}

export const Win31Window: React.FC<Win31WindowProps> = ({
  title,
  isActive = true,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized = false,
  children,
  icon,
  className = '',
  width = 'w-full max-w-4xl',
  height = 'h-auto',
}) => {
  const [showSystemMenu, setShowSystemMenu] = useState(false);

  return (
    <div
      className={`win31-window-border bg-[#c0c0c0] text-black flex flex-col ${isMaximized ? 'w-full h-full' : width} ${height} ${className} relative shadow-2xl`}
    >
      {/* Title bar */}
      <div
        className={`h-7 px-1 py-0.5 flex items-center justify-between select-none ${
          isActive ? 'win31-titlebar-active' : 'win31-titlebar-inactive'
        } font-bold text-xs sm:text-sm tracking-wide`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Windows 3.1 System Menu Box (Hyphen icon box) */}
          <button
            onClick={() => setShowSystemMenu(!showSystemMenu)}
            onDoubleClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center cursor-pointer active:win31-sunken-soft shrink-0"
            title="Menú del sistema (Doble clic para cerrar)"
          >
            <div className="w-2.5 h-0.5 bg-black" />
          </button>

          {icon || <Music className="w-3.5 h-3.5 text-white shrink-0 drop-shadow" />}
          <span className="truncate font-sans font-semibold drop-shadow">{title}</span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 shrink-0">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center cursor-pointer active:win31-sunken-soft"
              title="Minimizar"
            >
              <div className="w-0 h-0 border-x-[3px] border-x-transparent border-t-[5px] border-t-black" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center cursor-pointer active:win31-sunken-soft"
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
            >
              <div className="w-0 h-0 border-x-[3px] border-x-transparent border-b-[5px] border-b-black" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center cursor-pointer active:win31-sunken-soft ml-0.5"
              title="Cerrar"
            >
              <X className="w-2.5 h-2.5 text-black stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      {/* System Popup Menu */}
      {showSystemMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSystemMenu(false)}
          />
          <div className="absolute top-6 left-1 z-50 bg-[#c0c0c0] win31-outset p-0.5 min-w-[140px] text-xs font-sans shadow-lg">
            <button
              onClick={() => {
                setShowSystemMenu(false);
                if (onMaximize) onMaximize();
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between"
            >
              <span>Restaurar</span>
            </button>
            <button
              onClick={() => {
                setShowSystemMenu(false);
                if (onMinimize) onMinimize();
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between"
            >
              <span>Minimizar</span>
            </button>
            <button
              onClick={() => {
                setShowSystemMenu(false);
                if (onMaximize) onMaximize();
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between"
            >
              <span>Maximizar</span>
            </button>
            <div className="h-[1px] bg-[#808080] my-0.5" />
            <button
              onClick={() => {
                setShowSystemMenu(false);
                if (onClose) onClose();
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white font-bold flex items-center justify-between"
            >
              <span>Cerrar</span>
              <span className="text-[10px] text-gray-600 group-hover:text-gray-200">Alt+F4</span>
            </button>
          </div>
        </>
      )}

      {/* Window Body */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#c0c0c0] p-1.5 sm:p-2">
        {children}
      </div>
    </div>
  );
};
