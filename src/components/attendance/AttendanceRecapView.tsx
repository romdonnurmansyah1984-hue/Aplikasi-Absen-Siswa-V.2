import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolClass,
  SchoolIdentity,
  ActiveMenu,
  UserAccount,
  AttendanceStatus,
} from '../../types';
import { exportAttendanceRecapToExcel } from '../../utils/exportUtils';
import { formatDateIndonesian } from '../../utils/dateUtils';
import { saveAttendanceBatch } from '../../db/indexedDB';
import { StudentAttendanceDetailModal } from './StudentAttendanceDetailModal';

interface AttendanceRecapViewProps {
  students: Student[];
  allAttendance: AttendanceRecord[];
  classes: SchoolClass[];
  identity: SchoolIdentity;
  currentUser?: UserAccount | null;
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData?: () => Promise<void>;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'semester1' | 'semester2' | 'year';
type StatusFilterType = 'all' | 'H' | 'S' | 'I' | 'A' | 'T';
type SortField = 'nama' | 'hadir' | 'sakit' | 'izin' | 'alpa' | 'terlambat' | 'persentase';
type SortOrder = 'asc' | 'desc';

export const AttendanceRecapView: React.FC<AttendanceRecapViewProps> = ({
  students,
  allAttendance,
  classes,
  identity,
  currentUser,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [customDate, setCustomDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Status Filter: Allows filtering by Hadir, Sakit, Izin, Alpa, Lambat
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('nama');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Student Attendance Detail Modal State
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [detailModalInitialFilter, setDetailModalInitialFilter] = useState<StatusFilterType>('all');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Active students
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'Aktif');
  }, [students]);

  // Filter attendance records by selected period
  const filteredRecords = useMemo(() => {
    return allAttendance.filter((rec) => {
      // Class filter
      if (selectedClass !== 'all' && rec.kelas !== selectedClass) {
        return false;
      }

      const recDate = new Date(rec.tanggal + 'T00:00:00');
      if (isNaN(recDate.getTime())) return false;

      const recMonth = recDate.getMonth() + 1; // 1-12

      if (periodType === 'daily') {
        return rec.tanggal === customDate;
      }

      if (periodType === 'weekly') {
        // Last 7 days from custom date
        const target = new Date(customDate + 'T00:00:00');
        const diffTime = target.getTime() - recDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }

      if (periodType === 'monthly') {
        return recMonth === selectedMonth;
      }

      if (periodType === 'semester1') {
        // Semester 1: Juli - Desember (Month 7 to 12)
        return recMonth >= 7 && recMonth <= 12;
      }

      if (periodType === 'semester2') {
        // Semester 2: Januari - Juni (Month 1 to 6)
        return recMonth >= 1 && recMonth <= 6;
      }

      if (periodType === 'year') {
        return true;
      }

      return true;
    });
  }, [allAttendance, selectedClass, periodType, selectedMonth, customDate]);

  // Unique recorded school days in this period
  const recordedDates = useMemo(() => {
    const dates = new Set<string>();
    filteredRecords.forEach((r) => dates.add(r.tanggal));
    return Array.from(dates).sort();
  }, [filteredRecords]);

  // Period Label description for titles & modal
  const periodLabel = useMemo(() => {
    if (periodType === 'daily') return formatDateIndonesian(customDate);
    if (periodType === 'weekly') return `7 Hari s.d. ${formatDateIndonesian(customDate)}`;
    if (periodType === 'monthly') {
      const monthNames = [
        '',
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
      ];
      const year = selectedMonth >= 7 ? '2026' : '2027';
      return `Bulan ${monthNames[selectedMonth]} ${year}`;
    }
    if (periodType === 'semester1') return 'Semester 1 (Ganjil 2026)';
    if (periodType === 'semester2') return 'Semester 2 (Genap 2027)';
    return `Tahun Ajaran ${identity.tahunAjaran}`;
  }, [periodType, customDate, selectedMonth, identity.tahunAjaran]);

  // Student summary table rows
  const recapRows = useMemo(() => {
    const targetStudents = activeStudents.filter((st) => {
      if (selectedClass !== 'all' && st.kelas !== selectedClass) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          st.nama.toLowerCase().includes(q) ||
          st.nisn.includes(q) ||
          st.nipd.includes(q)
        );
      }
      return true;
    });

