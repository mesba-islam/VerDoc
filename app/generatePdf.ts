import jsPDF from 'jspdf'

export const generateSummaryPDF = (summary: string, filename: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Document Summary', pageWidth / 2, 20, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString();
  doc.text(`Generated on: ${date}`, pageWidth - 15, 30, { align: 'right' });
  
  // Add summary content
  doc.setFontSize(12);
  const margin = 20;
  const lineHeight = 8;
  let yPosition = 40;

  summary.split('\n').forEach(line => {
    const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
    lines.forEach((textLine: string) => {
      if (yPosition > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(textLine, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += lineHeight * 0.5; // Add extra space between paragraphs
  });

  doc.save(filename);
};