export interface BrandProps {
  home?: string;
  collapsed?: boolean;
}

export function Brand({
  home = "/",
  collapsed = false,
}: BrandProps) {
  return (
    <a className="brand" href={home} aria-label="UAY E-Learning beranda">
      <span className="brand-mark" aria-hidden="true">
        <picture>
          <source srcSet="/uay-logo.webp" type="image/webp" />
          <img
            src="/uay-logo.png"
            alt="Logo UAY"
            className="brand-logo-img"
            width="26"
            height="26"
            loading="eager"
            decoding="async"
          />
        </picture>
      </span>
      {!collapsed && <span className="brand-name">E-Learning UAY</span>}
    </a>
  );
}
