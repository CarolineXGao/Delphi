import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { comments } = await request.json();

    if (!comments || comments.length === 0) {
      return NextResponse.json(
        { error: 'Comments are required' },
        { status: 400 }
      );
    }

    const summary = `Based on ${comments.length} participant comments, the main themes include:\n\n` +
      `• Strong support for the practical applicability of this recommendation\n` +
      `• Some concerns raised about implementation feasibility and resource requirements\n` +
      `• Several participants suggested modifications to improve clarity\n` +
      `• Overall positive sentiment with constructive feedback for refinement`;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI summarise error:', error);
    return NextResponse.json(
      { error: 'Failed to summarise comments' },
      { status: 500 }
    );
  }
}
