# ADR 0005: Supabase password accounts

Status: Accepted. Supersedes the password deferral in ADR 0002.

Use Supabase email/password APIs with email confirmation and a 12-character
minimum configured in Auth and the registration form. Keep the existing implicit
callback flow, with a dedicated password-update route that is never redirected
home before recovery completes. Existing accounts set passwords through recovery.

Supabase owns salted password hashes. No password is stored in application tables,
logs or local drafts. Client-side validation supplements server policy. Profile
completion is independent of authentication and enforced by an onboarding gate.
