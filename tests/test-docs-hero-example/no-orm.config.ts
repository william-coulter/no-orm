import { noOrmConfigSchema } from "../../src/no-orm.config";

export default noOrmConfigSchema.parse({
  // For testing, the Postgres container host is dynamic.
  database_url: process.env.DATABASE_URL,
});
