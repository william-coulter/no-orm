import { z } from "zod";
import {
  PostgresSchema,
  SchemaConfigValue,
  schemaConfigsSchema,
} from "./helpers";

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
   */
  readonly output_directory: string;

  /**
   * A `Record` of schemas in your Postgres schema to their config.
   */
  readonly schema_configs: Record<PostgresSchema, SchemaConfigValue>;
};

/** The parser for `no-orm` config. */
export const noOrmConfigSchema = z.object({
  postgres_connection_string: z.string(),
  output_directory: z.string(),
  schema_configs: schemaConfigsSchema,
});
