import { DomainDetails, RangeDetails, Schema } from "extract-pg-schema";
import { snakeToPascalCase, snakeToCamelCase } from "./helpers";
import { DomainColumn } from "./column-types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  const ranges = schema.ranges;

  console.log(ranges);

  return `${buildImports()}
  
${buildSchemaNamespace(ranges)}

${buildTypesNamespace(ranges)}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

function buildSchemaNamespace(ranges: RangeDetails[]): string {
  return `export namespace Schemas {
}`;
}

function buildTypesNamespace(ranges: RangeDetails[]): string {
  return `export namespace Types {
}`;
}

export function domainDetailsToZodSchemaName(details: DomainDetails): string {
  return `${snakeToCamelCase(details.name)}`;
}

export function domainDetailsToTypescriptType(details: DomainDetails): string {
  return `${snakeToPascalCase(details.name)}`;
}

export function domainColumnToZodSchemaName(column: DomainColumn): string {
  return `Domains.Schemas.${snakeToCamelCase(column.informationSchemaValue.domain_name!)}`;
}

export function domainColumnToTypescriptType(column: DomainColumn): string {
  return `Domains.Types.${snakeToPascalCase(column.informationSchemaValue.domain_name!)}`;
}
