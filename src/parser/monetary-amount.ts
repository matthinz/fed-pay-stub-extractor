export function monetaryAmount(token: string): number | undefined {
  const value = parseFloat(token.replace(/[,\$]/, ""));

  if (isNaN(value)) {
    return;
  }

  return Math.round(value * 100);
}
