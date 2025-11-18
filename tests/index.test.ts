import { execa } from "execa";
import fs from "fs/promises";
import path from "path";
import { Client } from "pg";
import { GenericContainer, StartedTestContainer } from "testcontainers";

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
    {
      name: "Test indexes",
      directory: path.join(TESTS_DIR, "test-indexes"),
    },
    {
      name: "Test the no-orm config",
      directory: path.join(TESTS_DIR, "test-config"),
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
      ["tsx", cliPath, "generate", "--config-path", configPath],
      {
        env: {
          ...process.env,
          POSTGRES_CONNECTION_STRING: connectionString,
          OUTPUT_DIRECTORY: testOutputDir,
        },
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
    });
    expect(functionalityResult.exitCode).toEqual(0);
  });

  describe("atomicity", () => {
    it("should leave existing files unchanged when no-orm fails", async () => {
      const testDirectory = path.join(TESTS_DIR, "atomicity");
      const schemaPath = path.join(testDirectory, "schema.sql");
      const schemaSql = await fs.readFile(schemaPath, "utf8");
      await client.query(schemaSql);

      const configPath = path.join(testDirectory, "no-orm.config.ts");
      const cliPath = path.resolve(__dirname, "../src/index.ts");
      const testOutputDir = path.join(testDirectory, "existing");

      const currentMTime = (await fs.stat(testDirectory)).mtimeMs;

      const noOrmResult = await execa(
        "npx",
        ["tsx", cliPath, "generate", "--config-path", configPath],
        {
          env: {
            ...process.env,
            POSTGRES_CONNECTION_STRING: connectionString,
            OUTPUT_DIRECTORY: testOutputDir,
          },
          reject: false,
        },
      );
      expect(noOrmResult.exitCode).toEqual(1);

      const newMTime = (await fs.stat(testDirectory)).mtimeMs;
      // Note that this timestamp doesn't update if only the contents of a file changes.
      // Considering the existing directory has very little in it and if `no-orm` were to
      // run, more files would be added to this directory, this is a sufficient assertion.
      expect(newMTime).toEqual(currentMTime);
    });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
