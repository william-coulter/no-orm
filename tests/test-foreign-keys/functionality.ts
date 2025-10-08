/** Tests that the functions from `model` execute without errors against the DB. */
import { createDatabasePool } from "../slonik-test-connection";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";
import * as Penguins from "./expected/public/tables/penguins";
import * as FlightAttempts from "./expected/public/tables/flight_attempts";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  const penguinCreate = await Penguins.create({
    connection,
    shape: {
      name: "Willy the penguin",
      species: "Adélie",
      waddle_speed_kph: 0.5,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-01T03:00:00+10:00"),
    },
  });

  const flightAttemptsCreate = await FlightAttempts.create({
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

  const flightAttemptsRead = await FlightAttempts.get({
    connection,
    id: flightAttemptsCreate.id,
  });

  const anotherPenguin = await Penguins.create({
    connection,
    shape: {
      name: "This one actually performed the flight",
      species: "Adélie",
      waddle_speed_kph: 1.0,
      favourite_snack: null,
      date_of_birth: new Date("2025-01-02T03:00:00+10:00"),
    },
  });

  const flightAttemptsUpdate = await FlightAttempts.update({
    connection,
    newRow: { ...flightAttemptsRead, penguin: anotherPenguin.id },
  });

  const _delete = await FlightAttempts.delete({
    connection,
    id: flightAttemptsUpdate.id,
  });
});

process.exit(0);
