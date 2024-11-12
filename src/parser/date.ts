export function date(token: string): string | undefined {
  const date = new Date(token);

  if (isNaN(date as unknown as number)) {
    return;
  }

  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}-${day}`;
}
