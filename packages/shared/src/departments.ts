import { z } from "zod";

/**
 * Master data program studi resmi di lingkungan Universitas Achmad Yani (UAY).
 */
export interface DepartmentDefinition {
  code: string;
  name: string;
  faculty: string;
}

export const UAY_DEPARTMENTS: readonly DepartmentDefinition[] = [
  { code: "IF", name: "Informatika", faculty: "Fakultas Teknik" },
  { code: "TI", name: "Teknik Industri", faculty: "Fakultas Teknik" },
  { code: "TS", name: "Teknik Sipil", faculty: "Fakultas Teknik" },
  { code: "TE", name: "Teknik Elektro", faculty: "Fakultas Teknik" },
  { code: "SI", name: "Sistem Informasi", faculty: "Fakultas Teknik" },
  { code: "HK", name: "Ilmu Hukum", faculty: "Fakultas Hukum" },
  { code: "MIH", name: "Magister Ilmu Hukum", faculty: "Program Pascasarjana" },
  { code: "MAN", name: "Manajemen", faculty: "Fakultas Ekonomi & Bisnis" },
  { code: "AK", name: "Akuntansi", faculty: "Fakultas Ekonomi & Bisnis" },
  { code: "AP", name: "Administrasi Publik", faculty: "Fakultas Ilmu Sosial & Ilmu Politik" },
  { code: "AB", name: "Administrasi Bisnis", faculty: "Fakultas Ilmu Sosial & Ilmu Politik" },
  { code: "FAR", name: "Farmasi", faculty: "Fakultas Farmasi & Kesehatan" },
] as const;

export const DEPARTMENT_NAME_MAP: Record<string, string> = {
  IF: "Program Studi Informatika",
  TI: "Program Studi Teknik Industri",
  TS: "Program Studi Teknik Sipil",
  TE: "Program Studi Teknik Elektro",
  SI: "Program Studi Sistem Informasi",
  HK: "Program Studi Ilmu Hukum",
  IH: "Program Studi Ilmu Hukum",
  MIH: "Program Studi Magister Ilmu Hukum",
  MH: "Program Studi Magister Ilmu Hukum",
  MAN: "Program Studi Manajemen",
  MN: "Program Studi Manajemen",
  AK: "Program Studi Akuntansi",
  AP: "Program Studi Administrasi Publik",
  AB: "Program Studi Administrasi Bisnis",
  FAR: "Program Studi Farmasi",
  FARM: "Program Studi Farmasi",
};

/**
 * Normalisasi kode prodi menjadi uppercase tanpa spasi berlebih.
 */
export function normalizeDepartmentCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Mengembalikan label prodi yang ramah pengguna.
 */
export function formatDepartmentDisplay(code: string): string {
  if (!code) return "";
  const upper = normalizeDepartmentCode(code);
  const name = DEPARTMENT_NAME_MAP[upper];
  if (name) return `${upper} (${name})`;
  return upper;
}

/**
 * Skema penugasan prodi tunggal dari SIAKAD.
 */
export const siakadScopeSyncItemSchema = z.object({
  identifierValue: z.string().trim().min(1, "NIDN/NIP/NIM tidak boleh kosong"),
  departmentScopes: z
    .array(z.string().trim().min(1))
    .min(1, "Minimal pilih 1 program studi"),
  role: z.enum(["DEPARTMENT_ADMIN", "INSTRUCTOR"]).default("DEPARTMENT_ADMIN"),
  notes: z.string().trim().max(255).optional(),
});

/**
 * Skema payload batch sinkronisasi prodi dari SIAKAD.
 */
export const siakadScopeSyncPayloadSchema = z.object({
  assignments: z
    .array(siakadScopeSyncItemSchema)
    .min(1, "Daftar penugasan tidak boleh kosong")
    .max(500, "Maksimal 500 penugasan per permintaan"),
  academicYear: z.string().trim().max(50).optional(),
  source: z.string().trim().max(100).default("SIAKAD_API"),
  dryRun: z.boolean().default(false),
});

export type SiakadScopeSyncItem = z.infer<typeof siakadScopeSyncItemSchema>;
export type SiakadScopeSyncPayload = z.infer<typeof siakadScopeSyncPayloadSchema>;
