import { EnumDetails, Schema } from "extract-pg-schema";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import { EnumColumn } from "./column-types";
import { Files } from "./types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<Files> {
  const enums = schema.enums;

  return {
    "index.ts": buildIndex(),
    "schemas.ts": buildSchemas(enums),
    "types.ts": buildTypes(enums),
  };
}

function buildIndex(): string {
  return `export * as Schemas from "./schemas";
export * as Types from "./types";
`;
}

function buildSchemas(details: EnumDetails[]): string {
  const imports = [`import { z } from "zod"`].map((s) => `${s};`).join("\n");

  const schemas = details.map((detail) => {
    const schemaName = enumDetailsToZodSchemaName(detail);
    const literals = detail.values.map((v) => `z.literal("${v}")`);
    return `export const ${schemaName} = z.union([${literals.join(",\n")}])`;
  });

  return `${imports}

${schemas.join(";\n\n")}
`;
}

function buildTypes(details: EnumDetails[]): string {
  const imports = [
    `import { z } from "zod"`,
    `import * as Schemas from "./schemas"`,
  ]
    .map((s) => `${s};`)
    .join("\n");

  const types = details.map((detail) => {
    const typeName = enumDetailsToTypescriptType(detail);
    const schemaName = enumDetailsToZodSchemaName(detail);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `${imports}

${types.join(";\n\n")}
`;
}

export function enumDetailsToZodSchemaName(details: EnumDetails): string {
  return `${snakeToCamelCase(details.name)}`;
}

export function enumDetailsToTypescriptType(details: EnumDetails): string {
  return `${snakeToPascalCase(details.name)}`;
}

export function enumColumnToZodSchemaName(column: EnumColumn): string {
  return `Enums.Schemas.${snakeToCamelCase(column.informationSchemaValue.udt_name)}`;
}

export function enumColumnToTypescriptType(column: EnumColumn): string {
  return `Enums.Types.${snakeToPascalCase(column.informationSchemaValue.udt_name)}`;
}
