import { type CommonQueryMethods, sql } from "slonik";
import {
  type Id,
  type Row,
  columnsFragment,
  row,
  tableFragment,
} from "./table";

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  name: string;
  species: string;
  waddle_speed_kph: number;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const name_shapes = shapes.map((shape) => shape.name);
  const species_shapes = shapes.map((shape) => shape.species);
  const waddle_speed_kph_shapes = shapes.map((shape) => shape.waddle_speed_kph);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      name,
      species,
      waddle_speed_kph
    )
    SELECT ${columnsFragment} FROM ${sql.unnest(
      [name_shapes, species_shapes, waddle_speed_kph_shapes],
      ["text", "text", "numeric"],
    )}
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}
