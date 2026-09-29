import { z } from "zod";
import { blockSchema } from "./domain.js";

// Media is added through the editor so uploaded files and embed permissions
// are resolved in the current class, rather than invented by an AI.
export const articleBlockTypes = [
  "paragraph",
  "heading",
  "code_snippet",
  "math_latex",
  "callout",
  "checklist",
  "table",
  "divider",
] as const;
export const articleSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    blocks: z.array(blockSchema).min(1).max(300),
  })
  .strict()
  .superRefine((article, ctx) => {
    const ids = new Set<string>();
    const checkId = (id: string, path: (string | number)[]) => {
      if (!id.trim() || ids.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: "ID harus terisi dan unik.",
        });
      }
      ids.add(id);
    };
    article.blocks.forEach((block, index) => {
      checkId(block.id, ["blocks", index, "id"]);
      if (!(articleBlockTypes as readonly string[]).includes(block.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "type"],
          message:
            "Tambahkan gambar, lampiran, dan media melalui editor setelah impor.",
        });
      }
      if (block.type === "checklist") {
        block.data.items.forEach((item, itemIndex) =>
          checkId(item.id, ["blocks", index, "data", "items", itemIndex, "id"]),
        );
      }
    });
  });
export type Article = z.infer<typeof articleSchema>;
