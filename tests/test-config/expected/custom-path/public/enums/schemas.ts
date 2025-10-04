import { z } from "zod";

export const flightAttemptMethod = z.union([
  z.literal("glider"),
  z.literal("ski_jump"),
  z.literal("jet_pack"),
]);
