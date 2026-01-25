import { NextRequest, NextResponse } from 'next/server';
import { recommendCars } from '@/app/lib/recommend/pipeline';
import type { SearchFilters } from '@/app/lib/recommend/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, queryText, filters } = body;

    const searchFilters: SearchFilters = {
      queryText,
      ...filters,
    };

    const result = await recommendCars(userId, searchFilters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Recommendation error:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to generate recommendations';
    console.error('Full error details:', {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error?.stack : undefined },
      { status: 500 }
    );
  }
}

