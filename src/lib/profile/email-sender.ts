import "server-only";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "MYC <no-reply@myc.local>";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    if (isProduction()) {
      throw new Error("email-provider-not-configured");
    }
    console.log("[MYC-EMAIL-CODE]", "to:", email, "code:", code);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Codigo de verificacion MYC",
    html: [
      "<p>Tu codigo para cambiar el email es: <strong>" + code + "</strong></p>",
      "<p>El codigo expira en <strong>10 minutos</strong>.</p>",
      "<p>Si no solicitaste este cambio, ignora este correo.</p>",
      "<p>No compartas el codigo con nadie.</p>",
    ].join(""),
  });

  if (error) {
    throw new Error("email-code-send-failed");
  }
}
