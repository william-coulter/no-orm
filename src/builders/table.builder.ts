import { TableDetails } from "extract-pg-schema";
import { columnToZodType, isBuiltInRange, isJsonLike } from "./mappers";
import { isDomainColumn, isEnumColumn } from "./column-types";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  return `${buildImports({ table })}

${buildRow({ table })}

${buildRowType()}

${buildIdType()}

${buildTableFragment({ table })}

${buildColumnsIdentifier()}

${buildColumnsFragment()}

${buildAliasColumns()}
`;
}

/** Builds the Typescript imports required for the file. */
function buildImports({ table }: { table: TableDetails }): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { z } from "zod"`,
    `import { type ListSqlToken, sql } from "slonik"`,
  ];
  const imports = DEFAULT_IMPORTS;

  const containsJsonColumn = table.columns.some(isJsonLike);
  const containsBuiltInRange = table.columns.some(isBuiltInRange);
  if (containsJsonColumn || containsBuiltInRange) {
    imports.push(`import * as Postgres from "../../postgres"`);
  }

  const enums = table.columns.filter(isEnumColumn);
  if (enums.length > 0) {
    imports.push(`import * as Enums from "../enums"`);
  }

  const domains = table.columns.filter(isDomainColumn);
  if (domains.length > 0) {
    imports.push(`import * as Domains from "../domains"`);
  }

  const ranges = table.columns.filter((col) => isBuiltInRange(col));
  if (ranges.length > 0) {
    imports.push(`import * as Ranges from "../ranges"`);
  }

  return imports.map((s) => `${s};`).join("\n");
}

type BuildRowArgs = {
  table: TableDetails;
};

/** Builds the `row` variable. */
function buildRow({ table }: BuildRowArgs): string {
  const zodFields = table.columns
    .map((column) => {
      const zodType = columnToZodType(column);
      return `${column.name}: ${zodType},`;
    })
    .join("\n");

  return `export const row = z.object({
${zodFields}
});`;
}

/** Builds the `Row` type. */
function buildRowType(): string {
  return `export type Row = z.infer<typeof row>;`;
}

/** Builds the `Id` type. */
function buildIdType(): string {
  // FIXME: This should be based on the primary key, not hard-coded "id".
  return `export type Id = Row["id"];`;
}

type BuildTableFragmentArgs = { table: TableDetails };

/** Builds the `table` slonik SQL fragment. */
function buildTableFragment({ table }: BuildTableFragmentArgs): string {
  return `export const tableFragment = sql.identifier(["${table.schemaName}", "${table.name}"]);`;
}

/** Builds the `columns` slonik SqlIdentifiers. */
function buildColumnsIdentifier(): string {
  return `export const columns = Object.keys(row.shape).map((col) =>
  sql.identifier([col]),
);`;
}

/** Builds the `columnsFragment` slonik SQL fragment. */
function buildColumnsFragment(): string {
  return `export const columnsFragment = sql.join(columns, sql.fragment\`, \`);`;
}

/** Builds the `aliasColumns` function. */
function buildAliasColumns(): string {
  return `export function aliasColumns(alias: string): ListSqlToken {
  const aliasedColumns = Object.keys(row.shape).map((col) =>
    sql.identifier([alias, col]),
  );

  return sql.join(aliasedColumns, sql.fragment\`, \`);
}`;
}
