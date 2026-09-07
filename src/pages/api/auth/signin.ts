import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string("Password is required").min(1, "Password is required"),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const parsed = credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid sign-in data";
    return context.redirect(`/auth/signin?error=${encodeURIComponent(message)}`);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect("/expenses");
};
