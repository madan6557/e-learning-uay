export function formatContentHtml(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  if (/<(p|div|ul|ol|h[1-6]|blockquote|table|hr)\b/i.test(raw)) {
    return raw;
  }
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function stripHtmlTags(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
