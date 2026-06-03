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

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Codigo de verificacion MYC",
      html: [
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;">',
        '<p style="font-size:16px;margin:0 0 16px;">Tu codigo para cambiar el email es:</p>',
        '<p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px;margin:0 0 24px;">' + code + "</p>",
        '<p style="font-size:14px;color:#666;margin:0 0 8px;">El codigo expira en <strong>10 minutos</strong>.</p>',
        '<p style="font-size:14px;color:#666;margin:0 0 8px;">No compartas este codigo con nadie.</p>',
        '<p style="font-size:14px;color:#999;margin:0;">Si no solicitaste este cambio, ignora este correo.</p>',
        "</div>",
      ].join(""),
    });

    if (error) {
      console.error(
        "[MYC-EMAIL] Resend error:",
        "name:", error.name,
        "message:", error.message,
      );
      throw new Error("email-code-send-failed");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "email-code-send-failed") {
      throw e;
    }
    console.error(
      "[MYC-EMAIL] Resend error:",
      e instanceof Error ? e.message : String(e),
    );
    throw new Error("email-code-send-failed");
  }
}
