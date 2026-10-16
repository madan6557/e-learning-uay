import { useState, useEffect } from "react";
import { Plus, Key, RefreshCw, Copy, Check } from "lucide-react";
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Badge,
  Modal,
  Form,
  Action,
  Pagination,
  usePagination,
} from "../../lib";
import { confirmAction } from "../../confirm";
import { ImportPanel } from "../../Gradebook";
import {
  formatClock,
  formatDateTime,
} from "../../../../../packages/shared/src/time";

export function formatLastActive(
  isoString?: string | null,
  isOnline?: boolean,
) {
  if (isOnline) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--adaptive-success-soft, #ecfdf5)",
          color: "var(--adaptive-success-text, #15803d)",
          border: "1px solid var(--adaptive-success-border, #bbf7d0)",
          fontSize: "0.75rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 12,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--adaptive-success-fill, #22c55e)",
            boxShadow: "0 0 6px #22c55e",
          }}
        />
        Online Sekarang
      </span>
    );
  }

  if (!isoString) {
    return (
      <span
        style={{
          fontSize: "0.82rem",
          color: "var(--muted, #94a3b8)",
          fontStyle: "italic",
        }}
      >
        Belum pernah aktif
      </span>
    );
  }

  const d = new Date(isoString);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diffSec < 60)
    return <span style={{ color: "var(--adaptive-success-text, #15803d)", fontWeight: 600 }}>Baru saja</span>;
  if (diffSec < 3600)
    return <span>{Math.floor(diffSec / 60)} menit yang lalu</span>;
  if (diffSec < 86400)
    return <span>{Math.floor(diffSec / 3600)} jam yang lalu</span>;
  if (diffSec < 172800) {
    return <span>Kemarin, {formatClock(d)}</span>;
  }

  return <span title={formatDateTime(d)}>{formatDateTime(d)}</span>;
}

