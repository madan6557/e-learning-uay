import { classPath } from '../shared/src/urls.js';
import { PrismaClient } from '@prisma/client';
import { loadEnvFile } from 'node:process';
import { questionSchema } from '../shared/src/domain.js';
import { generateAllDemoFiles } from './demo-media.js';

try { loadEnvFile(); } catch {}
if (
  process.env.NODE_ENV === 'production' &&
  process.env.AUTH_MODE !== 'development' &&
  process.env.DEMO_MODE !== 'true' &&
  process.env.RESET_DB_ON_DEPLOY !== 'true' &&
  process.env.SEED_ON_DEPLOY !== 'true'
) {
  throw new Error('Demo seed is disabled in production.');
}

const db = new PrismaClient();

export const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  instructor: '00000000-0000-4000-8000-000000000002',
  student: '00000000-0000-4000-8000-000000000003',
  student2: '00000000-0000-4000-8000-000000000004',
  outsider: '00000000-0000-4000-8000-000000000005',
  department: '00000000-0000-4000-8000-000000000006',
  rector: '00000000-0000-4000-8000-000000000007',
  course: '10000000-0000-4000-8000-000000000001',
  class: '20000000-0000-4000-8000-000000000001',
  section: '30000000-0000-4000-8000-000000000001',
  resource: '40000000-0000-4000-8000-000000000001',
  resourcePdf: '40000000-0000-4000-8000-000000000002',
  resourcePpt: '40000000-0000-4000-8000-000000000003',
  resourceVideo: '40000000-0000-4000-8000-000000000004',
  filePdf: '50000000-0000-4000-8000-000000000002',
  filePpt: '50000000-0000-4000-8000-000000000003',
  fileVideo: '50000000-0000-4000-8000-000000000004',
  quiz: '50000000-0000-4000-8000-000000000001',
  assignment: '60000000-0000-4000-8000-000000000001',
};

const nowTime = Date.now();
const dateStr = (offsetDays: number, hour = 9, minute = 0) =>
  new Date(nowTime - offsetDays * 86400000 + (hour - 9) * 3600000 + minute * 60000);

// ===========================================================================
// 1. DATA DEFINITIONS: 4 PROGRAM STUDI & USERS
// ===========================================================================

export const DEPARTMENTS = [
  { code: 'IF', name: 'Informatika' },
  { code: 'TS', name: 'Teknik Sipil' },
  { code: 'AK', name: 'Akuntansi' },
  { code: 'MN', name: 'Manajemen' },
];

const adminUsers = [
  {
    id: ids.admin,
    name: 'Admin UAY',
    role: 'SUPER_ADMIN' as const,
    userType: 'ADMIN' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'ADM001',
    status: 'ACTIVE' as const,
    departmentScopes: [] as string[],
    lastLoginAt: dateStr(0, 8, 15),
    lastActiveAt: dateStr(0, 8, 30),
  },
  {
    id: ids.rector,
    name: 'Prof. Dr. Ir. H. Rektor UAY, M.Sc.',
    role: 'RECTOR' as const,
    userType: 'STAFF' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'RKT001',
    status: 'ACTIVE' as const,
    departmentScopes: [] as string[],
    lastLoginAt: dateStr(1, 10, 0),
    lastActiveAt: dateStr(1, 10, 25),
  },
  {
    id: ids.department,
    name: 'Admin Prodi Informatika',
    role: 'DEPARTMENT_ADMIN' as const,
    userType: 'STAFF' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'ADMIF01',
    status: 'ACTIVE' as const,
    departmentScopes: ['Informatika', 'IF'],
    lastLoginAt: dateStr(0, 7, 45),
    lastActiveAt: dateStr(0, 8, 10),
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    name: 'Admin Prodi Teknik Sipil',
    role: 'DEPARTMENT_ADMIN' as const,
    userType: 'STAFF' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'ADMTS01',
    status: 'ACTIVE' as const,
    departmentScopes: ['Teknik Sipil', 'TS'],
    lastLoginAt: dateStr(1, 8, 30),
    lastActiveAt: dateStr(1, 9, 0),
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Admin Prodi Akuntansi',
    role: 'DEPARTMENT_ADMIN' as const,
    userType: 'STAFF' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'ADMAK01',
    status: 'ACTIVE' as const,
    departmentScopes: ['Akuntansi', 'AK'],
    lastLoginAt: dateStr(2, 8, 15),
    lastActiveAt: dateStr(2, 8, 45),
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Admin Prodi Manajemen',
    role: 'DEPARTMENT_ADMIN' as const,
    userType: 'STAFF' as const,
    identifierType: 'NIP' as const,
    identifierValue: 'ADMMN01',
    status: 'ACTIVE' as const,
    departmentScopes: ['Manajemen', 'MN'],
    lastLoginAt: dateStr(3, 9, 0),
    lastActiveAt: dateStr(3, 9, 30),
  },
];

