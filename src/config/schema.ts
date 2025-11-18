import { z } from "zod";

import { Ignorable, ignorableSchema } from "./ignorable";

export type ColumnConfig = {
  /**
   * If `true`, the column will not be used in `create` or `update` operations. The
   * column will still exist on the `Row` data type. Ensure `readonly` columns are
   * `NOT NULL` and have a default value.
   *
   * Default: `false`.
   */
  readonly?: boolean;

  /**
   * If `true`, the column will be ignored by `no-orm` completely. It will not appear
   * in any data types however will still exist on the underlying Postgres schema.
   * This is useful for dropping columns.
   *
   * Default: `false`.
   */
  ignore?: boolean;
};

export const columnConfigSchema = z.object({
  readonly: z.boolean().optional(),
  ignore: z.boolean().optional(),
});

export type TableConfig = Ignorable<{
  /**
   * A map of column names to the column's config.
   */
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
  /**
   * A map of table names to the table's config.
   */
  table_configs: Record<string, TableConfig>;
}>;

export const schemaConfigSchema = ignorableSchema(
  z.object({
    table_configs: z.record(z.string(), tableConfigSchema),
  }),
);

export type DatabaseSchemaConfig = {
  /**
   * A map of schema names the schema's config.
   */
  schema_configs: Record<string, SchemaConfig>;
};

export const databaseSchemaConfigSchema = z.object({
  schema_configs: z.record(z.string(), schemaConfigSchema),
});
