import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  UserCheck,
  CreditCard,
  RotateCw,
  Sparkles,
  ArrowRight,
  Printer,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Student,
  AttendanceRecord,
  SchoolClass,
  SchoolIdentity,
  ActiveMenu,
  UserAccount,
  AttendanceStatus,
} from '../../types';
import {
  playScanSuccessSound,
  playScanDuplicateSound,
  playScanErrorSound,
  speakAttendanceNotification,
} from '../../utils/audioUtils';
import { saveAttendanceBatch } from '../../db/indexedDB';
import { formatDateIndonesian, getTodayString } from '../../utils/dateUtils';

interface CameraScannerViewProps {
  students: Student[];
  classes: SchoolClass[];
  identity: SchoolIdentity;
  currentUser?: UserAccount | null;
  allAttendance: AttendanceRecord[];
  onNavigate: (menu: ActiveMenu, classParam?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onRefreshData?: () => Promise<void>;
}

export const CameraScannerView: React.FC<CameraScannerViewProps> = ({
  students,
  classes,
  identity,
  currentUser,
  allAttendance,
  onNavigate,
  onShowToast,
  onRefreshData,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [targetClass, setTargetClass] = useState<string>(
    currentUser?.role === 'guru' && currentUser?.kelasAkses ? currentUser.kelasAkses : 'all'
  );
  const [defaultStatus, setDefaultStatus] = useState<AttendanceStatus>('H');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // Scanner State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');

  // Last Scanned Student Feedback Card
  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    status: AttendanceStatus;
    timestamp: string;
    isDuplicate?: boolean;
  } | null>(null);

  // Cooldown tracker to avoid re-scanning the same student within 4 seconds
  const lastScannedTimeMap = useRef<Record<string, number>>({});

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'sdn3-camera-reader';

  // Active students lookup map (by NISN, NIPD, ID)
  const studentCodeMap = useMemo(() => {
    const map = new Map<string, Student>();
    students
      .filter((s) => s.status === 'Aktif')
      .forEach((st) => {
        if (st.nisn) map.set(st.nisn.trim().toLowerCase(), st);
        if (st.nipd) map.set(st.nipd.trim().toLowerCase(), st);
        map.set(st.id.trim().toLowerCase(), st);
      });
    return map;
  }, [students]);

  // Today's attendance records for the selected date
  const todayScannedRecords = useMemo(() => {
    return allAttendance
      .filter((r) => r.tanggal === selectedDate)
      .filter((r) => targetClass === 'all' || r.kelas === targetClass)
      .sort((a, b) => (b.waktuSimpan || '').localeCompare(a.waktuSimpan || ''));
  }, [allAttendance, selectedDate, targetClass]);

  // Stats for the day
  const stats = useMemo(() => {
    const totalTargetStudents = students.filter(
      (s) => s.status === 'Aktif' && (targetClass === 'all' || s.kelas === targetClass)
    ).length;

    let hadirCount = 0;
    let terlambatCount = 0;

    todayScannedRecords.forEach((r) => {
      if (r.status === 'H') hadirCount++;
      if (r.status === 'T') terlambatCount++;
    });

    const totalScanned = todayScannedRecords.length;
    const pct = totalTargetStudents > 0 ? Math.round((totalScanned / totalTargetStudents) * 100) : 0;

    return { totalTargetStudents, totalScanned, hadirCount, terlambatCount, pct };
  }, [students, targetClass, todayScannedRecords]);

  // Initialize available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera on phones
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('Tidak ditemukan perangkat kamera pada sistem ini.');
        }
      })
      .catch((err) => {
        console.warn('Unable to query cameras:', err);
        setCameraError('Izin akses kamera diperlukan untuk memindai barcode siswa.');
      });

    return () => {
      stopScanner();
    };
  }, []);

  // Process a detected barcode / QR string
  const handleDecodedCode = async (decodedText: string) => {
    const cleaned = decodedText.trim().toLowerCase();
    if (!cleaned) return;

    // Check cooldown (ignore repeat scans within 4 seconds)
    const now = Date.now();
    const lastTime = lastScannedTimeMap.current[cleaned] || 0;
    if (now - lastTime < 3500) {
      return; // in cooldown
    }
    lastScannedTimeMap.current[cleaned] = now;

    // Find student
    const student = studentCodeMap.get(cleaned);

    if (!student) {
      if (soundEnabled) playScanErrorSound();
      onShowToast(
        'error',
        'Kode Siswa Tidak Dikenal',
        `Kode "${decodedText}" tidak terdaftar pada database siswa aktif SDN 3 Godog.`
      );
      return;
    }

    // Check if target class filter matches
    if (targetClass !== 'all' && student.kelas !== targetClass) {
      if (soundEnabled) playScanErrorSound();
      onShowToast(
        'warning',
        'Siswa Beda Kelas',
        `${student.nama} terdaftar di Kelas ${student.kelas}, sedangkan scanner difilter untuk Kelas ${targetClass}.`
      );
      return;
    }

    // Check if student was already recorded today
    const existingRecord = allAttendance.find(
      (r) => r.tanggal === selectedDate && r.studentId === student.id
    );

    const isDuplicate = !!existingRecord && existingRecord.status === defaultStatus;

    try {
      const nowIso = new Date().toISOString();
      const newRecord: AttendanceRecord = {
        id: `${selectedDate}_${student.id}`,
        tanggal: selectedDate,
        kelas: student.kelas,
        studentId: student.id,
        namaSiswa: student.nama,
        nisn: student.nisn,
        status: defaultStatus,
        catatan: defaultStatus === 'T' ? 'Terlambat via Barcode' : 'Hadir via Scan Kamera',
        waktuSimpan: nowIso,
        updatedBy: currentUser?.nama || 'Scanner Kamera',
      };

      await saveAttendanceBatch([newRecord]);
      if (onRefreshData) {
        await onRefreshData();
      }

      // Audio feedback
      if (soundEnabled) {
        if (isDuplicate) {
          playScanDuplicateSound();
        } else {
          playScanSuccessSound();
        }
      }

      // Voice feedback
      if (voiceEnabled) {
        const statusWord = defaultStatus === 'H' ? 'Hadir' : defaultStatus === 'T' ? 'Terlambat' : 'Tercatat';
        speakAttendanceNotification(student.nama, statusWord);
      }

      setLastScannedResult({
        student,
        status: defaultStatus,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isDuplicate,
      });

      onShowToast(
        'success',
        isDuplicate ? 'Absensi Sudah Tercatat' : 'Absensi Berhasil!',
        `${student.nama} (Kelas ${student.kelas}) status ${defaultStatus === 'H' ? 'Hadir' : 'Terlambat'}.`
      );
    } catch (err) {
      console.error('Error saving scanned attendance:', err);
      if (soundEnabled) playScanErrorSound();
      onShowToast('error', 'Gagal Menyimpan Absensi', 'Terjadi kesalahan pada basis data lokal.');
    }
  };

  // Start Scanner
  const startScanner = async () => {
    try {
      setCameraError(null);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
      }

      const cameraIdOrConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraIdOrConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedCode(decodedText);
        },
        () => {
          // Frame scan error / nothing detected - silent ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setIsScanning(false);
      setCameraError(
        err?.message || 'Gagal menyalakan kamera. Pastikan browser mengizinkan akses kamera perangkat.'
      );
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Manual fallback input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleDecodedCode(manualCodeInput.trim());
    setManualCodeInput('');
  };

  // Auto-start scanner when camera is selected
  useEffect(() => {
    if (selectedCameraId && !isScanning && !cameraError) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [selectedCameraId]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner and Quick Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Absensi Cepat</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Scan Kamera & Barcode
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Pemindai Absensi Kamera Siswa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              SDN 3 GODOG · Dekatkan kartu barcode / QR code siswa ke kamera untuk mencatat absensi seketika
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Link to generate and print cards */}
            <button
              onClick={() => onNavigate('kartu-siswa')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition"
              title="Buka pembuat kartu absen siswa"
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Cetak Kartu Siswa</span>
            </button>

            {/* Jump to Daily Attendance Table */}
            <button
              onClick={() => onNavigate('absensi', targetClass !== 'all' ? targetClass : undefined)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
              title="Buka menu absensi tabel biasa"
            >
              <UserCheck className="w-4 h-4" />
              <span>Buka Absensi Harian</span>
            </button>
          </div>
        </div>

        {/* Scanner Control Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Tanggal Absensi */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Tanggal Absensi</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Filter Kelas */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Filter Kelas Pemindaian</label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Kelas (Kelas 1 s.d. 6)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({c.namaWaliKelas.split(',')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Status Bawaan saat scan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Status Saat Discan</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDefaultStatus('H')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  defaultStatus === 'H'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hadir (H)
              </button>
              {identity.terlambatEnabled && (
                <button
                  type="button"
                  onClick={() => setDefaultStatus('T')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    defaultStatus === 'T'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lambat (T)
                </button>
              )}
            </div>
          </div>

          {/* Toggle Audio & Suara */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Respon Suara</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  soundEnabled
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
                title="Bunyi 'ding' saat kartu terbaca"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Bel Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  voiceEnabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
                title="Panggilan suara nama siswa otomatis"
              >
                <span>Suara Nama</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Camera Viewfinder & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xl text-white relative overflow-hidden flex flex-col items-center">
            {/* Viewfinder Header Controls */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="font-bold">
                  {isScanning ? 'Kamera Aktif & Menunggu Kartu...' : 'Kamera Nonaktif'}
                </span>
              </div>

              {/* Camera selection dropdown */}
              {cameras.length > 1 && (
                <div className="flex items-center gap-1">
                  <FlipHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 rounded-lg px-2 py-1 max-w-[150px] truncate focus:outline-hidden"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Kamera ${c.id.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Camera Viewfinder Box */}
            <div className="w-full max-w-[420px] aspect-square rounded-2xl bg-black my-4 relative overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
              <div id={scannerContainerId} className="w-full h-full overflow-hidden" />

              {/* Overlay Target Framing */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-blue-400/80 rounded-2xl relative shadow-2xl">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Animated Scanning Beam Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] font-bold text-white/90 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full mt-3 shadow-md">
                    Arahkan Barcode atau QR Code Siswa ke Sini
                  </p>
                </div>
              )}

              {/* Error or Stopped State */}
              {!isScanning && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <CameraOff className="w-12 h-12 text-slate-500 mb-3" />
                  <p className="text-sm font-bold text-slate-300">
                    {cameraError || 'Kamera sedang dimatikan'}
                  </p>
                  <button
                    onClick={startScanner}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Nyalakan Kamera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Actions Bar */}
            <div className="w-full flex items-center justify-center gap-3 pt-2">
              {isScanning ? (
                <button
                  onClick={stopScanner}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Jeda Kamera</span>
                </button>
              ) : (
                <button
                  onClick={startScanner}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Aktifkan Kamera</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual Input Fallback Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-700">Input Manual NISN / Barcode</span>
              <span className="text-[10px] text-slate-400">(Jika kamera laptop/HP bermasalah)</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Ketik NISN atau NIPD siswa..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!manualCodeInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95"
              >
                Catat Absen
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Last Scanned Result & Live Feed of Scans (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Scanned Feedback Banner */}
          {lastScannedResult ? (
            <div
              className={`rounded-3xl p-5 border shadow-md animate-in fade-in slide-in-from-top-3 duration-200 ${
                lastScannedResult.isDuplicate
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border flex items-center justify-center text-xl shrink-0">
                    {lastScannedResult.student.jk === 'L' ? '👦' : '👧'}
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white shadow-2xs">
                      {lastScannedResult.isDuplicate ? 'Sudah Tercatat Hari Ini' : 'Berhasil Diabsen'}
                    </span>
                    <h3 className="text-base font-extrabold mt-0.5 leading-snug">
                      {lastScannedResult.student.nama}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold bg-white/80 px-2 py-1 rounded-lg shadow-2xs">
                  {lastScannedResult.timestamp}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-black/10 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Kelas</span>
                  <p className="font-bold">Kelas {lastScannedResult.student.kelas}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">NISN</span>
                  <p className="font-mono font-bold">{lastScannedResult.student.nisn || '-'}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Status</span>
                  <p className="font-extrabold text-emerald-700">
                    {lastScannedResult.status === 'H' ? 'Hadir' : 'Terlambat'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs text-center">
              <Sparkles className="w-8 h-8 mx-auto text-blue-500 mb-1.5" />
              <h3 className="text-sm font-bold text-slate-800">Menunggu Pemindaian Barcode</h3>
              <p className="text-xs text-slate-500 mt-1">
                Dekatkan kartu siswa SDN 3 Godog ke arah kamera untuk mencatat kehadiran secara otomatis.
              </p>
            </div>
          )}

          {/* Today's Scanned Log Box */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riwayat Scan Hari Ini ({todayScannedRecords.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {stats.pct}% Hadir ({stats.totalScanned}/{stats.totalTargetStudents})
              </span>
            </div>

            {/* List of scanned students today */}
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {todayScannedRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">Belum ada siswa yang discan pada tanggal {formatDateIndonesian(selectedDate)}.</p>
                </div>
              ) : (
                todayScannedRecords.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{r.namaSiswa}</p>
                        <p className="text-[10px] text-slate-400">
                          Kelas {r.kelas} · {r.waktuSimpan ? new Date(r.waktuSimpan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                        r.status === 'H'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'T'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status === 'H' ? 'Hadir' : r.status === 'T' ? 'Lambat' : r.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
