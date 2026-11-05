import { SchoolIdentity, SchoolClass, Teacher, UserAccount, AttendanceRecord } from '../types';
import { INITIAL_STUDENTS } from './initialStudents';

export const INITIAL_SCHOOL_IDENTITY: SchoolIdentity = {
  namaSekolah: 'SDN 3 GODOG',
  npsn: '20226020',
  statusSekolah: 'Sekolah Negeri',
  alamat: 'Jl. Perum OMA Indah',
  desa: 'Desa Godog',
  kecamatan: 'Kecamatan Karangpawitan',
  kabupaten: 'Kabupaten Garut',
  provinsi: 'Jawa Barat',
  kodePos: '44182',
  email: 'sdn3godog@gmail.com',
  tahunAjaran: '2026/2027',
  semesterAktif: 'Semester 1',
  namaKepalaSekolah: 'Siti Jenab, S.Pd.',
  nipKepalaSekolah: '19680512 199203 2 004',
  terlambatEnabled: true,
};

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't_ks',
    nip: '19680512 199203 2 004',
    nama: 'Siti Jenab, S.Pd.',
    jabatan: 'Kepala Sekolah',
    telepon: '081223456789',
    email: 'sitijenab@sdn3godog.sch.id',
  },
  {
    id: 't_1',
    nip: '19750315 200501 2 006',
    nama: 'Mimin Setiawati, S.Pd.',
    jabatan: 'Guru Kelas 1',
    kelasBinaan: '1',
    telepon: '081321456001',
    email: 'mimin.setiawati@sdn3godog.sch.id',
  },
  {
    id: 't_2',
    nip: '19820718 200801 2 011',
    nama: 'Indriyanti, S.Pd.',
    jabatan: 'Guru Kelas 2',
    kelasBinaan: '2',
    telepon: '081321456002',
    email: 'indriyanti@sdn3godog.sch.id',
  },
  {
    id: 't_3',
    nip: '19850920 201001 2 008',
    nama: 'Yuli, S.Pd.',
    jabatan: 'Guru Kelas 3',
    kelasBinaan: '3',
    telepon: '081321456003',
    email: 'yuli@sdn3godog.sch.id',
  },
  {
    id: 't_4',
    nip: '19801124 200604 1 007',
    nama: 'Hindra Gunawan Triwansyah, S.Pd., M.Pd.',
    jabatan: 'Guru Kelas 4',
    kelasBinaan: '4',
    telepon: '081321456004',
    email: 'hindra.triwansyah@sdn3godog.sch.id',
  },
  {
    id: 't_5',
    nip: '19900214 201502 2 003',
    nama: 'Anggi, S.Pd.',
    jabatan: 'Guru Kelas 5',
    kelasBinaan: '5',
    telepon: '081321456005',
    email: 'anggi@sdn3godog.sch.id',
  },
  {
    id: 't_6',
    nip: '19930410 201903 2 015',
    nama: 'Sindi, S.Pd.',
    jabatan: 'Guru Kelas 6',
    kelasBinaan: '6',
    telepon: '081321456006',
    email: 'sindi@sdn3godog.sch.id',
  },
  {
    id: 't_op',
    nip: '19840815 201101 1 002',
    nama: 'Romdon Nurmansyah',
    jabatan: 'Operator Sekolah / Pengelola Dapodik',
    telepon: '081223998877',
    email: 'romdonnurmansyah1984@gmail.com',
  },
];

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: '1',
    nama: 'Kelas 1',
    waliKelasId: 't_1',
    namaWaliKelas: 'Mimin Setiawati, S.Pd.',
    tingkat: 1,
  },
  {
    id: '2',
    nama: 'Kelas 2',
    waliKelasId: 't_2',
    namaWaliKelas: 'Indriyanti, S.Pd.',
    tingkat: 2,
  },
  {
    id: '3',
    nama: 'Kelas 3',
    waliKelasId: 't_3',
    namaWaliKelas: 'Yuli, S.Pd.',
    tingkat: 3,
  },
  {
    id: '4',
    nama: 'Kelas 4',
    waliKelasId: 't_4',
    namaWaliKelas: 'Hindra Gunawan Triwansyah, S.Pd., M.Pd.',
    tingkat: 4,
  },
  {
    id: '5',
    nama: 'Kelas 5',
    waliKelasId: 't_5',
    namaWaliKelas: 'Anggi, S.Pd.',
    tingkat: 5,
  },
  {
    id: '6',
    nama: 'Kelas 6',
    waliKelasId: 't_6',
    namaWaliKelas: 'Sindi, S.Pd.',
    tingkat: 6,
  },
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u_admin',
    username: 'operator',
    nama: 'Romdon Nurmansyah (Operator Sekolah)',
    role: 'admin',
    passwordHash: 'admin123',
  },
  {
    id: 'u_g1',
    username: 'guru1',
    nama: 'Mimin Setiawati, S.Pd.',
    role: 'guru',
    kelasAkses: '1',
    passwordHash: 'guru123',
  },
  {
    id: 'u_g2',
    username: 'guru2',
    nama: 'Indriyanti, S.Pd.',
    role: 'guru',
    kelasAkses: '2',
    passwordHash: 'guru123',
  },
  {
    id: 'u_g3',
    username: 'guru3',
    nama: 'Yuli, S.Pd.',
    role: 'guru',
    kelasAkses: '3',
    passwordHash: 'guru123',
  },
  {
    id: 'u_g4',
    username: 'guru4',
    nama: 'Hindra Gunawan Triwansyah, S.Pd., M.Pd.',
    role: 'guru',
    kelasAkses: '4',
    passwordHash: 'guru123',
  },
  {
    id: 'u_g5',
    username: 'guru5',
    nama: 'Anggi, S.Pd.',
    role: 'guru',
    kelasAkses: '5',
    passwordHash: 'guru123',
  },
  {
    id: 'u_g6',
    username: 'guru6',
    nama: 'Sindi, S.Pd.',
    role: 'guru',
    kelasAkses: '6',
    passwordHash: 'guru123',
  },
];

