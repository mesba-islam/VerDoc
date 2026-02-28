import jsPDF from "jspdf";

const METADATA_LINE_REGEX =
  /^(template name|template description|internal prompt|instruction logic|example output|a\.|b\.|c\.|d\.)\b/i;
const EVIDENCE_FIELD_LINE_REGEX =
  /^(claim|timestamp|evidence|contradictions or tension|related context)\s*:/i;

type GeneratePdfOptions = {
  templateKey?: string;
};

const cleanTitleText = (raw: string) =>
  raw
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*{2,}/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeContentLine = (raw: string) =>
  raw
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*{3}(.+?)\*{3}$/, "$1")
    .replace(/^\*{2}(.+?)\*{2}$/, "$1")
    .replace(/\*{2,}/g, "")
    .replace(/^`{1,3}(.*)`{1,3}$/, "$1")
    .trim();

const toShortTitle = (raw: string) => {
  const clean = cleanTitleText(raw);
  const parts = clean.split(" ").slice(0, 7);
  const short = parts.join(" ");
  return short || "Summary";
};

export const generateSummaryPDF = (
  title: string,
  content: string,
  date: string,
  options?: GeneratePdfOptions,
) => {
  const isEvidenceTemplate = options?.templateKey === "evidence-leveraging-intelligence";
  const doc = new jsPDF();
  const sanitizedTitle = cleanTitleText(title) || "Summary";
  const fullTitle = isEvidenceTemplate && EVIDENCE_FIELD_LINE_REGEX.test(sanitizedTitle)
    ? "Evidence Leveraging Intelligence"
    : sanitizedTitle;
  const shortTitle = toShortTitle(title);
  const filename = `${shortTitle.replace(/[^a-zA-Z0-9]/g, " ").trim() || "summary"}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const lineHeight = 7;

  const lines = content
    .split("\n")
    .map((line) => normalizeContentLine(line))
    .filter(Boolean)
    .filter((line) => !/^[-*]{3,}$/.test(line))
    .filter((line) => !METADATA_LINE_REGEX.test(line.replace(/^[-*]\s+/, "")));

  const fullTitleLower = fullTitle.toLowerCase();
  while (lines.length) {
    const top = cleanTitleText(lines[0]).toLowerCase();
    if (!top) break;
    const isSame = top === fullTitleLower;
    const contains = fullTitleLower.includes(top) || top.includes(fullTitleLower);
    if (isSame || contains) {
      lines.shift();
      continue;
    }
    break;
  }

  const headerLines = (() => {
    const testDoc = new jsPDF();
    testDoc.setFont("helvetica", "bold");
    testDoc.setFontSize(18);
    return doc.splitTextToSize(fullTitle, pageWidth - margin * 2);
  })();

  const headerFontSize = headerLines.length > 1
    ? Math.max(14, 18 - (headerLines.length - 1) * 2)
    : 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(headerFontSize);

  let cursorY = 18;
  const headerLineHeight = headerFontSize * 0.7;
  headerLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, cursorY, { align: "center" });
    cursorY += headerLineHeight;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated on: ${date}`, pageWidth - margin, cursorY + 4, { align: "right" });
  doc.setDrawColor(80, 190, 230);
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY + 8, pageWidth - margin, cursorY + 8);

  let y = cursorY + 16;
  const maxY = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      doc.addPage();
      y = margin;
    }
  };

  const renderLabelledLine = (text: string, x: number, maxWidth: number) => {
    const match = text.match(/^([A-Za-z][A-Za-z0-9 /&()'-]{1,80}:)\s*(.*)$/);
    if (!match) return false;

    const [, label, rest] = match;
    const labelText = label.trim() + (rest ? " " : "");
    const labelWidth = doc.getTextWidth(labelText);
    const available = Math.max(10, maxWidth - labelWidth - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    ensureSpace(lineHeight);
    doc.text(labelText, x, y);

    if (!rest) {
      y += lineHeight + (isEvidenceTemplate ? 1 : 2);
      return true;
    }

    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(rest, available);
    wrapped.forEach((part: string, idx: number) => {
      if (idx === 0) {
        doc.text(part, x + labelWidth + 2, y);
      } else {
        ensureSpace(lineHeight);
        doc.text(part, x, y);
      }
      y += lineHeight;
    });
    y += isEvidenceTemplate ? 1 : 2;
    return true;
  };

  const renderParagraph = (text: string, bold = false) => {
    if (renderLabelledLine(text, margin, pageWidth - margin * 2)) return;

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(12);
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
    wrapped.forEach((part: string) => {
      ensureSpace(lineHeight);
      doc.text(part, margin, y);
      y += lineHeight;
    });
    y += isEvidenceTemplate ? 1 : 2;
  };

  const renderBullet = (text: string) => {
    const indent = margin + 8;
    const maxWidth = pageWidth - indent - margin;

    if (renderLabelledLine(text, indent, maxWidth)) {
      doc.setFillColor(77, 208, 225);
      doc.setDrawColor(77, 208, 225);
      doc.circle(margin, y - lineHeight - 2, 1.6, "F");
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const wrapped = doc.splitTextToSize(text, maxWidth);
    ensureSpace(lineHeight);
    doc.setFillColor(77, 208, 225);
    doc.setDrawColor(77, 208, 225);
    doc.circle(margin, y - 2, 1.6, "F");
    wrapped.forEach((part: string, idx: number) => {
      if (y > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(part, indent, y);
      y += lineHeight;
      if (idx < wrapped.length - 1 && y > maxY) {
        doc.addPage();
        y = margin;
      }
    });
    y += isEvidenceTemplate ? 1 : 2;
  };

  lines.forEach((line, idx) => {
    const isFirstLine = idx === 0;
    const isBullet = /^([-*]\s+|\d+\.\s+)/.test(line);
    const cleaned = line.replace(/^([-*]\s+|\d+\.\s+)/, "").trim();
    const isEvidenceFieldLine = EVIDENCE_FIELD_LINE_REGEX.test(cleaned);
    const isHeading = !isBullet && !isEvidenceFieldLine && (
      isEvidenceTemplate
        ? /^((item|entry|finding)\s+\d+|evidence trail|findings)\s*:$/i.test(cleaned)
        : /:$/.test(cleaned)
    );

    if (!cleaned) return;

    if ((!isEvidenceTemplate && isFirstLine) || isHeading) {
      renderParagraph(cleaned, true);
      return;
    }

    if (isBullet) {
      renderBullet(cleaned);
      return;
    }

    renderParagraph(cleaned, false);
  });

  doc.save(filename);
};
