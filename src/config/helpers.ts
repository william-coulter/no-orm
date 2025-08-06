import { z } from "zod";
import { NoOrmConfig, noOrmConfigSchema } from ".";

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

/** Will fail compilation if the `NoOrmConfig` type and `noOrmConfigSchema` diverge. */
assert<TypeEqualityGuard<NoOrmConfig, z.infer<typeof noOrmConfigSchema>>>();
function assert<T extends never>() {}
type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
