let counter = 0;

export function unique(prefix: string): string {
  counter++;
  return `${prefix}-${String(Date.now()).slice(6)}-${counter}`;
}

export function randomEmail(domain = "e2e-test.com"): string {
  return `user-${unique("u")}@${domain}`;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomCurrency(): string {
  const currencies = ["USD", "EUR", "ARS", "GBP", "CLP"];
  return currencies[randomInt(0, currencies.length - 1)];
}

export function futureDate(daysOffset = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export function pastDate(daysOffset = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysOffset);
  return d.toISOString().split("T")[0];
}
