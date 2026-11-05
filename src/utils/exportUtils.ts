import * as XLSX from 'xlsx';
import { Student, AttendanceRecord } from '../types';

export function exportStudentsToExcel(students: Student[], filename = 'Data_Siswa_SDN_3_Godog.xlsx') {
  const data = students.map((s, index) => ({
    'No': index + 1,
    'NISN': s.nisn,
    'NIPD': s.nipd,
    'Nama Siswa': s.nama,
    'JK': s.jk,
    'Kelas': `Kelas ${s.kelas}`,
    'Tempat Lahir': s.tempatLahir,
    'Tanggal Lahir': s.tanggalLahir,
    'Alamat': s.alamat,
    'Nama Orang Tua / Wali': s.namaOrtu,
    'No Telepon Ortu': s.teleponOrtu,
    'Tahun Masuk': s.tahunMasuk,
    'Status': s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

  // Generate buffer and trigger browser download
  XLSX.writeFile(workbook, filename);
}

export function exportAttendanceRecapToExcel(
  rows: Array<{
    no: number;
    nama: string;
    nisn: string;
    kelas: string;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
    totalPertemuan: number;
    persentase: string;
  }>,
  title = 'Rekap_Absensi_SDN_3_Godog.xlsx'
) {
  const data = rows.map((r) => ({
    'No': r.no,
    'Nama Siswa': r.nama,
    'NISN': r.nisn,
    'Kelas': r.kelas,
    'Hadir (H)': r.hadir,
    'Sakit (S)': r.sakit,
    'Izin (I)': r.izin,
    'Alpa (A)': r.alpa,
    'Terlambat (T)': r.terlambat,
    'Hari Absensi': r.totalPertemuan,
    'Persentase Kehadiran': r.persentase,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kehadiran');

  XLSX.writeFile(workbook, title);
}

export function downloadStudentTemplate() {
  const templateRows = [
    {
      'NISN': '3205001122',
      'NIPD': '2627010099',
      'Nama Siswa': 'CONTOH NAMA SISWA',
      'JK': 'L',
      'Kelas': '1',
      'Tempat Lahir': 'Garut',
      'Tanggal Lahir': '2019-05-15',
      'Alamat': 'Jl. Perum OMA Indah Blok A No. 1',
      'Nama Orang Tua': 'Ahmad Fauzi / Siti Aminah',
      'No Telepon Ortu': '081234567890',
      'Tahun Masuk': '2026',
      'Status': 'Aktif',
    },
    {
      'NISN': '3205001123',
      'NIPD': '2627010100',
      'Nama Siswa': 'CONTOH NAMA SISWA KEDUA',
      'JK': 'P',
      'Kelas': '2',
      'Tempat Lahir': 'Garut',
      'Tanggal Lahir': '2018-08-20',
      'Alamat': 'Kp. Wates Girang Godog',
      'Nama Orang Tua': 'Budi Santoso',
      'No Telepon Ortu': '089876543210',
      'Tahun Masuk': '2025',
      'Status': 'Aktif',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Templat Siswa');

  XLSX.writeFile(workbook, 'Templat_Import_Siswa_SDN_3_Godog.xlsx');
}

export async function parseStudentFile(file: File): Promise<Student[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const students: Student[] = [];

  for (const row of rawRows) {
    // Flexible header mapping
    const nama = (row['Nama Siswa'] || row['Nama'] || row['NAMA'] || row['nama'] || '').toString().trim();
    if (!nama) continue; // Skip empty rows

    const nisn = (row['NISN'] || row['nisn'] || '').toString().trim();
    const nipd = (row['NIPD'] || row['NIS'] || row['nipd'] || row['nis'] || '').toString().trim();
    let jkRaw = (row['JK'] || row['Jenis Kelamin'] || row['jk'] || 'L').toString().trim().toUpperCase();
    const jk: 'L' | 'P' = jkRaw.startsWith('P') ? 'P' : 'L';

    let kelasRaw = (row['Kelas'] || row['kelas'] || row['Rombel'] || '1').toString().trim();
    // Normalize "Kelas 1" -> "1"
    const kelasMatch = kelasRaw.match(/[1-6]/);
    const kelas = kelasMatch ? kelasMatch[0] : '1';

    const tempatLahir = (row['Tempat Lahir'] || row['Tempat'] || '').toString().trim();
    const tanggalLahir = (row['Tanggal Lahir'] || row['Tgl Lahir'] || '').toString().trim();
    const alamat = (row['Alamat'] || '').toString().trim();
    const namaOrtu = (row['Nama Orang Tua'] || row['Nama Orang Tua / Wali'] || row['Orang Tua'] || '').toString().trim();
    const teleponOrtu = (row['No Telepon Ortu'] || row['Telepon'] || row['HP'] || '').toString().trim();
    const tahunMasuk = (row['Tahun Masuk'] || '2026').toString().trim();
    const statusRaw = (row['Status'] || 'Aktif').toString().trim();
    const status: 'Aktif' | 'Pindah' | 'Lulus' = statusRaw === 'Pindah' ? 'Pindah' : statusRaw === 'Lulus' ? 'Lulus' : 'Aktif';

    const id = nisn || nipd || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    students.push({
      id,
      nisn: nisn || id,
      nipd: nipd || '',
      nama,
      jk,
      tempatLahir,
      tanggalLahir,
      alamat,
      namaOrtu,
      teleponOrtu,
      kelas,
      tahunMasuk,
      status,
    });
  }

  return students;
}
