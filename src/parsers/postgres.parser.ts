import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Options } from "prettier";

import { prettierFormat } from "../commands/generate";

export async function parse({
  prettier_config,
  output_path,
}: ParseArgs): Promise<void> {
  await mkdir(output_path, {
    recursive: true,
  });

  const indexContent = buildIndex();
  const formattedIndexContent = await prettierFormat(
    indexContent,
    prettier_config,
  );
  await writeFile(
    path.join(output_path, "index.ts"),
    formattedIndexContent,
    "utf-8",
  );

  const schemasContent = buildSchemas();
  const formattedSchemasContent = await prettierFormat(
    schemasContent,
    prettier_config,
  );
  await writeFile(
    path.join(output_path, "schemas.ts"),
    formattedSchemasContent,
    "utf-8",
  );

  const typesContent = buildTypes();
  const formattedTypesContent = await prettierFormat(
    typesContent,
    prettier_config,
  );
  await writeFile(
    path.join(output_path, "types.ts"),
    formattedTypesContent,
    "utf-8",
  );

  const serializersContent = buildSerializers();
  const formattedSerializersContent = await prettierFormat(
    serializersContent,
    prettier_config,
  );
  await writeFile(
    path.join(output_path, "serializers.ts"),
    formattedSerializersContent,
    "utf-8",
  );
}

// Right now this content is pretty static however it might use DB context at some point.
type ParseArgs = {
  prettier_config: Options | null;
  output_path: string;
};

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
  ].join(";\n");

  return `${imports}

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
}

function buildTypes(): string {
  const imports = [
    `import { z } from "zod"`,
    `import * as Schemas from "./schemas"`,
  ].join(";\n");

  return `${imports}

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
}

function buildSerializers(): string {
  const imports = [].join(";\n");

  return `${imports}

/** Serialises a Postgres \`Range<T>\` into a string that can be stored in the database. */
export function range(value: any): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
`;
}
