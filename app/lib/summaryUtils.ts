const METADATA_LINE_REGEX =
  /^(template name|template description|internal prompt|instruction logic|example output|a\.|b\.|c\.|d\.)\b/i;
const EVIDENCE_FIELD_LINE_REGEX =
  /^(claim|timestamp|evidence|contradictions or tension|related context)\s*:/i;

const TEMPLATE_FALLBACK_TITLES: Record<string, string> = {
  'evidence-leveraging-intelligence': 'Evidence Leveraging Intelligence',
};

const normalizeLine = (line: string) =>
  line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\*{3}(.+?)\*{3}$/, '$1')
    .replace(/^\*{2}(.+?)\*{2}$/, '$1')
    .replace(/\*{2,}/g, '')
    .replace(/^\-\s+(?=template name|template description|internal prompt|instruction logic|example output)/i, '')
    .trim();

export const generateTitleFromSummary = (summary: string) => {
  const lines = summary
    .split('\n')
    .map((line) => normalizeLine(line))
    .filter((line) => Boolean(line) && line !== '```');

  const filtered = lines.filter((line) => !METADATA_LINE_REGEX.test(line.replace(/^\-\s+/, '')));

  return {
    ...resolveTitleAndContent(filtered),
  };
};

export const generateTitleFromSummaryByTemplate = (
  summary: string,
  templateKey?: string | null,
) => {
  const lines = summary
    .split('\n')
    .map((line) => normalizeLine(line))
    .filter((line) => Boolean(line) && line !== '```');

  const filtered = lines.filter((line) => !METADATA_LINE_REGEX.test(line.replace(/^\-\s+/, '')));
  const resolved = resolveTitleAndContent(filtered, templateKey ?? undefined);

  return resolved;
};

const resolveTitleAndContent = (filteredLines: string[], templateKey?: string) => {
  const titleCandidate = filteredLines.find((line) => {
    if (/^(\d+\.\s+|-\s+)/.test(line)) return false;
    if (/^(item|entry|finding)\s+\d+\s*:?\s*$/i.test(line)) return false;
    if (line.includes('|')) return false;
    if (EVIDENCE_FIELD_LINE_REGEX.test(line)) return false;
    return true;
  });

  const fallbackTitle = (templateKey && TEMPLATE_FALLBACK_TITLES[templateKey]) || 'Document Summary';
  const title = titleCandidate?.replace(/:$/, '').trim() || fallbackTitle;

  const contentLines = [...filteredLines];
  if (contentLines[0] && contentLines[0].replace(/:$/, '').trim() === title) {
    contentLines.shift();
  }

  const content = contentLines.join('\n').trim();
  return { title, content };
};
