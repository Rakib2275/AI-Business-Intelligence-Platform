import { z } from "zod";

export const createBusinessDataSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100),

  description: z
    .string()
    .max(500)
    .optional(),

  tableName: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Table name can only contain letters, numbers and underscore"
    ),
});

export const updateBusinessDataSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),

  description: z
    .string()
    .max(500)
    .optional(),

  tableName: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Invalid table name"
    )
    .optional(),
});