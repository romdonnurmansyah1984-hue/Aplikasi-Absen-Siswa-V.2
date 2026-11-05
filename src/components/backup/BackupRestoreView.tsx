import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  Student,
  Teacher,
  SchoolClass,
  AttendanceRecord,
  SchoolIdentity,
} from '../../types';
import {
  createFullBackup,
  restoreBackup,
  bulkSaveStudents,
  recordBackupDate,
  BackupData,
} from '../../db/indexedDB';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  parseStudentFile,
} from '../../utils/exportUtils';
import { formatDateIndonesian } from '../../utils/dateUtils';
import { ConfirmModal } from '../common/ConfirmModal';

interface BackupRestoreViewProps {
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  allAttendance: AttendanceRecord[];
  identity: SchoolIdentity;
  lastBackupDate: string | null;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  students,
  teachers,
  classes,
  allAttendance,
  identity,
  lastBackupDate,
  onShowToast,
  onRefreshData,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // JSON Restore states
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);

  // Student Excel/CSV Import states
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [showStudentImportModal, setShowStudentImportModal] = useState(false);
  const [studentImportMode, setStudentImportMode] = useState<'replace' | 'merge'>('merge');

  // Trigger JSON Backup Download
  const handleExportJson = async () => {
    try {
      setIsProcessing(true);
      const backup = await createFullBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backup, null, 2)
      )}`;

      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute(
        'download',
        `CADANGAN_ABSENSI_SDN_3_GODOG_${dateStr}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      await recordBackupDate();
      await onRefreshData();

      onShowToast(
        'success',
        'Cadangan Berhasil Dibuat!',
        `Seluruh data (${backup.students.length} siswa, ${backup.attendance.length} riwayat absensi) tersimpan dalam file JSON.`
      );
    } catch (err) {
      console.error('Export JSON error:', err);
      onShowToast('error', 'Gagal Membuat Cadangan', 'Terjadi kesalahan saat memproses data.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle JSON File selection & Validation
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;

        // Validation
        if (!parsed.appName || !parsed.students || !Array.isArray(parsed.students)) {
          throw new Error('Format file cadangan tidak valid atau rusak.');
        }

        setPendingBackup(parsed);
        setShowRestoreModal(true);
      } catch (err: any) {
        console.error('Invalid backup file:', err);
        onShowToast('error', 'File Tidak Valid', err.message || 'File JSON tidak sesuai.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Execute JSON Restore
  const handleExecuteRestore = async () => {
    if (!pendingBackup) return;
    setIsProcessing(true);
    try {
      const res = await restoreBackup(pendingBackup, restoreMode);
      await onRefreshData();
      setShowRestoreModal(false);
      setPendingBackup(null);

      onShowToast(
        'success',
        'Pemulihan Cadangan Berhasil!',
        `Data berhasil dipulihkan (${res.studentsCount} siswa, ${res.attendanceCount} absensi) dengan metode ${
          restoreMode === 'replace' ? 'Ganti Seluruh Data' : 'Gabung Data'
        }.`
      );
    } catch (err) {
      console.error('Restore error:', err);
      onShowToast('error', 'Gagal Memulihkan Data', 'Terjadi kesalahan saat memulihkan database.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Student Excel / CSV File upload
  const handleStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const list = await parseStudentFile(file);

      if (list.length === 0) {
        onShowToast('warning', 'File Kosong', 'Tidak ditemukan data siswa yang valid dalam file.');
        return;
      }

      setParsedStudents(list);
      setShowStudentImportModal(true);
    } catch (err: any) {
      console.error('Parse student file error:', err);
      onShowToast('error', 'Gagal Membaca File', 'Periksa format file Excel/CSV yang diunggah.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Execute Student Import
  const handleExecuteStudentImport = async () => {
    if (parsedStudents.length === 0) return;
    setIsProcessing(true);

    try {
      await bulkSaveStudents(parsedStudents);
      await onRefreshData();
      setShowStudentImportModal(false);
      setParsedStudents([]);

      onShowToast(
        'success',
        'Impor Siswa Berhasil!',
        `${parsedStudents.length} siswa berhasil dimasukkan ke basis data SDN 3 Godog.`
      );
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Gagal Mengimpor Siswa', 'Terjadi kesalahan saat menyimpan data siswa.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Keamanan & Pemindahan Data
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Ekspor, Impor & Cadangan Basis Data
          </h1>
        </div>
        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
          Semua data tersimpan secara mandiri di penyimpanan lokal perangkat (IndexedDB). Gunakan fitur cadangan (JSON) untuk mengamankan data atau memindahkan seluruh data absensi ke laptop/HP lain tanpa internet.
        </p>

        {/* Backup Status Alert */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-slate-600">
              Status Cadangan Terakhir:{' '}
              {lastBackupDate ? (
                <strong className="text-emerald-700">
                  {formatDateIndonesian(lastBackupDate.split('T')[0])} (
                  {new Date(lastBackupDate).toLocaleTimeString('id-ID')})
                </strong>
              ) : (
                <strong className="text-amber-700">Belum pernah membuat cadangan</strong>
              )}
            </span>
          </div>

          <button
            onClick={handleExportJson}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Cadangkan Sekarang (JSON)</span>
          </button>
        </div>
      </div>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: CADANGAN LENGKAP SISTEM (JSON) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              1. Cadangan Lengkap Sistem (JSON)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Mencadangkan seluruh data SDN 3 Godog: 106+ Siswa, Guru & Wali Kelas, Rombel Kelas 1-6, Pengaturan Sekolah, serta seluruh Riwayat Absensi ke dalam 1 file JSON aman.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Data Siswa:</span>
                <strong className="text-slate-900 tabular-nums">{students.length} siswa</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Riwayat Absensi:</span>
                <strong className="text-slate-900 tabular-nums">
                  {allAttendance.length} catatan
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Guru & Wali Kelas:</span>
                <strong className="text-slate-900 tabular-nums">{teachers.length} guru</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={isProcessing}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File Cadangan</span>
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Pulihkan dari Cadangan</span>
            </button>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleJsonFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Card 2: IMPOR & EKSPOR SISWA (EXCEL/CSV) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              2. Impor & Ekspor Data Siswa (Excel / CSV)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Memasukkan data siswa secara massal dari file Excel Dapodik atau format CSV resmi, dan mengekspor daftar siswa sekolah.
            </p>

            <div className="mt-4 p-3 bg-emerald-50/30 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Format Otomatis Sesuai Templat</span>
              </p>
              <p className="text-[11px] text-emerald-700">
                Gunakan templat resmi untuk menghindari kesalahan kolom (NISN, Nama, JK, Kelas, Nama Ortu).
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportStudentsToExcel(students)}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Siswa</span>
            </button>

            <button
              onClick={() => studentFileInputRef.current?.click()}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Unggah File Siswa</span>
            </button>
            <input
              type="file"
              ref={studentFileInputRef}
              onChange={handleStudentFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              onClick={downloadStudentTemplate}
              className="w-full py-1.5 text-[11px] font-bold text-blue-600 hover:underline flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Unduh Templat Excel Siswa Kosong</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON Restore Confirmation Modal with Preview */}
      {showRestoreModal && pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau & Konfirmasi Pemulihan Data
                </h3>
                <p className="text-xs text-slate-500">File Cadangan Valid Terdeteksi</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Asal Aplikasi:</span>
                  <strong className="text-slate-900">{pendingBackup.appName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Dibuat:</span>
                  <strong className="text-slate-900">
                    {formatDateIndonesian(pendingBackup.timestamp.split('T')[0])}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Siswa:</span>
                  <strong className="text-blue-600 tabular-nums">
                    {pendingBackup.students?.length || 0} siswa
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Riwayat Absensi:</span>
                  <strong className="text-blue-600 tabular-nums">
                    {pendingBackup.attendance?.length || 0} catatan
                  </strong>
                </div>
              </div>

              {/* Restore Mode Choice */}
              <div className="space-y-2 pt-2">
                <label className="font-bold text-slate-800">Pilih Metode Pemulihan:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between ${
                      restoreMode === 'merge'
                        ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                      />
                      <span className="font-bold text-slate-900">Gabungkan (Merge)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Menambahkan data baru tanpa menghapus data yang sudah ada di perangkat.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between ${
                      restoreMode === 'replace'
                        ? 'border-amber-600 bg-amber-50/40 ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                      />
                      <span className="font-bold text-amber-900">Ganti Bersih (Replace)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Menimpa seluruh data lokal dengan data persis di file cadangan ini.
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingBackup(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
              >
                {isProcessing ? 'Memulihkan...' : 'Lanjutkan Pemulihan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Import Modal with Preview */}
      {showStudentImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Impor Siswa ({parsedStudents.length} Data)
                </h3>
                <p className="text-xs text-slate-500">Periksa sampel data sebelum disimpan</p>
              </div>
              <button
                onClick={() => setShowStudentImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Preview Sample Table (first 5 rows) */}
            <div className="my-4 max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 w-8">No</th>
                    <th className="p-2">Nama Siswa</th>
                    <th className="p-2">NISN</th>
                    <th className="p-2">JK</th>
                    <th className="p-2">Kelas</th>
                    <th className="p-2">Orang Tua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedStudents.slice(0, 8).map((st, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-400 font-bold">{i + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{st.nama}</td>
                      <td className="p-2 tabular-nums">{st.nisn || '-'}</td>
                      <td className="p-2 text-center">{st.jk}</td>
                      <td className="p-2">Kelas {st.kelas}</td>
                      <td className="p-2 text-slate-600">{st.namaOrtu || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedStudents.length > 8 && (
              <p className="text-[11px] text-slate-500 italic mb-3">
                ... dan {parsedStudents.length - 8} siswa lainnya siap dimasukkan.
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowStudentImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteStudentImport}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95"
              >
                {isProcessing ? 'Menyimpan...' : `Simpan ${parsedStudents.length} Siswa`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
