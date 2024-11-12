export function namedFunction<TFunc extends Function>(
  name: string,
  func: TFunc,
): TFunc {
  Object.defineProperty(func, "name", {
    get() {
      return name;
    },
  });
  return func;
}
