import { z } from "zod";

export const textShort = z.string().brand<"public.domains.text_short">();
