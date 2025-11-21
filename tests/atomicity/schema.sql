CREATE TABLE penguins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  waddle_speed_kph NUMERIC NOT NULL,
  favourite_snack TEXT, -- Optional: not all penguins have refined palates.
  date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL,
  please_oh_god_throw_an_error TEXT
);
