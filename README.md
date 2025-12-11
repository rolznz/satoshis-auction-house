# Satoshi's Auction House

Self-custodial auctions powered by HOLD invoices and NWC receive-only connections. This solves a problem in traditional auctions where users can win and then cancel. This has partially been solved by KYCing users and rating systems, but with HOLD invoices there is no need - because if the HOLD invoice is accepted we know the user will pay.

When someone is outbid, their HOLD invoice will be immediately cancelled without the user losing any money or paying any fees.

One downside is that invoices can only be held for a short amount of time. The auction must be quite active, with at least one payment every few hours. This could be solved in the future with NWC auto-bids.

[Try it now](https://satoshisauction.house/)

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
yarn start
```
