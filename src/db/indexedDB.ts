import {
  Student,
  Teacher,
  SchoolClass,
  AttendanceRecord,
  SchoolIdentity,
  UserAccount,
  DailyAttendanceDraft,
} from '../types';
import {
  INITIAL_SCHOOL_IDENTITY,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_USERS,
  generateSeedAttendance,
} from '../data/initialData';
import { INITIAL_STUDENTS } from '../data/initialStudents';

const DB_NAME = 'SDN3Godog_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;

      // 1. Students store
      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('kelas', 'kelas', { unique: false });
        studentStore.createIndex('nisn', 'nisn', { unique: false });
        studentStore.createIndex('nama', 'nama', { unique: false });
      }

      // 2. Teachers store
      if (!db.objectStoreNames.contains('teachers')) {
        db.createObjectStore('teachers', { keyPath: 'id' });
      }

      // 3. Classes store
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' });
      }

      // 4. Attendance store
      if (!db.objectStoreNames.contains('attendance')) {
        const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attendanceStore.createIndex('tanggal', 'tanggal', { unique: false });
        attendanceStore.createIndex('kelas', 'kelas', { unique: false });
        attendanceStore.createIndex('studentId', 'studentId', { unique: false });
        attendanceStore.createIndex('tanggal_kelas', ['tanggal', 'kelas'], { unique: false });
      }

      // 5. Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 6. Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }

      // 7. Drafts store for auto-draft
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      await seedDatabaseIfEmpty(db);
      resolve(db);
    };

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

async function seedDatabaseIfEmpty(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(['students', 'settings', 'teachers', 'classes', 'users', 'attendance'], 'readwrite');
  const studentStore = tx.objectStore('students');
  const countReq = studentStore.count();

  return new Promise((resolve) => {
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        console.log('Seeding initial data for SDN 3 GODOG...');
        // Seed students
        INITIAL_STUDENTS.forEach((st) => studentStore.put(st));
        // Seed teachers
        const teacherStore = tx.objectStore('teachers');
        INITIAL_TEACHERS.forEach((tc) => teacherStore.put(tc));
        // Seed classes
        const classStore = tx.objectStore('classes');
        INITIAL_CLASSES.forEach((cl) => classStore.put(cl));
        // Seed users
        const userStore = tx.objectStore('users');
        INITIAL_USERS.forEach((usr) => userStore.put(usr));
        // Seed settings
        const settingsStore = tx.objectStore('settings');
        settingsStore.put({ key: 'identity', value: INITIAL_SCHOOL_IDENTITY });
        settingsStore.put({ key: 'lastBackup', value: null });
        // Seed sample attendance for previous days
        const attendanceStore = tx.objectStore('attendance');
        const seedAttendance = generateSeedAttendance();
        seedAttendance.forEach((rec) => attendanceStore.put(rec));
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      console.warn('Seeding tx error', tx.error);
      resolve();
    };
  });
}

