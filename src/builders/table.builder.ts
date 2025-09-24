import { TableColumn, TableDetails } from "extract-pg-schema";
import {
  columnToZodType,
  isBuiltInRange,
  isIntervalColumn,
  isJsonLike,
} from "./mappers";
import { isDomainColumn, isEnumColumn } from "./column-types";
import { NonIgnoredConfig as NonIgnoredTableConfig } from "../parsers/table.parser";

type BuildArgs = {
  table: TableDetails;
  config: NonIgnoredTableConfig;
};

export async function build({ table, config }: BuildArgs): Promise<string> {
  const nonIgnoredColumns = table.columns.filter(
    (col) => !config.ignored_columns.has(col.name),
  );

  return `${buildImports({ columns: nonIgnoredColumns })}

${buildRow({ columns: nonIgnoredColumns })}

${buildRowType()}

${buildIdType()}

${buildTableFragment({ schemaName: table.schemaName, tableName: table.name })}

${buildColumnsIdentifier()}

${buildColumnsFragment()}

${buildAliasColumns()}
`;
}

/** Builds the Typescript imports required for the file. */
function buildImports({ columns }: { columns: TableColumn[] }): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { z } from "zod"`,
    `import { type ListSqlToken, sql } from "slonik"`,
  ];
  const imports = DEFAULT_IMPORTS;

  const containsJsonColumn = columns.some(isJsonLike);
  const containsIntervalColumn = columns.some(isIntervalColumn);
  const containsBuiltInRange = columns.some(isBuiltInRange);
  if (containsJsonColumn || containsIntervalColumn || containsBuiltInRange) {
    imports.push(`import * as Postgres from "../../postgres"`);
  }

  const enums = columns.filter(isEnumColumn);
  if (enums.length > 0) {
    imports.push(`import * as Enums from "../enums"`);
  }

  const domains = columns.filter(isDomainColumn);
  if (domains.length > 0) {
    imports.push(`import * as Domains from "../domains"`);
  }

  const ranges = columns.filter((col) => isBuiltInRange(col));
  if (ranges.length > 0) {
    imports.push(`import * as Ranges from "../ranges"`);
  }

  return imports.map((s) => `${s};`).join("\n");
}

type BuildRowArgs = {
  columns: TableColumn[];
};

/** Builds the `row` variable. */
function buildRow({ columns }: BuildRowArgs): string {
  const zodFields = columns
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

type BuildTableFragmentArgs = { schemaName: string; tableName: string };

/** Builds the `table` slonik SQL fragment. */
function buildTableFragment({
  schemaName,
  tableName,
}: BuildTableFragmentArgs): string {
  return `export const tableFragment = sql.identifier(["${schemaName}", "${tableName}"]);`;
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