export const lecturers = [
  // Informatika (3 dosen)
  {
    id: ids.instructor,
    name: 'Dr. Aruna Prameswari',
    identifierValue: '1112089001',
    department: 'Informatika',
    lastLoginAt: dateStr(0, 8, 0),
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Bagas Mahendra, M.Kom.',
    identifierValue: '1112089002',
    department: 'Informatika',
    lastLoginAt: dateStr(1, 9, 30),
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    name: 'Citra Adinata, M.Kom.',
    identifierValue: '1112089003',
    department: 'Informatika',
    lastLoginAt: dateStr(2, 10, 15),
  },

  // Teknik Sipil (3 dosen)
  {
    id: '00000000-0000-4000-8000-000000000013',
    name: 'Dr. Damar Wicaksana',
    identifierValue: '1112089004',
    department: 'Teknik Sipil',
    lastLoginAt: dateStr(1, 8, 20),
  },
  {
    id: '00000000-0000-4000-8000-000000000021',
    name: 'Elina Paramitha, M.T.',
    identifierValue: '1112089005',
    department: 'Teknik Sipil',
    lastLoginAt: dateStr(2, 11, 0),
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    name: 'Farhan Kusuma, M.T.',
    identifierValue: '1112089006',
    department: 'Teknik Sipil',
    lastLoginAt: dateStr(3, 13, 45),
  },

  // Akuntansi (3 dosen)
  {
    id: '00000000-0000-4000-8000-000000000023',
    name: 'Dr. Gita Larasati',
    identifierValue: '1112089007',
    department: 'Akuntansi',
    lastLoginAt: dateStr(0, 14, 10),
  },
  {
    id: '00000000-0000-4000-8000-000000000024',
    name: 'Hadi Suryatama, M.Ak.',
    identifierValue: '1112089008',
    department: 'Akuntansi',
    lastLoginAt: dateStr(1, 15, 0),
  },
  {
    id: '00000000-0000-4000-8000-000000000025',
    name: 'Intan Kirana, M.Ak.',
    identifierValue: '1112089009',
    department: 'Akuntansi',
    lastLoginAt: dateStr(2, 9, 0),
  },

  // Manajemen (3 dosen)
  {
    id: '00000000-0000-4000-8000-000000000026',
    name: 'Dr. Jati Nugraha',
    identifierValue: '1112089010',
    department: 'Manajemen',
    lastLoginAt: dateStr(1, 8, 45),
  },
  {
    id: '00000000-0000-4000-8000-000000000027',
    name: 'Kirana Wulandari, M.M.',
    identifierValue: '1112089011',
    department: 'Manajemen',
    lastLoginAt: dateStr(2, 10, 30),
  },
  {
    id: '00000000-0000-4000-8000-000000000028',
    name: 'Laksana Pradipta, M.M.',
    identifierValue: '1112089012',
    department: 'Manajemen',
    lastLoginAt: dateStr(4, 14, 0),
  },
].map((l) => ({
  ...l,
  role: 'INSTRUCTOR' as const,
  userType: 'LECTURER' as const,
  identifierType: 'NIDN' as const,
  status: 'ACTIVE' as const,
  departmentScopes: [l.department],
  lastActiveAt: l.lastLoginAt,
}));

// 40 Mahasiswa: 10 per prodi
const studentNames: Record<string, string[]> = {
  Informatika: [
    'Ahmad Fauzi',
    'Bunga Lestari',
    'Cahyo Wibowo',
    'Dewi Anggraini',
    'Eko Prasetyo',
    'Fajar Nugroho',
    'Gita Permata',
    'Hendra Saputra',
    'Indah Wahyuni',
    'Joko Susilo',
  ],
  'Teknik Sipil': [
    'Kevin Sanjaya',
    'Larasati Putri',
    'Muhammad Rizky',
    'Nabila Syahrani',
    'Oscar Pratama',
    'Putri Maharani',
    'Qori Ramadhan',
    'Rian Hidayat',
    'Siti Nurhaliza',
    'Taufik Hidayat',
  ],
  Akuntansi: [
    'Umar Faruq',
    'Vina Panduwinata',
    'Wahyu Setiawan',
    'Xaverius Danu',
    'Yulia Rachmawati',
    'Zulfikar Ali',
    'Annisa Rahma',
    'Bagus Triadi',
    'Cindy Claudia',
    'Dimas Arya',
  ],
  Manajemen: [
    'Erwin Gutawa',
    'Fitri Handayani',
    'Gilang Dirga',
    'Hana Malasan',
    'Ivan Gunawan',
    'Jessica Iskandar',
    'Kemal Palevi',
    'Luna Maya',
    'Marcel Chandrawinata',
    'Nadia Vega',
  ],
};

const students: Array<{
  id: string;
  name: string;
  identifierValue: string;
  department: string;
  role: 'STUDENT';
  userType: 'STUDENT';
  identifierType: 'NIM';
  status: 'ACTIVE';
  departmentScopes: string[];
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
}> = [];

let stdIdx = 1;
for (const dept of DEPARTMENTS) {
  const names = studentNames[dept.name];
  for (let i = 0; i < 10; i++) {
    const nimPrefix =
      dept.code === 'IF' ? '202601' : dept.code === 'TS' ? '202602' : dept.code === 'AK' ? '202603' : '202604';
    const nim = `${nimPrefix}${String(i + 1).padStart(3, '0')}`;
    let id = `00000000-0000-4000-8000-${String(stdIdx + 100).padStart(12, '0')}`;
    if (nim === '202601001') id = ids.student;
    else if (nim === '202601002') id = ids.student2;
    else if (nim === '202601003') id = ids.outsider;
    else if (dept.code === 'IF') {
      id = `00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`;
    }

    const lastLogin = i === 9 ? null : dateStr(i % 5, 8 + (i % 6), (i * 7) % 60);

    students.push({
      id,
      name: `${names[i]} (${dept.code})`,
      identifierValue: nim,
      department: dept.name,
      role: 'STUDENT' as const,
      userType: 'STUDENT' as const,
      identifierType: 'NIM' as const,
      status: 'ACTIVE' as const,
      departmentScopes: [dept.name],
      lastLoginAt: lastLogin,
      lastActiveAt: lastLogin,
    });
    stdIdx++;
  }
}

// ===========================================================================
// 2. SEED USERS INTO DATABASE
// ===========================================================================

console.log('Seeding users (Admin, Rector, 4 Admin Prodi, 12 Dosen, 40 Mahasiswa)...');
const allUsers = [...adminUsers, ...lecturers, ...students];

