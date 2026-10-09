import { classPath } from "../shared/src/urls.js";
import { PrismaClient } from "@prisma/client";
import { loadEnvFile } from "node:process";
import { questionSchema } from "../shared/src/domain.js";
import { generateAllDemoFiles, syncDemoFilesToStorage } from "./demo-media.js";
import { sampleAnnouncements } from "./system-announcement-fixtures.js";

try {
  loadEnvFile();
} catch {}

const allowSeedInProduction =
  process.env.DEMO_MODE === "true" ||
  process.env.ALLOW_SEED === "true" ||
  process.env.STAGING === "true" ||
  process.argv.includes("--force") ||
  process.argv.includes("--demo");

if (process.env.NODE_ENV === "production" && !allowSeedInProduction) {
  throw new Error(
    "Demo seed is disabled in production without explicit confirmation. To seed staging/demo VPS, run with --force or set DEMO_MODE=true / ALLOW_SEED=true.",
  );
}

const db = new PrismaClient();
await db.systemAnnouncement.createMany({
  data: sampleAnnouncements.map((item) => ({
    ...item,
    publishedAt: new Date(item.publishedAt),
    createdAt: new Date(item.createdAt),
  })),
  skipDuplicates: true,
});

export const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  instructor: "00000000-0000-4000-8000-000000000002",
  student: "00000000-0000-4000-8000-000000000003",
  student2: "00000000-0000-4000-8000-000000000004",
  outsider: "00000000-0000-4000-8000-000000000005",
  department: "00000000-0000-4000-8000-000000000006",
  rector: "00000000-0000-4000-8000-000000000007",
  course: "10000000-0000-4000-8000-000000000001",
  class: "20000000-0000-4000-8000-000000000001",
  section: "30000000-0000-4000-8000-000000000001",
  resource: "40000000-0000-4000-8000-000000000001",
  resourcePdf: "40000000-0000-4000-8000-000000000002",
  resourcePpt: "40000000-0000-4000-8000-000000000003",
  resourceVideo: "40000000-0000-4000-8000-000000000004",
  filePdf: "50000000-0000-4000-8000-000000000002",
  filePpt: "50000000-0000-4000-8000-000000000003",
  fileVideo: "50000000-0000-4000-8000-000000000004",
  quiz: "50000000-0000-4000-8000-000000000001",
  assignment: "60000000-0000-4000-8000-000000000001",
};

const WIB_OFFSET = 7 * 3600 * 1000;
const wibNow = new Date(Date.now() + WIB_OFFSET);
const todayMidnightWibMs =
  Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()) -
  WIB_OFFSET;

export const dateStr = (offsetDays: number, hour = 9, minute = 0) =>
  new Date(
    todayMidnightWibMs -
      offsetDays * 86400000 +
      hour * 3600000 +
      minute * 60000,
  );

// ===========================================================================
// 1. DATA DEFINITIONS: 4 PROGRAM STUDI & USERS
// ===========================================================================

export const DEPARTMENTS = [
  { code: "IF", name: "Informatika" },
  { code: "TS", name: "Teknik Sipil" },
  { code: "AK", name: "Akuntansi" },
  { code: "MN", name: "Manajemen" },
];

const adminUsers = [
  {
    id: ids.admin,
    name: "Admin UAY",
    role: "SUPER_ADMIN" as const,
    userType: "ADMIN" as const,
    identifierType: "NIP" as const,
    identifierValue: "ADM001",
    status: "ACTIVE" as const,
    departmentScopes: [] as string[],
    lastLoginAt: dateStr(0, 8, 15),
    lastActiveAt: dateStr(0, 9, 30),
  },
  {
    id: ids.rector,
    name: "Prof. Dr. Ir. H. Rektor UAY, M.Sc.",
    role: "RECTOR" as const,
    userType: "STAFF" as const,
    identifierType: "NIP" as const,
    identifierValue: "RKT001",
    status: "ACTIVE" as const,
    departmentScopes: [] as string[],
    lastLoginAt: dateStr(0, 10, 0),
    lastActiveAt: dateStr(0, 10, 45),
  },
  {
    id: ids.department,
    name: "Admin Prodi Informatika",
    role: "DEPARTMENT_ADMIN" as const,
    userType: "STAFF" as const,
    identifierType: "NIP" as const,
    identifierValue: "ADMIF01",
    status: "ACTIVE" as const,
    departmentScopes: ["Informatika", "IF"],
    lastLoginAt: dateStr(0, 7, 45),
    lastActiveAt: dateStr(0, 9, 15),
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    name: "Admin Prodi Teknik Sipil",
    role: "DEPARTMENT_ADMIN" as const,
    userType: "STAFF" as const,
    identifierType: "NIP" as const,
    identifierValue: "ADMTS01",
    status: "ACTIVE" as const,
    departmentScopes: ["Teknik Sipil", "TS"],
    lastLoginAt: dateStr(1, 14, 0),
    lastActiveAt: dateStr(1, 15, 0),
  },
  {
    id: "00000000-0000-4000-8000-000000000009",
    name: "Admin Prodi Akuntansi",
    role: "DEPARTMENT_ADMIN" as const,
    userType: "STAFF" as const,
    identifierType: "NIP" as const,
    identifierValue: "ADMAK01",
    status: "ACTIVE" as const,
    departmentScopes: ["Akuntansi", "AK"],
    lastLoginAt: dateStr(0, 8, 0),
    lastActiveAt: dateStr(0, 9, 30),
  },
  {
    id: "00000000-0000-4000-8000-000000000010",
    name: "Admin Prodi Manajemen",
    role: "DEPARTMENT_ADMIN" as const,
    userType: "STAFF" as const,
    identifierType: "NIP" as const,
    identifierValue: "ADMMN01",
    status: "ACTIVE" as const,
    departmentScopes: ["Manajemen", "MN"],
    lastLoginAt: dateStr(1, 15, 0),
    lastActiveAt: dateStr(1, 16, 15),
  },
];

export const lecturers = [
  // Informatika (3 dosen)
  {
    id: ids.instructor,
    name: "Dr. Aruna Prameswari",
    identifierValue: "1112089001",
    department: "Informatika",
    lastLoginAt: dateStr(0, 13, 45),
    lastActiveAt: dateStr(0, 15, 30),
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    name: "Bagas Mahendra, M.Kom.",
    identifierValue: "1112089002",
    department: "Informatika",
    lastLoginAt: dateStr(0, 10, 0),
    lastActiveAt: dateStr(0, 11, 45),
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    name: "Citra Adinata, M.Kom.",
    identifierValue: "1112089003",
    department: "Informatika",
    lastLoginAt: dateStr(1, 20, 15),
    lastActiveAt: dateStr(1, 22, 30),
  },

  // Teknik Sipil (3 dosen)
  {
    id: "00000000-0000-4000-8000-000000000020",
    name: "Dr. Damar Wicaksana",
    identifierValue: "1112089004",
    department: "Teknik Sipil",
    lastLoginAt: dateStr(1, 13, 30),
    lastActiveAt: dateStr(1, 14, 45),
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    name: "Elina Paramitha, M.T.",
    identifierValue: "1112089005",
    department: "Teknik Sipil",
    lastLoginAt: dateStr(0, 10, 15),
    lastActiveAt: dateStr(0, 12, 30),
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    name: "Farhan Kusuma, M.T.",
    identifierValue: "1112089006",
    department: "Teknik Sipil",
    lastLoginAt: dateStr(2, 14, 0),
    lastActiveAt: dateStr(2, 15, 30),
  },

  // Akuntansi (3 dosen)
  {
    id: "00000000-0000-4000-8000-000000000023",
    name: "Dr. Gita Larasati",
    identifierValue: "1112089007",
    department: "Akuntansi",
    lastLoginAt: dateStr(0, 8, 30),
    lastActiveAt: dateStr(0, 10, 45),
  },
  {
    id: "00000000-0000-4000-8000-000000000024",
    name: "Hadi Suryatama, M.Ak.",
    identifierValue: "1112089008",
    department: "Akuntansi",
    lastLoginAt: dateStr(1, 14, 0),
    lastActiveAt: dateStr(1, 15, 30),
  },
  {
    id: "00000000-0000-4000-8000-000000000025",
    name: "Intan Kirana, M.Ak.",
    identifierValue: "1112089009",
    department: "Akuntansi",
    lastLoginAt: dateStr(0, 14, 0),
    lastActiveAt: dateStr(0, 15, 45),
  },

  // Manajemen (3 dosen)
  {
    id: "00000000-0000-4000-8000-000000000026",
    name: "Dr. Jati Nugraha",
    identifierValue: "1112089010",
    department: "Manajemen",
    lastLoginAt: dateStr(1, 13, 30),
    lastActiveAt: dateStr(1, 15, 0),
  },
  {
    id: "00000000-0000-4000-8000-000000000027",
    name: "Kirana Wulandari, M.M.",
    identifierValue: "1112089011",
    department: "Manajemen",
    lastLoginAt: dateStr(0, 9, 30),
    lastActiveAt: dateStr(0, 11, 45),
  },
  {
    id: "00000000-0000-4000-8000-000000000028",
    name: "Laksana Pradipta, M.M.",
    identifierValue: "1112089012",
    department: "Manajemen",
    lastLoginAt: dateStr(3, 19, 30),
    lastActiveAt: dateStr(3, 21, 0),
  },
].map((l) => ({
  ...l,
  role: "INSTRUCTOR" as const,
  userType: "LECTURER" as const,
  identifierType: "NIDN" as const,
  status: "ACTIVE" as const,
  departmentScopes: [l.department],
}));

