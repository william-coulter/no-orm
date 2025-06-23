import { TableColumn } from "extract-pg-schema";

import * as logger from "../logger";

/** Converts a Postgres table column into a Zod schema type that can be added to a Zod object schema. */
export function columnToZodType(column: TableColumn): string {
  if (column.type.kind === "base") {
    return mapColumnBaseTypeToZodType(column);
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
  if (column.type.kind === "base") {
    return mapColumnBaseTypeToTypescriptType(column);
  }

  logger.warn(`Could not map column to a Typescript type, defaulting to 'any'. 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
  return "any";
}

/**
 * Converts PG types to a string that can be used to specify the type in a SQL `UNNEST` block.
 *
 * E.g `pg_catalog.int4` -> `int4`, `pg_catalog.timestamptz` -> `timestamptz` etc.
 */
export function pgTypeToUnnestType(column: TableColumn): string {
  if (column.type.kind === "base") {
    return column.type.fullName.replace("pg_catalog.", "");
  }

  logger.warn(`Could not map column to a unnest type, defaulting to "text". 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
  return "text";
}

/** Given a column of kind `base` will return zod type. */
function mapColumnBaseTypeToZodType(column: TableColumn): string {
  switch (column.type.fullName) {
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
    // FIXME: Handle interval type. See here: https://github.com/gajus/slonik?tab=readme-ov-file#sqlinterval
    case "pg_catalog.interval": {
      return "z.any()";
    }
    case "pg_catalog.json":
    case "pg_catalog.jsonb": {
      return "z.string()";
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
    default: {
      logger.warn(`Could not map column to a zod type, defaulting to 'z.any()'. 
      Schema: '${column.informationSchemaValue.table_schema}'.
      Table: '${column.informationSchemaValue.table_name}'.
      Column: '${column.name}'.
      Type: ${JSON.stringify(column.type, null, 2)}`);
      return "z.any()";
    }
  }
}

/** Given a column of kind `base` will return a Typescript type. */
function mapColumnBaseTypeToTypescriptType(column: TableColumn): string {
  switch (column.type.fullName) {
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
    // FIXME: Handle interval type. See here: https://github.com/gajus/slonik?tab=readme-ov-file#sqlinterval
    case "pg_catalog.interval": {
      return "any";
    }
    case "pg_catalog.json":
    case "pg_catalog.jsonb": {
      return "string";
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
    default: {
      logger.warn(`Could not map column to a Typescript type, defaulting to 'any'. 
  Schema: '${column.informationSchemaValue.table_schema}'.
  Table: '${column.informationSchemaValue.table_name}'.
  Column: '${column.name}'.
  Type: ${JSON.stringify(column.type, null, 2)}`);
      return "any";
    }
  }
}

/** Returns `true` if the columns is a date-like type. */
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
