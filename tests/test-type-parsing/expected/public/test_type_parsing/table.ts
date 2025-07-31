import { z } from "zod";
import { type ListSqlToken, sql } from "slonik";
import * as Postgres from "../../postgres";
import * as Enums from "../enums";
import * as Domains from "../domains";
import * as Ranges from "../ranges";

export const row = z.object({
  id: z.number().brand<"public.test_type_parsing.id">(),
  a_bigint: z.bigint(),
  a_bigserial: z.bigint(),
  a_bit: z.string(),
  a_varbit: z.string(),
  a_boolean: z.boolean(),
  a_box: z.any(),
  a_bytea: z.instanceof(Buffer),
  a_char: z.string(),
  a_varchar: z.string(),
  a_cidr: z.string(),
  a_circle: z.any(),
  a_date: z.string(),
  a_float8: z.number(),
  a_inet: z.string(),
  a_int: z.number(),
  a_interval: z.any(),
  a_json: Postgres.Schemas.json,
  a_jsonb: Postgres.Schemas.json,
  a_line: z.any(),
  a_lseg: z.any(),
  a_macaddr: z.string(),
  a_macaddr8: z.string(),
  a_money: z.string(),
  a_numeric: z.number(),
  a_path: z.any(),
  a_pg_lsn: z.string(),
  a_pg_snapshot: z.string(),
  a_point: z.any(),
  a_polygon: z.any(),
  a_real: z.number(),
  a_smallint: z.number(),
  a_smallserial: z.number(),
  a_serial: z.number(),
  a_text: z.string(),
  a_time: z.string(),
  a_timetz: z.string(),
  a_timestamp: z.date(),
  a_timestamptz: z.date(),
  a_tsquery: z.string(),
  a_tsvector: z.string(),
  a_uuid: z.string(),
  a_xml: z.string(),
  a_enum: Enums.Schemas.myEnum,
  a_text_short: Domains.Schemas.textShort,
  a_float_range: Ranges.Schemas.floatRange,
  a_int4range: Postgres.Schemas.int4range,
  a_int8range: Postgres.Schemas.int8range,
  a_numrange: Postgres.Schemas.numrange,
  a_tsrange: Postgres.Schemas.tsrange,
  a_tstzrange: Postgres.Schemas.tstzrange,
  a_daterange: Postgres.Schemas.daterange,
  a_composite_type: z.any(),
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["public", "test_type_parsing"]);

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
