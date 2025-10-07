import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const suggestions = [
      'Consider expanding on the evidence and research supporting this recommendation',
      'Add specific implementation steps or practical considerations',
      'Include potential challenges or barriers to adoption',
      'Reference relevant studies, guidelines, or best practices',
      'Specify measurable outcomes or success criteria',
    ];

    return NextResponse.json({
      suggestions: suggestions.slice(0, 3),
    });
  } catch (error) {
    console.error('AI suggest error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
