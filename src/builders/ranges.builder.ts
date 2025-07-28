import { RangeDetails, Schema } from "extract-pg-schema";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import { isCustomRangeColumn, RangeColumn } from "./column-types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  const ranges = schema.ranges;

  return `${buildImports()}
  
${buildSchemaNamespace(ranges)}

${buildTypesNamespace(ranges)}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

const BUILT_IN_RANGE_SCHEMA_NAME = "builtInRange";
const BUILT_IN_RANGE_TYPE_NAME = "BuiltInRange";

function buildSchemaNamespace(ranges: RangeDetails[]): string {
  const schemas = ranges.map((range) => {
    const schemaName = rangeDetailsToZodSchemaName(range);
    const zodType = "z.string()";
    const brand = `${range.schemaName}.ranges.${range.name}`;
    return `export const ${schemaName} = ${zodType}.brand<"${brand}">()`;
  });

  return `export namespace Schemas {
  export const ${BUILT_IN_RANGE_SCHEMA_NAME} = z.string().brand<"pg_catalog.ranges.built_in_range">();

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
  export type ${BUILT_IN_RANGE_TYPE_NAME} = z.infer<typeof Schemas.${BUILT_IN_RANGE_SCHEMA_NAME}>;

  ${types.join(";\n\n")}
}`;
}

function isCustomRangeDetails(details: RangeDetails): boolean {
  return details.schemaName !== "pg_catalog";
}

export function rangeDetailsToZodSchemaName(details: RangeDetails): string {
  return isCustomRangeDetails(details)
    ? snakeToCamelCase(details.name)
    : BUILT_IN_RANGE_SCHEMA_NAME;
}

export function rangeDetailsToTypescriptType(details: RangeDetails): string {
  return isCustomRangeDetails(details)
    ? snakeToPascalCase(details.name)
    : BUILT_IN_RANGE_TYPE_NAME;
}

export function rangeColumnToZodSchemaName(column: RangeColumn): string {
  const schemaName = isCustomRangeColumn(column)
    ? snakeToCamelCase(column.informationSchemaValue.udt_name)
    : BUILT_IN_RANGE_SCHEMA_NAME;

  return `Ranges.Schemas.${schemaName}`;
}

export function rangeColumnToTypescriptType(column: RangeColumn): string {
  const typeName = isCustomRangeColumn(column)
    ? snakeToPascalCase(column.informationSchemaValue.udt_name)
    : BUILT_IN_RANGE_TYPE_NAME;

  return `Ranges.Types.${typeName}`;
}
