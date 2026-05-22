import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(`${origin}/?auth_error=supabase_env_missing`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

      if (process.env.NODE_ENV === "development" || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`);
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/protected";
  }

  return next;
}
