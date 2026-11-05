import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, SchoolClass } from '../../types';
import { formatDateIndonesian } from '../../utils/dateUtils';

interface MonthCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  selectedClass: string;
  currentClassObj?: SchoolClass;
  allAttendance: AttendanceRecord[];
  academicYear: string; // '2026/2027'
}

interface AcademicMonth {
  key: string; // 'YYYY-MM'
  label: string; // 'Juli 2026'
  year: number;
  month: number; // 1-12
  semester: 'Semester 1' | 'Semester 2';
}

export const ACADEMIC_MONTHS: AcademicMonth[] = [
  // Semester 1 (Ganjil)
  { key: '2026-07', label: 'Juli 2026', year: 2026, month: 7, semester: 'Semester 1' },
  { key: '2026-08', label: 'Agustus 2026', year: 2026, month: 8, semester: 'Semester 1' },
  { key: '2026-09', label: 'September 2026', year: 2026, month: 9, semester: 'Semester 1' },
  { key: '2026-10', label: 'Oktober 2026', year: 2026, month: 10, semester: 'Semester 1' },
  { key: '2026-11', label: 'November 2026', year: 2026, month: 11, semester: 'Semester 1' },
  { key: '2026-12', label: 'Desember 2026', year: 2026, month: 12, semester: 'Semester 1' },
  // Semester 2 (Genap)
  { key: '2027-01', label: 'Januari 2027', year: 2027, month: 1, semester: 'Semester 2' },
  { key: '2027-02', label: 'Februari 2027', year: 2027, month: 2, semester: 'Semester 2' },
  { key: '2027-03', label: 'Maret 2027', year: 2027, month: 3, semester: 'Semester 2' },
  { key: '2027-04', label: 'April 2027', year: 2027, month: 4, semester: 'Semester 2' },
  { key: '2027-05', label: 'Mei 2027', year: 2027, month: 5, semester: 'Semester 2' },
  { key: '2027-06', label: 'Juni 2027', year: 2027, month: 6, semester: 'Semester 2' },
];

