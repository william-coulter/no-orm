import { z } from "zod";

export type DatabaseSchemaConfig = {
  schema_configs: Record<string, SchemaConfig>;
  ignore?: boolean;
};
export type SchemaConfig = {
  table_configs: Record<string, TableConfig>;
  ignore?: boolean;
};
export type TableConfig = {
  column_configs: Record<string, ColumnConfig>;
  ignore?: boolean;
};
export type ColumnConfig = {
  readonly?: boolean;
  ignore?: boolean;
};

export const tableConfigSchema = z.object({
  readonly_columns: z.array(z.string()),
  ignored_columns: z.array(z.string()),
});
export const schemaConfigSchema = z.record(z.string(), tableConfigSchema);
export const schemaConfigsSchema = z.record(z.string(), schemaConfigSchema);
