import {
  ParsedDatabaseConfig,
  ParsedSchemaConfig,
  ParsedTableConfig,
} from "./parser";

export const parsedDatabaseConfig: ParsedDatabaseConfig = {
  schema_configs: new Map(),
};

export const parsedSchemaConfig: ParsedSchemaConfig = {
  ignore: false,
  table_configs: new Map(),
};

export const parsedTableConfig: ParsedTableConfig = {
  ignore: false,
  ignored_columns: new Set(),
  readonly_columns: new Set(),
};
