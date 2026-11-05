import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Camera,
  CreditCard,
  FileSpreadsheet,
  Grid,
} from 'lucide-react';
import { ActiveMenu } from '../../types';

interface MobileNavProps {
  activeMenu: ActiveMenu;
  onNavigate: (menu: ActiveMenu) => void;
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeMenu,
  onNavigate,
  onOpenMore,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 lg:hidden shadow-lg no-print">
      <div className="grid grid-cols-6 items-center h-15 max-w-lg mx-auto px-1">
        {/* 1. Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition ${
            activeMenu === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9.5px] mt-0.5 leading-none">Beranda</span>
        </button>

        {/* 2. Absensi Harian */}
        <button
          onClick={() => onNavigate('absensi')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition ${
            activeMenu === 'absensi' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[9.5px] mt-0.5 leading-none">Absensi</span>
        </button>

        {/* 3. Scan Barcode Kamera (Prominent) */}
        <button
          onClick={() => onNavigate('scan-kamera')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition relative ${
            activeMenu === 'scan-kamera' ? 'text-emerald-600 font-bold' : 'text-emerald-700'
          }`}
        >
          <div className="relative p-1 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </div>
          <span className="text-[9.5px] mt-0.5 leading-none font-bold text-emerald-800">Scan</span>
        </button>

        {/* 4. Kartu Siswa Barcode */}
        <button
          onClick={() => onNavigate('kartu-siswa')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition ${
            activeMenu === 'kartu-siswa' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[9.5px] mt-0.5 leading-none">Kartu</span>
        </button>

        {/* 5. Rekap Absensi */}
        <button
          onClick={() => onNavigate('rekap')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition ${
            activeMenu === 'rekap' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[9.5px] mt-0.5 leading-none">Rekap</span>
        </button>

        {/* 6. Menu Lainnya (Drawer) */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-500 hover:text-slate-800 transition"
        >
          <Grid className="w-5 h-5" />
          <span className="text-[9.5px] mt-0.5 leading-none">Lainnya</span>
        </button>
      </div>
    </nav>
  );
};
