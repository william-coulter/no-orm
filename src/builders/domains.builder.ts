import { DomainDetails, Schema } from "extract-pg-schema";
import { snakeToPascalCase, snakeToCamelCase } from "./helpers";
import { mapPostgresTypeToZodType } from "./mappers";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  const domains = schema.domains;

  return `${buildImports()}
  
${buildSchemaNamespace(domains)}

${buildTypesNamespace(domains)}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

function buildSchemaNamespace(domains: DomainDetails[]): string {
  const schemas = domains.map((domain) => {
    const schemaName = domainDetailsToZodSchemaName(domain);
    const zodType = mapPostgresTypeToZodType(domain.innerType);
    const brand = `${domain.schemaName}.domains.${domain.name}`;
    return `export const ${schemaName} = ${zodType}.brand<"${brand}">()`;
  });

  return `export namespace Schemas {
  ${schemas.join(";\n\n")}
}`;
}

function buildTypesNamespace(domains: DomainDetails[]): string {
  const types = domains.map((domain) => {
    const typeName = domainDetailsToTypescriptType(domain);
    const schemaName = domainDetailsToZodSchemaName(domain);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `export namespace Types {
  ${types.join(";\n\n")}
}`;
}

export function domainDetailsToZodSchemaName(details: DomainDetails): string {
  return `${snakeToCamelCase(details.name)}`;
}

export function domainDetailsToTypescriptType(details: DomainDetails): string {
  return `${snakeToPascalCase(details.name)}`;
}
