import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Printer,
  Users,
  UserCheck,
  GraduationCap,
  Database,
  Settings,
  X,
  MapPin,
  Camera,
  CreditCard,
} from 'lucide-react';
import { ActiveMenu, UserAccount, SchoolIdentity } from '../../types';

interface SidebarProps {
  activeMenu: ActiveMenu;
  onNavigate: (menu: ActiveMenu) => void;
  currentUser: UserAccount;
  identity: SchoolIdentity;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ActiveMenu;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onNavigate,
  currentUser,
  identity,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'absensi',
      label: 'Absensi Harian',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      id: 'scan-kamera',
      label: 'Scan Kamera Barcode',
      icon: <Camera className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'kartu-siswa',
      label: 'Kartu Absen Siswa',
      icon: <CreditCard className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'rekap',
      label: 'Rekap Absensi',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'laporan',
      label: 'Laporan & Cetak',
      icon: <Printer className="w-4 h-4" />,
    },
    {
      id: 'siswa',
      label: 'Data Siswa',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'guru',
      label: 'Data Guru',
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: 'kelas',
      label: 'Data Kelas',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'ekspor-impor',
      label: 'Ekspor & Cadangan',
      icon: <Database className="w-4 h-4" />,
      adminOnly: true,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleSelect = (menuId: ActiveMenu) => {
    onNavigate(menuId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Mobile Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="SDN 3 Godog" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-sm font-bold text-blue-900 leading-tight">SDN 3 GODOG</h2>
            <p className="text-[10px] text-slate-500">Menu Navigasi</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>

        {navItems.map((item) => {
          // If teacher, they still can access most menus, but ekspor-impor is admin-only or restricted
          if (item.adminOnly && currentUser.role !== 'admin') {
            return null;
          }

          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50/70'
              }`}
            >
              <span
                className={`${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-blue-600 transition'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.id === 'absensi' && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Harian
                </span>
              )}
              {item.id === 'scan-kamera' && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Kamera
                </span>
              )}
              {item.id === 'kartu-siswa' && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Barcode
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* School Location Footprint */}
      <div className="p-3.5 m-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-700 truncate">{identity.alamat}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {identity.desa}, {identity.kecamatan}
            </p>
            <p className="text-[10px] text-slate-400">{identity.kabupaten}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-[calc(100vh-57px)] sticky top-[57px] no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
