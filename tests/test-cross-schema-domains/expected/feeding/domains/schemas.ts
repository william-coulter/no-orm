import { z } from "zod";

export const fishCount = z.number().brand<"feeding.domains.fish_count">();
