import React, { useEffect, useRef } from 'react';
import { PlaybackState } from '../types/audio';
import { audioEngine } from '../utils/audioEngine';

interface OscilloscopeDisplayProps {
  playbackState: PlaybackState;
  currentBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  colorScheme?: 'green' | 'amber' | 'cyan' | 'white';
  inputLevel?: number;
}

export const OscilloscopeDisplay: React.FC<OscilloscopeDisplayProps> = ({
  playbackState,
  currentBuffer,
  currentTime,
  duration,
  colorScheme = 'green',
  inputLevel = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const colors = {
    green: {
      line: '#00ff44',
      glow: 'rgba(0, 255, 68, 0.5)',
      grid: '#003311',
      bg: '#000000',
      peak: '#ffff00',
      clip: '#ff2222',
    },
    amber: {
      line: '#ffaa00',
      glow: 'rgba(255, 170, 0, 0.5)',
      grid: '#332200',
      bg: '#0a0600',
      peak: '#ffff33',
      clip: '#ff2222',
    },
    cyan: {
      line: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.5)',
      grid: '#002633',
      bg: '#000810',
      peak: '#ffff00',
      clip: '#ff0055',
    },
    white: {
      line: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.4)',
      grid: '#222222',
      bg: '#050505',
      peak: '#ffff00',
      clip: '#ff3333',
    },
  }[colorScheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width || 480);
      const displayHeight = Math.floor(rect.height || 120);

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = displayWidth;
      const height = displayHeight;
      const centerY = height / 2;

      // Clear with dark background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw Oscilloscope Grid Lines (1992 Windows 3.1 style)
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Horizontal center & quarter lines
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.moveTo(0, centerY - height * 0.25);
      ctx.lineTo(width, centerY - height * 0.25);
      ctx.moveTo(0, centerY + height * 0.25);
      ctx.lineTo(width, centerY + height * 0.25);

      // Vertical divisions
      const cols = 8;
      for (let i = 1; i < cols; i++) {
        const x = (width / cols) * i;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Render Waveform based on state
      if (playbackState === 'playing' || playbackState === 'recording') {
        const analyser = playbackState === 'recording' 
          ? audioEngine.getInputAnalyser() 
          : audioEngine.getMasterAnalyser();
        const timeData = audioEngine.getWaveformData(analyser);

        ctx.strokeStyle = colors.line;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0; // 0 to 2
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      } else if (currentBuffer && currentBuffer.length > 0) {
        // Static view of the waveform near current position
        const channelData = currentBuffer.getChannelData(0);
        const sampleRate = currentBuffer.sampleRate;
        const currentSample = Math.floor(currentTime * sampleRate);
        const windowSize = Math.floor(sampleRate * 0.08); // 80ms window around cursor
        const startSample = Math.max(0, currentSample - Math.floor(windowSize / 2));
        const endSample = Math.min(channelData.length, startSample + windowSize);

        ctx.strokeStyle = colors.line;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const count = endSample - startSample;
        if (count > 0) {
          const sliceWidth = width / count;
          let x = 0;
          for (let i = startSample; i < endSample; i++) {
            const v = channelData[i]; // -1 to 1
            const y = centerY - v * (height * 0.45);
            if (i === startSample) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
        } else {
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Flat center line
        ctx.strokeStyle = colors.line;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 2;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Real-time VU Peak Meter bar on the right
      const meterWidth = 8;
      const meterX = width - meterWidth - 4;
      const meterHeight = height - 8;
      const meterY = 4;

      // VU background
      ctx.fillStyle = '#111111';
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

      let peakVal = 0;
      if (playbackState === 'recording') {
        peakVal = inputLevel;
      } else if (playbackState === 'playing') {
        const analyser = audioEngine.getMasterAnalyser();
        const timeData = audioEngine.getWaveformData(analyser);
        let max = 0;
        for (let i = 0; i < timeData.length; i += 8) {
          const val = Math.abs(timeData[i] - 128) / 128;
          if (val > max) max = val;
        }
        peakVal = max;
      }

      const activeHeight = Math.min(meterHeight, meterHeight * peakVal * 1.3);
      if (activeHeight > 0) {
        const grad = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
        grad.addColorStop(0, colors.line);
        grad.addColorStop(0.7, '#ffff00');
        grad.addColorStop(0.95, '#ff2222');
        ctx.fillStyle = grad;
        ctx.fillRect(meterX + 1, meterY + meterHeight - activeHeight, meterWidth - 2, activeHeight);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playbackState, currentBuffer, currentTime, duration, colorScheme, inputLevel, colors]);

  return (
    <div
      ref={containerRef}
      className="win31-inset bg-black p-0.5 relative select-none flex-1 flex flex-col justify-center items-center h-28 sm:h-36 min-h-[100px] overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block bg-black"
      />
      {/* CRT Scanline Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none crt-scanlines opacity-40" />
    </div>
  );
};
