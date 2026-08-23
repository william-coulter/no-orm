import { z } from "zod";
import * as Schemas from "./schemas";

export type BandCode = z.infer<typeof Schemas.bandCode>;
