import path from "path";
import fs from "fs/promises";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Client } from "pg";
import { execa } from "execa";

describe("no-orm", () => {
  let container: StartedTestContainer;
  let client: Client;
  let connectionString: string;

  beforeAll(async () => {
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
  type TestCase = { name: string; directory: string };
  const testCases: TestCase[] = [
    {
      name: "test-docs-hero-example",
      directory: path.join(TESTS_DIR, "test-docs-hero-example"),
    },
  ];

  /** Tests all cases described by the `test-*` prefix.  */
  test.each(testCases)("extracts schema for $name", async (testCase) => {
    const schemaPath = path.join(testCase.directory, "schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await client.query(schemaSql);

    const configPath = path.join(testCase.directory, "no-orm.config.ts");
    const cliPath = path.resolve(__dirname, "../src/index.ts");

    const result = await execa(
      "npx",
      ["tsx", cliPath, "--config-path", configPath],
      {
        env: {
          ...process.env,
          POSTGRES_CONNECTION_STRING: connectionString,
        },
      },
    );
    console.log(result.stdout);
    console.log(result.stderr);
    expect(result.exitCode).toBe(0);

    // STARTHERE: Assert that the output file is the same as the `table.ts`.

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
