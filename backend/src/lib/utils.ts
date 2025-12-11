export function getSettleDeadlineFromCurrentBlockHeight(
  settleDeadlineBlocks: number,
  blockHeight: number
) {
  const MIN_BLOCKS = 6; // ideally 6 cannot be settled within less than a minute
  const TEN_MINUTES = 10 * 60 * 1000;
  return new Date(
    Date.now() + (settleDeadlineBlocks - blockHeight - MIN_BLOCKS) * TEN_MINUTES
  );
}
