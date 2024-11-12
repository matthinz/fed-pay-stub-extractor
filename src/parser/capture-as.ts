import { ParserLeafFunction, STOP, ValueParser } from "./types";
import { namedFunction } from "./utils";

export function captureAs(
  label: string,
  parser: ValueParser,
): ParserLeafFunction {
  return namedFunction(
    `label<${parser.name} as ${label}>`,

    (token, prevTokens, nextToken) => {
      const value = parser(token, prevTokens, nextToken);
      if (value == null || value === STOP) {
        return;
      }
      return { [label]: value };
    },
  );
}
