import { z } from "zod";

export namespace Schemas {
  export const floatRange = z.string().brand<"public.ranges.float_range">();
}

export namespace Types {
  export type FloatRange = z.infer<typeof Schemas.floatRange>;
}
