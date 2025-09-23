import { z } from "zod";

export namespace Schemas {
  export const flightAttemptMethod = z.union([
    z.literal("glider"),
    z.literal("ski_jump"),
    z.literal("jet_pack"),
  ]);
}

export namespace Types {
  export type FlightAttemptMethod = z.infer<typeof Schemas.flightAttemptMethod>;
}
