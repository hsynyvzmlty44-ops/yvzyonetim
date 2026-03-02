import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { randomUUID, randomBytes } from 'crypto';
import { getTurkeyPeriodStart } from '@/src/lib/date';

// GET /api/admin/residents?apartmentId=xxx
export async function GET(request: Request) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sunucu yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const apartmentId = searchParams.get('apartmentId');

  if (!apartmentId) {
    return NextResponse.json(
      { success: false, error: 'apartmentId gerekli.' },
      { status: 400 }
    );
  }

  try {
    const { data: apartment, error: aptError } = await admin
      .from('apartments')
      .select('id, name, unit_count')
      .eq('id', apartmentId)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json(
        { success: false, error: 'Apartman bulunamadı.' },
        { status: 404 }
      );
    }

    const { data: residents, error: resError } = await admin
      .from('users')
      .select('id, full_name, phone, unit_label, is_active, created_at')
      .eq('apartment_id', apartmentId)
      .eq('role', 'SAKIN')
      .order('unit_label', { ascending: true });

    if (resError) {
      return NextResponse.json(
        { success: false, error: 'Sakinler yüklenemedi.' },
        { status: 500 }
      );
    }

    // Fetch current month dues for residents
    const periodStart = getTurkeyPeriodStart();

    const residentIds = (residents ?? []).map((r: any) => r.id);
    let duesMap: Record<string, any> = {};

    if (residentIds.length > 0) {
      const { data: dues } = await admin
        .from('dues')
        .select('id, resident_user_id, amount_try, due_date, period')
        .eq('apartment_id', apartmentId)
        .eq('period', periodStart)
        .in('resident_user_id', residentIds);

      if (dues) {
        for (const d of dues) {
          duesMap[d.resident_user_id] = d;
        }
      }
    }

    // Check which dues are paid (have a transaction)
    const dueIds = Object.values(duesMap).map((d: any) => d.id);
    const paidDueIds = new Set<string>();
    if (dueIds.length > 0) {
      const { data: txs } = await admin
        .from('transactions')
        .select('due_id')
        .in('due_id', dueIds);
      if (txs) {
        for (const t of txs) paidDueIds.add(t.due_id);
      }
    }

    const residentList = (residents ?? []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      phone: r.phone ?? null,
      unitLabel: r.unit_label ?? '—',
      isActive: r.is_active,
      currentDue: duesMap[r.id]
        ? {
            id: duesMap[r.id].id,
            amountTry: Number(duesMap[r.id].amount_try),
            dueDate: duesMap[r.id].due_date,
            isPaid: paidDueIds.has(duesMap[r.id].id),
          }
        : null,
    }));

    return NextResponse.json({ success: true, apartment, residents: residentList });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/admin/residents  — yeni sakin ekle + bu ayın aidat borcunu oluştur
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
    const { apartmentId, fullName, unitLabel, phone, monthlyAmount } = body as {
      apartmentId: string;
      fullName: string;
      unitLabel: string;
      phone: string;
      monthlyAmount: number;
    };

    if (!apartmentId || !fullName?.trim() || !unitLabel?.trim() || !phone?.trim() || !monthlyAmount) {
      return NextResponse.json(
        { success: false, error: 'Lütfen tüm alanları doldurun.' },
        { status: 400 }
      );
    }

    // 1. Auth kullanıcısı oluştur
    const safeEmail = `sakin-${randomUUID()}@yvz.local`;
    const password = randomBytes(12).toString('hex') + 'Aa1!';

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: safeEmail,
      password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { success: false, error: authError?.message ?? 'Auth kullanıcısı oluşturulamadı.' },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 2. public.users'a sakin ekle
    const { error: userError } = await admin.from('users').insert({
      id: userId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      unit_label: unitLabel.trim(),
      role: 'SAKIN',
      is_active: true,
      apartment_id: apartmentId,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: userError.message ?? 'Sakin kaydı oluşturulamadı.' },
        { status: 400 }
      );
    }

    // 3. Bu ayın aidat borcunu dues tablosuna ekle (Türkiye saatiyle)
    const periodStart = getTurkeyPeriodStart();
    const [py, pm] = periodStart.split('-').map(Number);
    // Ay sonu = sonraki ayın 1'inden 1 gün önce
    const dueDate = new Date(py, pm, 0).toISOString().split('T')[0];
    const publicToken = randomBytes(16).toString('hex');

    const { data: due, error: dueError } = await admin
      .from('dues')
      .insert({
        apartment_id: apartmentId,
        resident_user_id: userId,
        period: periodStart,
        amount_try: Number(monthlyAmount),
        due_date: dueDate,
        public_payment_token: publicToken,
      })
      .select('id, amount_try, due_date')
      .single();

    if (dueError) {
      // Sakin eklendi ama borç yazılamadı — sakin kalıcı olsun, sadece hata bildir
      return NextResponse.json({
        success: true,
        resident: {
          id: userId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          unitLabel: unitLabel.trim(),
          currentDue: null,
        },
        warning: 'Sakin eklendi fakat aidat kaydı oluşturulamadı: ' + dueError.message,
      });
    }

    return NextResponse.json({
      success: true,
      resident: {
        id: userId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        unitLabel: unitLabel.trim(),
        currentDue: {
          id: due.id,
          amountTry: Number(due.amount_try),
          dueDate: due.due_date,
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
