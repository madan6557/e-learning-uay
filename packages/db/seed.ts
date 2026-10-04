import { classPath } from '../shared/src/urls.js';
import { PrismaClient } from '@prisma/client';
import { loadEnvFile } from 'node:process';
import { questionSchema } from '../shared/src/domain.js';
import { generateAllDemoFiles } from './demo-media.js';
try{loadEnvFile();}catch{}
if(process.env.NODE_ENV==='production' && process.env.AUTH_MODE!=='development' && process.env.DEMO_MODE!=='true' && process.env.RESET_DB_ON_DEPLOY!=='true' && process.env.SEED_ON_DEPLOY!=='true')throw new Error('Demo seed is disabled in production.');
const db=new PrismaClient();
export const ids={
  admin:'00000000-0000-4000-8000-000000000001',
  instructor:'00000000-0000-4000-8000-000000000002',
  student:'00000000-0000-4000-8000-000000000003',
  student2:'00000000-0000-4000-8000-000000000004',
  outsider:'00000000-0000-4000-8000-000000000005',
  department:'00000000-0000-4000-8000-000000000006',
  course:'10000000-0000-4000-8000-000000000001',
  class:'20000000-0000-4000-8000-000000000001',
  section:'30000000-0000-4000-8000-000000000001',
  resource:'40000000-0000-4000-8000-000000000001',
  resourcePdf:'40000000-0000-4000-8000-000000000002',
  resourcePpt:'40000000-0000-4000-8000-000000000003',
  resourceVideo:'40000000-0000-4000-8000-000000000004',
  filePdf:'50000000-0000-4000-8000-000000000002',
  filePpt:'50000000-0000-4000-8000-000000000003',
  fileVideo:'50000000-0000-4000-8000-000000000004',
  quiz:'50000000-0000-4000-8000-000000000001',
  assignment:'60000000-0000-4000-8000-000000000001'
};

const students = [
  { id: ids.student, name: 'Mahasiswa 01', identifierValue: '202601001' },
  { id: ids.student2, name: 'Mahasiswa 02', identifierValue: '202601002' },
  { id: ids.outsider, name: 'Mahasiswa 03', identifierValue: '202601003' },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Mahasiswa 04', identifierValue: '202601004' },
  { id: '00000000-0000-4000-8000-000000000015', name: 'Mahasiswa 05', identifierValue: '202601005' },
  { id: '00000000-0000-4000-8000-000000000016', name: 'Mahasiswa 06', identifierValue: '202601006' },
  { id: '00000000-0000-4000-8000-000000000017', name: 'Mahasiswa 07', identifierValue: '202601007' },
  { id: '00000000-0000-4000-8000-000000000018', name: 'Mahasiswa 08', identifierValue: '202601008' },
  { id: '00000000-0000-4000-8000-000000000019', name: 'Mahasiswa 09', identifierValue: '202601009' },
  { id: '00000000-0000-4000-8000-000000000020', name: 'Mahasiswa 10', identifierValue: '202601010' },
].map((s) => ({
  ...s,
  role: 'STUDENT' as const,
  userType: 'STUDENT' as const,
  identifierType: 'NIM' as const,
}));

const users = [
  { id: ids.admin, name: 'Admin UAY', role: 'SUPER_ADMIN' as const, userType: 'ADMIN' as const, identifierType: 'NIP' as const, identifierValue: 'ADM001', status: 'ACTIVE' as const },
  { id: ids.department, name: 'Admin Prodi Informatika', role: 'DEPARTMENT_ADMIN' as const, userType: 'STAFF' as const, identifierType: 'NIP' as const, identifierValue: 'ADMIF01', status: 'ACTIVE' as const },
  { id: ids.instructor, name: 'Dosen, M.Kom.', role: 'INSTRUCTOR' as const, userType: 'LECTURER' as const, identifierType: 'NIDN' as const, identifierValue: '1112089001', status: 'ACTIVE' as const },
  ...students.map(s => ({ ...s, status: 'ACTIVE' as const })),
] as const;

// Clean up any leftover chaos/disabled demo accounts
await db.user.deleteMany({ where: { identifierValue: { in: ['202602001', '202609999'] } } });

