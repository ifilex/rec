import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WaveformSelection } from '../types/audio';
import { ZoomIn, ZoomOut, Maximize2, Scissors, Copy, Trash2, ArrowLeftRight, Volume2 } from 'lucide-react';
import { Win31Button } from './win31/Win31Button';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  selection: WaveformSelection;
  onSelectionChange: (sel: WaveformSelection) => void;
  onSeek: (time: number) => void;
  onCut?: () => void;
  onCopy?: () => void;
  onTrim?: () => void;
  onNormalize?: () => void;
  onFadeIn?: () => void;
  onFadeOut?: () => void;
  trackName?: string;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
  audioBuffer,
  currentTime,
  duration,
  selection,
  onSelectionChange,
  onSeek,
  onCut,
  onCopy,
  onTrim,
  onNormalize,
  onFadeIn,
  onFadeOut,
  trackName = 'Pista 1',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartSec, setDragStartSec] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(640);

  // ResizeObserver to handle canvas resizing dynamically across phones and tablets
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCanvasWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render Waveform on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for super-crisp retina displays on phones/iPads
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvasWidth;
    const displayHeight = 96;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;
    const centerY = height / 2;

    // Background
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);

    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    if (!audioBuffer || audioBuffer.length === 0) {
      ctx.fillStyle = '#777777';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos de audio grabados', width / 2, centerY + 4);
      ctx.restore();
      return;
    }

    const dataL = audioBuffer.getChannelData(0);
    const stepSize = Math.max(1, Math.floor(dataL.length / width));

    // Draw Channel 1 (Left / Green phosphor wave)
    ctx.fillStyle = '#00ff88';
    for (let x = 0; x < width; x++) {
      const sampleIdx = Math.floor(x * stepSize);
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < stepSize; j += 4) {
        const val = dataL[sampleIdx + j] || 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }

      const yTop = centerY - max * (centerY * 0.9);
      const yBottom = centerY - min * (centerY * 0.9);
      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
    }

    // Draw Selection Region
    if (selection.endTime > selection.startTime && duration > 0) {
      const selStartX = (selection.startTime / duration) * width;
      const selEndX = (selection.endTime / duration) * width;

      ctx.fillStyle = 'rgba(0, 100, 255, 0.35)';
      ctx.fillRect(selStartX, 0, selEndX - selStartX, height);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selStartX, 0);
      ctx.lineTo(selStartX, height);
      ctx.moveTo(selEndX, 0);
      ctx.lineTo(selEndX, height);
      ctx.stroke();
    }

    // Draw Playhead Line
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead handle
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [audioBuffer, currentTime, duration, selection, zoom, canvasWidth]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas || duration <= 0) return 0;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = x / rect.width;
      return ratio * duration;
    },
    [duration]
  );

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const time = getTimeFromClientX(e.clientX);
    setIsSelecting(true);
    setDragStartSec(time);
    onSelectionChange({ startTime: time, endTime: time });
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    const time = getTimeFromClientX(e.clientX);
    const start = Math.min(dragStartSec, time);
    const end = Math.max(dragStartSec, time);
    onSelectionChange({ startTime: start, endTime: end });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  // Touch Handlers for Mobile & Tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const time = getTimeFromClientX(e.touches[0].clientX);
    setIsSelecting(true);
    setDragStartSec(time);
    onSelectionChange({ startTime: time, endTime: time });
    onSeek(time);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSelecting || e.touches.length === 0) return;
    const time = getTimeFromClientX(e.touches[0].clientX);
    const start = Math.min(dragStartSec, time);
    const end = Math.max(dragStartSec, time);
    onSelectionChange({ startTime: start, endTime: end });
  };

  const handleTouchEnd = () => {
    setIsSelecting(false);
  };

  const hasSelection = selection.endTime > selection.startTime + 0.05;

  return (
    <div className="win31-sunken-soft bg-[#dfdfdf] p-1.5 sm:p-2 flex flex-col gap-1.5 select-none my-1">
      {/* Editor Toolbar (Horizontally swipeable on phones) */}
      <div className="flex items-center justify-between gap-1 text-xs border-b border-[#808080] pb-1 font-sans">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-bold text-gray-800 flex items-center gap-1 text-[11px] sm:text-xs truncate max-w-[110px] sm:max-w-none">
            <Volume2 className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            {trackName}
          </span>
          <span className="text-[10px] text-gray-600 bg-white px-1.5 py-0.5 win31-sunken-soft font-mono shrink-0">
            {duration > 0 ? `${duration.toFixed(2)}s` : '0.00s'}
          </span>
        </div>

        {/* Action buttons (Scrollable toolbar) */}
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 touch-pan-x">
          {onCut && (
            <Win31Button size="sm" onClick={onCut} disabled={!hasSelection} title="Cortar selección (Ctrl+X)">
              <Scissors className="w-3 h-3 text-black" />
              <span className="hidden sm:inline">Cortar</span>
            </Win31Button>
          )}
          {onCopy && (
            <Win31Button size="sm" onClick={onCopy} disabled={!hasSelection} title="Copiar selección (Ctrl+C)">
              <Copy className="w-3 h-3 text-black" />
              <span className="hidden sm:inline">Copiar</span>
            </Win31Button>
          )}
          {onTrim && (
            <Win31Button size="sm" onClick={onTrim} disabled={!hasSelection} title="Recortar sólo la selección">
              <ArrowLeftRight className="w-3 h-3 text-blue-900" />
              <span>Recortar</span>
            </Win31Button>
          )}
          {onNormalize && (
            <Win31Button size="sm" onClick={onNormalize} title="Normalizar pico a 0 dBFS">
              <span>Norm</span>
            </Win31Button>
          )}
          {onFadeIn && (
            <Win31Button size="sm" onClick={onFadeIn} title="Fundido de entrada">
              <span>Fade In</span>
            </Win31Button>
          )}
          {onFadeOut && (
            <Win31Button size="sm" onClick={onFadeOut} title="Fundido de salida">
              <span>Fade Out</span>
            </Win31Button>
          )}
        </div>
      </div>

      {/* Time Ruler */}
      <div className="h-4 bg-[#c0c0c0] win31-sunken-soft flex items-center justify-between px-1 text-[9px] font-mono text-gray-700">
        <span>0.00s</span>
        <span>{(duration * 0.25).toFixed(2)}s</span>
        <span>{(duration * 0.5).toFixed(2)}s</span>
        <span>{(duration * 0.75).toFixed(2)}s</span>
        <span>{duration.toFixed(2)}s</span>
      </div>

      {/* Waveform Canvas */}
      <div
        ref={containerRef}
        className="win31-inset bg-black relative cursor-crosshair h-24 overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Selection Status */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-600 px-1 font-mono gap-1">
        <div>
          Posición: <span className="font-bold text-black">{currentTime.toFixed(3)} s</span>
        </div>
        {hasSelection ? (
          <div className="text-blue-900 font-semibold truncate">
            Sel: {selection.startTime.toFixed(2)}s - {selection.endTime.toFixed(2)}s (
            {(selection.endTime - selection.startTime).toFixed(2)}s)
          </div>
        ) : (
          <div className="text-[9px] text-gray-500">Toque o arrastre para seleccionar</div>
        )}
      </div>
    </div>
  );
};
