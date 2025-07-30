import { z } from "zod";
import { Range } from "postgres-range";

export namespace Schemas {
  export const json: z.ZodType<Types.Json> = z.lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(json),
      z.record(json),
    ]),
  );

  export const int4range = z.custom<Range<number>>(
    (val) =>
      val instanceof Range &&
      (typeof val.lower === "number" || typeof val.upper === "number"),
    {
      message: "Expected a Range<number> (int4range)",
    },
  );

  export const int8range = z.custom<Range<string>>(
    (val) =>
      val instanceof Range &&
      (typeof val.lower === "string" || typeof val.upper === "string"),
    {
      message: "Expected a Range<string> (int8range)",
    },
  );

  export const numrange = z.custom<Range<number>>(
    (val) =>
      val instanceof Range &&
      (typeof val.lower === "number" || typeof val.upper === "number"),
    {
      message: "Expected a Range<number> (numrange)",
    },
  );

  export const tsrange = z.custom<Range<Date>>(
    (val) =>
      val instanceof Range &&
      (val.lower instanceof Date || val.upper instanceof Date),
    {
      message: "Expected a Range<Date> (tsrange)",
    },
  );

  export const tstzrange = z.custom<Range<Date>>(
    (val) =>
      val instanceof Range &&
      (val.upper instanceof Date || val.lower instanceof Date),
    {
      message: "Expected a Range<Date> (tstzrange)",
    },
  );

  export const daterange = z.custom<Range<string>>(
    (val) =>
      val instanceof Range &&
      (typeof val.lower === "string" || typeof val.upper === "string"),
    {
      message: "Expected a Range<string> (daterange)",
    },
  );
}

export namespace Types {
  export type Json =
    | string
    | number
    | boolean
    | null
    | Json[]
    | { [key: string]: Json };

  export type Int4range = z.infer<typeof Schemas.int4range>;

  export type Int8range = z.infer<typeof Schemas.int8range>;

  export type Numrange = z.infer<typeof Schemas.numrange>;

  export type Tsrange = z.infer<typeof Schemas.tsrange>;

  export type Tstzrange = z.infer<typeof Schemas.tstzrange>;

  export type Daterange = z.infer<typeof Schemas.daterange>;
}

export namespace Serializers {
  /** Serialises a Postgres `Range<T>` into a string that can be stored in the database. */
  export function range(value: any): string {
    return value instanceof Date ? value.toISOString() : String(value);
  }
}
