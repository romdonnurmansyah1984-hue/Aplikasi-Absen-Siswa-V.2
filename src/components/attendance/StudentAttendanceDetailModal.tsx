import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Clock,
  Edit2,
  Save,
  ExternalLink,
  UserCheck,
  FileText,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, UserAccount } from '../../types';
import { formatDateIndonesian } from '../../utils/dateUtils';

interface StudentAttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  initialStatusFilter?: 'all' | 'H' | 'S' | 'I' | 'A' | 'T';
  periodLabel: string;
  records: AttendanceRecord[];
  terlambatEnabled: boolean;
  currentUser?: UserAccount | null;
  onUpdateRecord: (record: AttendanceRecord) => Promise<void>;
  onNavigateToDaily: (date: string, kelas: string) => void;
}

export const StudentAttendanceDetailModal: React.FC<StudentAttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  initialStatusFilter = 'all',
  periodLabel,
  records,
  terlambatEnabled,
  currentUser,
  onUpdateRecord,
  onNavigateToDaily,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'H' | 'S' | 'I' | 'A' | 'T'>(
    initialStatusFilter
  );
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Sync initial status filter when opened or changed
  useEffect(() => {
    setActiveFilter(initialStatusFilter);
    setEditingNoteId(null);
  }, [initialStatusFilter, student, isOpen]);

  // Student specific records sorted by date descending (newest first)
  const studentRecords = useMemo(() => {
    if (!student) return [];
    return records
      .filter((r) => r.studentId === student.id)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [records, student]);

  // Counts by status
  const counts = useMemo(() => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let t = 0;
    studentRecords.forEach((r) => {
      if (r.status === 'H') h++;
      else if (r.status === 'S') s++;
      else if (r.status === 'I') i++;
      else if (r.status === 'A') a++;
      else if (r.status === 'T') {
        t++;
        h++;
      }
    });
    return { h, s, i, a, t, total: studentRecords.length };
  }, [studentRecords]);

  // Filtered records based on active status filter tab
  const displayedRecords = useMemo(() => {
    if (activeFilter === 'all') return studentRecords;
    return studentRecords.filter((r) => r.status === activeFilter);
  }, [studentRecords, activeFilter]);

  if (!isOpen || !student) return null;

  const handleStatusChange = async (record: AttendanceRecord, newStatus: AttendanceStatus) => {
    if (record.status === newStatus) return;
    setIsUpdating(true);
    try {
      const updated: AttendanceRecord = {
        ...record,
        status: newStatus,
        waktuSimpan: new Date().toISOString(),
        updatedBy: currentUser?.nama || record.updatedBy || 'Guru/Operator',
      };
      await onUpdateRecord(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEditNote = (rec: AttendanceRecord) => {
    setEditingNoteId(rec.id);
    setNoteText(rec.catatan || '');
  };

  const handleSaveNote = async (record: AttendanceRecord) => {
    setIsUpdating(true);
    try {
      const updated: AttendanceRecord = {
        ...record,
        catatan: noteText.trim(),
        waktuSimpan: new Date().toISOString(),
        updatedBy: currentUser?.nama || record.updatedBy || 'Guru/Operator',
      };
      await onUpdateRecord(updated);
      setEditingNoteId(null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-bold text-blue-200 uppercase tracking-wider">
                Rincian Kehadiran Siswa
              </span>
              <span className="text-xs text-blue-200 font-semibold">
                Kelas {student.kelas} · {student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {student.nama}
            </h2>
            <p className="text-xs text-blue-200/80">
              NISN: <span className="font-mono font-bold text-white">{student.nisn || student.nipd || '-'}</span> · Periode: <span className="text-amber-300 font-semibold">{periodLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable Status Summary Pills */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80">
          <p className="text-[11px] font-bold text-slate-500 mb-2">
            Klik status untuk memfilter rincian tanggal atau ubah langsung di bawah:
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* All */}
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Semua Riwayat</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                {counts.total}
              </span>
            </button>

            {/* Hadir */}
            <button
              onClick={() => setActiveFilter('H')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'H'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Hadir (H)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-100/40 text-[10px] font-bold">
                {counts.h}
              </span>
            </button>

            {/* Sakit */}
            <button
              onClick={() => setActiveFilter('S')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'S'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Sakit (S)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-100/40 text-[10px] font-bold">
                {counts.s}
              </span>
            </button>

            {/* Izin */}
            <button
              onClick={() => setActiveFilter('I')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'I'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Izin (I)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-sky-100/40 text-[10px] font-bold">
                {counts.i}
              </span>
            </button>

            {/* Alpa */}
            <button
              onClick={() => setActiveFilter('A')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'A'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Alpa (A)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-rose-100/40 text-[10px] font-bold">
                {counts.a}
              </span>
            </button>

            {/* Terlambat */}
            {terlambatEnabled && (
              <button
                onClick={() => setActiveFilter('T')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeFilter === 'T'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Lambat (T)</span>
                <span className="px-1.5 py-0.2 rounded-md bg-purple-100/40 text-[10px] font-bold">
                  {counts.t}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Records List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                {activeFilter === 'all'
                  ? 'Belum ada rekaman absensi untuk siswa ini pada periode ini.'
                  : `Tidak ada riwayat dengan status "${activeFilter}" pada periode ini.`}
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  Tampilkan Semua ({counts.total} catatan)
                </button>
              )}
            </div>
          ) : (
            displayedRecords.map((rec) => {
              const isEditingThisNote = editingNoteId === rec.id;
              return (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Date and Day */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {rec.tanggal.split('-')[2]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {formatDateIndonesian(rec.tanggal)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Dicatat: {rec.updatedBy || 'Guru'} · {rec.waktuSimpan ? new Date(rec.waktuSimpan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Buttons [H] [S] [I] [A] [T] */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      {/* Hadir */}
                      <button
                        onClick={() => handleStatusChange(rec, 'H')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                          rec.status === 'H'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title="Klik untuk ubah jadi Hadir"
                      >
                        H
                      </button>

                      {/* Sakit */}
                      <button
                        onClick={() => handleStatusChange(rec, 'S')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                          rec.status === 'S'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title="Klik untuk ubah jadi Sakit"
                      >
                        S
                      </button>

                      {/* Izin */}
                      <button
                        onClick={() => handleStatusChange(rec, 'I')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                          rec.status === 'I'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                        }`}
                        title="Klik untuk ubah jadi Izin"
                      >
                        I
                      </button>

                      {/* Alpa */}
                      <button
                        onClick={() => handleStatusChange(rec, 'A')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                          rec.status === 'A'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                        title="Klik untuk ubah jadi Alpa"
                      >
                        A
                      </button>

                      {/* Terlambat */}
                      {terlambatEnabled && (
                        <button
                          onClick={() => handleStatusChange(rec, 'T')}
                          disabled={isUpdating}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                            rec.status === 'T'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                          title="Klik untuk ubah jadi Terlambat"
                        >
                          T
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note / Catatan Row */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {isEditingThisNote ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Tulis alasan / keterangan kehadiran..."
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNote(rec)}
                          disabled={isUpdating}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Simpan</span>
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-600 flex-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="italic">
                          {rec.catatan ? `"${rec.catatan}"` : 'Tidak ada catatan'}
                        </span>
                        <button
                          onClick={() => handleStartEditNote(rec)}
                          className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{rec.catatan ? 'Edit' : '+ Catatan'}</span>
                        </button>
                      </div>
                    )}

                    {/* Open in Daily Attendance */}
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToDaily(rec.tanggal, rec.kelas);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-700 transition"
                      title="Buka seluruh absensi kelas di tanggal ini pada menu Absensi Harian"
                    >
                      <span>Buka di Absensi Harian</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <p className="text-[11px] text-slate-500">
            Perubahan status atau catatan langsung disimpan ke IndexedDB lokal.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
