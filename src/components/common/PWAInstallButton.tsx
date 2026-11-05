import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (isInstallable) {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition"
        title="Pasang aplikasi ke layar utama HP / Komputer"
      >
        {justInstalled ? (
          <>
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Terpasang</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Pasang Aplikasi (PWA)</span>
          </>
        )}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-700/80 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium border border-blue-500/40 shadow-sm transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pasang di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Pasang di iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 text-xs leading-relaxed text-slate-600 space-y-2">
                <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah peramban Safari.</p>
                <p>2. Gulir ke bawah lalu ketuk <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                <p>3. Ketuk <strong>Tambah</strong> di pojok kanan atas. Aplikasi siap dipakai offline!</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
