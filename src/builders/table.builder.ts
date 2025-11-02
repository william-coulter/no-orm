import {
  ColumnReference,
  TableColumn,
  TableDetails,
  TableIndex,
  TableIndexColumn,
} from "extract-pg-schema";
import {
  columnToSlonikPrimitiveValue,
  columnToTypescriptType,
  columnToZodType,
  isBuiltInRange,
  isIntervalColumn,
  isJsonLike,
  mapPostgresTypeToTypescriptType,
  pgTypeToUnnestType,
} from "./mappers";
import { isDomainColumn, isEnumColumn } from "./column-types";
import { NonIgnoredConfig as NonIgnoredTableConfig } from "../parsers/table.parser";
import { getColumnReference, snakeToPascalCase } from "./helpers";

type BuildArgs = {
  table: TableDetails;
  config: NonIgnoredTableConfig;
};

export async function build({ table, config }: BuildArgs): Promise<string> {
  const nonIgnoredColumns = table.columns.filter(
    (col) => !config.ignored_columns.has(col.name),
  );

  const nonIgnoredColumnSet: Set<string | null> = new Set(
    nonIgnoredColumns.map((col) => col.name),
  );
  const nonIgnoredIndices = table.indices.filter((index) => {
    const allColumnsNonIgnored = index.columns.every((col) =>
      nonIgnoredColumnSet.has(col.name),
    );
    // If at least 1 column in the index is ignored, we want to ignore the index.
    return allColumnsNonIgnored;
  });

  const createColumns: TableColumn[] = getCreateColumns({ table, config });

  const updatableColumns: TableColumn[] = getUpdatableColumns({
    table,
    config,
  });

  const primaryKey = getPrimaryKey(table);

  return `${buildImports({ columns: nonIgnoredColumns })}

${buildRow({ columns: nonIgnoredColumns })}

${buildRowType()}

${buildIdType({ primaryKey })}

${buildTableFragment({ schemaName: table.schemaName, tableName: table.name })}

${buildColumnsIdentifier()}

${buildColumnsFragment()}

${buildAliasColumns()}

${buildBaseArgsType()}

${buildCreateType({ columns: createColumns })}

${buildCreateManyArgsType()}

${buildCreateManyFunction({ createColumns })}

${buildCreateArgsType()}

${buildCreateFunction()}

${buildGetManyArgsType()}

${buildGetManyFunction({ primaryKey })}

${buildGetArgsType()}

${buildGetFunction()}

${buildGetManyMapFunction({ primaryKey })}

${buildFindFunctions({ primaryKey })}

${buildUpdateType({ primaryKey, updatableColumns })}

${buildUpdateManyArgsType()}

${buildUpdateManyFunction({ primaryKey, updatableColumns })}

${buildUpdateArgsType()}

${buildUpdateFunction()}

${buildDeleteManyArgsType()}

${buildDeleteManyFunction({ primaryKey })}

${buildDeleteArgsType()}

${buildDeleteFunction()}

${buildIndexFunctions({ indices: nonIgnoredIndices, columns: nonIgnoredColumns })}
`;
}

/** Returns columns that are required to create a row in this table. */
function getCreateColumns({
  table,
  config,
}: {
  table: TableDetails;
  config: NonIgnoredTableConfig;
}): TableColumn[] {
  return table.columns
    .filter((col) => !col.isPrimaryKey)
    .filter((col) => !config.ignored_columns.has(col.name))
    .filter((col) => !config.readonly_columns.has(col.name));
}

/** Returns columns that are required to update a row in this table. */
function getUpdatableColumns({
  table,
  config,
}: {
  table: TableDetails;
  config: NonIgnoredTableConfig;
}): TableColumn[] {
  return table.columns
    .filter((col) => !col.isPrimaryKey)
    .filter((col) => !config.ignored_columns.has(col.name))
    .filter((col) => !config.readonly_columns.has(col.name));
}

