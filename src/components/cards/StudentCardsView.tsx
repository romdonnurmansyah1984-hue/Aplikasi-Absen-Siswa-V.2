import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer,
  Search,
  Filter,
  Download,
  Camera,
  Grid,
  CreditCard,
  CheckCircle,
  Sparkles,
  School,
  QrCode,
  Barcode as BarcodeIcon,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Student, SchoolClass, SchoolIdentity, ActiveMenu } from '../../types';

interface StudentCardsViewProps {
  students: Student[];
  classes: SchoolClass[];
  identity: SchoolIdentity;
  initialClass?: string;
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

// Single Printable Student Card Component
const SingleStudentCard: React.FC<{
  student: Student;
  identity: SchoolIdentity;
  barcodeFormat: 'both' | 'qr' | 'barcode';
  classNameObj?: SchoolClass;
  onSinglePrint?: () => void;
}> = ({ student, identity, barcodeFormat, classNameObj, onSinglePrint }) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // The primary identifier encoded: NISN (preferred) or NIPD or ID
  const codeValue = student.nisn || student.nipd || student.id;

  useEffect(() => {
    // Generate QR Code
    if (qrCanvasRef.current && (barcodeFormat === 'both' || barcodeFormat === 'qr')) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        codeValue,
        {
          width: 80,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }

    // Generate 1D Barcode (Code128)
    if (barcodeSvgRef.current && (barcodeFormat === 'both' || barcodeFormat === 'barcode')) {
      try {
        JsBarcode(barcodeSvgRef.current, codeValue, {
          format: 'CODE128',
          width: 1.2,
          height: 32,
          displayValue: true,
          text: codeValue,
          font: 'monospace',
          fontSize: 9,
          textMargin: 1,
          margin: 2,
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.warn('Barcode generation failed for:', codeValue, err);
      }
    }
  }, [codeValue, barcodeFormat]);

  return (
    <div className="printable-card relative bg-white border border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between text-slate-800 p-3 sm:p-3.5 w-full max-w-[360px] mx-auto select-none print:shadow-none print:border-slate-400 print:rounded-xl print:p-2.5 print:max-w-none print:w-full print:break-inside-avoid">
      {/* Decorative Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500" />

      {/* Header Kop Kartu */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <img
          src="/icon.svg"
          alt="SDN 3 Godog"
          className="w-9 h-9 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-200 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-wider uppercase text-blue-800 leading-tight">
            KARTU ABSENSI SISWA
          </p>
          <h4 className="text-xs font-black tracking-tight text-slate-900 leading-tight truncate">
            {identity.namaSekolah}
          </h4>
          <p className="text-[8.5px] text-slate-500 leading-tight truncate">
            NPSN: {identity.npsn} · TA {identity.tahunAjaran}
          </p>
        </div>
      </div>

      {/* Middle Body: Avatar / Photo + Student Details */}
      <div className="py-2.5 flex items-start gap-3">
        {/* Photo Avatar Badge */}
        <div className="w-14 h-18 rounded-xl bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 flex flex-col items-center justify-center shrink-0 overflow-hidden relative shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs mt-1">
            {student.jk === 'L' ? '👦' : '👧'}
          </div>
          <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">
            {student.jk === 'L' ? 'LAKI' : 'PEREMP'}
          </span>
          <span className="text-[7.5px] font-extrabold text-blue-700 bg-blue-50/80 px-1 rounded-sm mt-0.5">
            KLS {student.kelas}
          </span>
        </div>

        {/* Student Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Nama Lengkap</p>
            <p className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">
              {student.nama}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[9px] pt-0.5">
            <div>
              <p className="text-[7.5px] text-slate-400 font-bold uppercase">NISN</p>
              <p className="font-mono font-bold text-slate-800 truncate">
                {student.nisn || '-'}
              </p>
            </div>
            <div>
              <p className="text-[7.5px] text-slate-400 font-bold uppercase">Kelas</p>
              <p className="font-bold text-blue-800">
                Kelas {student.kelas}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Codes Area (QR Code & 1D Barcode) */}
      <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-center bg-slate-50/60 rounded-xl p-1.5">
        <div className="flex items-center justify-center gap-2 w-full">
          {/* QR Code Canvas */}
          {(barcodeFormat === 'both' || barcodeFormat === 'qr') && (
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex flex-col items-center shadow-2xs shrink-0">
              <canvas ref={qrCanvasRef} className="w-16 h-16 sm:w-18 sm:h-18 object-contain" />
              <span className="text-[7px] text-slate-400 font-mono mt-0.5 font-bold">QR SCAN</span>
            </div>
          )}

          {/* 1D Linear Barcode SVG */}
          {(barcodeFormat === 'both' || barcodeFormat === 'barcode') && (
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex-1 flex flex-col items-center justify-center overflow-hidden shadow-2xs">
              <svg ref={barcodeSvgRef} className="w-full max-h-12 object-contain" />
            </div>
          )}
        </div>

        <p className="text-[7.5px] text-slate-400 font-medium text-center mt-1">
          Tunjukkan kode ini ke kamera aplikasi untuk absensi otomatis
        </p>
      </div>

      {/* Print-only Footer Validator */}
      <div className="hidden print:flex items-center justify-between pt-1 border-t border-slate-100 text-[6.5px] text-slate-400 mt-1">
        <span>SDN 3 GODOG · Garut</span>
        <span>Kepala Sekolah: {identity.namaKepalaSekolah}</span>
      </div>
    </div>
  );
};

export const StudentCardsView: React.FC<StudentCardsViewProps> = ({
  students,
  classes,
  identity,
  initialClass,
  onNavigate,
  onShowToast,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeFormat, setBarcodeFormat] = useState<'both' | 'qr' | 'barcode'>('both');
  const [cardGridCols, setCardGridCols] = useState<'2' | '3'>('3');

  // Filter students
  const filteredStudents = useMemo(() => {
    return students
      .filter((st) => st.status === 'Aktif')
      .filter((st) => {
        if (selectedClass !== 'all' && st.kelas !== selectedClass) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            st.nama.toLowerCase().includes(q) ||
            st.nisn.includes(q) ||
            st.nipd.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
        return a.nama.localeCompare(b.nama);
      });
  }, [students, selectedClass, searchQuery]);

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Actions (Hidden during print) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Kartu Digital Siswa
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Tahun Ajaran {identity.tahunAjaran}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Kartu Absensi & Kode Barcode Siswa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · {filteredStudents.length} Kartu Siap Dicetak & Discan Kamera
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick jump to Camera Scanner */}
            <button
              onClick={() => onNavigate('scan-kamera')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
              title="Buka pemindai kamera untuk scan barcode"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Scan Kamera</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
              title="Cetak seluruh kartu yang sedang ditampilkan ke kertas A4"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Kartu (A4)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Kelas (1 s.d. 6) · {students.filter((s) => s.status === 'Aktif').length} Siswa</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({students.filter((s) => s.kelas === c.id && s.status === 'Aktif').length} Siswa)
                </option>
              ))}
            </select>
          </div>