for (const user of allUsers) {
  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { identifierValue: user.identifierValue },
        { email: `${user.identifierValue.toLowerCase()}@example.test` },
      ],
    },
  });

  const userData = {
    name: user.name,
    email: `${user.identifierValue.toLowerCase()}@example.test`,
    role: user.role,
    userType: user.userType,
    identifierType: user.identifierType,
    identifierValue: user.identifierValue,
    username: user.identifierValue.toLowerCase(),
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    lastActiveAt: user.lastActiveAt,
    departmentScopes: user.departmentScopes,
    ssoUserId: user.id,
  };

  if (existingUser) {
    await db.user.update({
      where: { id: existingUser.id },
      data: userData,
    });
  } else {
    await db.user.create({
      data: {
        id: user.id,
        ...userData,
      },
    });
  }
}

// ===========================================================================
// 3. COURSES DEFINITIONS (12 COURSES ACROSS 4 PRODI)
// ===========================================================================

console.log('Seeding courses across 4 program studi...');

const courseDefs = [
  // Informatika
  {
    id: ids.course,
    code: 'IF2101',
    title: 'Pemrograman Web',
    departmentCode: 'Informatika',
    credits: 3,
    description: 'Membangun aplikasi web yang terstruktur, aman, dan mudah digunakan.',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'IF2102',
    title: 'Basis Data',
    departmentCode: 'Informatika',
    credits: 3,
    description: 'Pemodelan data relasional, SQL tingkat lanjut, dan optimasi query.',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    code: 'IF3103',
    title: 'Rekayasa Perangkat Lunak',
    departmentCode: 'Informatika',
    credits: 3,
    description: 'Siklus hidup pengembangan perangkat lunak, arsitektur sistem, dan manajemen proyek.',
  },

  // Teknik Sipil
  {
    id: '10000000-0000-4000-8000-000000000004',
    code: 'TS2101',
    title: 'Mekanika Teknik',
    departmentCode: 'Teknik Sipil',
    credits: 3,
    description: 'Analisis gaya dalam struktur statis tertentu dan kestabilan konstruksi.',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: 'TS2102',
    title: 'Struktur Beton',
    departmentCode: 'Teknik Sipil',
    credits: 3,
    description: 'Perencanaan elemen struktur beton bertulang sesuai standar SNI terbaru.',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    code: 'TS3103',
    title: 'Manajemen Konstruksi',
    departmentCode: 'Teknik Sipil',
    credits: 3,
    description: 'Perencanaan penjadwalan proyek, estimasi biaya RAB, dan pengendalian mutu konstruksi.',
  },

  // Akuntansi
  {
    id: '10000000-0000-4000-8000-000000000007',
    code: 'AK2101',
    title: 'Akuntansi Keuangan',
    departmentCode: 'Akuntansi',
    credits: 3,
    description: 'Penyusunan laporan keuangan standar PSAK dan pengakuan pos neraca.',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    code: 'AK2102',
    title: 'Audit dan Assurance',
    departmentCode: 'Akuntansi',
    credits: 3,
    description: 'Standar audit profesional, penilaian risiko audit, dan pengumpulan bukti audit.',
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    code: 'AK3103',
    title: 'Sistem Informasi Akuntansi',
    departmentCode: 'Akuntansi',
    credits: 3,
    description: 'Perancangan siklus transaksi bisnis, pengendalian internal, dan sistem enterprise ERP.',
  },

  // Manajemen
  {
    id: '10000000-0000-4000-8000-000000000010',
    code: 'MN2101',
    title: 'Manajemen Strategis',
    departmentCode: 'Manajemen',
    credits: 3,
    description: 'Analisis keunggulan bersaing, strategi korporat, dan eksekusi balanced scorecard.',
  },
  {
    id: '10000000-0000-4000-8000-000000000011',
    code: 'MN2102',
    title: 'Perilaku Organisasi',
    departmentCode: 'Manajemen',
    credits: 3,
    description: 'Dinamika kepemimpinan tim, motivasi kerja, dan budaya korporasi modern.',
  },
  {
    id: '10000000-0000-4000-8000-000000000012',
    code: 'MN3103',
    title: 'Pengantar Bisnis',
    departmentCode: 'Manajemen',
    credits: 3,
    description: 'Fondasi manajemen operasional, pemasaran produk, dan etika bisnis kontemporer.',
  },
];

const courseMap = new Map<string, any>();
for (const c of courseDefs) {
  let existing = await db.course.findUnique({ where: { code: c.code } });
  if (!existing) {
    existing = await db.course.create({
      data: {
        id: c.id,
        code: c.code,
        title: c.title,
        departmentCode: c.departmentCode,
        credits: c.credits,
        description: c.description,
        status: 'PUBLISHED',
      },
    });
  } else {
    existing = await db.course.update({
      where: { id: existing.id },
      data: {
        title: c.title,
        departmentCode: c.departmentCode,
        credits: c.credits,
        description: c.description,
      },
    });
  }
  courseMap.set(c.code, existing);
}

// ===========================================================================
// 4. CLASSES DEFINITION (12 ACTIVE 2026/2027 GANJIL + 4 ARCHIVED 2025/2026 GENAP)
// ===========================================================================

console.log('Seeding classes (12 active classes + 4 archived classes)...');

interface ClassConfig {
  id: string;
  courseCode: string;
  name: string;
  semester: string;
  status: 'PUBLISHED' | 'ARCHIVED';
  department: string;
  instructors: string[];
}