for(const user of users){
  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { identifierValue: user.identifierValue },
        { email: `${user.identifierValue.toLowerCase()}@example.test` }
      ]
    }
  });
  if (existingUser) {
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        name: user.name,
        role: user.role,
        userType: user.userType,
        identifierType: user.identifierType,
        identifierValue: user.identifierValue,
        username: user.identifierValue.toLowerCase(),
        status: user.status,
        departmentScopes: user.role === 'DEPARTMENT_ADMIN' ? ['IF'] : [],
      }
    });
  } else {
    await db.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: `${user.identifierValue.toLowerCase()}@example.test`,
        role: user.role,
        userType: user.userType,
        identifierType: user.identifierType,
        identifierValue: user.identifierValue,
        username: user.identifierValue.toLowerCase(),
        status: user.status,
        ssoUserId: user.id,
        departmentScopes: user.role === 'DEPARTMENT_ADMIN' ? ['IF'] : [],
      }
    });
  }
}

if(!await db.courseClass.findUnique({where:{id:ids.class}})){
  await db.$transaction(async tx=>{
    let course = await tx.course.findUnique({ where: { code: 'IF2101' } });
    if (!course) {
      course = await tx.course.create({
        data: {
          id: ids.course,
          code: 'IF2101',
          title: 'Pemrograman Web',
          description: 'Membangun aplikasi web yang terstruktur, aman, dan mudah digunakan.',
          departmentCode: 'IF',
          credits: 3,
          status: 'PUBLISHED',
        },
      });
    }
    await tx.courseClass.create({data:{id:ids.class,courseId:course.id,name:'Kelas A',academicYear:'2026/2027 Ganjil',status:'PUBLISHED',gradeScaleVersion:'2026.1',instructors:{create:{userId:ids.instructor}},enrollments:{create:students.map(s=>({userId:s.id}))}}});
    const categories=[];
    for(const [i,[name,weight,isMandatory,sourceType]] of [
      ['Tugas & praktikum', 25, false, 'ASSIGNMENT'],
      ['Kuis', 15, false, 'QUIZ'],
      ['UTS', 25, true, 'MANUAL'],
      ['UAS', 25, true, 'MANUAL'],
      ['Progres belajar', 10, false, 'PROGRESS'],
    ].entries()) {
      categories.push(await tx.gradeCategory.create({
        data:{
          classId:ids.class,
          name:String(name),
          weightPercent:Number(weight),
          order:i,
          kind:i===4?'PROGRESS':'ASSESSMENT',
          isMandatory: Boolean(isMandatory),
          sourceType: String(sourceType),
        }
      }));
    }
    await tx.section.create({data:{id:ids.section,classId:ids.class,title:'Fondasi aplikasi web',description:'Kenali alur request–response dan susun halaman web pertama Anda.',order:0,type:'LECTURE'}});
    await tx.resourceItem.create({data:{id:ids.resource,sectionId:ids.section,title:'Memahami cara kerja web',resourceType:'RICH_TEXT',dynamicPayload:{blocks:[{id:'intro',type:'heading',data:{level:2,text:'Dari browser menuju server'}},{id:'paragraph',type:'paragraph',data:{text:'Setiap halaman web dimulai dari sebuah permintaan. Browser meminta sumber daya melalui HTTP, lalu server mengembalikan respons yang dapat berupa HTML, JSON, gambar, atau berkas lainnya.'}},{id:'note',type:'callout',data:{alertType:'TIP',title:'Coba langsung',text:'Buka Developer Tools pada browser, pilih tab Network, lalu muat ulang halaman untuk mengamati permintaan HTTP.'}},{id:'code',type:'code_snippet',data:{language:'javascript',filename:'request.js',showLineNumbers:true,code:'const response = await fetch("/api/v1/course-classes");\nconst classes = await response.json();\nconsole.log(classes);'}},{id:'check',type:'checklist',data:{items:[{id:'step-1',text:'Identifikasi metode HTTP pada satu permintaan.',checked:false},{id:'step-2',text:'Periksa status respons dan tipe kontennya.',checked:false}]}},{id:'table',type:'table',data:{header:true,rows:[['Metode','Kegunaan'],['GET','Membaca data'],['POST','Membuat data'],['PATCH','Memperbarui data']]}}]}}});
    await tx.section.create({data:{classId:ids.class,title:'Praktikum: halaman web semantik',description:'Latihan menyusun konten dan formulir yang aksesibel.',order:1,type:'LAB_PRACTICUM'}});
    await tx.section.create({data:{classId:ids.class,title:'Menghubungkan antarmuka dengan API',description:'Pertemuan selanjutnya.',order:2,type:'LECTURE',isVisible:false}});
    const questions=[
      {type:'SINGLE_CHOICE',text:'Metode HTTP untuk membaca daftar mata kuliah adalah ...',points:10,options:[{id:'a',text:'GET'},{id:'b',text:'DELETE'},{id:'c',text:'PATCH'}],answerKey:{correct:['a']}},
      {type:'MULTIPLE_SELECT',text:'Pilih elemen HTML semantik.',points:15,options:[{id:'a',text:'header'},{id:'b',text:'main'},{id:'c',text:'div'}],answerKey:{correct:['a','b'],partialCredit:true}},
      {type:'TRUE_FALSE',text:'Server harus memvalidasi data yang dikirim browser.',points:10,options:[{id:'true',text:'Benar'},{id:'false',text:'Salah'}],answerKey:{correct:['true']}},
      {type:'SHORT_ANSWER',text:'Status HTTP untuk respons berhasil adalah ...',points:10,options:[],answerKey:{correct:['200']}},
      {type:'MATCHING',text:'Pasangkan peran komponen dengan deskripsinya.',points:10,options:[{id:'a',text:'Browser / Menampilkan antarmuka'},{id:'b',text:'Server / Memproses permintaan'}],answerKey:{correct:[],pairs:{a:'a',b:'b'}}},
      {type:'ORDERING',text:'Urutkan tahapan pengambilan data.',points:10,options:[{id:'a',text:'Kirim request'},{id:'b',text:'Server memproses'},{id:'c',text:'Terima response'}],answerKey:{correct:['a','b','c']}},
      {type:'ESSAY',text:'Jelaskan mengapa validasi data diperlukan di server walaupun formulir sudah divalidasi di browser.',points:25,options:[],answerKey:{correct:[]},rubric:[{title:'Ketepatan konsep',points:15},{title:'Contoh penerapan',points:10}]},
      {type:'FILE_UPLOAD',text:'Unggah contoh halaman HTML Anda dalam berkas ZIP atau tangkapan layar PNG.',points:10,options:[],answerKey:{correct:[]}},
    ].map(q=>questionSchema.parse(q));
    const bank=await tx.questionBank.create({data:{courseId:course.id,title:'Dasar pemrograman web',questions:{create:questions.map(({id,...q},order)=>({...q,order}))}}});
    await tx.quiz.create({data:{id:ids.quiz,sectionId:ids.section,title:'Kuis 01 · Fondasi web',description:'Evaluasi delapan bentuk soal untuk menguji pemahaman konsep web.',status:'PUBLISHED',gradeCategoryId:categories[1].id,timeLimitMinutes:30,attemptLimit:3,randomizeQuestions:true,randomizeOptions:true,resultReleaseMode:'MANUAL',questions:{create:questions.map(({id,...q},order)=>({...q,order,questionBankId:bank.id}))}}});
    const now=Date.now();await tx.assignment.create({data:{id:ids.assignment,sectionId:ids.section,title:'Praktikum 01 · Halaman profil',instructions:'Buat halaman profil menggunakan HTML semantik. Sertakan judul, deskripsi singkat, daftar kegiatan, dan formulir kontak. Kumpulkan kode sebagai ZIP, tautan repositori, atau penjelasan dalam teks.',gradeCategoryId:categories[0].id,maxScore:100,allowedFormats:['TEXT','LINK','ZIP','PDF','PNG'],deadline:new Date(now+7*86400000),cutoffDate:new Date(now+9*86400000),maxAttempts:3,isVisible:true}});
    await tx.announcement.create({data:{classId:ids.class,title:'Selamat datang di Pemrograman Web',content:'Pertemuan pertama dimulai dengan fondasi HTTP dan HTML semantik. Baca materi pengantar sebelum mengerjakan praktikum. Gunakan ruang ini untuk memantau progres dan hasil belajar Anda.',authorId:ids.instructor,isImportant:true}});
    await tx.notification.create({data:{userId:ids.student,type:'ANNOUNCEMENT',title:'Kelas Pemrograman Web sudah tersedia',message:'Mulai dari pertemuan pertama.',eventKey:'demo-welcome',linkUrl:classPath(await tx.courseClass.findUniqueOrThrow({where:{id:ids.class}}))}});
    await tx.auditLog.create({data:{actorId:ids.admin,actorRole:'SUPER_ADMIN',action:'SEED_DEVELOPMENT',entity:'CLASS',entityId:ids.class,classId:ids.class,afterState:{name:'Kelas A'},metadata:{requestId:'local-seed',reason:'Isolated demonstration data'}}});
  });
}

