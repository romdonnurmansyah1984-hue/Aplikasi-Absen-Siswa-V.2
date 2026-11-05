import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  CheckCheck,
  Save,
  RotateCcw,
  Printer,
  Table as TableIcon,
  LayoutGrid,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  History,
  ArrowRight,
  Camera,
  CreditCard,
} from 'lucide-react';
import {
  Student,
  AttendanceStatus,
  AttendanceRecord,
  SchoolClass,
  SchoolIdentity,
  UserAccount,
  ActiveMenu,
} from '../../types';
import {
  getAttendanceByDateAndClass,
  saveAttendanceBatch,
  getDraft,
  saveDraft,
  clearDraft,
} from '../../db/indexedDB';
import { formatDateIndonesian, getTodayString } from '../../utils/dateUtils';
import { ConfirmModal } from '../common/ConfirmModal';
import { MonthCalendarModal, ACADEMIC_MONTHS } from './MonthCalendarModal';

interface DailyAttendanceViewProps {
  students: Student[];
  classes: SchoolClass[];
  identity: SchoolIdentity;
  currentUser: UserAccount;
  allAttendance?: AttendanceRecord[];
  initialClass?: string;
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const DailyAttendanceView: React.FC<DailyAttendanceViewProps> = ({
  students,
  classes,
  identity,
  currentUser,
  allAttendance = [],
  initialClass,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  // Determine default class
  const defaultClass =
    initialClass ||
    (currentUser.role === 'guru' && currentUser.kelasAkses ? currentUser.kelasAkses : '1');

  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'H' | 'S' | 'I' | 'A' | 'T'>('all');

  // Attendance local state map: studentId -> { status: AttendanceStatus, catatan: string }
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; catatan: string }>
  >({});

  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSavedPermanently, setIsSavedPermanently] = useState<boolean>(false);
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);

  // Confirmation modals
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showIncompleteWarnModal, setShowIncompleteWarnModal] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [advanceAfterSave, setAdvanceAfterSave] = useState<boolean>(false);

  // Active students for selected class
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.kelas === selectedClass && s.status === 'Aktif')
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [students, selectedClass]);

  // Selected class object
  const currentClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClass) || classes[0];
  }, [classes, selectedClass]);

  // Date Navigation Helpers for Past Months
  const todayStr = getTodayString();
  const isPastDate = selectedDate < todayStr;
  const currentMonthKey = selectedDate.substring(0, 7);

  const getNextSchoolDay = (currentDateStr: string): string => {
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    // Skip Sunday (0)
    if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPrevSchoolDay = (currentDateStr: string): string => {
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    // Skip Sunday (0)
    if (d.getDay() === 0) {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevDay = () => {
    setSelectedDate(getPrevSchoolDay(selectedDate));
  };

  const handleNextDay = () => {
    setSelectedDate(getNextSchoolDay(selectedDate));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSelectMonth = (monthKey: string) => {
    // Keep day if possible, or fallback to 15th
    const parts = selectedDate.split('-');
    const day = parts[2] || '15';
    setSelectedDate(`${monthKey}-${day}`);
  };

  // Check for target date from other views (e.g. Recap)
  useEffect(() => {
    const targetDate = sessionStorage.getItem('sdn3_target_attendance_date');
    if (targetDate) {
      setSelectedDate(targetDate);
      sessionStorage.removeItem('sdn3_target_attendance_date');
    }
  }, []);

  useEffect(() => {
    if (initialClass) {
      setSelectedClass(initialClass);
    }
  }, [initialClass]);

  // Load existing attendance or draft on class/date change
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch saved records from IndexedDB
        const savedRecords = await getAttendanceByDateAndClass(selectedDate, selectedClass);

        // 2. Fetch draft from IndexedDB
        const draft = await getDraft(selectedClass, selectedDate);

        if (isCancelled) return;

        const newMap: Record<string, { status: AttendanceStatus; catatan: string }> = {};

        // Populate with saved records first
        if (savedRecords.length > 0) {
          savedRecords.forEach((rec) => {
            newMap[rec.studentId] = {
              status: rec.status,
              catatan: rec.catatan || '',
            };
          });
          setIsSavedPermanently(true);
          setSavedTimestamp(savedRecords[0]?.waktuSimpan || null);
        } else {
          setIsSavedPermanently(false);
          setSavedTimestamp(null);
        }

        // Overlay draft if present and not older
        if (draft && draft.records) {
          Object.keys(draft.records).forEach((sId) => {
            newMap[sId] = draft.records[sId];
          });
        }

        setAttendanceMap(newMap);
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedClass, selectedDate]);

  // Handle single student status selection
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const current = attendanceMap[studentId] || { status: null, catatan: '' };
    // Toggle off if clicked again, or set new
    const nextStatus = current.status === status ? null : status;
    const nextMap = {
      ...attendanceMap,
      [studentId]: {
        ...current,
        status: nextStatus,
      },
    };
    setAttendanceMap(nextMap);
    setIsSavedPermanently(false);

    // Auto-save draft into IndexedDB
    saveDraft({
      kelas: selectedClass,
      tanggal: selectedDate,
      records: nextMap,
      lastUpdated: new Date().toISOString(),
    }).catch(console.error);
  };

  // Handle single student note change
  const handleSetCatatan = (studentId: string, catatan: string) => {
    const current = attendanceMap[studentId] || { status: null, catatan: '' };
    const nextMap = {
      ...attendanceMap,
      [studentId]: {
        ...current,
        catatan,
      },
    };
    setAttendanceMap(nextMap);
    setIsSavedPermanently(false);

    saveDraft({
      kelas: selectedClass,
      tanggal: selectedDate,
      records: nextMap,
      lastUpdated: new Date().toISOString(),
    }).catch(console.error);
  };

  // Mark all active students as Hadir (H)
  const handleMarkAllPresent = () => {
    const nextMap = { ...attendanceMap };
    classStudents.forEach((student) => {
      nextMap[student.id] = {
        status: 'H',
        catatan: nextMap[student.id]?.catatan || '',
      };
    });
    setAttendanceMap(nextMap);
    setIsSavedPermanently(false);

    saveDraft({
      kelas: selectedClass,
      tanggal: selectedDate,
      records: nextMap,
      lastUpdated: new Date().toISOString(),
    }).catch(console.error);

    onShowToast('info', 'Tandai Semua Hadir', `Semua siswa ${currentClassObj?.nama || ''} telah ditandai Hadir.`);
  };

  // Reset all selections
  const handleReset = async () => {
    setAttendanceMap({});
    setIsSavedPermanently(false);
    await clearDraft(selectedClass, selectedDate);
    setShowResetModal(false);
    onShowToast('warning', 'Reset Absensi', 'Status absensi pada kelas dan tanggal ini telah dikosongkan.');
  };

  // Count progress
  const stats = useMemo(() => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let t = 0;
    let unassigned = 0;

    classStudents.forEach((st) => {
      const rec = attendanceMap[st.id];
      if (!rec || rec.status === null) {
        unassigned++;
      } else if (rec.status === 'H') h++;
      else if (rec.status === 'S') s++;
      else if (rec.status === 'I') i++;
      else if (rec.status === 'A') a++;
      else if (rec.status === 'T') {
        t++;
        h++; // Count as present with note
      }
    });

    const total = classStudents.length;
    const filled = total - unassigned;
    const percentage = total > 0 ? Math.round((h / total) * 100) : 0;

    return { h, s, i, a, t, unassigned, total, filled, percentage };
  }, [classStudents, attendanceMap]);

  // Check before saving
  const handlePreSave = (advance = false) => {
    setAdvanceAfterSave(advance);
    if (stats.unassigned > 0) {
      setShowIncompleteWarnModal(true);
      return;
    }
    executeSave(advance);
  };

  // Execute actual IndexedDB save
  const executeSave = async (advance = advanceAfterSave) => {
    setShowIncompleteWarnModal(false);
    setIsSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const recordsToSave: AttendanceRecord[] = [];

      classStudents.forEach((st) => {
        const item = attendanceMap[st.id];
        if (item && item.status !== null) {
          recordsToSave.push({
            id: `${selectedDate}_${st.id}`,
            tanggal: selectedDate,
            kelas: selectedClass,
            studentId: st.id,
            namaSiswa: st.nama,
            nisn: st.nisn,
            status: item.status,
            catatan: item.catatan || '',
            waktuSimpan: nowIso,
            updatedBy: currentUser.nama,
          });
        }
      });

      // Save records batch to IndexedDB
      await saveAttendanceBatch(recordsToSave);
      // Clear draft since it is now permanently saved
      await clearDraft(selectedClass, selectedDate);

      setIsSavedPermanently(true);
      setSavedTimestamp(nowIso);

      // Trigger global refresh so Dashboard and Recap update immediately
      await onRefreshData();

      if (advance) {
        const nextDate = getNextSchoolDay(selectedDate);
        setSelectedDate(nextDate);
        onShowToast(
          'success',
          'Absensi Disimpan! Beralih Ke Hari Berikutnya',
          `Data kehadiran tanggal ${formatDateIndonesian(selectedDate)} tersimpan. Sekarang membuka tanggal ${formatDateIndonesian(nextDate)}.`
        );
      } else {
        onShowToast(
          'success',
          'Absensi Berhasil Disimpan!',
          `Data kehadiran ${recordsToSave.length} siswa ${currentClassObj?.nama} tersimpan aman di database lokal IndexedDB.`
        );
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      onShowToast('error', 'Gagal Menyimpan Absensi', 'Terjadi kendala saat menyimpan ke database lokal.');
    } finally {
      setIsSaving(false);
      setAdvanceAfterSave(false);
    }
  };

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    return classStudents.filter((st) => {
      // Search
      const matchSearch =
        !searchQuery ||
        st.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.nisn.includes(searchQuery) ||
        st.nipd.includes(searchQuery);

      if (!matchSearch) return false;

      // Status filter
      if (statusFilter === 'all') return true;
      const rec = attendanceMap[st.id];
      if (statusFilter === 'unassigned') return !rec || rec.status === null;
      return rec?.status === statusFilter;
    });
  }, [classStudents, searchQuery, statusFilter, attendanceMap]);

  return (
    <div className="space-y-5 pb-16">
      {/* Top Filter and Controller Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header titles */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Menu Utama
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Absensi Harian Siswa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · Wali Kelas: <span className="font-semibold text-slate-700">{currentClassObj?.namaWaliKelas}</span>
            </p>
          </div>

          {/* Class, Month, Date Selectors & Steppers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-semibold text-slate-500">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} ({c.namaWaliKelas.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Month Jumper (Mulai Juli 2026 s.d. Juni 2027) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-semibold text-slate-500">Bulan:</span>
              <select
                value={currentMonthKey}
                onChange={(e) => handleSelectMonth(e.target.value)}
                className="text-xs sm:text-sm font-bold text-blue-700 bg-transparent focus:outline-hidden cursor-pointer"
                title="Pilih bulan mundur (Juli 2026 dst.)"
              >
                {ACADEMIC_MONTHS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <input
                type="date"
                min="2026-07-01"
                max="2027-06-30"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Day Steppers: Prev, Next, Today */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Mundur Satu Hari"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Maju Satu Hari"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-white rounded-lg shadow-2xs hover:bg-blue-50 transition"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>
              )}
            </div>

            {/* Open Visual Month Calendar & Missed Input Modal */}
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition"
              title="Buka matriks kalender bulan untuk melihat hari yang terlewat"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Kalender Bulan Terlewat</span>
            </button>
          </div>
        </div>

        {/* Past Date Alert Banner */}
        {isPastDate && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Input Absen Mundur / Terlewat:</strong> Anda sedang mengisi kehadiran tanggal{' '}
                <strong>{formatDateIndonesian(selectedDate)}</strong>. Data yang disimpan otomatis masuk ke rekapitulasi.
              </span>
            </div>
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Lihat Hari Lain di Bulan Ini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Progress & Quick Stats Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700">Progres Pengisian:</span>
            <span className="font-extrabold text-blue-600 tabular-nums">
              {stats.filled} dari {stats.total} siswa
            </span>
            <span className="text-slate-400">·</span>
            <span
              className={`font-semibold ${
                stats.unassigned === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {stats.unassigned === 0 ? 'Lengkap (100%)' : `${stats.unassigned} belum diabsen`}
            </span>
          </div>

          {/* Status Badges summary (Interactive Clickable Filters) */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'H' ? 'all' : 'H')}
              className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold transition cursor-pointer active:scale-95 ${
                statusFilter === 'H'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
              title="Klik untuk memfilter daftar siswa yang Hadir"
            >
              H: {stats.h}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'S' ? 'all' : 'S')}
              className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold transition cursor-pointer active:scale-95 ${
                statusFilter === 'S'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
              title="Klik untuk memfilter daftar siswa yang Sakit"
            >
              S: {stats.s}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'I' ? 'all' : 'I')}
              className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold transition cursor-pointer active:scale-95 ${
                statusFilter === 'I'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60'
              }`}
              title="Klik untuk memfilter daftar siswa yang Izin"
            >
              I: {stats.i}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'A' ? 'all' : 'A')}
              className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold transition cursor-pointer active:scale-95 ${
                statusFilter === 'A'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
              title="Klik untuk memfilter daftar siswa yang Alpa"
            >
              A: {stats.a}
            </button>
            {identity.terlambatEnabled && stats.t > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'T' ? 'all' : 'T')}
                className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold transition cursor-pointer active:scale-95 ${
                  statusFilter === 'T'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                }`}
                title="Klik untuk memfilter daftar siswa yang Terlambat"
              >
                T: {stats.t}
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
              title="Tandai semua siswa yang aktif di kelas ini dengan status Hadir"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              <span>Tandai Semua Hadir</span>
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition"
              title="Reset pilihan kehadiran siswa"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Pilihan</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('scan-kamera')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200/80 transition active:scale-95 shadow-2xs"
              title="Buka kamera untuk scan barcode/QR siswa"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scan Barcode</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('kartu-siswa', selectedClass)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs rounded-xl border border-blue-200/80 transition active:scale-95 shadow-2xs"
              title="Cetak kartu absensi siswa kelas ini"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Kartu Siswa</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher (Cards vs Table) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Tabel"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Kartu (Sangat ramah sentuh di HP)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>

            {/* Print attendance button */}
            <button
              onClick={() => onNavigate('laporan', selectedClass)}
              className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
              title="Cetak daftar hadir kelas ini"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Save Attendance Button */}
            <button
              onClick={() => handlePreSave(false)}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 ${
                isSavedPermanently
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : isSavedPermanently ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-200" />
                  <span>Tersimpan (Perbarui)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Absensi</span>
                </>
              )}
            </button>

            {/* Save & Advance to Next Day Button (Perfect for missed month back-fill) */}
            <button
              onClick={() => handlePreSave(true)}
              disabled={isSaving}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition active:scale-95"
              title="Simpan absensi lalu langsung maju ke hari berikutnya"
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simpan & Lanjut ⏩</span>
            </button>
          </div>
        </div>

        {/* Saved status notification bar */}
        {isSavedPermanently && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Absensi {currentClassObj?.nama} tanggal <strong>{formatDateIndonesian(selectedDate)}</strong> telah tersimpan di database lokal.
              </span>
            </div>
            {savedTimestamp && (
              <span className="text-[10px] text-emerald-700 hidden md:inline">
                Terakhir disimpan: {new Date(savedTimestamp).toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden transition"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({classStudents.length})
          </button>
          <button
            onClick={() => setStatusFilter('unassigned')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'unassigned'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Belum Absen ({stats.unassigned})
          </button>
          <button
            onClick={() => setStatusFilter('H')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'H'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hadir ({stats.h})
          </button>
          <button
            onClick={() => setStatusFilter('S')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'S'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Sakit ({stats.s})
          </button>
          <button
            onClick={() => setStatusFilter('I')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'I'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Izin ({stats.i})
          </button>
          <button
            onClick={() => setStatusFilter('A')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'A'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Alpa ({stats.a})
          </button>
        </div>
      </div>

      {/* Main Student Attendance List: Table or Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">Memuat data absensi...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800">Tidak ada siswa yang cocok</p>
          <p className="text-xs text-slate-500 mt-1">
            Coba sesuaikan kata kunci pencarian atau filter status.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3 w-16 text-center">JK</th>
                  <th className="py-3 px-4 text-center min-w-[250px]">Pilihan Status</th>
                  <th className="py-3 px-4 min-w-[180px]">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((student, idx) => {
                  const rec = attendanceMap[student.id] || { status: null, catatan: '' };
                  const isUnassigned = rec.status === null;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isUnassigned ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Number */}
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Name & NISN */}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-tight">
                            {student.nama}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            NISN: {student.nisn || student.nipd || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            student.jk === 'L'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-pink-50 text-pink-700'
                          }`}
                        >
                          {student.jk}
                        </span>
                      </td>

                      {/* Touch Buttons for Status: H, S, I, A, T */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          {/* H = Hadir */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, 'H')}
                            className={`min-w-[42px] h-10 px-2 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                              rec.status === 'H'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title="Hadir"
                          >
                            H
                          </button>

                          {/* S = Sakit */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, 'S')}
                            className={`min-w-[42px] h-10 px-2 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                              rec.status === 'S'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                            title="Sakit"
                          >
                            S
                          </button>

                          {/* I = Izin */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, 'I')}
                            className={`min-w-[42px] h-10 px-2 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                              rec.status === 'I'
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-800'
                            }`}
                            title="Izin"
                          >
                            I
                          </button>

                          {/* A = Alpa */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, 'A')}
                            className={`min-w-[42px] h-10 px-2 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                              rec.status === 'A'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                            }`}
                            title="Alpa / Tanpa Keterangan"
                          >
                            A
                          </button>

                          {/* T = Terlambat (Optional) */}
                          {identity.terlambatEnabled && (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.id, 'T')}
                              className={`min-w-[42px] h-10 px-2 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                                rec.status === 'T'
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-800'
                              }`}
                              title="Terlambat Hadir"
                            >
                              T
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Notes input */}
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={rec.catatan || ''}
                          onChange={(e) => handleSetCatatan(student.id, e.target.value)}
                          placeholder={
                            rec.status === 'S'
                              ? 'Ket: Demam, flu, dll...'
                              : rec.status === 'I'
                              ? 'Ket: Acara keluarga...'
                              : 'Catatan opsional...'
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-hidden transition"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW (Touch Friendly Mobile) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStudents.map((student, idx) => {
            const rec = attendanceMap[student.id] || { status: null, catatan: '' };
            const isUnassigned = rec.status === null;

            return (
              <div
                key={student.id}
                className={`p-4 rounded-2xl border transition ${
                  isUnassigned
                    ? 'bg-amber-50/20 border-amber-200'
                    : rec.status === 'H'
                    ? 'bg-white border-emerald-200'
                    : rec.status === 'S'
                    ? 'bg-white border-amber-200'
                    : rec.status === 'I'
                    ? 'bg-white border-sky-200'
                    : 'bg-white border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {student.nama}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        NISN {student.nisn || '-'} · JK: {student.jk}
                      </p>
                    </div>
                  </div>

                  {/* Active status indicator badge */}
                  {isUnassigned ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Belum Diisi
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'H'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'S'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'I'
                          ? 'bg-sky-100 text-sky-800'
                          : rec.status === 'T'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status === 'H'
                        ? 'Hadir'
                        : rec.status === 'S'
                        ? 'Sakit'
                        : rec.status === 'I'
                        ? 'Izin'
                        : rec.status === 'T'
                        ? 'Terlambat'
                        : 'Alpa'}
                    </span>
                  )}
                </div>

                {/* Big touch buttons for Android Phone */}
                <div className="mt-3.5 grid grid-cols-4 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.id, 'H')}
                    className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 ${
                      rec.status === 'H'
                        ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span>H</span>
                    <span className="text-[9px] opacity-80">Hadir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.id, 'S')}
                    className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 ${
                      rec.status === 'S'
                        ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-50'
                    }`}
                  >
                    <span>S</span>
                    <span className="text-[9px] opacity-80">Sakit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.id, 'I')}
                    className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 ${
                      rec.status === 'I'
                        ? 'bg-sky-500 text-white shadow-xs font-extrabold'
                        : 'bg-slate-100 text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <span>I</span>
                    <span className="text-[9px] opacity-80">Izin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(student.id, 'A')}
                    className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 ${
                      rec.status === 'A'
                        ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                        : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <span>A</span>
                    <span className="text-[9px] opacity-80">Alpa</span>
                  </button>

                  {identity.terlambatEnabled && (
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'T')}
                      className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition active:scale-95 ${
                        rec.status === 'T'
                          ? 'bg-purple-600 text-white shadow-xs font-extrabold'
                          : 'bg-slate-100 text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <span>T</span>
                      <span className="text-[9px] opacity-80">Lambat</span>
                    </button>
                  )}
                </div>

                {/* Notes input */}
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={rec.catatan || ''}
                    onChange={(e) => handleSetCatatan(student.id, e.target.value)}
                    placeholder="Catatan / keterangan khusus..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-hidden transition"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Quick Save on Mobile */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-slate-200/90 lg:hidden shadow-xl flex items-center justify-between gap-3 no-print z-30">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800">
            {stats.filled} / {stats.total} Diabsen
          </p>
          <p className="text-[10px] text-slate-500">
            {stats.unassigned === 0 ? 'Semua terisi' : `${stats.unassigned} belum ada status`}
          </p>
        </div>
        <button
          onClick={() => handlePreSave(false)}
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>{isSavedPermanently ? 'Perbarui Absensi' : 'Simpan Absensi'}</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Absensi Siswa?"
        message={`Apakah Anda yakin ingin mengosongkan pilihan absensi ${currentClassObj?.nama} pada tanggal ${formatDateIndonesian(
          selectedDate
        )}? Draf yang belum disimpan akan dihapus.`}
        confirmLabel="Ya, Kosongkan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Incomplete Warning Modal */}
      <ConfirmModal
        isOpen={showIncompleteWarnModal}
        title="Peringatan: Masih Ada Siswa Belum Diabsen"
        message={`Terdapat ${stats.unassigned} siswa yang belum diberikan status kehadiran (H, S, I, A). Sesuai ketentuan, sistem tidak menganggap siswa tanpa status sebagai alpa secara otomatis. Apakah Anda tetap ingin menyimpan draf yang sudah diisi?`}
        confirmLabel="Tetap Simpan"
        cancelLabel="Kembali & Lengkapi"
        isDestructive={false}
        onConfirm={() => executeSave(advanceAfterSave)}
        onCancel={() => setShowIncompleteWarnModal(false)}
      />

      {/* Month Calendar Matrix Modal for Past Months */}
      <MonthCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        selectedClass={selectedClass}
        currentClassObj={currentClassObj}
        allAttendance={allAttendance}
        academicYear={identity.tahunAjaran}
      />
    </div>
  );
};
