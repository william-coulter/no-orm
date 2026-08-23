import { DomainDetails, Schema } from "extract-pg-schema";

import { DomainColumn } from "./column-types";
import { snakeToCamelCase,snakeToPascalCase } from "./helpers";
import { mapPostgresTypeToZodSchema } from "./mappers";
import { Files } from "./types";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<Files> {
  const domains = schema.domains;

  return {
    "index.ts": buildIndex(),
    "schemas.ts": buildSchemas(domains),
    "types.ts": buildTypes(domains),
  };
}

function buildIndex(): string {
  return `export * as Schemas from "./schemas";
export * as Types from "./types";
`;
}

function buildSchemas(domains: DomainDetails[]): string {
  const imports = [`import { z } from "zod"`].map((s) => `${s};`).join("\n");

  const schemas = domains.map((domain) => {
    const schemaName = domainDetailsToZodSchemaName(domain);
    const zodType = mapPostgresTypeToZodSchema(domain.innerType);
    const brand = `${domain.schemaName}.domains.${domain.name}`;
    return `export const ${schemaName} = ${zodType}.brand<"${brand}">()`;
  });

  return `${imports}

${schemas.join(";\n\n")}
`;
}

function buildTypes(domains: DomainDetails[]): string {
  const imports = [
    `import { z } from "zod"`,
    `import * as Schemas from "./schemas"`,
  ]
    .map((s) => `${s};`)
    .join("\n");

  const types = domains.map((domain) => {
    const typeName = domainDetailsToTypescriptType(domain);
    const schemaName = domainDetailsToZodSchemaName(domain);
    return `export type ${typeName} = z.infer<typeof Schemas.${schemaName}>`;
  });

  return `${imports}

${types.join(";\n\n")}
`;
}

export function domainDetailsToZodSchemaName(details: DomainDetails): string {
  return `${snakeToCamelCase(details.name)}`;
}

export function domainDetailsToTypescriptType(details: DomainDetails): string {
  return `${snakeToPascalCase(details.name)}`;
}

// When a domain's schema differs from its table's, the table's own `../domains` import would
// silently resolve to the wrong domain (or nothing at all) — so cross-schema domains get their
// own import aliased after the domain's own schema instead.
export function domainColumnToImportAlias(column: DomainColumn): string {
  const domainSchema = column.informationSchemaValue.domain_schema!;
  const tableSchema = column.informationSchemaValue.table_schema;

  return domainSchema === tableSchema
    ? "Domains"
    : `${snakeToPascalCase(domainSchema)}Domains`;
}

export function domainColumnToImportPath(column: DomainColumn): string {
  const domainSchema = column.informationSchemaValue.domain_schema!;
  const tableSchema = column.informationSchemaValue.table_schema;

  return domainSchema === tableSchema
    ? "../domains"
    : `../../${domainSchema}/domains`;
}

export function domainColumnToZodSchemaName(column: DomainColumn): string {
  const namespace = domainColumnToImportAlias(column);
  return `${namespace}.Schemas.${snakeToCamelCase(
    column.informationSchemaValue.domain_name!,
  )}`;
}

export function domainColumnToTypescriptType(column: DomainColumn): string {
  const namespace = domainColumnToImportAlias(column);
  return `${namespace}.Types.${snakeToPascalCase(
    column.informationSchemaValue.domain_name!,
  )}`;
}
