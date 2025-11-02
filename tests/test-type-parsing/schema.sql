CREATE TYPE my_enum AS ENUM (
  'a_value',
  'another_value'
);

CREATE DOMAIN text_short AS TEXT
CONSTRAINT check_length
  CHECK (LENGTH(value) <= 255);

CREATE TYPE float_range AS RANGE (
    subtype = float8,
    subtype_diff = float8mi
);

CREATE TABLE test_type_parsing (
  not_called_id SERIAL PRIMARY KEY,

  a_bigint BIGINT NOT NULL,
  a_bigserial BIGSERIAL NOT NULL,
  a_bit BIT(8) NOT NULL,
  a_varbit BIT VARYING(16) NOT NULL,
  a_boolean BOOLEAN NOT NULL,
  a_box BOX NOT NULL,
  a_bytea BYTEA NOT NULL,
  a_char CHARACTER(10) NOT NULL,
  a_varchar CHARACTER VARYING(50) NOT NULL,
  a_cidr CIDR NOT NULL,
  a_circle CIRCLE NOT NULL,
  a_date DATE NOT NULL,
  a_float8 DOUBLE PRECISION NOT NULL,
  a_inet INET NOT NULL,
  a_int INTEGER NOT NULL,
  a_interval INTERVAL NOT NULL,
  a_json JSON NOT NULL,
  a_jsonb JSONB NOT NULL,
  a_line LINE NOT NULL,
  a_lseg LSEG NOT NULL,
  a_macaddr MACADDR NOT NULL,
  a_macaddr8 MACADDR8 NOT NULL,
  a_money MONEY NOT NULL,
  a_numeric NUMERIC(10, 2) NOT NULL,
  a_path PATH NOT NULL,
  a_pg_lsn PG_LSN NOT NULL,
  a_pg_snapshot PG_SNAPSHOT NOT NULL,
  a_point POINT NOT NULL,
  a_polygon POLYGON NOT NULL,
  a_real REAL NOT NULL,
  a_smallint SMALLINT NOT NULL,
  a_smallserial SMALLSERIAL NOT NULL,
  a_serial SERIAL NOT NULL,
  a_text TEXT NOT NULL,
  a_time TIME NOT NULL,
  a_timetz TIME WITH TIME ZONE NOT NULL,
  a_timestamp TIMESTAMP NOT NULL,
  a_timestamptz TIMESTAMP WITH TIME ZONE NOT NULL,
  a_tsquery TSQUERY NOT NULL,
  a_tsvector TSVECTOR NOT NULL,
  a_uuid UUID NOT NULL,
  a_xml XML NOT NULL,
  a_enum my_enum NOT NULL,
  a_text_short text_short NOT NULL,
  a_float_range float_range NOT NULL,
  a_int4range int4range NOT NULL,
  a_int8range int8range NOT NULL,
  a_numrange numrange NOT NULL,
  a_tsrange tsrange NOT NULL,
  a_tstzrange tstzrange NOT NULL,
  a_daterange daterange NOT NULL
);
