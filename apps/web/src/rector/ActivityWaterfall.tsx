import { useState } from "react";
import { ChevronRight, LogIn, LogOut, Search, X } from "lucide-react";
import {
  dailySessionSegments,
  dayWindow,
  sessionChartCalendar,
} from "./sessionTimeline";
import type {
  Activity,
  LoginSession,
} from "../../../../packages/shared/src/rector";
import { formatClock as clock, localDateInput } from "../../../../packages/shared/src/time";

const axisClock = (at: string | number) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
const date = (at: string | number) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(at));
const localDay = localDateInput;
export const categoryLabel: Record<string, string> = {
  LOGIN: "Masuk",
  LOGOUT: "Keluar",
  AKSES: "Membuka kelas",
  MATERI: "Materi",
  ASESMEN: "Tugas & kuis",
  PENILAIAN: "Penilaian",
  PUBLIKASI: "Penerbitan nilai",
  KOREKSI: "Koreksi nilai",
  PENGUMUMAN: "Pengumuman",
  KELAS: "Pembelajaran",
};
export function sessionLength(s: LoginSession) {
  if (!s.logoutAt) return "Belum dapat dihitung";
  const minutes = Math.round(
    (Date.parse(s.logoutAt) - Date.parse(s.loginAt)) / 60000,
  );
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
    : `${minutes} menit`;
}
function Ruler({
  start,
  end,
  fullDay = false,
}: {
  start: number;
  end: number;
  fullDay?: boolean;
}) {
  const labels = ["00.00", "06.00", "12.00", "18.00", "24.00"];
  const ticks = labels.map((label, i) => {
    const at = fullDay
      ? i === 4 ? end : Date.parse(`${localDateInput(start)}T${String(i * 6).padStart(2, "0")}:00:00`)
      : start + ((end - start) * i) / 4;
    return { at, label: fullDay ? label : axisClock(at) };
  });
  return (
    <div className="time-ruler" aria-hidden="true">
      {ticks.map((tick, i) => (
        <span key={i} style={{ left: `${(tick.at - start) / (end - start) * 100}%` }}>
          {tick.label}
        </span>
      ))}
    </div>
  );
}
function Span({
  at,
  until,
  start,
  end,
  kind,
  label,
}: {
  at: string;
  until: string | null;
  start: number;
  end: number;
  kind: string;
  label: string;
}) {
  const left = Math.max(
    0,
    Math.min(100, ((Date.parse(at) - start) / (end - start)) * 100),
  );
  const right = Math.max(
    left,
    Math.min(100, ((Date.parse(until ?? at) - start) / (end - start)) * 100),
  );
  return (
    <div className="time-track">
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`time-span ${kind} ${until ? "" : "point"}`}
        style={{
          left: `${left}%`,
          width: until ? `${right - left}%` : undefined,
        }}
      />
    </div>
  );
}
export function SessionChart({
  sessions,
  onLecturer,
  from,
  to,
}: {
  sessions: LoginSession[];
  onLecturer: (id: string, sessionId: string) => void;
  from?: string;
  to?: string;
}) {
  const { days, defaultDay, latestSessionDay } = sessionChartCalendar(
    sessions,
    from,
    to,
  );
  const [chosenDay, setDay] = useState("");
  const day = days.includes(chosenDay) ? chosenDay : defaultDay;
  const rows = day ? dailySessionSegments(sessions, day) : [];
  const { start, end } = day ? dayWindow(day) : { start: 0, end: 86400000 };
  return (
    <section className="panel session-chart">
      <div className="section-title">
        <div>
          <h3>Rentang login sampai logout</h3>
          <p>
            00.00–24.00 · waktu lokal perangkat. Klik sesi untuk melihat aktivitas dosen.
          </p>
        </div>
        {days.length > 0 && (
          <label>
            Tanggal sesi
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {date(d + "T00:00:00")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {day ? (
        <div className="waterfall-scroll">
          <div className="session-plot">
            <div className="session-axis">
              <span>Dosen · waktu masuk / keluar</span>
              <Ruler start={start} end={end} fullDay />
            </div>
            {rows.map((segment) => {
              const s = segment.session;
              return (
                <button
                  className="session-plot-row"
                  key={s.id}
                  onClick={() => onLecturer(s.lecturerId, s.id)}
                >
                  <span>
                    <strong>{s.lecturerName}</strong>
                    <small>
                      {clock(segment.at)} –{" "}
                      {s.logoutAt
                        ? segment.endsAtDayBoundary
                          ? "24.00"
                          : clock(s.logoutAt)
                        : "logout belum tercatat"}{" "}
                    </small>
                    {segment.startsBeforeDay && (
                      <small className="session-continuation">
                        Lanjutan dari {date(s.loginAt)}
                      </small>
                    )}
                    {segment.continuesAfterDay && (
                      <small className="session-continuation">
                        Berlanjut ke hari berikutnya
                      </small>
                    )}
                    {!s.logoutAt && (
                      <small>
                        Terakhir tercatat: {date(s.lastObservedAt)},{" "}
                        {clock(s.lastObservedAt)}
                      </small>
                    )}
                  </span>
                  <Span
                    at={segment.at}
                    until={segment.until}
                    start={start}
                    end={end}
                    kind={s.logoutAt ? "connection" : "unknown"}
                    label={`${s.lecturerName}: masuk ${date(s.loginAt)} ${clock(s.loginAt)}, ${s.logoutAt ? `keluar ${date(s.logoutAt)} ${clock(s.logoutAt)}` : "logout belum tercatat"}`}
                  />
                </button>
              );
            })}
            {!rows.length && (
              <p className="empty-line session-empty">
                Tidak ada sesi login tercatat pada {date(day + "T00:00:00")}.
                {latestSessionDay && latestSessionDay !== day && (
                  <button type="button" onClick={() => setDay(latestSessionDay)}>
                    Lihat sesi terakhir: {date(latestSessionDay + "T00:00:00")}
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="empty-line">Belum ada sesi dalam periode ini.</p>
      )}
      <p className="quiet-note">
        Garis menunjukkan waktu terhubung, bukan durasi kerja. Garis
        putus-putus: logout belum tercatat. Sesi lintas hari ditampilkan pada
        setiap tanggal yang dilewati.
      </p>
    </section>
  );
}
export function ActivityWaterfall({
  sessions,
  events,
  classes,
  selectedSession,
  onSession,
  onClass,
}: {
  sessions: LoginSession[];
  events: Activity[];
  classes: { id: string; title: string }[];
  selectedSession: string;
  onSession: (id: string) => void;
  onClass: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [expanded, setExpanded] = useState("");
  // Default to the most recent session. Selection is stored in the URL.
  const session = sessions.find((s) => s.id === selectedSession) ?? sessions[0];
  const all = events
    .filter((a) => session && a.sessionId === session.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const shown = all.filter(
    (a) =>
      (!kind || a.category === kind) &&
      `${a.action} ${a.objectName} ${classes.find((c) => c.id === a.classId)?.title ?? ""}`
        .toLocaleLowerCase("id")
        .includes(search.toLocaleLowerCase("id")),
  );
  const start = session ? Date.parse(session.loginAt) : 0;
  const end = session
    ? Math.max(
        start + 60000,
        Date.parse(session.logoutAt ?? session.lastObservedAt),
      )
    : 1;
  const selected = shown.find((a) => a.id === expanded);
  const academicCount = all.filter(
    (a) => !["LOGIN", "LOGOUT", "AKSES"].includes(a.category),
  ).length;
  return (
    <section className="panel activity-waterfall">
      <div className="section-title">
        <div>
          <h3>Aktivitas selama sesi</h3>
          <p>Urutan tindakan dan waktunya. Klik baris untuk membuka rincian.</p>
        </div>
        <span className="badge blue">{sessions.length} sesi dalam periode</span>
      </div>
      {session ? (
        <>
          <label className="session-picker">
            Pilih sesi login
            <select
              value={session.id}
              onChange={(e) => {
                onSession(e.target.value);
                setExpanded("");
              }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {date(s.loginAt)} · {clock(s.loginAt)} –{" "}
                  {s.logoutAt
                    ? clock(s.logoutAt)
                    : "logout belum tercatat"}{" "}
                  ·{" "}
                  {
                    events.filter(
                      (a) =>
                        a.sessionId === s.id &&
                        !["LOGIN", "LOGOUT", "AKSES"].includes(a.category),
                    ).length
                  }{" "}
                  aktivitas akademik
                </option>
              ))}
            </select>
          </label>
          <div className="session-summary">
            <span>
              <LogIn size={17} />
              <small>Login</small>
              <strong>{clock(session.loginAt)}</strong>
            </span>
            <span>
              <LogOut size={17} />
              <small>Logout</small>
              <strong>
                {session.logoutAt
                  ? `${clock(session.logoutAt)}${localDay(session.logoutAt) !== localDay(session.loginAt) ? " · " + date(session.logoutAt) : ""}`
                  : "Belum tercatat"}
              </strong>
            </span>
            <span>
              <small>Waktu terhubung</small>
              <strong>{sessionLength(session)}</strong>
            </span>
            <span>
              <small>Aktivitas akademik</small>
              <strong>{academicCount} tindakan</strong>
            </span>
          </div>
          {!session.logoutAt && (
            <p className="quiet-note unknown-session-note">
              Logout belum tercatat. Garis putus-putus ditampilkan sampai
              aktivitas terakhir yang tercatat, {clock(session.lastObservedAt)}.
            </p>
          )}
          <div className="waterfall-toolbar">
            <label className="waterfall-search">
              <Search size={17} />
              <input
                aria-label="Cari aktivitas dalam sesi"
                placeholder="Cari aktivitas atau kelas…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Jenis aktivitas
              <select
                aria-label="Jenis aktivitas"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="">Semua aktivitas</option>
                {[...new Set(all.map((a) => a.category))].map((k) => (
                  <option key={k} value={k}>
                    {categoryLabel[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="waterfall-scroll">
            <table className="waterfall-table">
              <thead>
                <tr>
                  <th>Aktivitas</th>
                  <th>Kelas</th>
                  <th>Waktu lokal</th>
                  <th className="waterfall-time-heading">
                    <Ruler start={start} end={end} />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="connection-row">
                  <td>Rentang sesi</td>
                  <td colSpan={2}>
                    {session.logoutAt
                      ? "Login → logout tercatat"
                      : "Sampai aktivitas terakhir tercatat"}
                  </td>
                  <td>
                    <Span
                      at={session.loginAt}
                      until={session.logoutAt ?? session.lastObservedAt}
                      start={start}
                      end={end}
                      kind={session.logoutAt ? "connection" : "unknown"}
                      label="Rentang sesi terhubung"
                    />
                  </td>
                </tr>
                {shown.map((a) => (
                  <tr
                    key={a.id}
                    className={selected?.id === a.id ? "selected-event" : ""}
                    onClick={() => setExpanded(expanded === a.id ? "" : a.id)}
                  >
                    <td>
                      <button
                        className="activity-row-button"
                        aria-expanded={selected?.id === a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded(expanded === a.id ? "" : a.id);
                        }}
                      >
                        <i
                          className={`activity-color color-${a.category.toLowerCase()}`}
                        />
                        <span>
                          <strong>{a.action}</strong>
                          <small>{categoryLabel[a.category]}</small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                    <td>
                      {classes.find((c) => c.id === a.classId)?.title ?? "—"}
                    </td>
                    <td className="event-clock">
                      {clock(a.at)}
                      {a.completedAt && <small>– {clock(a.completedAt)}</small>}
                    </td>
                    <td>
                      <Span
                        at={a.at}
                        until={a.completedAt ?? null}
                        start={start}
                        end={end}
                        kind={a.category.toLowerCase()}
                        label={`${a.action}, ${clock(a.at)}${a.completedAt ? " sampai " + clock(a.completedAt) : ""}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-waterfall">
            <Ruler start={start} end={end} />
            <Span
              at={session.loginAt}
              until={session.logoutAt ?? session.lastObservedAt}
              start={start}
              end={end}
              kind={session.logoutAt ? "connection" : "unknown"}
              label="Rentang sesi terhubung"
            />
            {shown.map((a) => (
              <button
                key={a.id}
                className="mobile-event"
                aria-expanded={selected?.id === a.id}
                onClick={() => setExpanded(expanded === a.id ? "" : a.id)}
              >
                <span>
                  <strong>{a.action}</strong>
                  <small>
                    {classes.find((c) => c.id === a.classId)?.title ??
                      categoryLabel[a.category]}{" "}
                    · {clock(a.at)}
                  </small>
                </span>
                <Span
                  at={a.at}
                  until={a.completedAt ?? null}
                  start={start}
                  end={end}
                  kind={a.category.toLowerCase()}
                  label={`${a.action}, ${clock(a.at)}`}
                />
              </button>
            ))}
          </div>
          {!shown.length && (
            <p className="empty-line">
              Tidak ada aktivitas yang cocok dengan pencarian ini.
            </p>
          )}
          {selected && (
            <aside className="event-detail" aria-label="Rincian aktivitas">
              <button
                className="close-detail"
                aria-label="Tutup rincian aktivitas"
                onClick={() => setExpanded("")}
              >
                <X size={16} />
              </button>
              <span className="badge blue">
                {categoryLabel[selected.category]}
              </span>
              <h4>{selected.action}</h4>
              <dl>
                <div>
                  <dt>Objek</dt>
                  <dd>{selected.objectName}</dd>
                </div>
                <div>
                  <dt>Waktu tercatat</dt>
                  <dd>
                    {date(selected.at)}, {clock(selected.at)}
                  </dd>
                </div>
                <div>
                  <dt>Selesai tercatat</dt>
                  <dd>
                    {selected.completedAt
                      ? clock(selected.completedAt)
                      : "Hanya waktu kejadian tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Pelaku</dt>
                  <dd>{selected.actorName}</dd>
                </div>
              </dl>
              {selected.classId && (
                <button onClick={() => onClass(selected.classId!)}>
                  Buka kelas{" "}
                  {classes.find((c) => c.id === selected.classId)?.title}
                  <ChevronRight size={15} />
                </button>
              )}
            </aside>
          )}
          <div className="waterfall-legend">
            <span>
              <i className="color-materi" />
              Materi & pembelajaran
            </span>
            <span>
              <i className="color-penilaian" />
              Penilaian
            </span>
            <span>
              <i className="color-publikasi" />
              Penerbitan & koreksi
            </span>
            <span>
              <i className="color-login" />
              Masuk / keluar
            </span>
          </div>
          <p className="quiet-note">
            Panjang batang aktivitas memakai waktu mulai dan selesai yang
            tercatat. Titik berarti hanya waktu kejadian tersedia. Waktu
            terhubung bukan durasi kerja.
          </p>
        </>
      ) : (
        <p className="empty-line">
          Belum ada sesi login tercatat untuk dosen ini dalam periode yang
          dipilih.
        </p>
      )}
      <details className="secondary-detail">
        <summary>
          Seluruh riwayat aktivitas dalam periode ({events.length})
        </summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu lokal</th>
                <th>Aktivitas</th>
                <th>Kelas / objek</th>
              </tr>
            </thead>
            <tbody>
              {events.map((a) => (
                <tr key={a.id}>
                  <td>
                    {date(a.at)}
                    <small>{clock(a.at)}</small>
                  </td>
                  <td>{a.action}</td>
                  <td>
                    {classes.find((c) => c.id === a.classId)?.title ??
                      a.objectName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
