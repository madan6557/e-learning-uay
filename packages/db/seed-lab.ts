import { classPath } from '../shared/src/urls.js';
import { PrismaClient } from '@prisma/client';
import { loadEnvFile } from 'node:process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  loadEnvFile();
} catch {}

const db = new PrismaClient();

async function main() {
  console.log('--- Memulai Seeding Akun Demo (Dosen, M.Kom. & Mahasiswa 01 - 10) ---');

  // 1. Akun Dasar Pengelola & Dosen
  const staffUsers = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Admin UAY',
      role: 'SUPER_ADMIN' as const,
      userType: 'ADMIN' as const,
      identifierType: 'NIP' as const,
      identifierValue: 'ADM001',
    },
    {
      id: '00000000-0000-4000-8000-000000000006',
      name: 'Admin Prodi Informatika',
      role: 'DEPARTMENT_ADMIN' as const,
      userType: 'STAFF' as const,
      identifierType: 'NIP' as const,
      identifierValue: 'ADMIF01',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Dosen, M.Kom.',
      role: 'INSTRUCTOR' as const,
      userType: 'LECTURER' as const,
      identifierType: 'NIDN' as const,
      identifierValue: '1112089001',
    },
  ];

  // 2. Akun Mahasiswa 01 - 10
  const studentIds = [
    '00000000-0000-4000-8000-000000000003', // Mahasiswa 01 (Aditya)
    '00000000-0000-4000-8000-000000000004', // Mahasiswa 02 (Nadia)
    '00000000-0000-4000-8000-000000000005', // Mahasiswa 03 (Bima)
    '00000000-0000-4000-8000-000000000014', // Mahasiswa 04
    '00000000-0000-4000-8000-000000000015', // Mahasiswa 05
    '00000000-0000-4000-8000-000000000016', // Mahasiswa 06
    '00000000-0000-4000-8000-000000000017', // Mahasiswa 07
    '00000000-0000-4000-8000-000000000018', // Mahasiswa 08
    '00000000-0000-4000-8000-000000000019', // Mahasiswa 09
    '00000000-0000-4000-8000-000000000020', // Mahasiswa 10
  ];

  const students = studentIds.map((id, index) => {
    const num = String(index + 1).padStart(2, '0');
    return {
      id,
      name: `Mahasiswa ${num}`,
      role: 'STUDENT' as const,
      userType: 'STUDENT' as const,
      identifierType: 'NIM' as const,
      identifierValue: `2026010${num}`,
    };
  });

  const allUsers = [...staffUsers, ...students];

  for (const user of allUsers) {
    await db.user.upsert({
      where: { id: user.id },
      create: {
        ...user,
        ssoUserId: user.id,
        username: user.identifierValue.toLowerCase(),
        email: `${user.identifierValue.toLowerCase()}@example.test`,
        status: 'ACTIVE',
        departmentScopes: user.role === 'DEPARTMENT_ADMIN' ? ['IF'] : [],
      },
      update: {
        name: user.name,
        role: user.role,
        userType: user.userType,
        identifierType: user.identifierType,
        identifierValue: user.identifierValue,
        username: user.identifierValue.toLowerCase(),
        status: 'ACTIVE',
        departmentScopes: user.role === 'DEPARTMENT_ADMIN' ? ['IF'] : [],
      },
    });
  }
  console.log(`✓ Berhasil memperbarui akun: 1 Super Admin, 1 Admin Prodi, 1 Dosen ('Dosen, M.Kom.'), 10 Mahasiswa ('Mahasiswa 01' - 'Mahasiswa 10').`);

  // 3. Pastikan Kelas A (Pemrograman Web) Ada & Enrol Seluruh Mahasiswa 01 - 10
  const classAId = '20000000-0000-4000-8000-000000000001';
  const courseWebId = '10000000-0000-4000-8000-000000000001';

  let classA = await db.courseClass.findUnique({ where: { id: classAId } });
  if (!classA) {
    await db.course.upsert({
      where: { id: courseWebId },
      create: {
        id: courseWebId,
        code: 'IF2101',
        title: 'Pemrograman Web',
        description: 'Membangun aplikasi web yang terstruktur, aman, dan mudah digunakan.',
        departmentCode: 'IF',
        credits: 3,
        status: 'PUBLISHED',
      },
      update: { status: 'PUBLISHED' },
    });

    classA = await db.courseClass.create({
      data: {
        id: classAId,
        courseId: courseWebId,
        name: 'Kelas A',
        academicYear: '2026/2027 Ganjil',
        status: 'PUBLISHED',
        instructors: {
          create: [{ userId: '00000000-0000-4000-8000-000000000002' }],
        },
      },
    });
  }

  // Daftarkan & aktifkan seluruh Mahasiswa 01 - 10 ke Kelas A
  for (const s of students) {
    await db.enrollment.upsert({
      where: {
        classId_userId: {
          classId: classAId,
          userId: s.id,
        },
      },
      create: {
        classId: classAId,
        userId: s.id,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  }
  console.log(`✓ Seluruh Mahasiswa 01 - 10 aktif terdaftar di Kelas A (Pemrograman Web).`);

  // 4. Update Dokumen Daftar Akun Tester
  const tableRows = [
    '# DAFTAR AKUN DEMO E-LEARNING UAY',
    '',
    `Status: Akun demo berhasil diperbarui  `,
    `Dosen: Dosen, M.Kom. (Bukan nama orang asli)  `,
    `Mahasiswa: Mahasiswa 01 s/d Mahasiswa 10  `,
    `Aplikasi: https://e-learning-uay.vercel.app/  `,
    '',
    '## 1. Akun Pengelola & Dosen',
    '',
    '| No | Peran / Role | Nama Tampilan | Identitas (NIP/NIDN) | Akun SSO | Keterangan |',
    '|---|---|---|---|---|---|',
    '| 1 | Super Admin | Admin UAY | ADM001 | adm001 | Hak akses penuh seluruh sistem |',
    '| 2 | Admin Prodi | Admin Prodi Informatika | ADMIF01 | admif01 | Pengelola akademik Prodi IF |',
    '| 3 | Dosen Pengampu | **Dosen, M.Kom.** | 1112089001 | 1112089001 | Dosen pengampu Kelas A |',
    '',
    '## 2. Akun Mahasiswa 01 - 10 (Peserta Kelas A)',
    '',
    '| No | Nama Akun | NIM | Role | Status Kelas | Misi Pengujian Utama |',
    '|---|---|---|---|---|---|',
    '| 1 | **Mahasiswa 01** | 202601001 | Mahasiswa | Aktif di Kelas A | Eksplorasi materi kuliah & blok interaktif |',
    '| 2 | **Mahasiswa 02** | 202601002 | Mahasiswa | Aktif di Kelas A | Pengerjaan Kuis 01 (Pilihan Ganda & Isian) |',
    '| 3 | **Mahasiswa 03** | 202601003 | Mahasiswa | Aktif di Kelas A | Pengerjaan Kuis 01 (Menjodohkan & Urutan) |',
    '| 4 | **Mahasiswa 04** | 202601004 | Mahasiswa | Aktif di Kelas A | Pengumpulan Tugas Praktikum 01 (Teks & Link) |',
    '| 5 | **Mahasiswa 05** | 202601005 | Mahasiswa | Aktif di Kelas A | Pengumpulan Tugas Praktikum 01 (Unggah File ZIP) |',
    '| 6 | **Mahasiswa 06** | 202601006 | Mahasiswa | Aktif di Kelas A | Uji Rekap Nilai & Bobot Kategori |',
    '| 7 | **Mahasiswa 07** | 202601007 | Mahasiswa | Aktif di Kelas A | Uji Notifikasi & Pengumuman Dosen |',
    '| 8 | **Mahasiswa 08** | 202601008 | Mahasiswa | Aktif di Kelas A | Uji Navigasi Profil & Ganti Peran |',
    '| 9 | **Mahasiswa 09** | 202601009 | Mahasiswa | Aktif di Kelas A | Uji Responsivitas Mobile / HP |',
    '| 10 | **Mahasiswa 10** | 202601010 | Mahasiswa | Aktif di Kelas A | Negative Testing: Submit Form Kosong & Overtime |',
    '',
    '---',
    '',
    '## Cara Masuk:',
    '1. Buka `https://e-learning-uay.vercel.app/` di Google Chrome.',
    '2. Scroll ke bagian **"Akun demonstrasi"**.',
    '3. Cari akun yang ditugaskan (contoh: **Dosen, M.Kom.** atau **Mahasiswa 01** s/d **Mahasiswa 10**).',
    '4. Klik tombol **"Gunakan"**.',
  ];

  const outputDocPath = resolve(process.cwd(), 'docs/qa/DAFTAR-AKUN-TESTER.md');
  writeFileSync(outputDocPath, tableRows.join('\n'), 'utf8');
  console.log(`✓ Berkas daftar akun tersimpan di: docs/qa/DAFTAR-AKUN-TESTER.md`);
  console.log('--- Seeding Selesai Sukses! ---');
}

main()
  .catch((err) => {
    console.error('Error saat seeding lab:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
