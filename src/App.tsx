/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Student,
  Teacher,
  SchoolClass,
  AttendanceRecord,
  SchoolIdentity,
  UserAccount,
  ActiveMenu,
} from './types';
import {
  openDB,
  getAllStudents,
  getTeachers,
  getClasses,
  getAllAttendance,
  getAttendanceByDate,
  getSchoolIdentity,
  getLastBackupDate,
  getUsers,
} from './db/indexedDB';
import { INITIAL_SCHOOL_IDENTITY, INITIAL_USERS } from './data/initialData';
import { getTodayString } from './utils/dateUtils';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { DailyAttendanceView } from './components/attendance/DailyAttendanceView';
import { AttendanceRecapView } from './components/attendance/AttendanceRecapView';
import { ReportsView } from './components/reports/ReportsView';
import { StudentsView } from './components/students/StudentsView';
import { TeachersView } from './components/teachers/TeachersView';
import { ClassesView } from './components/classes/ClassesView';
import { BackupRestoreView } from './components/backup/BackupRestoreView';
import { SettingsView } from './components/settings/SettingsView';
import { CameraScannerView } from './components/scanner/CameraScannerView';
import { StudentCardsView } from './components/cards/StudentCardsView';
import { LoginView } from './components/auth/LoginView';
import { ToastContainer, ToastMessage, ToastType } from './components/common/Toast';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function App() {
  const isOnline = useOnlineStatus();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    // Check if session was saved
    try {
      const saved = localStorage.getItem('sdn3_user_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default logged in as Operator for instant out-of-the-box readiness
    return INITIAL_USERS[0];
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // Active Menu
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [navigationClassParam, setNavigationClassParam] = useState<string | undefined>(undefined);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Database Data States
  const [identity, setIdentity] = useState<SchoolIdentity>(INITIAL_SCHOOL_IDENTITY);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch all database records from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      await openDB();
      const todayStr = getTodayString();

      const [ident, stds, tchs, clss, attAll, attToday, backupDate] = await Promise.all([
        getSchoolIdentity(),
        getAllStudents(),
        getTeachers(),
        getClasses(),
        getAllAttendance(),
        getAttendanceByDate(todayStr),
        getLastBackupDate(),
      ]);

      setIdentity(ident);
      setStudents(stds);
      setTeachers(tchs);
      setClasses(clss);
      setAllAttendance(attAll);
      setTodayAttendance(attToday);
      setLastBackupDate(backupDate);
    } catch (err) {
      console.error('Failed to load database:', err);
      showToast('error', 'Koneksi Basis Data Gagal', 'Gagal memuat data dari IndexedDB.');
    } finally {
      setIsLoadingDB(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle Login & Session
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sdn3_user_session', JSON.stringify(user));
    } catch (e) {}

    // If teacher logs in, automatically steer to their class attendance or dashboard
    if (user.role === 'guru' && user.kelasAkses) {
      setNavigationClassParam(user.kelasAkses);
      setActiveMenu('absensi');
    } else {
      setActiveMenu('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sdn3_user_session');
    } catch (e) {}
  };

  const handleLockApp = () => {
    setIsAppLocked(true);
  };

  const handleUnlockApp = () => {
    setIsAppLocked(false);
  };

  const handleNavigate = (menu: ActiveMenu, classParam?: string) => {
    setActiveMenu(menu);
    setNavigationClassParam(classParam);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is locked or not logged in
  if (!currentUser) {
    return (
      <>
        <LoginView
          identity={identity}
          onLoginSuccess={handleLoginSuccess}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (isAppLocked) {
    return (
      <>
        <LoginView
          identity={identity}
          isLockedMode={true}
          lockedUser={currentUser}
          onUnlockSuccess={handleUnlockApp}
          onLoginSuccess={handleLoginSuccess}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navbar */}
      <Navbar
        identity={identity}
        currentUser={currentUser}
        lastBackupDate={lastBackupDate}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onLockApp={handleLockApp}
      />

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          activeMenu={activeMenu}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          identity={identity}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        {/* View Content Canvas */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8">
          {isLoadingDB ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Menyiapkan Aplikasi SDN 3 GODOG...</p>
              <p className="text-xs text-slate-400 mt-1">Mengakses penyimpanan lokal IndexedDB</p>
            </div>
          ) : (
            <>
              {activeMenu === 'dashboard' && (
                <DashboardView
                  identity={identity}
                  students={students}
                  todayAttendance={todayAttendance}
                  allAttendance={allAttendance}
                  classes={classes}
                  onNavigate={handleNavigate}
                />
              )}

              {activeMenu === 'absensi' && (
                <DailyAttendanceView
                  students={students}
                  classes={classes}
                  identity={identity}
                  currentUser={currentUser}
                  allAttendance={allAttendance}
                  initialClass={navigationClassParam}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'scan-kamera' && (
                <CameraScannerView
                  students={students}
                  classes={classes}
                  identity={identity}
                  currentUser={currentUser}
                  allAttendance={allAttendance}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'kartu-siswa' && (
                <StudentCardsView
                  students={students}
                  classes={classes}
                  identity={identity}
                  initialClass={navigationClassParam}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              )}

              {activeMenu === 'rekap' && (
                <AttendanceRecapView
                  students={students}
                  allAttendance={allAttendance}
                  classes={classes}
                  identity={identity}
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'laporan' && (
                <ReportsView
                  students={students}
                  allAttendance={allAttendance}
                  classes={classes}
                  identity={identity}
                  initialClass={navigationClassParam}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              )}

              {activeMenu === 'siswa' && (
                <StudentsView
                  students={students}
                  classes={classes}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'guru' && (
                <TeachersView
                  teachers={teachers}
                  classes={classes}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'kelas' && (
                <ClassesView
                  classes={classes}
                  teachers={teachers}
                  students={students}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'ekspor-impor' && (
                <BackupRestoreView
                  students={students}
                  teachers={teachers}
                  classes={classes}
                  allAttendance={allAttendance}
                  identity={identity}
                  lastBackupDate={lastBackupDate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}

              {activeMenu === 'pengaturan' && (
                <SettingsView
                  identity={identity}
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onRefreshData={refreshData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNav
        activeMenu={activeMenu}
        onNavigate={handleNavigate}
        onOpenMore={() => setIsMobileDrawerOpen(true)}
      />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
