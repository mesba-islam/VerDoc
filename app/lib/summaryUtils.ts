export const generateTitleFromSummary = (summary: string) => {
    const lines = summary.split('\n').map(line => line.trim());
    const title = lines[0] || "Document Summary";
    const content = lines.slice(2).join('\n').trim();
    return { title, content };
  };