import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Code,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { api, Loading, Notice, Modal } from "../lib";
import { confirmAction } from "../confirm";
import {
  UAY_DEPARTMENTS,
  formatDepartmentDisplay,
  normalizeDepartmentCode,
} from "../../../../packages/shared/src/departments";

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

export function DepartmentScopeModal({
  isOpen,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
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
        `/system/departments?includeInactive=true&q=${encodeURIComponent(deptSearch.trim())}`,
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
    if (isOpen) {
      fetchDepartments();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === "PRODI") {
      fetchDepartments();
    }
  }, [deptSearch]);

  useEffect(() => {
    if (isOpen && activeTab === "MANUAL") {
      fetchUsers();
    }
  }, [roleFilter]);

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
  };

  const openEditDeptForm = (dept: DepartmentRecord) => {
    setIsCreatingDept(false);
    setEditingDept(dept);
    setDeptFormCode(dept.code);
    setDeptFormName(dept.name);
    setDeptFormFaculty(dept.faculty || "");
    setDeptFormIsActive(dept.isActive);
    setDeptNotice(null);
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
        setDeptNotice(`Program Studi ${deptFormCode.toUpperCase()} berhasil ditambahkan.`);
      } else if (editingDept) {
        await api(`/system/departments/${editingDept.id}`, "PUT", {
          code: normalizeDepartmentCode(deptFormCode),
          name: deptFormName.trim(),
          faculty: deptFormFaculty.trim() || null,
          isActive: deptFormIsActive,
        });
        setDeptNotice(`Program Studi ${deptFormCode.toUpperCase()} berhasil diperbarui.`);
      }
      setIsCreatingDept(false);
      setEditingDept(null);
      await fetchDepartments();
      onUpdated?.();
    } catch (err: any) {
      setDeptError(err);
    } finally {
      setSavingDept(false);
    }
  };

  const deleteDepartment = async (dept: DepartmentRecord) => {
    const ok = await confirmAction(
      `Hapus atau nonaktifkan Program Studi ${dept.code} (${dept.name})? Tindakan ini akan menjaga riwayat kelas yang sudah ada.`,
    );
    if (!ok) return;

    try {
      const res = await api<any>(`/system/departments/${dept.id}`, "DELETE");
      setDeptNotice(res?.message || `Program studi ${dept.code} berhasil diperbarui.`);
      await fetchDepartments();
      onUpdated?.();
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
  };

  const toggleScope = (code: string) => {
    const norm = normalizeDepartmentCode(code);
    if (selectedScopes.includes(norm)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== norm));
    } else {
      setSelectedScopes([...selectedScopes, norm]);
    }
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
      setUserSuccess(`Otoritas prodi untuk ${editingUser.name} berhasil disimpan.`);
      setEditingUser(null);
      await fetchUsers();
      onUpdated?.();
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
        onUpdated?.();
      }
    } catch (err: any) {
      setSiakadError(err);
    } finally {
      setSiakadSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal wide onClose={onClose} title="Kelola Program Studi &amp; Otoritas Akademik">
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "4px 0" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid var(--border, #e2e8f0)",
            paddingBottom: 12,
            marginBottom: 20,
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

        {/* TAB 1: MASTER PROGRAM STUDI CRUD */}
        {activeTab === "PRODI" && (
          <div>
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
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <input
                  type="text"
                  placeholder="Cari kode, nama prodi, atau fakultas..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  style={{ width: "100%", paddingLeft: 34 }}
                />
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 10,
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
                <button
                  type="button"
                  className="button primary"
                  onClick={openCreateDeptForm}
                >
                  <Plus size={16} />
                  <span>Tambah Program Studi</span>
                </button>
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

            {/* FORM TAMBAH / EDIT PROGRAM STUDI */}
            {(isCreatingDept || editingDept) && (
              <form
                onSubmit={saveDepartment}
                style={{
                  padding: 20,
                  marginBottom: 20,
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 12,
                  backgroundColor: "var(--surface, #ffffff)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    paddingBottom: 10,
                    borderBottom: "1px solid var(--border, #e2e8f0)",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    {isCreatingDept
                      ? "Tambah Program Studi Baru"
                      : `Edit Program Studi: ${editingDept?.code}`}
                  </h3>
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={cancelDeptForm}
                    style={{ padding: "4px 8px", minHeight: 32, height: 32 }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: 6 }}>
                      Kode Program Studi *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: IF, TI, BIO"
                      value={deptFormCode}
                      onChange={(e) => setDeptFormCode(e.target.value.toUpperCase())}
                      style={{ width: "100%", textTransform: "uppercase" }}
                    />
                    <small style={{ color: "var(--muted-foreground, #64748b)", display: "block", marginTop: 4 }}>
                      Kode unik &amp; huruf kapital (misal: IF)
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: 6 }}>
                      Nama Program Studi *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Teknik Informatika"
                      value={deptFormName}
                      onChange={(e) => setDeptFormName(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: 6 }}>
                      Fakultas / Unit Naungan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Fakultas Teknik"
                      value={deptFormFaculty}
                      onChange={(e) => setDeptFormFaculty(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border, #e2e8f0)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={deptFormIsActive}
                      onChange={(e) => setDeptFormIsActive(e.target.checked)}
                    />
                    <span>Aktif (dapat digunakan untuk pembuatan kelas &amp; kurikulum)</span>
                  </label>

                  <div style={{ display: "flex", gap: 10 }}>
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
                      {savingDept ? "Menyimpan..." : "Simpan Program Studi"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TABEL LIST DEPARTMENTS */}
            {loadingDepts ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Loading />
                <p style={{ marginTop: 10, color: "var(--muted-foreground, #64748b)" }}>
                  Memuat data program studi...
                </p>
              </div>
            ) : (
              <div className="card table-wrap phone-record-table">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 100 }}>Kode</th>
                      <th scope="col">Nama Program Studi</th>
                      <th scope="col">Fakultas</th>
                      <th scope="col" style={{ width: 120 }}>Status</th>
                      <th scope="col" style={{ textAlign: "right", width: 160 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr
                        key={d.id}
                        style={{ opacity: d.isActive ? 1 : 0.65 }}
                      >
                        <td data-label="Kode">
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: "0.8rem",
                              background: "rgba(2, 132, 199, 0.1)",
                              color: "#0369a1",
                              fontWeight: 700,
                            }}
                          >
                            {d.code}
                          </span>
                        </td>
                        <td data-label="Nama Program Studi" style={{ fontWeight: 600 }}>
                          {d.name}
                        </td>
                        <td data-label="Fakultas" style={{ color: "var(--muted-foreground, #64748b)" }}>
                          {d.faculty || "—"}
                        </td>
                        <td data-label="Status">
                          {d.isActive ? (
                            <span style={{ color: "#16a34a", fontSize: "0.82rem", fontWeight: 600 }}>
                              ● Aktif
                            </span>
                          ) : (
                            <span style={{ color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
                              ○ Nonaktif
                            </span>
                          )}
                        </td>
                        <td data-label="Aksi" className="record-actions" style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="button secondary compact"
                              style={{ padding: "4px 10px", fontSize: "0.78rem", minHeight: 32, height: 32 }}
                              onClick={() => openEditDeptForm(d)}
                              title="Edit Program Studi"
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="button secondary compact"
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.78rem",
                                minHeight: 32,
                                height: 32,
                                color: "var(--destructive, #ef4444)",
                              }}
                              onClick={() => deleteDepartment(d)}
                              title="Hapus / Nonaktifkan Program Studi"
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OTORITAS KAPRODI & DEKAN */}
        {activeTab === "MANUAL" && (
          <div>
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
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ width: "100%", paddingLeft: 34 }}
                />
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted-foreground, #64748b)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ minWidth: 160 }}
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
                  Gunakan kata kunci pencarian atau ganti filter peran.
                </p>
              </div>
            ) : (
              <div className="card table-wrap phone-record-table">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th scope="col">Nama &amp; Identitas</th>
                      <th scope="col">Peran Aktif</th>
                      <th scope="col">Cakupan Prodi (departmentScopes)</th>
                      <th scope="col" style={{ textAlign: "right", width: 140 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isEditing = editingUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          style={{
                            backgroundColor: isEditing
                              ? "rgba(2, 132, 199, 0.05)"
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
                              {isEditing ? "Sedang Diedit" : "Atur Lingkup"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* FORM EDIT USER SCOPES */}
            {editingUser && (
              <div
                style={{
                  marginTop: 20,
                  padding: 20,
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 12,
                  backgroundColor: "var(--surface, #ffffff)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    paddingBottom: 10,
                    borderBottom: "1px solid var(--border, #e2e8f0)",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    Penetapan Otoritas: <strong>{editingUser.name}</strong>
                  </h3>
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={() => setEditingUser(null)}
                    style={{ padding: "4px 8px", minHeight: 32, height: 32 }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {userSaveError && <Notice error={userSaveError} />}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: 6 }}>
                    Peran Aplikasi
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={{ width: "100%", maxWidth: 420 }}
                  >
                    <option value="DEPARTMENT_ADMIN">
                      DEPARTMENT_ADMIN (Admin Prodi / Kaprodi / Dekan)
                    </option>
                    <option value="INSTRUCTOR">INSTRUCTOR (Dosen Pengampu)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Pengelola Sistem)</option>
                  </select>
                  <small style={{ color: "var(--muted-foreground, #64748b)", display: "block", marginTop: 4 }}>
                    DEPARTMENT_ADMIN dibatasi hanya dapat mengelola kelas dan kurikulum pada prodi yang dipilih.
                  </small>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: 8 }}>
                    Pilih Program Studi yang Dikelola ({selectedScopes.length} terpilih):
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 8,
                      maxHeight: 240,
                      overflowY: "auto",
                      padding: 10,
                      border: "1px solid var(--border, #cbd5e1)",
                      borderRadius: 8,
                      backgroundColor: "var(--muted, #f8fafc)",
                    }}
                  >
                    {departments
                      .filter((dept) => dept.isActive || selectedScopes.includes(dept.code))
                      .map((dept) => {
                        const checked = selectedScopes.includes(dept.code);
                        return (
                          <label
                            key={dept.code}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              borderRadius: 6,
                              cursor: "pointer",
                              backgroundColor: checked ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                              border: checked
                                ? "1px solid #0284c7"
                                : "1px solid var(--border, #cbd5e1)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleScope(dept.code)}
                            />
                            <span style={{ fontSize: "0.85rem" }}>
                              <strong>{dept.code}</strong> - {dept.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border, #e2e8f0)",
                  }}
                >
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setEditingUser(null)}
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
                    {savingUser ? "Menyimpan..." : "Simpan Perubahan Otoritas"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SIAKAD INTEGRATION BRIDGE */}
        {activeTab === "SIAKAD" && (
          <div>
            <div
              style={{
                padding: 18,
                backgroundColor: "rgba(2, 132, 199, 0.04)",
                border: "1px solid rgba(2, 132, 199, 0.2)",
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Building2 size={20} style={{ color: "#0284c7" }} />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Status Integrasi: Siap Terhubung (Production Ready)
                </h3>
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--foreground, #1e293b)",
                  lineHeight: 1.5,
                  margin: "0 0 12px 0",
                }}
              >
                E-Learning siap menerima pemetaan otomatis penugasan struktural Kaprodi
                maupun Program Studi dari SIAKAD kampus via Webhook atau sinkronisasi berkas JSON.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  fontSize: "0.82rem",
                  background: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(2, 132, 199, 0.2)",
                }}
              >
                <div>
                  <strong>Endpoint Webhook:</strong>{" "}
                  <code>POST /api/v1/system/siakad/sync-scopes</code>
                </div>
                <div>
                  <strong>Header Otorisasi:</strong> <code>X-SIAKAD-Secret: [SECRET]</code>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                  Payload Data Sinkronisasi SIAKAD (JSON Format):
                </label>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ fontSize: "0.76rem", padding: "3px 10px", minHeight: 30, height: 30 }}
                  onClick={handleFillSiakadSample}
                >
                  <FileSpreadsheet size={14} />
                  <span>Muat Format Contoh</span>
                </button>
              </div>
              <textarea
                rows={8}
                placeholder='Masukkan JSON penugasan dari SIAKAD...'
                value={siakadPayloadText}
                onChange={(e) => setSiakadPayloadText(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border, #cbd5e1)",
                }}
              />
            </div>

            {siakadError && <Notice error={siakadError} />}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                className="button secondary"
                disabled={siakadSyncing || !siakadPayloadText.trim()}
                onClick={() => runSiakadSync(true)}
              >
                {siakadSyncing ? "Memproses..." : "Uji Coba (Pratinjau / Dry Run)"}
              </button>
              <button
                type="button"
                className="button primary"
                disabled={siakadSyncing || !siakadPayloadText.trim()}
                onClick={() => runSiakadSync(false)}
              >
                {siakadSyncing ? "Menyinkronkan..." : "Eksekusi Sinkronisasi Nyata"}
              </button>
            </div>

            {/* HASIL SINKRONISASI SIAKAD */}
            {siakadResult && (
              <div
                style={{
                  padding: 18,
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 10,
                  backgroundColor: "var(--surface, #ffffff)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                    Hasil {siakadResult.dryRun ? "Pratinjau (Dry Run)" : "Sinkronisasi"}:
                  </h4>
                  <div style={{ display: "flex", gap: 8, fontSize: "0.8rem" }}>
                    <span
                      style={{
                        background: "rgba(2, 132, 199, 0.1)",
                        color: "#0369a1",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      Total: {siakadResult.total}
                    </span>
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {siakadResult.dryRun ? "Siap Dipetakan" : "Diperbarui"}:{" "}
                      {siakadResult.dryRun ? siakadResult.ready : siakadResult.updated}
                    </span>
                    {siakadResult.notFound > 0 && (
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#b91c1c",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Belum Terdaftar: {siakadResult.notFound}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card table-wrap phone-record-table">
                  <table style={{ width: "100%", fontSize: "0.82rem" }}>
                    <thead>
                      <tr>
                        <th scope="col">Identitas (NIDN/NIP)</th>
                        <th scope="col">Nama Akun</th>
                        <th scope="col">Cakupan Prodi</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siakadResult.results?.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td data-label="Identitas">{r.identifierValue}</td>
                          <td data-label="Nama Akun" style={{ fontWeight: 600 }}>
                            {r.name || "(Belum login via SSO)"}
                          </td>
                          <td data-label="Cakupan Prodi">
                            {(r.departmentScopes || r.proposedScopes || []).join(", ")}
                          </td>
                          <td data-label="Status">
                            {r.status === "UPDATED" || r.status === "READY" ? (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>
                                ✓ {r.status}
                              </span>
                            ) : (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                ✗ Belum Terdaftar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
