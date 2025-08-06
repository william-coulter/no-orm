import { z } from "zod";

import { NoOrmConfig, noOrmConfigSchema } from ".";

/** Will fail compilation if the `NoOrmConfig` type and `noOrmConfigSchema` diverge. */
assert<TypeEqualityGuard<NoOrmConfig, z.infer<typeof noOrmConfigSchema>>>();
function assert<T extends never>() {}
type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
