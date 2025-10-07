export type ConsensusResult = {
  median: number;
  iqr: number;
  mean: number;
  q1: number;
  q3: number;
  standardDeviation: number;
  totalResponses: number;
  agreementPercentage: number;
  consensusReached: boolean;
};

export function calculateConsensus(
  ratings: number[],
  consensusRule: 'iqr' | 'net_agreement',
  iqrThreshold: number = 1,
  netAgreementThreshold: number = 75,
  likertMin: number = 1,
  likertMax: number = 9
): ConsensusResult {
  if (ratings.length === 0) {
    return {
      median: 0,
      iqr: 0,
      mean: 0,
      q1: 0,
      q3: 0,
      standardDeviation: 0,
      totalResponses: 0,
      agreementPercentage: 0,
      consensusReached: false,
    };
  }

  const sortedRatings = [...ratings].sort((a, b) => a - b);
  const n = sortedRatings.length;

  const median = calculateMedian(sortedRatings);
  const q1 = calculateQuartile(sortedRatings, 0.25);
  const q3 = calculateQuartile(sortedRatings, 0.75);
  const iqr = q3 - q1;

  const mean = ratings.reduce((sum, r) => sum + r, 0) / n;

  const variance =
    ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);

  const agreementPercentage = calculateNetAgreement(
    ratings,
    likertMin,
    likertMax
  );

  let consensusReached = false;
  if (consensusRule === 'iqr') {
    consensusReached = iqr <= iqrThreshold;
  } else {
    consensusReached = agreementPercentage >= netAgreementThreshold;
  }

  return {
    median,
    iqr,
    mean,
    q1,
    q3,
    standardDeviation,
    totalResponses: n,
    agreementPercentage,
    consensusReached,
  };
}

function calculateMedian(sortedArray: number[]): number {
  const n = sortedArray.length;
  if (n === 0) return 0;

  if (n % 2 === 0) {
    return (sortedArray[n / 2 - 1] + sortedArray[n / 2]) / 2;
  } else {
    return sortedArray[Math.floor(n / 2)];
  }
}

function calculateQuartile(sortedArray: number[], percentile: number): number {
  const n = sortedArray.length;
  if (n === 0) return 0;

  const pos = (n - 1) * percentile;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (base + 1 < n) {
    return sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base]);
  } else {
    return sortedArray[base];
  }
}

function calculateNetAgreement(
  ratings: number[],
  likertMin: number,
  likertMax: number
): number {
  if (ratings.length === 0) return 0;

  const scale = likertMax - likertMin + 1;
  const upperThird = Math.ceil(scale / 3);

  const highRatings = ratings.filter(
    (r) => r >= likertMax - upperThird + 1
  ).length;
  const lowRatings = ratings.filter((r) => r <= likertMin + upperThird - 1).length;

  const netAgreement = Math.abs(highRatings - lowRatings);
  const agreementPercentage = (netAgreement / ratings.length) * 100;

  return agreementPercentage;
}

export async function updateConsensusForRound(
  supabase: any,
  roundId: string,
  studyId: string,
  consensusRule: 'iqr' | 'net_agreement',
  iqrThreshold: number,
  netAgreementThreshold: number,
  likertMin: number,
  likertMax: number
): Promise<void> {
  const { data: items, error: itemsError } = await supabase
    .from('delphi_items')
    .select('id')
    .eq('study_id', studyId)
    .eq('status', 'active');

  if (itemsError) throw itemsError;

  for (const item of items || []) {
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('rating')
      .eq('round_id', roundId)
      .eq('item_id', item.id);

    if (responsesError) throw responsesError;

    const ratings = responses?.map((r: any) => r.rating) || [];

    if (ratings.length > 0) {
      const consensus = calculateConsensus(
        ratings,
        consensusRule,
        iqrThreshold,
        netAgreementThreshold,
        likertMin,
        likertMax
      );

      await supabase
        .from('delphi_items')
        .update({
          final_median: consensus.median,
          final_iqr: consensus.iqr,
          consensus_reached: consensus.consensusReached,
        })
        .eq('id', item.id);

      await supabase
        .from('responses')
        .update({
          group_median: consensus.median,
          group_iqr: consensus.iqr,
        })
        .eq('round_id', roundId)
        .eq('item_id', item.id);
    }
  }
}
