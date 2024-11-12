import { STOP, StopSentinel, ValueParser } from "./types";

/**
 * Accumulates tokens that can be parsed by <parser>. Once it sees that the
 * next one will not be parseable, passes parsed values to <handler> to
 * select a result.
 */
export function pick<T extends string | number>(
  parser: ValueParser<T>,
  handler: (values: T[]) => T | StopSentinel | undefined,
): ValueParser<T> {
  return (token, prevTokens, nextToken) => {
    let stopSentinels = 0;
    let nulls = 0;
    const values: T[] = [];

    [...prevTokens, token].forEach((raw) => {
      if (stopSentinels > 0) {
        return;
      }

      const value = parser(raw, []);

      if (value === STOP) {
        stopSentinels += 1;
      } else if (value == null) {
        nulls += 1;
      } else {
        values.push(value);
      }
    });

    if (stopSentinels > 0) {
      return STOP;
    }

    if (nulls > 0) {
      return handler(values);
    }

    let nextTokenWillFail = false;

    if (nextToken == null) {
      // We are out of things
      nextTokenWillFail = true;
    } else {
      const parsedNext = parser(nextToken, [...prevTokens, token]);
      nextTokenWillFail = parsedNext == null || parsedNext === STOP;
    }

    if (nextTokenWillFail) {
      return handler(values);
    }
  };
}
