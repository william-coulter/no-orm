import {
  ColumnReference,
  TableColumn,
  TableDetails,
  TableIndex,
  TableIndexColumn,
} from "extract-pg-schema";
import {
  columnToTypescriptType,
  isBuiltInRange,
  isIntervalColumn,
  isJsonLike,
  pgTypeToUnnestType,
  columnToSlonikPrimitiveValue,
  mapPostgresTypeToTypescriptType,
} from "./mappers";
import { getColumnReference, snakeToPascalCase } from "./helpers";
import { isDomainColumn, isEnumColumn } from "./column-types";

type BuildArgs = {
  table: TableDetails;
};

export async function build({ table }: BuildArgs): Promise<string> {
  // TODO: Also include any user-supplied readOnly, or omitted columns.
  const createColumns: TableColumn[] = getCreateColumns({ table });

  // TODO: Also include any user-supplied readOnly, or omitted columns.
  const updatableColumns: TableColumn[] = getUpdatableColumns({ table });

  const primaryKey = getPrimaryKey(table);

  return `${buildImports({ table })}

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

${buildGetManyMapFunction()}

${buildFindFunctions({ primaryKey })}

${buildUpdateType({ table, updatableColumns })}

${buildUpdateManyArgsType()}

${buildUpdateManyFunction({ table, updatableColumns })}

${buildUpdateArgsType()}

${buildUpdateFunction()}

${buildDeleteManyArgsType()}

${buildDeleteManyFunction({ table })}

${buildDeleteArgsType()}

${buildDeleteFunction()}

${buildIndexFunctions({ table })}
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
function buildImports({ table }: { table: TableDetails }): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { type CommonQueryMethods, sql } from "slonik"`,
    `import { type Id, type Row, aliasColumns, columnsFragment, row, tableFragment } from "./table"`,
  ];
  const imports = DEFAULT_IMPORTS;

  const containsJsonColumn = table.columns.some(isJsonLike);
  const containsIntervalColumn = table.columns.some(isIntervalColumn);
  const containsBuiltInRange = table.columns.some(isBuiltInRange);
  if (containsJsonColumn || containsIntervalColumn || containsBuiltInRange) {
    imports.push(`import * as Postgres from "../../postgres"`);
  }

  const tableReferences: ColumnReference[] = table.columns
    .map(getColumnReference)
    .filter((reference) => reference !== null);

  tableReferences.forEach((reference) => {
    imports.push(
      `import { type Row as ${snakeToPascalCase(reference.tableName)}Row } from "../${reference.tableName}/table"`,
    );
  });

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
    .map((col) =>
      columnToSlonikPrimitiveValue({
        column: col,
        variableName: `shape.${col.name}`,
      }),
    )
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

function buildGetManyMapFunction(): string {
  return `export async function getManyMap({
  connection,
  ids,
}: GetManyArgs): Promise<Map<Id, Row>> {
  const rows = await getMany({ connection, ids });
  return new Map<Id, Row>(rows.map((row) => [row.id, row]));
}`;
}

function buildFindFunctions({
  primaryKey,
}: {
  primaryKey: TableColumn;
}): string {
  const primaryKeyTypescriptType = mapPostgresTypeToTypescriptType(
    primaryKey.type.fullName,
  );

  return `export type FindManyArgs = BaseArgs & { ids: ${primaryKeyTypescriptType}[] };

export async function findMany({
  connection,
  ids,
}: FindManyArgs): Promise<readonly Row[]> {
  return getMany({ connection, ids: ids as Id[] });
}

export type FindArgs = BaseArgs & { id: ${primaryKeyTypescriptType} };

export async function find({ connection, id }: FindArgs): Promise<Row | null> {
  const result = await findMany({ connection, ids: [id] });
  return result[0] ?? null;
}`;
}

