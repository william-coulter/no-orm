import path from "path";
import fs from "fs/promises";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Client } from "pg";
import { extractSchemas } from "extract-pg-schema";

describe("no-orm", () => {
  let container: StartedTestContainer;
  let client: Client;
  let connectionString: string;

  beforeAll(async () => {
    // Start Postgres container
    container = await new GenericContainer("postgres:17")
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_USER: "postgres",
        POSTGRES_DB: "postgres",
      })
      .start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    connectionString = `postgres://postgres:postgres@${host}:${port}/postgres`;

    client = new Client({
      connectionString,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  const TESTS_DIR = path.join(__dirname);
  const testCases: { name: string; schemaPath: string }[] = [
    {
      name: "test-docs-hero-example",
      schemaPath: path.join(TESTS_DIR, "test-docs-hero-example", "schema.sql"),
    },
  ];

  /** Tests all cases described by the `test-*` prefix.  */
  test.each(testCases)("extracts schema for $name", async (testCase) => {
    const schemaSql = await fs.readFile(testCase.schemaPath, "utf8");
    await client.query(schemaSql);

    const result = await extractSchemas({
      connectionString,
    });

    console.log(`\n--- Output for ${testCase.name} ---`);
    console.dir(result, { depth: null });

    // Drop tables for next test.
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace) LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `);
  });
});
