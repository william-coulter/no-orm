/** Tests that the functions from `model` execute without errors against the DB. */
import { createPool } from "slonik";
import * as PenguinsModel from "./expected/public/penguins/model";

const pool = await createPool(process.env.POSTGRES_CONNECTION_STRING ?? "", {});
await pool.connect(async (connection) => {
  const create = await PenguinsModel.create({
    connection,
    shape: {
      name: "Willy the penguin",
      species: "Adélie",
      waddle_speed_kph: 0.5,
    },
  });

  const read = await PenguinsModel.get({
    connection,
    id: create.id,
  });

  const update = await PenguinsModel.update({
    connection,
    newRow: { ...read, waddle_speed_kph: 0.6 },
  });

  const _delete = await PenguinsModel.delete({
    connection,
    id: update.id,
  });
});

process.exit(0);
