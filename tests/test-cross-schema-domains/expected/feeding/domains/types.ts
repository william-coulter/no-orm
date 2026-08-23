import { z } from "zod";
import * as Schemas from "./schemas";

export type FishCount = z.infer<typeof Schemas.fishCount>;
