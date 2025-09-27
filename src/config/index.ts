import { z } from "zod";
import { DatabaseSchemaConfig, databaseSchemaConfigSchema } from "./schema";

/**
 * The configuration for the no-orm CLI tool.
 */
export type NoOrmConfig = {
  /**
   * A Postgres connection string that `no-orm` will read from to generate outputs.
   * E.g `postgres://postgres:postgres@localhost:5432/postgres`.
   */
  readonly postgres_connection_string: string;

  /**
   * The directory where `no-orm` will save its generated outputs.
   * TODO: Make me optional.
   */
  readonly output_directory: string;

  /**
   * Define custom behaviour for how `no-orm` reads your database schema.
   * TODO: Make me optional.
   */
  readonly database_schema_config: DatabaseSchemaConfig;
};

/** The parser for `no-orm` config. */
export const noOrmConfigSchema = z.object({
  postgres_connection_string: z.string(),
  output_directory: z.string(),
  database_schema_config: databaseSchemaConfigSchema,
});
