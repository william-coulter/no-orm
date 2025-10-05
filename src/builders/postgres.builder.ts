import { Files } from "./types";

export async function build(): Promise<Files> {
  return {
    "index.ts": buildIndex(),
    "schemas.ts": buildSchemas(),
    "types.ts": buildTypes(),
    "serializers.ts": buildSerializers(),
  };
}

function buildIndex(): string {
  return `export * as Schemas from "./schemas";
export * as Types from "./types";
export * as Serializers from "./serializers";
`;
}

function buildSchemas(): string {
  const imports = [
    `import { z } from "zod"`,
    `import { Range } from "postgres-range"`,
    `import { IPostgresInterval } from "postgres-interval"`,
    `import * as Types from "./types"`,
  ]
    .map((s) => `${s};`)
    .join("\n");

  const schemas = `
export const json: z.ZodType<Types.Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(json),
    z.record(json),
  ]),
);

export const interval = z.custom<IPostgresInterval>(
  (val) => {
    if (typeof val !== "object" || val === null) return false;

    const obj = val as Record<string, unknown>;

    return (
      typeof obj.years === "number" &&
      typeof obj.months === "number" &&
      typeof obj.days === "number" &&
      typeof obj.hours === "number" &&
      typeof obj.minutes === "number" &&
      typeof obj.seconds === "number" &&
      typeof obj.milliseconds === "number" &&
      typeof obj.toPostgres === "function" &&
      typeof obj.toISO === "function" &&
      typeof obj.toISOString === "function" &&
      typeof obj.toISOStringShort === "function"
    );
  },
  {
    message: "Expected a IPostgresInterval",
  },
);

export const int4range = z.custom<Range<number>>(
  (val) =>
    val instanceof Range &&
    (typeof val.lower === "number" || typeof val.upper === "number"),
  {
    message: "Expected a Range<number> (int4range)",
  },
);

export const int8range = z.custom<Range<string>>(
  (val) =>
    val instanceof Range &&
    (typeof val.lower === "string" || typeof val.upper === "string"),
  {
    message: "Expected a Range<string> (int8range)",
  },
);

export const numrange = z.custom<Range<number>>(
  (val) =>
    val instanceof Range &&
    (typeof val.lower === "number" || typeof val.upper === "number"),
  {
    message: "Expected a Range<number> (numrange)",
  },
);

export const tsrange = z.custom<Range<Date>>(
  (val) =>
    val instanceof Range &&
    (val.lower instanceof Date || val.upper instanceof Date),
  {
    message: "Expected a Range<Date> (tsrange)",
  },
);

export const tstzrange = z.custom<Range<Date>>(
  (val) =>
    val instanceof Range &&
    (val.upper instanceof Date || val.lower instanceof Date),
  {
    message: "Expected a Range<Date> (tstzrange)",
  },
);

export const daterange = z.custom<Range<string>>(
  (val) =>
    val instanceof Range &&
    (typeof val.lower === "string" || typeof val.upper === "string"),
  {
    message: "Expected a Range<string> (daterange)",
  },
);
`;

  return `${imports}

${schemas}`;
}

function buildTypes(): string {
  const imports = [
    `import { z } from "zod"`,
    `import * as Schemas from "./schemas"`,
  ]
    .map((s) => `${s};`)
    .join("\n");

  const types = `
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type Interval = z.infer<typeof Schemas.interval>;

export type Int4range = z.infer<typeof Schemas.int4range>;

export type Int8range = z.infer<typeof Schemas.int8range>;

export type Numrange = z.infer<typeof Schemas.numrange>;

export type Tsrange = z.infer<typeof Schemas.tsrange>;

export type Tstzrange = z.infer<typeof Schemas.tstzrange>;

export type Daterange = z.infer<typeof Schemas.daterange>;
`;

  return `${imports}

${types}`;
}

function buildSerializers(): string {
  const imports = [].map((s) => `${s};`).join("\n");

  const serializers = `
/** Serialises a Postgres \`Range<T>\` into a string that can be stored in the database. */
export function range(value: any): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
`;

  return `${imports}

${serializers}`;
}
