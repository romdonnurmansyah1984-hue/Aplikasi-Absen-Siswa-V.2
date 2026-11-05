import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  UserCheck,
  ArrowRightLeft,
  CalendarCheck,
  ChevronRight,
  X,
  Edit2,
} from 'lucide-react';
import { SchoolClass, Student, Teacher, ActiveMenu } from '../../types';
import { saveClass, saveStudent } from '../../db/indexedDB';

interface ClassesViewProps {
  classes: SchoolClass[];
  teachers: Teacher[];
  students: Student[];
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  teachers,
  students,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('1');
  const [editingWaliModal, setEditingWaliModal] = useState<SchoolClass | null>(null);
  const [newWaliId, setNewWaliId] = useState<string>('');

  // Move student modal state
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>('1');

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = students
    .filter((s) => s.kelas === selectedClassId && s.status === 'Aktif')
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const handleOpenEditWali = (cls: SchoolClass) => {
    setEditingWaliModal(cls);
    setNewWaliId(cls.waliKelasId);
  };

  const handleSaveWali = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaliModal) return;

    const teacher = teachers.find((t) => t.id === newWaliId);
    if (!teacher) return;

    try {
      await saveClass({
        ...editingWaliModal,
        waliKelasId: teacher.id,
        namaWaliKelas: teacher.nama,
      });

      await onRefreshData();
      setEditingWaliModal(null);
      onShowToast(
        'success',
        'Wali Kelas Diperbarui',
        `${teacher.nama} sekarang adalah wali kelas ${editingWaliModal.nama}.`
      );
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Memperbarui', 'Tidak dapat memperbarui wali kelas.');
    }
  };

  const handleMoveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingStudent) return;

    try {
      await saveStudent({
        ...movingStudent,
        kelas: targetClassId,
      });

      await onRefreshData();
      const targetClassObj = classes.find((c) => c.id === targetClassId);
      onShowToast(
        'success',
        'Siswa Berhasil Dipindahkan',
        `${movingStudent.nama} berhasil dipindahkan ke ${targetClassObj?.nama}.`
      );
      setMovingStudent(null);
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Memindahkan', 'Tidak dapat memindahkan siswa.');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Rombongan Belajar
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Pengelolaan Kelas (1 - 6)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SDN 3 GODOG · Struktur Kelas, Wali Kelas, dan Penempatan Siswa
          </p>
        </div>

        <button
          onClick={() => onNavigate('absensi', selectedClassId)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Isi Absensi {currentClass?.nama}</span>
        </button>
      </div>

      {/* Class tabs / selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {classes.map((cls) => {
          const isSelected = cls.id === selectedClassId;
          const count = students.filter((s) => s.kelas === cls.id && s.status === 'Aktif').length;

          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`p-3.5 rounded-2xl border text-left transition ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold">{cls.nama}</span>
                <Users className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
              </div>
              <p
                className={`text-[11px] mt-1 truncate ${
                  isSelected ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                {cls.namaWaliKelas.split(',')[0]}
              </p>
              <div className="mt-2 text-xs font-bold tabular-nums">
                {count} Siswa
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Class Details & Student Roster */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        {/* Class Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Daftar Siswa {currentClass?.nama}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Wali Kelas: <strong>{currentClass?.namaWaliKelas}</strong>
              </span>
              <button
                onClick={() => handleOpenEditWali(currentClass)}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 ml-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Ganti Wali</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Siswa Aktif: <strong className="text-slate-800 tabular-nums">{classStudents.length} orang</strong>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-3 text-center">JK</th>
                <th className="py-3 px-4">NISN / NIPD</th>
                <th className="py-3 px-4">Nama Orang Tua</th>
                <th className="py-3 px-4">Alamat</th>
                <th className="py-3 px-3.5 text-center w-28">Pindah Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada siswa di {currentClass?.nama}.
                  </td>
                </tr>
              ) : (
                classStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {st.nama}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                          st.jk === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}
                      >
                        {st.jk}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 tabular-nums text-slate-600">
                      {st.nisn || st.nipd || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {st.namaOrtu || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                      {st.alamat || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => {
                          setMovingStudent(st);
                          setTargetClassId(st.kelas === '1' ? '2' : '1');
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 mx-auto"
                        title="Pindahkan siswa ke kelas lain"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                        <span>Pindah</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Wali Kelas Modal */}
      {editingWaliModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Pilih Wali {editingWaliModal.nama}
              </h2>
              <button
                onClick={() => setEditingWaliModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWali} className="mt-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Wali Kelas Baru</label>
                <select
                  value={newWaliId}
                  onChange={(e) => setNewWaliId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} ({t.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingWaliModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Student Modal */}
      {movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Pindahkan Siswa
              </h2>
              <button
                onClick={() => setMovingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMoveStudent} className="mt-4 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{movingStudent.nama}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kelas Saat Ini: <strong>Kelas {movingStudent.kelas}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Pindahkan Ke Rombel</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} (Wali: {c.namaWaliKelas})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMovingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
                >
                  Pindahkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
