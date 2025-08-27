import {
  ParsedDatabaseSchemaConfig,
  ParsedSchemaConfig,
  ParsedTableConfig,
} from "./parser";

export const parsedDatabaseConfig: ParsedDatabaseSchemaConfig = {
  schema_configs: new Map(),
};

export const parsedSchemaConfig: ParsedSchemaConfig = {
  ignore: false,
  table_configs: new Map(),
};

export const parsedTableConfig: ParsedTableConfig = {
  ignore: false,
  column_configs: new Map(),
};