/** Builds the `Update` type. */
function buildUpdateType({
  table,
  updatableColumns,
}: {
  table: TableDetails;
  updatableColumns: TableColumn[];
}): string {
  const primaryKey = getPrimaryKey(table);

  const updateFields = updatableColumns.map(
    (col) => `${col.name}: ${columnToTypescriptType(col)}`,
  );

  return `export type Update = { ${updateFields.map((s) => `${s};`).join("\n")} } & { ${primaryKey.name}: Id };`;
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
    .map((col) =>
      columnToSlonikPrimitiveValue({
        column: col,
        variableName: `newRow.${col.name}`,
      }),
    )
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

/** Builds functions generated from indexes on the table. */
function buildIndexFunctions({ table }: { table: TableDetails }): string {
  return (
    table.indices
      // Ignore primary key indexes since we generate this earlier as the standard CRUD.
      .filter((index) => !index.isPrimary)
      // For now, let's ignore any indexes with a functional column component (e.g LOWER(col)).
      .filter((index) => index.columns.every((col) => !!col.name))
      // For now, let's ignore any indexes with a predicate (e.g WHERE col IS NOT NULL).
      // TODO: `enums` and `domains` are probably ok... But what about `range` and `composite`?
      .filter((index) => index.columns.every((col) => !col.predicate))
      .map((index) => buildIndexFunction({ index, table }))
      .join("\n\n")
  );
}

function buildIndexFunction({
  index,
  table,
}: {
  index: TableIndex;
  table: TableDetails;
}): string {
  const isSingleColumnIndex = index.columns.length === 1;

  if (isSingleColumnIndex) {
    const indexColumn: TableIndexColumnNonFunctionalNoPredicate = index
      .columns[0] as TableIndexColumnNonFunctionalNoPredicate;

    const tableColumn: TableColumn | undefined = table.columns.find(
      (c) => c.name === indexColumn.name,
    );

    if (!tableColumn) {
      throw new NoTableColumnForIndex(table, index);
    }

    return buildSingleColumnIndexFunction({
      index,
      tableColumn,
    });
  } else {
    const tableColumns = index.columns.map((indexColumn) => {
      const tableColumn: TableColumn | undefined = table.columns.find(
        (c) => c.name === indexColumn.name,
      );

      if (!tableColumn) {
        throw new NoTableColumnForIndex(table, index);
      }

      return tableColumn;
    });

    return buildMultiColumnIndexFunction({
      columns: tableColumns,
    });
  }
}

// The `name` will always be defined on a non-functional column.
type TableIndexColumnNonFunctional = TableIndexColumn & { name: string };
type TableIndexColumnNoPredicate = TableIndexColumn & { predicate: null };
type TableIndexColumnNonFunctionalNoPredicate = TableIndexColumnNonFunctional &
  TableIndexColumnNoPredicate;

function buildSingleColumnIndexFunction({
  index,
  tableColumn,
}: {
  index: TableIndex;
  tableColumn: TableColumn;
}): string {
  const columnName = tableColumn.name;
  const columnNamePascalCase = snakeToPascalCase(columnName);
  const columnTypescriptType = columnToTypescriptType(tableColumn);

  const getManyArgsName = `GetManyBy${columnNamePascalCase}Args`;
  const getManyArgumentName = "columns";
  const getManyArgs = `export type ${getManyArgsName} = BaseArgs & {
    ${getManyArgumentName}: ${columnTypescriptType}[];
  }`;
  const slonikPrimitiveMapping = columnToSlonikPrimitiveValue({
    column: tableColumn,
    variableName: "col",
  });

  const getManyFunctionName = `getManyBy${columnNamePascalCase}`;
  const getManyFunction = `export async function ${getManyFunctionName}({
    connection,
    ${getManyArgumentName},
  }: ${getManyArgsName}): Promise<readonly Row[]> {
  const list = ${getManyArgumentName}.map(col => ${slonikPrimitiveMapping});
  return connection.any(sql.type(row)\`
    SELECT \${columnsFragment}
    FROM \${tableFragment}
    WHERE ${columnName} = ANY(\${sql.array(list, "${pgTypeToUnnestType(tableColumn)}")})\`);
  }`;

  const getArgsName = `GetBy${columnNamePascalCase}Args`;
  const getArgs = `export type ${getArgsName} = BaseArgs & {
    ${columnName}: ${columnTypescriptType};
  }`;

  const getFunctionName = `getBy${columnNamePascalCase}`;
  const getFunctionReturnType = index.isUnique
    ? `Row | null`
    : `readonly Row[]`;
  const getFunctionReturnStatement = index.isUnique
    ? `result[0] ?? null`
    : `result`;

  const getFunction = `export async function ${getFunctionName}({
    connection,
    ${columnName},
  }: ${getArgsName}): Promise<${getFunctionReturnType}> {
    const result = await ${getManyFunctionName}({ connection, ${getManyArgumentName}: [${columnName}] });
    return ${getFunctionReturnStatement};
  }`;

  const reference = getColumnReference(tableColumn);
  const getManyMapFunction = reference
    ? `export async function getManyByPenguinMap({
  connection,
  columns,
}: GetManyByPenguinArgs): Promise<Map<${columnTypescriptType}, Row>> {
  const rows = await getManyByPenguin({ connection, columns });
  return new Map<${columnTypescriptType}, Row>(rows.map((row) => [row.${columnName}, row]));
}`
    : "";

  return `
  ${getManyArgs}

  ${getManyFunction}

  ${getArgs}

  ${getFunction}
  
  ${getManyMapFunction}`;
}

function buildMultiColumnIndexFunction({
  columns,
}: {
  columns: TableColumn[];
}): string {
  const pascalCaseParts = columns.map((col) => snakeToPascalCase(col.name));
  const pascalCaseName = pascalCaseParts.join("And");

  const getManyArgsName = `GetManyBy${pascalCaseName}`;
  const getArgsName = `GetBy${pascalCaseName}`;
  const getManyFunctionName = `getManyBy${pascalCaseName}`;
  const getFunctionName = `getBy${pascalCaseName}`;

  const getManyArgsFields = columns.map(
    (col) => `${col.name}: ${columnToTypescriptType(col)};`,
  );

  const getManyArgs = `export type ${getManyArgsName} = BaseArgs & {
    columns: {
      ${getManyArgsFields.join("\n")}
    }[];
  };`;

  const unnestTypes = columns.map((col) => `"${pgTypeToUnnestType(col)}"`);
  const inputColumnNames = columns.map((col) => col.name).join(", ");

  const tuples = columns
    .map((col) => {
      return columnToSlonikPrimitiveValue({
        column: col,
        variableName: `col.${col.name}`,
      });
    })
    .join(", ");

  const joinConditions = columns.map(
    (col) => `input.${col.name} = t.${col.name}`,
  );
  const getManyFunction = `export async function ${getManyFunctionName}({
  connection,
  columns,
}: ${getManyArgsName}): Promise<readonly Row[]> {
  const tuples = columns.map((col) => [${tuples}]);

  const query = sql.type(row)\`
    SELECT \${aliasColumns("t")}
    FROM \${tableFragment} AS t
    JOIN \${sql.unnest(tuples, [
      ${unnestTypes.join(",\n")}
    ])} AS input(${inputColumnNames})
      ON  ${joinConditions.join("\n      AND ")}\`;

  return connection.any(query);
};`;

  const singleArgsFields = columns
    .map((col) => `${col.name}: ${columnToTypescriptType(col)};`)
    .join("\n");

  const getArgs = `export type ${getArgsName} = BaseArgs & {
    ${singleArgsFields}
  };`;

  const passArgsObject = columns.map((col) => `${col.name}`).join(", ");

  const getFunction = `export async function ${getFunctionName}({
    connection,
    ${passArgsObject}
  }: ${getArgsName}): Promise<readonly Row[]> {
    return ${getManyFunctionName}({
      connection,
      columns: [{
        ${passArgsObject}
      }],
    });
  };`;

  return `
${getManyArgs}

${getManyFunction}

${getArgs}

${getFunction}`.trim();
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

class NoTableColumnForIndex extends Error {
  constructor(table: TableDetails, index: TableIndex) {
    super(
      `Could not find table column for index '${index.name}' and table '${table.schemaName}.${table.name}'`,
    );
  }
}
