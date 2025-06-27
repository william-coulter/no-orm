/** Tests that the functions from `model` execute without errors against the DB. */
import { pool } from "../slonik-test-connection";
import * as PenguinsModel from "./expected/public/penguins/model";

await pool.connect(async (connection) => {
  const create = await PenguinsModel.create({
    connection,
    shape: {
      name: "Willy the penguin",
      species: "Adélie",
      waddle_speed_kph: 0.5,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-01T03:00:00+10:00"),
    },
  });

  const read = await PenguinsModel.get({
    connection,
    id: create.id,
  });

  const update = await PenguinsModel.update({
    connection,
    newRow: { ...read, waddle_speed_kph: 0.6, favourite_snack: "Pavlova" },
  });

  const _delete = await PenguinsModel.delete({
    connection,
    id: update.id,
  });
});

process.exit(0);
