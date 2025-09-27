import { z } from "zod";
import { DatabaseSchemaConfig, databaseSchemaConfigSchema } from "./schema";

/**
 * The configuration for the no-orm CLI tool.
 */
export type NoOrmConfig = {
  /**
   * A Postgres connection string that `no-orm` will read from to generate outputs.
   *
   * Default: `postgres://postgres:postgres@localhost:5432/postgres`.
   */
  readonly postgres_connection_string?: string;

  /**
   * The directory where `no-orm` will save its generated outputs.
   *
   * Default: `no-orm`.
   */
  readonly output_directory?: string;

  /**
   * Define custom behaviour for how `no-orm` reads your database schema.
   *
   * Default: The `no-orm` default options will be applied to every schema.
   */
  readonly database_schema_config?: DatabaseSchemaConfig;
};

/** The parser for `no-orm` config. */
export const noOrmConfigSchema = z.object({
  postgres_connection_string: z.string().optional(),
  output_directory: z.string().optional(),
  database_schema_config: databaseSchemaConfigSchema.optional(),
});
