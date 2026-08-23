-- Two non-public schemas, each defining its own domain, with a table in each schema whose
-- column is typed as the *other* schema's domain. This is the shape that reproduces the
-- "type ... does not exist" failure: a bare (unqualified) domain name in an `UNNEST` cast only
-- resolves when the domain's schema happens to be on `search_path`, which a genuine cross-schema
-- reference defeats.
CREATE SCHEMA billing;
CREATE SCHEMA inventory;

CREATE DOMAIN billing.currency_code AS TEXT
  CONSTRAINT currency_code_length CHECK (char_length(VALUE) = 3);

CREATE DOMAIN inventory.stock_level AS INTEGER
  CONSTRAINT stock_level_non_negative CHECK (VALUE >= 0);

-- Lives in `billing`, but its `quantity` column is typed as `inventory`'s domain.
CREATE TABLE billing.invoices (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL,
  quantity inventory.stock_level NOT NULL
);

-- Lives in `inventory`, but its `price_currency` column is typed as `billing`'s domain.
CREATE TABLE inventory.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_currency billing.currency_code NOT NULL
);
