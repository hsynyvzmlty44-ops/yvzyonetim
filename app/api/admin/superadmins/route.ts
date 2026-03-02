import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { randomUUID } from 'crypto';

// GET /api/admin/superadmins
export async function GET() {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const { data, error } = await admin
      .from('users')
      .select('id, full_name, phone, created_at, is_active')
      .eq('role', 'SUPERADMIN')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const list = (data ?? []).map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      phone: u.phone ?? '—',
      isActive: u.is_active,
      createdAt: u.created_at,
    }));

    return NextResponse.json({ success: true, superAdmins: list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/admin/superadmins — yeni süper admin ekle (auth.users bağımlılığı olmadan)
export async function POST(request: Request) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { fullName, phone } = body as { fullName: string; phone: string };

    if (!fullName?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Ad Soyad ve Telefon zorunludur.' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim().replace(/\s/g, '');

    // Aynı telefon var mı?
    const { data: existing } = await admin
      .from('users')
      .select('id, role')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Bu telefon numarası zaten kayıtlı (Rol: ${existing.role}).`,
        },
        { status: 409 }
      );
    }

    const newId = randomUUID();

    const { data: newUser, error: insertError } = await admin
      .from('users')
      .insert({
        id: newId,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        role: 'SUPERADMIN',
        is_active: true,
        apartment_id: null,
      })
      .select('id, full_name, phone, created_at, is_active')
      .single();

    if (insertError || !newUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ??
            'Kayıt oluşturulamadı. SQL: supabase-remove-fk.sql dosyasını çalıştırdın mı?',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      superAdmin: {
        id: newUser.id,
        fullName: newUser.full_name,
        phone: newUser.phone ?? '—',
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