export function Participants({
  classId,
  writable,
  instructors,
  user,
  onInstructorsUpdated,
  cls,
  onKeyUpdated,
}: {
  classId: string;
  writable: boolean;
  instructors?: any[];
  user?: any;
  onInstructorsUpdated?: () => void;
  cls?: any;
  onKeyUpdated?: () => void;
}) {
  const members = useApi<any[]>(`/course-classes/${classId}/participants`);
  const [modal, setModal] = useState(""),
    [query, setQuery] = useState(""),
    [users, setUsers] = useState<any[]>([]),
    [selected, setSelected] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [searching, setSearching] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  const [collabModal, setCollabModal] = useState<"INSTRUCTOR" | "ASSISTANT" | false>(false);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [collabSearching, setCollabSearching] = useState(false);
  const [collabError, setCollabError] = useState<Error | null>(null);

  const primaryInstructor =
    instructors?.find((i: any) => i.isPrimary) || instructors?.[0];
  const primaryUserId = primaryInstructor?.userId || primaryInstructor?.user?.id;
  const isOwner = user?.role === "INSTRUCTOR" && user?.id === primaryUserId;
  const isAdmin = ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user?.role);
  const canManageInstructors = isOwner || isAdmin;

  const pagination = usePagination(members.data ?? [], 25);

  useEffect(() => {
    let active = true;
    const trimmed = query.trim();
    setSearchError(null);
    if (trimmed.length < 2) {
      setUsers([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api(`/users?q=${encodeURIComponent(trimmed)}&role=STUDENT`);
        if (active) setUsers(results);
      } catch (error) {
        if (active) {
          setSearchError(error as Error);
          setUsers([]);
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <>
      {writable && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            background: "var(--adaptive-accent-soft, rgba(99, 102, 241, 0.04))",
            border: "1px solid var(--adaptive-accent-border, rgba(99, 102, 241, 0.2))",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.95rem" }}>
              <Key size={18} color="var(--adaptive-accent-text, #4f46e5)" />
              <span>Kunci Masuk Pendaftaran Mandiri Mahasiswa</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
              {cls?.enrollmentKey
                ? "Bagikan kode di bawah kepada mahasiswa untuk mendaftar mandiri ke kelas ini:"
                : cls?.hasEnrollmentKey
                  ? "Kunci pendaftaran aktif dari versi sebelumnya (terenkripsi). Acak kode baru untuk melihat dan membagikannya."
                  : "Pendaftaran mandiri dinonaktifkan. Mahasiswa hanya dapat didaftarkan secara manual oleh dosen."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {cls?.enrollmentKey && (
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  padding: "5px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                }}
              >
                {cls.enrollmentKey}
              </span>
            )}
            {cls?.enrollmentKey && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(cls.enrollmentKey);
                  setKeyCopied(true);
                  setTimeout(() => setKeyCopied(false), 2000);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {keyCopied ? <Check size={16} color="var(--adaptive-success-fill, #22c55e)" /> : <Copy size={16} />}
                {keyCopied ? "Tersalin!" : "Salin Kode"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={regeneratingKey}
              onClick={async () => {
                const confirmed = await confirmAction(
                  cls?.enrollmentKey
                    ? `Acak kode pendaftaran baru untuk kelas ini? Kode lama (${cls.enrollmentKey}) tidak akan berlaku lagi.`
                    : "Generate kode pendaftaran mandiri baru untuk kelas ini?",
                );
                if (!confirmed) return;
                setRegeneratingKey(true);
                try {
                  const res = await api<any>(
                    `/course-classes/${classId}/regenerate-key`,
                    "POST",
                    {},
                  );
                  onKeyUpdated?.();
                  if (res?.enrollmentKey) {
                    navigator.clipboard.writeText(res.enrollmentKey);
                    setKeyCopied(true);
                    setTimeout(() => setKeyCopied(false), 2000);
                  }
                } catch (e: any) {
                  alert(e?.message || "Gagal mengacak kode pendaftaran.");
                } finally {
                  setRegeneratingKey(false);
                }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={15} />
              {cls?.enrollmentKey ? "Acak Kode Baru" : "Buat Kode Masuk"}
            </button>
          </div>
        </div>
      )}
      <div className="section-heading">
        <div>
          <h2>Dosen Pengampu &amp; Tim Pengajar</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.86rem", color: "var(--muted)" }}>
            Dosen pengampu utama, dosen kolaborator, dan asisten dosen (asdos) pada kelas ini.
          </p>
        </div>
        {canManageInstructors && (
          <div className="toolbar" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              className="secondary"
              onClick={() => {
                setCollabModal("INSTRUCTOR");
                setCollabQuery("");
                setCollabResults([]);
                setCollabError(null);
              }}
            >
              <Plus size={16} />
              Tambah Dosen Kolaborator
            </button>
            <button
              className="primary"
              onClick={() => {
                setCollabModal("ASSISTANT");
                setCollabQuery("");
                setCollabResults([]);
                setCollabError(null);
              }}
            >
              <Plus size={16} />
              Tambah Asisten Dosen (Asdos)
            </button>
          </div>
        )}
      </div>

      <div className="card table-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>Nama Dosen</th>
              <th>NIDN / NIP</th>
              <th>Peran di Kelas</th>
              {canManageInstructors && (
                <th style={{ textAlign: "right" }}>Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(instructors ?? []).map((inst: any) => {
              const instUser = inst.user || {};
              const isPrimary = Boolean(inst.isPrimary);
              const isAssistant =
                inst.role === "ASSISTANT" ||
                instUser.role === "ASSISTANT" ||
                (!isPrimary && instUser.role === "STUDENT");
              return (
                <tr key={inst.id || inst.userId || instUser.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: isPrimary
                            ? "var(--primary)"
                            : isAssistant
                            ? "var(--adaptive-primary-fill, #6366f1)"
                            : "var(--muted-soft, #f1f5f9)",
                          color: isPrimary
                            ? "var(--primary-foreground, #fff)"
                            : isAssistant
                            ? "#fff"
                            : "var(--foreground)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          flexShrink: 0,
                        }}
                      >
                        {(instUser.name?.[0] ?? (isAssistant ? "A" : "D")).toUpperCase()}
                      </span>
                      <div>
                        <strong>{instUser.name}</strong>
                        {instUser.email && (
                          <small
                            style={{ display: "block", color: "var(--muted)" }}
                          >
                            {instUser.email}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{instUser.identifierValue || "—"}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 14,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: isPrimary
                          ? "var(--adaptive-success-soft, #ecfdf5)"
                          : isAssistant
                          ? "var(--adaptive-primary-soft, #eef2ff)"
                          : "var(--adaptive-info-soft, #f0f9ff)",
                        color: isPrimary
                          ? "var(--adaptive-success-text, #15803d)"
                          : isAssistant
                          ? "var(--adaptive-primary-text, #4f46e5)"
                          : "var(--adaptive-info-text, #0369a1)",
                        border: `1px solid ${
                          isPrimary
                            ? "var(--adaptive-success-border, #bbf7d0)"
                            : isAssistant
                            ? "var(--adaptive-primary-border, #c7d2fe)"
                            : "var(--adaptive-info-border, #bae6fd)"
                        }`,
                      }}
                    >
                      {isPrimary
                        ? "Pengampu Utama (Owner)"
                        : isAssistant
                        ? "Asisten Dosen / Lab"
                        : "Dosen Kolaborator"}
                    </span>
                  </td>
                  {canManageInstructors && (
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 12,
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        {isAdmin && !isPrimary && !isAssistant && (
                          <button
                            type="button"
                            className="text-button"
                            style={{ color: "var(--primary)", fontWeight: 600 }}
                            onClick={async () => {
                              const confirmed = await confirmAction(
                                `Jadikan "${instUser.name}" sebagai Pengampu Utama kelas ini?`,
                              );
                              if (!confirmed) return;
                              const allIds = (instructors ?? []).map(
                                (i: any) => i.userId || i.user?.id,
                              );
                              const currentAssistantIds = (instructors ?? [])
                                .filter(
                                  (i: any) =>
                                    i.role === "ASSISTANT" ||
                                    i.user?.role === "ASSISTANT" ||
                                    i.user?.role === "STUDENT",
                                )
                                .map((i: any) => i.userId || i.user?.id);
                              await api(
                                `/course-classes/${classId}/instructors`,
                                "POST",
                                {
                                  userIds: allIds,
                                  assistantUserIds: currentAssistantIds,
                                  primaryUserId: inst.userId || instUser.id,
                                },
                              );
                              onInstructorsUpdated?.();
                            }}
                          >
                            Jadikan Utama
                          </button>
                        )}
                        {!isPrimary ? (
                          <button
                            type="button"
                            className="text-button"
                            style={{ color: "var(--destructive, #ef4444)" }}
                            onClick={async () => {
                              const labelRole = isAssistant ? "asisten dosen" : "dosen kolaborator";
                              const confirmed = await confirmAction(
                                `Keluarkan ${labelRole} "${instUser.name}" dari kelas ini?`,
                              );
                              if (!confirmed) return;
                              const remainingIds = (instructors ?? [])
                                .filter(
                                  (i: any) =>
                                    (i.userId || i.user?.id) !==
                                    (inst.userId || instUser.id),
                                )
                                .map((i: any) => i.userId || i.user?.id);
                              const remainingAssistantIds = (instructors ?? [])
                                .filter(
                                  (i: any) =>
                                    (i.userId || i.user?.id) !==
                                      (inst.userId || instUser.id) &&
                                    (i.role === "ASSISTANT" ||
                                      i.user?.role === "ASSISTANT" ||
                                      i.user?.role === "STUDENT"),
                                )
                                .map((i: any) => i.userId || i.user?.id);
                              await api(
                                `/course-classes/${classId}/instructors`,
                                "POST",
                                {
                                  userIds: remainingIds,
                                  assistantUserIds: remainingAssistantIds,
                                },
                              );
                              onInstructorsUpdated?.();
                            }}
                          >
                            Keluarkan
                          </button>
                        ) : isAdmin && (instructors ?? []).length > 1 ? (
                          <button
                            type="button"
                            className="text-button"
                            style={{ color: "var(--destructive, #ef4444)" }}
                            onClick={async () => {
                              const confirmed = await confirmAction(
                                `Keluarkan pengampu utama "${instUser.name}"? Peran pengampu utama akan dialihkan ke dosen berikutnya.`,
                              );
                              if (!confirmed) return;
                              const remainingIds = (instructors ?? [])
                                .filter(
                                  (i: any) =>
                                    (i.userId || i.user?.id) !==
                                    (inst.userId || instUser.id),
                                )
                                .map((i: any) => i.userId || i.user?.id);
                              const remainingAssistantIds = (instructors ?? [])
                                .filter(
                                  (i: any) =>
                                    (i.userId || i.user?.id) !==
                                      (inst.userId || instUser.id) &&
                                    (i.role === "ASSISTANT" ||
                                      i.user?.role === "ASSISTANT" ||
                                      i.user?.role === "STUDENT"),
                                )
                                .map((i: any) => i.userId || i.user?.id);
                              await api(
                                `/course-classes/${classId}/instructors`,
                                "POST",
                                {
                                  userIds: remainingIds,
                                  assistantUserIds: remainingAssistantIds,
                                  primaryUserId: remainingIds[0],
                                },
                              );
                              onInstructorsUpdated?.();
                            }}
                          >
                            Keluarkan
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.82rem",
                              color: "var(--muted)",
                            }}
                          >
                            Pemilik Kelas
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-heading">
        <h2>{t.participants}</h2>
        {writable && (
          <div className="toolbar">
            <button className="secondary" onClick={() => setModal("import")}>
              {t.import}
            </button>
            <button className="primary" onClick={() => setModal("add")}>
              <Plus size={16} />
              {t.enroll}
            </button>
          </div>
        )}
      </div>
      {members.error ? (
        <Notice error={members.error} />
      ) : members.loading && !members.data ? (
        <Loading />
      ) : (
        <div className="card table-wrap phone-record-table">
          <table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.studentNumber}</th>
                <th>{t.email}</th>
                <th>Terakhir Online</th>
                <th>{t.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagination.paginatedItems.map((m) => (
                <tr key={m.id}>
                  <td className="record-title">{m.user.name}</td>
                  <td data-label={t.studentNumber}>{m.user.identifierValue}</td>
                  <td data-label={t.email}>{m.user.email}</td>
                  <td
                    data-label="Terakhir online"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {formatLastActive(m.user.lastActiveAt, m.user.isOnline)}
                  </td>
                  <td data-label={t.status}>
                    <Badge value={m.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="record-actions">
                    {writable && (
                      <Action
                        className={m.isActive ? "danger" : "secondary"}
                        busyLabel={m.isActive ? "Menonaktifkan…" : "Mengaktifkan…"}
                        successMessage={m.isActive ? "Kepesertaan dinonaktifkan." : "Kepesertaan diaktifkan."}
                        run={async () => {
                          if (
                            m.isActive &&
                            !(await confirmAction(
                              "Nonaktifkan kepesertaan " + m.user.name + "?",
                            ))
                          )
                            return false;
                          await api(
                            `/course-classes/${classId}/participants`,
                            "POST",
                            { userId: m.userId, isActive: !m.isActive },
                          );
                          members.reload();
                        }}
                      >
                        {m.isActive ? t.removeEnrollment : t.activateEnrollment}
                      </Action>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.data && members.data.length > 0 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          )}
          {!members.data?.length && <Empty>{t.noParticipants}</Empty>}
        </div>
      )}
      {modal === "import" && (
        <ImportPanel
          classId={classId}
          initialKind="ENROLLMENT"
          onClose={() => {
            setModal("");
            members.reload();
          }}
        />
      )}
      {modal === "add" && (
        <Modal title={t.enroll} onClose={() => setModal("")}>
          <Form
            draftKey="participants"
            submitDisabled={!selected.length}
            draftValue={{ selected, users, query }}
            onRestoreDraft={(v) => {
              setSelected(v.selected);
              setUsers(v.users);
              setQuery(v.query);
            }}
            submitLabel={"Tambahkan peserta (" + selected.length + ")"}
            onSubmit={async () => {
              if (!selected.length)
                throw new Error("Pilih setidaknya satu mahasiswa.");
              await api(`/course-classes/${classId}/imports/commit`, "POST", {
                kind: "ENROLLMENT",
                rows: selected.map((u) => ({
                  values: {
                    identifierValue: u.identifierValue,
                    email: u.email,
                  },
                  override: true,
                })),
              });
              setSelected([]);
              members.reload();
              setModal("");
            }}
          >
            {searching && <p role="status">Mencari mahasiswa…</p>}
            {searchError && <Notice error={searchError} />}
            <div className="inline-form">
              <input
                aria-label={t.searchUsers}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = query.trim();
                    if (trimmed.length >= 2) {
                      setSearching(true);
                      api(`/users?q=${encodeURIComponent(trimmed)}&role=STUDENT`)
                        .then((res: any) => {
                          setUsers(res);
                          setSearchError(null);
                        })
                        .catch((err: any) => setSearchError(err as Error))
                        .finally(() => setSearching(false));
                    }
                  }
                }}
                placeholder={t.searchUsers}
              />
              <Action
                disabled={query.trim().length < 2 || searching}
                run={async () => {
                  const trimmed = query.trim();
                  if (trimmed.length < 2) return;
                  setSearching(true);
                  try {
                    const results = await api(`/users?q=${encodeURIComponent(trimmed)}&role=STUDENT`);
                    setUsers(results);
                    setSearchError(null);
                  } catch (err) {
                    setSearchError(err as Error);
                  } finally {
                    setSearching(false);
                  }
                }}
              >
                {t.searchLabel}
              </Action>
            </div>
            {query.trim().length > 0 && query.trim().length < 2 && (
              <small
                style={{
                  display: "block",
                  margin: "4px 0 8px",
                  color: "var(--muted)",
                  fontSize: "0.82rem",
                }}
              >
                Ketik minimal 2 karakter untuk mencari mahasiswa…
              </small>
            )}
            {users
              .filter(
                (u) =>
                  u.role === "STUDENT" &&
                  !members.data?.some((m) => m.userId === u.id && m.isActive),
              )
              .map((u) => (
                <div className="user-result" key={u.id}>
                  <span>
                    {u.name}
                    <small className="block">
                      {u.identifierValue}
                      {u.email ? ` · ${u.email}` : ""}
                    </small>
                  </span>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      aria-label={"Pilih " + u.name}
                      checked={selected.some((v) => v.id === u.id)}
                      onChange={(e) =>
                        setSelected((v) =>
                          e.target.checked
                            ? [...v, u]
                            : v.filter((x) => x.id !== u.id),
                        )
                      }
                    />
                    Pilih
                  </label>
                </div>
              ))}
            {(() => {
              const eligible = users.filter(
                (u) =>
                  u.role === "STUDENT" &&
                  !members.data?.some((m) => m.userId === u.id && m.isActive),
              );
              const alreadyEnrolled = users.filter(
                (u) =>
                  u.role === "STUDENT" &&
                  members.data?.some((m) => m.userId === u.id && m.isActive),
              );
              if (eligible.length > 0) return null;
              if (alreadyEnrolled.length > 0 && !searching) {
                return (
                  <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: 8 }}>
                    Semua mahasiswa yang cocok ({alreadyEnrolled.length}) sudah terdaftar sebagai peserta aktif di kelas ini.
                  </p>
                );
              }
              if (!searching && !searchError) {
                return (
                  <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: 8 }}>
                    {query.trim().length >= 2
                      ? `Tidak ada mahasiswa yang cocok dengan pencarian "${query.trim()}".`
                      : "Cari mahasiswa melalui nama, nomor mahasiswa, atau email, lalu pilih peserta yang akan ditambahkan."}
                  </p>
                );
              }
              return null;
            })()}
            {selected.length > 0 && <p>{selected.length} mahasiswa dipilih.</p>}
          </Form>
        </Modal>
      )}

      {collabModal && (
        <Modal
          title={
            collabModal === "ASSISTANT"
              ? "Tambah Asisten Dosen (Asdos)"
              : "Tambah Dosen Kolaborator"
          }
          onClose={() => {
            setCollabModal(false);
            setCollabQuery("");
            setCollabResults([]);
            setCollabError(null);
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
              {collabModal === "ASSISTANT"
                ? "Cari mahasiswa atau asisten untuk ditugaskan sebagai asisten dosen / praktikum di kelas ini."
                : "Cari dosen untuk ditambahkan sebagai mitra tim teaching (kolaborator) di kelas ini."}
            </p>
            {collabError && <Notice error={collabError} onClose={() => setCollabError(null)} />}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder={
                  collabModal === "ASSISTANT"
                    ? "Ketik nama atau NIM mahasiswa / asisten..."
                    : "Ketik nama atau NIDN dosen..."
                }
                value={collabQuery}
                onChange={(e) => setCollabQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = collabQuery.trim();
                    if (trimmed.length >= 2 && !collabSearching) {
                      setCollabSearching(true);
                      setCollabError(null);
                      const roleParam = collabModal === "INSTRUCTOR" ? "&role=INSTRUCTOR" : "";
                      api<any[]>(`/users?q=${encodeURIComponent(trimmed)}${roleParam}`)
                        .then((res) => {
                          const currentIds = (instructors ?? []).map((i: any) => i.userId || i.user?.id);
                          if (collabModal === "ASSISTANT") {
                            setCollabResults(
                              res.filter(
                                (u) =>
                                  (u.role === "STUDENT" || u.role === "ASSISTANT") &&
                                  !currentIds.includes(u.id),
                              ),
                            );
                          } else {
                            setCollabResults(
                              res.filter(
                                (u) => u.role === "INSTRUCTOR" && !currentIds.includes(u.id),
                              ),
                            );
                          }
                        })
                        .catch((err) => setCollabError(err as Error))
                        .finally(() => setCollabSearching(false));
                    }
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="secondary"
                disabled={collabQuery.trim().length < 2 || collabSearching}
                onClick={async () => {
                  const trimmed = collabQuery.trim();
                  if (trimmed.length < 2) return;
                  setCollabSearching(true);
                  setCollabError(null);
                  try {
                    const roleParam = collabModal === "INSTRUCTOR" ? "&role=INSTRUCTOR" : "";
                    const res = await api<any[]>(
                      `/users?q=${encodeURIComponent(trimmed)}${roleParam}`,
                    );
                    const currentIds = (instructors ?? []).map(
                      (i: any) => i.userId || i.user?.id,
                    );
                    if (collabModal === "ASSISTANT") {
                      setCollabResults(
                        res.filter(
                          (u) =>
                            (u.role === "STUDENT" || u.role === "ASSISTANT") &&
                            !currentIds.includes(u.id),
                        ),
                      );
                    } else {
                      setCollabResults(
                        res.filter(
                          (u) =>
                            u.role === "INSTRUCTOR" &&
                            !currentIds.includes(u.id),
                        ),
                      );
                    }
                  } catch (e) {
                    setCollabError(e as Error);
                  } finally {
                    setCollabSearching(false);
                  }
                }}
              >
                {collabSearching
                  ? "Mencari..."
                  : collabModal === "ASSISTANT"
                  ? "Cari Asisten"
                  : "Cari Dosen"}
              </button>
            </div>
            {collabResults.length > 0 ? (
              <div
                className="card"
                style={{
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {collabResults.map((collabUser) => (
                  <div
                    key={collabUser.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--adaptive-surface, #f8fafc)",
                    }}
                  >
                    <div>
                      <strong>{collabUser.name}</strong>
                      <small style={{ display: "block", color: "var(--muted)" }}>
                        {collabUser.identifierValue ||
                          (collabUser.role === "STUDENT"
                            ? "Mahasiswa"
                            : "Pengajar")}
                        {collabUser.email ? ` · ${collabUser.email}` : ""}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="secondary sm"
                      onClick={async () => {
                        try {
                          const currentIds = (instructors ?? []).map(
                            (i: any) => i.userId || i.user?.id,
                          );
                          const currentAssistantIds = (instructors ?? [])
                            .filter(
                              (i: any) =>
                                i.role === "ASSISTANT" ||
                                i.user?.role === "ASSISTANT" ||
                                i.user?.role === "STUDENT",
                            )
                            .map((i: any) => i.userId || i.user?.id);
                          const newAssistantIds =
                            collabModal === "ASSISTANT"
                              ? [...currentAssistantIds, collabUser.id]
                              : currentAssistantIds;
                          await api(
                            `/course-classes/${classId}/instructors`,
                            "POST",
                            {
                              userIds: [...currentIds, collabUser.id],
                              assistantUserIds: newAssistantIds,
                              primaryUserId,
                            },
                          );
                          setCollabModal(false);
                          setCollabQuery("");
                          setCollabResults([]);
                          onInstructorsUpdated?.();
                        } catch (e) {
                          setCollabError(e as Error);
                        }
                      }}
                    >
                      {collabModal === "ASSISTANT"
                        ? "+ Tambah Sebagai Asdos"
                        : "+ Jadikan Kolaborator"}
                    </button>
                  </div>
                ))}
              </div>
            ) : collabQuery.trim().length >= 2 && !collabSearching ? (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  textAlign: "center",
                  margin: "12px 0",
                }}
              >
                {collabModal === "ASSISTANT"
                  ? "Tidak ada mahasiswa atau asisten yang cocok dengan pencarian ini."
                  : "Tidak ada dosen yang cocok atau dosen sudah terdaftar di kelas ini."}
              </p>
            ) : null}
          </div>
        </Modal>
      )}
    </>
  );
}
