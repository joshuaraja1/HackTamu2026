import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, carId, interactionType, metadata } = body;

    if (!userId || !carId || !interactionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('interactions').insert({
      user_id: userId,
      car_id: carId,
      interaction_type: interactionType,
      metadata: metadata || {},
    });

    if (error) {
      console.error('Tracking error:', error);
      return NextResponse.json(
        { error: 'Failed to track interaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track interaction' },
      { status: 500 }
    );
  }
}

