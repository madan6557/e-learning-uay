export {
  classPath,
  classSlug,
  contentPath,
  itemSlug,
  slugify,
} from "../../../packages/shared/src/urls.js";
let confirmNavigation: (() => Promise<boolean>) | undefined;
export function setNavigationConfirmation(confirm?: () => Promise<boolean>) {
  confirmNavigation = confirm;
}
export const routeIndex = () => Number(history.state?.uayRouteIndex ?? 0);
export function notifyRoute() {
  window.dispatchEvent(new Event("routechange"));
}
export function routeFromLocation() {
  const legacy = location.hash.startsWith("#/") ? location.hash.slice(1) : null;
  const url =
    legacy && legacy.startsWith("/") && !legacy.startsWith("//")
      ? legacy
      : location.pathname + location.search;
  history.replaceState(
    { ...history.state, uayRouteIndex: routeIndex() },
    "",
    url,
  );
  return url;
}
export function navigate(path: string, replace = false) {
  const route = path.startsWith("#/") ? path.slice(1) : path;
  const url = new URL(route, location.origin);
  if (url.origin !== location.origin) return;
  const destination = url.pathname + url.search + url.hash;
  const commit = () => {
    if (
      !replace &&
      destination === location.pathname + location.search + location.hash
    )
      return;
    const state = {
      ...history.state,
      uayRouteIndex: routeIndex() + (replace ? 0 : 1),
    };
    if (replace) history.replaceState(state, "", destination);
    else history.pushState(state, "", destination);
    notifyRoute();
  };
  if (!replace && confirmNavigation)
    void confirmNavigation().then((ok) => {
      if (ok) commit();
    });
  else commit();
}
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
