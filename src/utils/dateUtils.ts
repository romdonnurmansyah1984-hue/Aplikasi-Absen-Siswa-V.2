const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateIndonesian(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const hari = HARI_INDONESIA[d.getDay()];
  const tgl = d.getDate();
  const bln = BULAN_INDONESIA[d.getMonth()];
  const thn = d.getFullYear();

  return `${hari}, ${tgl} ${bln} ${thn}`;
}

export function formatDateShort(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const tgl = String(d.getDate()).padStart(2, '0');
  const bln = String(d.getMonth() + 1).padStart(2, '0');
  const thn = d.getFullYear();

  return `${tgl}/${bln}/${thn}`;
}

export function getMonthName(monthIndex: number): string {
  return BULAN_INDONESIA[monthIndex] || '';
}

export function getIndonesianDayName(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  return HARI_INDONESIA[d.getDay()] || '';
}

export function isSunday(dateInput: string | Date): boolean {
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  return d.getDay() === 0;
}

// Generate an array of dates between start and end (inclusive, YYYY-MM-DD), skipping Sundays
export function getSchoolDaysInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (current <= end) {
    if (current.getDay() !== 0) {
      // Exclude Sunday
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
