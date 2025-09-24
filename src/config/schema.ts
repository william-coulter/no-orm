import { z } from "zod";
import { Ignorable, ignorableSchema } from "./ignorable";

export type ColumnConfig = {
  // TODO: Add more comments.
  readonly?: boolean;
  ignore?: boolean;
};

export const columnConfigSchema = z.object({
  readonly: z.boolean().optional(),
  ignore: z.boolean().optional(),
});

export type TableConfig = Ignorable<{
  column_configs: Record<string, ColumnConfig>;
  /**
   * If `true`, the table will treat `created_at` and `updated_at` as readonly.
   *
   * Default: `true`.
   */
  readonly_time_columns?: boolean;
}>;

export const tableConfigSchema = ignorableSchema(
  z.object({
    column_configs: z.record(z.string(), columnConfigSchema),
  }),
);

export type SchemaConfig = Ignorable<{
  table_configs: Record<string, TableConfig>;
}>;

export const schemaConfigSchema = ignorableSchema(
  z.object({
    table_configs: z.record(z.string(), tableConfigSchema),
  }),
);

export type DatabaseSchemaConfig = {
  schema_configs: Record<string, SchemaConfig>;
};

export const databaseSchemaConfigSchema = z.object({
  schema_configs: z.record(z.string(), schemaConfigSchema),
});
