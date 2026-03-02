import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Supabase admin yapılandırılamadı.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, unitCount, managerName, managerPhone } = body as {
      name: string;
      unitCount: number;
      managerName: string;
      managerPhone: string;
    };

    if (!name?.trim() || !managerName?.trim() || !managerPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Lütfen tüm alanları doldurun.' },
        { status: 400 }
      );
    }

    // 1. Önce apartmanı manager_user_id olmadan oluştur
    const { data: apartment, error: apartmentError } = await supabaseAdmin
      .from('apartments')
      .insert({
        name: name.trim(),
        unit_count: Number(unitCount) || null,
      })
      .select('id, name, unit_count')
      .single();

    if (apartmentError || !apartment) {
      return NextResponse.json(
        { success: false, error: apartmentError?.message ?? 'Apartman oluşturulamadı.' },
        { status: 400 }
      );
    }

    // 2. Auth'ta yönetici kullanıcısı oluştur
    const safeEmail = `yonetici-${randomUUID()}@yvz.local`;
    const password = randomUUID().replace(/-/g, '') + 'Aa1!';

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: safeEmail,
      password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      await supabaseAdmin.from('apartments').delete().eq('id', apartment.id);
      return NextResponse.json(
        { success: false, error: authError?.message ?? 'Auth kullanıcısı oluşturulamadı.' },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 3. public.users tablosuna yöneticiyi apartment_id ile ekle
    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: userId,
      full_name: managerName.trim(),
      phone: managerPhone.trim(),
      role: 'YONETICI',
      is_active: true,
      apartment_id: apartment.id,
    });

    if (userError) {
      await supabaseAdmin.from('apartments').delete().eq('id', apartment.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: userError.message ?? 'Yönetici kaydı oluşturulamadı.' },
        { status: 400 }
      );
    }

    // 4. Apartmanı manager_user_id ile güncelle
    const { error: updateError } = await supabaseAdmin
      .from('apartments')
      .update({ manager_user_id: userId })
      .eq('id', apartment.id);

    if (updateError) {
      // Güncelleme başarısız olursa rollback
      await supabaseAdmin.from('users').delete().eq('id', userId);
      await supabaseAdmin.from('apartments').delete().eq('id', apartment.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: updateError.message ?? 'Apartman güncellenemedi.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      apartment: {
        id: apartment.id,
        name: apartment.name,
        unitCount: apartment.unit_count ?? null,
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
