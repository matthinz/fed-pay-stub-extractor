import { captureAs } from "./capture-as";
import { date } from "./date";
import { ignore } from "./ignore";
import { invert } from "./invert";
import { monetaryAmount } from "./monetary-amount";
import { pick } from "./pick";
import { skip } from "./skip";
import { ParserLeaf } from "./types";

type ParseOptions = {
  tokens: string[];
  filename: string;
  log(...args: any[]): void;
  warn(...args: any[]): void;
};

const PARSE_TREE: Record<string, ParserLeaf> = {
  "Pay Date": captureAs("pay_date", date),
  "Gross Pay": captureAs("gross_pay", monetaryAmount),
  "Total Deductions": captureAs("total_deductions", invert(monetaryAmount)),
  "Net Pay": skip("$", captureAs("net_pay", monetaryAmount)),
  "Base Pay": captureAs("base_pay", pick(monetaryAmount, pickBasePay)),
  "Locality Pay": captureAs(
    "locality_pay",
    pick(monetaryAmount, pickLocalityPay),
  ),
  "Flexible Spending": {
    "": {
      Account: skip(1, captureAs("fsa", invert(monetaryAmount))),
    },
  },
  Dental: captureAs("dental", pick(invert(monetaryAmount), pickDental)),
  Vision: captureAs("vision", pick(invert(monetaryAmount), pickVision)),
  HSA: skip(1, captureAs("hsa", invert(monetaryAmount))),
  Medicare: skip(1, captureAs("medicare", invert(monetaryAmount))),
  HBI: skip(1, captureAs("hbi", invert(monetaryAmount))),
  "Retire FERS": {
    Employee: skip(1, captureAs("fers", invert(monetaryAmount))),
  },
  "Federal Tax": skip(1, captureAs("federal_tax", invert(monetaryAmount))),
  "GLI Basic Employee": skip(
    1,
    captureAs("gli_basic_employee", invert(monetaryAmount)),
  ),
  "GLI Opt C": skip(1, captureAs("gli_opt_c", invert(monetaryAmount))),
  OASDI: skip(1, captureAs("oasdi", invert(monetaryAmount))),
  "TSP Employee": skip(1, captureAs("tsp", invert(monetaryAmount))),
  "State Tax": skip(1, captureAs("state_tax", invert(monetaryAmount))),
  "BENEFITS PAID BY GOVT.": {
    Medicare: ignore,
  },
};

const DEDUCTIONS = [
  "fsa",
  "dental",
  "vision",
  "medicare",
  "hbi",
  "hsa",
  "fers",
  "federal_tax",
  "gli_basic_employee",
  "gli_opt_c",
  "oasdi",
  "tsp",
  "state_tax",
] as const;

export function parse({
  tokens,
  filename,
  log,
  warn,
}: ParseOptions): Record<string, string | number> {
  let stack: ParserLeaf[] = [];
  let current: ParserLeaf = { ...PARSE_TREE };
  let prev: string[] = [];
  let data: Record<string, string | number> = {};
  let done = false;

  tokens.forEach((token, index) => {
    if (done) {
      return;
    }

    token = token.trim();
    const nextToken = tokens[index + 1];

    log(token);

    if (typeof current === "string") {
      capture(current, token);
      return;
    }

    if (typeof current === "function") {
      const newData = current(token, prev, nextToken);
      if (newData != null) {
        capture(newData);
      } else {
        prev.push(token);
      }
      return;
    }

    // current is an object {}
    if (current[token] != null) {
      const next = current[token];
      delete current[token];
      push(next);
    } else {
      prev.push(token);
    }

    function capture(values: Record<string, string | number>): void;
    function capture(label: string, value: string | number): void;
    function capture(
      labelOrValues: Record<string, string | number> | string,
      value?: string | number,
    ): void {
      const values =
        typeof labelOrValues === "string"
          ? ({ [labelOrValues]: value } as Record<string, string | number>)
          : labelOrValues;

      Object.entries(values).forEach(([key, value]) => {
        log("capture", key, value);
      });

      data = { ...data, ...values };
      pop();
    }

    function pop() {
      while (true) {
        const next = stack.pop();
        if (next == null) {
          log("pop -- DONE");
          done = true;
          return;
        }

        if (typeof next === "object") {
          // If we are popping back up to an object and it doesn't have any
          // keys left to process, keep popping
          if (Object.keys(next).length === 0) {
            continue;
          }
        }

        current = next;
        prev = [];
        return;
      }
    }

    function push(leaf: ParserLeaf) {
      log("push", leaf);
      stack.push(current);

      if (typeof leaf === "object" && leaf) {
        // We will mutate this object as we process keys,
        // so make a copy
        leaf = { ...leaf };
      }

      current = leaf;
      prev = [];
    }
  });

  const totalDeductions = DEDUCTIONS.reduce<number>((total, type) => {
    const typeAsString = type.toString();
    if (typeof data[typeAsString] === "number") {
      total += data[typeAsString];
    }
    return total;
  }, 0);

  if (typeof data["gross_pay"] !== "number") {
    throw new Error("gross_pay not found");
  }

  if (typeof data["net_pay"] !== "number") {
    throw new Error("net_pay not found");
  }

  const calculatedNet = data["gross_pay"] + totalDeductions;

  data["calculated_total_deductions"] = totalDeductions;
  data["calculated_net_pay"] = calculatedNet;

  const diff = calculatedNet - data["net_pay"];

  if (calculatedNet !== data["net_pay"]) {
    warn(
      `${filename}: Calculated net (${calculatedNet}) differs from statement net (${data["net_pay"]}) by ${diff}`,
    );
  }

  return data;
}

function pickBasePay(values: number[]) {
  const greaterThanZeroValues = values.filter((v) => v > 0);
  return greaterThanZeroValues[1];
}

function pickDental(values: number[]) {
  const nonZeroValues = values.filter((v) => v !== 0);

  switch (nonZeroValues.length) {
    case 2:
      return nonZeroValues[0];
    default:
      return 0;
  }
}

function pickLocalityPay(values: number[]) {
  // Columns for locality pay:
  // Rate Adjusted, ADJ Hours, Hours, Current, YTD

  const HOURS_IN_A_PAY_PERIOD = 24 * 14;

  const likelyMonetaryValues = values.filter(
    (v) => v > 0 && v / 100 > HOURS_IN_A_PAY_PERIOD,
  );

  switch (likelyMonetaryValues.length) {
    case 3:
      return likelyMonetaryValues[1];
    case 2:
    case 1:
      return likelyMonetaryValues[0];
    default:
      throw new Error(
        `Unexpected number of likely monetary values: ${likelyMonetaryValues.join(",")}`,
      );
  }
}

function pickVision(values: number[]) {
  const nonZeroValues = values.filter((v) => v !== 0);

  switch (nonZeroValues.length) {
    // YTD only
    case 1:
      return 0;

    // Current, YTD
    case 2:
      return nonZeroValues[0];

    // Adjusted, Current, YTD
    case 3:
      return nonZeroValues[1];

    default:
      throw new Error(`Invalid values for vision: ${nonZeroValues.join(",")}`);
  }
}
