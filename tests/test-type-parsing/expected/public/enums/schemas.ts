import { z } from "zod";

export const myEnum = z.union([
  z.literal("a_value"),
  z.literal("another_value"),
]);
