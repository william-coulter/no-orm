import { Schema, TableColumn, TableDetails } from "extract-pg-schema";
import { DatabaseSchemaConfig, SchemaConfig, TableConfig } from "./schema";
import * as EmptyConfigs from "./empty";
import * as logger from "../logger";

export type ParsedDatabaseSchemaConfig = {
  schema_configs: Map<string, ParsedSchemaConfig>;
};

export type ParsedSchemaConfig = Ignorable<{
  table_configs: Map<string, ParsedTableConfig>;
}>;

export const emptyParsedSchemaConfig: ParsedSchemaConfig = {
  ignore: false,
  table_configs: new Map(),
};

export type ParsedTableConfig = Ignorable<{
  column_configs: Map<string, ParsedColumnConfig>;
}>;

export type ParsedColumnConfig = Ignorable<{
  readonly: boolean;
}>;

type Ignorable<T> = { ignore: true } | ({ ignore: false } & T);

/**
 * Parses the user-supplied config and filters out any schemas that do not exist in the database.
 */
export function parseForDatabase(
  config: DatabaseSchemaConfig,
  schemas: Schema[],
): ParsedDatabaseSchemaConfig {
  const userProvidedSchemas = Object.keys(config.schema_configs);
  const databaseSchemasMap = new Map<string, Schema>(
    schemas.map((schema) => [schema.name, schema]),
  );

  if (userProvidedSchemas.length === 0) {
    return EmptyConfigs.parsedDatabaseConfig;
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

  const configMap = new Map<string, ParsedColumnConfig>(
    filteredConfig.map(([key, columnConfig]) => {
      if (columnConfig.ignore === true) {
        return [key, { ignore: true }];
      } else {
        const parsedColumnConfig: ParsedColumnConfig = {
          ignore: false,
          readonly:
            columnConfig.readonly === undefined ? false : columnConfig.readonly,
        };

        return [key, parsedColumnConfig];
      }
    }),
  );

  return {
    ignore: false,
    column_configs: configMap,
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
