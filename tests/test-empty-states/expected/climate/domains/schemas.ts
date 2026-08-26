import { z } from "zod";

export const temperatureCelsius = z
  .number()
  .brand<"climate.domains.temperature_celsius">();
