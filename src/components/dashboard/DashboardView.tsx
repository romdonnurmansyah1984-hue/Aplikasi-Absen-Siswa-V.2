import React from 'react';
import {
  Users,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Sparkles,
  Printer,
  Database,
  Camera,
  CreditCard,
} from 'lucide-react';
import {
  SchoolIdentity,
  Student,
  AttendanceRecord,
  ActiveMenu,
  SchoolClass,
} from '../../types';
import { formatDateIndonesian, getTodayString } from '../../utils/dateUtils';

interface DashboardViewProps {
  identity: SchoolIdentity;
  students: Student[];
  todayAttendance: AttendanceRecord[];
  allAttendance: AttendanceRecord[];
  classes: SchoolClass[];
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  identity,
  students,
  todayAttendance,
  allAttendance,
  classes,
  onNavigate,
}) => {
  const todayStr = getTodayString();
  const activeStudents = students.filter((s) => s.status === 'Aktif');
  const totalActiveStudents = activeStudents.length;

  // Today's attendance counts
  let hadirCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;
  let terlambatCount = 0;

  todayAttendance.forEach((rec) => {
    if (rec.status === 'H') hadirCount++;
    else if (rec.status === 'S') sakitCount++;
    else if (rec.status === 'I') izinCount++;
    else if (rec.status === 'A') alpaCount++;
    else if (rec.status === 'T') {
      terlambatCount++;
      hadirCount++; // Terlambat is categorized as attended with note
    }
  });

  const totalDiabsen = todayAttendance.filter((r) => r.status !== null).length;
  const belumDiabsenCount = Math.max(0, totalActiveStudents - totalDiabsen);

  // Daily attendance percentage based on recorded attendance or total
  const persentaseKehadiran =
    totalDiabsen > 0 ? Math.round((hadirCount / totalDiabsen) * 100) : 0;

  // Breakdown per class for today
  const classBreakdowns = classes.map((cls) => {
    const classStudents = activeStudents.filter((s) => s.kelas === cls.id);
    const classTodayAtt = todayAttendance.filter((a) => a.kelas === cls.id);

    const cTotal = classStudents.length;
    const cHadir = classTodayAtt.filter((a) => a.status === 'H' || a.status === 'T').length;
    const cSakit = classTodayAtt.filter((a) => a.status === 'S').length;
    const cIzin = classTodayAtt.filter((a) => a.status === 'I').length;
    const cAlpa = classTodayAtt.filter((a) => a.status === 'A').length;
    const cTerlambat = classTodayAtt.filter((a) => a.status === 'T').length;
    const cDiabsen = classTodayAtt.filter((a) => a.status !== null).length;
    const cBelum = Math.max(0, cTotal - cDiabsen);
    const cPct = cDiabsen > 0 ? Math.round((cHadir / cDiabsen) * 100) : 0;

    return {
      classInfo: cls,
      total: cTotal,
      hadir: cHadir,
      sakit: cSakit,
      izin: cIzin,
      alpa: cAlpa,
      terlambat: cTerlambat,
      belumDiabsen: cBelum,
      persentase: cPct,
      sudahSelesai: cTotal > 0 && cBelum === 0,
    };
  });

  // Calculate 7-day attendance trend
  const last7Days: Array<{ date: string; label: string; pct: number; count: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    // skip Sunday
    if (d.getDay() !== 0) {
      const dStr = d.toISOString().split('T')[0];
      const dayRecs = allAttendance.filter((a) => a.tanggal === dStr);
      const dayHadir = dayRecs.filter((a) => a.status === 'H' || a.status === 'T').length;
      const dayTotal = dayRecs.length;
      const pct = dayTotal > 0 ? Math.round((dayHadir / dayTotal) * 100) : 0;
      const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

      last7Days.push({
        date: dStr,
        label: `${dayName} ${d.getDate()}`,
        pct,
        count: dayHadir,
      });
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative education watermark background */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <img src="/icon.svg" alt="" className="w-64 h-64 object-contain filter invert" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-200 border border-white/10 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Tahun Ajaran {identity.tahunAjaran} · {identity.semesterAktif}</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            {identity.namaSekolah}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            Sistem Absensi Siswa Harian Terintegrasi Offline. Cepat, akurat, dan dapat digunakan tanpa internet langsung dari HP maupun komputer.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('scan-kamera')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition"
            >
              <Camera className="w-4 h-4 text-emerald-100" />
              <span>Scan Kamera Barcode</span>
            </button>
            <button
              onClick={() => onNavigate('kartu-siswa')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
            >
              <CreditCard className="w-4 h-4 text-blue-100" />
              <span>Cetak Kartu Siswa</span>
            </button>
            <button
              onClick={() => onNavigate('absensi')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-md transition border border-white/15"
            >
              <span>Absensi Harian</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('rekap')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-md transition border border-white/15"
            >
              <span>Rekapitulasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Siswa */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Siswa</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {totalActiveStudents}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Siswa aktif terdaftar</p>
          </div>
        </div>

        {/* 2. Hadir Hari Ini */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Hadir (H)</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
              {hadirCount}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              {totalDiabsen > 0 ? `${persentaseKehadiran}% dari terabsen` : 'Belum diabsen'}
            </p>
          </div>
        </div>

        {/* 3. Sakit */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Sakit (S)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums">
              {sakitCount}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Dengan keterangan</p>
          </div>
        </div>

        {/* 4. Izin */}
        <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-700 text-xs font-semibold">
            <span>Izin (I)</span>
            <HelpCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-sky-700 tabular-nums">
              {izinCount}
            </p>
            <p className="text-[11px] text-sky-600 mt-0.5 font-medium">Surat/pemberitahuan</p>
          </div>
        </div>

        {/* 5. Alpa */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>Alpa (A)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 tabular-nums">
              {alpaCount}
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5 font-medium">Tanpa keterangan</p>
          </div>
        </div>

        {/* 6. Belum Diabsen */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Belum Absen</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                belumDiabsenCount > 0 ? 'text-slate-800' : 'text-emerald-600'
              }`}
            >
              {belumDiabsenCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {belumDiabsenCount === 0 ? 'Semua kelas selesai' : 'Menunggu pengisian'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Callout Cards: Scan Kamera & Cetak Kartu Siswa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Scan Kamera Barcode */}
        <div
          onClick={() => onNavigate('scan-kamera')}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
              <Camera className="w-3 h-3 text-emerald-200" />
              <span>Fitur Baru</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold leading-snug">
              Pemindai Absensi Kamera
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed max-w-sm">
              Scan barcode & QR code kartu siswa seketika menggunakan kamera HP atau webcam laptop.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition shadow-inner">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Card 2: Kartu Absen Siswa */}
        <div
          onClick={() => onNavigate('kartu-siswa')}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-extrabold uppercase tracking-wider text-blue-100">
              <CreditCard className="w-3 h-3 text-blue-200" />
              <span>Cetak Kartu</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold leading-snug">
              Kartu Absen & Barcode Siswa
            </h3>
            <p className="text-xs text-blue-100/90 leading-relaxed max-w-sm">
              Cetak kartu absensi resmi SDN 3 Godog lengkap dengan QR Code & Barcode unik setiap siswa.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition shadow-inner">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Grid: Status Kelas Hari Ini & Tren Kehadiran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Per Kelas (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ringkasan Kehadiran Setiap Kelas
              </h2>
              <p className="text-xs text-slate-500">
                Status absensi hari ini ({formatDateIndonesian(todayStr)})
              </p>
            </div>
            <button
              onClick={() => onNavigate('absensi')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Isi Absensi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {classBreakdowns.map((item) => (
              <div
                key={item.classInfo.id}
                onClick={() => onNavigate('absensi', item.classInfo.id)}
                className={`p-4 rounded-xl border transition cursor-pointer hover:shadow-md ${
                  item.sudahSelesai
                    ? 'border-emerald-200 bg-emerald-50/15 hover:border-emerald-300'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {item.classInfo.nama}
                    </span>
                    <span className="text-[11px] text-slate-500">({item.total} siswa)</span>
                  </div>
                  {item.sudahSelesai ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Selesai
                    </span>
                  ) : item.belumDiabsen < item.total ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Draf ({item.belumDiabsen} sisa)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Belum
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 truncate">
                  Wali Kelas: <span className="font-medium text-slate-700">{item.classInfo.namaWaliKelas}</span>
                </p>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Tingkat Hadir</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      {item.persentase}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(item.hadir / (item.total || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${(item.sakit / (item.total || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-sky-400 h-full transition-all duration-300"
                      style={{ width: `${(item.izin / (item.total || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${(item.alpa / (item.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Small stats badges */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="text-emerald-700 font-semibold">H: {item.hadir}</span>
                  <span className="text-amber-700 font-semibold">S: {item.sakit}</span>
                  <span className="text-sky-700 font-semibold">I: {item.izin}</span>
                  <span className="text-rose-700 font-semibold">A: {item.alpa}</span>
                  {identity.terlambatEnabled && (
                    <span className="text-purple-700 font-semibold">T: {item.terlambat}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trend & Quick Info (1 Col) */}
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tren Kehadiran Harian</h3>
                <p className="text-[11px] text-slate-500">Persentase kehadiran beberapa hari terakhir</p>
              </div>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>

            <div className="space-y-3 pt-2">
              {last7Days.map((day, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{day.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {day.pct > 0 ? `${day.pct}%` : '-'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        day.pct >= 90
                          ? 'bg-emerald-500'
                          : day.pct >= 75
                          ? 'bg-blue-500'
                          : day.pct > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-200'
                      }`}
                      style={{ width: `${day.pct || 4}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guide & School Summary Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Petunjuk Guru & Operator</span>
            </div>
            <ul className="space-y-2 list-disc list-inside text-slate-600 leading-relaxed">
              <li>Pilih menu <strong>Absensi Harian</strong> lalu sentuh tombol status siswa (H, S, I, A).</li>
              <li>Gunakan tombol <strong>Tandai Semua Hadir</strong> untuk mempercepat absensi.</li>
              <li>Data otomatis tersimpan sebagai draf dan tersimpan permanen saat menekan <strong>Simpan Absensi</strong>.</li>
              <li>Lakukan pencadangan berkala di menu <strong>Ekspor & Cadangan</strong> untuk mengamankan data.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
