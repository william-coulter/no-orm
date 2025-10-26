/** Tests that the functions from `model` execute without errors against the DB. */
import { createDatabasePool } from "../slonik-test-connection";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";
import * as Tables from "./expected/public/tables";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  const create = await Tables.Penguins.create({
    connection,
    shape: {
      name: "Willy the penguin",
      species: "Adélie",
      waddle_speed_kph: 0.5,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-01T03:00:00+10:00"),
    },
  });

  const read = await Tables.Penguins.get({
    connection,
    id: create.id,
  });

  await Tables.Penguins.getManyMap({
    connection,
    ids: [create.id],
  });

  await Tables.Penguins.find({
    connection,
    id: 0,
  });

  await Tables.Penguins.find({
    connection,
    id: create.id,
  });

  const update = await Tables.Penguins.update({
    connection,
    newRow: { ...read, waddle_speed_kph: 0.6, favourite_snack: "Pavlova" },
  });

  const _delete = await Tables.Penguins.delete({
    connection,
    id: update.id,
  });
});

process.exit(0);
