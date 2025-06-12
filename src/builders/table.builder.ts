import { TableColumn, TableDetails } from "extract-pg-schema";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  return `${buildImports({})}

${buildRow({ table })}

${buildRowType({})}

${buildIdType({})}

${buildTableFragment({ table })}

${buildColumnsIdentifier({})}

${buildColumnsFragment({})}
`;
}

type BuildImportsArgs = {};

/** Builds the Typescript imports required for the file. */
function buildImports({}: BuildImportsArgs): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { z } from "zod"`,
    `import { sql } from "slonik"`,
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

/** Converts a Postgres table column into a Zod schema type that can be added to a Zod object schema. */
function columnToZodType(column: TableColumn): string {
  if (column.type.kind === "base") {
    return mapColumnBaseTypeToZodType(column.type.fullName);
  }

  return "z.any()";
}

/** Given a column of kind `base` will return zod type. */
function mapColumnBaseTypeToZodType(fullName: string): string {
  switch (fullName) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.int8":
    case "pg_catalog.float4":
    case "pg_catalog.float8":
    case "pg_catalog.numeric": {
      return "z.number()";
    }
    case "pg_catalog.text":
    case "pg_catalog.varchar":
    case "pg_catalog.bpchar":
    case "pg_catalog.uuid": {
      return "z.string()";
    }
    case "pg_catalog.bool": {
      return "z.boolean()";
    }
    case "pg_catalog.date":
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz": {
      return "z.string()";
    }
    default: {
      return "z.any()";
    }
  }
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

type BuildRowTypeArgs = {};

/** Builds the `Row` type. */
function buildRowType({}: BuildRowTypeArgs): string {
  return `export type Row = z.infer<typeof row>;`;
}

type BuildIdTypeArgs = {};

/** Builds the `Id` type. */
function buildIdType({}: BuildIdTypeArgs): string {
  return `export type Id = Row["id"];`;
}

type BuildTableFragmentArgs = { table: TableDetails };

/** Builds the `table` slonik SQL fragment. */
function buildTableFragment({ table }: BuildTableFragmentArgs): string {
  return `export const tableFragment = sql.identifier(["${table.schemaName}", "${table.name}"]);`;
}

type BuildColumnsIdentifierArgs = {};

/** Builds the `columns` slonik SqlIdentifiers. */
function buildColumnsIdentifier({}: BuildColumnsIdentifierArgs): string {
  return `export const columns = Object.keys(row.shape).map((col) =>
  sql.identifier([col]),
);`;
}

type BuildColumnsFragmentArgs = {};

/** Builds the `columnsFragment` slonik SQL fragment. */
function buildColumnsFragment({}: BuildColumnsFragmentArgs): string {
  return `export const columnsFragment = sql.join(columns, sql.fragment\`, \`);`;
}
