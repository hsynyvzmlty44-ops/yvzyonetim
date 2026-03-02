import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/session';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SAKIN') {
    return NextResponse.json({ success: false, error: 'Yetkisiz.' }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const { data: resident, error: resError } = await admin
      .from('users')
      .select('id, full_name, unit_label, apartment_id')
      .eq('id', session.id)
      .single();

    if (resError || !resident) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı bilgisi bulunamadı.' },
        { status: 404 }
      );
    }

    const { data: apartment } = await admin
      .from('apartments')
      .select('id, name')
      .eq('id', resident.apartment_id)
      .single();

    const { data: dues, error: dueError } = await admin
      .from('dues')
      .select('id, amount_try, due_date, period, public_payment_token')
      .eq('resident_user_id', session.id)
      .order('period', { ascending: false });

    if (dueError) {
      return NextResponse.json(
        { success: false, error: dueError.message },
        { status: 500 }
      );
    }

    const dueList = dues ?? [];
    const dueIds = dueList.map((d: any) => d.id);

    const paidDueIds = new Set<string>();
    if (dueIds.length > 0) {
      const { data: txs } = await admin
        .from('transactions')
        .select('due_id, created_at')
        .in('due_id', dueIds);
      if (txs) {
        for (const t of txs) paidDueIds.add(t.due_id);
      }
    }

    const items = dueList.map((d: any) => ({
      id: d.id,
      amountTry: Number(d.amount_try),
      dueDate: d.due_date,
      period: d.period,
      publicToken: d.public_payment_token,
      isPaid: paidDueIds.has(d.id),
    }));

    const totalDebt = items
      .filter((d: any) => !d.isPaid)
      .reduce((sum: number, d: any) => sum + d.amountTry, 0);

    return NextResponse.json({
      success: true,
      resident: {
        fullName: resident.full_name,
        unitLabel: resident.unit_label ?? '—',
      },
      apartment: { name: apartment?.name ?? '—' },
      dues: items,
      totalDebt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
