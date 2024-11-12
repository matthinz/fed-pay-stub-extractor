import path from "node:path";
import { extractPdfText } from "./extract";
import { parse } from "./parser";

const COLUMN_WEIGHTS: Record<string, number> = {
  filename: -100,
  pay_date: -50,
  gross_pay: -40,
  total_deductions: -30,
  base_pay: -20,
  locality_pay: -10,
};

run(process.argv.slice(2)).catch((err) => {
  process.exitCode = 1;
  console.error(err);
});

async function run(args: string[]) {
  let outputResults = outputCsv;

  const results = await args.reduce<Promise<Record<string, string | number>[]>>(
    (promise, arg) =>
      promise.then(async (results) => {
        if (arg === "--json") {
          outputResults = outputJson;
        } else if (arg === "--csv") {
          outputResults = outputCsv;
        } else {
          const tokens = await extractPdfText(arg);
          const data = await parse({
            tokens,
            filename: path.basename(arg),
            log(...args: any[]) {
              // console.error(...args);
            },
            warn(...args: any[]) {
              console.error(...args);
            },
          });
          results.push({
            ...data,
            filename: path.basename(arg),
          } as Record<string, string | number>);
        }
        return results;
      }),
    Promise.resolve([]),
  );

  outputResults(results);
}

function outputCsv(results: Record<string, string | number>[]) {
  const columns = new Set<string>(["filename"]);
  results.forEach((data) => {
    Object.keys(data).forEach((column) => {
      columns.add(column);
    });
  });

  // Remove calculated columns from CSV output because they are duplicative

  const orderedColumns = Array.from(columns).filter(
    (column) => !/^calculated_/.test(column),
  );

  orderedColumns.sort((a, b) => {
    const aWeight = COLUMN_WEIGHTS[a] ?? 0;
    const bWeight = COLUMN_WEIGHTS[b] ?? 0;

    if (aWeight < bWeight) {
      return -1;
    } else if (aWeight > bWeight) {
      return 1;
    } else if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  });

  console.log(orderedColumns.join(","));

  results.forEach((data) => {
    const row = orderedColumns.map((column) => {
      const value = data[column];

      if (value == null) {
        return "";
      }

      if (typeof value == "number") {
        return (value / 100).toFixed(2);
      }

      return String(value);
    });

    console.log(row.join(","));
  });
}

function outputJson(results: Record<string, string | number>[]) {
  console.log(JSON.stringify(results, null, 2));
}
