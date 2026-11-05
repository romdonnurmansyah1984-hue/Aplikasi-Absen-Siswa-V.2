import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  FileSpreadsheet,
  X,
  UserCheck,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Student, SchoolClass, ActiveMenu, Gender, StudentStatus } from '../../types';
import { saveStudent, deleteStudent } from '../../db/indexedDB';
import { exportStudentsToExcel, downloadStudentTemplate } from '../../utils/exportUtils';
import { ConfirmModal } from '../common/ConfirmModal';

interface StudentsViewProps {
  students: Student[];
  classes: SchoolClass[];
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  classes,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'L' | 'P'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aktif' | 'Pindah'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  // Form input state
  const [formData, setFormData] = useState<{
    id: string;
    nisn: string;
    nipd: string;
    nama: string;
    jk: Gender;
    tempatLahir: string;
    tanggalLahir: string;
    alamat: string;
    namaOrtu: string;
    teleponOrtu: string;
    kelas: string;
    tahunMasuk: string;
    status: StudentStatus;
  }>({
    id: '',
    nisn: '',
    nipd: '',
    nama: '',
    jk: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    namaOrtu: '',
    teleponOrtu: '',
    kelas: '1',
    tahunMasuk: '2026',
    status: 'Aktif',
  });

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== 'all' && s.kelas !== selectedClass) return false;
      if (genderFilter !== 'all' && s.jk !== genderFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.nama.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          s.nipd.includes(q) ||
          s.alamat.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, selectedClass, genderFilter, statusFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      id: `std_${Date.now()}`,
      nisn: '',
      nipd: '',
      nama: '',
      jk: 'L',
      tempatLahir: 'Garut',
      tanggalLahir: '2018-01-01',
      alamat: 'Godog, Karangpawitan',
      namaOrtu: '',
      teleponOrtu: '',
      kelas: selectedClass !== 'all' ? selectedClass : '1',
      tahunMasuk: '2026',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      id: student.id,
      nisn: student.nisn || '',
      nipd: student.nipd || '',
      nama: student.nama,
      jk: student.jk,
      tempatLahir: student.tempatLahir || '',
      tanggalLahir: student.tanggalLahir || '',
      alamat: student.alamat || '',
      namaOrtu: student.namaOrtu || '',
      teleponOrtu: student.teleponOrtu || '',
      kelas: student.kelas,
      tahunMasuk: student.tahunMasuk || '2026',
      status: student.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      onShowToast('warning', 'Nama Wajib Diisi', 'Silakan masukkan nama lengkap siswa.');
      return;
    }

    try {
      const studentToSave: Student = {
        id: formData.id || formData.nisn || `std_${Date.now()}`,
        nisn: formData.nisn.trim(),
        nipd: formData.nipd.trim(),
        nama: formData.nama.trim().toUpperCase(),
        jk: formData.jk,
        tempatLahir: formData.tempatLahir.trim(),
        tanggalLahir: formData.tanggalLahir,
        alamat: formData.alamat.trim(),
        namaOrtu: formData.namaOrtu.trim(),
        teleponOrtu: formData.teleponOrtu.trim(),
        kelas: formData.kelas,
        tahunMasuk: formData.tahunMasuk,
        status: formData.status,
      };

      await saveStudent(studentToSave);
      await onRefreshData();
      setIsModalOpen(false);

      onShowToast(
        'success',
        editingStudent ? 'Siswa Diperbarui' : 'Siswa Ditambahkan',
        `Data ${studentToSave.nama} berhasil disimpan ke basis data lokal.`
      );
    } catch (err) {
      console.error('Save student error:', err);
      onShowToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data siswa.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudentId) return;
    try {
      await deleteStudent(deletingStudentId);
      await onRefreshData();
      setDeletingStudentId(null);
      onShowToast('info', 'Siswa Dihapus', 'Data siswa berhasil dihapus dari sistem.');
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Menghapus', 'Tidak dapat menghapus data siswa.');
    }
  };

  const handleExport = () => {
    const filename = `Data_Siswa_SDN_3_Godog_Kelas_${selectedClass}.xlsx`;
    exportStudentsToExcel(filteredStudents, filename);
    onShowToast('success', 'Ekspor Berhasil', `Data ${filteredStudents.length} siswa berhasil diunduh.`);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Data Pokok Pendidikan
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Data Master Siswa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · Total {students.length} Siswa Terdaftar (
              {students.filter((s) => s.status === 'Aktif').length} Aktif)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
              title="Unduh seluruh data siswa ke file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={() => onNavigate('kartu-siswa', selectedClass !== 'all' ? selectedClass : undefined)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
              title="Cetak kartu absensi barcode siswa"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Cetak Kartu Siswa</span>
            </button>

            <button
              onClick={() => onNavigate('ekspor-impor')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
              title="Impor siswa dari file Excel / CSV"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Impor Excel/CSV</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search query */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NISN, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden transition"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} ({students.filter((s) => s.kelas === c.id).length} siswa)
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | 'L' | 'P')}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua Jenis Kelamin</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Aktif' | 'Pindah')}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua Status Siswa</option>
            <option value="Aktif">Aktif</option>
            <option value="Pindah">Pindah / Mutasi</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-3 text-center">JK</th>
                <th className="py-3 px-4">NISN / NIPD</th>
                <th className="py-3 px-4">Tempat, Tgl Lahir</th>
                <th className="py-3 px-4">Orang Tua / Wali</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      <div>{st.nama}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                        {st.alamat || 'Alamat belum diisi'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      Kelas {st.kelas}
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
                      <div>{st.nisn || '-'}</div>
                      <div className="text-[10px] text-slate-400">{st.nipd || '-'}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {st.tempatLahir ? `${st.tempatLahir}, ` : ''}
                      {st.tanggalLahir || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="truncate max-w-[150px]">{st.namaOrtu || '-'}</div>
                      {st.teleponOrtu && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{st.teleponOrtu}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Siswa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingStudentId(st.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: AFIFA FATHIMA MUMTAZA GUMILAR"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* NISN */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NISN</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="10 digit nomor NISN"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* NIPD */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIPD / NIS</label>
                  <input
                    type="text"
                    value={formData.nipd}
                    onChange={(e) => setFormData({ ...formData, nipd: e.target.value })}
                    placeholder="Nomor Induk Peserta Didik"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Kelas */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kelas / Rombel *</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} (Wali: {c.namaWaliKelas})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jenis Kelamin *</label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        value="L"
                        checked={formData.jk === 'L'}
                        onChange={() => setFormData({ ...formData, jk: 'L' })}
                      />
                      <span>Laki-laki (L)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        value="P"
                        checked={formData.jk === 'P'}
                        onChange={() => setFormData({ ...formData, jk: 'P' })}
                      />
                      <span>Perempuan (P)</span>
                    </label>
                  </div>
                </div>

                {/* Tempat Lahir */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Contoh: Garut"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  />
                </div>

                {/* Nama Orang Tua */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={formData.namaOrtu}
                    onChange={(e) => setFormData({ ...formData, namaOrtu: e.target.value })}
                    placeholder="Ayah / Ibu / Wali"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Kontak Orang Tua */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. Kontak / Telepon</label>
                  <input
                    type="text"
                    value={formData.teleponOrtu}
                    onChange={(e) => setFormData({ ...formData, teleponOrtu: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Alamat */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Alamat Tempat Tinggal</label>
                  <input
                    type="text"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Contoh: Jl. Perum OMA Indah Blok E No. 20"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Status Siswa */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Keberadaan</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as StudentStatus })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pindah">Pindah / Mutasi</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>

                {/* Tahun Masuk */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tahun Masuk</label>
                  <input
                    type="text"
                    value={formData.tahunMasuk}
                    onChange={(e) => setFormData({ ...formData, tahunMasuk: e.target.value })}
                    placeholder="2026"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingStudentId}
        title="Hapus Data Siswa?"
        message="Data siswa ini akan dihapus dari daftar master siswa. Riwayat absensi yang pernah dicatat tetap tersimpan dalam log."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingStudentId(null)}
      />
    </div>
  );
};
