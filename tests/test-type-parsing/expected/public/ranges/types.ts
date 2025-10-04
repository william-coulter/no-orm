import { z } from "zod";
import * as Schemas from "./schemas";

export type FloatRange = z.infer<typeof Schemas.floatRange>;
