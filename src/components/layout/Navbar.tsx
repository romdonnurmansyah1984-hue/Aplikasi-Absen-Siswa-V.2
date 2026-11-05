import React from 'react';
import {
  Menu,
  Shield,
  User,
  LogOut,
  Lock,
  Calendar,
  Camera,
  CreditCard,
} from 'lucide-react';
import { SchoolIdentity, UserAccount, ActiveMenu } from '../../types';
import { formatDateIndonesian, getTodayString } from '../../utils/dateUtils';
import { OfflineBadge } from '../common/OfflineBadge';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface NavbarProps {
  identity: SchoolIdentity;
  currentUser: UserAccount;
  lastBackupDate: string | null;
  onOpenMobileMenu: () => void;
  onNavigate: (menu: ActiveMenu) => void;
  onLogout: () => void;
  onLockApp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  identity,
  currentUser,
  lastBackupDate,
  onOpenMobileMenu,
  onNavigate,
  onLogout,
  onLockApp,
}) => {
  const todayStr = getTodayString();
  const formattedToday = formatDateIndonesian(todayStr);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 transition no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + School Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden active:scale-95 transition"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 p-0.5 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="Logo SDN 3 Godog"
                className="w-full h-full object-contain rounded-[10px]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-extrabold text-blue-900 tracking-tight whitespace-nowrap">
                  SDN 3 GODOG
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-600/90 bg-blue-50 px-1.5 py-0.2 rounded">
                  NPSN {identity.npsn}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden xs:block">
                Absensi Siswa Digital
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Date & Academic Year Info */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-800">{formattedToday}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              TA {identity.tahunAjaran} ({identity.semesterAktif})
            </span>
          </div>
        </div>

        {/* Right: Quick actions, Offline badge, PWA Install, User Profile & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Scan Barcode Button */}
          <button
            onClick={() => onNavigate('scan-kamera')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
            title="Buka Scan Kamera Barcode Siswa"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>

          {/* Quick Kartu Siswa Button */}
          <button
            onClick={() => onNavigate('kartu-siswa')}
            className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition"
            title="Cetak Kartu Absen Siswa"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Kartu Siswa</span>
          </button>

          <OfflineBadge
            lastBackupDate={lastBackupDate}
            onNavigateToBackup={() => onNavigate('ekspor-impor')}
          />

          <PWAInstallButton />

          {/* User profile dropdown / pill */}
          <div className="flex items-center gap-2 bg-slate-100/80 pl-2 pr-1.5 py-1 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                  currentUser.role === 'admin' ? 'bg-amber-600' : 'bg-blue-600'
                }`}
              >
                {currentUser.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                  {currentUser.nama.split(' ')[0]}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {currentUser.role === 'admin'
                    ? 'Operator'
                    : `Guru Kls ${currentUser.kelasAkses || ''}`}
                </p>
              </div>
            </div>

            <div className="flex items-center border-l border-slate-200 pl-1.5 ml-0.5 gap-1">
              <button
                onClick={onLockApp}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
                title="Kunci Aplikasi Sementara"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLogout}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                title="Keluar (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
