import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { encodeSession, SESSION_COOKIE_NAME, type SessionUser } from '@/src/lib/session';

export async function POST(request: Request) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sunucu yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const body = await request.json();
    const normalizedPhone = body?.phone?.trim().replace(/\s/g, '') ?? '';

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Telefon numarası gerekli.' },
        { status: 400 }
      );
    }

    const { data: user, error } = await admin
      .from('users')
      .select('id, role, apartment_id, full_name, phone')
      .eq('phone', normalizedPhone)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Sorgulama sırasında hata oluştu.' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      role: user.role,
      apartmentId: user.apartment_id ?? null,
      fullName: user.full_name,
      phone: user.phone,
    };

    const redirectPath =
      user.role === 'SUPERADMIN'
        ? '/admin'
        : user.role === 'YONETICI'
        ? '/yonetici'
        : '/sakin';

    const response = NextResponse.json({ success: true, redirect: redirectPath });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSession(sessionUser), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
