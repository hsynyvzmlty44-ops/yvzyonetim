import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/seed
 * Veritabanında hiç SUPERADMIN yoksa ilk admin kaydını oluşturur.
 * Body: { phone, fullName, secret }
 * secret: env'deki SEED_SECRET ile eşleşmeli (opsiyonel güvenlik).
 */
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
    const { phone, fullName, secret } = body as {
      phone: string;
      fullName: string;
      secret?: string;
    };

    // Opsiyonel güvenlik: .env.local'e SEED_SECRET=xxx ekle
    const envSecret = process.env.SEED_SECRET;
    if (envSecret && secret !== envSecret) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz seed secret.' },
        { status: 403 }
      );
    }

    if (!phone?.trim() || !fullName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'phone ve fullName zorunludur.' },
        { status: 400 }
      );
    }

    // Zaten SUPERADMIN var mı?
    const { data: existing, error: checkError } = await admin
      .from('users')
      .select('id, full_name, phone')
      .eq('role', 'SUPERADMIN')
      .limit(1)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Zaten bir Süper Admin mevcut: ${existing.full_name} (${existing.phone}). Seed çalıştırılmadı.`,
        alreadyExists: true,
      });
    }

    const normalizedPhone = phone.trim().replace(/\s/g, '');
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
      .select('id, full_name, phone')
      .single();

    if (insertError || !newUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ??
            'Kayıt oluşturulamadı. Önce supabase-remove-fk.sql dosyasını çalıştır.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `İlk Süper Admin oluşturuldu: ${newUser.full_name} — ${newUser.phone}`,
      superAdmin: {
        id: newUser.id,
        fullName: newUser.full_name,
        phone: newUser.phone,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
