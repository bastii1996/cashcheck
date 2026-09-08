import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard", "/expenses"];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  // The site has one entry point: signed-in users land on the expenses view,
  // everyone else goes straight to sign-in (no starter landing page).
  // /dashboard (old starter page) is gone but its URL keeps working for bookmarks.
  const pathname = context.url.pathname;
  if (pathname.startsWith("/dashboard") || pathname === "/") {
    return context.redirect(context.locals.user ? "/expenses" : "/auth/signin");
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
