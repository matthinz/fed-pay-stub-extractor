import path from "node:path";
import { parseArgs } from "node:util";
import { extractPdfText } from "./extract";
import { parse } from "./parser";
import { ParserLeaf } from "./parser/types";

const COLUMN_WEIGHTS: Record<string, number> = {
  pay_date: -50,
  gross_pay: -40,
  total_deductions: -30,
  net_pay: -25,
  base_pay: -20,
  locality_pay: -10,
  filename: 100,
};

run(process.argv.slice(2)).catch((err) => {
  process.exitCode = 1;
  console.error(err);
});

async function run(args: string[]) {
  const options = parseOptions(args);

  const results = await options.files.reduce<
    Promise<Record<string, string | number>[]>
  >(
    (promise, file) =>
      promise.then(async (results) => {
        const tokens = await extractPdfText(file);
        const data = await parse({
          tokens,
          filename: path.basename(file),
          onCalculatedNetDifference(expected, actual) {
            console.error(
              "%s: Calculated net (%s) differs from parsed net (%s) by %s",
              path.basename(file),
              (actual / 100.0).toFixed(2),
              (expected / 100.0).toFixed(2),
              (Math.abs(actual - expected) / 100.0).toFixed(2),
            );
          },
          onCapture(_leaf, key, value) {
            if (options.verbosity > 0) {
              console.error("CAPTURE: %s = %s", key, value);
            }
          },
          onPush(leaf, prevLeaf) {
            if (options.verbosity > 0) {
              console.error("PUSH: %s", JSON.stringify(leafToString(leaf)));
            }
          },
          onPop(leaf, prevLeaf) {
            if (options.verbosity > 0) {
              console.error("POP: %s", leafToString(leaf));
            }
          },
          onToken(token) {
            if (options.verbosity > 1) {
              console.error("TOKEN: %s", token);
            }
          },
        });
        results.push({
          ...data,
          filename: path.basename(file),
        } as Record<string, string | number>);
        return results;
      }),
    Promise.resolve([]),
  );

  if (options.jsonOutput) {
    outputJson(results);
  }

  if (options.csvOutput) {
    outputCsv(results);
  }
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

type ProgramOptions = {
  files: string[];
  jsonOutput: boolean;
  csvOutput: boolean;
  verbosity: number;
};

function parseOptions(args: string[]): ProgramOptions {
  const {
    values,
    positionals: files,
    tokens,
  } = parseArgs({
    allowPositionals: true,
    options: {
      csv: { type: "boolean" },
      json: { type: "boolean" },
      verbose: { type: "boolean" },
    },
    strict: true,
    tokens: true,
  });

  let jsonOutput = false;
  let csvOutput = false;
  const verbosity = tokens
    .filter((t) => t.kind === "option")
    .filter((t) => t.name === "verbose").length;

  if (values.csv && values.json) {
    throw new Error("Can't specify both --csv and --json");
  } else if (values.csv == null && values.json == null) {
    csvOutput = true;
  } else {
    jsonOutput = !!values.json;
    csvOutput = !!values.csv;
  }

  return { files, jsonOutput, csvOutput, verbosity };
}

function leafToString(leaf: ParserLeaf): string {
  if (typeof leaf === "function") {
    return leaf.name;
  } else if (typeof leaf === "string") {
    return leaf;
  } else {
    return `{ ${Object.keys(leaf).join(", ")} }`;
  }
}