    const rows = targetStudents.map((st, index) => {
      // Find all records for this student in the filtered period
      const stRecords = filteredRecords.filter((r) => r.studentId === st.id);

      let h = 0;
      let s = 0;
      let i = 0;
      let a = 0;
      let t = 0;

      stRecords.forEach((r) => {
        if (r.status === 'H') h++;
        else if (r.status === 'S') s++;
        else if (r.status === 'I') i++;
        else if (r.status === 'A') a++;
        else if (r.status === 'T') {
          t++;
          h++; // Terlambat counts as present
        }
      });

      // Daily specific single status if periodType === 'daily'
      const dailyRecord = periodType === 'daily' ? stRecords[0] : undefined;
      const dailyStatus: AttendanceStatus = dailyRecord ? dailyRecord.status : null;

      // Total session days recorded for this student's class
      const classDates = new Set(
        filteredRecords.filter((r) => r.kelas === st.kelas).map((r) => r.tanggal)
      );
      const totalSessions = classDates.size;

      // Percentage formula: (H / Total session days) * 100%
      const percentage =
        totalSessions > 0 ? Math.round((h / totalSessions) * 100) : 0;

      return {
        no: index + 1,
        id: st.id,
        student: st,
        nama: st.nama,
        nisn: st.nisn,
        nipd: st.nipd,
        kelas: `Kelas ${st.kelas}`,
        rawKelas: st.kelas,
        jk: st.jk,
        hadir: h,
        sakit: s,
        izin: i,
        alpa: a,
        terlambat: t,
        dailyStatus,
        dailyRecord,
        totalPertemuan: totalSessions,
        persentaseNum: percentage,
        persentase: `${percentage}%`,
      };
    });

    // Apply Status Filter
    let filtered = rows;
    if (statusFilter === 'H') {
      filtered = rows.filter((r) => r.hadir > 0);
    } else if (statusFilter === 'S') {
      filtered = rows.filter((r) => r.sakit > 0);
    } else if (statusFilter === 'I') {
      filtered = rows.filter((r) => r.izin > 0);
    } else if (statusFilter === 'A') {
      filtered = rows.filter((r) => r.alpa > 0);
    } else if (statusFilter === 'T') {
      filtered = rows.filter((r) => r.terlambat > 0);
    }

