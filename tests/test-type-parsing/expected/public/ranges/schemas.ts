import { z } from "zod";

export const floatRange = z.string().brand<"public.ranges.float_range">();
