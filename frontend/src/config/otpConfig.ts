/**
 * Temporary bypass for OTP verification — flip back to `true` once real
 * email delivery is configured (backend/.env's SMTP_PASSWORD is still a
 * placeholder as of this writing; SMS via Termii already works for real).
 * Also gates Supabase's native email-code sign-in, which depends on
 * Supabase's own SMTP config (separate system, same "code never arrives by
 * email" symptom). While this is `false`:
 *   - PhoneRegistrationScreen (retail/distributor/logistics) skips straight
 *     from collecting phone+email to the next step, no code sent or asked for.
 *   - WorkerPhoneScreen (9-5 worker) does the same, and the WorkerOTP step
 *     is skipped entirely in onboardingStore's STEP_SEQUENCES.
 *   - LoginScreen hides the "sign in with email code" link (EmailEntry ->
 *     OtpEntry, Supabase signInWithOtp/verifyOtp), since it has no working
 *     fallback to a code that never arrives.
 * No screens or backend logic were removed — everything reactivates by
 * flipping this back to `true`.
 */
export const OTP_VERIFICATION_ENABLED = false;
