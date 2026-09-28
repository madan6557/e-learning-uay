export function slugify(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function classSlug(cls: any) {
  if (cls.slug) return cls.slug;
  return [cls.course?.code, cls.course?.title, cls.name, cls.academicYear]
    .map((part) => slugify(String(part ?? "")))
    .filter(Boolean)
    .join("-");
}

export function classPath(cls: any) {
  return `/classes/${classSlug(cls)}`;
}

export function itemSlug(items: any[], item: any) {
  if (item.slug) return item.slug;
  const base = slugify(item.title) || "konten";
  const peers = items.filter((candidate) => slugify(candidate.title) === base);
  if (peers.length < 2) return base;
  return `${base}-${peers.findIndex((candidate) => candidate.id === item.id) + 1}`;
}

export function contentPath(
  cls: any,
  kind: "resources" | "quizzes" | "assignments",
  item: any,
  siblings: any[],
) {
  return `${classPath(cls)}/${kind}/${itemSlug(siblings, item)}`;
}
