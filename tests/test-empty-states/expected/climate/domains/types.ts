import { z } from "zod";
import * as Schemas from "./schemas";

export type TemperatureCelsius = z.infer<typeof Schemas.temperatureCelsius>;
