import { TableColumn, TableDetails } from "extract-pg-schema";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  // TODO: Also include any user-supplied readOnly, or omitted columns.
  const createColumns: TableColumn[] = getCreateColumns({ table });

  // TODO: Also include any user-supplied readOnly, or omitted columns.
  const updatableColumns: TableColumn[] = getUpdatableColumns({ table });

  return `${buildImports()}

${buildBaseArgsType()}

${buildCreateType({ columns: createColumns })}

${buildCreateManyArgsType()}

${buildCreateManyFunction({ columns: createColumns })}

${buildCreateArgsType()}

${buildCreateFunction()}

${buildGetManyArgsType()}

${buildGetManyFunction({ table })}

${buildGetArgsType()}

${buildGetFunction()}

${buildUpdateType({ updatableColumns })}

${buildUpdateManyArgsType()}

${buildUpdateManyFunction({ table, updatableColumns })}

${buildUpdateArgsType()}

${buildUpdateFunction()}

${buildDeleteManyArgsType()}

${buildDeleteManyFunction({ table })}

${buildDeleteArgsType()}

${buildDeleteFunction()}
`;
}

/** Returns columns that are required to create a row in this table. */
function getCreateColumns({ table }: { table: TableDetails }): TableColumn[] {
  return table.columns.filter((col) => !col.isPrimaryKey);
}

/** Returns columns that are required to update a row in this table. */
function getUpdatableColumns({
  table,
}: {
  table: TableDetails;
}): TableColumn[] {
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

/** Builds the `CreateArgs` type. */
function buildCreateArgsType(): string {
  return `export type CreateArgs = BaseArgs & { shape: Create };`;
}

/** Builds the `create` function. */
function buildCreateFunction(): string {
  return `export async function create({ connection, shape }: CreateArgs): Promise<Row> {
  const result = await createMany({ connection, shapes: [shape] });
  return result[0];
}`;
}

/** Builds the `GetManyArgs` type. */
function buildGetManyArgsType(): string {
  return `export type GetManyArgs = BaseArgs & { ids: Id[] };`;
}

function buildGetManyFunction({ table }: { table: TableDetails }): string {
  const primaryKey = getPrimaryKey(table);

  // FIXME: Perhaps this should be an argument?
  const primaryKeySqlType = mapPgTypeToUnnest(primaryKey.type.fullName);

  return `export async function getMany({
  connection,
  ids,
}: GetManyArgs): Promise<readonly Row[]> {
  const query = sql.type(row)\`
    SELECT \${columnsFragment}
    FROM \${tableFragment}
    WHERE ${primaryKey.name} = ANY(\${sql.array(ids, "${primaryKeySqlType}")})\`;

  return connection.any(query);
}`;
}

function buildGetArgsType(): string {
  return `type GetArgs = BaseArgs & { id: Id };`;
}

function buildGetFunction(): string {
  return `export async function get({ connection, id }: GetArgs): Promise<Row> {
  const result = await getMany({ connection, ids: [id] });
  return result[0];
}`;
}

/** Builds the `Update` type. */
function buildUpdateType({
  updatableColumns,
}: {
  updatableColumns: TableColumn[];
}): string {
  return `type Update = Row;`;
}

/** Builds the `UpdateManyArgs` type. */
function buildUpdateManyArgsType(): string {
  return `export type UpdateManyArgs = BaseArgs & { newRows: Update[] };`;
}

/** Builds the `updateMany` function. */
function buildUpdateManyFunction({
  table,
  updatableColumns,
}: {
  table: TableDetails;
  updatableColumns: TableColumn[];
}): string {
  const primaryKey = getPrimaryKey(table);
  const primaryKeyVariable = `const ${primaryKey.name}s = newRows.map((row) => row.${primaryKey.name})`;
  const updatableVariables = updatableColumns
    .map(
      (c) => `const ${c.name}_updates = newRows.map((row) => row.${c.name});`,
    )
    .join("\n");

  const columnUpdate = updatableColumns
    .map((c) => `${c.name} = u.${c.name}`)
    .join(",\n      ");

  const unnestPrimaryKey = `${primaryKey.name}s`;
  const unnestUpdatableVariables = updatableColumns.map(
    (c) => `${c.name}_updates`,
  );
  const unnestTypes = table.columns.map(
    (col) => `"${mapPgTypeToUnnest(col.type.fullName)}"`,
  );

  const aliasColumns = table.columns.map((col) => col.name).join(", ");

  return `export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  ${primaryKeyVariable}
  ${updatableVariables}

  const query = sql.type(row)\`
    UPDATE \${tableFragment} AS t SET
      ${columnUpdate}
    FROM (
      SELECT \${columnsFragment} FROM \${sql.unnest(
        [${[unnestPrimaryKey, ...unnestUpdatableVariables].join(", ")}],
        [${unnestTypes}],
      )}
    ) AS u(${aliasColumns})
    WHERE t.${primaryKey.name} = u.${primaryKey.name}
    RETURNING \${columnsFragment}\`;

  return connection.any(query);
}`;
}

/** Builds the `UpdateArgs` type. */
function buildUpdateArgsType(): string {
  return `type UpdateArgs = BaseArgs & { newRow: Update };`;
}

/** Builds the `update` function. */
function buildUpdateFunction(): string {
  return `export async function update({ connection, newRow }: UpdateArgs): Promise<Row> {
  const result = await updateMany({ connection, newRows: [newRow] });
  return result[0];
}`;
}

/** Builds the `DeleteManyArgs` type. */
function buildDeleteManyArgsType(): string {
  return `export type DeleteManyArgs = BaseArgs & { ids: Id[] };`;
}

/** Builds the `deleteMany` function. */
function buildDeleteManyFunction({ table }: { table: TableDetails }): string {
  const primaryKey = getPrimaryKey(table);
  const primaryKeySqlType = mapPgTypeToUnnest(primaryKey.type.fullName);

  return `export async function deleteMany({
  connection,
  ids,
}: DeleteManyArgs): Promise<void> {
  const query = sql.type(row)\`
    DELETE FROM \${columnsFragment}
    WHERE ${primaryKey.name} = ANY(\${sql.array(ids, "${primaryKeySqlType}")})\`;

  await connection.query(query);
}`;
}

/** Builds the `DeleteArgs` type. */
function buildDeleteArgsType(): string {
  return `type DeleteArgs = BaseArgs & { id: Id };`;
}

/** Builds the `delete` function and its alias export. */
function buildDeleteFunction(): string {
  return `async function _delete({ connection, id }: DeleteArgs): Promise<void> {
  await deleteMany({ connection, ids: [id] });
}

export { _delete as delete };`;
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
// TODO: I think this will need a refactor. Can I just strip the section that isn't `pg_catalog`?
function mapPgTypeToUnnest(fullName: string): string {
  switch (fullName) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.int8":
      return "int";
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

function getPrimaryKey(table: TableDetails): TableColumn {
  const primaryKey = table.columns.find((col) => col.isPrimaryKey);
  if (!primaryKey) {
    throw new NoPrimaryKeyError(table);
  }
  return primaryKey;
}

class NoPrimaryKeyError extends Error {
  constructor(table: TableDetails) {
    super(`Table ${table.name} has no primary key`);
  }
}
