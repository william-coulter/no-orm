import { TableColumn, TableDetails } from "extract-pg-schema";
import { columnToZodType } from "./mappers";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  return `${buildImports()}

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
function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { z } from "zod"`,
    `import { type ListSqlToken, sql } from "slonik"`,
  ];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

type BuildRowArgs = {
  table: TableDetails;
};

/** Builds the `row` variable. */
function buildRow({ table }: BuildRowArgs): string {
  const zodFields = table.columns
    .map((column) => {
      const zodType = columnToZodType(column);
      const brand = getColumnBranding(column, table.schemaName, table.name);
      return `  ${column.name}: ${zodType}${brand},`;
    })
    .join("\n");

  return `export const row = z.object({
${zodFields}
});`;
}

/**
 * Given a column, returns any Zod branding that needs to be applied.
 * If no branding is needed, will return an empty string.
 */
function getColumnBranding(
  column: TableColumn,
  schemaName: string,
  tableName: string,
): string {
  if (column.isPrimaryKey) {
    return `.brand<"${schemaName}.${tableName}">()`;
  }

  return "";
}

/** Builds the `Row` type. */
function buildRowType(): string {
  return `export type Row = z.infer<typeof row>;`;
}

/** Builds the `Id` type. */
function buildIdType(): string {
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