const classConfigs: ClassConfig[] = [
  // 12 ACTIVE CLASSES (2026/2027 Ganjil)
  // Informatika
  {
    id: ids.class,
    courseCode: 'IF2101',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Informatika',
    instructors: [ids.instructor, lecturers[2].id], // Shared: Dr. Aruna & Citra Adinata
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    courseCode: 'IF2102',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Informatika',
    instructors: [lecturers[1].id], // Bagas Mahendra
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    courseCode: 'IF3103',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Informatika',
    instructors: [lecturers[2].id], // Citra Adinata
  },

  // Teknik Sipil
  {
    id: '20000000-0000-4000-8000-000000000004',
    courseCode: 'TS2101',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Teknik Sipil',
    instructors: [lecturers[3].id, lecturers[5].id], // Shared: Dr. Damar & Farhan Kusuma
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    courseCode: 'TS2102',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Teknik Sipil',
    instructors: [lecturers[4].id], // Elina Paramitha
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    courseCode: 'TS3103',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Teknik Sipil',
    instructors: [lecturers[5].id], // Farhan Kusuma
  },

  // Akuntansi
  {
    id: '20000000-0000-4000-8000-000000000007',
    courseCode: 'AK2101',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Akuntansi',
    instructors: [lecturers[6].id, lecturers[8].id], // Shared: Dr. Gita & Intan Kirana
  },
  {
    id: '20000000-0000-4000-8000-000000000008',
    courseCode: 'AK2102',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Akuntansi',
    instructors: [lecturers[7].id], // Hadi Suryatama
  },
  {
    id: '20000000-0000-4000-8000-000000000009',
    courseCode: 'AK3103',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Akuntansi',
    instructors: [lecturers[8].id], // Intan Kirana
  },

  // Manajemen
  {
    id: '20000000-0000-4000-8000-000000000010',
    courseCode: 'MN2101',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Manajemen',
    instructors: [lecturers[9].id, lecturers[11].id], // Shared: Dr. Jati & Laksana Pradipta
  },
  {
    id: '20000000-0000-4000-8000-000000000011',
    courseCode: 'MN2102',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Manajemen',
    instructors: [lecturers[10].id], // Kirana Wulandari
  },
  {
    id: '20000000-0000-4000-8000-000000000012',
    courseCode: 'MN3103',
    name: 'Kelas A',
    semester: '2026/2027 Ganjil',
    status: 'PUBLISHED',
    department: 'Manajemen',
    instructors: [lecturers[11].id], // Laksana Pradipta
  },

  // 4 ARCHIVED CLASSES (2025/2026 Genap)
  {
    id: '20000000-0000-4000-8000-000000000013',
    courseCode: 'IF2101',
    name: 'Kelas Reguler (Arsip)',
    semester: '2025/2026 Genap',
    status: 'ARCHIVED',
    department: 'Informatika',
    instructors: [ids.instructor],
  },
  {
    id: '20000000-0000-4000-8000-000000000014',
    courseCode: 'TS2101',
    name: 'Kelas Reguler (Arsip)',
    semester: '2025/2026 Genap',
    status: 'ARCHIVED',
    department: 'Teknik Sipil',
    instructors: [lecturers[3].id],
  },
  {
    id: '20000000-0000-4000-8000-000000000015',
    courseCode: 'AK2101',
    name: 'Kelas Reguler (Arsip)',
    semester: '2025/2026 Genap',
    status: 'ARCHIVED',
    department: 'Akuntansi',
    instructors: [lecturers[6].id],
  },
  {
    id: '20000000-0000-4000-8000-000000000016',
    courseCode: 'MN2101',
    name: 'Kelas Reguler (Arsip)',
    semester: '2025/2026 Genap',
    status: 'ARCHIVED',
    department: 'Manajemen',
    instructors: [lecturers[9].id],
  },
];

// Map students by department
const studentsByDept: Record<string, typeof students> = {
  Informatika: students.filter((s) => s.department === 'Informatika'),
  'Teknik Sipil': students.filter((s) => s.department === 'Teknik Sipil'),
  Akuntansi: students.filter((s) => s.department === 'Akuntansi'),
  Manajemen: students.filter((s) => s.department === 'Manajemen'),
};

for (const cfg of classConfigs) {
  const course = courseMap.get(cfg.courseCode);
  if (!course) continue;

  let cls = await db.courseClass.findUnique({ where: { id: cfg.id } });
  if (!cls) {
    cls = await db.courseClass.create({
      data: {
        id: cfg.id,
        courseId: course.id,
        name: cfg.name,
        academicYear: cfg.semester,
        status: cfg.status,
        gradeScaleVersion: '2026.1',
      },
    });
  } else {
    cls = await db.courseClass.update({
      where: { id: cfg.id },
      data: {
        courseId: course.id,
        name: cfg.name,
        academicYear: cfg.semester,
        status: cfg.status,
      },
    });
  }

  // Connect Instructors
  for (const instructorId of cfg.instructors) {
    const existing = await db.classInstructor.findUnique({
      where: { classId_userId: { classId: cls.id, userId: instructorId } },
    });
    if (!existing) {
      await db.classInstructor.create({
        data: { classId: cls.id, userId: instructorId },
      });
    }
  }

  // Enroll Students from the same department
  const deptStudents = studentsByDept[cfg.department] || [];
  for (const s of deptStudents) {
    const existingEnroll = await db.enrollment.findUnique({
      where: { classId_userId: { classId: cls.id, userId: s.id } },
    });
    if (!existingEnroll) {
      await db.enrollment.create({
        data: { classId: cls.id, userId: s.id, isActive: true },
      });
    }
  }
}

// ===========================================================================
// 5. CLASS CONTENT: SECTIONS, RESOURCES, CATEGORIES, ASSIGNMENTS & QUIZZES
// ===========================================================================

console.log('Seeding learning materials, assignments, quizzes, and grade categories...');

// Generate demo files on disk for uploads/
generateAllDemoFiles();

// Upsert demo FileReferences in database for ids.class
const demoFiles = [
  {
    id: ids.filePdf,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: 'RESOURCE',
    name: 'Buku Panduan & Silabus Pemrograman Web.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1700,
    checksum: 'f2e1f47ba23019888998',
    status: 'READY',
  },
  {
    id: ids.filePpt,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: 'RESOURCE',
    name: 'Slide Presentasi Pertemuan 1 - Arsitektur Web.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2519,
    checksum: 'c67811239a9c88776655',
    status: 'READY',
  },
  {
    id: ids.fileVideo,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: 'RESOURCE',
    name: 'Video Pembelajaran - Alur HTTP Request Response.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 244,
    checksum: '1712f49341cd11223344',
    status: 'READY',
  },
];

