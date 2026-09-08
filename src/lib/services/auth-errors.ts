// Auth errors reach the user through a redirect query param, so whatever we put
// here is read by a human. Supabase messages are provider strings that can be
// terse, technical or (on an empty error body) literally "{}" — never pass them
// through unmapped. Pure module: imported by API routes and unit tests.

const FALLBACK = "Something went wrong. Please try again.";

/** Known Supabase auth messages → what the user should read instead. */
const KNOWN_MESSAGES: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i, message: "Incorrect email or password." },
  { match: /email not confirmed/i, message: "Confirm your email address before signing in." },
  { match: /user already registered|already been registered/i, message: "An account with this email already exists." },
  { match: /password should be at least (\d+)/i, message: "Password must be at least 6 characters." },
  { match: /missing email or phone/i, message: "Enter your email and password." },
  {
    match: /rate limit|too many requests|only request this after/i,
    message: "Too many attempts. Wait a moment and try again.",
  },
  { match: /failed to fetch|fetch failed|network|timeout/i, message: "Connection problem. Please try again." },
  { match: /signup(s)? (is |are )?disabled/i, message: "Registration is currently disabled." },
];

/** A provider string is only shown as-is when it reads like a sentence for a human. */
function isHumanReadable(raw: string): boolean {
  if (raw.length < 8 || raw.length > 160) {
    return false;
  }
  // Serialized objects/arrays, JSON fragments and bare codes are not messages.
  if (/^[[{("']|[{}[\]]|_|^[A-Z0-9_]+$/.test(raw)) {
    return false;
  }
  return /^[A-Za-z][A-Za-z0-9 ,.'’()/-]*$/.test(raw);
}

/**
 * Turn any raw auth error into a message worth showing.
 * Unknown-but-readable provider text is kept (it may carry real detail);
 * anything else — empty, "{}", a code, a stack fragment — becomes the fallback.
 */
export function toUserMessage(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") {
    return FALLBACK;
  }
  const known = KNOWN_MESSAGES.find((entry) => entry.match.test(trimmed));
  if (known) {
    return known.message;
  }
  return isHumanReadable(trimmed) ? trimmed : FALLBACK;
}
