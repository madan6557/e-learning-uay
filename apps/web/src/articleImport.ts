import { articleSchema } from "../../../packages/shared/src/article";
import type { ContentBlock } from "../../../packages/shared/src/domain";

export const articleImportMaxBytes = 1024 * 1024;
export function importArticle(
  text: string,
  current: { title: string; blocks: ContentBlock[] },
): { title: string; blocks: ContentBlock[] } {
  if (new TextEncoder().encode(text).length > articleImportMaxBytes)
    throw new Error("Ukuran JSON maksimal 1 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "JSON tidak valid. Tempel hanya JSON, tanpa pembatas ``` atau penjelasan AI.",
    );
  }
  const parsed = articleSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Format artikel tidak sesuai pada ${issue.path.join(".") || "artikel"}: ${issue.message}`,
    );
  }
  const article = parsed.data;
  const empty =
    current.blocks.length === 1 &&
    current.blocks[0].type === "paragraph" &&
    !current.blocks[0].data.text.trim();
  const existing = empty ? [] : current.blocks;
  if (existing.length + article.blocks.length > 300)
    throw new Error(
      "Total isi materi maksimal 300 blok. Kurangi isi atau impor ke materi baru.",
    );
  const imported = article.blocks.map(
    (block): ContentBlock =>
      ({
        ...block,
        id: crypto.randomUUID(),
        ...(block.type === "checklist"
          ? {
              data: {
                items: block.data.items.map((item) => ({
                  ...item,
                  id: crypto.randomUUID(),
                  checked: false,
                })),
              },
            }
          : {}),
      }) as ContentBlock,
  );
  return {
    title: current.title.trim() ? current.title : article.title,
    blocks: [...existing, ...imported],
  };
}
