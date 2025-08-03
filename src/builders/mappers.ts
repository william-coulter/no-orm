import { TableColumn } from "extract-pg-schema";

import * as logger from "../logger";
import { getColumnReference, snakeToPascalCase } from "./helpers";
import {
  CompositeColumn,
  isBaseColumn,
  isCompositeColumn,
  isDomainColumn,
  isEnumColumn,
  isRangeColumn,
} from "./column-types";
import {
  enumColumnToTypescriptType,
  enumColumnToZodSchemaName,
} from "./enums.builder";
import {
  domainColumnToTypescriptType,
  domainColumnToZodSchemaName,
} from "./domains.builder";
import {
  rangeColumnToTypescriptType,
  rangeColumnToZodSchemaName,
} from "./ranges.builder";

/** Converts a Postgres table column into a Zod schema type that can be added to a Zod object schema. */
export function columnToZodType(column: TableColumn): string {
  const nullableText = column.isNullable ? ".nullable()" : "";

  if (isBaseColumn(column)) {
    const zodType = mapPostgresTypeToZodSchema(column.type.fullName);
    const columnReference = getColumnReference(column);

    if (column.isPrimaryKey) {
      const { table_schema, table_name } = column.informationSchemaValue;
      return `${zodType}.brand<"${table_schema}.${table_name}.${column.name}">()`;
    } else if (columnReference) {
      return `${zodType}.brand<"${columnReference.schemaName}.${columnReference.tableName}.${columnReference.columnName}">()${nullableText}`;
    }

    return `${zodType}${nullableText}`;
  } else if (isEnumColumn(column)) {
    return `${enumColumnToZodSchemaName(column)}${nullableText}`;
  } else if (isDomainColumn(column)) {
    return `${domainColumnToZodSchemaName(column)}${nullableText}`;
  } else if (isRangeColumn(column)) {
    return `${rangeColumnToZodSchemaName(column)}${nullableText}`;
  } else if (isCompositeColumn(column)) {
    throw new UnsupportedCompositeType(column);
  }

  logger.warn(`Could not map column to a zod type, defaulting to 'z.any()'. 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
  return "z.any()";
}

/** Converts a Postgres table column into a Typescript type. */
export function columnToTypescriptType(column: TableColumn): string {
  const nullableText = column.isNullable ? " | null" : "";

  const columnReference = getColumnReference(column);
  if (columnReference) {
    return `${snakeToPascalCase(columnReference.tableName)}Row["${columnReference.columnName}"]${nullableText}`;
  }

  if (isBaseColumn(column)) {
    return `${mapPostgresTypeToTypescriptType(column.type.fullName)}${nullableText}`;
  } else if (isEnumColumn(column)) {
    return `${enumColumnToTypescriptType(column)}${nullableText}`;
  } else if (isDomainColumn(column)) {
    return `${domainColumnToTypescriptType(column)}${nullableText}`;
  } else if (isRangeColumn(column)) {
    return `${rangeColumnToTypescriptType(column)}${nullableText}`;
  } else if (isCompositeColumn(column)) {
    throw new UnsupportedCompositeType(column);
  }

  logger.warn(`Could not map column to a Typescript type, defaulting to 'any'. 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
  return "any";
}

type SerialiseToUnnestValueArguments = {
  column: TableColumn;
  variableName: string;
};

/**
 * Maps a column to a value that can be used in a Slonik `PrimitiveValueExpression`.
 */
export function columnToSlonikPrimitiveValue({
  column,
  variableName,
}: SerialiseToUnnestValueArguments): string {
  if (isDateLike(column)) {
    return `${variableName}.toISOString()`;
  } else if (isJsonLike(column)) {
    return `JSON.stringify(${variableName})`;
  } else if (isIntervalColumn(column)) {
    return `${variableName}.toPostgres()`;
  } else if (isBuiltInRange(column)) {
    return `${variableName}.toPostgres(Postgres.Serializers.range)`;
  } else {
    return `${variableName}`;
  }
}

/**
 * Converts PG types to a string that can be used to specify the type in a SQL `UNNEST` block.
 *
 * E.g `pg_catalog.int4` -> `int4`, `pg_catalog.timestamptz` -> `timestamptz` etc.
 */
export function pgTypeToUnnestType(column: TableColumn): string {
  if (isBaseColumn(column)) {
    return column.type.fullName.replace("pg_catalog.", "");
  } else if (isEnumColumn(column)) {
    return column.informationSchemaValue.udt_name;
  } else if (isDomainColumn(column)) {
    return column.informationSchemaValue.domain_name!;
  } else if (isRangeColumn(column)) {
    return column.informationSchemaValue.udt_name;
  } else if (isCompositeColumn(column)) {
    throw new UnsupportedCompositeType(column);
  }

  logger.warn(`Could not map column to a unnest type, defaulting to "text". 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
  return "text";
}

/** Given a postgres type (e.g `pg_catalog.int2`) will return zod schema. */
export function mapPostgresTypeToZodSchema(postgresType: string): string {
  switch (postgresType) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.float4":
    case "pg_catalog.float8":
    case "pg_catalog.numeric": {
      return "z.number()";
    }
    case "pg_catalog.int8": {
      return "z.bigint()";
    }
    case "pg_catalog.text":
    case "pg_catalog.varchar":
    case "pg_catalog.bpchar": {
      return "z.string()";
    }
    case "pg_catalog.uuid": {
      return "z.string()";
    }
    case "pg_catalog.bool": {
      return "z.boolean()";
    }
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz": {
      return "z.date()";
    }
    case "pg_catalog.date":
    case "pg_catalog.time":
    case "pg_catalog.timetz": {
      return "z.string()";
    }
    case "pg_catalog.interval": {
      return "Postgres.Schemas.interval";
    }
    case "pg_catalog.json":
    case "pg_catalog.jsonb": {
      return "Postgres.Schemas.json";
    }
    case "pg_catalog.bit":
    case "pg_catalog.varbit": {
      return "z.string()";
    }
    case "pg_catalog.bytea": {
      return "z.instanceof(Buffer)";
    }
    case "pg_catalog.money": {
      return "z.string()";
    }
    case "pg_catalog.point":
    case "pg_catalog.line":
    case "pg_catalog.lseg":
    case "pg_catalog.box":
    case "pg_catalog.path":
    case "pg_catalog.polygon":
    case "pg_catalog.circle": {
      return "z.any()";
    }
    case "pg_catalog.inet":
    case "pg_catalog.cidr":
    case "pg_catalog.macaddr":
    case "pg_catalog.macaddr8": {
      return "z.string()";
    }
    case "pg_catalog.tsquery":
    case "pg_catalog.tsvector": {
      return "z.string()";
    }
    case "pg_catalog.xml": {
      return "z.string()";
    }
    case "pg_catalog.pg_lsn": {
      return "z.string()";
    }
    case "pg_catalog.pg_snapshot": {
      return "z.string()";
    }
    case "pg_catalog.int4range": {
      return "Postgres.Schemas.int4range";
    }
    case "pg_catalog.int8range": {
      return "Postgres.Schemas.int8range";
    }
    case "pg_catalog.numrange": {
      return "Postgres.Schemas.numrange";
    }
    case "pg_catalog.tsrange": {
      return "Postgres.Schemas.tsrange";
    }
    case "pg_catalog.tstzrange": {
      return "Postgres.Schemas.tstzrange";
    }
    case "pg_catalog.daterange": {
      return "Postgres.Schemas.daterange";
    }
    default: {
      logger.warn(
        `Could not map postgres type '${postgresType}' to a zod schema, defaulting to 'z.any()'.`,
      );
      return "z.any()";
    }
  }
}

/** Given a postgres type (e.g `pg_catalog.int2`) will return zod type. */
export function mapPostgresTypeToTypescriptType(postgresType: string): string {
  switch (postgresType) {
    case "pg_catalog.int2":
    case "pg_catalog.int4":
    case "pg_catalog.float4":
    case "pg_catalog.float8":
    case "pg_catalog.numeric": {
      return "number";
    }
    case "pg_catalog.int8": {
      return "bigint";
    }
    case "pg_catalog.text":
    case "pg_catalog.varchar":
    case "pg_catalog.bpchar": {
      return "string";
    }
    case "pg_catalog.uuid": {
      return "string";
    }
    case "pg_catalog.bool": {
      return "boolean";
    }
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz": {
      return "Date";
    }
    case "pg_catalog.date":
    case "pg_catalog.time":
    case "pg_catalog.timetz": {
      return "string";
    }
    case "pg_catalog.interval": {
      return "Postgres.Types.Interval";
    }
    case "pg_catalog.json":
    case "pg_catalog.jsonb": {
      return "Postgres.Types.Json";
    }
    case "pg_catalog.bit":
    case "pg_catalog.varbit": {
      return "string";
    }
    case "pg_catalog.bytea": {
      return "Buffer";
    }
    case "pg_catalog.money": {
      return "string";
    }
    case "pg_catalog.point":
    case "pg_catalog.line":
    case "pg_catalog.lseg":
    case "pg_catalog.box":
    case "pg_catalog.path":
    case "pg_catalog.polygon":
    case "pg_catalog.circle": {
      return "any";
    }
    case "pg_catalog.inet":
    case "pg_catalog.cidr":
    case "pg_catalog.macaddr":
    case "pg_catalog.macaddr8": {
      return "string";
    }
    case "pg_catalog.tsquery":
    case "pg_catalog.tsvector": {
      return "string";
    }
    case "pg_catalog.xml": {
      return "string";
    }
    case "pg_catalog.pg_lsn": {
      return "string";
    }
    case "pg_catalog.pg_snapshot": {
      return "string";
    }
    case "pg_catalog.int4range": {
      return "Postgres.Types.Int4range";
    }
    case "pg_catalog.int8range": {
      return "Postgres.Types.Int8range";
    }
    case "pg_catalog.numrange": {
      return "Postgres.Types.Numrange";
    }
    case "pg_catalog.tsrange": {
      return "Postgres.Types.Tsrange";
    }
    case "pg_catalog.tstzrange": {
      return "Postgres.Types.Tstzrange";
    }
    case "pg_catalog.daterange": {
      return "Postgres.Types.Daterange";
    }
    default: {
      logger.warn(
        `Could not map postgres type '${postgresType}' to a Typescript type, defaulting to 'any'.`,
      );
      return "any";
    }
  }
}

/** Returns `true` if the column is a Postgres date-like type. */
export function isDateLike(column: TableColumn): boolean {
  if (column.type.kind !== "base") {
    return false;
  }

  switch (column.type.fullName) {
    case "pg_catalog.timestamp":
    case "pg_catalog.timestamptz": {
      return true;
    }

    default: {
      return false;
    }
  }
}

/** Returns `true` if the column is a Postgres json-like type. */
export function isJsonLike(column: TableColumn): boolean {
  if (column.type.kind !== "base") {
    return false;
  }

  switch (column.type.fullName) {
    case "pg_catalog.json":
    case "pg_catalog.jsonb": {
      return true;
    }

    default: {
      return false;
    }
  }
}

/** Returns `true` if the column is a built in Postgres range. */
export function isBuiltInRange(column: TableColumn): boolean {
  if (column.type.kind !== "range") {
    return false;
  }

  switch (column.type.fullName) {
    case "pg_catalog.int4range":
    case "pg_catalog.int8range":
    case "pg_catalog.numrange":
    case "pg_catalog.tsrange":
    case "pg_catalog.tstzrange":
    case "pg_catalog.daterange": {
      return true;
    }

    default: {
      return false;
    }
  }
}

/** Returns `true` if the column is a built in Postgres range. */
export function isIntervalColumn(column: TableColumn): boolean {
  if (column.type.kind !== "base") {
    return false;
  }

  switch (column.type.fullName) {
    case "pg_catalog.interval": {
      return true;
    }

    default: {
      return false;
    }
  }
}

export class UnsupportedCompositeType extends Error {
  constructor(column: CompositeColumn) {
    super(
      `Unsupported composite type column '${column.name}' and table '${column.informationSchemaValue.table_schema}.${column.informationSchemaValue.table_name}'. Type '${column.type.fullName}'.\n\nUnfortunately you cannot use no-orm with this schema :(`,
    );
  }
}
