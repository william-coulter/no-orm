CREATE TABLE penguins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  waddle_speed_kph NUMERIC NOT NULL,
  favourite_snack TEXT,
  date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL,

  ignore_column BOOLEAN,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON penguins(name, species);

CREATE TYPE flight_attempt_method AS ENUM (
  'glider',
  'ski_jump',
  'jet_pack'
);

CREATE TABLE flight_attempts (
  id SERIAL PRIMARY KEY,
  penguin INT NOT NULL REFERENCES penguins(id),
  method flight_attempt_method NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  altitude_cm INT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CHECK (
    success = TRUE OR failure_reason IS NOT NULL
  )
);

CREATE INDEX ON flight_attempts (penguin);

CREATE TABLE ignore_table (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON penguins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON flight_attempts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
