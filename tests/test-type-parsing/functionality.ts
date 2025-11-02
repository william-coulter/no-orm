/** Tests that the functions from `model` execute without errors against the DB. */
import { z } from "zod";
import { Range } from "postgres-range";
import { default as parseInterval } from "postgres-interval";
import { createDatabasePool } from "../slonik-test-connection";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";
import * as Domains from "./expected/public/domains";
import * as Ranges from "./expected/public/ranges";
import * as Tables from "./expected/public/tables";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  const create = await Tables.TestTypeParsing.create({
    connection,
    shape: {
      a_bigint: BigInt(1234567890), // Purposely a JS supported value (and therefore Postgres bigint type).
      a_bigserial: BigInt(1),
      a_bit: "10101010",
      a_varbit: "1010101010101010",
      a_boolean: true,
      a_box: "((0,0),(1,1))",
      a_bytea: Buffer.from("\\xDEADBEEF", "hex"),
      a_char: "abcdefghij",
      a_varchar: "hello world",
      a_cidr: "192.168.0.0/24",
      a_circle: "<(0,0),10>",
      a_date: "2025-01-01",
      a_float8: 3.14159265359,
      a_inet: "192.168.0.1",
      a_int: 2147483647,
      a_interval: parseInterval("1 year 2 mons 3 days 04:05:06"),
      a_json: { hello: "world" },
      a_jsonb: { type: "example" },
      a_line: "{1,2,3}",
      a_lseg: "[(0,0),(1,1)]",
      a_macaddr: "08:00:2b:01:02:03",
      a_macaddr8: "08:00:2b:ff:fe:01:02:03",
      a_money: "1234.56",
      a_numeric: 9876.54,
      a_path: "((0,0),(1,1),(2,0))",
      a_pg_lsn: "0/16B6C50",
      a_pg_snapshot: "00000001:00000003:00000002",
      a_point: "(1.5,2.5)",
      a_polygon: "((0,0),(1,1),(1,0))",
      a_real: 1.23,
      a_smallint: 32767,
      a_smallserial: 1,
      a_serial: 1,
      a_text: "Lorem ipsum dolor sit amet.",
      a_time: "13:45:30",
      a_timetz: "13:45:30+10",
      a_timestamp: new Date("2025-01-01T13:45:30"),
      a_timestamptz: new Date("2025-01-01T13:45:30Z"),
      a_tsquery: "world:* & !hello",
      a_tsvector: "'hello':1 'world':2",
      a_uuid: "123e4567-e89b-12d3-a456-426614174000",
      a_xml: "<root><item>Value</item></root>",
      a_enum: "a_value",
      a_text_short: parseTextShortDomain("a_text_short"),
      a_float_range: Ranges.Schemas.floatRange.parse("[1.0,5.0)"),
      a_int4range: new Range<number>(1, 5, 4),
      a_int8range: new Range<string>(
        "90071992547409910",
        "90071992547409919",
        4,
      ),
      a_numrange: new Range<number>(1.5, 2.5, 4),
      a_tsrange: new Range<Date>(
        new Date("2025-01-01 00:00:00"),
        new Date("2025-01-02 00:00:00"),
        4,
      ),
      a_tstzrange: new Range<Date>(
        new Date("2025-01-01 00:00:00+10"),
        new Date("2025-01-02 00:00:00+10"),
        4,
      ),
      a_daterange: new Range<string>("2025-01-01", "2025-01-05", 4),
    },
  });

  const read = await Tables.TestTypeParsing.get({
    connection,
    id: create.not_called_id,
  });

  const update = await Tables.TestTypeParsing.update({
    connection,
    newRow: {
      not_called_id: read.not_called_id,
      a_bigint: BigInt(9876543210),
      a_bigserial: BigInt(2),
      a_bit: "11001100",
      a_varbit: "1100110011001100",
      a_boolean: false,
      a_box: "((1,1),(2,2))",
      a_bytea: Buffer.from("CAFEBABE", "hex"),
      a_char: "zyxwvutsrq",
      a_varchar: "goodbye world",
      a_cidr: "10.0.0.0/8",
      a_circle: "<(1,1),5>",
      a_date: "2030-12-31",
      a_float8: 2.71828182846,
      a_inet: "10.0.0.1",
      a_int: -2147483648,
      a_interval: parseInterval("04:00:00"),
      a_json: ["foo", 42, null],
      a_jsonb: { updated: true, count: 5 },
      a_line: "{4,5,6}",
      a_lseg: "[(1,1),(2,2)]",
      a_macaddr: "aa:bb:cc:dd:ee:ff",
      a_macaddr8: "aa:bb:cc:dd:ee:ff:00:11",
      a_money: "6543.21",
      a_numeric: 1234.56,
      a_path: "((3,3),(4,4),(5,5))",
      a_pg_lsn: "0/1ABCDEF0",
      a_pg_snapshot: "00000005:00000007:00000006",
      a_point: "(3.5,4.5)",
      a_polygon: "((2,2),(3,3),(4,4))",
      a_real: 4.56,
      a_smallint: -32768,
      a_smallserial: 2,
      a_serial: 2,
      a_text: "Updated text content.",
      a_time: "23:59:59",
      a_timetz: "23:59:59-05",
      a_timestamp: new Date("2030-12-31T23:59:59"),
      a_timestamptz: new Date("2030-12-31T23:59:59Z"),
      a_tsquery: "updated:* & !deleted",
      a_tsvector: "'updated':1 'content':2",
      a_uuid: "321e6547-b98e-21d3-b654-526614174111",
      a_xml: "<updated><item>Changed</item></updated>",
      a_enum: "another_value",
      a_text_short: parseTextShortDomain("another_text_short"),
      a_float_range: Ranges.Schemas.floatRange.parse("[2.0,5.0)"),
      a_int4range: new Range<number>(3, 10, 4),
      a_int8range: new Range<string>("300", "400", 4),
      a_numrange: new Range<number>(2.5, 3.5, 4),
      a_tsrange: new Range<Date>(
        new Date("2025-01-01 00:00:00"),
        new Date("2025-05-20 00:00:00"),
        4,
      ),
      a_tstzrange: new Range<Date>(
        new Date("2025-01-01 00:00:00+10"),
        new Date("2025-05-20 00:00:00+10"),
        4,
      ),
      a_daterange: new Range<string>("2025-01-01", "2025-05-20", 4),
    },
  });

  const _delete = await Tables.TestTypeParsing.delete({
    connection,
    id: update.not_called_id,
  });
});

process.exit(0);

// User-defined parser for the domain.
function parseTextShortDomain(value: string): Domains.Types.TextShort {
  const parser = z.string().max(255);
  const validated = parser.parse(value);
  return Domains.Schemas.textShort.parse(validated);
}
