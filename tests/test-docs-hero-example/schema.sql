CREATE TABLE penguins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  waddle_speed_kph NUMERIC NOT NULL,
  date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL
);
