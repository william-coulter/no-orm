/**
 * Tests that the functions from `model` execute without errors against the DB.
 *
 * This is specifically a regression test for cross-schema domain columns: `colony.chicks`
 * has a column typed as `feeding`'s domain, and `feeding.deliveries` has a column typed as
 * `colony`'s domain. `createMany`/`updateMany` are what actually cast via `sql.unnest`, so
 * reads alone wouldn't catch a bare (unqualified) domain name in that cast.
 */
import { createDatabasePool } from "../slonik-test-connection";
import * as ColonyTables from "./expected/colony/tables";
import * as FeedingTables from "./expected/feeding/tables";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  // `colony.chicks.fish_ration` is typed as `feeding.fish_count` — a domain defined in a
  // different schema to the table. `createMany` casts through `sql.unnest`, which is where an
  // unqualified domain name would fail with `type "fish_count[]" does not exist`.
  const [chickCreate] = await ColonyTables.Chicks.createMany({
    connection,
    shapes: [{ name: "Pip", fish_ration: 5 }],
  });

  if (chickCreate.fish_ration !== 5) {
    throw new Error(
      `Expected created chick to have fish_ration 5, got: ${chickCreate.fish_ration}`,
    );
  }

  const [chickUpdate] = await ColonyTables.Chicks.updateMany({
    connection,
    newRows: [{ ...chickCreate, fish_ration: 10 }],
  });

  if (chickUpdate.fish_ration !== 10) {
    throw new Error(
      `Expected updated chick to have fish_ration 10, got: ${chickUpdate.fish_ration}`,
    );
  }

  // `feeding.deliveries.recipient_band` is typed as `colony.band_code` — the reverse
  // cross-schema reference, exercising the same `createMany`/`updateMany` cast in the other
  // direction.
  const [deliveryCreate] = await FeedingTables.Deliveries.createMany({
    connection,
    shapes: [{ courier: "Skipper", recipient_band: "ADL" }],
  });

  if (deliveryCreate.recipient_band !== "ADL") {
    throw new Error(
      `Expected created delivery to have recipient_band 'ADL', got: ${deliveryCreate.recipient_band}`,
    );
  }

  const [deliveryUpdate] = await FeedingTables.Deliveries.updateMany({
    connection,
    newRows: [{ ...deliveryCreate, recipient_band: "EMP" }],
  });

  if (deliveryUpdate.recipient_band !== "EMP") {
    throw new Error(
      `Expected updated delivery to have recipient_band 'EMP', got: ${deliveryUpdate.recipient_band}`,
    );
  }
});

process.exit(0);
