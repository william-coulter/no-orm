import { TableColumn, TableDetails } from "extract-pg-schema";
import {
  columnToTypescriptType,
  isDateLike,
  pgTypeToUnnestType,
} from "./mappers";

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

${buildCreateManyFunction({ createColumns })}

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
    `import { type Id, type Row, aliasColumns, columnsFragment, row, tableFragment } from "./table"`,
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
    (col) => `${col.name}: ${columnToTypescriptType(col)}`,
  );

  return `export type Create = { ${createFields.map((s) => `${s};`).join("\n")} };`;
}

/** Builds the `CreateManyArgs` type. */
function buildCreateManyArgsType(): string {
  return `export type CreateManyArgs = BaseArgs & { shapes: Create[]; };`;
}

/** Builds the `createMany` function. */
function buildCreateManyFunction({
  createColumns,
}: {
  createColumns: TableColumn[];
}): string {
  const fieldNames = createColumns.map((col) => col.name);

  const tuples = createColumns
    .map((col) => {
      const dateLikeSuffix = isDateLike(col) ? ".toISOString()" : "";
      return `shape.${col.name}${dateLikeSuffix}`;
    })
    .join(`,\n    `);
  const unnestTypes = createColumns
    .map((col) => `"${pgTypeToUnnestType(col)}"`)
    .join(", ");

  return `export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const tuples = shapes.map((shape) => [
    ${tuples}
  ]);

  const query = sql.type(row)\`
    INSERT INTO \${tableFragment} (
      ${fieldNames.join(",\n      ")}
    )
    SELECT ${fieldNames.join(", ")}
    FROM \${sql.unnest(tuples, [${unnestTypes}])}
      AS input(${fieldNames.join(", ")})
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
  const primaryKeySqlType = pgTypeToUnnestType(primaryKey);

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
  const primaryKeyAndUpdatableColumns = [primaryKey, ...updatableColumns];

  const tuples = primaryKeyAndUpdatableColumns
    .map((col) => {
      const dateLikeSuffix = isDateLike(col) ? ".toISOString()" : "";
      return `newRow.${col.name}${dateLikeSuffix}`;
    })
    .join(`,\n    `);

  const columnUpdates = updatableColumns
    .map((c) => `${c.name} = input.${c.name}`)
    .join(",\n      ");

  const unnestTypes = primaryKeyAndUpdatableColumns.map(
    (col) => `"${pgTypeToUnnestType(col)}"`,
  );

  return `export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const tuples = newRows.map((newRow) => [
    ${tuples}
  ]);

  const query = sql.type(row)\`
    UPDATE \${tableFragment} AS t SET
      ${columnUpdates}
    FROM \${sql.unnest(tuples, [
      ${unnestTypes.join(",\n      ")}
    ])} AS input(${primaryKeyAndUpdatableColumns.map((c) => c.name).join(", ")})
    WHERE t.${primaryKey.name} = input.${primaryKey.name}
    RETURNING \${aliasColumns("t")}\`;

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
  const primaryKeySqlType = pgTypeToUnnestType(primaryKey);

  return `export async function deleteMany({
  connection,
  ids,
}: DeleteManyArgs): Promise<void> {
  const query = sql.type(row)\`
    DELETE FROM \${tableFragment}
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