// 40 Mahasiswa: 10 per prodi
const studentNames: Record<string, string[]> = {
  Informatika: [
    "Ahmad Fauzi",
    "Bunga Lestari",
    "Cahyo Wibowo",
    "Dewi Anggraini",
    "Eko Prasetyo",
    "Fajar Nugroho",
    "Gita Permata",
    "Hendra Saputra",
    "Indah Wahyuni",
    "Joko Susilo",
  ],
  "Teknik Sipil": [
    "Kevin Sanjaya",
    "Larasati Putri",
    "Muhammad Rizky",
    "Nabila Syahrani",
    "Oscar Pratama",
    "Putri Maharani",
    "Qori Ramadhan",
    "Rian Hidayat",
    "Siti Nurhaliza",
    "Taufik Hidayat",
  ],
  Akuntansi: [
    "Umar Faruq",
    "Vina Panduwinata",
    "Wahyu Setiawan",
    "Xaverius Danu",
    "Yulia Rachmawati",
    "Zulfikar Ali",
    "Annisa Rahma",
    "Bagus Triadi",
    "Cindy Claudia",
    "Dimas Arya",
  ],
  Manajemen: [
    "Erwin Gutawa",
    "Fitri Handayani",
    "Gilang Dirga",
    "Hana Malasan",
    "Ivan Gunawan",
    "Jessica Iskandar",
    "Kemal Palevi",
    "Luna Maya",
    "Marcel Chandrawinata",
    "Nadia Vega",
  ],
};

const students: Array<{
  id: string;
  name: string;
  identifierValue: string;
  department: string;
  role: "STUDENT";
  userType: "STUDENT";
  identifierType: "NIM";
  status: "ACTIVE";
  departmentScopes: string[];
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
}> = [];

