'use client';

import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FloorPlanModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h2 className="text-white font-semibold">Floor Plan</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/60 text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <Download className="w-4 h-4" />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <img
          src={url}
          alt="Floor Plan"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
