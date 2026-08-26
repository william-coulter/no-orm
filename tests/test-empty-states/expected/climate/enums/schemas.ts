import { z } from "zod";

export const condition = z.union([
  z.literal("clear"),
  z.literal("overcast"),
  z.literal("storm"),
]);
