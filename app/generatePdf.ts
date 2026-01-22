import jsPDF from "jspdf";

const cleanTitleText = (raw: string) =>
  raw
    .replace(/\*\*/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
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
  date: string
) => {
  const doc = new jsPDF();
  const fullTitle = cleanTitleText(title) || "Summary";
  const shortTitle = toShortTitle(title);
  const filename = `${shortTitle.replace(/[^a-zA-Z0-9]/g, " ").trim() || "summary"}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const lineHeight = 7;

  // Build blocks from content (preserve headings and bullets)
  let lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
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

  // Title with wrapping (keep full title visible)
  const headerLines = (() => {
    const testDoc = new jsPDF();
    testDoc.setFont("helvetica", "bold");
    testDoc.setFontSize(18);
    const lines = doc.splitTextToSize(fullTitle, pageWidth - margin * 2);
    return lines;
  })();

  const headerFontSize = headerLines.length > 1 ? Math.max(14, 18 - (headerLines.length - 1) * 2) : 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(headerFontSize);

  let cursorY = 18;
  const headerLineHeight = headerFontSize * 0.7;
  headerLines.forEach((line) => {
    doc.text(line, pageWidth / 2, cursorY, { align: "center" });
    cursorY += headerLineHeight;
  });

  // Date and accent
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
    const match = text.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
    if (!match) return false;
    const [, rawLabel, rest] = match;
    const label = rawLabel.trim() + (rest ? " " : "");
    const labelWidth = doc.getTextWidth(label);
    const available = Math.max(10, maxWidth - labelWidth - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    ensureSpace(lineHeight);
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(rest, available);
    wrapped.forEach((t, idx) => {
      if (idx === 0) {
        doc.text(t, x + labelWidth + 2, y);
      } else {
        ensureSpace(lineHeight);
        doc.text(t, x, y);
      }
      y += lineHeight;
    });
    y += 2;
    return true;
  };

  const renderParagraph = (text: string, bold = false) => {
    if (renderLabelledLine(text, margin, pageWidth - margin * 2)) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(12);
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
    wrapped.forEach((t) => {
      ensureSpace(lineHeight);
      doc.text(t, margin, y);
      y += lineHeight;
    });
    y += 2;
  };

  const renderBullet = (text: string) => {
    const indent = margin + 8;
    const maxWidth = pageWidth - indent - margin;

    if (renderLabelledLine(text, indent, maxWidth)) {
      // add bullet marker aligned with first line
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
    wrapped.forEach((t, idx) => {
      if (y > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(t, indent, y);
      y += lineHeight;
      if (idx < wrapped.length - 1 && y > maxY) {
        doc.addPage();
        y = margin;
      }
    });
    y += 2;
  };

  lines.forEach((line, idx) => {
    const isFirstLine = idx === 0;
    const isHeading = /^\*\*(.+?)\*\*/.test(line) && !line.startsWith("- ");
    const isBullet = line.startsWith("- ");
    const cleaned = line.replace(/^\-\s*/, "").replace(/\*\*/g, "").trim();

    if (isFirstLine) {
      renderParagraph(cleaned, true);
      return;
    }

    if (isHeading) {
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