/** Builds the Typescript imports required for the file. */
function buildImports({ columns }: { columns: TableColumn[] }): string {
  const DEFAULT_IMPORTS: string[] = [
    `import { z } from "zod"`,
    `import { type CommonQueryMethods, type ListSqlToken, sql } from "slonik"`,
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

  const tableReferences: ColumnReference[] = columns
    .map(getColumnReference)
    .filter((reference) => reference !== null);

  tableReferences.forEach((reference) => {
    imports.push(
      `import { type Row as ${snakeToPascalCase(reference.tableName)}Row } from "../tables/${reference.tableName}"`,
    );
  });

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

type BuildIdTypeArgs = {
  primaryKey: TableColumn;
};

/** Builds the `Id` type. */
function buildIdType({ primaryKey }: BuildIdTypeArgs): string {
  return `export type Id = Row["${primaryKey.name}"];`;
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

function buildGetManyFunction({
  primaryKey,
}: {
  primaryKey: TableColumn;
}): string {
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

function buildGetManyMapFunction({
  primaryKey,
}: {
  primaryKey: TableColumn;
}): string {
  return `export async function getManyMap({
  connection,
  ids,
}: GetManyArgs): Promise<Map<Id, Row>> {
  const rows = await getMany({ connection, ids });
  return new Map<Id, Row>(rows.map((row) => [row.${primaryKey.name}, row]));
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
  primaryKey,
  updatableColumns,
}: {
  primaryKey: TableColumn;
  updatableColumns: TableColumn[];
}): string {
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
  primaryKey,
  updatableColumns,
}: {
  primaryKey: TableColumn;
  updatableColumns: TableColumn[];
}): string {
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
function buildDeleteManyFunction({
  primaryKey,
}: {
  primaryKey: TableColumn;
}): string {
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
function buildIndexFunctions({
  indices,
  columns,
}: {
  indices: TableIndex[];
  columns: TableColumn[];
}): string {
  const columnsMap: Map<string, TableColumn> = new Map(
    columns.map((col) => [col.name, col]),
  );

  return (
    indices
      // Ignore primary key indexes since we generate this earlier as the standard CRUD.
      .filter((index) => !index.isPrimary)
      // For now, let's ignore any indexes with a functional column component (e.g LOWER(col)).
      .filter((index) => index.columns.every((col) => !!col.name))
      // For now, let's ignore any indexes with a predicate (e.g WHERE col IS NOT NULL).
      // TODO: `enums` and `domains` are probably ok... But what about `range` and `composite`?
      .filter((index) => index.columns.every((col) => !col.predicate))
      .map((index) => {
        const indexWithColumns: IndexWithColumns = {
          index: index,
          columns: (
            index.columns as TableIndexColumnNonFunctionalNoPredicate[]
          ).map((col) => columnsMap.get(col.name)!),
        };
        return buildIndexFunction({ index: indexWithColumns });
      })
      .join("\n\n")
  );
}

/** A `TableIndex` with its corresponding `TableColumn`s. */
type IndexWithColumns = {
  index: TableIndex;
  columns: TableColumn[];
};

function buildIndexFunction({ index }: { index: IndexWithColumns }): string {
  const isSingleColumnIndex = index.columns.length === 1;

  if (isSingleColumnIndex) {
    const column = index.columns[0];
    return buildSingleColumnIndexFunction({
      index: index.index,
      column: column,
    });
  } else {
    return buildMultiColumnIndexFunction({
      index: index.index,
      columns: index.columns,
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
  column,
}: {
  index: TableIndex;
  column: TableColumn;
}): string {
  const columnName = column.name;
  const columnNamePascalCase = snakeToPascalCase(columnName);
  const columnTypescriptType = columnToTypescriptType(column);

  const getManyArgsName = `GetManyBy${columnNamePascalCase}Args`;
  const getManyArgumentName = "columns";
  const getManyArgs = `export type ${getManyArgsName} = BaseArgs & {
    ${getManyArgumentName}: ${columnTypescriptType}[];
  }`;
  const slonikPrimitiveMapping = columnToSlonikPrimitiveValue({
    column: column,
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
    WHERE ${columnName} = ANY(\${sql.array(list, "${pgTypeToUnnestType(column)}")})\`);
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

  // If there is a foreign key on this index, we will build a map function.
  const reference = getColumnReference(column);
  const getManyMapFunctionName = `${getManyFunctionName}Map`;
  const getManyMapArgsName = `${getManyArgsName}`;
  // TODO: One day we can conditional return `Row | null` if the index is unique.
  const getManyMapFunctionValueType = `Row[]`;
  const mapType = `Map<${columnTypescriptType}, ${getManyMapFunctionValueType}>`;
  const getManyMapFunction = reference
    ? `export async function ${getManyMapFunctionName}({
  connection,
  ${getManyArgumentName},
}: ${getManyMapArgsName}): Promise<${mapType}> {
  const rows = await ${getManyFunctionName}({ connection, ${getManyArgumentName} });
  const map = new ${mapType}(${getManyArgumentName}.map((${column.name}) => [${column.name}, []]));
  for (const row of rows) {
    const existing = map.get(row.${column.name})!;
    map.set(row.${column.name}, [...existing, row]);
  }
  return map;
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
  index,
  columns,
}: {
  index: TableIndex;
  columns: TableColumn[];
}): string {
  const pascalCaseParts = columns.map((col) => snakeToPascalCase(col.name));
  const pascalCaseName = pascalCaseParts.join("And");

  const getManyArgsName = `GetManyBy${pascalCaseName}`;
  const getManyFunctionName = `getManyBy${pascalCaseName}`;

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

  const getArgsName = `GetBy${pascalCaseName}`;
  const getFunctionName = `getBy${pascalCaseName}`;

  const singleArgsFields = columns
    .map((col) => `${col.name}: ${columnToTypescriptType(col)};`)
    .join("\n");

  const getFunctionReturnType = index.isUnique
    ? `Row | null`
    : `readonly Row[]`;
  const getFunctionReturnStatement = index.isUnique
    ? `result[0] ?? null`
    : `result`;

  const getArgs = `export type ${getArgsName} = BaseArgs & {
    ${singleArgsFields}
  };`;

  const passArgsObject = columns.map((col) => `${col.name}`).join(", ");

  const getFunction = `export async function ${getFunctionName}({
    connection,
    ${passArgsObject}
  }: ${getArgsName}): Promise<${getFunctionReturnType}> {
    const result = await ${getManyFunctionName}({
      connection,
      columns: [{
        ${passArgsObject}
      }],
    });

    return ${getFunctionReturnStatement};
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