export const MonthCalendarModal: React.FC<MonthCalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  selectedClass,
  currentClassObj,
  allAttendance,
  academicYear,
}) => {
  // Current viewing month in calendar
  const initialYearMonth = selectedDate.substring(0, 7); // e.g. '2026-11'
  const [activeMonthKey, setActiveMonthKey] = useState<string>(
    ACADEMIC_MONTHS.some((m) => m.key === initialYearMonth) ? initialYearMonth : '2026-07'
  );

  const activeMonth = useMemo(() => {
    return (
      ACADEMIC_MONTHS.find((m) => m.key === activeMonthKey) || ACADEMIC_MONTHS[0]
    );
  }, [activeMonthKey]);

  // Set of dates already recorded for this class in IndexedDB
  const recordedDatesSet = useMemo(() => {
    const set = new Set<string>();
    allAttendance.forEach((rec) => {
      if (rec.kelas === selectedClass && rec.status !== null) {
        set.add(rec.tanggal);
      }
    });
    return set;
  }, [allAttendance, selectedClass]);

  // Generate calendar days for the selected month
  const calendarDays = useMemo(() => {
    const year = activeMonth.year;
    const month = activeMonth.month; // 1-12
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Day of week of 1st day (0 = Sunday, 1 = Monday, ...)
    // In Indonesia, school week is Monday - Saturday
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sun

    const days = [];

    // Padding before day 1 (adjust so Monday is col 0, Sunday is col 6)
    // Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1, ...
    const mondayBasedOffset = (firstDayOfWeek + 6) % 7;
    for (let p = 0; p < mondayBasedOffset; p++) {
      days.push({ dayNumber: 0, dateStr: '', isPadding: true });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dayDate = new Date(`${dateStr}T00:00:00`);
      const isSunday = dayDate.getDay() === 0;
      const isRecorded = recordedDatesSet.has(dateStr);

      days.push({
        dayNumber: d,
        dateStr,
        isPadding: false,
        isSunday,
        isRecorded,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDate,
      });
    }

    return days;
  }, [activeMonth, recordedDatesSet, selectedDate]);

  // Stats for this month
  const monthStats = useMemo(() => {
    const validDays = calendarDays.filter((d) => !d.isPadding && !d.isSunday);
    const totalSchoolDays = validDays.length;
    const recordedDays = validDays.filter((d) => d.isRecorded).length;
    const missedDays = totalSchoolDays - recordedDays;
    const firstMissed = validDays.find((d) => !d.isRecorded);

    return { totalSchoolDays, recordedDays, missedDays, firstMissed };
  }, [calendarDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 no-print">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Kalender Absensi & Input Bulan Terlewat
              </h2>
              <p className="text-xs text-slate-500">
                Pilih tanggal mundur mulai dari <strong>Juli 2026</strong> untuk {currentClassObj?.nama || 'Kelas'}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Year Month Pills (Juli 2026 s.d. Juni 2027) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
            <span>Pilih Bulan Dalam Tahun Ajaran {academicYear}:</span>
            <span className="text-blue-600 font-semibold">{activeMonth.semester}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {ACADEMIC_MONTHS.map((m) => {
              const isActive = m.key === activeMonthKey;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMonthKey(m.key)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-900'
                  }`}
                >
                  <div className="truncate">{m.label.split(' ')[0]}</div>
                  <div className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {m.year}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Progress & First Missed Day Helper */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-500">Status {activeMonth.label}:</span>{' '}
              <strong className="text-slate-900 tabular-nums">
                {monthStats.recordedDays} dari {monthStats.totalSchoolDays} hari sekolah tercatat
              </strong>
            </div>
            {monthStats.missedDays > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {monthStats.missedDays} Hari Terlewat
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Lengkap
              </span>
            )}
          </div>

          {monthStats.firstMissed && (
            <button
              onClick={() => {
                const target = monthStats.firstMissed;
                if (target) {
                  onSelectDate(target.dateStr);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <span>Isi Hari Terlewat Pertama ({monthStats.firstMissed.dayNumber})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="mt-4 border border-slate-200 rounded-2xl p-3 bg-white">
          {/* Day Names Header (Senin s.d. Minggu) */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500 mb-2 pb-2 border-b border-slate-100">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span className="text-red-500">Min</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((d, index) => {
              if (d.isPadding) {
                return <div key={`pad_${index}`} className="h-12 sm:h-14 rounded-xl" />;
              }

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => {
                    onSelectDate(d.dateStr);
                    onClose();
                  }}
                  className={`h-12 sm:h-14 rounded-xl p-1 flex flex-col justify-between items-center transition relative border cursor-pointer ${
                    d.isSelected
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/30 font-extrabold'
                      : d.isRecorded
                      ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
                      : d.isSunday
                      ? 'border-slate-100 bg-slate-50 text-slate-400'
                      : 'border-amber-200 bg-amber-50/20 hover:border-amber-400 text-slate-800'
                  }`}
                  title={
                    d.isSunday
                      ? 'Hari Minggu (Libur)'
                      : d.isRecorded
                      ? 'Sudah Diabsen'
                      : 'Belum Diabsen (Klik untuk isi absen tanggal ini)'
                  }
                >
                  <div className="w-full flex items-center justify-between text-[11px] px-1">
                    <span
                      className={`font-bold tabular-nums ${
                        d.isSunday ? 'text-red-500' : 'text-slate-800'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                    {d.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="w-full text-center pb-0.5">
                    {d.isSunday ? (
                      <span className="text-[9px] text-slate-400">Libur</span>
                    ) : d.isRecorded ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Ada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded">
                        <Clock className="w-2.5 h-2.5 text-amber-600" />
                        <span>Kosong</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Sudah Diisi</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Belum Diabsen (Terlewat)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Hari Libur</span>
            </span>
          </div>

          <span className="text-slate-400">Klik tanggal mana pun untuk membuka absensi</span>
        </div>
      </div>
    </div>
  );
};
