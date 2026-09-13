import { confirmAction } from "./confirm";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getDraft, removeDraft, saveDraft } from "./drafts";

export const DraftUserContext = createContext<string>("");
const guards = new Set<() => boolean>();
export async function confirmUnsaved() {
  return (
    ![...guards].some((check) => check()) ||
    (await confirmAction(
      "Perubahan belum dikirim ke server. Tinggalkan halaman? Draft akan tetap tersedia di perangkat ini.",
    ))
  );
}
export function useNavigationGuard() {
  useEffect(() => {
    let previousHash = location.hash;
    let approvedHash = "";
    const before = (e: BeforeUnloadEvent) => {
      if ([...guards].some((check) => check())) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (link?.getAttribute("href")?.startsWith("#main-")) {
        e.preventDefault();
        const main = document.getElementById("main-content");
        main?.setAttribute("tabindex", "-1");
        main?.focus();
        main?.scrollIntoView();
        return;
      }
      if (
        link &&
        link.target !== "_blank" &&
        link.href !== location.href &&
        [...guards].some((check) => check())
      ) {
        e.preventDefault();
        e.stopPropagation();
        void confirmUnsaved().then((ok) => {
          if (ok) {
            approvedHash = new URL(link.href).hash;
            location.assign(link.href);
          }
        });
      } else if (link) approvedHash = new URL(link.href).hash;
    };
    const hash = (event: HashChangeEvent) => {
      if (
        location.hash !== approvedHash &&
        [...guards].some((check) => check())
      ) {
        const desired = location.hash;
        history.replaceState(
          null,
          "",
          location.pathname + location.search + previousHash,
        );
        event.stopImmediatePropagation();
        void confirmUnsaved().then((ok) => {
          if (ok) {
            approvedHash = desired;
            location.hash = desired;
          }
        });
      } else previousHash = location.hash;
      approvedHash = "";
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
}

export function useLocalDraft<T>(
  entity: string,
  value: T,
  restore: (value: T) => void,
  enabled = true,
) {
  const userId = useContext(DraftUserContext);
  const encoded = JSON.stringify(value);
  const [baseline, setBaseline] = useState(encoded);
  const [generation, setGeneration] = useState(0);
  const [recovery, setRecovery] = useState<any>(null);
  const [status, setStatus] = useState("Tersimpan");
  const [error, setError] = useState("");
  const dirty = enabled && encoded !== baseline;
  const latest = useRef({ value, dirty });
  latest.current = { value, dirty };
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const edited = useRef(false);
  const persist = (v: T) => {
    pending.current = pending.current
      .catch(() => {})
      .then(() => saveDraft(userId, entity, v));
    return pending.current;
  };
  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    getDraft(userId, entity)
      .then((d) => {
        if (active && d) setRecovery(d);
      })
      .catch(() => {
        if (active)
          setError(
            "Draft lokal tidak tersedia. Anda tetap dapat menyimpan ke server.",
          );
      });
    const check = () => latest.current.dirty;
    guards.add(check);
    return () => {
      active = false;
      guards.delete(check);
      if (latest.current.dirty)
        void persist(latest.current.value).catch(() => {});
    };
  }, [userId, entity, enabled]);
  useEffect(() => {
    if (dirty) edited.current = true;
    else if (edited.current && !recovery && userId) {
      edited.current = false;
      pending.current = pending.current
        .catch(() => {})
        .then(() => removeDraft(userId, entity));
      void pending.current.catch(() =>
        setError("Draft lama belum dapat dibersihkan."),
      );
      setStatus("Tersimpan");
    }
    if (!dirty || !userId || recovery) return;
    setStatus("Belum disimpan");
    const timer = setTimeout(() => {
      setStatus("Menyimpan lokal");
      persist(value)
        .then(() => {
          setStatus("Tersimpan lokal");
          setError("");
        })
        .catch(() =>
          setError(
            "Draft lokal gagal disimpan. Simpan perubahan ke server sebelum menutup halaman.",
          ),
        );
    }, 1000);
    return () => clearTimeout(timer);
  }, [encoded, dirty, userId, recovery, generation]);
  return {
    dirty,
    status,
    error,
    recovery,
    restore: () => {
      if (recovery) {
        restore(recovery.value);
        setRecovery(null);
        setStatus("Tersimpan lokal");
      }
    },
    discard: async () => {
      await pending.current.catch(() => {});
      await removeDraft(userId, entity);
      setRecovery(null);
    },
    saved: async () => {
      latest.current.dirty = false;
      setBaseline(JSON.stringify(latest.current.value));
      setGeneration((v) => v + 1);
      setStatus("Tersimpan");
      setRecovery(null);
      try {
        await pending.current.catch(() => {});
        await removeDraft(userId, entity);
      } catch {
        setError(
          "Data tersimpan di server, tetapi draft lokal belum dapat dibersihkan.",
        );
      }
    },
    markClean: () => {
      latest.current.dirty = false;
    },
  };
}

export function SaveStatus({
  draft,
  busy = false,
}: {
  draft: ReturnType<typeof useLocalDraft<any>>;
  busy?: boolean;
}) {
  const [failure, setFailure] = useState("");
  return (
    <div className="draft-status">
      {draft.recovery && (
        <div className="recovery-banner">
          <span>
            Draft ditemukan ·{" "}
            {new Date(draft.recovery.updatedAt).toLocaleString("id-ID")}
          </span>
          <button type="button" className="secondary" onClick={draft.restore}>
            Pulihkan draft
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void draft
                .discard()
                .catch(() =>
                  setFailure("Draft belum dapat dibuang. Coba lagi."),
                );
            }}
          >
            Buang draft
          </button>
        </div>
      )}
      <span
        role="status"
        aria-live="polite"
        className={draft.dirty ? "save-status dirty" : "save-status"}
      >
        {busy
          ? "Menyimpan ke server"
          : draft.recovery
            ? "Draft menunggu pemulihan"
            : draft.status}
        {draft.dirty && " · belum dikirim ke server"}
      </span>
      {(draft.error || failure) && (
        <p role="alert" className="error">
          {draft.error || failure}
        </p>
      )}
    </div>
  );
}
