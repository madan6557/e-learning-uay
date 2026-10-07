import guide from "./helpGuide.json";

export type HelpRole = "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "STUDENT" | "RECTOR";
export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  roles: HelpRole[];
  keywords: string[];
  steps?: string[];
  content: string;
  related?: string[];
  location?: string;
  preparation?: string;
  result?: string;
  controls?: { label: string; value: string; effect: string }[];
  notes?: string[];
  figure?: { src: string; alt: string; caption: string };
  gradeScales?: boolean;
};

export const helpRoles: HelpRole[] = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT", "RECTOR"];
export const helpArticles: HelpArticle[] = [
  ...guide.tutorials.map(article => ({ ...article, roles: article.roles as HelpRole[] })),
  {
    id: "skala", title: "Konversi nilai", category: "Konversi Nilai", roles: helpRoles.filter(role => role !== "RECTOR"),
    summary: "Batas skor, huruf mutu, dan indeks untuk setiap versi skala nilai.",
    keywords: ["nilai", "huruf", "bobot", "2026.1", "2024.1"],
    content: "Gunakan versi kebijakan pada kelas. Nilai dihitung dari nilai kategori dikalikan bobotnya. Total bobot harus 100 persen. Nilai akhir yang sudah diterbitkan mempertahankan versi kebijakannya.",
    gradeScales: true,
  },
  ...guide.faqs.map(article => ({ ...article, roles: article.roles as HelpRole[] })),
];

/** Unknown or absent roles never inherit a student's guide. */
export function helpArticlesForRole(role: unknown): HelpArticle[] {
  return typeof role === "string" && helpRoles.includes(role as HelpRole)
    ? helpArticles.filter(article => article.roles.includes(role as HelpRole))
    : [];
}

export default helpArticles;