          {/* Search by name/NISN */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Cari Siswa</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nama siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Barcode Format Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Format Kode</label>
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value as any)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="both">QR Code & Barcode Linear (Lengkap)</option>
              <option value="qr">Hanya QR Code (Kamera Cepat)</option>
              <option value="barcode">Hanya Barcode Batang 1D</option>
            </select>
          </div>

          {/* Print Layout Grid Helper */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Panduan Cetak</label>
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between">
              <span>Rekomendasi A4: 6 - 8 Kartu / Lembar</span>
              <span className="font-bold text-blue-700">{filteredStudents.length} Total</span>
            </div>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Petunjuk:</strong> Cetak kartu ini di kertas tebal (Brief Card/Art Paper) atau laminating. Siswa cukup menunjukkan kartu ke kamera HP/laptop guru untuk melakukan absensi harian otomatis tanpa menyentuh layar.
            </span>
          </div>
          <button
            onClick={() => onNavigate('scan-kamera')}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Uji Coba Kamera Sekarang</span>
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards Grid Presentation */}
      <div>
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-700">Tidak ada siswa yang sesuai pencarian.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan ubah filter kelas atau kata kunci nama.</p>
          </div>
        ) : (
          <div className="printable-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
            {filteredStudents.map((st) => (
              <SingleStudentCard
                key={st.id}
                student={st}
                identity={identity}
                barcodeFormat={barcodeFormat}
                classNameObj={classes.find((c) => c.id === st.kelas)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Print Media Specific CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          nav, aside, footer, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .printable-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            page-break-inside: auto !important;
          }
          .printable-card {
            box-shadow: none !important;
            border: 1px dashed #64748b !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
