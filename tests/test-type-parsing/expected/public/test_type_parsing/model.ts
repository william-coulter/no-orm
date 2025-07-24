import { type CommonQueryMethods, sql } from "slonik";
import {
  type Id,
  type Row,
  aliasColumns,
  columnsFragment,
  row,
  tableFragment,
} from "./table";
import { z } from "zod";
import { jsonValue } from "../../parsers";
import * as Enums from "../enums";
import * as Domains from "../domains";

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  a_bigint: bigint;
  a_bigserial: bigint;
  a_bit: string;
  a_varbit: string;
  a_boolean: boolean;
  a_box: any;
  a_bytea: Buffer;
  a_char: string;
  a_varchar: string;
  a_cidr: string;
  a_circle: any;
  a_date: string;
  a_float8: number;
  a_inet: string;
  a_int: number;
  a_interval: any;
  a_json: z.infer<typeof jsonValue>;
  a_jsonb: z.infer<typeof jsonValue>;
  a_line: any;
  a_lseg: any;
  a_macaddr: string;
  a_macaddr8: string;
  a_money: string;
  a_numeric: number;
  a_path: any;
  a_pg_lsn: string;
  a_pg_snapshot: string;
  a_point: any;
  a_polygon: any;
  a_real: number;
  a_smallint: number;
  a_smallserial: number;
  a_serial: number;
  a_text: string;
  a_time: string;
  a_timetz: string;
  a_timestamp: Date;
  a_timestamptz: Date;
  a_tsquery: string;
  a_tsvector: string;
  a_uuid: string;
  a_xml: string;
  a_enum: Enums.Types.MyEnum;
  a_text_short: Domains.Types.TextShort;
  a_float_range: string;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const tuples = shapes.map((shape) => [
    shape.a_bigint,
    shape.a_bigserial,
    shape.a_bit,
    shape.a_varbit,
    shape.a_boolean,
    shape.a_box,
    shape.a_bytea,
    shape.a_char,
    shape.a_varchar,
    shape.a_cidr,
    shape.a_circle,
    shape.a_date,
    shape.a_float8,
    shape.a_inet,
    shape.a_int,
    shape.a_interval,
    JSON.stringify(shape.a_json),
    JSON.stringify(shape.a_jsonb),
    shape.a_line,
    shape.a_lseg,
    shape.a_macaddr,
    shape.a_macaddr8,
    shape.a_money,
    shape.a_numeric,
    shape.a_path,
    shape.a_pg_lsn,
    shape.a_pg_snapshot,
    shape.a_point,
    shape.a_polygon,
    shape.a_real,
    shape.a_smallint,
    shape.a_smallserial,
    shape.a_serial,
    shape.a_text,
    shape.a_time,
    shape.a_timetz,
    shape.a_timestamp.toISOString(),
    shape.a_timestamptz.toISOString(),
    shape.a_tsquery,
    shape.a_tsvector,
    shape.a_uuid,
    shape.a_xml,
    shape.a_enum,
    shape.a_text_short,
    shape.a_float_range,
  ]);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      a_bigint,
      a_bigserial,
      a_bit,
      a_varbit,
      a_boolean,
      a_box,
      a_bytea,
      a_char,
      a_varchar,
      a_cidr,
      a_circle,
      a_date,
      a_float8,
      a_inet,
      a_int,
      a_interval,
      a_json,
      a_jsonb,
      a_line,
      a_lseg,
      a_macaddr,
      a_macaddr8,
      a_money,
      a_numeric,
      a_path,
      a_pg_lsn,
      a_pg_snapshot,
      a_point,
      a_polygon,
      a_real,
      a_smallint,
      a_smallserial,
      a_serial,
      a_text,
      a_time,
      a_timetz,
      a_timestamp,
      a_timestamptz,
      a_tsquery,
      a_tsvector,
      a_uuid,
      a_xml,
      a_enum,
      a_text_short,
      a_float_range
    )
    SELECT a_bigint, a_bigserial, a_bit, a_varbit, a_boolean, a_box, a_bytea, a_char, a_varchar, a_cidr, a_circle, a_date, a_float8, a_inet, a_int, a_interval, a_json, a_jsonb, a_line, a_lseg, a_macaddr, a_macaddr8, a_money, a_numeric, a_path, a_pg_lsn, a_pg_snapshot, a_point, a_polygon, a_real, a_smallint, a_smallserial, a_serial, a_text, a_time, a_timetz, a_timestamp, a_timestamptz, a_tsquery, a_tsvector, a_uuid, a_xml, a_enum, a_text_short, a_float_range
    FROM ${sql.unnest(tuples, ["int8", "int8", "bit", "varbit", "bool", "box", "bytea", "bpchar", "varchar", "cidr", "circle", "date", "float8", "inet", "int4", "interval", "json", "jsonb", "line", "lseg", "macaddr", "macaddr8", "money", "numeric", "path", "pg_lsn", "pg_snapshot", "point", "polygon", "float4", "int2", "int2", "int4", "text", "time", "timetz", "timestamp", "timestamptz", "tsquery", "tsvector", "uuid", "xml", "my_enum", "text_short", "float_range"])}
      AS input(a_bigint, a_bigserial, a_bit, a_varbit, a_boolean, a_box, a_bytea, a_char, a_varchar, a_cidr, a_circle, a_date, a_float8, a_inet, a_int, a_interval, a_json, a_jsonb, a_line, a_lseg, a_macaddr, a_macaddr8, a_money, a_numeric, a_path, a_pg_lsn, a_pg_snapshot, a_point, a_polygon, a_real, a_smallint, a_smallserial, a_serial, a_text, a_time, a_timetz, a_timestamp, a_timestamptz, a_tsquery, a_tsvector, a_uuid, a_xml, a_enum, a_text_short, a_float_range)
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}

