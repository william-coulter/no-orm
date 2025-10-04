import { z } from "zod";
import * as Schemas from "./schemas";

export type FlightAttemptMethod = z.infer<typeof Schemas.flightAttemptMethod>;
