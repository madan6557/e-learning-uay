import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  ShieldCheck,
  Code,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  ArrowDownToLine,
  CheckCircle2,
  UploadCloud,
  Download,
  FileSpreadsheet,
  History,
} from "lucide-react";
import {
  api,
  Action,
  Loading,
  Notice,
  Pagination,
  usePagination,
  Modal,
} from "./lib";
import { confirmAction } from "./confirm";
import { notifyAction } from "./feedback";
import { parseCsv } from "./csv";
import {
  formatDepartmentDisplay,
  normalizeDepartmentCode,
} from "../../../packages/shared/src/departments";
import { AuditLogView } from "./components/admin/AuditLogView";
import { SIAKAD_SCOPE_SYNC_READY } from "../../../packages/shared/src/feature-readiness";

interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  faculty?: string | null;
  isActive: boolean;
  updatedAt?: string;
}
interface UserRecord {
  id: string;
  name: string;
  username: string | null;
  email: string;
  identifierValue: string;
  identifierType: string;
  role: string;
  departmentScopes: string[];
  status: string;
  lastLoginAt?: string | null;
  ssoUserId: string;
  authoritySource: string;
  authorityVersion: string;
  updatedAt?: string;
}
type SsoSyncMetricFilter = "ALL" | "NEW" | "EXISTING";
const roleNames: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Admin Prodi",
  INSTRUCTOR: "Dosen",
  STUDENT: "Mahasiswa",
};
const initialDept = { code: "", name: "", faculty: "", isActive: true };
const initialUser = {
  identifierValue: "",
  identifierType: "NIDN",
  name: "",
  email: "",
  role: "DEPARTMENT_ADMIN",
  departmentScopes: [] as string[],
};
const isPreprovisioned = (u: UserRecord) =>
  u.ssoUserId.startsWith("preprovision:") && !u.lastLoginAt;

function RoleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="governance-field">
      Peran
      <select
        aria-label="Peran"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(roleNames).map(([role, name]) => (
          <option key={role} value={role}>
            {name}
          </option>
        ))}
      </select>
      <small>
        {value === "SUPER_ADMIN"
          ? "Akses seluruh universitas, termasuk pengaturan otoritas pengguna."
          : value === "DEPARTMENT_ADMIN"
            ? "Mengelola kelas dan membantu konten pada prodi terpilih. Penilaian tetap menjadi wewenang dosen pengampu."
            : "Mengajar kelas yang diampu. Lingkup prodi tidak memberikan wewenang penilaian pada kelas lain."}
      </small>
    </label>
  );
}

