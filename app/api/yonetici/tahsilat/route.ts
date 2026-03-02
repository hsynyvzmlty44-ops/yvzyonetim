import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/session';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function POST(request: Request) {
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
    const body = await request.json();
    const { dueId } = body as { dueId: string };

    if (!dueId) {
      return NextResponse.json(
        { success: false, error: 'Aidat ID gerekli.' },
        { status: 400 }
      );
    }

    // Fetch the due
    const { data: due, error: dueError } = await admin
      .from('dues')
      .select('id, apartment_id, amount_try, resident_user_id')
      .eq('id', dueId)
      .single();

    if (dueError || !due) {
      return NextResponse.json(
        { success: false, error: 'Aidat bulunamadı.' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (due.apartment_id !== session.apartmentId) {
      return NextResponse.json(
        { success: false, error: 'Bu aidat size ait değil.' },
        { status: 403 }
      );
    }

    // Check already paid
    const { data: existingTx } = await admin
      .from('transactions')
      .select('id')
      .eq('due_id', dueId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json(
        { success: false, error: 'Bu aidat zaten ödenmiş.' },
        { status: 400 }
      );
    }

    // Create transaction
    const { error: txError } = await admin.from('transactions').insert({
      apartment_id: due.apartment_id,
      due_id: dueId,
      amount_try: due.amount_try,
      method: 'CASH',
      paid_by_user_id: due.resident_user_id,
      recorded_by_user_id: session.id,
      status: 'SUCCEEDED',
    });

    if (txError) {
      return NextResponse.json(
        { success: false, error: txError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
