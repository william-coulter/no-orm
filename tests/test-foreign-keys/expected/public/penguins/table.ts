import { z } from "zod";
import { type ListSqlToken, sql } from "slonik";

export const row = z.object({
  id: z.number().brand<"public.penguins.id">(),
  name: z.string(),
  species: z.string(),
  waddle_speed_kph: z.number(),
  favourite_snack: z.string().nullable(),
  date_of_birth: z.date(),
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["public", "penguins"]);

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
