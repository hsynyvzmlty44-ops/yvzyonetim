import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/session';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { getTurkeyPeriodStart } from '@/src/lib/date';

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

  try {
    const apartmentId = session.apartmentId;
    if (!apartmentId) {
      return NextResponse.json(
        { success: false, error: 'Apartman bilgisi bulunamadı.' },
        { status: 400 }
      );
    }

    // 1. Apartment
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

    // 2. Residents
    const { data: residents, error: resError } = await admin
      .from('users')
      .select('id, full_name, phone, unit_label')
      .eq('apartment_id', apartmentId)
      .eq('role', 'SAKIN')
      .eq('is_active', true)
      .order('unit_label', { ascending: true });

    if (resError) {
      return NextResponse.json(
        { success: false, error: 'Sakinler yüklenemedi.' },
        { status: 500 }
      );
    }

    const residentList = residents ?? [];
    const residentIds = residentList.map((r: any) => r.id);

    // 3. Current month dues (Türkiye saatiyle)
    const periodStart = getTurkeyPeriodStart();

    let duesMap: Record<string, any> = {};
    if (residentIds.length > 0) {
      const { data: dues } = await admin
        .from('dues')
        .select('id, resident_user_id, amount_try, due_date, period')
        .eq('apartment_id', apartmentId)
        .eq('period', periodStart)
        .in('resident_user_id', residentIds);

      if (dues) {
        for (const due of dues) {
          duesMap[due.resident_user_id] = due;
        }
      }
    }

    // 4. Paid due ids (from transactions)
    const dueIds = Object.values(duesMap).map((d: any) => d.id);
    const paidDueIds = new Set<string>();
    if (dueIds.length > 0) {
      const { data: transactions } = await admin
        .from('transactions')
        .select('due_id')
        .in('due_id', dueIds);

      if (transactions) {
        for (const t of transactions) {
          paidDueIds.add(t.due_id);
        }
      }
    }

    // 5. Stats from all transactions for this apartment
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: allTransactions } = await admin
      .from('transactions')
      .select('amount_try, created_at')
      .eq('apartment_id', apartmentId);

    const allTx = allTransactions ?? [];
    const totalCash = allTx.reduce((sum: number, t: any) => sum + Number(t.amount_try), 0);
    const thisMonthCash = allTx
      .filter((t: any) => new Date(t.created_at) >= monthStart)
      .reduce((sum: number, t: any) => sum + Number(t.amount_try), 0);

    const pendingDues = Object.values(duesMap).filter((d: any) => !paidDueIds.has(d.id));
    const pendingAmount = pendingDues.reduce((sum: number, d: any) => sum + Number(d.amount_try), 0);

    // 6. Build units list
    const units = residentList.map((resident: any) => {
      const due = duesMap[resident.id] ?? null;
      const isPaid = due ? paidDueIds.has(due.id) : false;
      return {
        userId: resident.id,
        unitLabel: resident.unit_label ?? '—',
        fullName: resident.full_name,
        phone: resident.phone ?? null,
        due: due
          ? {
              id: due.id,
              amountTry: Number(due.amount_try),
              dueDate: due.due_date,
              isPaid,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      apartment,
      stats: {
        totalCash,
        thisMonthCash,
        pendingAmount,
        pendingCount: pendingDues.length,
      },
      units,
      managerName: session.fullName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
