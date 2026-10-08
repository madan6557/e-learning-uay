import {
  forwardRef,
  useState,
  useEffect,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronRight } from "lucide-react";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>(
  (
    { variant = "secondary", className = "", type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={`${variant} ${className}`}
      {...props}
    />
  ),
);
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?"
  );
}
export function Avatar({
  name,
  large = false,
  imageUrl,
  userId,
}: {
  name: string;
  large?: boolean;
  imageUrl?: string | null;
  userId?: string;
}) {
  const [photo, setPhoto] = useState<string | null>(imageUrl ?? null);

  useEffect(() => {
    if (imageUrl !== undefined) {
      setPhoto(imageUrl);
      return;
    }
    if (userId) {
      try {
        const stored = localStorage.getItem(`user_photo_${userId}`);
        if (stored) setPhoto(stored);
      } catch {}
    }
    const handler = () => {
      if (userId) {
        try {
          const stored = localStorage.getItem(`user_photo_${userId}`);
          setPhoto(stored ?? null);
        } catch {}
      }
    };
    window.addEventListener("user-photo-changed", handler);
    return () => window.removeEventListener("user-photo-changed", handler);
  }, [imageUrl, userId]);

  return (
    <span
      aria-hidden="true"
      className={large ? "large-avatar" : "avatar"}
      style={{ overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {photo ? (
        <img
          src={photo}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
export function UserChip({ user, role }: { user: any; role: string }) {
  return (
    <a
      href="/profile"
      className="user-chip"
      aria-label={`Profil akun ${user.name}`}
    >
      <Avatar name={user.name} userId={user.id} />
      <span className="user-chip-details">
        <span className="user-chip-name">{user.name}</span>
        <small className="user-chip-role">{role}</small>
      </span>
    </a>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Jejak navigasi" className="breadcrumbs">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="filter-tabs" role="group" aria-label="Tampilan">
      {items.map((item) => (
        <Button
          key={item.id}
          aria-pressed={item.id === value}
          className={item.id === value ? "selected" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
export function DataTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export { usePagination } from "./hooks/usePagination";
export { Pagination, type PaginationProps } from "./components/ui/Pagination";

