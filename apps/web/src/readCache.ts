// Session-local only: never persist private responses to localStorage.
export class ReadCache {
  private values = new Map<string, { value: unknown; expires: number }>();
  private pending = new Map<string, Promise<any>>();
  private generation = 0;

  peek<T>(key: string): T | undefined {
    const entry = this.values.get(key);
    if (entry && entry.expires > Date.now()) return entry.value as T;
    this.values.delete(key);
    return undefined;
  }

  clear() {
    this.generation++;
    this.values.clear();
    this.pending.clear();
  }

  evict(key?: string) {
    if (key) {
      this.values.delete(key);
      this.pending.delete(key);
    } else {
      this.clear();
    }
  }

  load<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    const value = this.peek<T>(key);
    if (value !== undefined) return Promise.resolve(value);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const generation = this.generation;
    const request = loader()
      .then((value) => {
        if (generation === this.generation && ttl > 0) {
          if (this.values.size >= 100)
            this.values.delete(this.values.keys().next().value!);
          this.values.set(key, { value, expires: Date.now() + ttl });
        }
        return value;
      })
      .finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }
}

export const readCache = new ReadCache();
export function readTtl(path: string) {
  if (path === "/auth/config") return 60000;
  // Assessment state, identities, signed file URLs and audit logs stay live.
  if (/^\/course-classes(?:\?summary=true)?$/.test(path) || path === "/courses")
    return 30000;
  if (
    /^\/course-classes\/[^/?]+(?:\/(?:participants|gradebook|grade-categories|question-banks))?$/.test(
      path,
    )
  )
    return 15000;
  if (path.startsWith("/notifications")) return 10000;
  return 0;
}
