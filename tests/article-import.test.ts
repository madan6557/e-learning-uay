import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  articleBlockTypes,
  articleSchema,
} from "../packages/shared/src/article.js";
import {
  importArticle,
  articleImportMaxBytes,
} from "../apps/web/src/articleImport.js";
import type { ContentBlock } from "../packages/shared/src/domain.js";

const paragraph = (id: string, text: string): ContentBlock => ({
  id,
  type: "paragraph",
  data: { text },
});
const input = (blocks: unknown[], extra = {}) =>
  JSON.stringify({ title: "Artikel AI", blocks, ...extra });

test("downloadable example imports into a new draft using all supported AI blocks", async () => {
  const text = await readFile(
    new URL(
      "../apps/web/public/authoring/template-artikel.json",
      import.meta.url,
    ),
    "utf8",
  );
  const source = articleSchema.parse(JSON.parse(text));
  assert.deepEqual(
    new Set(source.blocks.map((block) => block.type)),
    new Set(articleBlockTypes),
  );
  const original = { title: "", blocks: [paragraph("empty", "")] };
  const first = importArticle(text, original);
  const second = importArticle(text, original);
  assert.equal(first.title, source.title);
  assert.equal(first.blocks.length, source.blocks.length);
  assert.equal(original.blocks.length, 1);
  const firstIds = new Set(first.blocks.map((block) => block.id));
  assert.equal(firstIds.size, first.blocks.length);
  assert.ok(second.blocks.every((block) => !firstIds.has(block.id)));
  const code = first.blocks.find((block) => block.type === "code_snippet")!;
  assert.ok(code.type === "code_snippet" && code.data.code.includes("\n"));
  const math = first.blocks.find((block) => block.type === "math_latex")!;
  assert.ok(
    math.type === "math_latex" && math.data.expression.includes("\\text"),
  );
});

test("import preserves an existing title and content and resets imported checklist progress", () => {
  const current = {
    title: "Judul dosen",
    blocks: [paragraph("existing", "Isi yang sudah ditulis")],
  };
  const text = input([
    {
      id: "check",
      type: "checklist",
      data: { items: [{ id: "item", text: "Latihan", checked: true }] },
    },
  ]);
  const next = importArticle(text, current);
  assert.equal(next.title, current.title);
  assert.strictEqual(next.blocks[0], current.blocks[0]);
  const checklist = next.blocks[1];
  assert.ok(checklist.type === "checklist");
  assert.notEqual(checklist.id, "check");
  assert.notEqual(checklist.data.items[0].id, "item");
  assert.equal(checklist.data.items[0].checked, false);
});

test("invalid AI output is rejected without changing the draft", () => {
  const current = {
    title: "Asli",
    blocks: [paragraph("original", "Isi asli")],
  };
  const snapshot = structuredClone(current);
  const invalid = [
    '```json\n{"title":"Artikel","blocks":[]}\n```',
    input([]),
    input([paragraph("a", "A")], { isVisible: true }),
    input([{ id: "h", type: "heading", data: { text: "Judul", level: 4 } }]),
    input([paragraph("a", "A"), paragraph("a", "B")]),
    input([paragraph("", "A")]),
    input([
      {
        id: "file",
        type: "image",
        data: { fileObjectId: "invented", altText: "Foto" },
      },
    ]),
    input([
      {
        id: "file",
        type: "file_attachment",
        data: { fileObjectId: "invented", displayName: "Dokumen" },
      },
    ]),
    input([
      {
        id: "embed",
        type: "embed_media",
        data: { url: "https://example.com/", title: "Media" },
      },
    ]),
    input([
      {
        id: "check",
        type: "checklist",
        data: {
          items: [
            { id: "duplicate", text: "A", checked: false },
            { id: "duplicate", text: "B", checked: false },
          ],
        },
      },
    ]),
  ];
  for (const text of invalid) {
    assert.throws(() => importArticle(text, current));
    assert.deepEqual(current, snapshot);
  }
});

test("import enforces the UTF-8 size limit and combined block limit", () => {
  const text = input([
    paragraph("large", "é".repeat(articleImportMaxBytes / 2)),
  ]);
  assert.throws(() => importArticle(text, { title: "", blocks: [] }), /1 MB/);
  const blocks = Array.from({ length: 300 }, (_, i) =>
    paragraph(`p-${i}`, "Texte"),
  );
  const textOne = input([paragraph("new", "Nouveau")]);
  assert.throws(
    () => importArticle(textOne, { title: "Cours", blocks }),
    /300 blok/,
  );
  assert.equal(
    importArticle(textOne, { title: "", blocks: blocks.slice(0, 299) }).blocks
      .length,
    300,
  );
  assert.throws(() =>
    importArticle(input([...blocks, paragraph("extra", "Texte")]), {
      title: "",
      blocks: [],
    }),
  );
});
