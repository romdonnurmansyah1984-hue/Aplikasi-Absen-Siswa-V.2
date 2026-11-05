import React, { useState } from 'react';
import {
  Settings,
  Building,
  KeyRound,
  Smartphone,
  Save,
  Lock,
  RotateCcw,
  Shield,
  Download,
  Info,
  Check,
} from 'lucide-react';
import { SchoolIdentity, UserAccount, ActiveMenu } from '../../types';
import { saveSchoolIdentity, saveUser } from '../../db/indexedDB';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ConfirmModal } from '../common/ConfirmModal';

interface SettingsViewProps {
  identity: SchoolIdentity;
  currentUser: UserAccount;
  onNavigate: (menu: ActiveMenu) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  identity,
  currentUser,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  // Identity form state
  const [identFormData, setIdentFormData] = useState<SchoolIdentity>({ ...identity });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isSavingIdent, setIsSavingIdent] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Save Identity
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIdent(true);
    try {
      await saveSchoolIdentity(identFormData);
      await onRefreshData();
      onShowToast('success', 'Identitas Sekolah Disimpan', 'Data sekolah dan tahun ajaran berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan pengaturan sekolah.');
    } finally {
      setIsSavingIdent(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPassword !== currentUser.passwordHash) {
      onShowToast('error', 'Kata Sandi Lama Salah', 'Kata sandi saat ini yang Anda masukkan tidak sesuai.');
      return;
    }

    if (newPassword.length < 4) {
      onShowToast('warning', 'Kata Sandi Terlalu Pendek', 'Gunakan minimal 4 karakter kata sandi.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      onShowToast('warning', 'Konfirmasi Tidak Cocok', 'Kata sandi baru dan konfirmasi kata sandi tidak sama.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await saveUser({
        ...currentUser,
        passwordHash: newPassword,
      });
      await onRefreshData();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onShowToast('success', 'Kata Sandi Berhasil Diubah', 'Kata sandi akun Anda telah diperbarui.');
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Mengubah Kata Sandi', 'Terjadi kesalahan.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Konfigurasi Sistem
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Pengaturan Aplikasi & Akun
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          SDN 3 GODOG · Identitas Lembaga, Tahun Ajaran, Keamanan Akun & PWA
        </p>
      </div>

      {/* Grid: School Identity (Operator only) & User Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Identitas Sekolah & Tahun Ajaran */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Identitas Sekolah & Kalender
            </h2>
          </div>

          <form onSubmit={handleSaveIdentity} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama Sekolah</label>
              <input
                type="text"
                required
                value={identFormData.namaSekolah}
                onChange={(e) =>
                  setIdentFormData({ ...identFormData, namaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">NPSN</label>
                <input
                  type="text"
                  required
                  value={identFormData.npsn}
                  onChange={(e) =>
                    setIdentFormData({ ...identFormData, npsn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Status Sekolah</label>
                <input
                  type="text"
                  value={identFormData.statusSekolah}
                  onChange={(e) =>
                    setIdentFormData({ ...identFormData, statusSekolah: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tahun Ajaran Aktif</label>
                <input
                  type="text"
                  required
                  value={identFormData.tahunAjaran}
                  onChange={(e) =>
                    setIdentFormData({ ...identFormData, tahunAjaran: e.target.value })
                  }
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Semester Aktif</label>
                <select
                  value={identFormData.semesterAktif}
                  onChange={(e) =>
                    setIdentFormData({
                      ...identFormData,
                      semesterAktif: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Semester 1">Semester 1 (Ganjil)</option>
                  <option value="Semester 2">Semester 2 (Genap)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama Kepala Sekolah</label>
              <input
                type="text"
                required
                value={identFormData.namaKepalaSekolah}
                onChange={(e) =>
                  setIdentFormData({ ...identFormData, namaKepalaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={identFormData.nipKepalaSekolah}
                onChange={(e) =>
                  setIdentFormData({ ...identFormData, nipKepalaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={identFormData.alamat}
                onChange={(e) =>
                  setIdentFormData({ ...identFormData, alamat: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={identFormData.terlambatEnabled}
                  onChange={(e) =>
                    setIdentFormData({
                      ...identFormData,
                      terlambatEnabled: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-800">
                  Aktifkan Status Terlambat (T) di Absensi Harian
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingIdent}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: Pengaturan Akun & Kata Sandi */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Ganti Kata Sandi Akun
              </h2>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengguna:</span>
                <strong className="text-slate-900">{currentUser.username}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Lengkap:</span>
                <strong className="text-slate-900">{currentUser.nama}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peran Akun:</span>
                <strong className="capitalize text-blue-600">{currentUser.role}</strong>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Kata Sandi Saat Ini *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ulangi Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Konfirmasi kata sandi baru"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Perbarui Sandi</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Petunjuk PWA & Offline */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Pemasangan PWA & Penggunaan Offline
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aplikasi ini adalah Progressive Web App (PWA). Anda dapat memasangnya langsung di HP Android tanpa perlu membuka Play Store, dan tetap dapat mengisi absensi meski tanpa sinyal internet.
            </p>

            <div className="pt-2">
              <PWAInstallButton />
            </div>

            <div className="mt-3 text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-3">
              <p>• <strong>Android:</strong> Buka di Google Chrome, ketuk Pasang Aplikasi / Tambahkan ke Layar Utama.</p>
              <p>• <strong>Laptop/Windows:</strong> Buka di Chrome/Edge, klik ikon pasang di pojok kanan bilah alamat.</p>
              <p>• <strong>iPhone (iOS):</strong> Buka di Safari, ketuk tombol Bagikan (Share) lalu Tambahkan ke Layar Utama.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
