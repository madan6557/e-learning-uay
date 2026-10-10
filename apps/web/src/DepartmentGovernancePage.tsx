import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  ShieldCheck,
  Code,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUp,
  Check,
} from "lucide-react";
import { api, Loading, Notice, Pagination, usePagination } from "./lib";
import { confirmAction } from "./confirm";
import { notifyAction } from "./feedback";
import {
  UAY_DEPARTMENTS,
  formatDepartmentDisplay,
  normalizeDepartmentCode,
} from "../../../packages/shared/src/departments";

interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  faculty?: string | null;
  isActive: boolean;
  createdAt?: string;
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
  userType: string;
  departmentScopes: string[];
  status: string;
}

export function DepartmentGovernancePage({
  user,
}: {
  user: any;
  config?: any;
}) {
  const [activeTab, setActiveTab] = useState<"PRODI" | "MANUAL" | "SIAKAD">("PRODI");

  // ==========================================
  // STATE: CRUD DEPARTMENTS (PROGRAM STUDI)
  // ==========================================
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptError, setDeptError] = useState<Error | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormFaculty, setDeptFormFaculty] = useState("");
  const [deptFormIsActive, setDeptFormIsActive] = useState(true);
  const [savingDept, setSavingDept] = useState(false);
  const [deptNotice, setDeptNotice] = useState<string | null>(null);

  // ==========================================
  // STATE: USER SCOPE ASSIGNMENT
  // ==========================================
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<Error | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("DEPARTMENT_ADMIN");
  const [savingUser, setSavingUser] = useState(false);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userSaveError, setUserSaveError] = useState<Error | null>(null);

  const editSectionRef = useRef<HTMLDivElement | null>(null);
  const deptFormRef = useRef<HTMLFormElement | null>(null);

  // ==========================================
  // STATE: SIAKAD SYNC BRIDGE
  // ==========================================
  const [siakadPayloadText, setSiakadPayloadText] = useState("");
  const [siakadSyncing, setSiakadSyncing] = useState(false);
  const [siakadResult, setSiakadResult] = useState<any | null>(null);
  const [siakadError, setSiakadError] = useState<Error | null>(null);

  // ------------------------------------------
  // FETCH DEPARTMENTS
  // ------------------------------------------
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    setDeptError(null);
    try {
      const res = await api<DepartmentRecord[]>(
        `/system/departments?includeInactive=true`,
      );
      setDepartments(res || []);
    } catch (err: any) {
      setDeptError(err);
      if (departments.length === 0) {
        setDepartments(
          UAY_DEPARTMENTS.map((d) => ({
            id: d.code,
            code: d.code,
            name: d.name,
            faculty: d.faculty,
            isActive: true,
          })),
        );
      }
    } finally {
      setLoadingDepts(false);
    }
  };

  // ------------------------------------------
  // FETCH USERS
  // ------------------------------------------
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set("q", userSearch.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await api<UserRecord[]>(
        `/system/department-scopes/users?${params.toString()}`,
      );
      setUsers(res || []);
    } catch (err: any) {
      setUserError(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  // Filtered Departments for client search & pagination
  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.faculty && d.faculty.toLowerCase().includes(q)),
    );
  }, [departments, deptSearch]);

  const deptPagination = usePagination(filteredDepartments, 10);

  // Filtered Users for pagination
  const userPagination = usePagination(users, 10);

  // ------------------------------------------
  // CRUD HANDLERS: DEPARTMENTS
  // ------------------------------------------
  const openCreateDeptForm = () => {
    setEditingDept(null);
    setIsCreatingDept(true);
    setDeptFormCode("");
    setDeptFormName("");
    setDeptFormFaculty("");
    setDeptFormIsActive(true);
    setDeptNotice(null);
    setTimeout(() => {
      deptFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const openEditDeptForm = (dept: DepartmentRecord) => {
    setIsCreatingDept(false);
    setEditingDept(dept);
    setDeptFormCode(dept.code);
    setDeptFormName(dept.name);
    setDeptFormFaculty(dept.faculty || "");
    setDeptFormIsActive(dept.isActive);
    setDeptNotice(null);
    setTimeout(() => {
      deptFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const cancelDeptForm = () => {
    setIsCreatingDept(false);
    setEditingDept(null);
  };

  const saveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormCode.trim() || !deptFormName.trim()) return;

    setSavingDept(true);
    setDeptNotice(null);
    try {
      if (isCreatingDept) {
        await api("/system/departments", "POST", {
          code: normalizeDepartmentCode(deptFormCode),
          name: deptFormName.trim(),
          faculty: deptFormFaculty.trim() || undefined,
          isActive: deptFormIsActive,
        });
        const msg = `Program Studi ${deptFormCode.toUpperCase()} berhasil ditambahkan.`;
        setDeptNotice(msg);
        notifyAction(msg);
      } else if (editingDept) {
        await api(`/system/departments/${editingDept.id}`, "PUT", {
          code: normalizeDepartmentCode(deptFormCode),
          name: deptFormName.trim(),
          faculty: deptFormFaculty.trim() || null,
          isActive: deptFormIsActive,
        });
        const msg = `Program Studi ${deptFormCode.toUpperCase()} berhasil diperbarui.`;
        setDeptNotice(msg);
        notifyAction(msg);
      }
      setIsCreatingDept(false);
      setEditingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      setDeptError(err);
    } finally {
      setSavingDept(false);
    }
  };

  const deleteDepartment = async (dept: DepartmentRecord) => {
    const ok = await confirmAction(
      `Hapus atau nonaktifkan Program Studi ${dept.code} (${dept.name})? Tindakan ini akan menjaga integritas riwayat kelas yang sudah ada.`,
    );
    if (!ok) return;

    try {
      const res = await api<any>(`/system/departments/${dept.id}`, "DELETE");
      const msg = res?.message || `Program studi ${dept.code} berhasil diperbarui.`;
      setDeptNotice(msg);
      notifyAction(msg);
      await fetchDepartments();
    } catch (err: any) {
      setDeptError(err);
    }
  };

  // ------------------------------------------
  // HANDLERS: USER SCOPES
  // ------------------------------------------
  const startEditUser = (u: UserRecord) => {
    setEditingUser(u);
    setSelectedScopes([...(u.departmentScopes || [])]);
    setSelectedRole(u.role);
    setUserSaveError(null);
    setUserSuccess(null);
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setUserSaveError(null);
  };

  const toggleScope = (code: string) => {
    const norm = normalizeDepartmentCode(code);
    if (selectedScopes.includes(norm)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== norm));
    } else {
      setSelectedScopes([...selectedScopes, norm]);
    }
  };

  const selectAllScopes = () => {
    const allActive = departments
      .filter((d) => d.isActive)
      .map((d) => normalizeDepartmentCode(d.code));
    setSelectedScopes(allActive);
  };

  const clearAllScopes = () => {
    setSelectedScopes([]);
  };

  const saveUserScopes = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    setUserSaveError(null);
    setUserSuccess(null);
    try {
      await api(`/system/department-scopes/users/${editingUser.id}`, "PUT", {
        departmentScopes: selectedScopes,
        role: selectedRole,
      });
      const msg = `Otoritas prodi untuk ${editingUser.name} berhasil disimpan.`;
      setUserSuccess(msg);
      notifyAction(msg);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setUserSaveError(err);
    } finally {
      setSavingUser(false);
    }
  };

  // ------------------------------------------
  // HANDLERS: SIAKAD SYNC BRIDGE
  // ------------------------------------------
  const handleFillSiakadSample = () => {
    const sample = {
      academicYear: "2026/2027 Ganjil",
      source: "SIAKAD_API_UAY",
      assignments: [
        {
          identifierValue: "0912058501",
          departmentScopes: ["IF"],
          role: "DEPARTMENT_ADMIN",
          notes: "SK Rektor No. 104/SK/UAY/2026 - Kaprodi Informatika",
        },
        {
          identifierValue: "0915088202",
          departmentScopes: ["TS"],
          role: "DEPARTMENT_ADMIN",
          notes: "SK Rektor No. 105/SK/UAY/2026 - Kaprodi Teknik Sipil",
        },
      ],
    };
    setSiakadPayloadText(JSON.stringify(sample, null, 2));
    setSiakadError(null);
    setSiakadResult(null);
  };

  const runSiakadSync = async (dryRun: boolean) => {
    setSiakadSyncing(true);
    setSiakadError(null);
    setSiakadResult(null);
    try {
      const parsed = JSON.parse(siakadPayloadText);
      const res = await api<any>("/system/siakad/sync-scopes", "POST", {
        ...parsed,
        dryRun,
      });
      setSiakadResult(res);
      if (!dryRun) {
        await fetchUsers();
        await fetchDepartments();
        notifyAction("Sinkronisasi SIAKAD berhasil diterapkan ke database.");
      }
    } catch (err: any) {
      setSiakadError(err);
    } finally {
      setSiakadSyncing(false);
    }
  };

  return (
    <div
      className="departments-governance-page"
      style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 12px" }}
    >
      {/* Page Heading */}
      <div className="page-heading" style={{ marginBottom: 20 }}>
        <div>
          <div
            className="eyebrow"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Building2 size={15} />
            Tata Kelola Akademik Universitas
          </div>
          <h1 style={{ margin: "4px 0 0" }}>Program Studi &amp; Otoritas</h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--muted-foreground, #64748b)",
              fontSize: "0.95rem",
            }}
          >
            Pusat pengelolaan master program studi, penugasan lingkup prodi bagi
            Kaprodi dan Dekan, serta jembatan integrasi sistem akademik (SIAKAD).
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border, #e2e8f0)",
          paddingBottom: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className={`button ${activeTab === "PRODI" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("PRODI")}
        >
          <Building2 size={16} />
          <span>Master Program Studi (CRUD)</span>
        </button>
        <button
          type="button"
          className={`button ${activeTab === "MANUAL" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("MANUAL")}
        >
          <ShieldCheck size={16} />
          <span>Otoritas Kaprodi &amp; Dekan</span>
        </button>
        <button
          type="button"
          className={`button ${activeTab === "SIAKAD" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("SIAKAD")}
        >
          <Code size={16} />
          <span>Bridge Integrasi SIAKAD</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MASTER PROGRAM STUDI CRUD                          */}
      {/* ========================================================= */}
      {activeTab === "PRODI" && (
        <div>
          {/* FORM TAMBAH / EDIT PROGRAM STUDI (DI ATAS) */}
          {(isCreatingDept || editingDept) && (
            <form
              ref={deptFormRef}
              onSubmit={saveDepartment}
              style={{
                padding: 22,
                marginBottom: 24,
                border: "1px solid var(--border, #cbd5e1)",
                borderRadius: 12,
                backgroundColor: "var(--surface, #ffffff)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border, #e2e8f0)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    {isCreatingDept
                      ? "Tambah Program Studi Baru"
                      : `Edit Program Studi: ${editingDept?.code}`}
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "0.85rem",
                      color: "var(--muted-foreground, #64748b)",
                    }}
                  >
                    Tentukan kode unik dan nama resmi prodi yang diakui pangkalan data.
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={cancelDeptForm}
                  style={{ padding: "6px 10px" }}
                  title="Batalkan perubahan"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      marginBottom: 6,
                    }}
                  >
                    Kode Program Studi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IF, TS, TI, MAN..."
                    value={deptFormCode}
                    onChange={(e) => setDeptFormCode(e.target.value.toUpperCase())}
                    disabled={savingDept}
                    style={{ width: "100%", textTransform: "uppercase" }}
                  />
                  <small
                    style={{
                      color: "var(--muted-foreground, #64748b)",
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    Harus unik dan menjadi rujukan sistem kelas/SIAKAD.
                  </small>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      marginBottom: 6,
                    }}
                  >
                    Nama Lengkap Program Studi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Informatika, Teknik Sipil..."
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    disabled={savingDept}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      marginBottom: 6,
                    }}
                  >
                    Fakultas / Unit Pengampu (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fakultas Teknik"
                    value={deptFormFaculty}
                    onChange={(e) => setDeptFormFaculty(e.target.value)}
                    disabled={savingDept}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deptFormIsActive}
                    onChange={(e) => setDeptFormIsActive(e.target.checked)}
                    disabled={savingDept}
                  />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Status Aktif (Tersedia untuk pembukaan kelas dan penugasan Kaprodi)
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={cancelDeptForm}
                  disabled={savingDept}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={savingDept}
                >
                  {savingDept ? (
                    <>
                      <Loading />
                      <span style={{ marginLeft: 8 }}>Menyimpan...</span>
                    </>
                  ) : isCreatingDept ? (
                    "Tambahkan Program Studi"
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TOOLBAR FILTER & AKSI MASTER PRODI */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ position: "relative", flex: "1 1 300px" }}>
              <input
                type="text"
                placeholder="Cari kode, nama prodi, atau fakultas..."
                value={deptSearch}
                onChange={(e) => {
                  setDeptSearch(e.target.value);
                  deptPagination.setPage(1);
                }}
                style={{ width: "100%", paddingLeft: 36 }}
              />
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted-foreground, #64748b)",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="button secondary"
                onClick={fetchDepartments}
                title="Muat ulang data program studi"
              >
                <RefreshCw size={15} />
                <span>Segarkan</span>
              </button>
              {!isCreatingDept && !editingDept && (
                <button
                  type="button"
                  className="button primary"
                  onClick={openCreateDeptForm}
                >
                  <Plus size={16} />
                  <span>Tambah Program Studi</span>
                </button>
              )}
            </div>
          </div>

          {deptNotice && (
            <div
              className="notice success"
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{deptNotice}</span>
            </div>
          )}

          {deptError && <Notice error={deptError} />}

          {/* TABEL MASTER PROGRAM STUDI */}
          {loadingDepts ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loading />
              <p style={{ marginTop: 10, color: "var(--muted-foreground, #64748b)" }}>
                Memuat daftar program studi...
              </p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                border: "1px dashed var(--border, #cbd5e1)",
                borderRadius: 12,
              }}
            >
              <Building2
                size={36}
                style={{ color: "var(--muted-foreground, #94a3b8)", marginBottom: 8 }}
              />
              <p style={{ fontWeight: 600 }}>Tidak ada program studi yang cocok</p>
              <p style={{ fontSize: "0.86rem", color: "var(--muted-foreground, #64748b)" }}>
                {deptSearch
                  ? "Coba gunakan kata kunci pencarian yang lain."
                  : "Belum ada program studi yang tersimpan di sistem."}
              </p>
            </div>
          ) : (
            <>
              <div className="card table-wrap phone-record-table">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 110 }}>Kode</th>
                      <th scope="col">Nama Program Studi</th>
                      <th scope="col">Fakultas / Unit</th>
                      <th scope="col" style={{ width: 110 }}>Status</th>
                      <th scope="col" style={{ textAlign: "right", width: 140 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptPagination.paginatedItems.map((dept) => {
                      const isEditing = editingDept?.id === dept.id;
                      return (
                        <tr
                          key={dept.id}
                          style={{
                            backgroundColor: isEditing
                              ? "rgba(2, 132, 199, 0.05)"
                              : undefined,
                          }}
                        >
                          <td data-label="Kode">
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: "var(--surface-muted, #f1f5f9)",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                fontSize: "0.88rem",
                              }}
                            >
                              {dept.code}
                            </span>
                          </td>
                          <td data-label="Nama Program Studi">
                            <div style={{ fontWeight: 600 }}>{dept.name}</div>
                          </td>
                          <td data-label="Fakultas / Unit">
                            <span style={{ color: "var(--muted-foreground, #64748b)", fontSize: "0.88rem" }}>
                              {dept.faculty || "Universitas Achmad Yani"}
                            </span>
                          </td>
                          <td data-label="Status">
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: dept.isActive
                                  ? "rgba(34, 197, 94, 0.12)"
                                  : "rgba(239, 68, 68, 0.12)",
                                color: dept.isActive ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {dept.isActive ? "Aktif" : "Non-aktif"}
                            </span>
                          </td>
                          <td data-label="Aksi" className="record-actions" style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                className="button secondary compact"
                                onClick={() => openEditDeptForm(dept)}
                                title="Edit data program studi"
                                style={{ padding: "4px 8px", minHeight: 32, height: 32 }}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="button danger compact"
                                onClick={() => deleteDepartment(dept)}
                                title="Hapus atau nonaktifkan program studi"
                                style={{ padding: "4px 8px", minHeight: 32, height: 32 }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION MASTER PRODI */}
              <Pagination
                page={deptPagination.page}
                totalPages={deptPagination.totalPages}
                totalItems={deptPagination.totalItems}
                pageSize={deptPagination.pageSize}
                onPageChange={deptPagination.setPage}
                onPageSizeChange={deptPagination.setPageSize}
              />
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: OTORITAS KAPRODI & DEKAN                           */}
      {/* ========================================================= */}
      {activeTab === "MANUAL" && (
        <div>
          {/* NOTICE FEEDBACK */}
          {userSuccess && (
            <div
              className="notice success"
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{userSuccess}</span>
            </div>
          )}

          {userError && <Notice error={userError} />}

          {/* EDIT FORM AT THE TOP (SESUAI REQUEST USER AGAR TIDAK DI BAWAH) */}
          {editingUser && (
            <div
              ref={editSectionRef}
              style={{
                marginBottom: 24,
                padding: 22,
                border: "2px solid var(--primary, #0284c7)",
                borderRadius: 12,
                backgroundColor: "var(--surface, #ffffff)",
                boxShadow: "0 6px 20px rgba(2, 132, 199, 0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border, #e2e8f0)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--primary, #0284c7)",
                      marginBottom: 4,
                    }}
                  >
                    <ShieldCheck size={14} />
                    Panel Penetapan Otoritas Prodi
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                    Penetapan Otoritas: {editingUser.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--muted-foreground, #64748b)",
                      marginTop: 4,
                    }}
                  >
                    {editingUser.identifierType}: <strong>{editingUser.identifierValue}</strong> ·{" "}
                    Email: <strong>{editingUser.email}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={cancelEditUser}
                  style={{ padding: "6px 10px" }}
                  title="Tutup panel edit"
                >
                  <X size={16} />
                </button>
              </div>

              {userSaveError && (
                <div style={{ marginBottom: 16 }}>
                  <Notice error={userSaveError} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    marginBottom: 6,
                  }}
                >
                  Peran Aplikasi
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ minWidth: 260, maxWidth: "100%" }}
                  disabled={savingUser}
                >
                  <option value="DEPARTMENT_ADMIN">
                    DEPARTMENT_ADMIN (Admin Prodi / Kaprodi / Dekan)
                  </option>
                  <option value="INSTRUCTOR">
                    INSTRUCTOR (Dosen Pengampu Murni)
                  </option>
                  <option value="SUPER_ADMIN">
                    SUPER_ADMIN (Pengelola Sistem Seluruh Universitas)
                  </option>
                </select>
                <small
                  style={{
                    color: "var(--muted-foreground, #64748b)",
                    display: "block",
                    marginTop: 6,
                  }}
                >
                  {selectedRole === "DEPARTMENT_ADMIN"
                    ? "DEPARTMENT_ADMIN dibatasi hanya dapat mengelola kelas dan kurikulum pada program studi yang dicentang di bawah."
                    : selectedRole === "SUPER_ADMIN"
                      ? "SUPER_ADMIN memiliki akses menyeluruh ke seluruh program studi tanpa pembatasan."
                      : "INSTRUCTOR hanya dapat mengajar di kelas yang ditugaskan kepada mereka."}
                </small>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <label style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    Pilih Program Studi yang Dikelola ({selectedScopes.length} terpilih):
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={selectAllScopes}
                      disabled={savingUser}
                      style={{ fontSize: "0.78rem", padding: "3px 8px" }}
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={clearAllScopes}
                      disabled={savingUser}
                      style={{ fontSize: "0.78rem", padding: "3px 8px" }}
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 10,
                    maxHeight: 280,
                    overflowY: "auto",
                    padding: 12,
                    border: "1px solid var(--border, #cbd5e1)",
                    borderRadius: 8,
                    backgroundColor: "var(--surface-muted, #f8fafc)",
                  }}
                >
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => {
                      const isChecked = selectedScopes.includes(d.code);
                      return (
                        <label
                          key={d.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 6,
                            backgroundColor: isChecked
                              ? "rgba(2, 132, 199, 0.08)"
                              : "var(--surface, #ffffff)",
                            border: `1px solid ${isChecked ? "var(--primary, #0284c7)" : "var(--border, #e2e8f0)"}`,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleScope(d.code)}
                            disabled={savingUser}
                          />
                          <div>
                            <strong>{d.code}</strong> - {d.name}
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={cancelEditUser}
                  disabled={savingUser}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={saveUserScopes}
                  disabled={savingUser}
                >
                  {savingUser ? (
                    <>
                      <Loading />
                      <span style={{ marginLeft: 8 }}>Menyimpan Otoritas...</span>
                    </>
                  ) : (
                    "Simpan Perubahan Otoritas"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TOOLBAR SEARCH & ROLE FILTER */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 320px" }}>
              <input
                type="text"
                placeholder="Cari nama, NIDN/NIP, atau username..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchUsers();
                  }
                }}
                style={{ width: "100%", paddingLeft: 36 }}
              />
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50)",
                  color: "var(--muted-foreground, #64748b)",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                }}
                style={{ minWidth: 170 }}
              >
                <option value="ALL">Semua Peran</option>
                <option value="DEPARTMENT_ADMIN">Admin Prodi / Kaprodi</option>
                <option value="INSTRUCTOR">Dosen Pengampu</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
              <button
                type="button"
                className="button secondary"
                onClick={fetchUsers}
                title="Muat ulang daftar pengguna"
              >
                <RefreshCw size={15} />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* TABEL PENGGUNA & OTORITAS */}
          {loadingUsers ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loading />
              <p style={{ marginTop: 10, color: "var(--muted-foreground, #64748b)" }}>
                Memuat data pengguna...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                border: "1px dashed var(--border, #cbd5e1)",
                borderRadius: 12,
              }}
            >
              <Users
                size={36}
                style={{ color: "var(--muted-foreground, #94a3b8)", marginBottom: 8 }}
              />
              <p style={{ fontWeight: 600 }}>Tidak ada pengguna yang cocok</p>
              <p style={{ fontSize: "0.86rem", color: "var(--muted-foreground, #64748b)" }}>
                Gunakan kata kunci pencarian atau sesuaikan filter peran di atas.
              </p>
            </div>
          ) : (
            <>
              <div className="card table-wrap phone-record-table">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th scope="col">Nama &amp; Identitas</th>
                      <th scope="col" style={{ width: 150 }}>Peran Aktif</th>
                      <th scope="col">Cakupan Prodi (departmentScopes)</th>
                      <th scope="col" style={{ textAlign: "right", width: 140 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPagination.paginatedItems.map((u) => {
                      const isEditing = editingUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          style={{
                            backgroundColor: isEditing
                              ? "rgba(2, 132, 199, 0.08)"
                              : undefined,
                          }}
                        >
                          <td data-label="Nama & Identitas">
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--muted-foreground, #64748b)",
                                marginTop: 2,
                              }}
                            >
                              {u.identifierType}: {u.identifierValue} · {u.email}
                            </div>
                          </td>
                          <td data-label="Peran Aktif">
                            <span className="user-role-badge" style={{ fontSize: "0.75rem" }}>
                              {u.role}
                            </span>
                          </td>
                          <td data-label="Cakupan Prodi">
                            {u.departmentScopes && u.departmentScopes.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {u.departmentScopes.map((scope) => (
                                  <span
                                    key={scope}
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      fontSize: "0.75rem",
                                      background: "rgba(2, 132, 199, 0.1)",
                                      color: "#0369a1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {formatDepartmentDisplay(scope)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground, #94a3b8)" }}>
                                {u.role === "SUPER_ADMIN"
                                  ? "Semua Prodi (Global)"
                                  : "Belum ditentukan"}
                              </span>
                            )}
                          </td>
                          <td data-label="Aksi" className="record-actions" style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className={`button ${isEditing ? "primary" : "secondary"} compact`}
                              style={{ padding: "4px 10px", fontSize: "0.78rem", minHeight: 32, height: 32 }}
                              onClick={() => startEditUser(u)}
                            >
                              {isEditing ? (
                                <>
                                  <ArrowUp size={12} style={{ marginRight: 4 }} />
                                  <span>Sedang Diedit</span>
                                </>
                              ) : (
                                "Atur Lingkup"
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION USERS */}
              <Pagination
                page={userPagination.page}
                totalPages={userPagination.totalPages}
                totalItems={userPagination.totalItems}
                pageSize={userPagination.pageSize}
                onPageChange={userPagination.setPage}
                onPageSizeChange={userPagination.setPageSize}
              />
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SIAKAD INTEGRATION BRIDGE                          */}
      {/* ========================================================= */}
      {activeTab === "SIAKAD" && (
        <div>
          <div
            className="card"
            style={{
              padding: 22,
              marginBottom: 20,
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Code size={20} style={{ color: "var(--primary, #0284c7)" }} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Spesifikasi Sinkronisasi SIAKAD
              </h3>
            </div>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--muted-foreground, #475569)",
                lineHeight: 1.5,
                margin: "0 0 14px",
              }}
            >
              Endpoint ini menerima sinkronisasi penugasan Kaprodi dan Dekan dari Sistem Informasi
              Akademik (SIAKAD). Dapat dipanggil secara otomatis oleh SIAKAD melalui webhook atau
              dijalankan manual oleh Super Admin di sini.
            </p>

            <div
              style={{
                background: "var(--surface-muted, #0f172a)",
                color: "#f8fafc",
                padding: "12px 16px",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: "0.85rem",
                marginBottom: 16,
              }}
            >
              POST /api/v1/system/siakad/sync-scopes
              <br />
              Headers: X-SIAKAD-Secret: &lt;SIAKAD_SECRET&gt; (atau login Super Admin)
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <button
                type="button"
                className="button secondary"
                onClick={handleFillSiakadSample}
              >
                <FileSpreadsheet size={15} />
                <span>Muat Contoh Data SK Penugasan</span>
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={!siakadPayloadText.trim() || siakadSyncing}
                onClick={() => runSiakadSync(true)}
              >
                {siakadSyncing ? <Loading /> : null}
                <span>Uji Simulasi (Dry-Run Preview)</span>
              </button>
              <button
                type="button"
                className="button primary"
                disabled={!siakadPayloadText.trim() || siakadSyncing}
                onClick={() => runSiakadSync(false)}
              >
                {siakadSyncing ? <Loading /> : null}
                <span>Terapkan Perubahan (Simpan ke DB)</span>
              </button>
            </div>

            <label
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "0.88rem",
                marginBottom: 6,
              }}
            >
              Payload JSON SIAKAD:
            </label>
            <textarea
              rows={10}
              value={siakadPayloadText}
              onChange={(e) => setSiakadPayloadText(e.target.value)}
              placeholder={`{\n  "academicYear": "2026/2027 Ganjil",\n  "source": "SIAKAD_API_UAY",\n  "assignments": [\n    {\n      "identifierValue": "0912058501",\n      "departmentScopes": ["IF"],\n      "role": "DEPARTMENT_ADMIN"\n    }\n  ]\n}`}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                borderRadius: 8,
                padding: 12,
              }}
            />
          </div>

          {siakadError && <Notice error={siakadError} />}

          {siakadResult && (
            <div
              className="card"
              style={{
                padding: 20,
                border: "1px solid var(--border, #cbd5e1)",
                borderRadius: 12,
                backgroundColor: "var(--surface, #ffffff)",
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontWeight: 700 }}>
                {siakadResult.dryRun ? "Hasil Simulasi (Dry Run)" : "Hasil Eksekusi Sinkronisasi"}
              </h4>
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "var(--muted-foreground, #64748b)" }}>
                {siakadResult.message}
              </p>
              <pre
                style={{
                  background: "var(--surface-muted, #f8fafc)",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {JSON.stringify(siakadResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
