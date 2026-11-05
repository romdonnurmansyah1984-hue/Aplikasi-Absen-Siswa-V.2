import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineBadgeProps {
  lastBackupDate: string | null;
  onNavigateToBackup?: () => void;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ lastBackupDate, onNavigateToBackup }) => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-2">
      {/* Network Status Badge */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight transition ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
            : 'bg-amber-100 text-amber-900 border border-amber-300'
        }`}
        title={
          isOnline
            ? 'Terhubung ke jaringan internet'
            : 'Mode Tanpa Internet (Offline). Semua data tersimpan aman di IndexedDB perangkat ini.'
        }
      >
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-amber-700 animate-pulse" />
            <span>OFFLINE</span>
          </>
        )}
      </div>

      {/* Backup Reminder if no backup has ever been made */}
      {!lastBackupDate && onNavigateToBackup && (
        <button
          onClick={onNavigateToBackup}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
          title="Klik untuk membuat cadangan data pertama kali"
        >
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Cadangan Belum Dibuat</span>
        </button>
      )}
    </div>
  );
};