// Helper to generate seed attendance records for recent school days
export function generateSeedAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const now = new Date();
  
  // Create sample history for previous 3 school days so graphs have realistic data
  const sampleDates: string[] = [];
  for (let d = 3; d >= 1; d--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - d);
    // skip Sunday (0)
    if (targetDate.getDay() !== 0) {
      sampleDates.push(targetDate.toISOString().split('T')[0]);
    }
  }

  sampleDates.forEach((dateStr, dIdx) => {
    INITIAL_STUDENTS.forEach((student, sIdx) => {
      // Deterministic realistic attendance: mostly Hadir, rare Sakit/Izin/Alpa
      const hash = (sIdx * 17 + dIdx * 31) % 100;
      let status: 'H' | 'S' | 'I' | 'A' | 'T' = 'H';
      let catatan = '';

      if (hash === 7 || hash === 47) {
        status = 'S';
        catatan = 'Sakit demam / flu';
      } else if (hash === 23 || hash === 73) {
        status = 'I';
        catatan = 'Izin keperluan keluarga';
      } else if (hash === 91) {
        status = 'A';
        catatan = 'Tanpa keterangan';
      } else if (hash === 15) {
        status = 'T';
        catatan = 'Terlambat 15 menit';
      }

      records.push({
        id: `${dateStr}_${student.id}`,
        tanggal: dateStr,
        kelas: student.kelas,
        studentId: student.id,
        namaSiswa: student.nama,
        nisn: student.nisn,
        status,
        catatan,
        waktuSimpan: `${dateStr}T07:45:00.000Z`,
        updatedBy: 'Sistem Inisialisasi',
      });
    });
  });

  return records;
}
