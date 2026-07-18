/**
 * Zod schemas for every form/input the app accepts.
 *
 * Kept in the application layer (not in components) so validation rules
 * are shared, testable, and independent of any particular form library or
 * UI framework. These mirror the CHECK constraints that used to live in
 * Postgres RLS policies (see MIGRATION.md) — the backend should still
 * re-validate independently, since client-side validation is a UX
 * convenience, not a security boundary.
 */
import { z } from "zod";

export const buyerRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  budget: z.string().trim().min(1, "Enter a budget"),
  make: z.string().trim().max(60).optional().or(z.literal("")),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  year: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  transmission: z.string().optional().or(z.literal("")),
  fuel: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type BuyerRequestFormValues = z.infer<typeof buyerRequestSchema>;

export const vehicleListingSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  make: z.string().trim().min(1, "Enter vehicle make").max(60),
  model: z.string().trim().min(1, "Enter model").max(60),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter a valid year")
    .refine((value) => Number(value) >= 1886 && Number(value) <= 2030, "Enter a year between 1886 and 2030"),
  price: z.string().trim().min(1, "Enter a price"),
  mileage: z.string().trim().min(1, "Enter mileage"),
  transmission: z.string().max(30).optional().or(z.literal("")),
  fuel_type: z.string().max(30).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  condition: z.string().max(60).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type VehicleListingFormValues = z.infer<typeof vehicleListingSchema>;

export const vehicleInterestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  message: z.string().max(500).optional().or(z.literal("")),
});
export type VehicleInterestFormValues = z.infer<typeof vehicleInterestSchema>;

export const authCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
