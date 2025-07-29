import { z } from "zod";
import { Range } from "postgres-range";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ]),
);

// STARTHERE: Use this approach for built-in Ranges.
export const timestampRangeSchema = z.custom<Range<Date>>(
  (val) =>
    val instanceof Range &&
    (val.upper instanceof Date || val.lower instanceof Date),
  {
    message: "Expected a Range<Date>",
  },
);

export type TimestampRange = z.infer<typeof timestampRangeSchema>;

export function postgresRangeSerializer(value: any): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
