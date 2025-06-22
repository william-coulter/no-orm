import { TableColumn } from "extract-pg-schema";

import * as logger from "../logger";

/** Converts a Postgres table column into a Zod schema type that can be added to a Zod object schema. */
export function columnToZodType(column: TableColumn): string {
  if (column.type.kind === "base") {
    return mapColumnBaseTypeToZodType(column.type.fullName);
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
    return mapColumnBaseTypeToTypescriptType(column.type.fullName);
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

/** Given a column of kind `base` will return a Typescript type. */
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
