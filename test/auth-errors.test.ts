import { describe, expect, it } from "vitest";
import { toUserMessage } from "@/lib/services/auth-errors";

// Wyrocznia: wymaganie UX z diagnozy formularza logowania — użytkownik NIGDY nie
// widzi surowego wyniku od dostawcy (pustki, "{}", kodu), a znane błędy dostają
// treść mówiącą, co robić. Oczekiwania spisane z wymagania, nie z implementacji.

const FALLBACK = "Something went wrong. Please try again.";

describe("toUserMessage — komunikaty błędów auth dla człowieka", () => {
  it.each([
    ["{}", "pusty obiekt z odpowiedzi bez treści — dokładnie to, co zobaczył użytkownik na zrzucie"],
    ["", "puste"],
    ["   ", "same spacje"],
    ['{"error":"unknown"}', "fragment JSON"],
    ["ERR_AUTH_500", "kod techniczny"],
    ["unexpected_failure", "identyfikator z podkreśleniami"],
  ])("zamienia %s na komunikat zastępczy (%s)", (raw) => {
    expect(toUserMessage(raw)).toBe(FALLBACK);
  });

  it("brak wartości (null/undefined) też daje komunikat zastępczy", () => {
    expect(toUserMessage(null)).toBe(FALLBACK);
    expect(toUserMessage(undefined)).toBe(FALLBACK);
  });

  it.each([
    ["Invalid login credentials", "Incorrect email or password."],
    ["Email not confirmed", "Confirm your email address before signing in."],
    ["User already registered", "An account with this email already exists."],
    ["Password should be at least 6 characters.", "Password must be at least 6 characters."],
    ["missing email or phone", "Enter your email and password."],
    ["Email rate limit exceeded", "Too many attempts. Wait a moment and try again."],
    [
      "For security purposes, you can only request this after 51 seconds",
      "Too many attempts. Wait a moment and try again.",
    ],
    ["Failed to fetch", "Connection problem. Please try again."],
  ])("mapuje znany błąd dostawcy %s na czytelną treść", (raw, expected) => {
    expect(toUserMessage(raw)).toBe(expected);
  });

  it("zachowuje nieznany, ale czytelny komunikat dostawcy [może nieść realny detal]", () => {
    expect(toUserMessage("Signups not allowed for this instance")).toBe("Signups not allowed for this instance");
  });

  it("odrzuca komunikat nadmiernie długi, bo nie zmieści się w formularzu [limit 160 znaków]", () => {
    expect(toUserMessage("A".repeat(200))).toBe(FALLBACK);
  });

  it("przepuszcza własne komunikaty walidacji, żeby nie zostały zastąpione [spójność z walidacją pól]", () => {
    expect(toUserMessage("Enter a valid email address")).toBe("Enter a valid email address");
    expect(toUserMessage("Password is required")).toBe("Password is required");
  });
});