// ----------------- STUDENTS -----------------
export async function getAllStudents(): Promise<Student[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('students', 'readonly');
    const store = tx.objectStore('students');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result as Student[];
      // Sort alphabetically by nama
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getStudentsByClass(kelas: string): Promise<Student[]> {
  const all = await getAllStudents();
  return all.filter((s) => s.kelas === kelas && s.status === 'Aktif');
}

export async function saveStudent(student: Student): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('students', 'readwrite');
    const store = tx.objectStore('students');
    const req = store.put(student);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function bulkSaveStudents(students: Student[]): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('students', 'readwrite');
    const store = tx.objectStore('students');
    students.forEach((st) => store.put(st));
    tx.oncomplete = () => resolve(students.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('students', 'readwrite');
    const store = tx.objectStore('students');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- TEACHERS & CLASSES -----------------
export async function getTeachers(): Promise<Teacher[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('teachers', 'readonly');
    const store = tx.objectStore('teachers');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Teacher[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTeacher(teacher: Teacher): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('teachers', 'readwrite');
    const store = tx.objectStore('teachers');
    const req = store.put(teacher);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTeacher(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('teachers', 'readwrite');
    const store = tx.objectStore('teachers');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getClasses(): Promise<SchoolClass[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('classes', 'readonly');
    const store = tx.objectStore('classes');
    const req = store.getAll();
    req.onsuccess = () => {
      const cls = req.result as SchoolClass[];
      cls.sort((a, b) => a.tingkat - b.tingkat);
      resolve(cls);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveClass(schoolClass: SchoolClass): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('classes', 'readwrite');
    const store = tx.objectStore('classes');
    const req = store.put(schoolClass);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- ATTENDANCE -----------------
export async function getAttendanceByDateAndClass(
  date: string,
  kelas: string
): Promise<AttendanceRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readonly');
    const store = tx.objectStore('attendance');
    const index = store.index('tanggal_kelas');
    const req = index.getAll(IDBKeyRange.only([date, kelas]));
    req.onsuccess = () => resolve(req.result as AttendanceRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readonly');
    const store = tx.objectStore('attendance');
    const index = store.index('tanggal');
    const req = index.getAll(IDBKeyRange.only(date));
    req.onsuccess = () => resolve(req.result as AttendanceRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readonly');
    const store = tx.objectStore('attendance');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as AttendanceRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAttendanceBatch(records: AttendanceRecord[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const store = tx.objectStore('attendance');
    records.forEach((rec) => {
      store.put(rec);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAttendanceByDateAndClass(date: string, kelas: string): Promise<void> {
  const records = await getAttendanceByDateAndClass(date, kelas);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const store = tx.objectStore('attendance');
    records.forEach((r) => store.delete(r.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- DRAFTS (AUTO-SAVE) -----------------
export async function getDraft(
  kelas: string,
  tanggal: string
): Promise<DailyAttendanceDraft | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('drafts', 'readonly');
    const store = tx.objectStore('drafts');
    const req = store.get(`draft_${kelas}_${tanggal}`);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function saveDraft(draft: DailyAttendanceDraft): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const req = store.put({
      id: `draft_${draft.kelas}_${draft.tanggal}`,
      ...draft,
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(kelas: string, tanggal: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const req = store.delete(`draft_${kelas}_${tanggal}`);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

// ----------------- SETTINGS & SCHOOL IDENTITY -----------------
export async function getSchoolIdentity(): Promise<SchoolIdentity> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('identity');
    req.onsuccess = () => {
      resolve(req.result ? req.result.value : INITIAL_SCHOOL_IDENTITY);
    };
    req.onerror = () => resolve(INITIAL_SCHOOL_IDENTITY);
  });
}

export async function saveSchoolIdentity(identity: SchoolIdentity): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'identity', value: identity });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLastBackupDate(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('lastBackup');
    req.onsuccess = () => {
      resolve(req.result ? req.result.value : null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function recordBackupDate(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'lastBackup', value: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- USERS & AUTH -----------------
export async function getUsers(): Promise<UserAccount[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as UserAccount[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getUserByUsername(username: string): Promise<UserAccount | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('username');
    const req = index.get(username.trim().toLowerCase());
    req.onsuccess = () => resolve((req.result as UserAccount) || null);
    req.onerror = () => resolve(null);
  });
}

export async function saveUser(user: UserAccount): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.put(user);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- COMPLETE BACKUP & RESTORE -----------------
export interface BackupData {
  version: number;
  appName: string;
  npsn: string;
  timestamp: string;
  identity: SchoolIdentity;
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  users: UserAccount[];
}

export async function createFullBackup(): Promise<BackupData> {
  const [identity, students, teachers, classes, attendance, users] = await Promise.all([
    getSchoolIdentity(),
    getAllStudents(),
    getTeachers(),
    getClasses(),
    getAllAttendance(),
    getUsers(),
  ]);

  await recordBackupDate();

  return {
    version: 1,
    appName: 'APLIKASI ABSENSI SISWA SDN 3 GODOG',
    npsn: identity.npsn,
    timestamp: new Date().toISOString(),
    identity,
    students,
    teachers,
    classes,
    attendance,
    users,
  };
}

export async function restoreBackup(
  backup: BackupData,
  mode: 'replace' | 'merge'
): Promise<{ studentsCount: number; attendanceCount: number }> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['students', 'teachers', 'classes', 'attendance', 'settings', 'users'],
      'readwrite'
    );

    if (mode === 'replace') {
      tx.objectStore('students').clear();
      tx.objectStore('attendance').clear();
    }

    const studentStore = tx.objectStore('students');
    const teacherStore = tx.objectStore('teachers');
    const classStore = tx.objectStore('classes');
    const attendanceStore = tx.objectStore('attendance');
    const settingsStore = tx.objectStore('settings');
    const userStore = tx.objectStore('users');

    backup.students?.forEach((s) => studentStore.put(s));
    backup.teachers?.forEach((t) => teacherStore.put(t));
    backup.classes?.forEach((c) => classStore.put(c));
    backup.attendance?.forEach((a) => attendanceStore.put(a));
    if (backup.identity) {
      settingsStore.put({ key: 'identity', value: backup.identity });
    }
    backup.users?.forEach((u) => userStore.put(u));

    tx.oncomplete = () => {
      resolve({
        studentsCount: backup.students?.length || 0,
        attendanceCount: backup.attendance?.length || 0,
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}
