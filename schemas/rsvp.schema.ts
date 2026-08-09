import { z } from "zod";

export const createRsvpSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
  })
  .strict();

export const confirmRsvpSchema = z.object({}).strict();

export type CreateRsvpInput = z.infer<typeof createRsvpSchema>;
export type ConfirmRsvpInput = z.infer<typeof confirmRsvpSchema>;
