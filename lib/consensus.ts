export type ConsensusResult = {
  median: number;
  iqr: number;
  netAgreement: number;
  consensus: boolean;
  n: number;
  agree: number;
  disagree: number;
};

export function calcConsensus(
  responses: Array<{ value: number }>,
  rule: 'iqr' | 'net_agreement' = 'iqr',
  iqrThreshold: number = 1,
  netAgreementThreshold: number = 75
): ConsensusResult {
  const values = responses.map(r => r.value).sort((a, b) => a - b);
  const n = values.length;

  const agree = responses.filter(r => r.value >= 7).length;
  const disagree = responses.filter(r => r.value <= 3).length;

  const median = calculateMedian(values);
  const iqr = calculateIQR(values);
  const netAgreement = (agree / n) * 100 - 2 * ((disagree / n) * 100);

  let consensus = false;
  if (rule === 'iqr') {
    consensus = iqr <= iqrThreshold;
  } else if (rule === 'net_agreement') {
    consensus = netAgreement >= netAgreementThreshold;
  }

  return {
    median,
    iqr,
    netAgreement,
    consensus,
    n,
    agree,
    disagree,
  };
}

function calculateMedian(sortedValues: number[]): number {
  const n = sortedValues.length;
  if (n === 0) return 0;
  if (n % 2 === 0) {
    return (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2;
  }
  return sortedValues[Math.floor(n / 2)];
}

function calculateIQR(sortedValues: number[]): number {
  const n = sortedValues.length;
  if (n === 0) return 0;

  const q1 = calculatePercentile(sortedValues, 25);
  const q3 = calculatePercentile(sortedValues, 75);

  return q3 - q1;
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  const n = sortedValues.length;
  if (n === 0) return 0;

  const index = (percentile / 100) * (n - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
