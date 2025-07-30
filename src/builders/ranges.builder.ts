import { RangeDetails, Schema } from "extract-pg-schema";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import { RangeColumn } from "./column-types";
import {
  isBuiltInRange,
  mapPostgresTypeToTypescriptType,
  mapPostgresTypeToZodSchema,
} from "./mappers";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  // Only user defined ranges are in this `schema.ranges` object.
  const ranges = schema.ranges;

  return `${buildImports()}
  
${buildSchemaNamespace(ranges)}

${buildTypesNamespace(ranges)}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

function buildSchemaNamespace(ranges: RangeDetails[]): string {
  const schemas = ranges.map((range) => {
    const schemaName = rangeDetailsToZodSchemaName(range);
    const zodType = "z.string()";
    const brand = `${range.schemaName}.ranges.${range.name}`;
    return `export const ${schemaName} = ${zodType}.brand<"${brand}">()`;
  });

  return `export namespace Schemas {
  ${schemas.join(";\n\n")}
}`;
}

function buildTypesNamespace(ranges: RangeDetails[]): string {
  const types = ranges.map((range) => {
    const typeName = rangeDetailsToTypescriptType(range);
    const schemaName = rangeDetailsToZodSchemaName(range);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `export namespace Types {
  ${types.join(";\n\n")}
}`;
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
    return `Ranges.Schemas.${snakeToCamelCase(column.informationSchemaValue.udt_name)}`;
  }
}

export function rangeColumnToTypescriptType(column: RangeColumn): string {
  if (isBuiltInRange(column)) {
    return mapPostgresTypeToTypescriptType(column.type.fullName);
  } else {
    return `Ranges.Types.${snakeToPascalCase(column.informationSchemaValue.udt_name)}`;
  }
}