// Ensure active enrollment for all 10 students in Kelas A
if(await db.courseClass.findUnique({where:{id:ids.class}})){
  for(const s of students) {
    const existingEnroll = await db.enrollment.findFirst({
      where: { classId: ids.class, userId: s.id }
    });
    if (existingEnroll) {
      await db.enrollment.update({
        where: { id: existingEnroll.id },
        data: { isActive: true }
      });
    } else {
      await db.enrollment.create({
        data: { classId: ids.class, userId: s.id, isActive: true }
      });
    }
  }
}

// Dosen: Pastikan ada antrean tugas & kuis siap dinilai (dari Mahasiswa 02)
if(await db.assignment.findUnique({where:{id:ids.assignment}})){
  const existingSub = await db.assignmentSubmission.findFirst({
    where: { assignmentId: ids.assignment, userId: students[1].id, version: 1 }
  });
  if (existingSub) {
    await db.assignmentSubmission.update({
      where: { id: existingSub.id },
      data: { status: 'SUBMITTED' }
    });
  } else {
    await db.assignmentSubmission.create({
      data: {
        assignmentId: ids.assignment,
        userId: students[1].id,
        version: 1,
        status: 'SUBMITTED',
        textContent: 'Yth. Dosen, berikut submisi Praktikum 01 saya mengenai halaman profil HTML semantik. Repositori kode dan demo sudah saya lampirkan.',
        externalUrl: 'https://github.com/mahasiswa02/praktikum-web',
        submittedAt: new Date(Date.now() - 3600000)
      }
    });
  }
}

