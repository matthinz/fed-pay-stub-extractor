import { ValueParser } from "./types";
import { namedFunction } from "./utils";

export function invert(next: ValueParser<number>): ValueParser<number> {
  return namedFunction(
    `invert<${next.name}>`,
    (token, prevTokens, nextToken) => {
      const value = next(token, prevTokens, nextToken);

      if (typeof value !== "number") {
        return value;
      }

      if (value === 0) {
        return 0;
      }

      return value * -1;
    },
  );
}
