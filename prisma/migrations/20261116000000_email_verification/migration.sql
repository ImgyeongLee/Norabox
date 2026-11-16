-- Email verification and password reset by email (sent through Brevo).
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "verifyEmailSentAt" TIMESTAMP(3),
ADD COLUMN "resetEmailSentAt" TIMESTAMP(3);
