import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Calendar,
  Filter,
  FileText,
  User,
  Award,
  AlertTriangle,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolClass,
  SchoolIdentity,
  ActiveMenu,
} from '../../types';
import { formatDateIndonesian, formatDateShort, getTodayString } from '../../utils/dateUtils';
import { exportAttendanceRecapToExcel } from '../../utils/exportUtils';

interface ReportsViewProps {
  students: Student[];
  allAttendance: AttendanceRecord[];
  classes: SchoolClass[];
  identity: SchoolIdentity;
  initialClass?: string;
  onNavigate: (menu: ActiveMenu) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

type ReportType =
  | 'daily'
  | 'monthly'
  | 'semester'
  | 'school_summary'
  | 'attention_needed';

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  allAttendance,
  classes,
  identity,
  initialClass,
  onNavigate,
  onShowToast,
}) => {
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || '1');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedSemester, setSelectedSemester] = useState<'Semester 1' | 'Semester 2'>('Semester 1');

  const currentClassObj = classes.find((c) => c.id === selectedClass) || classes[0];

  // Active students
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'Aktif');
  }, [students]);

  // Target students for the report
  const reportStudents = useMemo(() => {
    if (reportType === 'school_summary') {
      return activeStudents;
    }
    return activeStudents.filter((s) => s.kelas === selectedClass);
  }, [activeStudents, reportType, selectedClass]);

  // Filter attendance records based on report type
  const reportAttendance = useMemo(() => {
    return allAttendance.filter((rec) => {
      if (reportType !== 'school_summary' && rec.kelas !== selectedClass) {
        return false;
      }

      if (reportType === 'daily') {
        return rec.tanggal === selectedDate;
      }

      const d = new Date(rec.tanggal + 'T00:00:00');
      if (isNaN(d.getTime())) return false;
      const m = d.getMonth() + 1;

      if (reportType === 'monthly') {
        return m === selectedMonth;
      }

      if (reportType === 'semester') {
        if (selectedSemester === 'Semester 1') {
          return m >= 7 && m <= 12;
        } else {
          return m >= 1 && m <= 6;
        }
      }

      return true;
    });
  }, [allAttendance, reportType, selectedClass, selectedDate, selectedMonth, selectedSemester]);

  // Unique session dates
  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    reportAttendance.forEach((r) => set.add(r.tanggal));
    return Array.from(set).sort();
  }, [reportAttendance]);

  // Compiled rows for students
  const reportRows = useMemo(() => {
    return reportStudents.map((st, idx) => {
      const stRecs = reportAttendance.filter((r) => r.studentId === st.id);

      let h = 0;
      let s = 0;
      let i = 0;
      let a = 0;
      let t = 0;

      stRecs.forEach((r) => {
        if (r.status === 'H') h++;
        else if (r.status === 'S') s++;
        else if (r.status === 'I') i++;
        else if (r.status === 'A') a++;
        else if (r.status === 'T') {
          t++;
          h++;
        }
      });

      const totalDays = sessionDates.length;
      const pct = totalDays > 0 ? Math.round((h / totalDays) * 100) : 0;

      // Status for daily report
      const dailyRec = reportAttendance.find((r) => r.studentId === st.id);
      const dailyStatus = dailyRec?.status || '-';
      const dailyCatatan = dailyRec?.catatan || '';

      return {
        no: idx + 1,
        id: st.id,
        nama: st.nama,
        nisn: st.nisn,
        nipd: st.nipd,
        jk: st.jk,
        kelas: `Kelas ${st.kelas}`,
        hadir: h,
        sakit: s,
        izin: i,
        alpa: a,
        terlambat: t,
        persentase: pct,
        dailyStatus,
        dailyCatatan,
        totalAbsen: s + i + a,
      };
    });
  }, [reportStudents, reportAttendance, sessionDates]);

  // Filter for students needing attention (sering tidak hadir)
  const attentionStudents = useMemo(() => {
    return reportRows
      .filter((r) => r.totalAbsen >= 2 || r.alpa >= 1)
      .sort((a, b) => b.totalAbsen - a.totalAbsen);
  }, [reportRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const rows = reportRows.map((r) => ({
      no: r.no,
      nama: r.nama,
      nisn: r.nisn,
      kelas: r.kelas,
      hadir: r.hadir,
      sakit: r.sakit,
      izin: r.izin,
      alpa: r.alpa,
      terlambat: r.terlambat,
      totalPertemuan: sessionDates.length,
      persentase: `${r.persentase}%`,
    }));

    exportAttendanceRecapToExcel(
      rows,
      `Laporan_Absensi_SDN_3_Godog_${reportType}_${selectedClass}.xlsx`
    );
    onShowToast('success', 'Ekspor Laporan', 'File laporan berhasil diunduh.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Configuration & Controls Card (Hidden during print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Dokumen Resmi
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Laporan & Cetak Absensi
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · Format Standar Laporan Sekolah Dasar Ukuran Kertas A4
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Jenis Laporan</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="daily">Daftar Hadir Harian Kelas</option>
              <option value="monthly">Rekap Kehadiran Bulanan Kelas</option>
              <option value="semester">Rekap Kehadiran Semester</option>
              <option value="school_summary">Laporan Seluruh Sekolah (Kelas 1-6)</option>
              <option value="attention_needed">Siswa Perlu Perhatian (Sering Alpa/Sakit)</option>
            </select>
          </div>

          {/* Class selection (if applicable) */}
          {reportType !== 'school_summary' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Pilih Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} (Wali: {c.namaWaliKelas})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional Date or Month */}
          {reportType === 'daily' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Pilih Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>
          ) : reportType === 'monthly' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value={7}>Juli (Semester 1)</option>
                <option value={8}>Agustus (Semester 1)</option>
                <option value={9}>September (Semester 1)</option>
                <option value={10}>Oktober (Semester 1)</option>
                <option value={11}>November (Semester 1)</option>
                <option value={12}>Desember (Semester 1)</option>
                <option value={1}>Januari (Semester 2)</option>
                <option value={2}>Februari (Semester 2)</option>
                <option value={3}>Maret (Semester 2)</option>
                <option value={4}>April (Semester 2)</option>
                <option value={5}>Mei (Semester 2)</option>
                <option value={6}>Juni (Semester 2)</option>
              </select>
            </div>
          ) : reportType === 'semester' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Pilih Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as any)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="Semester 1">Semester 1 (Ganjil)</option>
                <option value="Semester 2">Semester 2 (Genap)</option>
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {/* Formal Printable Document Canvas (Paper View) */}
      <div className="print-container bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-lg text-slate-900 max-w-4xl mx-auto">
        {/* KOP SURAT FORMAL */}
        <div className="border-b-4 border-double border-slate-900 pb-3 text-center">
          <div className="flex items-center justify-center gap-4 mb-1">
            <img
              src="/icon.svg"
              alt="Logo Sekolah"
              className="w-16 h-16 object-contain shrink-0"
            />
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-wider text-slate-700 uppercase">
                Pemerintah Kabupaten Garut · Dinas Pendidikan
              </p>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                {identity.namaSekolah}
              </h1>
              <p className="text-xs font-semibold text-slate-700">
                NPSN: {identity.npsn} · Status: {identity.statusSekolah}
              </p>
              <p className="text-[11px] text-slate-600">
                {identity.alamat}, {identity.desa}, {identity.kecamatan}, {identity.kabupaten}, {identity.provinsi} {identity.kodePos}
              </p>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="my-5 text-center">
          <h2 className="text-sm sm:text-base font-extrabold uppercase underline tracking-wide">
            {reportType === 'daily'
              ? `DAFTAR HADIR HARIAN SISWA`
              : reportType === 'monthly'
              ? `REKAPITULASI KEHADIRAN SISWA BULANAN`
              : reportType === 'semester'
              ? `REKAPITULASI KEHADIRAN SISWA ${selectedSemester.toUpperCase()}`
              : reportType === 'school_summary'
              ? `LAPORAN KEHADIRAN SISWA TINGKAT SEKOLAH`
              : `DAFTAR SISWA YANG MEMERLUKAN PERHATIAN KHUSUS`}
          </h2>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {reportType !== 'school_summary' && (
              <span>
                Kelas: <strong>{currentClassObj?.nama}</strong>
              </span>
            )}
            {reportType === 'daily' ? (
              <span>
                Hari/Tanggal: <strong>{formatDateIndonesian(selectedDate)}</strong>
              </span>
            ) : reportType === 'monthly' ? (
              <span>
                Bulan: <strong>Bulan {selectedMonth} (Tahun 2026)</strong>
              </span>
            ) : null}
            <span>
              Tahun Ajaran: <strong>{identity.tahunAjaran}</strong>
            </span>
          </div>
        </div>

        {/* Report Content Table */}
        <div className="my-4 overflow-x-auto">
          {reportType === 'daily' ? (
            /* DAILY TABLE */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border border-slate-900 text-slate-900 font-bold">
                  <th className="p-2 border border-slate-900 w-10 text-center">No</th>
                  <th className="p-2 border border-slate-900">Nama Siswa</th>
                  <th className="p-2 border border-slate-900 w-24">NISN</th>
                  <th className="p-2 border border-slate-900 w-12 text-center">JK</th>
                  <th className="p-2 border border-slate-900 w-20 text-center">Status</th>
                  <th className="p-2 border border-slate-900">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => (
                  <tr key={r.id} className="border border-slate-900">
                    <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                      {r.no}
                    </td>
                    <td className="p-1.5 border border-slate-900 font-semibold">{r.nama}</td>
                    <td className="p-1.5 border border-slate-900 tabular-nums">{r.nisn || '-'}</td>
                    <td className="p-1.5 border border-slate-900 text-center font-bold">{r.jk}</td>
                    <td className="p-1.5 border border-slate-900 text-center font-bold">
                      {r.dailyStatus}
                    </td>
                    <td className="p-1.5 border border-slate-900 text-slate-700">
                      {r.dailyCatatan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'attention_needed' ? (
            /* ATTENTION NEEDED TABLE */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border border-slate-900 font-bold">
                  <th className="p-2 border border-slate-900 w-10 text-center">No</th>
                  <th className="p-2 border border-slate-900">Nama Siswa</th>
                  <th className="p-2 border border-slate-900 w-20">Kelas</th>
                  <th className="p-2 border border-slate-900 text-center w-14">Sakit</th>
                  <th className="p-2 border border-slate-900 text-center w-14">Izin</th>
                  <th className="p-2 border border-slate-900 text-center w-14">Alpa</th>
                  <th className="p-2 border border-slate-900 text-center w-16">Total Absen</th>
                  <th className="p-2 border border-slate-900 text-center w-24">Tingkat Hadir</th>
                </tr>
              </thead>
              <tbody>
                {attentionStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 border border-slate-900">
                      Seluruh siswa memiliki tingkat kehadiran baik (tidak ada siswa yang sering alpa/sakit).
                    </td>
                  </tr>
                ) : (
                  attentionStudents.map((r, i) => (
                    <tr key={r.id} className="border border-slate-900">
                      <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                        {i + 1}
                      </td>
                      <td className="p-1.5 border border-slate-900 font-semibold">{r.nama}</td>
                      <td className="p-1.5 border border-slate-900">{r.kelas}</td>
                      <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.sakit}</td>
                      <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.izin}</td>
                      <td className="p-1.5 border border-slate-900 text-center tabular-nums font-bold text-red-600">
                        {r.alpa}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                        {r.totalAbsen}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                        {r.persentase}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* SUMMARY / RECAP TABLE */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border border-slate-900 font-bold">
                  <th className="p-2 border border-slate-900 w-10 text-center">No</th>
                  <th className="p-2 border border-slate-900">Nama Siswa</th>
                  {reportType === 'school_summary' && (
                    <th className="p-2 border border-slate-900 w-16">Kelas</th>
                  )}
                  <th className="p-2 border border-slate-900 w-12 text-center">JK</th>
                  <th className="p-2 border border-slate-900 text-center w-12">H</th>
                  <th className="p-2 border border-slate-900 text-center w-12">S</th>
                  <th className="p-2 border border-slate-900 text-center w-12">I</th>
                  <th className="p-2 border border-slate-900 text-center w-12">A</th>
                  {identity.terlambatEnabled && (
                    <th className="p-2 border border-slate-900 text-center w-12">T</th>
                  )}
                  <th className="p-2 border border-slate-900 text-center w-24">% Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => (
                  <tr key={r.id} className="border border-slate-900">
                    <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                      {r.no}
                    </td>
                    <td className="p-1.5 border border-slate-900 font-semibold">{r.nama}</td>
                    {reportType === 'school_summary' && (
                      <td className="p-1.5 border border-slate-900">{r.kelas}</td>
                    )}
                    <td className="p-1.5 border border-slate-900 text-center font-bold">{r.jk}</td>
                    <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.hadir}</td>
                    <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.sakit}</td>
                    <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.izin}</td>
                    <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.alpa}</td>
                    {identity.terlambatEnabled && (
                      <td className="p-1.5 border border-slate-900 text-center tabular-nums">{r.terlambat}</td>
                    )}
                    <td className="p-1.5 border border-slate-900 text-center font-bold tabular-nums">
                      {r.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend / Keterangan Status */}
        <div className="mt-4 text-[11px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
          <span><strong>Keterangan:</strong></span>
          <span><strong>H</strong> = Hadir</span>
          <span><strong>S</strong> = Sakit</span>
          <span><strong>I</strong> = Izin</span>
          <span><strong>A</strong> = Alpa</span>
          {identity.terlambatEnabled && <span><strong>T</strong> = Terlambat</span>}
        </div>

        {/* TANDA TANGAN FORMAL (Signature block) */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-slate-900 page-break-inside-avoid">
          {/* Kolom Kiri: Mengetahui Kepala Sekolah */}
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah {identity.namaSekolah}</p>
            <div className="h-20" />
            <p className="font-bold underline text-sm uppercase">{identity.namaKepalaSekolah}</p>
            <p className="text-[11px] text-slate-700">NIP. {identity.nipKepalaSekolah}</p>
          </div>

          {/* Kolom Kanan: Guru Kelas */}
          <div className="text-center">
            <p>
              Garut, {formatDateIndonesian(new Date()).split(',')[1]}
            </p>
            <p className="font-bold">
              {reportType === 'school_summary'
                ? 'Operator / Pengelola Data'
                : `Guru Wali ${currentClassObj?.nama}`}
            </p>
            <div className="h-20" />
            <p className="font-bold underline text-sm uppercase">
              {reportType === 'school_summary'
                ? 'Romdon Nurmansyah'
                : currentClassObj?.namaWaliKelas}
            </p>
            <p className="text-[11px] text-slate-700">
              {reportType === 'school_summary'
                ? 'NIP. 19840815 201101 1 002'
                : 'NIP/NUPTK Tenaga Pendidik'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
