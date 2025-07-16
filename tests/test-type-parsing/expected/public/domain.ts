import { z } from "zod";

export const myEnumEnumSchema = z.union([
  z.literal("a_value"),
  z.literal("another_value"),
]);

export type MyEnumEnum = z.infer<typeof myEnumEnumSchema>;
