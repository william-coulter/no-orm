-- Schema with domains and enums but zero tables. Exercises the empty-barrel case (Bug 1):
-- something worth generating in the schema (Domains, Enums) but no Tables.
CREATE SCHEMA climate;

CREATE DOMAIN climate.temperature_celsius AS NUMERIC
  CONSTRAINT temperature_celsius_range CHECK (VALUE BETWEEN -60 AND 60);

CREATE TYPE climate.condition AS ENUM (
  'clear',
  'overcast',
  'storm'
);

-- A normal table. Must still be exported from `public/tables/index.ts` alongside the
-- schema's skipped tables below.
CREATE TABLE nests (
  id SERIAL PRIMARY KEY,
  location TEXT NOT NULL
);

-- No primary key: skipped by the parse loop. Must not appear in the tables barrel (Bug 2).
CREATE TABLE stragglers (
  spotted_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Ignored via `no-orm.config.ts`. Must not appear in the tables barrel either — the one
-- skip path that already worked correctly before this fix.
CREATE TABLE culled (
  id SERIAL PRIMARY KEY,
  reason TEXT NOT NULL
);

-- Every table in this schema is ignored via config: the combination of both bugs. The
-- tables barrel here must be `export {};`, and the schema barrel must still compile.
CREATE SCHEMA quarantine;

CREATE TABLE quarantine.isolated (
  id SERIAL PRIMARY KEY,
  notes TEXT NOT NULL
);
