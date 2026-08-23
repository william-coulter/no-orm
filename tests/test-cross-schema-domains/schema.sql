-- Two non-public schemas, each defining its own domain, with a table in each schema whose
-- column is typed as the *other* schema's domain. This is the shape that reproduces the
-- "type ... does not exist" failure: a bare (unqualified) domain name in an `UNNEST` cast only
-- resolves when the domain's schema happens to be on `search_path`, which a genuine cross-schema
-- reference defeats.
CREATE SCHEMA colony;
CREATE SCHEMA feeding;

CREATE DOMAIN colony.band_code AS TEXT
  CONSTRAINT band_code_length CHECK (char_length(VALUE) = 3);

CREATE DOMAIN feeding.fish_count AS INTEGER
  CONSTRAINT fish_count_non_negative CHECK (VALUE >= 0);

-- Lives in `colony`, but its `fish_ration` column is typed as `feeding`'s domain.
CREATE TABLE colony.chicks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  fish_ration feeding.fish_count NOT NULL
);

-- Lives in `feeding`, but its `recipient_band` column is typed as `colony`'s domain.
CREATE TABLE feeding.deliveries (
  id SERIAL PRIMARY KEY,
  courier TEXT NOT NULL,
  recipient_band colony.band_code NOT NULL
);
