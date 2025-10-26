/** Tests that the functions from `model` execute without errors against the DB. */
import { createDatabasePool } from "../slonik-test-connection";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";
import * as Tables from "./expected/public/tables";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  const basePenguinProperties = {
    waddle_speed_kph: 0.5,
    favourite_snack: null,
  };

  const penguinCreate1 = await Tables.Penguins.create({
    connection,
    shape: {
      name: "Penguin Create 1",
      species: "Adélie",
      date_of_birth: new Date("2025-01-01T00:00:00+10:00"),
      ...basePenguinProperties,
    },
  });

  await Tables.Penguins.create({
    connection,
    shape: {
      name: "Penguin Create 2",
      species: "Adélie",
      date_of_birth: new Date("2026-01-01T00:00:00+10:00"),
      ...basePenguinProperties,
    },
  });

  await Tables.Penguins.create({
    connection,
    shape: {
      name: "Penguin Create 3",
      species: "Emperor",
      date_of_birth: new Date("2025-01-01T00:00:00+10:00"),
      ...basePenguinProperties,
    },
  });

  const penguinCreate4 = await Tables.Penguins.create({
    connection,
    shape: {
      name: "Penguin Create 4",
      species: "Emperor",
      date_of_birth: new Date("2026-01-01T00:00:00+10:00"),
      ...basePenguinProperties,
    },
  });

  // Test complicated tuple query.
  const getManyBySpeciesAndDateOfBirthResult =
    await Tables.Penguins.getManyBySpeciesAndDateOfBirth({
      connection,
      columns: [
        {
          species: "Adélie",
          date_of_birth: new Date("2025-01-01T00:00:00+10:00"),
        },
        {
          species: "Emperor",
          date_of_birth: new Date("2026-01-01T00:00:00+10:00"),
        },
      ],
    });

  const expected = new Set([penguinCreate1.id, penguinCreate4.id]);

  if (
    !(
      getManyBySpeciesAndDateOfBirthResult.length === expected.size &&
      getManyBySpeciesAndDateOfBirthResult
        .map((p) => p.id)
        .every((id) => expected.has(id))
    )
  ) {
    throw new Error(
      `Returned getManyBySpeciesAndDateOfBirthResult does not equal expected. Returned: ${JSON.stringify(getManyBySpeciesAndDateOfBirthResult, null, 2)}`,
    );
  }

  await Tables.Penguins.getManyByName({
    connection,
    columns: [penguinCreate1.name],
  });

  await Tables.Penguins.getByName({
    connection,
    name: penguinCreate4.name,
  });

  await Tables.FlightAttempts.createMany({
    connection,
    shapes: [
      {
        penguin: penguinCreate1.id,
        method: "ski_jump",
        attempted_at: new Date("2026-01-01T03:00:00+10:00"),
        altitude_cm: 10,
        success: false,
        failure_reason: "Ski boots were too tight.",
      },
      {
        penguin: penguinCreate4.id,
        method: "glider",
        attempted_at: new Date("2026-01-01T04:00:00+10:00"),
        altitude_cm: 5,
        success: false,
        failure_reason: "Penguins don't have hands.",
      },
    ],
  });

  await Tables.FlightAttempts.getManyByPenguin({
    connection,
    columns: [penguinCreate1.id],
  });

  await Tables.FlightAttempts.getByPenguin({
    connection,
    penguin: penguinCreate1.id,
  });

  await Tables.FlightAttempts.getManyByPenguinMap({
    connection,
    columns: [penguinCreate1.id, penguinCreate4.id],
  });

  await Tables.FlightAttempts.getManyByPenguinAndMethod({
    connection,
    columns: [{ method: "ski_jump", penguin: penguinCreate1.id }],
  });
});

process.exit(0);
