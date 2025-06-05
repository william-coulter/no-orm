import z from "zod";

export const noOrmConfigSchema = z.object({
  database_url: z.string(),
});

export type NoOrmConfig = z.infer<typeof noOrmConfigSchema>;
