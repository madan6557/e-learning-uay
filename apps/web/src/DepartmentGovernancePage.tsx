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
import {
  formatDepartmentDisplay,
  normalizeDepartmentCode,
} from "../../../packages/shared/src/departments";

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
const roleNames: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Admin Prodi / Kaprodi / Dekan",
  INSTRUCTOR: "Dosen",
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

export function DepartmentGovernancePage({
  user,
}: {
  user: any;
  config?: any;
}) {
  const [activeTab, setActiveTab] = useState<"PRODI" | "MANUAL" | "SIAKAD">(
    "PRODI",
  );
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
  const pending = useRef(new Set<string>());
  const deptRequest = useRef(0),
    userRequest = useRef(0);

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
    if (roleFilter !== "ALL") params.set("role", roleFilter);
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
    siakadResult?.dryRun &&
    siakadResult.ready > 0 &&
    siakadResult.notFound === 0;
  const runSiakadSync = async (dryRun: boolean) => {
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

  if (user.role !== "SUPER_ADMIN")
    return (
      <Notice error="Pengelolaan program studi dan otoritas hanya tersedia untuk Super Admin." />
    );
  return (
    <div className="departments-governance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Building2 size={16} /> Tata Kelola Akademik
          </div>
          <h1>Program Studi &amp; Otoritas</h1>
          <p>
            Kelola program studi, penugasan Kaprodi dan Dekan, serta
            sinkronisasi dari SIAKAD.
          </p>
        </div>
      </div>
      <div className="governance-tabs" aria-label="Bagian tata kelola">
        {(
          [
            ["PRODI", Building2, "Master Program Studi"],
            ["MANUAL", ShieldCheck, "Otoritas Kaprodi & Dekan"],
            ["SIAKAD", Code, "Integrasi SIAKAD"],
          ] as const
        ).map(([tab, Icon, title]) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            className={activeTab === tab ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            <Icon size={18} />
            {title}
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
              <button
                type="button"
                className="primary"
                onClick={() => openDept()}
              >
                <Plus size={18} />
                Tambah Program Studi
              </button>
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
                      <th scope="col">Aksi</th>
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
                onClick={() => openUser()}
              >
                <UserPlus size={18} />
                Daftarkan Dosen / Kaprodi
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

      {activeTab === "SIAKAD" && (
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
              : "Daftarkan Dosen / Kaprodi Baru"
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
    </div>
  );
}
