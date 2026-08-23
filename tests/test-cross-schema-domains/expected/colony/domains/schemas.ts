import { z } from "zod";

export const bandCode = z.string().brand<"colony.domains.band_code">();
