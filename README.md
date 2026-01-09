# Satoshi's Auction House

[Try it now](https://satoshisauction.house/)

Self-custodial auctions powered by HOLD invoices and NWC receive-only connections. Satoshi's Auction House acts as the intermediary but uses the receive-only NWC connection of the seller, therefore never has control of the funds, and does not take any cut of the payment.

This solves a problem in traditional auctions where users can win and then cancel. This has partially been solved by KYCing users, legally binding agreements and/or custom buyer rating systems, but with HOLD invoices there is no need - because if the HOLD invoice is accepted the user's payment is already locked.

For the seller side, there is still trust. But instead of building our own rating system we use Nostr profiles.

When someone is outbid, their HOLD invoice will be immediately cancelled without the user losing any money or paying any fees.

One downside is that invoices can only be held for a short amount of time. The auction must be quite active, with at least one payment every few hours. This could be solved in the future with NWC auto-bids.

Rather than treating the HOLD invoice maximum time of a few hours as a limitation, instead focus on the fun part - that there should be many bids in a small amount of time, like in a physical auction.

Places it could be used: Live streams, conferences, meetups, etc.

There is a small risk that the invoice is not settled if multiple blocks are mined in a short period of time, if there is no fixed end date for a listing and low activity. This is currently not handled by Satoshi's Auction House. The winner and seller will need to co-ordinate to complete the payment.

## Development

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

### Backend

```bash
cd backend
cp .env.example .env
yarn install
yarn prisma migrate dev
yarn dev
```