function ScopePicker({
  departments,
  value,
  onChange,
  existing = [],
  role,
}: {
  departments: DepartmentRecord[];
  value: string[];
  onChange: (value: string[]) => void;
  existing?: string[];
  role?: string;
}) {
  const [filterQuery, setFilterQuery] = useState("");

  if (role === "SUPER_ADMIN") {
    return (
      <div className="governance-scope-admin-note" role="note">
        <ShieldCheck size={20} />
        <div>
          <strong>Akses Menyeluruh (Super Admin)</strong>
          <p>
            Super Admin otomatis memiliki wewenang penuh di seluruh program studi tanpa perlu memilih cakupan individual.
          </p>
        </div>
      </div>
    );
  }

  const visible = departments.filter(
    (d) => d.isActive || existing.includes(d.code),
  );
  const q = filterQuery.trim().toLowerCase();
  const filtered = q
    ? visible.filter(
        (d) =>
          d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q),
      )
    : visible;

  return (
    <fieldset className="governance-scopes">
      <legend>Program studi yang dikelola ({value.length} terpilih)</legend>
      <div className="governance-scope-header">
        <div className="governance-actions">
          <button
            type="button"
            className="secondary"
            title="Pilih semua prodi aktif"
            onClick={() =>
              onChange([
                ...new Set([
                  ...value,
                  ...departments.filter((d) => d.isActive).map((d) => d.code),
                ]),
              ])
            }
          >
            Pilih Semua
          </button>
          <button
            type="button"
            className="secondary"
            title="Kosongkan pilihan"
            onClick={() => onChange([])}
          >
            Kosongkan
          </button>
        </div>
        {visible.length > 4 && (
          <div className="governance-scope-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              aria-label="Filter program studi"
              placeholder="Cari prodi (kode atau nama)…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="governance-scope-grid">
        {filtered.map((d) => (
          <label
            key={d.id}
            className={`governance-scope ${value.includes(d.code) ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={value.includes(d.code)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, d.code]
                    : value.filter((code) => code !== d.code),
                )
              }
            />
            <span className="governance-scope-text">
              <span className="governance-scope-code">{d.code}</span>
              <span className="governance-scope-name">{d.name}</span>
              {!d.isActive && (
                <small className="governance-scope-status">
                  Tidak aktif · penugasan sebelumnya
                </small>
              )}
            </span>
          </label>
        ))}
        {Boolean(q) && !filtered.length && (
          <p className="governance-scope-empty">
            Tidak ada program studi yang cocok dengan "{filterQuery}".
          </p>
        )}
      </div>
      {value
        .filter((code) => !departments.some((d) => d.code === code))
        .map((code) => (
          <label key={code} className="governance-scope selected">
            <input
              type="checkbox"
              checked
              onChange={() => onChange(value.filter((v) => v !== code))}
            />
            <span className="governance-scope-text">
              <span className="governance-scope-code">{code}</span>
              <small className="governance-scope-status">
                Prodi belum terdaftar. Hapus pilihan atau daftarkan prodinya
                sebelum menyimpan.
              </small>
            </span>
          </label>
        ))}
      {!visible.length && (
        <p>Belum ada prodi aktif. Tambahkan program studi terlebih dahulu.</p>
      )}
    </fieldset>
  );
}

function downloadUserCsvTemplate() {
  const content =
    'name,email,user_type,identifier_type,identifier_value,status\r\n' +
    '"Ahmad Fauzi",ahmad.fauzi@elearning.com,STUDENT,NIM,26552000001,ACTIVE\r\n' +
    '"Siti Nurhaliza",siti.nurhaliza@elearning.com,STUDENT,NIM,26552000002,ACTIVE\r\n' +
    '"Budi Santoso",budi.santoso@elearning.com,STUDENT,NIM,26552000003,ACTIVE\r\n' +
    '"Dewi Lestari",dewi.lestari@elearning.com,STUDENT,NIM,26512000001,ACTIVE\r\n' +
    '"Rian Hidayat",rian.hidayat@elearning.com,STUDENT,NIM,26622000001,ACTIVE\r\n' +
    '"Putri Rahayu",putri.rahayu@elearning.com,STUDENT,NIM,26612000001,ACTIVE\r\n' +
    '"Dr. Ir. Hendra Gunawan, M.T.",hendra.gunawan@elearning.com,LECTURER,NIDN,0415037801,ACTIVE\r\n' +
    '"Dr. Nurul Hidayati, S.Kom., M.Kom.",nurul.hidayati@elearning.com,LECTURER,NIDN,0422088202,ACTIVE\r\n' +
    '"Agus Supriyanto, S.T., M.T.",agus.supriyanto@elearning.com,LECTURER,NIDN,0411128503,ACTIVE\r\n' +
    '"Prof. Dr. Suryanto, M.M.",suryanto@elearning.com,LECTURER,NIP,197508122003121001,ACTIVE\r\n' +
    '"Andi Kurniawan, S.AP.",andi.kurniawan@elearning.com,STAFF,NIP,198802102012011003,ACTIVE\r\n' +
    '"Dewi Anggraini, S.Kom.",dewi.anggraini@elearning.com,STAFF,NIP,199106242018022004,ACTIVE\r\n';
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "uay-account-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseUserImportCsv(text: string) {
  if (!text.trim()) {
    throw new Error("Berkas CSV kosong.");
  }
  const parsed = parseCsv(text.trim());
  if (parsed.length < 2) {
    throw new Error(
      "Format CSV minimal harus memiliki 1 baris header dan 1 baris data pengguna.",
    );
  }
  const headerRow = parsed[0].map((h) =>
    h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  );
  const nameIdx = headerRow.findIndex((h) =>
    ["name", "nama", "namalengkap", "fullname"].includes(h),
  );
  const emailIdx = headerRow.findIndex((h) =>
    ["email", "surel", "emailaddress"].includes(h),
  );
  const userTypeIdx = headerRow.findIndex((h) =>
    ["usertype", "user_type", "tipe", "tipepengguna", "type"].includes(h),
  );
  const idTypeIdx = headerRow.findIndex((h) =>
    ["identifiertype", "identifier_type", "jenisidentitas", "idtype"].includes(
      h,
    ),
  );
  const idValIdx = headerRow.findIndex((h) =>
    [
      "identifiervalue",
      "identifier_value",
      "nomoridentitas",
      "idvalue",
      "nim",
      "nidn",
      "nip",
    ].includes(h),
  );
  const statusIdx = headerRow.findIndex((h) =>
    ["status", "keaktifan"].includes(h),
  );
  const roleIdx = headerRow.findIndex((h) => ["role", "peran"].includes(h));
  const scopeIdx = headerRow.findIndex((h) =>
    [
      "departmentscopes",
      "scopes",
      "prodi",
      "jurusan",
      "department_scopes",
    ].includes(h),
  );

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error(
      "Kolom header 'name' dan 'email' wajib ada pada baris pertama CSV.",
    );
  }
  if (idValIdx === -1 && idTypeIdx === -1) {
    throw new Error(
      "Kolom header 'identifier_value' (nomor identitas) wajib ada pada CSV.",
    );
  }

  const rows = parsed
    .slice(1)
    .map((r, i) => {
      const name = nameIdx !== -1 ? String(r[nameIdx] ?? "").trim() : "";
      const email = emailIdx !== -1 ? String(r[emailIdx] ?? "").trim() : "";
      let rawIdType =
        idTypeIdx !== -1 ? String(r[idTypeIdx] ?? "").trim().toUpperCase() : "";
      const idVal = idValIdx !== -1 ? String(r[idValIdx] ?? "").trim() : "";
      let rawUserType =
        userTypeIdx !== -1
          ? String(r[userTypeIdx] ?? "").trim().toUpperCase()
          : "";
      const status =
        statusIdx !== -1 && r[statusIdx]
          ? String(r[statusIdx]).trim().toUpperCase()
          : "ACTIVE";
      const role =
        roleIdx !== -1 && r[roleIdx]
          ? String(r[roleIdx]).trim().toUpperCase()
          : "";
      const departmentScopes =
        scopeIdx !== -1 && r[scopeIdx] ? String(r[scopeIdx]).trim() : "";

      if (!rawIdType) {
        if (rawUserType === "STUDENT" || rawUserType === "MAHASISWA")
          rawIdType = "NIM";
        else if (rawUserType === "LECTURER" || rawUserType === "DOSEN")
          rawIdType = "NIDN";
        else if (rawUserType === "STAFF") rawIdType = "NIP";
        else rawIdType = "NIDN";
      }
      if (!rawUserType) {
        if (rawIdType === "NIM") rawUserType = "STUDENT";
        else if (rawIdType === "NIDN") rawUserType = "LECTURER";
        else if (rawIdType === "NIP") rawUserType = "STAFF";
        else rawUserType = "LECTURER";
      }

      let targetRole = role;
      if (!targetRole) {
        if (rawUserType === "STUDENT" || rawUserType === "MAHASISWA") {
          targetRole = "STUDENT";
        } else if (rawUserType === "ADMIN" || rawUserType === "SUPER_ADMIN") {
          targetRole = "SUPER_ADMIN";
        } else if (rawUserType === "STAFF") {
          targetRole = "DEPARTMENT_ADMIN";
        } else {
          targetRole = "INSTRUCTOR";
        }
      }

      return {
        rowNumber: i + 2,
        name,
        email,
        user_type: rawUserType,
        identifier_type: rawIdType,
        identifier_value: idVal,
        status,
        role: targetRole,
        department_scopes: departmentScopes,
      };
    })
    .filter((row) => row.name && row.email && row.identifier_value);

  if (rows.length === 0) {
    throw new Error(
      "Tidak ada baris data akun valid yang ditemukan di file CSV.",
    );
  }
  return rows;
}

export function DepartmentGovernancePage({
  user,
}: {
  user: any;
  config?: any;
}) {
  const tabParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")?.toUpperCase()
      : null;
  const isAuditRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/audit");
  const defaultTab =
    isAuditRoute || tabParam === "AUDIT" || user.role === "DEPARTMENT_ADMIN"
      ? "AUDIT"
      : tabParam === "MANUAL"
        ? "MANUAL"
        : SIAKAD_SCOPE_SYNC_READY && tabParam === "SIAKAD"
          ? "SIAKAD"
          : "PRODI";

  const [activeTab, setActiveTab] = useState<
    "PRODI" | "MANUAL" | "SIAKAD" | "AUDIT"
  >(defaultTab as any);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deptError, setDeptError] = useState<Error | null>(null);
  const [userError, setUserError] = useState<Error | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptForm, setDeptForm] = useState(initialDept);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptSaveError, setDeptSaveError] = useState<Error | null>(null);
  const [savingDept, setSavingDept] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("DEPARTMENT_ADMIN");
  const [userSaveError, setUserSaveError] = useState<Error | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUser, setCreateUser] = useState(initialUser);
  const [siakadPayloadText, setSiakadPayloadText] = useState("");
  const [siakadSyncing, setSiakadSyncing] = useState(false);
  const [siakadResult, setSiakadResult] = useState<any>(null);
  const [siakadError, setSiakadError] = useState<Error | null>(null);
  const [showSsoSync, setShowSsoSync] = useState(false);
  const [ssoSyncUserType, setSsoSyncUserType] = useState<string>("ALL");
  const [ssoSyncSearch, setSsoSyncSearch] = useState<string>("");
  const [ssoSyncing, setSsoSyncing] = useState<boolean>(false);
  const [ssoSyncResult, setSsoSyncResult] = useState<any>(null);
  const [ssoSyncError, setSsoSyncError] = useState<Error | null>(null);
  const [ssoSyncMetricFilter, setSsoSyncMetricFilter] =
    useState<SsoSyncMetricFilter>("ALL");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  const deptRequest = useRef(0),
    userRequest = useRef(0);

  const visibleSsoSyncResults = useMemo(() => {
    const results = Array.isArray(ssoSyncResult?.results)
      ? ssoSyncResult.results
      : [];
    return results.filter((row: any) =>
      ssoSyncMetricFilter === "ALL"
        ? true
        : ssoSyncMetricFilter === "NEW"
          ? row.status === "NEW"
          : row.status !== "NEW",
    );
  }, [ssoSyncMetricFilter, ssoSyncResult?.results]);

  const fetchDepartments = useCallback(async () => {
    const request = ++deptRequest.current;
    setLoadingDepts(true);
    setDeptError(null);
    try {
      const data = await api<DepartmentRecord[]>(
        "/system/departments?includeInactive=true",
      );
      if (request === deptRequest.current) setDepartments(data);
    } catch (error) {
      if (request === deptRequest.current) setDeptError(error as Error);
    } finally {
      if (request === deptRequest.current) setLoadingDepts(false);
    }
  }, []);
  const fetchUsers = useCallback(async () => {
    const request = ++userRequest.current;
    setLoadingUsers(true);
    setUserError(null);
    const params = new URLSearchParams();
    if (userSearch.trim()) params.set("q", userSearch.trim());
    if (roleFilter) params.set("role", roleFilter);
    try {
      const data = await api<UserRecord[]>(
        `/system/department-scopes/users?${params}`,
      );
      if (request === userRequest.current) setUsers(data);
    } catch (error) {
      if (request === userRequest.current) setUserError(error as Error);
    } finally {
      if (request === userRequest.current) setLoadingUsers(false);
    }
  }, [userSearch, roleFilter]);
  useEffect(() => {
    if (user.role === "SUPER_ADMIN") void fetchDepartments();
    return () => {
      deptRequest.current++;
    };
  }, [user.role, fetchDepartments]);
  useEffect(() => {
    if (user.role !== "SUPER_ADMIN") return;
    setLoadingUsers(true);
    const timer = setTimeout(() => void fetchUsers(), 250);
    return () => {
      clearTimeout(timer);
      userRequest.current++;
    };
  }, [user.role, fetchUsers]);

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return departments.filter((d) =>
      `${d.code} ${d.name} ${d.faculty ?? ""}`.toLowerCase().includes(q),
    );
  }, [departments, deptSearch]);
  const deptPagination = usePagination(filteredDepartments, 10);
  const userPagination = usePagination(users, 10);

  const openDept = (dept?: DepartmentRecord) => {
    setEditingDept(dept ?? null);
    setDeptForm(
      dept
        ? {
            code: dept.code,
            name: dept.name,
            faculty: dept.faculty ?? "",
            isActive: dept.isActive,
          }
        : initialDept,
    );
    setDeptSaveError(null);
    setShowDeptForm(true);
  };
  const saveDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current.has("department")) return;
    pending.current.add("department");
    setSavingDept(true);
    setDeptSaveError(null);
    try {
      const code = normalizeDepartmentCode(deptForm.code);
      await api(
        editingDept
          ? `/system/departments/${editingDept.id}`
          : "/system/departments",
        editingDept ? "PUT" : "POST",
        {
          ...deptForm,
          code,
          faculty: deptForm.faculty.trim() || (editingDept ? null : undefined),
          expectedUpdatedAt: editingDept?.updatedAt,
        },
      );
      notifyAction(
        `Program studi ${code} berhasil ${editingDept ? "diperbarui" : "ditambahkan"}.`,
      );
      setShowDeptForm(false);
      await fetchDepartments();
    } catch (error) {
      setDeptSaveError(error as Error);
    } finally {
      pending.current.delete("department");
      setSavingDept(false);
    }
  };
  const deleteDepartment = async (dept: DepartmentRecord) => {
    if (
      !(await confirmAction(
        `Hapus program studi ${dept.code} (${dept.name})? Jika masih dirujuk kelas, pengguna, atau pengumuman, prodi akan dinonaktifkan dan riwayatnya dipertahankan.`,
      ))
    )
      return false;
    const result = await api<any>(`/system/departments/${dept.id}`, "DELETE");
    notifyAction(result.message);
    await fetchDepartments();
  };
  const openUser = (u?: UserRecord) => {
    setUserSaveError(null);
    if (u) {
      setEditingUser(u);
      setSelectedRole(u.role);
      setSelectedScopes([...u.departmentScopes]);
    } else {
      setCreateUser(initialUser);
      setShowCreateUser(true);
    }
  };
  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current.has("user")) return;
    pending.current.add("user");
    setSavingUser(true);
    setUserSaveError(null);
    try {
      if (editingUser) {
        await api(`/system/department-scopes/users/${editingUser.id}`, "PUT", {
          role: selectedRole,
          departmentScopes: selectedScopes,
          expectedAuthorityVersion: editingUser.authorityVersion,
        });
        notifyAction(`Otoritas untuk ${editingUser.name} berhasil disimpan.`);
        setEditingUser(null);
      } else {
        const result = await api<any>(
          "/system/department-scopes/users",
          "POST",
          createUser,
        );
        notifyAction(result.message);
        setShowCreateUser(false);
      }
      await fetchUsers();
    } catch (error) {
      setUserSaveError(error as Error);
    } finally {
      pending.current.delete("user");
      setSavingUser(false);
    }
  };
  const deleteUser = async (u: UserRecord) => {
    if (
      !(await confirmAction(
        `Hapus pra-registrasi ${u.name} (${u.identifierValue})? Akun yang sudah tersambung ke SSO tidak dapat dihapus melalui tindakan ini. Riwayat akademik tetap dipertahankan.`,
      ))
    )
      return false;
    const result = await api<any>(
      `/system/department-scopes/users/${u.id}`,
      "DELETE",
    );
    notifyAction(result.message);
    await fetchUsers();
  };
  const updatePayload = (text: string) => {
    setSiakadPayloadText(text);
    setSiakadResult(null);
    setSiakadError(null);
  };
  const canApply =
    SIAKAD_SCOPE_SYNC_READY &&
    siakadResult?.dryRun &&
    siakadResult.ready > 0 &&
    siakadResult.notFound === 0;
  const runSiakadSync = async (dryRun: boolean) => {
    if (!SIAKAD_SCOPE_SYNC_READY) return;
    if (pending.current.has("siakad") || (!dryRun && !canApply)) return;
    pending.current.add("siakad");
    setSiakadSyncing(true);
    setSiakadError(null);
    try {
      if (
        !dryRun &&
        !(await confirmAction(
          `Terapkan penugasan untuk ${siakadResult.ready} pengguna sesuai hasil simulasi? Peran dan lingkup prodi mereka akan diperbarui.`,
        ))
      )
        return;
      let parsed: any;
      try {
        parsed = JSON.parse(siakadPayloadText);
      } catch {
        throw new Error(
          "JSON belum valid. Periksa tanda kutip, koma, dan kurung, lalu jalankan simulasi lagi.",
        );
      }
      if (!dryRun)
        parsed.assignments = parsed.assignments.map(
          (assignment: any, index: number) => ({
            ...assignment,
            expectedAuthorityVersion:
              siakadResult.results[index].authorityVersion,
          }),
        );
      const result = await api<any>("/system/siakad/sync-scopes", "POST", {
        ...parsed,
        dryRun,
      });
      setSiakadResult(result);
      if (!dryRun) {
        notifyAction(
          `${result.updated} penugasan berhasil disimpan; ${result.notFound} identitas tidak ditemukan.`,
        );
        await fetchUsers();
      }
    } catch (error) {
      setSiakadError(error as Error);
    } finally {
      pending.current.delete("siakad");
      setSiakadSyncing(false);
    }
  };

  const runSsoSync = async (dryRun: boolean) => {
    if (pending.current.has("ssoSync")) return;
    if (dryRun) setSsoSyncMetricFilter("ALL");
    pending.current.add("ssoSync");
    setSsoSyncing(true);
    setSsoSyncError(null);
    try {
      if (!dryRun) {
        if (
          !(await confirmAction(
            `Sinkronkan ${ssoSyncResult?.total ?? ""} pengguna dari SSO ke E-Learning? Akun baru menggunakan role awal SSO. Profil akun yang sudah ada diperbarui tanpa mengubah role atau lingkup akses E-Learning.`,
          ))
        ) {
          return;
        }
      }
      const result = await api<any>("/system/sso/sync-users", "POST", {
        dryRun,
        userType: ssoSyncUserType,
        search: ssoSyncSearch.trim() || undefined,
      });
      setSsoSyncResult(result);
      if (!dryRun) {
        notifyAction(
          `Sinkronisasi SSO berhasil: ${result.newCount} akun baru ditambahkan, ${result.existingCount} akun diselaraskan.`,
        );
        await fetchUsers();
        setShowSsoSync(false);
      }
    } catch (error) {
      setSsoSyncError(error as Error);
    } finally {
      pending.current.delete("ssoSync");
      setSsoSyncing(false);
    }
  };

  const handleImportFileSelect = (selectedFile: File) => {
    setImportFile(selectedFile);
    setImportResult(null);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const rows = parseUserImportCsv(text);
        setImportRows(rows);
      } catch (err: any) {
        setImportRows([]);
        setImportError(err?.message || "Gagal membaca format berkas CSV.");
      }
    };
    reader.onerror = () => {
      setImportRows([]);
      setImportError("Gagal membaca berkas.");
    };
    reader.readAsText(selectedFile);
  };

  const runUserImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    setImportError(null);
    try {
      const res: any = await api(
        "/system/department-scopes/users/import",
        "POST",
        { rows: importRows },
      );
      setImportResult(res);
      notifyAction(
        `Import selesai: ${res.summary?.created ?? 0} pengguna dibuat, ${res.summary?.updated ?? 0} diselaraskan.`,
      );
      await fetchUsers();
    } catch (err: any) {
      setImportError(err?.message || "Gagal melakukan import pengguna.");
    } finally {
      setImporting(false);
    }
  };

  if (user.role !== "SUPER_ADMIN")
    return (
      <Notice error="Pengelolaan program studi dan otoritas hanya tersedia untuk Super Admin." />
    );

  const governanceTabs = [
    {
      id: "PRODI" as const,
      icon: Building2,
      title: "Master Program Studi",
    },
    { id: "MANUAL" as const, icon: Users, title: "Pengguna" },
    ...(SIAKAD_SCOPE_SYNC_READY
      ? [{ id: "SIAKAD" as const, icon: Code, title: "Sinkronisasi SIAKAD" }]
      : []),
    {
      id: "AUDIT" as const,
      icon: History,
      title: "Rekaman Jejak Aktivitas",
    },
  ];

  return (
    <div className="departments-governance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Building2 size={16} /> Tata Kelola Akademik
          </div>
          <h1>
            {user.role === "SUPER_ADMIN"
              ? "Program Studi, Pengguna & Jejak Aktivitas"
              : "Jejak Aktivitas & Program Studi"}
          </h1>
          <p>
            {user.role === "SUPER_ADMIN"
              ? "Kelola program studi, penugasan pengguna, serta pantau rekaman jejak aktivitas sistem."
              : "Pantau rekaman jejak aktivitas operasional akademik program studi Anda."}
          </p>
          {user.role === "SUPER_ADMIN" && !SIAKAD_SCOPE_SYNC_READY && (
            <small className="governance-subtext" role="status">
              Integrasi SIAKAD belum siap. Sinkronisasi dinonaktifkan hingga
              alurnya diverifikasi.
            </small>
          )}
        </div>
      </div>
      <div className="governance-tabs" aria-label="Bagian tata kelola">
        {governanceTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={activeTab === item.id}
            className={activeTab === item.id ? "primary" : "secondary"}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={18} />
            {item.title}
          </button>
        ))}
      </div>

      {activeTab === "PRODI" && (
        <section aria-label="Master program studi">
          <div className="governance-toolbar">
            <label className="governance-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="Cari program studi"
                placeholder="Cari kode, nama prodi, atau fakultas"
                value={deptSearch}
                onChange={(e) => {
                  setDeptSearch(e.target.value);
                  deptPagination.setPage(1);
                }}
              />
            </label>
            <div className="governance-actions">
              <Action
                run={fetchDepartments}
                disabled={loadingDepts}
                className="secondary"
                busyLabel="Memuat…"
              >
                <RefreshCw size={16} />
                Segarkan
              </Action>
              {user.role === "SUPER_ADMIN" && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => openDept()}
                >
                  <Plus size={18} />
                  Tambah Program Studi
                </button>
              )}
            </div>
          </div>
          {deptError && <Notice error={deptError} />}
          {loadingDepts ? (
            <div className="governance-loading" role="status">
              <Loading />
              Memuat program studi…
            </div>
          ) : (
            <>
              <div className="card table-wrap phone-record-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Kode</th>
                      <th scope="col">Nama Program Studi</th>
                      <th scope="col">Fakultas / Unit</th>
                      <th scope="col">Status</th>
                      {user.role === "SUPER_ADMIN" && <th scope="col">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {deptPagination.paginatedItems.map((dept) => (
                      <tr key={dept.id}>
                        <td data-label="Kode">
                          <strong>{dept.code}</strong>
                        </td>
                        <td data-label="Nama Program Studi">{dept.name}</td>
                        <td data-label="Fakultas / Unit">
                          {dept.faculty || "Universitas Achmad Yani"}
                        </td>
                        <td data-label="Status">
                          <span
                            className={`pill ${dept.isActive ? "success" : "neutral"}`}
                          >
                            {dept.isActive ? "Aktif" : "Tidak aktif"}
                          </span>
                        </td>
                        {user.role === "SUPER_ADMIN" && (
                          <td data-label="Aksi" className="record-actions">
                            <div className="governance-actions">
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => openDept(dept)}
                                aria-label={`Edit program studi ${dept.code}`}
                              >
                                <Pencil size={16} />
                                Edit
                              </button>
                              <Action
                                className="danger"
                                run={() => deleteDepartment(dept)}
                                label={`Hapus atau nonaktifkan ${dept.code}`}
                                busyLabel="Memproses…"
                              >
                                <Trash2 size={16} />
                                Hapus / Nonaktifkan
                              </Action>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filteredDepartments.length && !deptError && (
                <p className="governance-empty">
                  {deptSearch
                    ? "Tidak ada prodi yang cocok. Coba kata kunci lain."
                    : "Belum ada program studi."}
                </p>
              )}
              <Pagination
                {...deptPagination}
                onPageChange={deptPagination.setPage}
                onPageSizeChange={deptPagination.setPageSize}
              />
            </>
          )}
        </section>
      )}

      {activeTab === "MANUAL" && (
        <section aria-label="Otoritas pengguna">
          <p>
            Penugasan di halaman ini tetap berlaku setelah login SSO. Hanya
            dosen, pengelola prodi, dan Super Admin yang ditampilkan.
          </p>
          <div className="governance-toolbar">
            <label className="governance-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="Cari pengguna"
                placeholder="Cari nama, NIDN/NIP, atau email"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  userPagination.setPage(1);
                }}
              />
            </label>
            <label className="governance-filter">
              Peran
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  userPagination.setPage(1);
                }}
              >
                <option value="ALL">Semua peran</option>
                {Object.entries(roleNames).map(([role, name]) => (
                  <option key={role} value={role}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="governance-actions">
              <Action
                className="secondary"
                run={fetchUsers}
                disabled={loadingUsers}
                busyLabel="Memuat…"
              >
                <RefreshCw size={16} />
                Segarkan
              </Action>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setShowSsoSync(true);
                  setSsoSyncResult(null);
                  setSsoSyncError(null);
                  setSsoSyncMetricFilter("ALL");
                }}
              >
                <ArrowDownToLine size={18} />
                Sinkron Pengguna
              </button>
            </div>
          </div>
          {userError && <Notice error={userError} />}
          {loadingUsers ? (
            <div className="governance-loading" role="status">
              <Loading />
              Memuat pengguna…
            </div>
          ) : (
            <>
              <div className="card table-wrap phone-record-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pengguna</th>
                      <th scope="col">Identitas</th>
                      <th scope="col">Peran</th>
                      <th scope="col">Cakupan Prodi</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPagination.paginatedItems.map((u) => (
                      <tr key={u.id}>
                        <td className="record-title">
                          <div className="governance-user-details">
                            <strong>{u.name}</strong>
                            <small className="governance-subtext">
                              {u.email}
                            </small>
                            {isPreprovisioned(u) && (
                              <span className="pill neutral">
                                Pra-registrasi
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Identitas">
                          <span>
                            {u.identifierType}: {u.identifierValue}
                          </span>
                        </td>
                        <td data-label="Peran">
                          <span className="governance-role-badge">
                            {roleNames[u.role] ?? u.role}
                          </span>
                        </td>
                        <td data-label="Cakupan Prodi">
                          <div className="governance-scope-details">
                            <div className="governance-tags">
                              {u.role === "SUPER_ADMIN"
                                ? "Semua prodi"
                                : u.departmentScopes.length
                                  ? u.departmentScopes.map((code) => (
                                      <span
                                        className="pill neutral"
                                        key={code}
                                        title={formatDepartmentDisplay(code)}
                                      >
                                        {code}
                                      </span>
                                    ))
                                  : "Belum ditentukan"}
                            </div>
                            <small className="governance-subtext">
                              Sumber:{" "}
                              {u.authoritySource === "LOCAL"
                                ? "Penugasan Super Admin"
                                : u.authoritySource}
                            </small>
                          </div>
                        </td>
                        <td data-label="Aksi" className="record-actions">
                          <div className="governance-actions">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openUser(u)}
                              aria-label={`Atur lingkup ${u.name}`}
                            >
                              <ShieldCheck size={16} />
                              Atur Lingkup
                            </button>
                            {isPreprovisioned(u) &&
                              u.role !== "SUPER_ADMIN" && (
                                <Action
                                  className="danger"
                                  run={() => deleteUser(u)}
                                  label={`Hapus pra-registrasi ${u.name}`}
                                  busyLabel="Menghapus…"
                                >
                                  <Trash2 size={16} />
                                  Hapus
                                </Action>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!users.length && !userError && (
                <p className="governance-empty">
                  Tidak ada pengguna yang cocok dengan pencarian dan peran
                  terpilih.
                </p>
              )}
              <Pagination
                {...userPagination}
                onPageChange={userPagination.setPage}
                onPageSizeChange={userPagination.setPageSize}
              />
            </>
          )}
        </section>
      )}

      {SIAKAD_SCOPE_SYNC_READY && activeTab === "SIAKAD" && (
        <section
          aria-label="Sinkronisasi SIAKAD"
          className="governance-integration card"
        >
          <h2>
            <Code size={20} />
            Sinkronisasi Penugasan SIAKAD
          </h2>
          <p>
            Periksa hasil simulasi sebelum menerapkan peran dan lingkup prodi.
            Identitas yang belum terdaftar perlu didaftarkan terlebih dahulu.
          </p>
          <details>
            <summary>Petunjuk integrasi sistem</summary>
            <p>
              POST /api/v1/system/siakad/sync-scopes. Integrasi mesin memakai
              X-SIAKAD-Secret dan Idempotency-Key unik untuk setiap perubahan.
              Secret disimpan pada konfigurasi server, bukan di payload.
            </p>
          </details>
          <label className="governance-field">
            Data penugasan (JSON)
            <textarea
              aria-label="Data penugasan (JSON)"
              rows={12}
              disabled={siakadSyncing}
              value={siakadPayloadText}
              onChange={(e) => updatePayload(e.target.value)}
              placeholder={
                '{"assignments": [{"identifierValue": "NIDN/NIP", "departmentScopes": ["IF"], "role": "DEPARTMENT_ADMIN"}]}'
              }
            />
          </label>
          <div className="governance-actions">
            <button
              type="button"
              className="secondary"
              disabled={siakadSyncing}
              onClick={() =>
                updatePayload(
                  JSON.stringify(
                    {
                      source: "SIAKAD_API_UAY",
                      assignments: [
                        {
                          identifierValue: "CONTOH_NIDN",
                          departmentScopes: ["IF"],
                          role: "DEPARTMENT_ADMIN",
                        },
                      ],
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Muat contoh data
            </button>
            <button
              type="button"
              className="secondary"
              disabled={siakadSyncing || !siakadPayloadText.trim()}
              onClick={() => void runSiakadSync(true)}
            >
              {siakadSyncing && <Loading />}Jalankan Simulasi
            </button>
            <button
              type="button"
              className="primary"
              disabled={siakadSyncing || !canApply}
              aria-describedby="siakad-apply-help"
              onClick={() => void runSiakadSync(false)}
            >
              {siakadSyncing ? "Memproses…" : "Terapkan Perubahan"}
            </button>
          </div>
          <small id="siakad-apply-help">
            {canApply
              ? "Semua identitas ditemukan. Periksa perubahan di bawah sebelum menerapkan."
              : "Jalankan simulasi yang valid dan pastikan semua identitas ditemukan untuk mengaktifkan penerapan."}
          </small>
          {siakadError && <Notice error={siakadError} />}
          {siakadResult && (
            <div className="governance-result" role="status">
              <h3>
                {siakadResult.dryRun
                  ? "Hasil simulasi · belum disimpan"
                  : "Hasil sinkronisasi · tersimpan"}
              </h3>
              <p>
                {siakadResult.dryRun
                  ? `${siakadResult.ready} penugasan siap diterapkan`
                  : `${siakadResult.updated} penugasan berhasil diperbarui`}
                ; {siakadResult.notFound} identitas tidak ditemukan.
              </p>
              <ul>
                {siakadResult.results.map((result: any, index: number) => (
                  <li key={index}>
                    <strong>{result.name || result.identifierValue}</strong>
                    <span>
                      {result.status === "USER_NOT_FOUND"
                        ? "Belum terdaftar — daftarkan identitas atau perbaiki data dan jalankan simulasi lagi."
                        : `${roleNames[result.proposedRole ?? result.role]} · ${(result.proposedScopes ?? result.departmentScopes).join(", ")}`}
                    </span>
                    {siakadResult.dryRun && result.name && (
                      <small>
                        Sebelumnya: {roleNames[result.currentRole]} ·{" "}
                        {result.currentScopes.join(", ") ||
                          "tanpa lingkup prodi"}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {activeTab === "AUDIT" && (
        <AuditLogView user={user} departments={departments} />
      )}

      {showDeptForm && (
        <Modal
          title={
            editingDept
              ? `Edit Program Studi: ${editingDept.code}`
              : "Tambah Program Studi Baru"
          }
          onClose={() => setShowDeptForm(false)}
          busy={savingDept}
          className="governance-modal"
        >
          <form onSubmit={saveDepartment} aria-busy={savingDept}>
            {deptSaveError && <Notice error={deptSaveError} />}
            <fieldset disabled={savingDept} className="governance-form-fields">
              <div className="governance-form-grid">
                <label className="governance-field">
                  Kode Program Studi
                  <input
                    required
                    maxLength={20}
                    value={deptForm.code}
                    onChange={(e) =>
                      setDeptForm({
                        ...deptForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Contoh: IF, TS, MN"
                  />
                  <small>
                    Kode harus unik. Kode yang sudah dirujuk tidak dapat diubah.
                  </small>
                </label>
                <label className="governance-field">
                  Nama Program Studi
                  <input
                    required
                    minLength={3}
                    maxLength={150}
                    value={deptForm.name}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, name: e.target.value })
                    }
                  />
                </label>
                <label className="governance-field">
                  Fakultas / Unit (opsional)
                  <input
                    maxLength={150}
                    value={deptForm.faculty}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, faculty: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="governance-check">
                <input
                  type="checkbox"
                  checked={deptForm.isActive}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, isActive: e.target.checked })
                  }
                />
                Prodi aktif untuk penugasan baru
              </label>
            </fieldset>
            <div className="governance-form-actions">
              <button
                type="button"
                className="secondary"
                disabled={savingDept}
                onClick={() => setShowDeptForm(false)}
              >
                Batal
              </button>
              <button type="submit" className="primary" disabled={savingDept}>
                {savingDept
                  ? "Menyimpan…"
                  : editingDept
                    ? "Simpan Perubahan"
                    : "Tambahkan Program Studi"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {(editingUser || showCreateUser) && (
        <Modal
          title={
            editingUser
              ? `Atur Otoritas: ${editingUser.name}`
              : "Daftarkan Pengguna Baru"
          }
          onClose={() => {
            setEditingUser(null);
            setShowCreateUser(false);
          }}
          busy={savingUser}
          className="governance-modal"
          wide
        >
          <form onSubmit={saveUser} aria-busy={savingUser}>
            <p>
              {editingUser
                ? "Pilih peran dan prodi yang menjadi tanggung jawab pengguna."
                : "Gunakan NIDN/NIP dan email yang sama dengan SSO kampus. Pra-registrasi ini tersambung saat login SSO pertama kali."}
            </p>
            {userSaveError && <Notice error={userSaveError} />}
            <fieldset
              className="governance-form-fields"
              disabled={savingUser || loadingDepts}
            >
              {!editingUser && (
                <div className="governance-form-grid">
                  <label className="governance-field">
                    NIDN / NIP / Identitas
                    <input
                      required
                      minLength={3}
                      maxLength={50}
                      value={createUser.identifierValue}
                      onChange={(e) =>
                        setCreateUser({
                          ...createUser,
                          identifierValue: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="governance-field">
                    Jenis identitas
                    <select
                      value={createUser.identifierType}
                      onChange={(e) =>
                        setCreateUser({
                          ...createUser,
                          identifierType: e.target.value,
                        })
                      }
                    >
                      <option value="NIDN">NIDN</option>
                      <option value="NIP">NIP</option>
                      <option value="NIM">NIM</option>
                      <option value="OTHER">Lainnya</option>
                    </select>
                  </label>
                  <label className="governance-field">
                    Nama lengkap
                    <input
                      required
                      minLength={2}
                      maxLength={150}
                      value={createUser.name}
                      onChange={(e) =>
                        setCreateUser({ ...createUser, name: e.target.value })
                      }
                    />
                  </label>
                  <label className="governance-field">
                    Email SSO
                    <input
                      type="email"
                      required
                      maxLength={150}
                      value={createUser.email}
                      onChange={(e) =>
                        setCreateUser({ ...createUser, email: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}
              <RoleField
                value={editingUser ? selectedRole : createUser.role}
                onChange={(role) =>
                  editingUser
                    ? setSelectedRole(role)
                    : setCreateUser({ ...createUser, role })
                }
              />
              <ScopePicker
                departments={departments}
                existing={editingUser?.departmentScopes}
                value={
                  editingUser ? selectedScopes : createUser.departmentScopes
                }
                onChange={(scopes) =>
                  editingUser
                    ? setSelectedScopes(scopes)
                    : setCreateUser({ ...createUser, departmentScopes: scopes })
                }
                role={editingUser ? selectedRole : createUser.role}
              />
            </fieldset>
            {deptError && (
              <Notice error="Daftar prodi gagal dimuat. Segarkan daftar program studi sebelum menyimpan penugasan." />
            )}
            {(editingUser ? selectedRole : createUser.role) ===
              "DEPARTMENT_ADMIN" &&
              !(editingUser ? selectedScopes : createUser.departmentScopes)
                .length && (
                <p className="governance-hint">
                  Admin Prodi membutuhkan minimal satu program studi.
                </p>
              )}
            <div className="governance-form-actions">
              <button
                type="button"
                className="secondary"
                disabled={savingUser}
                onClick={() => {
                  setEditingUser(null);
                  setShowCreateUser(false);
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                className="primary"
                disabled={
                  savingUser ||
                  loadingDepts ||
                  !!deptError ||
                  ((editingUser ? selectedRole : createUser.role) ===
                    "DEPARTMENT_ADMIN" &&
                    !(
                      editingUser ? selectedScopes : createUser.departmentScopes
                    ).length)
                }
              >
                {savingUser
                  ? "Menyimpan…"
                  : editingUser
                    ? "Simpan Otoritas"
                    : "Daftarkan Pengguna"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showSsoSync && (
        <Modal
          title="Sinkron Pengguna dari SSO"
          onClose={() => {
            if (!ssoSyncing) setShowSsoSync(false);
          }}
          busy={ssoSyncing}
          className="governance-modal sso-sync-modal"
          wide
        >
          <div className="sso-sync-container">
            <p>
              Sinkronkan daftar akun pengguna (Dosen, Staf, Administrator) yang terdaftar pada aplikasi E-Learning di UAY SSO. Akun baru akan didaftarkan sebagai pra-registrasi dengan role awal dari SSO. Profil akun yang sudah ada dapat diperbarui, tetapi role dan lingkup aksesnya tetap mengikuti pengaturan E-Learning.
            </p>

            <div className="governance-form-grid sso-sync-filters">
              <label className="governance-field">
                Tipe Pengguna SSO
                <select
                  value={ssoSyncUserType}
                  onChange={(e) => {
                    setSsoSyncUserType(e.target.value);
                    setSsoSyncResult(null);
                    setSsoSyncMetricFilter("ALL");
                  }}
                  disabled={ssoSyncing}
                >
                  <option value="ALL">Semua Tipe (Dosen, Staf, Mahasiswa)</option>
                  <option value="LECTURER">Dosen Saja (LECTURER)</option>
                  <option value="STAFF">Staf Saja (STAFF)</option>
                  <option value="STUDENT">Mahasiswa Saja (STUDENT)</option>
                </select>
              </label>

              <label className="governance-field">
                Pencarian (Opsional)
                <input
                  type="text"
                  placeholder="Nama, email, atau NIDN/NIP..."
                  value={ssoSyncSearch}
                  onChange={(e) => {
                    setSsoSyncSearch(e.target.value);
                    setSsoSyncResult(null);
                    setSsoSyncMetricFilter("ALL");
                  }}
                  disabled={ssoSyncing}
                />
              </label>
            </div>

            <div className="governance-actions sso-sync-preview-action">
              <button
                type="button"
                className="secondary"
                disabled={ssoSyncing}
                onClick={() => runSsoSync(true)}
              >
                <Search size={16} />
                {ssoSyncing && !ssoSyncResult ? "Memeriksa SSO…" : "Pratinjau Akun dari SSO"}
              </button>
            </div>

            {ssoSyncError && <Notice error={ssoSyncError} />}

            {ssoSyncResult && (
              <div className="sso-sync-results">
                <div className="sso-sync-stats-grid">
                  <button
                    type="button"
                    className={`sso-stat-card ${ssoSyncMetricFilter === "ALL" ? "selected" : ""}`}
                    aria-pressed={ssoSyncMetricFilter === "ALL"}
                    onClick={() => setSsoSyncMetricFilter("ALL")}
                  >
                    <span className="stat-num">{ssoSyncResult.total}</span>
                    <span className="stat-label">Total Akun di SSO</span>
                  </button>
                  <button
                    type="button"
                    className={`sso-stat-card new ${ssoSyncMetricFilter === "NEW" ? "selected" : ""}`}
                    aria-pressed={ssoSyncMetricFilter === "NEW"}
                    onClick={() => setSsoSyncMetricFilter("NEW")}
                  >
                    <span className="stat-num">{ssoSyncResult.newCount}</span>
                    <span className="stat-label">Akun Baru (Pra-registrasi)</span>
                  </button>
                  <button
                    type="button"
                    className={`sso-stat-card existing ${ssoSyncMetricFilter === "EXISTING" ? "selected" : ""}`}
                    aria-pressed={ssoSyncMetricFilter === "EXISTING"}
                    onClick={() => setSsoSyncMetricFilter("EXISTING")}
                  >
                    <span className="stat-num">{ssoSyncResult.existingCount}</span>
                    <span className="stat-label">Akun Sudah Terdaftar</span>
                  </button>
                </div>

                <div className="sso-sync-preview-list">
                  <div className="sso-sync-list-header">
                    <strong>Rincian Pengguna ({visibleSsoSyncResults.length})</strong>
                    <small>Pratinjau status integrasi akun</small>
                  </div>
                  <div className="sso-sync-scroll-area">
                    {visibleSsoSyncResults.length === 0 ? (
                      <p className="sso-empty-note">Tidak ada pengguna yang cocok dengan kriteria filter.</p>
                    ) : (
                      <table className="sso-preview-table sso-user-sync-table">
                        <thead>
                          <tr>
                            <th>Nama &amp; Identitas</th>
                            <th>Tipe SSO</th>
                            <th>Status di E-Learning</th>
                            <th>Peran</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleSsoSyncResults.map((u: any, idx: number) => (
                            <tr key={idx}>
                              <td>
                                <div>
                                  <strong>{u.name}</strong>
                                  <div className="governance-subtext">
                                    {u.identifierValue} &bull; {u.email}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="pill neutral">{u.userType}</span>
                              </td>
                              <td>
                                {u.status === "NEW" ? (
                                  <span className="pill warning">Akun Baru</span>
                                ) : (
                                  <span className="pill success">Sudah Terdaftar</span>
                                )}
                              </td>
                              <td>
                                {u.status === "NEW" ? (
                                  <>
                                    <span>Awal: {roleNames[u.proposedRole] ?? u.proposedRole}</span>
                                    <div className="governance-subtext">Role awal dari SSO</div>
                                  </>
                                ) : (
                                  <>
                                    <span>E-Learning: {roleNames[u.currentRole] ?? u.currentRole}</span>
                                    <div className="governance-subtext">
                                      SSO: {roleNames[u.proposedRole] ?? u.proposedRole}
                                    </div>
                                    {u.roleMismatch && (
                                      <span className="pill warning">Role E-Learning dipertahankan</span>
                                    )}
                                  </>
                                )}
                                {u.departmentScopes?.length > 0 && (
                                  <div className="governance-subtext">
                                    Lingkup: {u.departmentScopes.join(", ")}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div
                  className="governance-modal-actions"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowSsoSync(false)}
                    disabled={ssoSyncing}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={ssoSyncing || ssoSyncResult.total === 0}
                    onClick={() => runSsoSync(false)}
                  >
                    <CheckCircle2 size={16} />
                    {ssoSyncing ? "Menyimpan…" : "Konfirmasi & Simpan Pengguna"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showImportModal && (
        <Modal
          title="Import Pengguna dari CSV"
          onClose={() => {
            if (!importing) setShowImportModal(false);
          }}
          busy={importing}
          className="governance-modal sso-sync-modal"
          wide
        >
          <div className="sso-sync-container">
            <p>
              Daftarkan pengguna (Dosen, Mahasiswa, Staf) secara massal
              menggunakan file CSV dengan format standar yang sama dengan SSO (
              <code>uay-account-import-template.csv</code>). Akun akan didaftarkan
              sebagai pra-registrasi dan otomatis tersambung saat login SSO
              pertama kali.
            </p>

            <div
              className="governance-actions"
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "14px 0",
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={downloadUserCsvTemplate}
                title="Unduh templat CSV format SSO"
              >
                <Download size={16} />
                Unduh Templat CSV
              </button>
              {importFile && (
                <button
                  type="button"
                  className="secondary"
                  disabled={importing}
                  onClick={() => {
                    setImportFile(null);
                    setImportRows([]);
                    setImportResult(null);
                    setImportError(null);
                  }}
                >
                  Ganti Berkas
                </button>
              )}
            </div>

            {!importResult ? (
              <>
                <div
                  className="card"
                  style={{
                    border: "2px dashed var(--line, #cbd5e1)",
                    borderRadius: 8,
                    padding: 24,
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--surface-muted, #f8fafc)",
                    marginBottom: 16,
                  }}
                  onClick={() => {
                    const el = document.getElementById("user-csv-input");
                    if (el) el.click();
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleImportFileSelect(f);
                  }}
                >
                  <input
                    id="user-csv-input"
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportFileSelect(f);
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {importFile ? (
                      <FileSpreadsheet
                        size={32}
                        style={{ color: "var(--primary, #0284c7)" }}
                      />
                    ) : (
                      <UploadCloud
                        size={32}
                        style={{ color: "var(--primary, #0284c7)" }}
                      />
                    )}
                    <strong>
                      {importFile
                        ? importFile.name
                        : "Pilih berkas CSV atau seret ke sini"}
                    </strong>
                    <small className="governance-subtext">
                      Kolom wajib: <code>name, email, identifier_value</code> &bull; Kolom tipe: <code>user_type, identifier_type, status</code>
                    </small>
                  </div>
                </div>

                {importError && <Notice error={importError} />}

                {importRows.length > 0 && (
                  <div className="sso-sync-results">
                    <div className="sso-sync-stats-grid">
                      <div className="sso-stat-card">
                        <span className="stat-num">{importRows.length}</span>
                        <span className="stat-label">Total Akun di CSV</span>
                      </div>
                      <div className="sso-stat-card new">
                        <span className="stat-num">
                          {
                            importRows.filter((r) => r.role === "INSTRUCTOR")
                              .length
                          }
                        </span>
                        <span className="stat-label">Dosen</span>
                      </div>
                      <div className="sso-stat-card existing">
                        <span className="stat-num">
                          {
                            importRows.filter((r) => r.role === "STUDENT")
                              .length
                          }
                        </span>
                        <span className="stat-label">Mahasiswa</span>
                      </div>
                    </div>

                    <div className="sso-sync-preview-list">
                      <div className="sso-sync-list-header">
                        <strong>Pratinjau Akun ({importRows.length})</strong>
                        <small>Periksa data sebelum memproses import</small>
                      </div>
                      <div className="sso-sync-scroll-area">
                        <table className="sso-preview-table">
                          <thead>
                            <tr>
                              <th>Baris</th>
                              <th>Nama &amp; Email</th>
                              <th>Identitas</th>
                              <th>Tipe SSO</th>
                              <th>Peran E-Learning</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importRows.map((r, idx) => (
                              <tr key={idx}>
                                <td>{r.rowNumber}</td>
                                <td>
                                  <strong>{r.name}</strong>
                                  <div className="governance-subtext">
                                    {r.email}
                                  </div>
                                </td>
                                <td>
                                  <span className="pill neutral">
                                    {r.identifier_type}: {r.identifier_value}
                                  </span>
                                </td>
                                <td>{r.user_type}</td>
                                <td>
                                  <span className="governance-role-badge">
                                    {roleNames[r.role] ?? r.role}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      className="governance-modal-actions"
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setShowImportModal(false)}
                        disabled={importing}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        className="primary"
                        disabled={importing || importRows.length === 0}
                        onClick={runUserImport}
                      >
                        <CheckCircle2 size={16} />
                        {importing
                          ? "Memproses Import…"
                          : `Proses Import (${importRows.length} Pengguna)`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="sso-sync-results">
                <div className="sso-sync-stats-grid">
                  <div className="sso-stat-card">
                    <span className="stat-num">
                      {importResult.summary?.total ?? 0}
                    </span>
                    <span className="stat-label">Total Diproses</span>
                  </div>
                  <div className="sso-stat-card new">
                    <span className="stat-num">
                      {importResult.summary?.created ?? 0}
                    </span>
                    <span className="stat-label">Akun Dibuat</span>
                  </div>
                  <div className="sso-stat-card existing">
                    <span className="stat-num">
                      {importResult.summary?.updated ?? 0}
                    </span>
                    <span className="stat-label">Diselaraskan</span>
                  </div>
                </div>

                <div className="sso-sync-preview-list">
                  <div className="sso-sync-list-header">
                    <strong>
                      Hasil Import ({importResult.results?.length ?? 0})
                    </strong>
                    <small>Laporan status pendaftaran akun</small>
                  </div>
                  <div className="sso-sync-scroll-area">
                    <table className="sso-preview-table">
                      <thead>
                        <tr>
                          <th>Baris</th>
                          <th>Nama &amp; Identitas</th>
                          <th>Peran</th>
                          <th>Status</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.results?.map((res: any, idx: number) => (
                          <tr key={idx}>
                            <td>{res.rowNumber}</td>
                            <td>
                              <strong>{res.name}</strong>
                              <div className="governance-subtext">
                                {res.identifierType} {res.identifierValue} &bull;{" "}
                                {res.email}
                              </div>
                            </td>
                            <td>{roleNames[res.role] ?? res.role}</td>
                            <td>
                              <span
                                className={`pill ${res.status === "CREATED" ? "success" : res.status === "UPDATED" ? "neutral" : "danger"}`}
                              >
                                {res.status === "CREATED"
                                  ? "Dibuat"
                                  : res.status === "UPDATED"
                                    ? "Diperbarui"
                                    : "Gagal"}
                              </span>
                            </td>
                            <td>
                              <small>{res.message}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className="governance-modal-actions"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportRows([]);
                      setImportResult(null);
                    }}
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
