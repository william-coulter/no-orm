import { z } from "zod";

import { NoOrmConfig, noOrmConfigSchema } from ".";
import {
  ColumnConfig,
  columnConfigSchema,
  DatabaseSchemaConfig,
  databaseSchemaConfigSchema,
  SchemaConfig,
  schemaConfigSchema,
  TableConfig,
  tableConfigSchema,
} from "./schema";

/**
 * Exact structural type equality, defeating union distribution by wrapping each side in a
 * function type. Unlike a plain `Exclude<A, B> | Exclude<B, A>` check, this catches divergence
 * anywhere in the structure of `A`/`B` — including nested objects — not just at the top level.
 */
type TypeEqualityGuard<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

function assert<_T extends true>() {}

/** Will fail compilation if the `NoOrmConfig` type and `noOrmConfigSchema` diverge. */
assert<TypeEqualityGuard<NoOrmConfig, z.infer<typeof noOrmConfigSchema>>>();

/** Will fail compilation if the `DatabaseSchemaConfig` type and `databaseSchemaConfigSchema` diverge. */
assert<
  TypeEqualityGuard<
    DatabaseSchemaConfig,
    z.infer<typeof databaseSchemaConfigSchema>
  >
>();

/** Will fail compilation if the `SchemaConfig` type and `schemaConfigSchema` diverge. */
assert<TypeEqualityGuard<SchemaConfig, z.infer<typeof schemaConfigSchema>>>();

/** Will fail compilation if the `TableConfig` type and `tableConfigSchema` diverge. */
assert<TypeEqualityGuard<TableConfig, z.infer<typeof tableConfigSchema>>>();

/** Will fail compilation if the `ColumnConfig` type and `columnConfigSchema` diverge. */
assert<TypeEqualityGuard<ColumnConfig, z.infer<typeof columnConfigSchema>>>();
