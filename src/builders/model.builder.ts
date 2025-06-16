import { TableColumn, TableDetails } from "extract-pg-schema";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  const createColumns: TableColumn[] = getCreateColumns({ table });

  return `${buildImports()}

${buildBaseArgsType()}

${buildCreateType({ columns: createColumns })}

${buildCreateManyArgsType()}

${buildCreateManyFunction({ columns: createColumns })}
`;
}

/** Returns columns that are required to create a row in this table. */
function getCreateColumns({ table }: { table: TableDetails }): TableColumn[] {
  return table.columns.filter((col) => !col.isPrimaryKey);
}

/** Builds import statements. */
function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { type CommonQueryMethods, sql } from "slonik"`,
    `import { type Id, type Row, columnsFragment, row, tableFragment } from "./table"`,
  ];
  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

/** Builds the `BaseArgs` type. */
function buildBaseArgsType(): string {
  return `type BaseArgs = { connection: CommonQueryMethods };`;
}

/** Builds the `Create` type. */
function buildCreateType({ columns }: { columns: TableColumn[] }): string {
  const createFields = columns.map(
    (col) =>
      `${col.name}: ${mapColumnBaseTypeToTypescriptType(col.type.fullName)}`,
  );

  return `export type Create = { ${createFields.map((s) => `${s};`).join("\n")} };`;
}

/** Builds the `CreateManyArgs` type. */
function buildCreateManyArgsType(): string {
  return `export type CreateManyArgs = BaseArgs & { shapes: Create[]; };`;
}

/** Builds the `createMany` function. */
function buildCreateManyFunction({
  columns,
}: {
  columns: TableColumn[];
}): string {
  const fieldNames = columns.map((col) => col.name);

  const shapes = fieldNames
    .map(
      (name) => `const ${name}_shapes = shapes.map((shape) => shape.${name})`,
    )
    .map((s) => `${s};`)
    .join("\n");

  const insertColumns = fieldNames.join(",\n      ");
  const unnestArray = `[${fieldNames.map((n) => `${n}_shapes`).join(", ")}]`;
  const unnestTypes = `[${columns
    .map((col) => `"${mapPgTypeToUnnest(col.type.fullName)}"`)
    .join(", ")}]`;

  return `export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
${shapes}

  const query = sql.type(row)\`
    INSERT INTO \${tableFragment} (
      ${insertColumns}
    )
    SELECT \${columnsFragment} FROM \${sql.unnest(
      ${unnestArray},
      ${unnestTypes},
    )}
    RETURNING \${columnsFragment}\`;

  return connection.any(query);
}`;
}

/** Converts PG types to TypeScript types. */
function mapColumnBaseTypeToTypescriptType(fullName: string): string {
  switch (fullName) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.int8":
    case "pg_catalog.float4":
    case "pg_catalog.float8":
    case "pg_catalog.numeric":
      return "number";
    case "pg_catalog.text":
    case "pg_catalog.varchar":
    case "pg_catalog.bpchar":
    case "pg_catalog.uuid":
    case "pg_catalog.date":
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz":
      return "string";
    case "pg_catalog.bool":
      return "boolean";
    default:
      return "any";
  }
}

/** Converts PG types to SQL unnest types. */
function mapPgTypeToUnnest(fullName: string): string {
  switch (fullName) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.int8":
      return "int4";
    case "pg_catalog.float4":
    case "pg_catalog.float8":
    case "pg_catalog.numeric":
      return "numeric";
    case "pg_catalog.text":
    case "pg_catalog.varchar":
    case "pg_catalog.bpchar":
      return "text";
    case "pg_catalog.uuid":
      return "uuid";
    case "pg_catalog.bool":
      return "bool";
    case "pg_catalog.date":
      return "date";
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz":
      return "timestamp";
    default:
      return "text";
  }
}
