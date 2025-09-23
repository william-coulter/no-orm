import { z } from "zod";

export type Ignorable<T> = { ignore: true } | ({ ignore?: false } & T);

export const ignorableSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([
    z.object({
      ignore: z.literal(true),
    }),
    z
      .object({
        ignore: z.literal(false).optional(),
      })
      .and(schema),
  ]);
