import React, { useState } from 'react';
import { UserCheck, Plus, Edit, Trash2, Phone, Mail, Award, X } from 'lucide-react';
import { Teacher, SchoolClass } from '../../types';
import { saveTeacher, deleteTeacher, saveClass } from '../../db/indexedDB';
import { ConfirmModal } from '../common/ConfirmModal';

interface TeachersViewProps {
  teachers: Teacher[];
  classes: SchoolClass[];
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  classes,
  onShowToast,
  onRefreshData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Teacher>({
    id: '',
    nip: '',
    nama: '',
    jabatan: 'Guru Kelas',
    kelasBinaan: '1',
    telepon: '',
    email: '',
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      id: `t_${Date.now()}`,
      nip: '',
      nama: '',
      jabatan: 'Guru Kelas',
      kelasBinaan: '1',
      telepon: '',
      email: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ ...teacher });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      onShowToast('warning', 'Nama Wajib Diisi', 'Silakan masukkan nama guru.');
      return;
    }

    try {
      await saveTeacher(formData);

      // If assigned to a class as wali kelas, also update that class
      if (formData.kelasBinaan) {
        const cls = classes.find((c) => c.id === formData.kelasBinaan);
        if (cls) {
          await saveClass({
            ...cls,
            waliKelasId: formData.id,
            namaWaliKelas: formData.nama,
          });
        }
      }

      await onRefreshData();
      setIsModalOpen(false);
      onShowToast('success', 'Data Guru Disimpan', `Data ${formData.nama} berhasil disimpan.`);
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data guru.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTeacherId) return;
    try {
      await deleteTeacher(deletingTeacherId);
      await onRefreshData();
      setDeletingTeacherId(null);
      onShowToast('info', 'Guru Dihapus', 'Data guru berhasil dihapus.');
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Menghapus', 'Tidak dapat menghapus data guru.');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Tenaga Pendidik
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Data Guru & Wali Kelas
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SDN 3 GODOG · Daftar Guru Kelas 1-6 & Tenaga Kependidikan
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru</span>
        </button>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-sm flex items-center justify-center">
                    {teacher.nama
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {teacher.nama}
                    </h3>
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                      {teacher.jabatan}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit Data Guru"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTeacherId(teacher.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Hapus Guru"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between text-slate-500">
                  <span>NIP / NUPTK:</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {teacher.nip || '-'}
                  </span>
                </div>
                {teacher.telepon && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.telepon}</span>
                  </div>
                )}
                {teacher.email && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                )}
              </div>
            </div>

            {teacher.kelasBinaan && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Kelas Diampu:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Kelas {teacher.kelasBinaan}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Mimin Setiawati, S.Pd."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">NIP / Karpeg</label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="19750315..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Jabatan *</label>
                <input
                  type="text"
                  required
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  placeholder="Contoh: Guru Kelas 1 / Kepala Sekolah"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Wali Kelas Untuk</label>
                <select
                  value={formData.kelasBinaan || ''}
                  onChange={(e) => setFormData({ ...formData, kelasBinaan: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">Bukan Wali Kelas</option>
                  <option value="1">Kelas 1</option>
                  <option value="2">Kelas 2</option>
                  <option value="3">Kelas 3</option>
                  <option value="4">Kelas 4</option>
                  <option value="5">Kelas 5</option>
                  <option value="6">Kelas 6</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nama@sdn3godog.sch.id"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTeacherId}
        title="Hapus Data Guru?"
        message="Apakah Anda yakin ingin menghapus guru ini dari daftar pendidik?"
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTeacherId(null)}
      />
    </div>
  );
};
