/**
 * Tests that the functions from `model` execute without errors against the DB.
 *
 * This is specifically a regression test for cross-schema domain columns: `billing.invoices`
 * has a column typed as `inventory`'s domain, and `inventory.products` has a column typed as
 * `billing`'s domain. `createMany`/`updateMany` are what actually cast via `sql.unnest`, so
 * reads alone wouldn't catch a bare (unqualified) domain name in that cast.
 */
import { createDatabasePool } from "../slonik-test-connection";
import * as BillingTables from "./expected/billing/tables";
import * as InventoryTables from "./expected/inventory/tables";
import { requiredTypeParsers } from "./expected/slonik/type-parsers";

const pool = await createDatabasePool({ type_parsers: requiredTypeParsers });

await pool.connect(async (connection) => {
  // `billing.invoices.quantity` is typed as `inventory.stock_level` — a domain defined in a
  // different schema to the table. `createMany` casts through `sql.unnest`, which is where an
  // unqualified domain name would fail with `type "stock_level[]" does not exist`.
  const [invoiceCreate] = await BillingTables.Invoices.createMany({
    connection,
    shapes: [{ reference: "INV-0001", quantity: 5 }],
  });

  if (invoiceCreate.quantity !== 5) {
    throw new Error(
      `Expected created invoice to have quantity 5, got: ${invoiceCreate.quantity}`,
    );
  }

  const [invoiceUpdate] = await BillingTables.Invoices.updateMany({
    connection,
    newRows: [{ ...invoiceCreate, quantity: 10 }],
  });

  if (invoiceUpdate.quantity !== 10) {
    throw new Error(
      `Expected updated invoice to have quantity 10, got: ${invoiceUpdate.quantity}`,
    );
  }

  // `inventory.products.price_currency` is typed as `billing.currency_code` — the reverse
  // cross-schema reference, exercising the same `createMany`/`updateMany` cast in the other
  // direction.
  const [productCreate] = await InventoryTables.Products.createMany({
    connection,
    shapes: [{ name: "Widget", price_currency: "USD" }],
  });

  if (productCreate.price_currency !== "USD") {
    throw new Error(
      `Expected created product to have price_currency 'USD', got: ${productCreate.price_currency}`,
    );
  }

  const [productUpdate] = await InventoryTables.Products.updateMany({
    connection,
    newRows: [{ ...productCreate, price_currency: "EUR" }],
  });

  if (productUpdate.price_currency !== "EUR") {
    throw new Error(
      `Expected updated product to have price_currency 'EUR', got: ${productUpdate.price_currency}`,
    );
  }
});

process.exit(0);
