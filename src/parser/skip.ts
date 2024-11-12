import { ParserLeafFunction } from "./types";
import { namedFunction } from "./utils";

export function skip(
  pattern: string | RegExp | number,
  next: ParserLeafFunction,
): ParserLeafFunction {
  return namedFunction(
    `skip<${pattern};${next.name}>`,
    (token, prevToken, nextToken) => {
      if (typeof pattern === "string" && token.trim() === pattern.trim()) {
        return;
      } else if (pattern instanceof RegExp && pattern.test(token)) {
        return;
      } else if (typeof pattern === "number") {
        if (prevToken.length < pattern) {
          return;
        }
      }

      return next(token, prevToken, nextToken);
    },
  );
}
