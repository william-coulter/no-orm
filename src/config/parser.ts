import { Schema, TableDetails } from "extract-pg-schema";
import { DatabaseSchemaConfig, SchemaConfig, TableConfig } from "./schema";
import * as logger from "../logger";

/**
 * Parses the user-supplied config and filters out any schemas that do not exist in the database.
 */
export function parseForDatabase(
  config: DatabaseSchemaConfig,
  schemas: Record<string, Schema>,
): DatabaseSchemaConfig | null {
  const userProvidedSchemas = Object.keys(config.schema_configs);
  const databaseSchemas = new Set(Object.keys(schemas));

  if (userProvidedSchemas.length === 0) {
    return null;
  }

  const matchingSchemas = new Set(
    userProvidedSchemas.filter((schema) => {
      const schemaExists = databaseSchemas.has(schema);
      if (!schemaExists) {
        logger.warn(
          `Provided database_schema_config schema '${schema}' does not exist in the database.`,
        );
      }
      return schemaExists;
    }),
  );

  const filteredSchemaConfigs = Object.fromEntries(
    Object.entries(config.schema_configs).filter(([key]) =>
      matchingSchemas.has(key),
    ),
  );

  return { ...config, schema_configs: filteredSchemaConfigs };
}

/**
 * Parses the user-supplied schema config and filters out any tables that do not exist in the schema.
 */
export function parseForSchema(
  config: SchemaConfig,
  schema: Schema,
): SchemaConfig | null {
  const userProvidedTables = Object.keys(config.table_configs);
  const databaseTables = new Set(schema.tables.map((table) => table.name));

  if (userProvidedTables.length === 0) {
    return null;
  }

  const matchingTables = new Set(
    userProvidedTables.filter((table) => {
      const tableExists = databaseTables.has(table);
      if (!tableExists) {
        logger.warn(
          `Provided database_schema_config table '${table}' does not exist in the schema '${schema.name}'.`,
        );
      }
      return tableExists;
    }),
  );

  const filteredTableConfigs = Object.fromEntries(
    Object.entries(config.table_configs).filter(([key]) =>
      matchingTables.has(key),
    ),
  );

  return { ...config, table_configs: filteredTableConfigs };
}

/**
 * Parses the user-supplied table config and filters out any columns that do not exist in the table.
 */
export function parseForTable(
  config: TableConfig,
  table: TableDetails,
): TableConfig | null {
  const userProvidedColumns = Object.keys(config.column_configs);
  const databaseColumns = new Set(table.columns.map((column) => column.name));

  if (userProvidedColumns.length === 0) {
    return null;
  }

  const matchingColumns = new Set(
    userProvidedColumns.filter((table) => {
      const columnExists = databaseColumns.has(table);
      if (!columnExists) {
        logger.warn(
          `Provided database_schema_config column '${table}' provided in config does not exist in the schema '${schema.name}'.`,
        );
      }
      return columnExists;
    }),
  );

  const filteredColumnConfigs = Object.fromEntries(
    Object.entries(config.column_configs).filter(([key]) =>
      matchingColumns.has(key),
    ),
  );

  // STARTHERE: Throw an exception if the column config has `readonly` (or `ignore`?) but the column has no default.

  return {
    ...config,
    column_configs: filteredColumnConfigs,
  };
}
