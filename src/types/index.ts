export type Gender = 'L' | 'P';

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A' | 'T' | null;

export type StudentStatus = 'Aktif' | 'Pindah' | 'Lulus';

export interface Student {
  id: string; // usually NISN or generated
  nipd: string;
  nisn: string;
  nama: string;
  jk: Gender;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  namaOrtu: string;
  teleponOrtu: string;
  kelas: string; // '1', '2', '3', '4', '5', '6'
  tahunMasuk: string;
  status: StudentStatus;
}

export interface Teacher {
  id: string;
  nip: string;
  nama: string;
  jabatan: string; // 'Guru Kelas 1', 'Kepala Sekolah', etc.
  kelasBinaan?: string; // '1' - '6'
  telepon: string;
  email: string;
}

export interface SchoolClass {
  id: string; // '1', '2', '3', '4', '5', '6'
  nama: string; // 'Kelas 1', 'Kelas 2', etc.
  waliKelasId: string;
  namaWaliKelas: string;
  tingkat: number;
}

export interface AttendanceRecord {
  id: string; // `${date}_${studentId}`
  tanggal: string; // YYYY-MM-DD
  kelas: string; // '1' - '6'
  studentId: string;
  namaSiswa: string;
  nisn: string;
  status: AttendanceStatus;
  catatan?: string;
  waktuSimpan: string; // ISO string
  updatedBy: string;
}

export interface UserAccount {
  id: string;
  username: string;
  nama: string;
  role: 'admin' | 'guru';
  kelasAkses?: string; // e.g. '1' for Guru Kelas 1, or undefined for admin
  passwordHash: string; // simple hashed or protected string
}

export interface SchoolIdentity {
  namaSekolah: string;
  npsn: string;
  statusSekolah: string;
  alamat: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  email: string;
  tahunAjaran: string; // '2026/2027'
  semesterAktif: 'Semester 1' | 'Semester 2';
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  terlambatEnabled: boolean;
}

export interface DailyAttendanceDraft {
  kelas: string;
  tanggal: string;
  records: Record<string, { status: AttendanceStatus; catatan: string }>;
  lastUpdated: string;
}

export interface ClassSummary {
  kelas: string;
  totalSiswa: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  terlambat: number;
  belumDiabsen: number;
  persentase: number;
}

export type ActiveMenu =
  | 'dashboard'
  | 'absensi'
  | 'scan-kamera'
  | 'kartu-siswa'
  | 'siswa'
  | 'guru'
  | 'kelas'
  | 'rekap'
  | 'laporan'
  | 'ekspor-impor'
  | 'pengaturan';
