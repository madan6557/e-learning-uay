import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
}: {
  classId: string;
  writable: boolean;
}) {
  const members = useApi<any[]>(`/course-classes/${classId}/participants`);
  const [modal, setModal] = useState(""),
    [query, setQuery] = useState(""),
    [users, setUsers] = useState<any[]>([]),
    [selected, setSelected] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [searching, setSearching] = useState(false);

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
        const results = await api(`/users?q=${encodeURIComponent(trimmed)}`);
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
                placeholder={t.searchUsers}
              />
              <Action
                run={async () =>
                  setUsers(await api(`/users?q=${encodeURIComponent(query)}`))
                }
              >
                {t.searchLabel}
              </Action>
            </div>
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
                    <small className="block">{u.identifierValue}</small>
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
            {!users.length && !searching && !searchError && (
              <p>
                {query.trim().length >= 2
                  ? "Tidak ada mahasiswa yang cocok dengan pencarian ini."
                  : "Cari mahasiswa melalui nama, nomor mahasiswa, atau email, lalu pilih peserta yang akan ditambahkan."}
              </p>
            )}
            {selected.length > 0 && <p>{selected.length} mahasiswa dipilih.</p>}
          </Form>
        </Modal>
      )}
    </>
  );
}
