// Apply the saved theme before CSS and React render, including under the
// production Content Security Policy, which allows same-origin scripts.
(() => {
  let preference = "system";
  try {
    preference = localStorage.getItem("uay-theme") || "system";
  } catch {}
  const dark =
    preference === "dark" ||
    (preference !== "light" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", !!dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#0f1724" : "#183d32");
})();
