export const STOP = Symbol.for("STOP_PROCESSING");

export type StopSentinel = typeof STOP;

export type ParserLeafFunction = (
  token: string,
  prevTokens: string[],
  nextToken?: string | undefined,
) => Record<string, string | number> | void;

export type ValueParser<T extends string | number = string | number> = (
  token: string,
  prevTokens: string[],
  nextTokens?: string | undefined,
) => T | StopSentinel | undefined;

export type ParserLeaf =
  | { [key: string]: ParserLeaf }
  | string
  | ParserLeafFunction;
