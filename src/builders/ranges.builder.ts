import { RangeDetails, Schema } from "extract-pg-schema";

import { RangeColumn } from "./column-types";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import {
  isBuiltInRange,
  mapPostgresTypeToTypescriptType,
  mapPostgresTypeToZodSchema,
} from "./mappers";
import { Files } from "./types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<Files> {
  // Only user-defined ranges are in schema.ranges
  const ranges = schema.ranges;

  return {
    "index.ts": buildIndex(),
    "schemas.ts": buildSchemas(ranges),
    "types.ts": buildTypes(ranges),
  };
}

function buildIndex(): string {
  return `export * as Schemas from "./schemas";
export * as Types from "./types";
`;
}

function buildSchemas(ranges: RangeDetails[]): string {
  const imports = [`import { z } from "zod"`].map((s) => `${s};`).join("\n");

  const schemas = ranges.map((range) => {
    const schemaName = rangeDetailsToZodSchemaName(range);
    // For user-defined ranges, the inner type is not known at generation time
    const zodType = "z.string()";
    const brand = `${range.schemaName}.ranges.${range.name}`;
    return `export const ${schemaName} = ${zodType}.brand<"${brand}">()`;
  });

  return `${imports}

${schemas.join(";\n\n")}
`;
}

function buildTypes(ranges: RangeDetails[]): string {
  const imports = [
    `import { z } from "zod"`,
    `import * as Schemas from "./schemas"`,
  ]
    .map((s) => `${s};`)
    .join("\n");

  const types = ranges.map((range) => {
    const typeName = rangeDetailsToTypescriptType(range);
    const schemaName = rangeDetailsToZodSchemaName(range);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `${imports}

${types.join(";\n\n")}
`;
}

export function rangeDetailsToZodSchemaName(details: RangeDetails): string {
  return snakeToCamelCase(details.name);
}

export function rangeDetailsToTypescriptType(details: RangeDetails): string {
  return snakeToPascalCase(details.name);
}

export function rangeColumnToZodSchemaName(column: RangeColumn): string {
  if (isBuiltInRange(column)) {
    return mapPostgresTypeToZodSchema(column.type.fullName);
  } else {
    return `Ranges.Schemas.${snakeToCamelCase(
      column.informationSchemaValue.udt_name,
    )}`;
  }
}

export function rangeColumnToTypescriptType(column: RangeColumn): string {
  if (isBuiltInRange(column)) {
    return mapPostgresTypeToTypescriptType(column.type.fullName);
  } else {
    return `Ranges.Types.${snakeToPascalCase(
      column.informationSchemaValue.udt_name,
    )}`;
  }
}
