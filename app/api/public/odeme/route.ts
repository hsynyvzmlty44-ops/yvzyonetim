import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase-admin';
import { randomUUID } from 'crypto';

// GET /api/public/odeme?token=xxx
export async function GET(request: Request) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Yapılandırma hatası.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Geçersiz bağlantı.' },
      { status: 400 }
    );
  }

  try {
    const { data: due, error: dueError } = await admin
      .from('dues')
      .select('id, amount_try, due_date, period, apartment_id, resident_user_id, public_payment_token')
      .eq('public_payment_token', token)
      .maybeSingle();

    if (dueError || !due) {
      return NextResponse.json(
        { success: false, error: 'Bu ödeme bağlantısı geçersiz veya süresi dolmuş.' },
        { status: 404 }
      );
    }

    // Check already paid
    const { data: tx } = await admin
      .from('transactions')
      .select('id, created_at')
      .eq('due_id', due.id)
      .maybeSingle();

    const [{ data: apartment }, { data: resident }] = await Promise.all([
      admin.from('apartments').select('id, name').eq('id', due.apartment_id).single(),
      admin
        .from('users')
        .select('id, full_name, unit_label, phone')
        .eq('id', due.resident_user_id)
        .single(),
    ]);

    return NextResponse.json({
      success: true,
      due: {
        id: due.id,
        amountTry: Number(due.amount_try),
        dueDate: due.due_date,
        period: due.period,
        isPaid: !!tx,
        paidAt: tx?.created_at ?? null,
      },
      apartment: { name: apartment?.name ?? '—' },
      resident: {
        fullName: resident?.full_name ?? '—',
        unitLabel: resident?.unit_label ?? '—',
        phone: resident?.phone ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/public/odeme  — simüle ödeme işle
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
    const { token, cardNumber, expiry, cvc, cardName } = body as {
      token: string;
      cardNumber: string;
      expiry: string;
      cvc: string;
      cardName: string;
    };

    if (!token || !cardNumber || !expiry || !cvc || !cardName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Lütfen tüm kart bilgilerini doldurun.' },
        { status: 400 }
      );
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) {
      return NextResponse.json(
        { success: false, error: 'Kart numarası 16 haneli olmalıdır.' },
        { status: 400 }
      );
    }

    const { data: due, error: dueError } = await admin
      .from('dues')
      .select('id, amount_try, apartment_id, resident_user_id')
      .eq('public_payment_token', token)
      .maybeSingle();

    if (dueError || !due) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz ödeme bağlantısı.' },
        { status: 404 }
      );
    }

    // Duplicate payment check
    const { data: existingTx } = await admin
      .from('transactions')
      .select('id')
      .eq('due_id', due.id)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json(
        { success: false, error: 'Bu aidat zaten ödenmiş.' },
        { status: 400 }
      );
    }

    // Simulated 2-second payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const providerRef = `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
    const last4 = cleanCard.slice(-4);

    const { error: txError } = await admin.from('transactions').insert({
      apartment_id: due.apartment_id,
      due_id: due.id,
      amount_try: due.amount_try,
      method: 'ONLINE',
      paid_by_user_id: due.resident_user_id,
      recorded_by_user_id: null,
      provider: 'SIMULATED',
      provider_ref: providerRef,
      status: 'SUCCEEDED',
      raw: { simulated: true, last4, cardName: cardName.trim() },
    });

    if (txError) {
      return NextResponse.json(
        { success: false, error: txError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      providerRef,
      last4,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Beklenmeyen hata.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
