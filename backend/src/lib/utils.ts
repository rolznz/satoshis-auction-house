export function getSettleDeadlineDateFromCurrentBlockHeight(
  settleDeadlineBlocks: number,
  blockHeight: number,
  minBlocks = 0
) {
  const TEN_MINUTES = 10 * 60 * 1000;
  return new Date(
    Date.now() +
      Math.max(settleDeadlineBlocks - blockHeight - minBlocks, 0) * TEN_MINUTES
  );
}
