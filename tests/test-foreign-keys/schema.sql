CREATE TABLE penguins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  waddle_speed_kph NUMERIC NOT NULL,
  favourite_snack TEXT,
  date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE flight_attempts (
  id SERIAL PRIMARY KEY,
  penguin INT NOT NULL REFERENCES penguins(id),
  method TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  altitude_cm INT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,

  CHECK (
    success = TRUE OR failure_reason IS NOT NULL
  )
);
