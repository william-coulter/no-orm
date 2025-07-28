import { z } from "zod";

export namespace Schemas {
  export const builtInRange = z
    .string()
    .brand<"pg_catalog.ranges.built_in_range">();

  export const floatRange = z.string().brand<"public.ranges.float_range">();
}

export namespace Types {
  export type BuiltInRange = z.infer<typeof Schemas.builtInRange>;

  export type FloatRange = z.infer<typeof Schemas.floatRange>;
}