export type CreateArgs = BaseArgs & { shape: Create };

export async function create({ connection, shape }: CreateArgs): Promise<Row> {
  const result = await createMany({ connection, shapes: [shape] });
  return result[0];
}

export type GetManyArgs = BaseArgs & { ids: Id[] };

export async function getMany({
  connection,
  ids,
}: GetManyArgs): Promise<readonly Row[]> {
  const query = sql.type(row)`
    SELECT ${columnsFragment}
    FROM ${tableFragment}
    WHERE id = ANY(${sql.array(ids, "int4")})`;

  return connection.any(query);
}

type GetArgs = BaseArgs & { id: Id };

export async function get({ connection, id }: GetArgs): Promise<Row> {
  const result = await getMany({ connection, ids: [id] });
  return result[0];
}

export type Update = {
  a_bigint: bigint;
  a_bigserial: bigint;
  a_bit: string;
  a_varbit: string;
  a_boolean: boolean;
  a_box: any;
  a_bytea: Buffer;
  a_char: string;
  a_varchar: string;
  a_cidr: string;
  a_circle: any;
  a_date: string;
  a_float8: number;
  a_inet: string;
  a_int: number;
  a_interval: any;
  a_json: z.infer<typeof jsonValue>;
  a_jsonb: z.infer<typeof jsonValue>;
  a_line: any;
  a_lseg: any;
  a_macaddr: string;
  a_macaddr8: string;
  a_money: string;
  a_numeric: number;
  a_path: any;
  a_pg_lsn: string;
  a_pg_snapshot: string;
  a_point: any;
  a_polygon: any;
  a_real: number;
  a_smallint: number;
  a_smallserial: number;
  a_serial: number;
  a_text: string;
  a_time: string;
  a_timetz: string;
  a_timestamp: Date;
  a_timestamptz: Date;
  a_tsquery: string;
  a_tsvector: string;
  a_uuid: string;
  a_xml: string;
  a_enum: Enums.Types.MyEnum;
  a_text_short: Domains.Types.TextShort;
  a_float_range: string;
} & { id: Id };

export type UpdateManyArgs = BaseArgs & { newRows: Update[] };

