import React, { useState, useEffect } from 'react';
import { SoundRecorderProject } from '../types/audio';
import { CloudStorageManager } from '../utils/cloudStorage';
import { Win31Button } from './win31/Win31Button';
import { Cloud, Check, Trash2, FolderOpen, RefreshCw, Share2, HardDrive, Clock, Radio, UploadCloud } from 'lucide-react';

interface CloudVaultModalProps {
  onLoadProject: (project: SoundRecorderProject) => Promise<void>;
  onClose: () => void;
  currentProjectName: string;
  autoCloud: boolean;
  onToggleAutoCloud: () => void;
}

export const CloudVaultModal: React.FC<CloudVaultModalProps> = ({
  onLoadProject,
  onClose,
  currentProjectName,
  autoCloud,
  onToggleAutoCloud,
}) => {
  const [projects, setProjects] = useState<SoundRecorderProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const list = await CloudStorageManager.listProjects();
      setProjects(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSyncRemote = async (proj: SoundRecorderProject) => {
    setSyncingId(proj.id);
    try {
      await CloudStorageManager.syncToRemoteCloud(proj);
      await fetchProjects();
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Desea eliminar permanentemente este proyecto guardado?')) {
      await CloudStorageManager.deleteProject(id);
      fetchProjects();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://win31sound.vault.live/p/${selectedId || 'project'}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/40 backdrop-blur-xs select-none">
      <div className="win31-window-border bg-[#c0c0c0] w-full max-w-2xl text-black shadow-2xl flex flex-col max-h-[90vh]">
        {/* Title bar */}
        <div className="win31-titlebar-active px-2 py-1 flex items-center justify-between font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-white" />
            <span>Bóveda de Proyectos en la Nube y Almacenamiento Local</span>
          </div>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black win31-raised-soft flex items-center justify-center text-xs font-bold active:win31-sunken-soft cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-[#dfdfdf] flex-1 overflow-y-auto flex flex-col gap-3 text-xs font-sans">
          {/* Cloud Auto-Sync Banner */}
          <div className="bg-[#c0c0c0] p-2.5 win31-raised-soft flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="font-bold text-black text-xs">Sincronización Automática en la Nube</div>
                <div className="text-[10px] text-gray-700">
                  Guarda automáticamente los cambios en almacenamiento local persistente e instantáneas remotas.
                </div>
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 win31-inset">
              <input
                type="checkbox"
                checked={autoCloud}
                onChange={onToggleAutoCloud}
                className="accent-blue-800"
              />
              <span className="font-bold text-[11px]">Guardado Automático</span>
            </label>
          </div>

          {/* Project list header */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-900" />
              Proyectos Guardados ({projects.length})
            </span>
            <button
              onClick={fetchProjects}
              className="text-[11px] text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar lista
            </button>
          </div>

          {/* Project List */}
          <div className="win31-inset bg-white p-1 min-h-[160px] max-h-60 overflow-y-auto flex flex-col gap-1">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Cargando proyectos...</div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay proyectos guardados en la bóveda todavía. Pulse "Guardar" en el menú Archivo para guardar el proyecto actual.
              </div>
            ) : (
              projects.map((proj) => {
                const isSelected = selectedId === proj.id;
                const dateStr = new Date(proj.updatedAt).toLocaleString();

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedId(proj.id)}
                    className={`p-2 flex items-center justify-between gap-2 border-b border-gray-200 cursor-pointer ${
                      isSelected ? 'bg-[#000080] text-white' : 'hover:bg-blue-50 text-black'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className={`w-4 h-4 shrink-0 ${isSelected ? 'text-yellow-300' : 'text-blue-700'}`} />
                      <div className="truncate">
                        <div className="font-bold truncate">{proj.name}</div>
                        <div className={`text-[10px] flex items-center gap-2 ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                          <span>{proj.tracks.length} pista(s)</span>
                          <span>•</span>
                          <span>{proj.duration.toFixed(1)}s de audio</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSyncRemote(proj)}
                        className={`p-1 win31-button cursor-pointer ${isSelected ? 'text-black' : ''}`}
                        title="Forzar subida a la nube"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${syncingId === proj.id ? 'animate-bounce text-blue-600' : 'text-blue-800'}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="p-1 win31-button cursor-pointer text-red-700"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Share Section */}
          <div className="bg-[#c0c0c0] p-2 win31-sunken-soft flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Share2 className="w-4 h-4 text-blue-900 shrink-0" />
              <span>Enlace público para compartir sesión:</span>
            </div>
            <Win31Button size="sm" onClick={handleCopyLink} disabled={!selectedId}>
              {copiedLink ? (
                <span className="flex items-center gap-1 text-emerald-900 font-bold">
                  <Check className="w-3 h-3" />
                  ¡Enlace copiado!
                </span>
              ) : (
                <span>Copiar Enlace Nube</span>
              )}
            </Win31Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 bg-[#c0c0c0] border-t border-[#808080] flex items-center justify-between">
          <Win31Button onClick={onClose} size="md">
            <span>Cerrar</span>
          </Win31Button>

          <Win31Button
            size="lg"
            disabled={!selectedId}
            onClick={async () => {
              if (selectedId) {
                const proj = projects.find((p) => p.id === selectedId);
                if (proj) {
                  await onLoadProject(proj);
                  onClose();
                }
              }
            }}
            className="bg-[#000080] text-white hover:bg-[#1084d0] font-bold"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Cargar Proyecto Seleccionado</span>
          </Win31Button>
        </div>
      </div>
    </div>
  );
};
