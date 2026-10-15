import React, { useState } from 'react';
import { VSTPluginParams, VSTPreset } from '../types/audio';
import { factoryVstPresets } from '../utils/vstPresets';
import { Win31Button } from './win31/Win31Button';
import { Sliders, Activity, Disc, Zap, Volume2, Sparkles, Check, RefreshCw } from 'lucide-react';

interface VSTRackModalProps {
  params: VSTPluginParams;
  onChangeParams: (newParams: VSTPluginParams) => void;
  onClose: () => void;
}

export const VSTRackModal: React.FC<VSTRackModalProps> = ({
  params,
  onChangeParams,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'eq' | 'reverb' | 'delay' | 'bitcrusher' | 'dynamics' | 'distortion' | 'presets'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('win31_soundblaster');

  const handleApplyPreset = (preset: VSTPreset) => {
    setSelectedPresetId(preset.id);
    onChangeParams(JSON.parse(JSON.stringify(preset.params)));
  };

  const updateParam = <K extends keyof VSTPluginParams>(
    plugin: K,
    key: keyof VSTPluginParams[K],
    val: unknown
  ) => {
    const updated = {
      ...params,
      [plugin]: {
        ...params[plugin],
        [key]: val,
      },
    };
    onChangeParams(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-2xl text-black shadow-2xl flex flex-col max-h-[92vh]">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-yellow-300" />
            <span>Rack de Plugins DSP / VST - Windows 3.1 Studio</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#c0c0c0] p-1.5 border-b border-[#808080] text-xs font-sans overflow-x-auto whitespace-nowrap scrollbar-none touch-pan-x">
          {[
            { id: 'presets', label: '★ Presets VST', icon: Sparkles },
            { id: 'eq', label: 'EQ 5-Bandas', icon: Activity },
            { id: 'reverb', label: 'Reverb Sala', icon: Disc },
            { id: 'delay', label: 'Delay Estéreo', icon: RefreshCw },
            { id: 'bitcrusher', label: '8-Bit Win 3.1', icon: Zap },
            { id: 'dynamics', label: 'Compresor', icon: Volume2 },
            { id: 'distortion', label: 'Saturación', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'win31-sunken-soft bg-white text-blue-900 font-bold border-b-0'
                    : 'win31-raised-soft bg-[#c0c0c0] text-black hover:bg-[#d0d0d0]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-2.5 sm:p-3 bg-[#dfdfdf] flex-1 overflow-y-auto min-h-[260px] text-xs font-sans">
          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-2">
              <div className="text-gray-700 font-semibold mb-1 text-xs">
                Seleccione un preset de efectos DSP en tiempo real:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {factoryVstPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 win31-raised-soft cursor-pointer flex flex-col justify-between gap-1 transition-all ${
                        isSelected ? 'bg-[#cce4ff] border-blue-600 ring-2 ring-blue-700' : 'bg-[#c0c0c0] hover:bg-[#d4d4d4]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black text-xs">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-800" />}
                      </div>
                      <p className="text-[11px] text-gray-700 leading-tight">{preset.description}</p>
                      <span className="text-[9px] bg-white/70 px-1 py-0.5 self-start win31-sunken-soft font-mono">
                        {preset.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EQ5 Tab */}
          {activeTab === 'eq' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.eq5.enabled}
                    onChange={(e) => updateParam('eq5', 'enabled', e.target.checked)}
                    className="accent-blue-800 w-4 h-4"
                  />
                  <span>Activar Ecualizador Paramétrico de 5 Bandas</span>
                </label>
                <span className="text-[10px] text-gray-600 font-mono">Rango: -15 dB a +15 dB</span>
              </div>

              {/* Desktop vertical layout & Mobile horizontal sliders */}
              <div className="hidden sm:grid grid-cols-5 gap-2 bg-[#c0c0c0] p-3 win31-sunken-soft text-center">
                {[
                  { band: 'low', label: '80 Hz', sub: 'Graves' },
                  { band: 'lowMid', label: '400 Hz', sub: 'Medios-B' },
                  { band: 'mid', label: '1.5 kHz', sub: 'Medios' },
                  { band: 'highMid', label: '4.5 kHz', sub: 'Medios-A' },
                  { band: 'high', label: '10 kHz', sub: 'Agudos' },
                ].map((item) => {
                  const val = params.eq5[item.band as keyof typeof params.eq5] as number;
                  return (
                    <div key={item.band} className="flex flex-col items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-blue-900">
                        {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)} dB
                      </span>
                      <input
                        type="range"
                        min="-15"
                        max="15"
                        step="0.5"
                        value={val}
                        disabled={!params.eq5.enabled}
                        onChange={(e) => updateParam('eq5', item.band as any, parseFloat(e.target.value))}
                        className="h-28 -rotate-90 my-8 accent-blue-800 cursor-pointer"
                      />
                      <div className="font-bold text-[11px]">{item.label}</div>
                      <div className="text-[9px] text-gray-600">{item.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile clean horizontal EQ slider list */}
              <div className="flex sm:hidden flex-col gap-2 bg-[#c0c0c0] p-2 win31-sunken-soft">
                {[
                  { band: 'low', label: '80 Hz (Graves)' },
                  { band: 'lowMid', label: '400 Hz (Medios-B)' },
                  { band: 'mid', label: '1.5 kHz (Medios)' },
                  { band: 'highMid', label: '4.5 kHz (Medios-A)' },
                  { band: 'high', label: '10 kHz (Agudos)' },
                ].map((item) => {
                  const val = params.eq5[item.band as keyof typeof params.eq5] as number;
                  return (
                    <div key={item.band} className="flex flex-col gap-1 border-b border-[#a0a0a0] pb-1.5 last:border-b-0">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span>{item.label}</span>
                        <span className="font-mono font-bold text-blue-900 bg-white px-1 win31-inset text-[10px]">
                          {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)} dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-15"
                        max="15"
                        step="0.5"
                        value={val}
                        disabled={!params.eq5.enabled}
                        onChange={(e) => updateParam('eq5', item.band as any, parseFloat(e.target.value))}
                        className="w-full accent-blue-800 h-5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reverb Tab */}
          {activeTab === 'reverb' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.reverb.enabled}
                  onChange={(e) => updateParam('reverb', 'enabled', e.target.checked)}
                  className="accent-blue-800 w-4 h-4"
                />
                <span>Activar Reverb Espacial Convolutiva</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#c0c0c0] p-3 win31-sunken-soft">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Tamaño de la Sala (Room Size):</span>
                    <span className="font-mono">{Math.round(params.reverb.roomSize * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={params.reverb.roomSize}
                    disabled={!params.reverb.enabled}
                    onChange={(e) => updateParam('reverb', 'roomSize', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Amortiguación (Damping):</span>
                    <span className="font-mono">{Math.round(params.reverb.dampening * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={params.reverb.dampening}
                    disabled={!params.reverb.enabled}
                    onChange={(e) => updateParam('reverb', 'dampening', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Mezcla Efecto (Wet Mix):</span>
                    <span className="font-mono">{Math.round(params.reverb.wet * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={params.reverb.wet}
                    disabled={!params.reverb.enabled}
                    onChange={(e) => updateParam('reverb', 'wet', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Señal Directa (Dry Mix):</span>
                    <span className="font-mono">{Math.round(params.reverb.dry * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={params.reverb.dry}
                    disabled={!params.reverb.enabled}
                    onChange={(e) => updateParam('reverb', 'dry', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delay Tab */}
          {activeTab === 'delay' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.delay.enabled}
                  onChange={(e) => updateParam('delay', 'enabled', e.target.checked)}
                  className="accent-blue-800 w-4 h-4"
                />
                <span>Activar Delay Estéreo / Eco Ping-Pong</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#c0c0c0] p-3 win31-sunken-soft">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Tiempo de Retardo (Time):</span>
                    <span className="font-mono">{params.delay.time.toFixed(2)} s ({(params.delay.time * 1000).toFixed(0)} ms)</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.01"
                    value={params.delay.time}
                    disabled={!params.delay.enabled}
                    onChange={(e) => updateParam('delay', 'time', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Retroalimentación (Feedback):</span>
                    <span className="font-mono">{Math.round(params.delay.feedback * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.02"
                    value={params.delay.feedback}
                    disabled={!params.delay.enabled}
                    onChange={(e) => updateParam('delay', 'feedback', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Nivel de Mezcla (Wet):</span>
                    <span className="font-mono">{Math.round(params.delay.wet * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={params.delay.wet}
                    disabled={!params.delay.enabled}
                    onChange={(e) => updateParam('delay', 'wet', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={params.delay.pingPong}
                    disabled={!params.delay.enabled}
                    onChange={(e) => updateParam('delay', 'pingPong', e.target.checked)}
                    className="accent-blue-800 w-4 h-4"
                  />
                  <span className="font-semibold">Modo Rebote Ping-Pong Estéreo</span>
                </div>
              </div>
            </div>
          )}

          {/* Bitcrusher Tab */}
          {activeTab === 'bitcrusher' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.bitcrusher.enabled}
                  onChange={(e) => updateParam('bitcrusher', 'enabled', e.target.checked)}
                  className="accent-blue-800 w-4 h-4"
                />
                <span>Activar Emulador Lo-Fi 8-Bit Windows 3.1 / Sound Blaster</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#c0c0c0] p-3 win31-sunken-soft">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Profundidad de Bits (Bit Depth):</span>
                    <span className="font-mono font-bold text-blue-900">{params.bitcrusher.bits} Bits</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={params.bitcrusher.bits}
                    disabled={!params.bitcrusher.enabled}
                    onChange={(e) => updateParam('bitcrusher', 'bits', parseInt(e.target.value))}
                    className="accent-blue-800"
                  />
                  <span className="text-[10px] text-gray-600">8 bits = Estándar multimedia Windows 3.1 (1992)</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Reducción de Muestreo:</span>
                    <span className="font-mono">
                      {Math.round(44.1 * params.bitcrusher.normFreq * 10) / 10} kHz
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={params.bitcrusher.normFreq}
                    disabled={!params.bitcrusher.enabled}
                    onChange={(e) => updateParam('bitcrusher', 'normFreq', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                  <span className="text-[10px] text-gray-600">11.025 kHz / 22.050 kHz clásico</span>
                </div>
              </div>
            </div>
          )}

          {/* Compressor / Dynamics Tab */}
          {activeTab === 'dynamics' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.compressor.enabled}
                  onChange={(e) => updateParam('compressor', 'enabled', e.target.checked)}
                  className="accent-blue-800 w-4 h-4"
                />
                <span>Activar Compresor de Rango Dinámico de Estudio</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#c0c0c0] p-3 win31-sunken-soft">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Umbral (Threshold):</span>
                    <span className="font-mono">{params.compressor.threshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="0"
                    step="1"
                    value={params.compressor.threshold}
                    disabled={!params.compressor.enabled}
                    onChange={(e) => updateParam('compressor', 'threshold', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Ratio de Compresión:</span>
                    <span className="font-mono">{params.compressor.ratio.toFixed(1)}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={params.compressor.ratio}
                    disabled={!params.compressor.enabled}
                    onChange={(e) => updateParam('compressor', 'ratio', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Ataque (Attack):</span>
                    <span className="font-mono">{Math.round(params.compressor.attack * 1000)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.2"
                    step="0.005"
                    value={params.compressor.attack}
                    disabled={!params.compressor.enabled}
                    onChange={(e) => updateParam('compressor', 'attack', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Liberación (Release):</span>
                    <span className="font-mono">{Math.round(params.compressor.release * 1000)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={params.compressor.release}
                    disabled={!params.compressor.enabled}
                    onChange={(e) => updateParam('compressor', 'release', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Distortion / Saturation Tab */}
          {activeTab === 'distortion' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.distortion.enabled}
                  onChange={(e) => updateParam('distortion', 'enabled', e.target.checked)}
                  className="accent-blue-800 w-4 h-4"
                />
                <span>Activar Saturación Valvular & Distorsión Vintage</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#c0c0c0] p-3 win31-sunken-soft">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Ganancia de Distorsión (Drive):</span>
                    <span className="font-mono">{params.distortion.drive}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={params.distortion.drive}
                    disabled={!params.distortion.enabled}
                    onChange={(e) => updateParam('distortion', 'drive', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Tipo de Saturación:</span>
                    <span className="font-mono font-bold capitalize">{params.distortion.type}</span>
                  </div>
                  <select
                    value={params.distortion.type}
                    disabled={!params.distortion.enabled}
                    onChange={(e) => updateParam('distortion', 'type', e.target.value)}
                    className="bg-white text-black px-2 py-1 win31-inset text-xs"
                  >
                    <option value="tube">Válvula Analógica (Tube)</option>
                    <option value="soft">Soft Clipping (Suave)</option>
                    <option value="hard">Hard Clipping (Duro)</option>
                    <option value="fuzz">Fuzz 90s</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <div className="flex justify-between">
                    <span>Mezcla (Dry / Wet Mix):</span>
                    <span className="font-mono">{Math.round(params.distortion.mix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={params.distortion.mix}
                    disabled={!params.distortion.enabled}
                    onChange={(e) => updateParam('distortion', 'mix', parseFloat(e.target.value))}
                    className="accent-blue-800"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 bg-[#c0c0c0] border-t border-[#808080] flex items-center justify-between">
          <span className="text-[10px] text-gray-700 font-mono">
            Procesamiento Web Audio DSP a 32-bit Float
          </span>
          <Win31Button onClick={onClose} size="md">
            <span>Aceptar y Cerrar</span>
          </Win31Button>
        </div>
      </div>
    </div>
  );
};
