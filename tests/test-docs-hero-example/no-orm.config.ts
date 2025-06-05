import { noOrmConfigSchema } from "../../src/no-orm.config";

export default noOrmConfigSchema.parse({
  database_url: "postgres://postgres:postgres@localhost:5432/postgres",
});
