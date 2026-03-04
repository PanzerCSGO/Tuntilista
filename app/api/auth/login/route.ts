import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Käyttäjänimi ja salasana vaaditaan." },
        { status: 400 }
      );
    }

    // 1. Look up email from profiles using admin client (bypasses RLS)
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (profileError || !profile?.email) {
      // Generic error – don't reveal whether username exists
      return NextResponse.json(
        { error: "Virheellinen käyttäjänimi tai salasana." },
        { status: 401 }
      );
    }

    // 2. Sign in with email + password using a server client that can set cookies
    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: "Virheellinen käyttäjänimi tai salasana." },
        { status: 401 }
      );
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Kirjautuminen epäonnistui. Yritä uudelleen." },
      { status: 500 }
    );
  }
}
