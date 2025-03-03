import PDFDocument from "pdfkit";
import blobStream from "blob-stream";

export const generatePDF = async (text: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = doc.pipe(blobStream());

    // Add content
    doc.fontSize(20).text("Executive Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(text);

    doc.end();
    
    stream.on("finish", () => {
      resolve(stream.toBlob("application/pdf"));
    });
    
    stream.on("error", reject);
  });
};