const quizRecord = await db.quiz.findUnique({where:{id:ids.quiz},include:{questions:true}});
if(quizRecord && quizRecord.questions.length > 0){
  const existingAttempt = await db.quizAttempt.findFirst({
    where: { quizId: ids.quiz, userId: students[1].id, attemptNum: 1 }
  });
  if (existingAttempt) {
    await db.quizAttempt.update({
      where: { id: existingAttempt.id },
      data: { status: 'NEEDS_GRADING', isGraded: false }
    });
  } else {
    await db.quizAttempt.create({
      data: {
        quizId: ids.quiz,
        userId: students[1].id,
        attemptNum: 1,
        score: 65,
        objectiveScore: 65,
        isPassed: false,
        status: 'NEEDS_GRADING',
        questionSnapshot: quizRecord.questions as any,
        answersJson: {
          [quizRecord.questions[0]?.id || 'q0']: ['a'],
          [quizRecord.questions[6]?.id || 'q6']: 'Validasi data di server mutlak diperlukan karena kontrol di browser dapat dimanipulasi dengan cURL atau devtools.'
        },
        expiresAt: new Date(Date.now() + 3600000),
        startedAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(Date.now() - 600000),
        isGraded: false
      }
    });
  }
}

// Generate actual demo files to uploads/ directory
generateAllDemoFiles();

// Upsert demo FileReferences in database
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
    status: 'READY'
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
    status: 'READY'
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
    status: 'READY'
  }
];

for (const f of demoFiles) {
  await db.fileReference.upsert({
    where: { id: f.id },
    create: f,
    update: { name: f.name, mimeType: f.mimeType, sizeBytes: f.sizeBytes, status: f.status }
  });
}

