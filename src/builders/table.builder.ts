import { TableDetails } from "extract-pg-schema";
import { columnToZodType, isJsonLike } from "./mappers";
import { getColumnReference } from "./helpers";

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
  if (containsJsonColumn) {
    imports.push(`import { jsonValue } from "../../parsers"`);
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