    // Apply Sorting
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'persentase') {
        valA = a.persentaseNum;
        valB = b.persentaseNum;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [activeStudents, selectedClass, searchQuery, filteredRecords, periodType, statusFilter, sortField, sortOrder]);

  // Grand totals across all raw students in selected class/period
  const totals = useMemo(() => {
    let sumH = 0;
    let sumS = 0;
    let sumI = 0;
    let sumA = 0;
    let sumT = 0;

    // Calculate based on all target students (unfiltered by statusFilter)
    const targetStudents = activeStudents.filter((st) => {
      if (selectedClass !== 'all' && st.kelas !== selectedClass) return false;
      return true;
    });

    targetStudents.forEach((st) => {
      const stRecords = filteredRecords.filter((r) => r.studentId === st.id);
      stRecords.forEach((r) => {
        if (r.status === 'H') sumH++;
        else if (r.status === 'S') sumS++;
        else if (r.status === 'I') sumI++;
        else if (r.status === 'A') sumA++;
        else if (r.status === 'T') {
          sumT++;
          sumH++;
        }
      });
    });

    const sumRecords = sumH + sumS + sumI + sumA;
    const avgPercentage =
      recapRows.length > 0
        ? Math.round(
            recapRows.reduce((acc, curr) => acc + curr.persentaseNum, 0) /
              recapRows.length
          )
        : 0;

    return {
      sumH,
      sumS,
      sumI,
      sumA,
      sumT,
      sumRecords,
      avgPercentage,
      totalStudents: targetStudents.length,
    };
  }, [activeStudents, selectedClass, filteredRecords, recapRows]);

  // Handle header sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nama' ? 'asc' : 'desc'); // numbers default to desc
    }
  };

  // Toggle status filter via KPI cards or pills
  const toggleStatusFilter = (status: StatusFilterType) => {
    if (statusFilter === status) {
      setStatusFilter('all');
    } else {
      setStatusFilter(status);
    }
  };

  // Open detail modal for a student
  const handleOpenStudentDetail = (student: Student, initialStatus: StatusFilterType = 'all') => {
    setSelectedStudentForDetail(student);
    setDetailModalInitialFilter(initialStatus);
    setIsDetailModalOpen(true);
  };

  // Direct toggle/change of status in Daily mode right in the table
  const handleDailyStatusChange = async (student: Student, newStatus: AttendanceStatus) => {
    try {
      const nowIso = new Date().toISOString();
      const recordId = `${customDate}_${student.id}`;
      const existing = filteredRecords.find((r) => r.studentId === student.id && r.tanggal === customDate);

      const updatedRecord: AttendanceRecord = {
        id: recordId,
        tanggal: customDate,
        kelas: student.kelas,
        studentId: student.id,
        namaSiswa: student.nama,
        nisn: student.nisn,
        status: newStatus,
        catatan: existing?.catatan || '',
        waktuSimpan: nowIso,
        updatedBy: currentUser?.nama || 'Guru Kelas',
      };

      await saveAttendanceBatch([updatedRecord]);
      if (onRefreshData) {
        await onRefreshData();
      }

      onShowToast(
        'success',
        'Kehadiran Diperbarui',
        `${student.nama} diubah menjadi status ${
          newStatus === 'H' ? 'Hadir' : newStatus === 'S' ? 'Sakit' : newStatus === 'I' ? 'Izin' : newStatus === 'A' ? 'Alpa' : 'Terlambat'
        } pada tanggal ${formatDateIndonesian(customDate)}.`
      );
    } catch (err) {
      console.error('Error changing daily status:', err);
      onShowToast('error', 'Gagal Memperbarui', 'Terjadi kesalahan saat menyimpan perubahan.');
    }
  };

  // Handle updating record from modal
  const handleUpdateRecordFromModal = async (record: AttendanceRecord) => {
    try {
      await saveAttendanceBatch([record]);
      if (onRefreshData) {
        await onRefreshData();
      }
      onShowToast(
        'success',
        'Data Kehadiran Disimpan',
        `Kehadiran ${record.namaSiswa} tanggal ${formatDateIndonesian(record.tanggal)} berhasil diperbarui.`
      );
    } catch (err) {
      console.error('Error saving record from modal:', err);
      onShowToast('error', 'Gagal Memperbarui', 'Terjadi kendala saat menyimpan ke database lokal.');
    }
  };

  // Navigate to daily attendance for specific date & class
  const handleNavigateToDaily = (targetDate: string, targetClass: string) => {
    try {
      sessionStorage.setItem('sdn3_target_attendance_date', targetDate);
    } catch (e) {}
    onNavigate('absensi', targetClass);
  };

  const handleExportExcel = () => {
    const filename = `Rekap_Absensi_SDN3Godog_${periodType}_${selectedClass}.xlsx`;
    exportAttendanceRecapToExcel(recapRows, filename);
    onShowToast('success', 'Ekspor Berhasil', `File rekap ${filename} berhasil diunduh.`);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Laporan & Rekapitulasi
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Rekapitulasi Kehadiran Siswa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · {recordedDates.length} Hari Efektif Belajar Tercatat · <span className="text-blue-700 font-semibold">{periodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
              title="Unduh rekap ke format Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={() => onNavigate('laporan', selectedClass !== 'all' ? selectedClass : undefined)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
              title="Buka laporan formal siap cetak A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Formal (A4)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Period selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Rentang Periode</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="daily">Harian (1 Hari Tertentu)</option>
              <option value="weekly">Mingguan (7 Hari)</option>
              <option value="monthly">Bulanan</option>
              <option value="semester1">Semester 1 (Ganjil: Jul-Des 2026)</option>
              <option value="semester2">Semester 2 (Genap: Jan-Jun 2027)</option>
              <option value="year">Satu Tahun Ajaran Penuh</option>
            </select>
          </div>

          {/* Conditional Month or Date Input */}
          {periodType === 'monthly' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value={7}>Juli (Semester 1 · 2026)</option>
                <option value={8}>Agustus (Semester 1 · 2026)</option>
                <option value={9}>September (Semester 1 · 2026)</option>
                <option value={10}>Oktober (Semester 1 · 2026)</option>
                <option value={11}>November (Semester 1 · 2026)</option>
                <option value={12}>Desember (Semester 1 · 2026)</option>
                <option value={1}>Januari (Semester 2 · 2027)</option>
                <option value={2}>Februari (Semester 2 · 2027)</option>
                <option value={3}>Maret (Semester 2 · 2027)</option>
                <option value={4}>April (Semester 2 · 2027)</option>
                <option value={5}>Mei (Semester 2 · 2027)</option>
                <option value={6}>Juni (Semester 2 · 2027)</option>
              </select>
            </div>
          ) : periodType === 'daily' || periodType === 'weekly' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Tanggal Acuan</label>
              <input
                type="date"
                min="2026-07-01"
                max="2027-06-30"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Tahun Ajaran</label>
              <div className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700">
                {identity.tahunAjaran}
              </div>
            </div>
          )}

          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Filter Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Kelas (Kelas 1 - 6)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({c.namaWaliKelas.split(',')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Search by student name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Cari Siswa</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ketik nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Interactive Status KPI Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span>Ringkasan Kehadiran</span>
            <span className="text-[11px] font-normal text-slate-500">
              (Klik salah satu kartu di bawah untuk memfilter daftar siswa)
            </span>
          </p>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Reset Filter ({statusFilter})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Siswa Dianalisis (Semua) */}
          <button
            type="button"
            onClick={() => toggleStatusFilter('all')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
              statusFilter === 'all'
                ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500">Siswa Dianalisis</p>
              {statusFilter === 'all' && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
              {totals.totalStudents}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Klik: Tampilkan Semua</p>
          </button>

          {/* Hadir */}
          <button
            type="button"
            onClick={() => toggleStatusFilter('H')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
              statusFilter === 'H'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                : 'bg-white border-emerald-200/90 bg-emerald-50/15 hover:border-emerald-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Total Hadir (H)</span>
              </p>
              {statusFilter === 'H' && (
                <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {totals.sumH}
            </p>
            <p className="text-[10px] text-emerald-600/80 mt-1">Klik untuk filter Hadir</p>
          </button>

          {/* Sakit */}
          <button
            type="button"
            onClick={() => toggleStatusFilter('S')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
              statusFilter === 'S'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                : 'bg-white border-amber-200/90 bg-amber-50/15 hover:border-amber-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Total Sakit (S)</span>
              </p>
              {statusFilter === 'S' && (
                <span className="text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.2 rounded-full">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-700 tabular-nums mt-1">
              {totals.sumS}
            </p>
            <p className="text-[10px] text-amber-600/80 mt-1">Klik untuk filter Sakit</p>
          </button>

          {/* Izin */}
          <button
            type="button"
            onClick={() => toggleStatusFilter('I')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
              statusFilter === 'I'
                ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 shadow-md'
                : 'bg-white border-sky-200/90 bg-sky-50/15 hover:border-sky-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Total Izin (I)</span>
              </p>
              {statusFilter === 'I' && (
                <span className="text-[9px] font-bold bg-sky-600 text-white px-1.5 py-0.2 rounded-full">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-sky-700 tabular-nums mt-1">
              {totals.sumI}
            </p>
            <p className="text-[10px] text-sky-600/80 mt-1">Klik untuk filter Izin</p>
          </button>

          {/* Alpa */}
          <button
            type="button"
            onClick={() => toggleStatusFilter('A')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
              statusFilter === 'A'
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/30 shadow-md'
                : 'bg-white border-rose-200/90 bg-rose-50/15 hover:border-rose-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Total Alpa (A)</span>
              </p>
              {statusFilter === 'A' && (
                <span className="text-[9px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-700 tabular-nums mt-1">
              {totals.sumA}
            </p>
            <p className="text-[10px] text-rose-600/80 mt-1">Klik untuk filter Alpa</p>
          </button>

          {/* Terlambat or Average */}
          {identity.terlambatEnabled ? (
            <button
              type="button"
              onClick={() => toggleStatusFilter('T')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-95 relative ${
                statusFilter === 'T'
                  ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/30 shadow-md'
                  : 'bg-white border-purple-200/90 bg-purple-50/15 hover:border-purple-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-purple-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Total Lambat (T)</span>
                </p>
                {statusFilter === 'T' && (
                  <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-purple-700 tabular-nums mt-1">
                {totals.sumT}
              </p>
              <p className="text-[10px] text-purple-600/80 mt-1">Klik untuk filter Lambat</p>
            </button>
          ) : (
            <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/15 shadow-xs">
              <p className="text-[11px] font-semibold text-blue-700">Rerata Kehadiran</p>
              <p className="text-xl sm:text-2xl font-extrabold text-blue-700 tabular-nums mt-1">
                {totals.avgPercentage}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Persentase Efektif</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Status Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">
            Status:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Semua</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {totals.totalStudents}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('H')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              statusFilter === 'H'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Hadir (H)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700/20 font-extrabold">
              {totals.sumH}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('S')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              statusFilter === 'S'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Sakit (S)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-700/20 font-extrabold">
              {totals.sumS}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('I')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              statusFilter === 'I'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Izin (I)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-700/20 font-extrabold">
              {totals.sumI}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('A')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              statusFilter === 'A'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Alpa (A)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-700/20 font-extrabold">
              {totals.sumA}
            </span>
          </button>

          {identity.terlambatEnabled && (
            <button
              onClick={() => setStatusFilter('T')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                statusFilter === 'T'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Lambat (T)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-700/20 font-extrabold">
                {totals.sumT}
              </span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Klik angka pada tabel untuk melihat atau mengoreksi rincian tanggal siswa.</span>
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                
                {/* Nama Siswa (Sortable) */}
                <th
                  onClick={() => handleSort('nama')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    {sortField === 'nama' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-3 text-center">JK</th>

                {/* Hadir Column (Sortable) */}
                <th
                  onClick={() => handleSort('hadir')}
                  className="py-3 px-3 text-center text-emerald-700 cursor-pointer hover:bg-emerald-50/80 transition select-none"
                  title="Klik untuk mengurutkan berdasarkan jumlah Hadir"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Hadir (H)</span>
                    {sortField === 'hadir' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </div>
                </th>

                {/* Sakit Column (Sortable) */}
                <th
                  onClick={() => handleSort('sakit')}
                  className="py-3 px-3 text-center text-amber-700 cursor-pointer hover:bg-amber-50/80 transition select-none"
                  title="Klik untuk mengurutkan berdasarkan jumlah Sakit"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Sakit (S)</span>
                    {sortField === 'sakit' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </div>
                </th>

                {/* Izin Column (Sortable) */}
                <th
                  onClick={() => handleSort('izin')}
                  className="py-3 px-3 text-center text-sky-700 cursor-pointer hover:bg-sky-50/80 transition select-none"
                  title="Klik untuk mengurutkan berdasarkan jumlah Izin"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Izin (I)</span>
                    {sortField === 'izin' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </div>
                </th>

                {/* Alpa Column (Sortable) */}
                <th
                  onClick={() => handleSort('alpa')}
                  className="py-3 px-3 text-center text-rose-700 cursor-pointer hover:bg-rose-50/80 transition select-none"
                  title="Klik untuk mengurutkan berdasarkan jumlah Alpa"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Alpa (A)</span>
                    {sortField === 'alpa' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </div>
                </th>

                {/* Lambat Column (Sortable) */}
                {identity.terlambatEnabled && (
                  <th
                    onClick={() => handleSort('terlambat')}
                    className="py-3 px-3 text-center text-purple-700 cursor-pointer hover:bg-purple-50/80 transition select-none"
                    title="Klik untuk mengurutkan berdasarkan jumlah Lambat"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Lambat (T)</span>
                      {sortField === 'terlambat' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                      )}
                    </div>
                  </th>
                )}

                {/* Daily Quick Action Toggle or Overall Percentage */}
                {periodType === 'daily' ? (
                  <th className="py-3 px-4 text-center">Status Hari Ini ({customDate})</th>
                ) : (
                  <th
                    onClick={() => handleSort('persentase')}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition select-none"
                    title="Klik untuk mengurutkan berdasarkan Tingkat Kehadiran"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Tingkat Kehadiran</span>
                      {sortField === 'persentase' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recapRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600">Tidak ada data absensi yang sesuai filter.</p>
                    {statusFilter !== 'all' && (
                      <button
                        onClick={() => setStatusFilter('all')}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Reset filter status dan tampilkan semua siswa
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                recapRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 tabular-nums">
                      {row.no}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(row.student, 'all')}
                        className="text-left group hover:text-blue-700 cursor-pointer"
                        title="Klik untuk melihat seluruh riwayat absensi siswa ini"
                      >
                        <div className="group-hover:underline flex items-center gap-1">
                          <span>{row.nama}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-blue-600" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          NISN: {row.nisn || row.nipd || '-'}
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {row.kelas}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                      {row.jk}
                    </td>

                    {/* Clickable Hadir Cell */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(row.student, 'H')}
                        className={`inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                          row.hadir > 0
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs hover:shadow-xs'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={`Klik untuk melihat ${row.hadir} tanggal Hadir siswa ini`}
                      >
                        {row.hadir}
                      </button>
                    </td>

                    {/* Clickable Sakit Cell */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(row.student, 'S')}
                        className={`inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                          row.sakit > 0
                            ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300/80 shadow-2xs hover:shadow-xs'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={`Klik untuk melihat atau mengoreksi ${row.sakit} tanggal Sakit siswa ini`}
                      >
                        {row.sakit}
                      </button>
                    </td>

                    {/* Clickable Izin Cell */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(row.student, 'I')}
                        className={`inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                          row.izin > 0
                            ? 'bg-sky-100/80 hover:bg-sky-200 text-sky-900 border border-sky-300/80 shadow-2xs hover:shadow-xs'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={`Klik untuk melihat atau mengoreksi ${row.izin} tanggal Izin siswa ini`}
                      >
                        {row.izin}
                      </button>
                    </td>

                    {/* Clickable Alpa Cell */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(row.student, 'A')}
                        className={`inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                          row.alpa > 0
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 shadow-2xs hover:shadow-xs font-black'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={`Klik untuk melihat atau mengoreksi ${row.alpa} tanggal Alpa siswa ini`}
                      >
                        {row.alpa}
                      </button>
                    </td>

                    {/* Clickable Lambat Cell */}
                    {identity.terlambatEnabled && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenStudentDetail(row.student, 'T')}
                          className={`inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                            row.terlambat > 0
                              ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs hover:shadow-xs'
                              : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                          }`}
                          title={`Klik untuk melihat atau mengoreksi ${row.terlambat} tanggal Lambat siswa ini`}
                        >
                          {row.terlambat}
                        </button>
                      </td>
                    )}

                    {/* Daily Mode Interactive Toggle Buttons or Percentage */}
                    {periodType === 'daily' ? (
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {/* Hadir */}
                          <button
                            type="button"
                            onClick={() => handleDailyStatusChange(row.student, 'H')}
                            className={`px-2 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
                              row.dailyStatus === 'H'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title="Set Hadir"
                          >
                            H
                          </button>

                          {/* Sakit */}
                          <button
                            type="button"
                            onClick={() => handleDailyStatusChange(row.student, 'S')}
                            className={`px-2 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
                              row.dailyStatus === 'S'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                            title="Set Sakit"
                          >
                            S
                          </button>

                          {/* Izin */}
                          <button
                            type="button"
                            onClick={() => handleDailyStatusChange(row.student, 'I')}
                            className={`px-2 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
                              row.dailyStatus === 'I'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                            }`}
                            title="Set Izin"
                          >
                            I
                          </button>

                          {/* Alpa */}
                          <button
                            type="button"
                            onClick={() => handleDailyStatusChange(row.student, 'A')}
                            className={`px-2 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
                              row.dailyStatus === 'A'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                            title="Set Alpa"
                          >
                            A
                          </button>

                          {/* Terlambat */}
                          {identity.terlambatEnabled && (
                            <button
                              type="button"
                              onClick={() => handleDailyStatusChange(row.student, 'T')}
                              className={`px-2 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
                                row.dailyStatus === 'T'
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                              }`}
                              title="Set Terlambat"
                            >
                              T
                            </button>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.persentaseNum >= 90
                                  ? 'bg-emerald-500'
                                  : row.persentaseNum >= 75
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${row.persentaseNum}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-800 tabular-nums w-10 text-right">
                            {row.persentase}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Attendance Detail Modal */}
      <StudentAttendanceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedStudentForDetail}
        initialStatusFilter={detailModalInitialFilter}
        periodLabel={periodLabel}
        records={filteredRecords}
        terlambatEnabled={identity.terlambatEnabled}
        currentUser={currentUser}
        onUpdateRecord={handleUpdateRecordFromModal}
        onNavigateToDaily={handleNavigateToDaily}
      />
    </div>
  );
};
