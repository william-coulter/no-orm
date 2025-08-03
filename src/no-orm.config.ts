import { z } from "zod";

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
};

/** The parser for `no-orm` config. */
export const noOrmConfigSchema = z.object({
  postgres_connection_string: z.string(),
  output_directory: z.string(),
});

/** Will fail compilation if the `NoOrmConfig` type and `noOrmConfigSchema` diverge. */
assert<TypeEqualityGuard<NoOrmConfig, z.infer<typeof noOrmConfigSchema>>>();
function assert<T extends never>() {}
type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
