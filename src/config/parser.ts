import { Schema, TableColumn, TableDetails } from "extract-pg-schema";

import * as logger from "../logger";
import { NoOrmConfig } from ".";
import * as DefaultConfigs from "./default";
import { Ignorable } from "./ignorable";
import { DatabaseSchemaConfig, SchemaConfig, TableConfig } from "./schema";

/** An internal representation of the user-supplied `no-orm config` that is useful for `no-orm` to consume. */
export type ParsedConfig = {
  output_directory: string;
  database_schema_config: ParsedDatabaseSchemaConfig;
};

export type ParsedDatabaseSchemaConfig = {
  schema_configs: Map<string, ParsedSchemaConfig>;
};

export type ParsedSchemaConfig = Ignorable<{
  table_configs: Map<string, ParsedTableConfig>;
}>;

export type ParsedTableConfig = Ignorable<{
  ignored_columns: Set<string>;
  readonly_columns: Set<string>;
}>;

export function parse(
  config: NoOrmConfig,
  schemas: Record<string, Schema>,
): ParsedConfig {
  const outputDirectory: string =
    config.output_directory ?? DefaultConfigs.outputDirectory;

  const databaseSchemaConfig: ParsedDatabaseSchemaConfig =
    config.database_schema_config
      ? parseForDatabase(config.database_schema_config, schemas)
      : DefaultConfigs.parsedDatabaseConfig;

  return {
    output_directory: outputDirectory,
    database_schema_config: databaseSchemaConfig,
  };
}

export function parsePostgresConnectionString(config: NoOrmConfig): string {
  return (
    config.postgres_connection_string ?? DefaultConfigs.postgresConnectionString
  );
}

/**
 * Parses the user-supplied config and filters out any schemas that do not exist in the database.
 */
export function parseForDatabase(
  config: DatabaseSchemaConfig,
  schemas: Record<string, Schema>,
): ParsedDatabaseSchemaConfig {
  const userProvidedSchemas = Object.keys(config.schema_configs);
  const databaseSchemasMap = new Map<string, Schema>(Object.entries(schemas));

  if (userProvidedSchemas.length === 0) {
    return DefaultConfigs.parsedDatabaseConfig;
  }

  const matchingSchemas = new Set(
    userProvidedSchemas.filter((schema) => {
      const schemaExists = databaseSchemasMap.has(schema);
      if (!schemaExists) {
        logger.warn(
          `Provided database_schema_config schema '${schema}' does not exist in the database.`,
        );
      }
      return schemaExists;
    }),
  );

  const filteredSchemaConfigs = Object.entries(config.schema_configs).filter(
    ([key]) => matchingSchemas.has(key),
  );

  const parsedSchemaConfigs = new Map<string, ParsedSchemaConfig>(
    filteredSchemaConfigs.map(([schema, schemaConfig]) => [
      schema,
      parseForSchema(schemaConfig, databaseSchemasMap.get(schema)!),
    ]),
  );

  return { ...config, schema_configs: parsedSchemaConfigs };
}

/**
 * Parses the user-supplied schema config and filters out any tables that do not exist in the schema.
 */
export function parseForSchema(
  config: SchemaConfig,
  schema: Schema,
): ParsedSchemaConfig {
  if (config.ignore === true) {
    return { ignore: true };
  }

  const userProvidedTables = Object.keys(config.table_configs);
  const databaseTablesMap = new Map<string, TableDetails>(
    schema.tables.map((table) => [table.name, table]),
  );

  const matchingTables = new Set(
    userProvidedTables.filter((table) => {
      const tableExists = databaseTablesMap.has(table);
      if (!tableExists) {
        logger.warn(
          `Provided database_schema_config table '${table}' does not exist in the schema '${schema.name}'.`,
        );
      }
      return tableExists;
    }),
  );

  const filteredTableConfigs = Object.entries(config.table_configs).filter(
    ([key]) => matchingTables.has(key),
  );

  const parsedTableConfigs = new Map<string, ParsedTableConfig>(
    filteredTableConfigs.map(([table, config]) => [
      table,
      parseForTable(config, databaseTablesMap.get(table)!),
    ]),
  );

  return { ignore: false, table_configs: parsedTableConfigs };
}

/**
 * Parses the user-supplied table config and filters out any columns that do not exist in the table.
 */
export function parseForTable(
  config: TableConfig,
  table: TableDetails,
): ParsedTableConfig {
  if (config.ignore === true) {
    return { ignore: true };
  }

  const columnsMap = new Map<string, TableColumn>(
    table.columns.map((col) => [col.name, col]),
  );
  const filteredConfig = Object.entries(config.column_configs).filter(
    ([columnName, columnConfig]) => {
      const column = columnsMap.get(columnName);
      if (!column) {
        logger.warn(
          `Provided database_schema_config column '${column}' does not exist in the table '${table.informationSchemaValue.table_schema}.${table.name}'.`,
        );
        return false;
      }

      if (columnConfig.ignore === true || columnConfig.readonly === true) {
        const hasDefault = column.defaultValue !== null;
        const isNullable = column.isNullable;
        if (!isNullable && !hasDefault) {
          throw new InvalidIgnoredColumn(column);
        }
      }

      return true;
    },
  );

  const ignoredColumns = new Set(
    filteredConfig
      .filter(([_columnName, config]) => config.ignore)
      .map(([columnName, _config]) => columnName),
  );

  const readOnlyTimeColumns = config.readonly_time_columns ?? true;

  const readOnlyColumns = new Set(
    filteredConfig
      .filter(([_columnName, config]) => config.readonly)
      .map(([columnName, _config]) => columnName)
      .concat(readOnlyTimeColumns ? TIME_COLUMNS : []),
  );

  return {
    ignore: false,
    ignored_columns: ignoredColumns,
    readonly_columns: readOnlyColumns,
  };
}

class InvalidIgnoredColumn extends Error {
  constructor(column: TableColumn) {
    const name = column.name;
    const table = column.informationSchemaValue.table_name;
    const schema = column.informationSchemaValue.table_schema;
    super(
      `Cannot ignore or set column as readonly when column is not nullable and has no default. Column '${schema}.${table}.${name}'`,
    );
  }
}

// This could also be a config option one day.
export const TIME_COLUMNS = ["created_at", "updated_at"];
