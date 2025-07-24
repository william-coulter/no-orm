import { z } from "zod";

export namespace Schemas {
  // STARTHERE: Handle all range types as `strings`.
  //
  // Eventually we can build something like:
  // export type RangeType<T> = {
  //   /** If `null`, unbounded. */
  //   start: T | null;
  //   /** If `null`, unbounded. */
  //   end: T | null;
  //   inclusiveStart: boolean;
  //   inclusiveEnd: boolean;
  // };

  export const floatRange = z.string().brand<"public.ranges.float_range">();
}

export namespace Types {
  export type FloatRange = z.infer<typeof Schemas.floatRange>;
}

export type RangeType<T> = {
  /** If `null`, unbounded. */
  start: T | null;
  /** If `null`, unbounded. */
  end: T | null;
  inclusiveStart: boolean;
  inclusiveEnd: boolean;
};
