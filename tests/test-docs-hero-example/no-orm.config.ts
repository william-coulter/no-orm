import { noOrmConfigSchema } from "../../src/no-orm.config";

export default noOrmConfigSchema.parse({
  // For testing, the Postgres container host is dynamic.
  postgres_connection_string: process.env.POSTGRES_CONNECTION_STRING,
});
