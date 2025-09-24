import {
  ParsedDatabaseConfig,
  ParsedSchemaConfig,
  ParsedTableConfig,
  TIME_COLUMNS,
} from "./parser";

export const parsedDatabaseConfig: ParsedDatabaseConfig = {
  schema_configs: new Map(),
};

export const parsedSchemaConfig: ParsedSchemaConfig = {
  ignore: false,
  table_configs: new Map(),
};

export function buildParsedTableConfig(
  readonly_time_columns: boolean,
): ParsedTableConfig {
  const readonlyColumns: Set<string> = readonly_time_columns
    ? new Set(TIME_COLUMNS)
    : new Set();

  return {
    ignore: false,
    ignored_columns: new Set(),
    readonly_columns: readonlyColumns,
  };
}
