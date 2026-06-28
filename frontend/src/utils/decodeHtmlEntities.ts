const HTML_ENTITY_MAP: Record<string, string> = {
  quot: '"',
  apos: "'",
  amp: "&",
  lt: "<",
  gt: ">",
  "#34": '"',
  "#39": "'",
  "#x22": '"',
  "#x27": "'",
};

const HTML_ENTITY_RE = /&(?:quot|apos|amp|lt|gt|#34|#39|#x22|#x27);/gi;

export function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value) return "";

  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    const next = decoded.replace(HTML_ENTITY_RE, (entity) => {
      const key = entity.slice(1, -1).toLowerCase();
      return HTML_ENTITY_MAP[key] ?? entity;
    });
    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
}