let stdIdx = 1;
for (const dept of DEPARTMENTS) {
  const names = studentNames[dept.name];
  for (let i = 0; i < 10; i++) {
    const nimPrefix =
      dept.code === "IF"
        ? "202601"
        : dept.code === "TS"
          ? "202602"
          : dept.code === "AK"
            ? "202603"
            : "202604";
    const nim = `${nimPrefix}${String(i + 1).padStart(3, "0")}`;
    let id = `00000000-0000-4000-8000-${String(stdIdx + 100).padStart(12, "0")}`;
    if (nim === "202601001") id = ids.student;
    else if (nim === "202601002") id = ids.student2;
    else if (nim === "202601003") id = ids.outsider;
    else if (dept.code === "IF") {
      id = `00000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`;
    }

    const lastLogin =
      i === 9 ? null : dateStr(i % 5, 8 + (i % 6), (i * 7) % 60);

    students.push({
      id,
      name: `${names[i]} (${dept.code})`,
      identifierValue: nim,
      department: dept.name,
      role: "STUDENT" as const,
      userType: "STUDENT" as const,
      identifierType: "NIM" as const,
      status: "ACTIVE" as const,
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

console.log(
  "Seeding users (Admin, Rector, 4 Admin Prodi, 12 Dosen, 40 Mahasiswa)...",
);
const allUsers = [...adminUsers, ...lecturers, ...students];
if (
  new Set(allUsers.map((user) => user.id)).size !== allUsers.length ||
  new Set(allUsers.map((user) => user.identifierValue)).size !== allUsers.length
) {
  throw new Error("Demo identities must have unique IDs and identifiers.");
}

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

console.log("Seeding courses across 4 program studi...");

const courseDefs = [
  // Informatika
  {
    id: ids.course,
    code: "IF2101",
    title: "Pemrograman Web",
    departmentCode: "Informatika",
    credits: 3,
    description:
      "Membangun aplikasi web yang terstruktur, aman, dan mudah digunakan.",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    code: "IF2102",
    title: "Basis Data",
    departmentCode: "Informatika",
    credits: 3,
    description:
      "Pemodelan data relasional, SQL tingkat lanjut, dan optimasi query.",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    code: "IF3103",
    title: "Rekayasa Perangkat Lunak",
    departmentCode: "Informatika",
    credits: 3,
    description:
      "Siklus hidup pengembangan perangkat lunak, arsitektur sistem, dan manajemen proyek.",
  },

  // Teknik Sipil
  {
    id: "10000000-0000-4000-8000-000000000004",
    code: "TS2101",
    title: "Mekanika Teknik",
    departmentCode: "Teknik Sipil",
    credits: 3,
    description:
      "Analisis gaya dalam struktur statis tertentu dan kestabilan konstruksi.",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    code: "TS2102",
    title: "Struktur Beton",
    departmentCode: "Teknik Sipil",
    credits: 3,
    description:
      "Perencanaan elemen struktur beton bertulang sesuai standar SNI terbaru.",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    code: "TS3103",
    title: "Manajemen Konstruksi",
    departmentCode: "Teknik Sipil",
    credits: 3,
    description:
      "Perencanaan penjadwalan proyek, estimasi biaya RAB, dan pengendalian mutu konstruksi.",
  },

  // Akuntansi
  {
    id: "10000000-0000-4000-8000-000000000007",
    code: "AK2101",
    title: "Akuntansi Keuangan",
    departmentCode: "Akuntansi",
    credits: 3,
    description:
      "Penyusunan laporan keuangan standar PSAK dan pengakuan pos neraca.",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    code: "AK2102",
    title: "Audit dan Assurance",
    departmentCode: "Akuntansi",
    credits: 3,
    description:
      "Standar audit profesional, penilaian risiko audit, dan pengumpulan bukti audit.",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    code: "AK3103",
    title: "Sistem Informasi Akuntansi",
    departmentCode: "Akuntansi",
    credits: 3,
    description:
      "Perancangan siklus transaksi bisnis, pengendalian internal, dan sistem enterprise ERP.",
  },

  // Manajemen
  {
    id: "10000000-0000-4000-8000-000000000010",
    code: "MN2101",
    title: "Manajemen Strategis",
    departmentCode: "Manajemen",
    credits: 3,
    description:
      "Analisis keunggulan bersaing, strategi korporat, dan eksekusi balanced scorecard.",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    code: "MN2102",
    title: "Perilaku Organisasi",
    departmentCode: "Manajemen",
    credits: 3,
    description:
      "Dinamika kepemimpinan tim, motivasi kerja, dan budaya korporasi modern.",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    code: "MN3103",
    title: "Pengantar Bisnis",
    departmentCode: "Manajemen",
    credits: 3,
    description:
      "Fondasi manajemen operasional, pemasaran produk, dan etika bisnis kontemporer.",
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
        status: "PUBLISHED",
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

console.log("Seeding classes (12 active classes + 4 archived classes)...");

interface ClassConfig {
  id: string;
  courseCode: string;
  name: string;
  semester: string;
  status: "PUBLISHED" | "ARCHIVED";
  department: string;
  instructors: string[];
}

const classConfigs: ClassConfig[] = [
  // 12 ACTIVE CLASSES (2026/2027 Ganjil)
  // Informatika
  {
    id: ids.class,
    courseCode: "IF2101",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Informatika",
    instructors: [ids.instructor, lecturers[2].id], // Shared: Dr. Aruna & Citra Adinata
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    courseCode: "IF2102",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Informatika",
    instructors: [lecturers[1].id], // Bagas Mahendra
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    courseCode: "IF3103",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Informatika",
    instructors: [lecturers[2].id], // Citra Adinata
  },

  // Teknik Sipil
  {
    id: "20000000-0000-4000-8000-000000000004",
    courseCode: "TS2101",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Teknik Sipil",
    instructors: [lecturers[3].id, lecturers[5].id], // Shared: Dr. Damar & Farhan Kusuma
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    courseCode: "TS2102",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Teknik Sipil",
    instructors: [lecturers[4].id], // Elina Paramitha
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    courseCode: "TS3103",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Teknik Sipil",
    instructors: [lecturers[5].id], // Farhan Kusuma
  },

  // Akuntansi
  {
    id: "20000000-0000-4000-8000-000000000007",
    courseCode: "AK2101",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Akuntansi",
    instructors: [lecturers[6].id, lecturers[8].id], // Shared: Dr. Gita & Intan Kirana
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    courseCode: "AK2102",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Akuntansi",
    instructors: [lecturers[7].id], // Hadi Suryatama
  },
  {
    id: "20000000-0000-4000-8000-000000000009",
    courseCode: "AK3103",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Akuntansi",
    instructors: [lecturers[8].id], // Intan Kirana
  },

  // Manajemen
  {
    id: "20000000-0000-4000-8000-000000000010",
    courseCode: "MN2101",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Manajemen",
    instructors: [lecturers[9].id, lecturers[11].id], // Shared: Dr. Jati & Laksana Pradipta
  },
  {
    id: "20000000-0000-4000-8000-000000000011",
    courseCode: "MN2102",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Manajemen",
    instructors: [lecturers[10].id], // Kirana Wulandari
  },
  {
    id: "20000000-0000-4000-8000-000000000012",
    courseCode: "MN3103",
    name: "Kelas A",
    semester: "2026/2027 Ganjil",
    status: "PUBLISHED",
    department: "Manajemen",
    instructors: [lecturers[11].id], // Laksana Pradipta
  },

  // 4 ARCHIVED CLASSES (2025/2026 Genap)
  {
    id: "20000000-0000-4000-8000-000000000013",
    courseCode: "IF2101",
    name: "Kelas Reguler (Arsip)",
    semester: "2025/2026 Genap",
    status: "ARCHIVED",
    department: "Informatika",
    instructors: [ids.instructor],
  },
  {
    id: "20000000-0000-4000-8000-000000000014",
    courseCode: "TS2101",
    name: "Kelas Reguler (Arsip)",
    semester: "2025/2026 Genap",
    status: "ARCHIVED",
    department: "Teknik Sipil",
    instructors: [lecturers[3].id],
  },
  {
    id: "20000000-0000-4000-8000-000000000015",
    courseCode: "AK2101",
    name: "Kelas Reguler (Arsip)",
    semester: "2025/2026 Genap",
    status: "ARCHIVED",
    department: "Akuntansi",
    instructors: [lecturers[6].id],
  },
  {
    id: "20000000-0000-4000-8000-000000000016",
    courseCode: "MN2101",
    name: "Kelas Reguler (Arsip)",
    semester: "2025/2026 Genap",
    status: "ARCHIVED",
    department: "Manajemen",
    instructors: [lecturers[9].id],
  },
];

// Map students by department
const studentsByDept: Record<string, typeof students> = {
  Informatika: students.filter((s) => s.department === "Informatika"),
  "Teknik Sipil": students.filter((s) => s.department === "Teknik Sipil"),
  Akuntansi: students.filter((s) => s.department === "Akuntansi"),
  Manajemen: students.filter((s) => s.department === "Manajemen"),
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
        gradeScaleVersion: "2026.1",
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

console.log(
  "Seeding learning materials, assignments, quizzes, and grade categories...",
);

// Generate demo files on disk for uploads/ and sync to S3 if configured
const generatedFiles = await syncDemoFilesToStorage();

// Upsert demo FileReferences in database for ids.class
const demoFiles = [
  {
    id: ids.filePdf,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: "RESOURCE",
    name: "Buku Panduan & Silabus Pemrograman Web.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1700,
    checksum: "f2e1f47ba23019888998",
    status: "READY",
  },
  {
    id: ids.filePpt,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: "RESOURCE",
    name: "Slide Presentasi Pertemuan 1 - Arsitektur Web.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2519,
    checksum: "c67811239a9c88776655",
    status: "READY",
  },
  {
    id: ids.fileVideo,
    classId: ids.class,
    ownerId: ids.instructor,
    purpose: "RESOURCE",
    name: "Video Pembelajaran - Alur HTTP Request Response.mp4",
    mimeType: "video/mp4",
    sizeBytes: 244,
    checksum: "1712f49341cd11223344",
    status: "READY",
  },
];

for (const f of demoFiles) {
  const metadata = generatedFiles.find((file) => file.id === f.id)!;
  f.sizeBytes = metadata.sizeBytes;
  f.checksum = metadata.checksum;
  await db.fileReference.upsert({
    where: { id: f.id },
    create: f,
    update: {
      name: f.name,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      checksum: f.checksum,
      status: f.status,
    },
  });
}

// Populate standard categories & items for ALL classes
for (const [idx, cfg] of classConfigs.entries()) {
  const isPrimary = cfg.id === ids.class;
  const leadInstructor = cfg.instructors[0];
  const deptStudents = studentsByDept[cfg.department];

  // 1. Grade Categories
  const catNames = [
    ["Tugas & praktikum", 25, false, "ASSIGNMENT"],
    ["Kuis", 15, false, "QUIZ"],
    ["UTS", 25, true, "MANUAL"],
    ["UAS", 25, true, "MANUAL"],
    ["Progres belajar", 10, false, "PROGRESS"],
  ] as const;

  const categories = [];
  for (const [
    order,
    [name, weight, isMandatory, sourceType],
  ] of catNames.entries()) {
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
          kind: order === 4 ? "PROGRESS" : "ASSESSMENT",
          isMandatory: Boolean(isMandatory),
          sourceType: String(sourceType),
        },
      });
    }
    categories.push(cat);
  }

  // 2. Sections
  const sec1Id = isPrimary
    ? ids.section
    : `30000000-0000-4000-8000-${String(idx * 3 + 1).padStart(12, "0")}`;
  const sec2Id = `30000000-0000-4000-8000-${String(idx * 3 + 2).padStart(12, "0")}`;
  const sec3Id = `30000000-0000-4000-8000-${String(idx * 3 + 3).padStart(12, "0")}`;

  const sec1 = await db.section.upsert({
    where: { id: sec1Id },
    create: {
      id: sec1Id,
      classId: cfg.id,
      title: isPrimary
        ? "Fondasi aplikasi web"
        : "Pertemuan 01 · Kontrak Kuliah & Pengantar",
      description: isPrimary
        ? "Kenali alur request–response dan susun halaman web pertama Anda."
        : "Silabus, kontrak belajar, dan pengantar konsep utama mata kuliah.",
      order: 0,
      type: "LECTURE",
      isVisible: true,
    },
    update: { isVisible: true },
  });

  await db.section.upsert({
    where: { id: sec2Id },
    create: {
      id: sec2Id,
      classId: cfg.id,
      title: isPrimary
        ? "Praktikum: halaman web semantik"
        : "Pertemuan 02 · Pendalaman Teori & Praktik",
      description: "Studi kasus dan penerapan terarah materi pertemuan.",
      order: 1,
      type: "LAB_PRACTICUM",
      isVisible: true,
    },
    update: { isVisible: true },
  });

  await db.section.upsert({
    where: { id: sec3Id },
    create: {
      id: sec3Id,
      classId: cfg.id,
      title: "Pertemuan 03 · Evaluasi & Diskusi Kelompok",
      description: "Pembahasan studi kasus lanjutan.",
      order: 2,
      type: "LECTURE",
      isVisible: cfg.status === "ARCHIVED",
    },
    update: {},
  });

  // 3. Resources
  if (isPrimary) {
    // Primary class uses the rich demo media demonstrating all 11 block types
    await db.resourceItem.upsert({
      where: { id: ids.resource },
      create: {
        id: ids.resource,
        sectionId: sec1.id,
        title: "Modul 01 · Arsitektur Web Modern & Fondasi Aplikasi",
        description:
          "Materi pembelajaran lengkap mendemonstrasikan seluruh tipe blok konten terstruktur.",
        resourceType: "RICH_TEXT",
        contentOrder: 0,
        dynamicPayload: {
          blocks: [
            {
              id: "intro-heading",
              type: "heading",
              data: {
                level: 1,
                text: "Arsitektur Web Modern: Fondasi Aplikasi & Siklus HTTP",
              },
            },
            {
              id: "intro-para",
              type: "paragraph",
              data: {
                text: "Selamat datang di perkuliahan Pemrograman Web Universitas Achmad Yani (UAY). Pada modul interaktif ini, kita akan mempelajari prinsip dasar bagaimana browser berkomunikasi dengan server melalui standar protokol internet global.",
              },
            },
            {
              id: "guide-callout",
              type: "callout",
              data: {
                title: "Panduan Belajar & Target Kompetensi",
                text: "Pelajari materi ini sebelum mengikuti sesi praktikum tatap muka. Catat konsep yang memerlukan pendalaman untuk sesi tanya jawab di ruang kelas.",
                alertType: "TIP",
              },
            },
            {
              id: "competency-checklist",
              type: "checklist",
              data: {
                items: [
                  {
                    id: "c1",
                    text: "Memahami model arsitektur Client-Server dan protokol HTTP",
                    checked: true,
                  },
                  {
                    id: "c2",
                    text: "Menyusun struktur dokumen HTML5 semantik dan aksesibel",
                    checked: true,
                  },
                  {
                    id: "c3",
                    text: "Menganalisis perbedaan idempotensi metode RESTful API",
                    checked: false,
                  },
                  {
                    id: "c4",
                    text: "Mengimplementasikan keamanan dasar web dan sertifikat TLS",
                    checked: false,
                  },
                ],
              },
            },
            {
              id: "code-example",
              type: "code_snippet",
              data: {
                filename: "index.html",
                language: "html",
                showLineNumbers: true,
                code: "<!DOCTYPE html>\n<html lang=\"id\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>Universitas Achmad Yani Banjarmasin</title>\n  </head>\n  <body>\n    <header>\n      <h1>E-Learning UAY</h1>\n      <nav><a href=\"#materi\">Materi Kuliah</a></nav>\n    </header>\n    <main>\n      <article>\n        <h2>Fondasi Web Semantik</h2>\n        <p>Halaman web terstruktur meningkatkan aksesibilitas dan SEO.</p>\n      </article>\n    </main>\n  </body>\n</html>",
              },
            },
            {
              id: "shannon-formula",
              type: "math_latex",
              data: {
                expression: "C = B \\log_2 \\left(1 + \\frac{S}{N}\\right)",
              },
            },
            {
              id: "http-table",
              type: "table",
              data: {
                header: true,
                rows: [
                  [
                    "Metode HTTP",
                    "Idempoten",
                    "Deskripsi Perilaku",
                    "Contoh Penggunaan",
                  ],
                  [
                    "GET",
                    "Ya",
                    "Membaca data tanpa efek samping",
                    "GET /api/v1/courses",
                  ],
                  [
                    "POST",
                    "Tidak",
                    "Mengirimkan data baru atau mutasi",
                    "POST /api/v1/submissions",
                  ],
                  [
                    "PUT",
                    "Ya",
                    "Menggantikan seluruh sumber daya",
                    "PUT /api/v1/files/upload/id",
                  ],
                  [
                    "DELETE",
                    "Ya",
                    "Menghapus sumber daya yang ditentukan",
                    "DELETE /api/v1/files/id",
                  ],
                ],
              },
            },
            {
              id: "syllabus-attachment",
              type: "file_attachment",
              data: {
                fileObjectId: ids.filePdf,
                displayName: "Silabus & RPS Pemrograman Web UAY (PDF Resmi)",
              },
            },
            {
              id: "media-video",
              type: "embed_media",
              data: {
                url: "https://www.youtube.com/watch?v=2JYT5f2isg4",
                title: "Video Pembelajaran: Bagaimana Web Bekerja (YouTube)",
              },
            },
            {
              id: "section-divider",
              type: "divider",
              data: {},
            },
            {
              id: "academic-caution",
              type: "callout",
              data: {
                title: "Perhatian Integritas Akademik",
                text: "Seluruh pengerjaan tugas dan kuis harus mengedepankan integritas akademik. Plagiarisme akan berakibat pada pembatalan nilai akhir perkuliahan.",
                alertType: "IMPORTANT",
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
        title: "Buku Panduan & Silabus Pemrograman Web",
        description: "Silabus perkuliahan dan RPS resmi dalam format PDF.",
        resourceType: "DOCUMENT",
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
        title: "Slide Presentasi Pertemuan 1 · Arsitektur Web",
        description: "Bahan tayang kuliah tatap muka mengenai arsitektur web.",
        resourceType: "DOCUMENT",
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
        title: "Video Pembelajaran · Alur HTTP Request–Response",
        description:
          "Penjelasan mendalam proses pengiriman request dari browser hingga respon server.",
        resourceType: "VIDEO_MEDIA",
        contentOrder: 3,
        dynamicPayload: {
          provider: "YOUTUBE",
          url: "https://www.youtube.com/embed/2JYT5f2isg4",
          durationSeconds: 300,
          minWatchPercent: 80,
        },
        isVisible: true,
      },
      update: {},
    });
  } else {
    // Other classes get standard syllabus & slide resource
    const resId = `40000000-0000-4000-8000-${String(idx * 2 + 10).padStart(12, "0")}`;
    await db.resourceItem.upsert({
      where: { id: resId },
      create: {
        id: resId,
        sectionId: sec1.id,
        title: `Modul Perkuliahan & RPS · ${courseMap.get(cfg.courseCode)?.title || cfg.name}`,
        description:
          "Silabus, rincian kompetensi pembelajaran, dan referensi bacaan wajib.",
        resourceType: "RICH_TEXT",
        contentOrder: 1,
        dynamicPayload: {
          blocks: [
            {
              id: "h1",
              type: "heading",
              data: { level: 2, text: `RPS ${cfg.courseCode}` },
            },
            {
              id: "p1",
              type: "paragraph",
              data: {
                text: "Pelajari capaian pembelajaran lulusan dan jadwal tatap muka semester ini.",
              },
            },
          ],
        },
        isVisible: true,
      },
      update: {},
    });
  }

  // 4. Assignments
  const assignmentId = isPrimary
    ? ids.assignment
    : `60000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`;
  const asg = await db.assignment.upsert({
    where: { id: assignmentId },
    create: {
      id: assignmentId,
      sectionId: sec1.id,
      title: isPrimary
        ? "Praktikum 01 · Halaman profil"
        : `Tugas 01 · Studi Kasus ${courseMap.get(cfg.courseCode)?.title}`,
      instructions:
        "Susun laporan analisis dan implementasi sesuai panduan praktikum. Unggah berkas atau tautan repositori.",
      gradeCategoryId: categories[0].id,
      maxScore: 100,
      allowedFormats: ["TEXT", "LINK", "ZIP", "PDF", "PNG"],
      deadline: dateStr(-7),
      cutoffDate: dateStr(-9),
      maxAttempts: 3,
      isVisible: true,
    },
    update: { isVisible: true },
  });

  // 5. Quizzes
  const quizId = isPrimary
    ? ids.quiz
    : `50000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`;
  const questions = (
    isPrimary
      ? [
          {
            type: "SINGLE_CHOICE",
            text: "Protokol komunikasi standar yang digunakan browser untuk meminta dokumen halaman dari web server adalah ...",
            points: 10,
            options: [
              { id: "a", text: "HTTP / HTTPS (Hypertext Transfer Protocol)" },
              { id: "b", text: "FTP (File Transfer Protocol)" },
              { id: "c", text: "SMTP (Simple Mail Transfer Protocol)" },
              { id: "d", text: "SSH (Secure Shell Protocol)" },
            ],
            answerKey: { correct: ["a"] },
          },
          {
            type: "MULTIPLE_SELECT",
            text: "Manakah dari elemen berikut yang merupakan tag HTML5 semantik? (Pilih semua yang benar)",
            points: 15,
            options: [
              { id: "opt1", text: "<header> - Bagian pembuka atau navigasi" },
              { id: "opt2", text: "<article> - Konten mandiri independen" },
              { id: "opt3", text: "<div> - Kontainer generik non-semantik" },
              { id: "opt4", text: "<main> - Konten utama dokumen" },
            ],
            answerKey: { correct: ["opt1", "opt2", "opt4"] },
          },
          {
            type: "TRUE_FALSE",
            text: "Menurut RFC 7231, metode HTTP POST bersifat idempoten karena menghasilkan efek samping yang sama jika dikirim berulang kali.",
            points: 10,
            options: [
              { id: "true", text: "Benar" },
              { id: "false", text: "Salah (POST tidak bersifat idempoten)" },
            ],
            answerKey: { correct: ["false"] },
          },
          {
            type: "SHORT_ANSWER",
            text: "Sebutkan singkatan dari Universitas Achmad Yani Banjarmasin:",
            points: 10,
            options: [],
            answerKey: { correct: ["UAY"] },
          },
          {
            type: "MATCHING",
            text: "Jodohkan kode status respon HTTP dengan maknanya yang tepat:",
            points: 15,
            options: [
              {
                id: "m1",
                text: "200 OK",
                rightText: "Permintaan berhasil diproses dan dikembalikan",
              },
              {
                id: "m2",
                text: "201 Created",
                rightText: "Sumber daya baru berhasil dibuat pada server",
              },
              {
                id: "m3",
                text: "404 Not Found",
                rightText: "Sumber daya yang diminta tidak ditemukan",
              },
              {
                id: "m4",
                text: "500 Internal Server Error",
                rightText: "Server mengalami galat internal yang tak terduga",
              },
            ],
            answerKey: { pairs: { m1: "m1", m2: "m2", m3: "m3", m4: "m4" } },
          },
          {
            type: "ORDERING",
            text: "Urutkan tahapan alur penanganan permintaan web dari sisi browser ke server:",
            points: 15,
            options: [
              { id: "s1", text: "1. Resolusi nama domain (DNS Lookup)" },
              { id: "s2", text: "2. Pembentukan koneksi TCP (Three-way Handshake)" },
              { id: "s3", text: "3. Negosiasi enkripsi TLS/SSL Handshake" },
              { id: "s4", text: "4. Pengiriman HTTP Request & Penerimaan HTML" },
            ],
            answerKey: { correct: ["s1", "s2", "s3", "s4"] },
          },
          {
            type: "ESSAY",
            text: "Jelaskan perbedaan mendasar arsitektur Client-Side Rendering (CSR) dengan Server-Side Rendering (SSR) beserta kelebihan masing-masing dalam konteks kecepatan rendering awal dan SEO!",
            points: 15,
            options: [],
            answerKey: { correct: [] },
            rubric: [
              { title: "Ketepatan konsep arsitektur CSR vs SSR", points: 8 },
              {
                title: "Analisis perbandingan FCP, SEO, dan beban server",
                points: 7,
              },
            ],
          },
          {
            type: "FILE_UPLOAD",
            text: "Unggah diagram arsitektur web aplikasi (format PNG, PDF, atau ZIP) yang menggambarkan alur Client, Web Server, dan Database!",
            points: 10,
            options: [],
            answerKey: { correct: [] },
            rubric: [
              {
                title: "Kelengkapan komponen arsitektur dan relasi",
                points: 10,
              },
            ],
          },
        ]
      : [
          {
            type: "SINGLE_CHOICE",
            text: `Konsep dasar dari materi ${courseMap.get(cfg.courseCode)?.title} adalah ...`,
            points: 25,
            options: [
              { id: "a", text: "Konseptual fundamental" },
              { id: "b", text: "Pilihan acak" },
              { id: "c", text: "Bukan jawaban" },
            ],
            answerKey: { correct: ["a"] },
          },
          {
            type: "TRUE_FALSE",
            text: "Pemahaman materi prasyarat sangat penting dalam mata kuliah ini.",
            points: 25,
            options: [
              { id: "true", text: "Benar" },
              { id: "false", text: "Salah" },
            ],
            answerKey: { correct: ["true"] },
          },
          {
            type: "SHORT_ANSWER",
            text: "Sebutkan singkatan dari Universitas Achmad Yani Banjarmasin:",
            points: 25,
            options: [],
            answerKey: { correct: ["UAY"] },
          },
          {
            type: "ESSAY",
            text: "Jelaskan relevansi mata kuliah ini terhadap kompetensi lulusan di dunia kerja profesional.",
            points: 25,
            options: [],
            answerKey: { correct: [] },
            rubric: [
              { title: "Ketajaman analisis", points: 15 },
              { title: "Relevansi contoh", points: 10 },
            ],
          },
        ]
  ).map((q) => questionSchema.parse(q));

  const bank = await db.questionBank.create({
    data: {
      courseId: courseMap.get(cfg.courseCode)!.id,
      title: `Bank Soal Kuis 1 · ${cfg.courseCode}`,
      questions: {
        create: questions.map(({ id: _qId, ...q }, order) => ({ ...q, order })),
      },
    },
  });

  const quiz = await db.quiz.upsert({
    where: { id: quizId },
    create: {
      id: quizId,
      sectionId: sec1.id,
      title: isPrimary
        ? "Kuis 01 · Evaluasi Fondasi Web (Komprehensif)"
        : `Kuis 01 · Pemahaman ${courseMap.get(cfg.courseCode)?.title}`,
      description: isPrimary
        ? "Kuis evaluasi mencakup seluruh 8 tipe soal: pilihan ganda, majemuk, benar/salah, isian, menjodohkan, mengurutkan, esai & unggah berkas."
        : "Evaluasi pemahaman konsep dasar perkuliahan.",
      status: "PUBLISHED",
      gradeCategoryId: categories[1].id,
      timeLimitMinutes: 45,
      attemptLimit: 3,
      randomizeQuestions: false,
      resultReleaseMode: "MANUAL",
      questions: {
        create: questions.map(({ id: _qId, ...q }, order) => ({
          ...q,
          order,
          questionBankId: bank.id,
        })),
      },
    },
    update: { status: "PUBLISHED" },
    include: { questions: true },
  });

  if (isPrimary) {
    // Kuis 02 Interaktif: Terbuka untuk dicoba pengguna saat live demo
    const liveQuizId = "50000000-0000-4000-8000-000000000099";
    await db.quiz.upsert({
      where: { id: liveQuizId },
      create: {
        id: liveQuizId,
        sectionId: sec2Id,
        title: "Kuis 02 · Uji Coba Interaktif Mandiri (Live Demo)",
        description:
          "Kuis terbuka untuk uji coba langsung semua tipe soal dengan rilis nilai instan.",
        status: "PUBLISHED",
        gradeCategoryId: categories[1].id,
        timeLimitMinutes: 60,
        attemptLimit: 10,
        randomizeQuestions: false,
        resultReleaseMode: "IMMEDIATE",
        questions: {
          create: questions.map(({ id: _qId, ...q }, order) => ({
            ...q,
            order,
            questionBankId: bank.id,
          })),
        },
      },
      update: { status: "PUBLISHED" },
    });
  }

  // 6. Submissions & Quiz Attempts
  // Active classes: 4-5 submissions (some graded, some pending)
  // Archived classes: 5 submissions (100% graded + published)
  const isArchived = cfg.status === "ARCHIVED";
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
        status: isGraded ? "GRADED" : "SUBMITTED",
        score: isGraded ? score : null,
        isPublished: isGraded,
        feedback: isGraded
          ? `Tugas dari ${std.name} terstruktur dengan baik. Pertahankan kualitas analisis.`
          : null,
        textContent: `Laporan praktikum mandiri dari mahasiswa ${std.name}.`,
        externalUrl: `https://github.com/${std.identifierValue}/tugas-01`,
        submittedAt: subDate,
        gradedAt: isGraded ? dateStr(isArchived ? 115 : 5) : null,
      },
      update: {
        status: isGraded ? "GRADED" : "SUBMITTED",
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
          status: isGraded ? "GRADED_COMPLETE" : "NEEDS_GRADING",
          questionSnapshot: quiz.questions as any,
          answersJson: {
            [quiz.questions[0]?.id || "q0"]: ["a"],
            [quiz.questions[3]?.id || "q3"]:
              "Konsep ini sangat relevan dengan kebutuhan industri saat ini.",
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
    where: {
      id: `80000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`,
    },
    create: {
      id: `80000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`,
      classId: cfg.id,
      title: `Selamat datang di ${courseMap.get(cfg.courseCode)?.title || cfg.name}`,
      content:
        "Silakan pelajari materi pertemuan pertama dan perhatikan tenggat pengumpulan tugas yang telah ditetapkan.",
      authorId: leadInstructor,
      isImportant: true,
      isPublished: true,
    },
    update: {},
  });

  // 8. Attendance Sessions
  const attSession = await db.attendanceSession.upsert({
    where: {
      id: `70000000-0000-4000-8000-${String(idx + 10).padStart(12, "0")}`,
    },
    create: {
      id: `70000000-0000-4000-8000-${String(idx + 10).padStart(12, "0")}`,
      classId: cfg.id,
      sectionId: sec1.id,
      title: "Pertemuan 01 · Tatap Muka Perdana",
      description: "Presensi kehadiran perkuliahan tatap muka.",
      sessionDate: dateStr(isArchived ? 120 : 14),
      isOpen: false,
      allowSelfCheckIn: false,
      checkInCode: "UAY101",
    },
    update: {},
  });

  for (const [stdPos, std] of deptStudents.slice(0, 6).entries()) {
    const status = stdPos === 4 ? "SICK" : stdPos === 5 ? "EXCUSED" : "PRESENT";
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

  if (isPrimary) {
    // Sesi Presensi Terbuka: Aktif untuk uji coba mandiri saat demo
    await db.attendanceSession.upsert({
      where: {
        id: "70000000-0000-4000-8000-000000000099",
      },
      create: {
        id: "70000000-0000-4000-8000-000000000099",
        classId: cfg.id,
        sectionId: sec2Id,
        title: "Pertemuan 02 · Presensi Mandiri Aktif (Live Demo)",
        description:
          "Sesi presensi mandiri aktif untuk demonstrasi. Masukkan kode UAY2026 untuk check-in.",
        sessionDate: new Date(),
        isOpen: true,
        allowSelfCheckIn: true,
        checkInCode: "UAY2026",
      },
      update: {
        isOpen: true,
        allowSelfCheckIn: true,
        checkInCode: "UAY2026",
      },
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
          gradeLetter: "A",
          gradePoint: 4.0,
          gradeScaleVersion: "2026.1",
          isLocked: true,
          publishedAt: dateStr(90),
          categoryScoresJson: categories.map((c) => ({
            categoryId: c.id,
            name: c.name,
            weight: c.weightPercent,
            score: 85,
          })),
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
        gradeLetter: "A",
        gradePoint: 4.0,
        gradeScaleVersion: "2026.1",
        isLocked: true,
        publishedAt: dateStr(1),
        categoryScoresJson: categories.map((c, i) => ({
          categoryId: c.id,
          name: c.name,
          weight: c.weightPercent,
          score: [88, 80, 86, 88, 100][i] ?? 85,
        })),
      },
      update: {},
    });
  }
}

// ===========================================================================
// 6. RICH AUDIT LOGS: SIMULATE COMPREHENSIVE LECTURER & ADMIN ACTIVITY
// ===========================================================================

console.log("Seeding chronological audit logs (spanning Sept - Oct 2026)...");

const auditEntries: Array<{
  createdAt: Date;
  actorId: string;
  actorRole: "INSTRUCTOR" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
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
  actorRole: "SUPER_ADMIN",
  action: "SEED_DEVELOPMENT",
  entity: "SYSTEM",
  entityId: "system-init",
  classId: null,
  metadata: { reason: "Initial academic year configuration 2026/2027" },
});

// For each of the 4 department admins:
// For each of the 4 department admins: realistic multi-day login sessions
const adminSchedules: Record<
  string,
  Array<{ day: number; hour: number; minute: number; durationMin: number }>
> = {
  [ids.department]: [
    { day: 0, hour: 7, minute: 45, durationMin: 90 },
    { day: 1, hour: 7, minute: 30, durationMin: 90 },
    { day: 1, hour: 13, minute: 0, durationMin: 75 },
    { day: 3, hour: 8, minute: 0, durationMin: 90 },
    { day: 6, hour: 7, minute: 45, durationMin: 90 },
    { day: 10, hour: 8, minute: 15, durationMin: 90 },
    { day: 15, hour: 7, minute: 30, durationMin: 90 },
    { day: 20, hour: 8, minute: 0, durationMin: 90 },
    { day: 26, hour: 7, minute: 45, durationMin: 90 },
    { day: 32, hour: 8, minute: 0, durationMin: 90 },
  ],
  ["00000000-0000-4000-8000-000000000008"]: [
    { day: 1, hour: 8, minute: 0, durationMin: 90 },
    { day: 1, hour: 14, minute: 0, durationMin: 60 },
    { day: 2, hour: 8, minute: 30, durationMin: 75 },
    { day: 5, hour: 8, minute: 0, durationMin: 90 },
    { day: 8, hour: 8, minute: 15, durationMin: 75 },
    { day: 12, hour: 8, minute: 0, durationMin: 90 },
    { day: 18, hour: 8, minute: 30, durationMin: 75 },
    { day: 24, hour: 8, minute: 0, durationMin: 90 },
    { day: 30, hour: 8, minute: 15, durationMin: 75 },
  ],
  ["00000000-0000-4000-8000-000000000009"]: [
    { day: 0, hour: 8, minute: 0, durationMin: 90 },
    { day: 2, hour: 7, minute: 45, durationMin: 90 },
    { day: 2, hour: 13, minute: 30, durationMin: 75 },
    { day: 4, hour: 8, minute: 15, durationMin: 90 },
    { day: 7, hour: 8, minute: 0, durationMin: 75 },
    { day: 11, hour: 8, minute: 30, durationMin: 90 },
    { day: 16, hour: 8, minute: 0, durationMin: 75 },
    { day: 22, hour: 8, minute: 15, durationMin: 90 },
    { day: 28, hour: 8, minute: 0, durationMin: 90 },
  ],
  ["00000000-0000-4000-8000-000000000010"]: [
    { day: 1, hour: 8, minute: 15, durationMin: 90 },
    { day: 1, hour: 15, minute: 0, durationMin: 75 },
    { day: 3, hour: 8, minute: 0, durationMin: 90 },
    { day: 5, hour: 8, minute: 30, durationMin: 75 },
    { day: 9, hour: 8, minute: 0, durationMin: 90 },
    { day: 14, hour: 8, minute: 15, durationMin: 75 },
    { day: 19, hour: 8, minute: 0, durationMin: 90 },
    { day: 25, hour: 8, minute: 30, durationMin: 75 },
    { day: 31, hour: 8, minute: 0, durationMin: 90 },
  ],
};

for (const [deptIdx, admin] of adminUsers
  .filter((u) => u.role === "DEPARTMENT_ADMIN")
  .entries()) {
  const specs = adminSchedules[admin.id] || [];
  for (const s of specs) {
    const loginTime = dateStr(s.day, s.hour, s.minute);
    const logoutTime = dateStr(s.day, s.hour, s.minute + s.durationMin);
    auditEntries.push({
      createdAt: loginTime,
      actorId: admin.id,
      actorRole: "DEPARTMENT_ADMIN",
      action: "LOGIN",
      entity: "SESSION",
      entityId: `login-${admin.id}-${s.day}-${s.hour}`,
      classId: null,
    });
    auditEntries.push({
      createdAt: new Date(+loginTime + 25 * 60000),
      actorId: admin.id,
      actorRole: "DEPARTMENT_ADMIN",
      action: "UPDATE",
      entity: "CLASS",
      entityId: classConfigs[deptIdx * 3].id,
      classId: classConfigs[deptIdx * 3].id,
    });
    auditEntries.push({
      createdAt: logoutTime,
      actorId: admin.id,
      actorRole: "DEPARTMENT_ADMIN",
      action: "LOGOUT",
      entity: "SESSION",
      entityId: `logout-${admin.id}-${s.day}-${s.hour}`,
      classId: null,
    });
  }
}

// Multi-session schedules for all 12 lecturers across 4 prodi
interface SessionSpec {
  day: number;
  hour: number;
  minute: number;
  durationMin: number;
  noLogout?: boolean;
  actions: Array<
    | "MATERI"
    | "ASESMEN"
    | "PENILAIAN"
    | "PUBLIKASI"
    | "KOREKSI"
    | "PENGUMUMAN"
    | "PRESENSI"
  >;
}

const lecturerSchedules: Record<string, SessionSpec[]> = {
  // 1. Dr. Aruna Prameswari (Informatika - Koordinator & Super Aktif: 34 logins across 19 days)
  [ids.instructor]: [
    {
      day: 0,
      hour: 8,
      minute: 0,
      durationMin: 140,
      actions: ["PRESENSI", "MATERI"],
    },
    {
      day: 0,
      hour: 13,
      minute: 45,
      durationMin: 105,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    {
      day: 1,
      hour: 8,
      minute: 15,
      durationMin: 150,
      actions: ["MATERI", "ASESMEN"],
    },
    { day: 1, hour: 14, minute: 0, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 1, hour: 19, minute: 30, durationMin: 90, actions: ["PENGUMUMAN"] },
    {
      day: 2,
      hour: 8,
      minute: 30,
      durationMin: 135,
      actions: ["PRESENSI", "MATERI"],
    },
    { day: 2, hour: 15, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    {
      day: 3,
      hour: 8,
      minute: 0,
      durationMin: 135,
      actions: ["MATERI", "ASESMEN"],
    },
    {
      day: 3,
      hour: 20,
      minute: 0,
      durationMin: 90,
      noLogout: true,
      actions: ["PENGUMUMAN"],
    },
    {
      day: 5,
      hour: 8,
      minute: 15,
      durationMin: 135,
      actions: ["PRESENSI", "PENILAIAN"],
    },
    { day: 5, hour: 13, minute: 30, durationMin: 105, actions: ["PUBLIKASI"] },
    { day: 7, hour: 8, minute: 0, durationMin: 150, actions: ["MATERI"] },
    {
      day: 7,
      hour: 14,
      minute: 0,
      durationMin: 120,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    { day: 7, hour: 19, minute: 45, durationMin: 60, actions: ["PENGUMUMAN"] },
    { day: 9, hour: 8, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    { day: 11, hour: 8, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 11, hour: 13, minute: 45, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 13, hour: 9, minute: 0, durationMin: 135, actions: ["ASESMEN"] },
    {
      day: 15,
      hour: 8,
      minute: 15,
      durationMin: 135,
      actions: ["PRESENSI", "MATERI"],
    },
    { day: 15, hour: 14, minute: 15, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 17, hour: 8, minute: 0, durationMin: 150, actions: ["MATERI"] },
    { day: 17, hour: 20, minute: 15, durationMin: 90, actions: ["PENGUMUMAN"] },
    { day: 19, hour: 8, minute: 30, durationMin: 150, actions: ["PRESENSI"] },
    {
      day: 21,
      hour: 8,
      minute: 0,
      durationMin: 135,
      actions: ["MATERI", "ASESMEN"],
    },
    { day: 21, hour: 14, minute: 0, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 23, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 25, hour: 8, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 25, hour: 15, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    {
      day: 28,
      hour: 8,
      minute: 0,
      durationMin: 150,
      actions: ["ASESMEN", "MATERI"],
    },
    { day: 28, hour: 13, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 30, hour: 8, minute: 30, durationMin: 150, actions: ["PRESENSI"] },
    { day: 32, hour: 8, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 32, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 34, hour: 8, minute: 30, durationMin: 120, actions: ["MATERI"] },
  ],

  // 2. Bagas Mahendra, M.Kom. (Informatika - Dosen Menengah: 20 logins across 13 days)
  ["00000000-0000-4000-8000-000000000011"]: [
    { day: 0, hour: 10, minute: 0, durationMin: 105, actions: ["PRESENSI"] },
    {
      day: 1,
      hour: 9,
      minute: 30,
      durationMin: 150,
      actions: ["MATERI", "ASESMEN"],
    },
    { day: 1, hour: 13, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 3, hour: 9, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 3, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 5, hour: 10, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 7, hour: 9, minute: 30, durationMin: 150, actions: ["ASESMEN"] },
    { day: 7, hour: 15, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 10, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 13, hour: 9, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 13, hour: 14, minute: 15, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 16, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 19, hour: 9, minute: 15, durationMin: 150, actions: ["ASESMEN"] },
    { day: 22, hour: 9, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 22, hour: 13, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 26, hour: 10, minute: 0, durationMin: 120, actions: ["PRESENSI"] },
    { day: 29, hour: 9, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 29, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 33, hour: 9, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 33, hour: 13, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
  ],

  // 3. Citra Adinata, M.Kom. (Informatika - Dosen Praktikum: 26 logins across 16 days)
  ["00000000-0000-4000-8000-000000000012"]: [
    {
      day: 1,
      hour: 13,
      minute: 0,
      durationMin: 165,
      actions: ["MATERI", "ASESMEN"],
    },
    {
      day: 1,
      hour: 20,
      minute: 15,
      durationMin: 135,
      noLogout: true,
      actions: ["PENILAIAN"],
    },
    { day: 2, hour: 13, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    {
      day: 2,
      hour: 20,
      minute: 0,
      durationMin: 105,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    { day: 4, hour: 13, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 6, hour: 13, minute: 0, durationMin: 150, actions: ["ASESMEN"] },
    { day: 6, hour: 19, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 8, hour: 14, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 10, hour: 13, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 10, hour: 20, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 12, hour: 13, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 14, hour: 13, minute: 45, durationMin: 135, actions: ["MATERI"] },
    { day: 14, hour: 19, minute: 45, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 17, hour: 13, minute: 0, durationMin: 150, actions: ["ASESMEN"] },
    { day: 19, hour: 13, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 19, hour: 20, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 22, hour: 13, minute: 15, durationMin: 150, actions: ["PRESENSI"] },
    { day: 22, hour: 19, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 25, hour: 14, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 25, hour: 19, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 28, hour: 13, minute: 30, durationMin: 135, actions: ["ASESMEN"] },
    { day: 28, hour: 20, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 31, hour: 13, minute: 0, durationMin: 150, actions: ["MATERI"] },
    { day: 31, hour: 20, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 34, hour: 14, minute: 0, durationMin: 120, actions: ["PRESENSI"] },
    { day: 34, hour: 19, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
  ],

  // 4. Dr. Damar Wicaksana (Teknik Sipil - Senior: 15 logins across 11 days)
  ["00000000-0000-4000-8000-000000000020"]: [
    {
      day: 1,
      hour: 8,
      minute: 30,
      durationMin: 150,
      actions: ["MATERI", "PRESENSI"],
    },
    { day: 1, hour: 13, minute: 30, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 4, hour: 8, minute: 15, durationMin: 150, actions: ["ASESMEN"] },
    { day: 7, hour: 8, minute: 30, durationMin: 165, actions: ["MATERI"] },
    { day: 7, hour: 14, minute: 0, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 11, hour: 8, minute: 45, durationMin: 135, actions: ["PRESENSI"] },
    { day: 14, hour: 8, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 14, hour: 13, minute: 45, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 18, hour: 8, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 21, hour: 8, minute: 30, durationMin: 150, actions: ["ASESMEN"] },
    { day: 25, hour: 8, minute: 45, durationMin: 150, actions: ["MATERI"] },
    { day: 25, hour: 14, minute: 0, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 28, hour: 8, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    { day: 32, hour: 8, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 35, hour: 8, minute: 30, durationMin: 135, actions: ["PENILAIAN"] },
  ],

  // 5. Elina Paramitha, M.T. (Teknik Sipil - Rajin Menilai: 29 logins across 18 days)
  ["00000000-0000-4000-8000-000000000021"]: [
    { day: 0, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    {
      day: 1,
      hour: 10,
      minute: 30,
      durationMin: 135,
      actions: ["MATERI", "ASESMEN"],
    },
    {
      day: 1,
      hour: 19,
      minute: 15,
      durationMin: 165,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    { day: 2, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    {
      day: 2,
      hour: 19,
      minute: 30,
      durationMin: 135,
      noLogout: true,
      actions: ["PENILAIAN"],
    },
    { day: 4, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 4, hour: 19, minute: 0, durationMin: 150, actions: ["PENILAIAN"] },
    { day: 6, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 8, hour: 10, minute: 30, durationMin: 150, actions: ["ASESMEN"] },
    { day: 8, hour: 19, minute: 45, durationMin: 120, actions: ["PENILAIAN"] },
    { day: 10, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 12, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 12, hour: 19, minute: 15, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 14, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 16, hour: 10, minute: 30, durationMin: 135, actions: ["ASESMEN"] },
    { day: 16, hour: 19, minute: 30, durationMin: 150, actions: ["PENILAIAN"] },
    { day: 18, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 20, hour: 10, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 20, hour: 19, minute: 0, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 22, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 22, hour: 19, minute: 30, durationMin: 120, actions: ["PENILAIAN"] },
    { day: 24, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 24, hour: 19, minute: 30, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 27, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 27, hour: 19, minute: 0, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 29, hour: 10, minute: 30, durationMin: 135, actions: ["ASESMEN"] },
    { day: 29, hour: 19, minute: 15, durationMin: 135, actions: ["PENILAIAN"] },
    { day: 32, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 34, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
  ],

  // 6. Farhan Kusuma, M.T. (Teknik Sipil - Beban Minimal: 11 logins across 8 days)
  ["00000000-0000-4000-8000-000000000022"]: [
    {
      day: 2,
      hour: 10,
      minute: 0,
      durationMin: 135,
      actions: ["MATERI", "PRESENSI"],
    },
    { day: 2, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 5, hour: 10, minute: 15, durationMin: 135, actions: ["ASESMEN"] },
    { day: 5, hour: 14, minute: 30, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 10, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 15, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 19, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 19, hour: 14, minute: 15, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 24, hour: 10, minute: 15, durationMin: 135, actions: ["ASESMEN"] },
    { day: 29, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 33, hour: 10, minute: 30, durationMin: 120, actions: ["MATERI"] },
  ],

  // 7. Dr. Gita Larasati (Akuntansi - Kaprodi & Aktif: 27 logins across 17 days)
  ["00000000-0000-4000-8000-000000000023"]: [
    { day: 0, hour: 8, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    {
      day: 1,
      hour: 7,
      minute: 45,
      durationMin: 150,
      actions: ["MATERI", "ASESMEN"],
    },
    {
      day: 1,
      hour: 15,
      minute: 30,
      durationMin: 105,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    { day: 2, hour: 8, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 2, hour: 14, minute: 0, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 3, hour: 8, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 5, hour: 7, minute: 45, durationMin: 150, actions: ["ASESMEN"] },
    { day: 5, hour: 15, minute: 0, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 7, hour: 8, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 7, hour: 14, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 9, hour: 8, minute: 15, durationMin: 150, actions: ["MATERI"] },
    { day: 12, hour: 7, minute: 45, durationMin: 150, actions: ["PRESENSI"] },
    { day: 12, hour: 15, minute: 15, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 14, hour: 8, minute: 0, durationMin: 150, actions: ["ASESMEN"] },
    { day: 16, hour: 8, minute: 30, durationMin: 150, actions: ["MATERI"] },
    { day: 16, hour: 14, minute: 15, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 18, hour: 7, minute: 45, durationMin: 150, actions: ["PRESENSI"] },
    { day: 21, hour: 8, minute: 0, durationMin: 150, actions: ["MATERI"] },
    { day: 21, hour: 15, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 24, hour: 8, minute: 15, durationMin: 150, actions: ["ASESMEN"] },
    { day: 24, hour: 14, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 27, hour: 7, minute: 45, durationMin: 150, actions: ["PRESENSI"] },
    { day: 27, hour: 14, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 30, hour: 8, minute: 0, durationMin: 150, actions: ["MATERI"] },
    { day: 30, hour: 15, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 33, hour: 8, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 35, hour: 8, minute: 0, durationMin: 135, actions: ["MATERI"] },
  ],

  // 8. Hadi Suryatama, M.Ak. (Akuntansi - Standar: 17 logins across 12 days)
  ["00000000-0000-4000-8000-000000000024"]: [
    {
      day: 1,
      hour: 9,
      minute: 15,
      durationMin: 135,
      actions: ["MATERI", "PRESENSI"],
    },
    { day: 1, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 4, hour: 9, minute: 30, durationMin: 150, actions: ["ASESMEN"] },
    { day: 4, hour: 14, minute: 15, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 6, hour: 9, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 9, hour: 9, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 9, hour: 13, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 12, hour: 9, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 15, hour: 9, minute: 0, durationMin: 150, actions: ["ASESMEN"] },
    { day: 15, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 18, hour: 9, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    { day: 22, hour: 9, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 22, hour: 14, minute: 15, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 25, hour: 9, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 28, hour: 9, minute: 30, durationMin: 135, actions: ["ASESMEN"] },
    { day: 32, hour: 9, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 35, hour: 9, minute: 0, durationMin: 135, actions: ["PENILAIAN"] },
  ],

  // 9. Intan Kirana, M.Ak. (Akuntansi - Teraktif Kampus: 35 logins across 20 days)
  ["00000000-0000-4000-8000-000000000025"]: [
    { day: 0, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    {
      day: 0,
      hour: 14,
      minute: 0,
      durationMin: 105,
      actions: ["PENILAIAN", "PUBLIKASI"],
    },
    { day: 1, hour: 8, minute: 15, durationMin: 105, actions: ["MATERI"] },
    { day: 1, hour: 13, minute: 15, durationMin: 105, actions: ["ASESMEN"] },
    { day: 1, hour: 20, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 2, hour: 8, minute: 30, durationMin: 105, actions: ["PRESENSI"] },
    { day: 2, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 3, hour: 8, minute: 0, durationMin: 120, actions: ["MATERI"] },
    {
      day: 3,
      hour: 20,
      minute: 15,
      durationMin: 105,
      noLogout: true,
      actions: ["PENGUMUMAN"],
    },
    { day: 4, hour: 8, minute: 30, durationMin: 120, actions: ["PRESENSI"] },
    { day: 6, hour: 8, minute: 15, durationMin: 105, actions: ["MATERI"] },
    { day: 6, hour: 13, minute: 30, durationMin: 105, actions: ["ASESMEN"] },
    { day: 6, hour: 19, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 8, hour: 8, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 8, hour: 14, minute: 15, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 10, hour: 8, minute: 30, durationMin: 120, actions: ["MATERI"] },
    { day: 12, hour: 8, minute: 15, durationMin: 105, actions: ["PRESENSI"] },
    { day: 12, hour: 13, minute: 45, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 14, hour: 8, minute: 0, durationMin: 135, actions: ["ASESMEN"] },
    { day: 16, hour: 8, minute: 30, durationMin: 120, actions: ["MATERI"] },
    { day: 16, hour: 14, minute: 0, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 18, hour: 8, minute: 15, durationMin: 105, actions: ["PRESENSI"] },
    { day: 20, hour: 8, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 20, hour: 13, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 22, hour: 8, minute: 30, durationMin: 120, actions: ["PRESENSI"] },
    { day: 24, hour: 8, minute: 15, durationMin: 105, actions: ["ASESMEN"] },
    { day: 24, hour: 14, minute: 15, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 26, hour: 8, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 29, hour: 8, minute: 30, durationMin: 120, actions: ["PRESENSI"] },
    { day: 29, hour: 13, minute: 45, durationMin: 105, actions: ["PENILAIAN"] },
    { day: 31, hour: 8, minute: 15, durationMin: 105, actions: ["MATERI"] },
    { day: 33, hour: 8, minute: 0, durationMin: 135, actions: ["ASESMEN"] },
    { day: 33, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 35, hour: 8, minute: 30, durationMin: 105, actions: ["PRESENSI"] },
  ],

  // 10. Dr. Jati Nugraha (Manajemen - Teratur: 16 logins across 11 days)
  ["00000000-0000-4000-8000-000000000026"]: [
    {
      day: 1,
      hour: 8,
      minute: 45,
      durationMin: 150,
      actions: ["MATERI", "PRESENSI"],
    },
    { day: 1, hour: 13, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 2, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 5, hour: 8, minute: 45, durationMin: 150, actions: ["ASESMEN"] },
    { day: 5, hour: 14, minute: 0, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 8, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 12, hour: 8, minute: 45, durationMin: 150, actions: ["MATERI"] },
    { day: 12, hour: 13, minute: 45, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 15, hour: 9, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 19, hour: 8, minute: 45, durationMin: 150, actions: ["ASESMEN"] },
    { day: 19, hour: 14, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 22, hour: 9, minute: 0, durationMin: 150, actions: ["PRESENSI"] },
    { day: 26, hour: 8, minute: 45, durationMin: 150, actions: ["MATERI"] },
    { day: 26, hour: 13, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 29, hour: 9, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 33, hour: 8, minute: 45, durationMin: 135, actions: ["MATERI"] },
  ],

  // 11. Kirana Wulandari, M.M. (Manajemen - Aktif: 23 logins across 15 days)
  ["00000000-0000-4000-8000-000000000027"]: [
    { day: 0, hour: 9, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    {
      day: 1,
      hour: 10,
      minute: 0,
      durationMin: 135,
      actions: ["MATERI", "ASESMEN"],
    },
    { day: 1, hour: 16, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 2, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 4, hour: 10, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 4, hour: 15, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 6, hour: 10, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    { day: 8, hour: 10, minute: 0, durationMin: 135, actions: ["ASESMEN"] },
    { day: 8, hour: 16, minute: 0, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 10, hour: 10, minute: 15, durationMin: 135, actions: ["PRESENSI"] },
    { day: 12, hour: 10, minute: 0, durationMin: 135, actions: ["MATERI"] },
    { day: 12, hour: 15, minute: 45, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 15, hour: 10, minute: 30, durationMin: 135, actions: ["PRESENSI"] },
    { day: 18, hour: 10, minute: 0, durationMin: 135, actions: ["ASESMEN"] },
    { day: 18, hour: 16, minute: 0, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 21, hour: 10, minute: 15, durationMin: 135, actions: ["MATERI"] },
    { day: 21, hour: 15, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 25, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 25, hour: 15, minute: 30, durationMin: 90, actions: ["PENILAIAN"] },
    { day: 28, hour: 10, minute: 30, durationMin: 135, actions: ["MATERI"] },
    { day: 28, hour: 16, minute: 0, durationMin: 75, actions: ["PENILAIAN"] },
    { day: 31, hour: 10, minute: 0, durationMin: 135, actions: ["PRESENSI"] },
    { day: 34, hour: 10, minute: 15, durationMin: 120, actions: ["MATERI"] },
  ],

  // 12. Laksana Pradipta, M.M. (Manajemen - Minimal / Santai: 9 logins across 7 days)
  ["00000000-0000-4000-8000-000000000028"]: [
    {
      day: 3,
      hour: 13,
      minute: 30,
      durationMin: 105,
      actions: ["MATERI", "PRESENSI"],
    },
    {
      day: 3,
      hour: 19,
      minute: 30,
      durationMin: 90,
      noLogout: true,
      actions: ["PENGUMUMAN"],
    },
    { day: 6, hour: 13, minute: 45, durationMin: 105, actions: ["PRESENSI"] },
    { day: 11, hour: 13, minute: 30, durationMin: 105, actions: ["ASESMEN"] },
    { day: 11, hour: 16, minute: 0, durationMin: 60, actions: ["PENILAIAN"] },
    { day: 16, hour: 13, minute: 15, durationMin: 105, actions: ["PRESENSI"] },
    { day: 21, hour: 13, minute: 30, durationMin: 105, actions: ["MATERI"] },
    { day: 27, hour: 13, minute: 45, durationMin: 105, actions: ["PRESENSI"] },
    { day: 32, hour: 13, minute: 30, durationMin: 105, actions: ["PENILAIAN"] },
  ],
};

// For each of the 12 lecturers: execute their multi-session story
for (const lec of lecturers) {
  const specs = lecturerSchedules[lec.id] || [];
  const lecturerClasses = classConfigs.filter(
    (c) => c.instructors.includes(lec.id) && c.status === "PUBLISHED",
  );
  const targetClass = lecturerClasses[0] || classConfigs[0];

  for (let sIdx = 0; sIdx < specs.length; sIdx++) {
    const spec = specs[sIdx];
    const loginTime = dateStr(spec.day, spec.hour, spec.minute);
    const logoutTime = dateStr(
      spec.day,
      spec.hour,
      spec.minute + spec.durationMin,
    );

    // 1. LOGIN
    auditEntries.push({
      createdAt: loginTime,
      actorId: lec.id,
      actorRole: "INSTRUCTOR",
      action: "LOGIN",
      entity: "SESSION",
      entityId: `login-${lec.id}-${spec.day}-${spec.hour}`,
      classId: null,
    });

    // 2. Open class (ACCESS)
    auditEntries.push({
      createdAt: new Date(+loginTime + 3 * 60000),
      actorId: lec.id,
      actorRole: "INSTRUCTOR",
      action: "ACCESS",
      entity: "CLASS",
      entityId: targetClass.id,
      classId: targetClass.id,
    });

    // 3. Academic actions in this session
    let offsetMin = 8;
    for (const act of spec.actions) {
      const actTime = new Date(+loginTime + offsetMin * 60000);
      offsetMin += 14;

      if (act === "MATERI") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "CREATE",
          entity: "RESOURCE",
          entityId: `res-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
        auditEntries.push({
          createdAt: new Date(+actTime + 5 * 60000),
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "PUBLISH",
          entity: "RESOURCE",
          entityId: `res-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "ASESMEN") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "CREATE",
          entity: "ASSIGNMENT",
          entityId: `asg-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "PENILAIAN") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "GRADE_SUBMISSION",
          entity: "SUBMISSION",
          entityId: `sub-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "PUBLIKASI") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "PUBLISH_GRADES",
          entity: "GRADE",
          entityId: `pub-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "KOREKSI") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "CORRECT",
          entity: "GRADE",
          entityId: `cor-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "PENGUMUMAN") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "CREATE",
          entity: "ANNOUNCEMENT",
          entityId: `ann-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      } else if (act === "PRESENSI") {
        auditEntries.push({
          createdAt: actTime,
          actorId: lec.id,
          actorRole: "INSTRUCTOR",
          action: "UPDATE",
          entity: "ATTENDANCE_RECORD",
          entityId: `att-${targetClass.id}-${spec.day}-${spec.hour}`,
          classId: targetClass.id,
        });
      }
    }

    // 4. LOGOUT (omitted if noLogout is true for unclosed session demonstration)
    if (!spec.noLogout) {
      auditEntries.push({
        createdAt: logoutTime,
        actorId: lec.id,
        actorRole: "INSTRUCTOR",
        action: "LOGOUT",
        entity: "SESSION",
        entityId: `logout-${lec.id}-${spec.day}-${spec.hour}`,
        classId: null,
      });
    }
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
    result: "SUCCESS",
    metadata: e.metadata || {},
  })),
  skipDuplicates: true,
});

console.log(`✅ Seed finished successfully!`);
console.log(
  `   - 4 Program Studi: Informatika, Teknik Sipil, Akuntansi, Manajemen`,
);
console.log(`   - 6 Admins (Super Admin, Rektor, 4 Admin Prodi)`);
console.log(`   - 12 Dosen (3 per prodi)`);
console.log(`   - 40 Mahasiswa (10 per prodi)`);
console.log(
  `   - 12 Kelas Aktif (2026/2027 Ganjil) + 4 Kelas Arsip (2025/2026 Genap)`,
);
console.log(`   - ${auditEntries.length} Riwayat Aktivitas & Sesi Audit Log`);

await db.$disconnect();
