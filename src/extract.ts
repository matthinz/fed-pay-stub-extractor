import PDFParser, { Output } from "pdf2json";

export async function extractPdfText(filename: string): Promise<string[]> {
  const result: string[] = [];
  const output = await extract(filename);

  output.Pages.forEach((page) => {
    page.Texts.forEach((text) => {
      text.R.forEach((run) => {
        result.push(decodeURIComponent(run.T));
      });
    });
  });

  return result;
}

function extract(filename: string): Promise<Output> {
  return new Promise<Output>((resolve) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataReady", (data) => {
      resolve(data);
    });

    parser.loadPDF(filename);
  });
}
``;
