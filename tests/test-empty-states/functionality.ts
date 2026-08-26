/**
 * Tests that the generated output for a database with no-table and skipped-table schemas
 * both compiles and runs. `climate` has domains and an enum but zero tables — reaching
 * `Climate.Tables` proves the empty barrel is a real, importable namespace rather than
 * something that merely happens to compile. `public` mixes a surviving table (`nests`) with
 * tables skipped for having no primary key and for being ignored via config, so CRUD against
 * `nests` proves the barrel still resolves correctly once those are excluded.
 */
import { createDatabasePool } from "../slonik-test-connection";
import * as Climate from "./expected/climate";
import * as PublicTables from "./expected/public/tables";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";

if (Object.keys(Climate.Tables).length !== 0) {
  throw new Error("Expected Climate.Tables to be an empty namespace");
}

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  const [nest] = await PublicTables.Nests.createMany({
    connection,
    shapes: [{ location: "Rocky outcrop" }],
  });

  if (nest.location !== "Rocky outcrop") {
    throw new Error(
      `Expected created nest location 'Rocky outcrop', got: ${nest.location}`,
    );
  }

  const [updatedNest] = await PublicTables.Nests.updateMany({
    connection,
    newRows: [{ ...nest, location: "Cliff ledge" }],
  });

  if (updatedNest.location !== "Cliff ledge") {
    throw new Error(
      `Expected updated nest location 'Cliff ledge', got: ${updatedNest.location}`,
    );
  }
});

process.exit(0);
