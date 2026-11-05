import React, { useState } from 'react';
import {
  Lock,
  User,
  Shield,
  KeyRound,
  ArrowRight,
  School,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UserAccount, SchoolIdentity } from '../../types';
import { getUserByUsername, getUsers } from '../../db/indexedDB';

interface LoginViewProps {
  identity: SchoolIdentity;
  onLoginSuccess: (user: UserAccount) => void;
  isLockedMode?: boolean;
  lockedUser?: UserAccount | null;
  onUnlockSuccess?: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  identity,
  onLoginSuccess,
  isLockedMode = false,
  lockedUser = null,
  onUnlockSuccess,
  onShowToast,
}) => {
  const [username, setUsername] = useState<string>(lockedUser ? lockedUser.username : '');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      onShowToast('warning', 'Form Belum Lengkap', 'Masukkan username dan kata sandi.');
      return;
    }

    setLoading(true);
    try {
      const user = await getUserByUsername(username.trim());

      if (!user) {
        onShowToast('error', 'Akun Tidak Ditemukan', 'Username tidak terdaftar di sistem.');
        setLoading(false);
        return;
      }

      if (user.passwordHash !== password) {
        onShowToast('error', 'Kata Sandi Salah', 'Periksa kembali kata sandi yang Anda ketikkan.');
        setLoading(false);
        return;
      }

      if (isLockedMode && onUnlockSuccess) {
        onUnlockSuccess();
        onShowToast('success', 'Aplikasi Terbuka', `Selamat datang kembali, ${user.nama}.`);
      } else {
        onLoginSuccess(user);
        onShowToast('success', 'Login Berhasil', `Selamat bertugas, ${user.nama}.`);
      }
    } catch (err) {
      console.error('Login error:', err);
      onShowToast('error', 'Gagal Masuk', 'Terjadi kesalahan pada sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname: string, pwd: string) => {
    setUsername(uname);
    setPassword(pwd);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />

        {/* Brand Header */}
        <div className="text-center pt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 p-1 shadow-md mx-auto flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="Logo SDN 3 Godog"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <h1 className="mt-3 text-xl font-extrabold text-blue-900 tracking-tight">
            {identity.namaSekolah}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            APLIKASI ABSENSI SISWA DIGITAL
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold mt-2">
            <span>Tahun Ajaran {identity.tahunAjaran}</span>
            <span>·</span>
            <span>{identity.semesterAktif}</span>
          </div>
        </div>

        {isLockedMode ? (
          <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center">
            <Lock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
            <p className="font-bold">Aplikasi Sedang Terkunci</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Masukkan kata sandi untuk akun <strong>{lockedUser?.nama}</strong>.
            </p>
          </div>
        ) : null}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLockedMode && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nama Pengguna / Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="operator / guru1 / guru2 ..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden transition"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Kata Sandi / Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLockedMode ? 'Buka Kunci Aplikasi' : 'Masuk ke Aplikasi'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Switcher (Helps easy evaluation) */}
        {!isLockedMode && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider mb-2.5">
              Pilihan Akun Cepat (Klik Untuk Mengisi):
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Operator */}
              <button
                type="button"
                onClick={() => handleQuickLogin('operator', 'admin123')}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-semibold text-left transition"
              >
                <div className="font-extrabold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-600" />
                  <span>Operator</span>
                </div>
                <div className="text-[10px] text-amber-700">operator / admin123</div>
              </button>

              {/* Guru Kelas 1 */}
              <button
                type="button"
                onClick={() => handleQuickLogin('guru1', 'guru123')}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-semibold text-left transition"
              >
                <div className="font-extrabold flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span>Guru Kelas 1</span>
                </div>
                <div className="text-[10px] text-blue-700">guru1 / guru123</div>
              </button>

              {/* Guru Kelas 4 */}
              <button
                type="button"
                onClick={() => handleQuickLogin('guru4', 'guru123')}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-semibold text-left transition"
              >
                <div className="font-extrabold flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span>Guru Kelas 4</span>
                </div>
                <div className="text-[10px] text-blue-700">guru4 / guru123</div>
              </button>

              {/* Guru Kelas 6 */}
              <button
                type="button"
                onClick={() => handleQuickLogin('guru6', 'guru123')}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-semibold text-left transition"
              >
                <div className="font-extrabold flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span>Guru Kelas 6</span>
                </div>
                <div className="text-[10px] text-blue-700">guru6 / guru123</div>
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-[11px] text-slate-400">
          Aplikasi PWA Offline · Data tersimpan lokal di perangkat
        </div>
      </div>
    </div>
  );
};
