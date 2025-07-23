import { EnumDetails, Schema } from "extract-pg-schema";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import { EnumColumn } from "./column-types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  const enums = schema.enums;

  return `${buildImports()}
  
${buildSchemaNamespace(enums)}

${buildTypesNamespace(enums)}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

function buildSchemaNamespace(details: EnumDetails[]): string {
  const schemas = details.map((detail) => {
    const schemaName = enumDetailsToZodSchemaName(detail);
    const literals = detail.values.map((v) => `z.literal("${v}")`);
    return `export const ${schemaName} = z.union([${literals.join(",\n")}])`;
  });

  return `export namespace Schemas {
  ${schemas.join(";\n\n")}
}`;
}

function buildTypesNamespace(details: EnumDetails[]): string {
  const types = details.map((detail) => {
    const typeName = enumDetailsToTypescriptType(detail);
    const schemaName = enumDetailsToZodSchemaName(detail);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `export namespace Types {
  ${types.join(";\n\n")}
}`;
}

export function enumDetailsToZodSchemaName(details: EnumDetails): string {
  return `${snakeToCamelCase(details.name)}`;
}

export function enumDetailsToTypescriptType(details: EnumDetails): string {
  return `${snakeToPascalCase(details.name)}`;
}

export function enumColumnToZodSchemaName(column: EnumColumn): string {
  return `Enums.Schema.${snakeToCamelCase(column.informationSchemaValue.udt_name)}`;
}

export function enumColumnToTypescriptType(column: EnumColumn): string {
  return `Enums.Types.${snakeToPascalCase(column.informationSchemaValue.udt_name)}`;
}
