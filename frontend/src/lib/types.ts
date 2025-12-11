export type Bid = {
  id: string;
  bidderPubkey: string;
  createdAt: number;
  updatedAt: number;
  amount: number;
  settled: boolean;
};

export type Listing = {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  currentPrice: number;
  description?: string;
  imageUrl?: string;
  sellerPubkey: string;
  winnerPubkey?: string;
  startingBid?: number;
  startsAt?: number;
  endedAt?: number;
  endsAt?: number;
  endsAtBlock?: number;
  endsInMinutes?: number;
  public: boolean;
  bids: Bid[];
  pin?: number;
  sellerContactInfo?: string;
  winnerContactInfo?: string;
};
