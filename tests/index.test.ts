import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Client } from "pg";

describe("no-orm", () => {
  let container: StartedTestContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:17")
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_PASSWORD: "password",
      })
      .start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    const connectionString = `postgres://postgres:password@${host}:${port}/postgres`;

    client = new Client({ connectionString });
    await client.connect();
  });

  test("it can connect to the DB", async () => {
    const result = await client.query("SELECT 1");
    console.log("Connected!", result);
  });

  afterAll(async () => {
    await client.end();
    await container.stop();
  });
});