// Upsert demo ResourceItems in Pertemuan 1 (Section 0)
const demoResources = [
  {
    id: ids.resourcePdf,
    sectionId: ids.section,
    title: 'Buku Panduan & Silabus Pemrograman Web',
    description: 'Silabus perkuliahan dan rencana pembelajaran semester (RPS) resmi dalam format PDF.',
    resourceType: 'DOCUMENT' as const,
    contentOrder: 1,
    dynamicPayload: { fileObjectId: ids.filePdf, totalPages: 3 },
    isVisible: true
  },
  {
    id: ids.resourcePpt,
    sectionId: ids.section,
    title: 'Slide Presentasi Pertemuan 1 · Arsitektur Web',
    description: 'Bahan tayang kuliah tatap muka mengenai client-server, protokol HTTP, dan HTML semantik.',
    resourceType: 'DOCUMENT' as const,
    contentOrder: 2,
    dynamicPayload: { fileObjectId: ids.filePpt, totalPages: 5 },
    isVisible: true
  },
  {
    id: ids.resourceVideo,
    sectionId: ids.section,
    title: 'Video Pembelajaran · Alur HTTP Request–Response',
    description: 'Penjelasan mendalam proses pengiriman request dari browser hingga rendering respon server.',
    resourceType: 'VIDEO_MEDIA' as const,
    contentOrder: 3,
    dynamicPayload: {
      provider: 'YOUTUBE',
      url: 'https://www.youtube.com/embed/2JYT5f2isg4',
      durationSeconds: 300,
      minWatchPercent: 80
    },
    isVisible: true
  }
];

for (const r of demoResources) {
  await db.resourceItem.upsert({
    where: { id: r.id },
    create: r,
    update: {
      title: r.title,
      description: r.description,
      resourceType: r.resourceType,
      dynamicPayload: r.dynamicPayload,
      isVisible: r.isVisible
    }
  });
}

// ---------------------------------------------------------------------------
// Demo Attendance Sessions & Records
// ---------------------------------------------------------------------------
const session1Id = '70000000-0000-4000-8000-000000000001';
const session2Id = '70000000-0000-4000-8000-000000000002';

const session1 = await db.attendanceSession.upsert({
  where: { id: session1Id },
  create: {
    id: session1Id,
    classId: ids.class,
    sectionId: ids.section,
    title: 'Pertemuan 01 · Pengantar & Fondasi HTTP Web',
    description: 'Kontrak perkuliahan, RPS, arsitektur client-server, dan alur request-response.',
    sessionDate: new Date(Date.now() - 7 * 86400000),
    isOpen: false,
    allowSelfCheckIn: false,
    checkInCode: 'K7X9PQ',
  },
  update: {
    title: 'Pertemuan 01 · Pengantar & Fondasi HTTP Web',
    isOpen: false,
  },
});

const session2 = await db.attendanceSession.upsert({
  where: { id: session2Id },
  create: {
    id: session2Id,
    classId: ids.class,
    sectionId: ids.section,
    title: 'Pertemuan 02 · Praktikum HTML Semantik & Form Aksesibel',
    description: 'Penyusunan markup HTML semantik dan pembuatan formulir input yang aksesibel.',
    sessionDate: new Date(),
    isOpen: true,
    allowSelfCheckIn: true,
    checkInCode: 'WEB2026',
  },
  update: {
    title: 'Pertemuan 02 · Praktikum HTML Semantik & Form Aksesibel',
    isOpen: true,
    allowSelfCheckIn: true,
    checkInCode: 'WEB2026',
  },
});

// Records untuk Sesi 1 (Sudah selesai, ada variasi status)
for (const [index, student] of students.entries()) {
  let status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT' = 'PRESENT';
  let notes: string | null = null;
  if (index === 2) {
    status = 'SICK';
    notes = 'Surat keterangan sakit dokter terlampir di prodi';
  } else if (index === 3) {
    status = 'EXCUSED';
    notes = 'Dispensasi delegasi lomba karya tulis ilmiah mahasiswa';
  }
  await db.attendanceRecord.upsert({
    where: { sessionId_userId: { sessionId: session1.id, userId: student.id } },
    create: {
      sessionId: session1.id,
      userId: student.id,
      status,
      notes,
      checkedInAt: new Date(Date.now() - 7 * 86400000),
      verifiedBy: ids.instructor,
    },
    update: { status, notes },
  });
}

