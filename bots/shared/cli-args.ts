/**
 * Tiny flag parser shared across the bot CLIs. Supports:
 *   --flag                 → boolean
 *   --key=value            → string value
 *   --key value            → string value (next token, if not itself a --flag)
 */
export type Flags = {
  bools: Set<string>;
  values: Map<string, string>;
};

export function parseFlags(argv: string[]): Flags {
  const bools = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const body = a.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      values.set(body.slice(0, eq), body.slice(eq + 1));
    } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) {
      values.set(body, argv[i + 1]);
      i++;
    } else {
      bools.add(body);
    }
  }
  return { bools, values };
}

export function flag(f: Flags, name: string): boolean {
  return f.bools.has(name) || f.values.has(name);
}

export function strValue(f: Flags, name: string): string | undefined {
  return f.values.get(name);
}

export function numValue(f: Flags, name: string, def: number): number {
  const v = f.values.get(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
}
