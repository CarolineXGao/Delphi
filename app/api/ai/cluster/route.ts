import { NextRequest, NextResponse } from 'next/server';

type Recommendation = {
  id: string;
  text: string;
};

type Cluster = {
  id: string;
  summary: string;
  items: string[];
};

export async function POST(request: NextRequest) {
  try {
    const { recommendations }: { recommendations: Recommendation[] } = await request.json();

    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json(
        { error: 'Recommendations are required' },
        { status: 400 }
      );
    }

    const clusters: Cluster[] = recommendations.reduce((acc, rec, idx) => {
      const clusterIndex = idx % 3;

      if (!acc[clusterIndex]) {
        acc[clusterIndex] = {
          id: `cluster-${clusterIndex}`,
          summary: `Theme ${clusterIndex + 1}: Common recommendations`,
          items: [],
        };
      }

      acc[clusterIndex].items.push(rec.id);
      return acc;
    }, [] as Cluster[]);

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error('AI cluster error:', error);
    return NextResponse.json(
      { error: 'Failed to cluster recommendations' },
      { status: 500 }
    );
  }
}
