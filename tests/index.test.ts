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
      name: "Example from the docs (hero section).",
      directory: path.join(TESTS_DIR, "test-docs-hero-example"),
    },
    {
      name: "Test handling of all supported Postgres types.",
      directory: path.join(TESTS_DIR, "test-type-parsing"),
    },
    {
      name: "Test foreign key references",
      directory: path.join(TESTS_DIR, "test-foreign-keys"),
    },
  ];

  afterEach(async () => {
    // Drop tables for the next test.
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

  /** Tests all cases described by the `test-*` prefix.  */
  test.each(testCases)("extracts schema for $name", async (testCase) => {
    const schemaPath = path.join(testCase.directory, "schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await client.query(schemaSql);

    const configPath = path.join(testCase.directory, "no-orm.config.ts");
    const cliPath = path.resolve(__dirname, "../src/index.ts");
    const testOutputDir = path.join(testCase.directory, "test-outputs");

    // First remove any previous test outputs.
    await fs.rm(testOutputDir, { recursive: true, force: true });

    const noOrmResult = await execa(
      "npx",
      ["tsx", cliPath, "--config-path", configPath],
      {
        env: {
          ...process.env,
          POSTGRES_CONNECTION_STRING: connectionString,
          OUTPUT_DIRECTORY: testOutputDir,
        },
        stdio: "inherit",
      },
    );
    expect(noOrmResult.exitCode).toEqual(0);

    // For every file in `expected`, let's assert the same file exists in `test-outputs` and that it matches.
    const expectedPath = path.join(testCase.directory, "expected");
    const expectedFilePaths = await getAllRelativeFilePaths(expectedPath);

    for (const relativePath of expectedFilePaths) {
      const expectedFile = path.join(expectedPath, relativePath);
      const actualFile = path.join(testOutputDir, relativePath);

      const [expectedContents, actualContents] = await Promise.all([
        safeReadFile(expectedFile, "utf8"),
        safeReadFile(actualFile, "utf8"),
      ]);

      expect(expectedContents).toEqual(actualContents);
    }

    // Let's also assert that the generated functions can execute successfully against a database.
    const functionalityPath = path.join(testCase.directory, "functionality.ts");
    const functionalityResult = await execa("npx", ["tsx", functionalityPath], {
      env: {
        ...process.env,
        POSTGRES_CONNECTION_STRING: connectionString,
      },
      stdio: "inherit",
    });
    expect(functionalityResult.exitCode).toEqual(0);
  });
});

/* Recursively walks a directory and return all file paths relative to `baseDir`. */
async function getAllRelativeFilePaths(
  baseDir: string,
  dir: string = "",
): Promise<string[]> {
  const fullDirPath = path.join(baseDir, dir);
  const entries = await fs.readdir(fullDirPath);

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(fullDirPath, entry);
    const relPath = path.join(dir, entry);
    const entryStat = await fs.stat(fullPath);

    if (entryStat.isDirectory()) {
      const subFiles = await getAllRelativeFilePaths(baseDir, relPath);
      files.push(...subFiles);
    } else {
      files.push(relPath);
    }
  }

  return files;
}

type SafeReadArgs = Parameters<typeof fs.readFile>;

/** Attempts to read a file and returns `null` if it doesn't exist. */
async function safeReadFile(
  ...args: SafeReadArgs
): Promise<string | Buffer<ArrayBufferLike> | null> {
  try {
    return await fs.readFile(...args);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
