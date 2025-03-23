import jsPDF from "jspdf";

export const generateSummaryPDF = (
  title: string,
  content: string,
  date: string
) => {
  const doc = new jsPDF();
  const filename = `${title.replace(/[^a-zA-Z0-9]/g, " ")}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Clean and process content
  const processedContent = content
    .split("\n")
    .slice(2) // Remove title and empty line
    .join("\n")
    .replace(/\*\*/g, "") // Remove markdown bold
    .trim();

  const cleanTitle = title
    .replace(/\*\*/g, "") // Remove bold markers
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");

  // Add title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(cleanTitle, pageWidth / 2, 20, { align: "center" });

  // Add date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  // const date = new Date().toLocaleDateString();
  doc.text(`Generated on: ${date}`, pageWidth - 15, 30, { align: "right" });

  // Add summary content
  doc.setFontSize(12);
  const margin = 20;
  const lineHeight = 8;
  let yPosition = 40;
  doc.setTextColor(0);

  processedContent.split("\n").forEach((line) => {
    const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
    lines.forEach((textLine: string) => {
      if (yPosition > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(textLine, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += lineHeight * 0.5;
  });

  doc.save(filename);
};
