/** Tests that the functions from `model` execute without errors against the DB. */
import { createDatabasePool } from "../slonik-test-connection";
import { requiredTypeParsers } from "./expected/custom-path/slonik/type-parsers";
import * as Tables from "./expected/custom-path/public/tables";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  // With `readonly_time_columns: false` set on the `penguins` table config, `created_at`
  // and `updated_at` should now be settable on create.
  const createdAt = new Date("2024-06-01T03:00:00+10:00");

  const penguinCreate = await Tables.Penguins.create({
    connection,
    shape: {
      name: "Willy the penguin",
      species: "Adélie",
      waddle_speed_kph: 0.5,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-01T03:00:00+10:00"),
      created_at: createdAt,
      // `penguins` has an `updated_at` trigger, so whatever we pass here gets
      // overwritten by Postgres on write. We still pass it to prove it's settable.
      updated_at: createdAt,
    },
  });

  if (penguinCreate.created_at?.getTime() !== createdAt.getTime()) {
    throw new Error(
      `Row should have settable \`created_at\` field of ${createdAt.toISOString()} but got: ${penguinCreate.created_at}`,
    );
  }

  //@ts-expect-error: I know this field doesn't exist. It shouldn't.
  if (!!penguinCreate.ignore_column) {
    throw new Error(
      `Row should not have \`ignore_column\` field but does: ${Object.keys(penguinCreate)}`,
    );
  }

  const flightAttemptsCreate = await Tables.FlightAttempts.create({
    connection,
    shape: {
      penguin: penguinCreate.id,
      method: "ski_jump",
      attempted_at: new Date("2026-01-01T03:00:00+10:00"), // This poor guy was 1 year old!
      altitude_cm: 10,
      success: false,
      failure_reason: "Ski boots were too tight.",
    },
  });

  const flightAttemptsRead = await Tables.FlightAttempts.get({
    connection,
    id: flightAttemptsCreate.id,
  });

  const anotherPenguin = await Tables.Penguins.create({
    connection,
    shape: {
      name: "This one actually performed the flight",
      species: "Adélie",
      waddle_speed_kph: 1.0,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-02T03:00:00+10:00"),
      created_at: createdAt,
      updated_at: createdAt,
    },
  });

  const flightAttemptsUpdate = await Tables.FlightAttempts.update({
    connection,
    newRow: { ...flightAttemptsRead, penguin: anotherPenguin.id },
  });

  const _delete = await Tables.FlightAttempts.delete({
    connection,
    id: flightAttemptsUpdate.id,
  });
});

process.exit(0);