// Records untuk Sesi 2 (Aktif berjalan, 4 mahasiswa sudah presensi, sisanya belum)
for (const [index, student] of students.entries()) {
  const isCheckedIn = index < 4;
  await db.attendanceRecord.upsert({
    where: { sessionId_userId: { sessionId: session2.id, userId: student.id } },
    create: {
      sessionId: session2.id,
      userId: student.id,
      status: isCheckedIn ? 'PRESENT' : 'ABSENT',
      checkedInAt: isCheckedIn ? new Date() : null,
      notes: isCheckedIn ? 'Presensi mandiri kode proyektor' : null,
    },
    update: {
      status: isCheckedIn ? 'PRESENT' : 'ABSENT',
    },
  });
}

// ---------------------------------------------------------------------------
// Demo Assignment Submissions & Quiz Attempts (Beragam Nilai)
// ---------------------------------------------------------------------------
const assignmentSubmissionsData = [
  { student: students[0], score: 88, status: 'SUBMITTED', isPublished: true, feedback: 'Implementasi struktur semantik sangat baik, heading hirarki rapi.' },
  { student: students[2], score: 92, status: 'SUBMITTED', isPublished: true, feedback: 'Kode terstruktur, form lengkap dengan atribut aksesibilitas dan ARIA.' },
  { student: students[3], score: 78, status: 'SUBMITTED', isPublished: true, feedback: 'Cukup baik, perhatikan penataan form kontrol dan label input.' },
  { student: students[4], score: 85, status: 'SUBMITTED', isPublished: true, feedback: 'Desain responsif dan semantik rapi.' },
  { student: students[5], score: 82, status: 'SUBMITTED', isPublished: true, feedback: 'Penggunaan elemen landmark tepat.' },
];

for (const sub of assignmentSubmissionsData) {
  const existing = await db.assignmentSubmission.findFirst({
    where: { assignmentId: ids.assignment, userId: sub.student.id, version: 1 }
  });
  if (existing) {
    await db.assignmentSubmission.update({
      where: { id: existing.id },
      data: { score: sub.score, status: sub.status as any, isPublished: sub.isPublished, feedback: sub.feedback }
    });
  } else {
    await db.assignmentSubmission.create({
      data: {
        assignmentId: ids.assignment,
        userId: sub.student.id,
        version: 1,
        status: sub.status as any,
        score: sub.score,
        isPublished: sub.isPublished,
        feedback: sub.feedback,
        textContent: `Laporan praktikum pemrograman web dari ${sub.student.name}.`,
        externalUrl: `https://github.com/${sub.student.identifierValue.toLowerCase()}/web-praktikum`,
        submittedAt: new Date(Date.now() - 2 * 86400000),
      }
    });
  }
}