for (const f of demoFiles) {
  await db.fileReference.upsert({
    where: { id: f.id },
    create: f,
    update: { name: f.name, mimeType: f.mimeType, sizeBytes: f.sizeBytes, status: f.status },
  });
}

// Populate standard categories & items for ALL classes
for (const [idx, cfg] of classConfigs.entries()) {
  const isPrimary = cfg.id === ids.class;
  const leadInstructor = cfg.instructors[0];
  const deptStudents = studentsByDept[cfg.department];

  // 1. Grade Categories
  const catNames = [
    ['Tugas & praktikum', 25, false, 'ASSIGNMENT'],
    ['Kuis', 15, false, 'QUIZ'],
    ['UTS', 25, true, 'MANUAL'],
    ['UAS', 25, true, 'MANUAL'],
    ['Progres belajar', 10, false, 'PROGRESS'],
  ] as const;

  const categories = [];
  for (const [order, [name, weight, isMandatory, sourceType]] of catNames.entries()) {
    let cat = await db.gradeCategory.findFirst({
      where: { classId: cfg.id, name: String(name) },
    });
    if (!cat) {
      cat = await db.gradeCategory.create({
        data: {
          classId: cfg.id,
          name: String(name),
          weightPercent: Number(weight),
          order,
          kind: order === 4 ? 'PROGRESS' : 'ASSESSMENT',
          isMandatory: Boolean(isMandatory),
          sourceType: String(sourceType),
        },
      });
    }
    categories.push(cat);
  }

  // 2. Sections
  const sec1Id = isPrimary ? ids.section : `30000000-0000-4000-8000-${String(idx * 3 + 1).padStart(12, '0')}`;
  const sec2Id = `30000000-0000-4000-8000-${String(idx * 3 + 2).padStart(12, '0')}`;
  const sec3Id = `30000000-0000-4000-8000-${String(idx * 3 + 3).padStart(12, '0')}`;

  const sec1 = await db.section.upsert({
    where: { id: sec1Id },
    create: {
      id: sec1Id,
      classId: cfg.id,
      title: isPrimary ? 'Fondasi aplikasi web' : 'Pertemuan 01 · Kontrak Kuliah & Pengantar',
      description: isPrimary
        ? 'Kenali alur request–response dan susun halaman web pertama Anda.'
        : 'Silabus, kontrak belajar, dan pengantar konsep utama mata kuliah.',
      order: 0,
      type: 'LECTURE',
      isVisible: true,
    },
    update: { isVisible: true },
  });

  await db.section.upsert({
    where: { id: sec2Id },
    create: {
      id: sec2Id,
      classId: cfg.id,
      title: isPrimary ? 'Praktikum: halaman web semantik' : 'Pertemuan 02 · Pendalaman Teori & Praktik',
      description: 'Studi kasus dan penerapan terarah materi pertemuan.',
      order: 1,
      type: 'LAB_PRACTICUM',
      isVisible: true,
    },
    update: { isVisible: true },
  });

  await db.section.upsert({
    where: { id: sec3Id },
    create: {
      id: sec3Id,
      classId: cfg.id,
      title: 'Pertemuan 03 · Evaluasi & Diskusi Kelompok',
      description: 'Pembahasan studi kasus lanjutan.',
      order: 2,
      type: 'LECTURE',
      isVisible: cfg.status === 'ARCHIVED',
    },
    update: {},
  });

  // 3. Resources
  if (isPrimary) {
    // Primary class uses the rich demo media
    await db.resourceItem.upsert({
      where: { id: ids.resource },
      create: {
        id: ids.resource,
        sectionId: sec1.id,
        title: 'Memahami cara kerja web',
        resourceType: 'RICH_TEXT',
        dynamicPayload: {
          blocks: [
            { id: 'intro', type: 'heading', data: { level: 2, text: 'Dari browser menuju server' } },
            {
              id: 'paragraph',
              type: 'paragraph',
              data: {
                text: 'Setiap halaman web dimulai dari sebuah permintaan HTTP, lalu server mengembalikan respons HTML/JSON.',
              },
            },
          ],
        },
      },
      update: {},
    });

    await db.resourceItem.upsert({
      where: { id: ids.resourcePdf },
      create: {
        id: ids.resourcePdf,
        sectionId: sec1.id,
        title: 'Buku Panduan & Silabus Pemrograman Web',
        description: 'Silabus perkuliahan dan RPS resmi dalam format PDF.',
        resourceType: 'DOCUMENT',
        contentOrder: 1,
        dynamicPayload: { fileObjectId: ids.filePdf, totalPages: 3 },
        isVisible: true,
      },
      update: {},
    });

    await db.resourceItem.upsert({
      where: { id: ids.resourcePpt },
      create: {
        id: ids.resourcePpt,
        sectionId: sec1.id,
        title: 'Slide Presentasi Pertemuan 1 · Arsitektur Web',
        description: 'Bahan tayang kuliah tatap muka mengenai arsitektur web.',
        resourceType: 'DOCUMENT',
        contentOrder: 2,
        dynamicPayload: { fileObjectId: ids.filePpt, totalPages: 5 },
        isVisible: true,
      },
      update: {},
    });

    await db.resourceItem.upsert({
      where: { id: ids.resourceVideo },
      create: {
        id: ids.resourceVideo,
        sectionId: sec1.id,
        title: 'Video Pembelajaran · Alur HTTP Request–Response',
        description: 'Penjelasan mendalam proses pengiriman request dari browser hingga respon server.',
        resourceType: 'VIDEO_MEDIA',
        contentOrder: 3,
        dynamicPayload: {
          provider: 'YOUTUBE',
          url: 'https://www.youtube.com/embed/2JYT5f2isg4',
          durationSeconds: 300,
          minWatchPercent: 80,
        },
        isVisible: true,
      },
      update: {},
    });
  } else {
    // Other classes get standard syllabus & slide resource
    const resId = `40000000-0000-4000-8000-${String(idx * 2 + 10).padStart(12, '0')}`;
    await db.resourceItem.upsert({
      where: { id: resId },
      create: {
        id: resId,
        sectionId: sec1.id,
        title: `Modul Perkuliahan & RPS · ${courseMap.get(cfg.courseCode)?.title || cfg.name}`,
        description: 'Silabus, rincian kompetensi pembelajaran, dan referensi bacaan wajib.',
        resourceType: 'RICH_TEXT',
        contentOrder: 1,
        dynamicPayload: {
          blocks: [
            { id: 'h1', type: 'heading', data: { level: 2, text: `RPS ${cfg.courseCode}` } },
            {
              id: 'p1',
              type: 'paragraph',
              data: { text: 'Pelajari capaian pembelajaran lulusan dan jadwal tatap muka semester ini.' },
            },
          ],
        },
        isVisible: true,
      },
      update: {},
    });
  }

  // 4. Assignments
  const assignmentId = isPrimary ? ids.assignment : `60000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`;
  const asg = await db.assignment.upsert({
    where: { id: assignmentId },
    create: {
      id: assignmentId,
      sectionId: sec1.id,
      title: isPrimary
        ? 'Praktikum 01 · Halaman profil'
        : `Tugas 01 · Studi Kasus ${courseMap.get(cfg.courseCode)?.title}`,
      instructions:
        'Susun laporan analisis dan implementasi sesuai panduan praktikum. Unggah berkas atau tautan repositori.',
      gradeCategoryId: categories[0].id,
      maxScore: 100,
      allowedFormats: ['TEXT', 'LINK', 'ZIP', 'PDF', 'PNG'],
      deadline: dateStr(-7),
      cutoffDate: dateStr(-9),
      maxAttempts: 3,
      isVisible: true,
    },
    update: { isVisible: true },
  });

  // 5. Quizzes
  const quizId = isPrimary ? ids.quiz : `50000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`;
  const questions = [
    {
      type: 'SINGLE_CHOICE',
      text: `Konsep dasar dari materi ${courseMap.get(cfg.courseCode)?.title} adalah ...`,
      points: 25,
      options: [
        { id: 'a', text: 'Konseptual fundamental' },
        { id: 'b', text: 'Pilihan acak' },
        { id: 'c', text: 'Bukan jawaban' },
      ],
      answerKey: { correct: ['a'] },
    },
    {
      type: 'TRUE_FALSE',
      text: 'Pemahaman materi prasyarat sangat penting dalam mata kuliah ini.',
      points: 25,
      options: [
        { id: 'true', text: 'Benar' },
        { id: 'false', text: 'Salah' },
      ],
      answerKey: { correct: ['true'] },
    },
    {
      type: 'SHORT_ANSWER',
      text: 'Sebutkan singkatan dari Universitas Achmad Yani Banjarmasin:',
      points: 25,
      options: [],
      answerKey: { correct: ['UAY'] },
    },
    {
      type: 'ESSAY',
      text: 'Jelaskan relevansi mata kuliah ini terhadap kompetensi lulusan di dunia kerja profesional.',
      points: 25,
      options: [],
      answerKey: { correct: [] },
      rubric: [
        { title: 'Ketajaman analisis', points: 15 },
        { title: 'Relevansi contoh', points: 10 },
      ],
    },
  ].map((q) => questionSchema.parse(q));

  const bank = await db.questionBank.create({
    data: {
      courseId: courseMap.get(cfg.courseCode)!.id,
      title: `Bank Soal Kuis 1 · ${cfg.courseCode}`,
      questions: { create: questions.map(({ id: _qId, ...q }, order) => ({ ...q, order })) },
    },
  });

  const quiz = await db.quiz.upsert({
    where: { id: quizId },
    create: {
      id: quizId,
      sectionId: sec1.id,
      title: isPrimary ? 'Kuis 01 · Fondasi web' : `Kuis 01 · Pemahaman ${courseMap.get(cfg.courseCode)?.title}`,
      description: 'Evaluasi pemahaman konsep dasar perkuliahan.',
      status: 'PUBLISHED',
      gradeCategoryId: categories[1].id,
      timeLimitMinutes: 30,
      attemptLimit: 3,
      randomizeQuestions: true,
      resultReleaseMode: 'MANUAL',
      questions: {
        create: questions.map(({ id: _qId, ...q }, order) => ({ ...q, order, questionBankId: bank.id })),
      },
    },
    update: { status: 'PUBLISHED' },
    include: { questions: true },
  });

  // 6. Submissions & Quiz Attempts
  // Active classes: 4-5 submissions (some graded, some pending)
  // Archived classes: 5 submissions (100% graded + published)
  const isArchived = cfg.status === 'ARCHIVED';
  const submissionStudents = deptStudents.slice(0, isArchived ? 5 : 4);

  for (const [sIndex, std] of submissionStudents.entries()) {
    const isGraded = isArchived || sIndex < 2; // In active classes, student 0 & 1 graded, student 2 & 3 pending
    const score = 75 + ((sIndex * 7) % 21);
    const subDate = dateStr(isArchived ? 120 + sIndex * 2 : 10 + sIndex);

    await db.assignmentSubmission.upsert({
      where: {
        assignmentId_userId_version: {
          assignmentId: asg.id,
          userId: std.id,
          version: 1,
        },
      },
      create: {
        assignmentId: asg.id,
        userId: std.id,
        version: 1,
        status: isGraded ? 'GRADED' : 'SUBMITTED',
        score: isGraded ? score : null,
        isPublished: isGraded,
        feedback: isGraded ? `Tugas dari ${std.name} terstruktur dengan baik. Pertahankan kualitas analisis.` : null,
        textContent: `Laporan praktikum mandiri dari mahasiswa ${std.name}.`,
        externalUrl: `https://github.com/${std.identifierValue}/tugas-01`,
        submittedAt: subDate,
        gradedAt: isGraded ? dateStr(isArchived ? 115 : 5) : null,
      },
      update: {
        status: isGraded ? 'GRADED' : 'SUBMITTED',
        score: isGraded ? score : null,
        isPublished: isGraded,
      },
    });

    // Quiz Attempt
    const attemptDate = dateStr(isArchived ? 120 + sIndex : 8 + sIndex);
    const existingAttempt = await db.quizAttempt.findFirst({
      where: { quizId: quiz.id, userId: std.id, attemptNum: 1 },
    });

    if (!existingAttempt) {
      await db.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: std.id,
          attemptNum: 1,
          score: isGraded ? score : 50,
          objectiveScore: 50,
          isPassed: score >= 60,
          status: isGraded ? 'GRADED_COMPLETE' : 'NEEDS_GRADING',
          questionSnapshot: quiz.questions as any,
          answersJson: {
            [quiz.questions[0]?.id || 'q0']: ['a'],
            [quiz.questions[3]?.id || 'q3']: 'Konsep ini sangat relevan dengan kebutuhan industri saat ini.',
          },
          startedAt: attemptDate,
          submittedAt: new Date(+attemptDate + 1200000),
          expiresAt: new Date(+attemptDate + 1800000),
          isGraded: isGraded,
          publishedAt: isGraded ? dateStr(isArchived ? 115 : 4) : null,
        },
      });
    }
  }

  // 7. Announcements
  await db.announcement.upsert({
    where: { id: `80000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}` },
    create: {
      id: `80000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
      classId: cfg.id,
      title: `Selamat datang di ${courseMap.get(cfg.courseCode)?.title || cfg.name}`,
      content:
        'Silakan pelajari materi pertemuan pertama dan perhatikan tenggat pengumpulan tugas yang telah ditetapkan.',
      authorId: leadInstructor,
      isImportant: true,
      isPublished: true,
    },
    update: {},
  });

  // 8. Attendance Sessions
  const attSession = await db.attendanceSession.upsert({
    where: { id: `70000000-0000-4000-8000-${String(idx + 10).padStart(12, '0')}` },
    create: {
      id: `70000000-0000-4000-8000-${String(idx + 10).padStart(12, '0')}`,
      classId: cfg.id,
      sectionId: sec1.id,
      title: 'Pertemuan 01 · Tatap Muka Perdana',
      description: 'Presensi kehadiran perkuliahan tatap muka.',
      sessionDate: dateStr(isArchived ? 120 : 14),
      isOpen: false,
      allowSelfCheckIn: false,
      checkInCode: 'UAY101',
    },
    update: {},
  });

  for (const [stdPos, std] of deptStudents.slice(0, 6).entries()) {
    const status = stdPos === 4 ? 'SICK' : stdPos === 5 ? 'EXCUSED' : 'PRESENT';
    await db.attendanceRecord.upsert({
      where: { sessionId_userId: { sessionId: attSession.id, userId: std.id } },
      create: {
        sessionId: attSession.id,
        userId: std.id,
        status,
        checkedInAt: dateStr(isArchived ? 120 : 14),
        verifiedBy: leadInstructor,
      },
      update: {},
    });
  }

  // 9. Final Grades
  if (isArchived) {
    // 100% final grade publication for archived classes
    for (const std of deptStudents.slice(0, 5)) {
      await db.finalGradeRecord.upsert({
        where: { classId_userId: { classId: cfg.id, userId: std.id } },
        create: {
          classId: cfg.id,
          userId: std.id,
          finalScore: 84.5,
          gradeLetter: 'A',
          gradePoint: 4.0,
          gradeScaleVersion: '2026.1',
          isLocked: true,
          publishedAt: dateStr(90),
        },
        update: {},
      });
    }
  } else if (isPrimary) {
    // Single published final grade record for Mahasiswa 01 in demo class
    await db.finalGradeRecord.upsert({
      where: { classId_userId: { classId: ids.class, userId: students[0].id } },
      create: {
        classId: ids.class,
        userId: students[0].id,
        finalScore: 86.75,
        gradeLetter: 'A',
        gradePoint: 4.0,
        gradeScaleVersion: '2026.1',
        isLocked: true,
        publishedAt: dateStr(1),
      },
      update: {},
    });
  }
}

// ===========================================================================
// 6. RICH AUDIT LOGS: SIMULATE COMPREHENSIVE LECTURER & ADMIN ACTIVITY
// ===========================================================================

console.log('Seeding chronological audit logs (spanning Sept - Oct 2026)...');

const auditEntries: Array<{
  createdAt: Date;
  actorId: string;
  actorRole: 'INSTRUCTOR' | 'DEPARTMENT_ADMIN' | 'SUPER_ADMIN';
  action: string;
  entity: string;
  entityId: string;
  classId: string | null;
  metadata?: any;
}> = [];

// Seed system initialization log
auditEntries.push({
  createdAt: dateStr(35, 8, 0),
  actorId: ids.admin,
  actorRole: 'SUPER_ADMIN',
  action: 'SEED_DEVELOPMENT',
  entity: 'SYSTEM',
  entityId: 'system-init',
  classId: null,
  metadata: { reason: 'Initial academic year configuration 2026/2027' },
});

// For each of the 4 department admins:
for (const [deptIdx, admin] of adminUsers.filter((u) => u.role === 'DEPARTMENT_ADMIN').entries()) {
  const loginDays = [30, 24, 18, 12, 6, 1];
  for (const day of loginDays) {
    auditEntries.push({
      createdAt: dateStr(day + deptIdx, 7, 30),
      actorId: admin.id,
      actorRole: 'DEPARTMENT_ADMIN',
      action: 'LOGIN',
      entity: 'SESSION',
      entityId: `login-${admin.id}-${day}`,
      classId: null,
    });
    auditEntries.push({
      createdAt: dateStr(day + deptIdx, 8, 15),
      actorId: admin.id,
      actorRole: 'DEPARTMENT_ADMIN',
      action: 'UPDATE',
      entity: 'CLASS',
      entityId: classConfigs[deptIdx * 3].id,
      classId: classConfigs[deptIdx * 3].id,
    });
    auditEntries.push({
      createdAt: dateStr(day + deptIdx, 8, 45),
      actorId: admin.id,
      actorRole: 'DEPARTMENT_ADMIN',
      action: 'LOGOUT',
      entity: 'SESSION',
      entityId: `logout-${admin.id}-${day}`,
      classId: null,
    });
  }
}

// For each of the 12 lecturers: multi-day activity story
for (const [lIdx, lec] of lecturers.entries()) {
  const lecturerClasses = classConfigs.filter((c) => c.instructors.includes(lec.id) && c.status === 'PUBLISHED');
  const targetClass = lecturerClasses[0] || classConfigs[0];

  // Distinct active days across September and October
  const activeDays = [32, 28, 22, 17, 12, 7, 3, 1];

  for (const [dIdx, day] of activeDays.entries()) {
    const baseHour = 8 + (lIdx % 4);
    const loginTime = dateStr(day, baseHour, 10 + (lIdx * 3) % 40);
    const logoutTime = dateStr(day, baseHour + 2, 30);

    // 1. LOGIN
    auditEntries.push({
      createdAt: loginTime,
      actorId: lec.id,
      actorRole: 'INSTRUCTOR',
      action: 'LOGIN',
      entity: 'SESSION',
      entityId: `login-${lec.id}-${day}`,
      classId: null,
    });

    // 2. Academic actions depending on day in semester
    if (dIdx === 0) {
      // Early day: create sections and upload course materials
      auditEntries.push({
        createdAt: new Date(+loginTime + 15 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'CREATE',
        entity: 'SECTION',
        entityId: targetClass.id,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 30 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'CREATE',
        entity: 'RESOURCE',
        entityId: `res-${targetClass.id}-1`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 45 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'PUBLISH',
        entity: 'RESOURCE',
        entityId: `res-${targetClass.id}-1`,
        classId: targetClass.id,
      });
    } else if (dIdx === 1) {
      // Post announcement and create Assignment 1
      auditEntries.push({
        createdAt: new Date(+loginTime + 20 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'CREATE',
        entity: 'ANNOUNCEMENT',
        entityId: `ann-${targetClass.id}`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 40 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'CREATE',
        entity: 'ASSIGNMENT',
        entityId: `asg-${targetClass.id}`,
        classId: targetClass.id,
      });
    } else if (dIdx === 2) {
      // Create quiz and publish
      auditEntries.push({
        createdAt: new Date(+loginTime + 25 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'CREATE',
        entity: 'QUIZ',
        entityId: `quiz-${targetClass.id}`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 50 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'PUBLISH',
        entity: 'QUIZ',
        entityId: `quiz-${targetClass.id}`,
        classId: targetClass.id,
      });
    } else if (dIdx >= 3 && dIdx <= 5) {
      // Mid-semester: grading student submissions & quiz attempts
      auditEntries.push({
        createdAt: new Date(+loginTime + 20 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'GRADE_SUBMISSION',
        entity: 'SUBMISSION',
        entityId: `sub-${targetClass.id}-${dIdx}`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 45 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'GRADE_ATTEMPT',
        entity: 'QUIZ_ATTEMPT',
        entityId: `qa-${targetClass.id}-${dIdx}`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 70 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'PUBLISH_GRADES',
        entity: 'GRADE',
        entityId: `pub-${targetClass.id}-${dIdx}`,
        classId: targetClass.id,
      });
    } else {
      // Recent days: attendance checking and review
      auditEntries.push({
        createdAt: new Date(+loginTime + 20 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'UPDATE',
        entity: 'ATTENDANCE_RECORD',
        entityId: `att-${targetClass.id}`,
        classId: targetClass.id,
      });
      auditEntries.push({
        createdAt: new Date(+loginTime + 50 * 60000),
        actorId: lec.id,
        actorRole: 'INSTRUCTOR',
        action: 'GRADE_SUBMISSION',
        entity: 'SUBMISSION',
        entityId: `sub-${targetClass.id}-rec`,
        classId: targetClass.id,
      });
    }

    // 3. LOGOUT
    auditEntries.push({
      createdAt: logoutTime,
      actorId: lec.id,
      actorRole: 'INSTRUCTOR',
      action: 'LOGOUT',
      entity: 'SESSION',
      entityId: `logout-${lec.id}-${day}`,
      classId: null,
    });
  }
}

// Bulk insert audit logs
await db.auditLog.createMany({
  data: auditEntries.map((e) => ({
    actorId: e.actorId,
    actorRole: e.actorRole,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId,
    classId: e.classId,
    createdAt: e.createdAt,
    result: 'SUCCESS',
    metadata: e.metadata || {},
  })),
  skipDuplicates: true,
});

console.log(`✅ Seed finished successfully!`);
console.log(`   - 4 Program Studi: Informatika, Teknik Sipil, Akuntansi, Manajemen`);
console.log(`   - 6 Admins (Super Admin, Rektor, 4 Admin Prodi)`);
console.log(`   - 12 Dosen (3 per prodi)`);
console.log(`   - 40 Mahasiswa (10 per prodi)`);
console.log(`   - 12 Kelas Aktif (2026/2027 Ganjil) + 4 Kelas Arsip (2025/2026 Genap)`);
console.log(`   - ${auditEntries.length} Riwayat Aktivitas & Sesi Audit Log`);

await db.$disconnect();
