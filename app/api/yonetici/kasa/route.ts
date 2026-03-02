import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/session';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'YONETICI') {
    return NextResponse.json({ success: false, error: 'Yetkisiz.' }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sunucu yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  const apartmentId = session.apartmentId;
  if (!apartmentId) {
    return NextResponse.json(
      { success: false, error: 'Apartman bilgisi bulunamadı.' },
      { status: 400 }
    );
  }

  try {
    // Transactions
    const { data: txs, error: txError } = await admin
      .from('transactions')
      .select('id, amount_try, method, status, created_at, due_id, paid_by_user_id, recorded_by_user_id')
      .eq('apartment_id', apartmentId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (txError || !txs) {
      return NextResponse.json(
        { success: false, error: txError?.message ?? 'İşlemler yüklenemedi.' },
        { status: 500 }
      );
    }

    if (txs.length === 0) {
      return NextResponse.json({ success: true, items: [], totalCash: 0 });
    }

    // Collect unique user IDs
    const userIds = [
      ...new Set(
        [
          ...txs.map((t: any) => t.paid_by_user_id),
          ...txs.map((t: any) => t.recorded_by_user_id),
        ].filter(Boolean)
      ),
    ];

    let usersById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from('users')
        .select('id, full_name, unit_label, phone')
        .in('id', userIds);
      if (users) {
        for (const u of users) usersById[u.id] = u;
      }
    }

    // Collect due IDs for period info
    const dueIds = txs.map((t: any) => t.due_id).filter(Boolean);
    let duesById: Record<string, any> = {};
    if (dueIds.length > 0) {
      const { data: dues } = await admin
        .from('dues')
        .select('id, period, amount_try, resident_user_id')
        .in('id', dueIds);
      if (dues) {
        for (const d of dues) duesById[d.id] = d;
      }
    }

    const totalCash = txs.reduce((sum: number, t: any) => sum + Number(t.amount_try), 0);

    const items = txs.map((tx: any) => {
      const paidBy = tx.paid_by_user_id ? usersById[tx.paid_by_user_id] : null;
      const recordedBy = tx.recorded_by_user_id ? usersById[tx.recorded_by_user_id] : null;
      const due = tx.due_id ? duesById[tx.due_id] : null;

      return {
        id: tx.id,
        amountTry: Number(tx.amount_try),
        method: tx.method as 'CASH' | 'ONLINE',
        status: tx.status,
        createdAt: tx.created_at,
        residentName: paidBy?.full_name ?? '—',
        residentUnit: paidBy?.unit_label ?? '—',
        residentPhone: paidBy?.phone ?? null,
        managerName: recordedBy?.full_name ?? null,
        period: due?.period ?? null,
      };
    });

    return NextResponse.json({ success: true, items, totalCash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
