import { z } from "zod";

export type ColumnConfig = {
  readonly?: boolean;
  ignore?: boolean;
};

export const columnConfigSchema = z.object({
  readonly: z.boolean().optional(),
  ignore: z.boolean().optional(),
});

export type TableConfig = {
  column_configs: Record<string, ColumnConfig>;
  ignore?: boolean;
};

export const tableConfigSchema = z.object({
  column_configs: z.record(z.string(), columnConfigSchema),
  ignore: z.boolean().optional(),
});

export type SchemaConfig = {
  table_configs: Record<string, TableConfig>;
  ignore?: boolean;
};

export const schemaConfigSchema = z.object({
  table_configs: z.record(z.string(), tableConfigSchema),
  ignore: z.boolean().optional(),
});

export type DatabaseSchemaConfig = {
  schema_configs: Record<string, SchemaConfig>;
};

export const databaseSchemaConfigSchema = z.object({
  schema_configs: z.record(z.string(), schemaConfigSchema),
});
