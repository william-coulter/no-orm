import { z } from "zod";

export namespace Schemas {
  export const myEnum = z.union([
    z.literal("a_value"),
    z.literal("another_value"),
  ]);
}

export namespace Types {
  export type MyEnum = z.infer<typeof Schemas.myEnum>;
}
