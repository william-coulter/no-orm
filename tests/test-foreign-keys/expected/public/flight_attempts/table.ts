import { z } from "zod";
import { type ListSqlToken, sql } from "slonik";

export const row = z.object({
  id: z.number().brand<"public.flight_attempts.id">(),
  penguin: z.number().brand<"public.penguins.id">(),
  method: z.string(),
  attempted_at: z.date(),
  altitude_cm: z.number(),
  success: z.boolean(),
  failure_reason: z.string().nullable(),
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["public", "flight_attempts"]);

export const columns = Object.keys(row.shape).map((col) =>
  sql.identifier([col]),
);

export const columnsFragment = sql.join(columns, sql.fragment`, `);

export function aliasColumns(alias: string): ListSqlToken {
  const aliasedColumns = Object.keys(row.shape).map((col) =>
    sql.identifier([alias, col]),
  );

  return sql.join(aliasedColumns, sql.fragment`, `);
}
