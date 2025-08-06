import { z } from "zod";

export type PostgresSchema = string;
export type PostgresTable = string;
export type SchemaConfigValue = Record<PostgresTable, TableConfigValue>;
export type TableConfigValue = {
  readonly_columns: string[];
  ignored_columns: string[];
};

export const tableConfigValueSchema = z.object({
  readonly_columns: z.array(z.string()),
  ignored_columns: z.array(z.string()),
});
export const schemaConfigValueSchema = z.record(
  z.string(),
  tableConfigValueSchema,
);
export const schemaConfigsSchema = z.record(
  z.string(),
  schemaConfigValueSchema,
);