if (quizRecord && quizRecord.questions.length > 0) {
  const quizAttemptsData = [
    { student: students[0], score: 80, isGraded: true, status: 'GRADED_COMPLETE', publishedAt: new Date() },
    { student: students[2], score: 90, isGraded: true, status: 'GRADED_COMPLETE', publishedAt: new Date() },
    { student: students[3], score: 75, isGraded: true, status: 'GRADED_COMPLETE', publishedAt: new Date() },
    { student: students[4], score: 85, isGraded: true, status: 'GRADED_COMPLETE', publishedAt: new Date() },
    { student: students[5], score: 70, isGraded: true, status: 'GRADED_COMPLETE', publishedAt: new Date() },
  ];

  for (const qa of quizAttemptsData) {
    const existing = await db.quizAttempt.findFirst({
      where: { quizId: ids.quiz, userId: qa.student.id, attemptNum: 1 }
    });
    if (existing) {
      await db.quizAttempt.update({
        where: { id: existing.id },
        data: { score: qa.score, status: qa.status as any, isGraded: qa.isGraded, publishedAt: qa.publishedAt }
      });
    } else {
      await db.quizAttempt.create({
        data: {
          quizId: ids.quiz,
          userId: qa.student.id,
          attemptNum: 1,
          score: qa.score,
          objectiveScore: qa.score,
          isPassed: qa.score >= 60,
          status: qa.status as any,
          questionSnapshot: quizRecord.questions as any,
          answersJson: {
            [quizRecord.questions[0]?.id || 'q0']: ['a'],
            [quizRecord.questions[6]?.id || 'q6']: 'Validasi server menjamin keamanan dan integritas basis data.',
          },
          startedAt: new Date(Date.now() - 3 * 86400000),
          submittedAt: new Date(Date.now() - 3 * 86400000 + 1200000),
          isGraded: qa.isGraded,
          publishedAt: qa.publishedAt,
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Demo Learning Progress (Video, Slide, Download, Checklist)
// ---------------------------------------------------------------------------
const highProgressStudents = [students[0], students[2], students[4]];
for (const student of highProgressStudents) {
  await db.videoProgress.upsert({
    where: { userId_resourceItemId: { userId: student.id, resourceItemId: ids.resourceVideo } },
    create: { userId: student.id, resourceItemId: ids.resourceVideo, watchedSeconds: 300, lastPositionSeconds: 300, percent: 100 },
    update: { watchedSeconds: 300, percent: 100 },
  });
  await db.slideProgress.upsert({
    where: { userId_resourceItemId: { userId: student.id, resourceItemId: ids.resourcePpt } },
    create: { userId: student.id, resourceItemId: ids.resourcePpt, viewedPages: [1, 2, 3, 4, 5], currentPage: 5, percent: 100 },
    update: { viewedPages: [1, 2, 3, 4, 5], percent: 100 },
  });
  await db.materialDownload.upsert({
    where: { userId_resourceItemId: { userId: student.id, resourceItemId: ids.resourcePdf } },
    create: { userId: student.id, resourceItemId: ids.resourcePdf },
    update: {},
  });
}

// ---------------------------------------------------------------------------
// Demo Manual Grade Records (UTS & UAS) & Published Final Record
// ---------------------------------------------------------------------------
const existingCategories = await db.gradeCategory.findMany({
  where: { classId: ids.class },
  orderBy: { order: 'asc' },
});

const utsCategory = existingCategories.find((c) => c.name.toLowerCase().includes('uts'));
const uasCategory = existingCategories.find((c) => c.name.toLowerCase().includes('uas'));

if (utsCategory && uasCategory) {
  const manualScores = [
    { student: students[0], uts: 86, uas: 88 },
    { student: students[1], uts: 72, uas: 75 },
    { student: students[2], uts: 90, uas: 92 },
    { student: students[3], uts: 75, uas: 78 },
    { student: students[4], uts: 84, uas: 85 },
    { student: students[5], uts: 78, uas: 80 },
  ];

  for (const ms of manualScores) {
    await db.manualGradeRecord.upsert({
      where: { classId_userId_categoryId: { classId: ids.class, userId: ms.student.id, categoryId: utsCategory.id } },
      create: { classId: ids.class, userId: ms.student.id, categoryId: utsCategory.id, score: ms.uts },
      update: { score: ms.uts },
    });
    await db.manualGradeRecord.upsert({
      where: { classId_userId_categoryId: { classId: ids.class, userId: ms.student.id, categoryId: uasCategory.id } },
      create: { classId: ids.class, userId: ms.student.id, categoryId: uasCategory.id, score: ms.uas },
      update: { score: ms.uas },
    });
  }

  // Seed 1 Published Final Grade Record for Mahasiswa 01 (demo letter grade scale versioning 2026.1)
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
      publishedAt: new Date(Date.now() - 86400000),
      categoryScoresJson: [
        { categoryId: existingCategories[0].id, name: existingCategories[0].name, weight: 25, score: 88 },
        { categoryId: existingCategories[1].id, name: existingCategories[1].name, weight: 15, score: 80 },
        { categoryId: utsCategory.id, name: utsCategory.name, weight: 25, score: 86 },
        { categoryId: uasCategory.id, name: uasCategory.name, weight: 25, score: 88 },
        { categoryId: existingCategories[4].id, name: existingCategories[4].name, weight: 10, score: 100 },
      ],
    },
    update: {
      finalScore: 86.75,
      gradeLetter: 'A',
      gradePoint: 4.0,
      gradeScaleVersion: '2026.1',
      isLocked: true,
    },
  });
}

console.log('Development seed ready. Demo media (PDF, PPT, Video), attendance sessions, and student scores were preserved.');
await db.$disconnect();

