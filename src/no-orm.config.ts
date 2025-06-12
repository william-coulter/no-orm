import z from "zod";

export const noOrmConfigSchema = z.object({
  postgres_connection_string: z.string(),
  output_directory: z.string(),
});

export type NoOrmConfig = z.infer<typeof noOrmConfigSchema>;
