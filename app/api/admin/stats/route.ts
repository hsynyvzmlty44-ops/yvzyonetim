import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { getTurkeyPeriodStart } from '@/src/lib/date';

export async function GET() {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  try {
    const periodStart = getTurkeyPeriodStart();

    const { data: allDues, error: dueError } = await admin
      .from('dues')
      .select('id')
      .eq('period', periodStart);

    if (dueError) {
      return NextResponse.json(
        { success: false, error: dueError.message },
        { status: 500 }
      );
    }

    const dueIds = (allDues ?? []).map((d: any) => d.id);
    const totalDues = dueIds.length;

    let paidDues = 0;
    if (dueIds.length > 0) {
      const { data: txs } = await admin
        .from('transactions')
        .select('due_id')
        .in('due_id', dueIds);
      paidDues = txs?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      totalDues,
      paidDues,
      pendingDues: totalDues - paidDues,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