export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const tuples = newRows.map((newRow) => [
    newRow.id,
    newRow.a_bigint,
    newRow.a_bigserial,
    newRow.a_bit,
    newRow.a_varbit,
    newRow.a_boolean,
    newRow.a_box,
    newRow.a_bytea,
    newRow.a_char,
    newRow.a_varchar,
    newRow.a_cidr,
    newRow.a_circle,
    newRow.a_date,
    newRow.a_float8,
    newRow.a_inet,
    newRow.a_int,
    newRow.a_interval,
    JSON.stringify(newRow.a_json),
    JSON.stringify(newRow.a_jsonb),
    newRow.a_line,
    newRow.a_lseg,
    newRow.a_macaddr,
    newRow.a_macaddr8,
    newRow.a_money,
    newRow.a_numeric,
    newRow.a_path,
    newRow.a_pg_lsn,
    newRow.a_pg_snapshot,
    newRow.a_point,
    newRow.a_polygon,
    newRow.a_real,
    newRow.a_smallint,
    newRow.a_smallserial,
    newRow.a_serial,
    newRow.a_text,
    newRow.a_time,
    newRow.a_timetz,
    newRow.a_timestamp.toISOString(),
    newRow.a_timestamptz.toISOString(),
    newRow.a_tsquery,
    newRow.a_tsvector,
    newRow.a_uuid,
    newRow.a_xml,
    newRow.a_enum,
    newRow.a_text_short,
    newRow.a_float_range,
  ]);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      a_bigint = input.a_bigint,
      a_bigserial = input.a_bigserial,
      a_bit = input.a_bit,
      a_varbit = input.a_varbit,
      a_boolean = input.a_boolean,
      a_box = input.a_box,
      a_bytea = input.a_bytea,
      a_char = input.a_char,
      a_varchar = input.a_varchar,
      a_cidr = input.a_cidr,
      a_circle = input.a_circle,
      a_date = input.a_date,
      a_float8 = input.a_float8,
      a_inet = input.a_inet,
      a_int = input.a_int,
      a_interval = input.a_interval,
      a_json = input.a_json,
      a_jsonb = input.a_jsonb,
      a_line = input.a_line,
      a_lseg = input.a_lseg,
      a_macaddr = input.a_macaddr,
      a_macaddr8 = input.a_macaddr8,
      a_money = input.a_money,
      a_numeric = input.a_numeric,
      a_path = input.a_path,
      a_pg_lsn = input.a_pg_lsn,
      a_pg_snapshot = input.a_pg_snapshot,
      a_point = input.a_point,
      a_polygon = input.a_polygon,
      a_real = input.a_real,
      a_smallint = input.a_smallint,
      a_smallserial = input.a_smallserial,
      a_serial = input.a_serial,
      a_text = input.a_text,
      a_time = input.a_time,
      a_timetz = input.a_timetz,
      a_timestamp = input.a_timestamp,
      a_timestamptz = input.a_timestamptz,
      a_tsquery = input.a_tsquery,
      a_tsvector = input.a_tsvector,
      a_uuid = input.a_uuid,
      a_xml = input.a_xml,
      a_enum = input.a_enum,
      a_text_short = input.a_text_short,
      a_float_range = input.a_float_range
    FROM ${sql.unnest(tuples, [
      "int4",
      "int8",
      "int8",
      "bit",
      "varbit",
      "bool",
      "box",
      "bytea",
      "bpchar",
      "varchar",
      "cidr",
      "circle",
      "date",
      "float8",
      "inet",
      "int4",
      "interval",
      "json",
      "jsonb",
      "line",
      "lseg",
      "macaddr",
      "macaddr8",
      "money",
      "numeric",
      "path",
      "pg_lsn",
      "pg_snapshot",
      "point",
      "polygon",
      "float4",
      "int2",
      "int2",
      "int4",
      "text",
      "time",
      "timetz",
      "timestamp",
      "timestamptz",
      "tsquery",
      "tsvector",
      "uuid",
      "xml",
      "my_enum",
      "text_short",
      "float_range",
    ])} AS input(id, a_bigint, a_bigserial, a_bit, a_varbit, a_boolean, a_box, a_bytea, a_char, a_varchar, a_cidr, a_circle, a_date, a_float8, a_inet, a_int, a_interval, a_json, a_jsonb, a_line, a_lseg, a_macaddr, a_macaddr8, a_money, a_numeric, a_path, a_pg_lsn, a_pg_snapshot, a_point, a_polygon, a_real, a_smallint, a_smallserial, a_serial, a_text, a_time, a_timetz, a_timestamp, a_timestamptz, a_tsquery, a_tsvector, a_uuid, a_xml, a_enum, a_text_short, a_float_range)
    WHERE t.id = input.id
    RETURNING ${aliasColumns("t")}`;

  return connection.any(query);
}

type UpdateArgs = BaseArgs & { newRow: Update };

export async function update({ connection, newRow }: UpdateArgs): Promise<Row> {
  const result = await updateMany({ connection, newRows: [newRow] });
  return result[0];
}

export type DeleteManyArgs = BaseArgs & { ids: Id[] };

export async function deleteMany({
  connection,
  ids,
}: DeleteManyArgs): Promise<void> {
  const query = sql.type(row)`
    DELETE FROM ${tableFragment}
    WHERE id = ANY(${sql.array(ids, "int4")})`;

  await connection.query(query);
}

type DeleteArgs = BaseArgs & { id: Id };

async function _delete({ connection, id }: DeleteArgs): Promise<void> {
  await deleteMany({ connection, ids: [id] });
}

export { _delete as delete };
