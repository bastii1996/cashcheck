import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { toUserMessage } from "@/lib/services/auth-errors";

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
    const message = toUserMessage(parsed.error.issues[0]?.message);
    return context.redirect(`/auth/signup?error=${encodeURIComponent(message)}`);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent("Supabase is not configured")}`);
  }
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent(toUserMessage(error.message))}`);
  }

  // Email confirmation is a Supabase project setting, not a build-time fact:
  // a session here means the account is already active, so send the user in.
  if (data.session) {
    return context.redirect("/expenses");
  }

  return context.redirect("/auth/confirm-email");
};
