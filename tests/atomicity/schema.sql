-- This schema will cause `no-orm generate` to fail.

CREATE TABLE penguins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  waddle_speed_kph NUMERIC NOT NULL,
  favourite_snack TEXT, -- Optional: not all penguins have refined palates.
  date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TYPE equipment AS (
  name TEXT,
  supplier_id INTEGER,
  price NUMERIC
);

CREATE TABLE penguin_inventory (
  id SERIAL PRIMARY KEY,
  penguin INT NOT NULL REFERENCES penguins(id),
  item equipment NOT NULL,

  UNIQUE (penguin, item)
);
