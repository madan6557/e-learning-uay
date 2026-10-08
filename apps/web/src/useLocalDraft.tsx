import { formatDateTime } from "../../../packages/shared/src/time";
import { confirmAction } from "./confirm";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getDraft, removeDraft, saveDraft } from "./drafts";
import {
  navigate,
  notifyRoute,
  routeIndex,
  setNavigationConfirmation,
} from "./router";

export const DraftRouteContext = createContext<string>("");
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
    let acceptedIndex = routeIndex();
    let restoring = false;
    let approvedIndex: number | undefined;
    let pendingIndex: number | undefined;
    setNavigationConfirmation(confirmUnsaved);
    const routeChanged = () => {
      acceptedIndex = routeIndex();
    };
    const before = (e: BeforeUnloadEvent) => {
      if ([...guards].some((check) => check())) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
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
        !link ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const href = link.getAttribute("href") ?? "";
      const legacyRoute = href.startsWith("#/");
      let target: URL;
      try {
        target = new URL(
          legacyRoute ? href.slice(1) : link.href,
          location.origin,
        );
      } catch {
        return;
      }
      const appRoute =
        target.origin === location.origin &&
        (legacyRoute ||
          target.pathname === "/" ||
          /^\/(classes|courses|quizzes|assignments|catalog|profile|help|dashboard|agenda|grades|notifications|announcements)(\/|$)/.test(
            target.pathname,
          ));
      if (!appRoute) return;
      e.preventDefault();
      const destination = target.pathname + target.search + target.hash;
      navigate(destination);
    };
    const popstate = () => {
      const targetIndex = routeIndex();
      if (restoring) {
        restoring = false;
        const desired = pendingIndex!;
        pendingIndex = undefined;
        void confirmUnsaved().then((ok) => {
          if (ok) {
            approvedIndex = desired;
            history.go(desired - acceptedIndex);
          }
        });
        return;
      }
      if (
        approvedIndex === targetIndex ||
        ![...guards].some((check) => check())
      ) {
        approvedIndex = undefined;
        acceptedIndex = targetIndex;
        notifyRoute();
      } else if (targetIndex !== acceptedIndex) {
        pendingIndex = targetIndex;
        restoring = true;
        history.go(acceptedIndex - targetIndex);
      }
    };
    window.addEventListener("routechange", routeChanged);
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click);
    window.addEventListener("popstate", popstate);
    return () => {
      setNavigationConfirmation();
      window.removeEventListener("routechange", routeChanged);
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click);
      window.removeEventListener("popstate", popstate);
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
    initialize: (initial: T) => {
      latest.current = { value: initial, dirty: false };
      setBaseline(JSON.stringify(initial));
    },
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
            {formatDateTime(draft.recovery.updatedAt)}
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
