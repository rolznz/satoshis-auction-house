-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pubkey" TEXT NOT NULL,
    "receiveOnlyConnectionSecret" TEXT,
    "contactInfo" TEXT
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sellerId" TEXT NOT NULL,
    "winnerId" TEXT,
    "startingBid" INTEGER NOT NULL,
    "startsAt" DATETIME,
    "endedAt" DATETIME,
    "endsAt" DATETIME,
    "public" BOOLEAN NOT NULL,
    "pin" TEXT NOT NULL,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bidderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "invoice" TEXT NOT NULL,
    "preimage" TEXT NOT NULL,
    "paymentHash" TEXT NOT NULL,
    "settleDeadline" DATETIME,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "held" BOOLEAN NOT NULL,
    "settled" BOOLEAN NOT NULL,
    CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_pubkey_key" ON "User"("pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "User_receiveOnlyConnectionSecret_key" ON "User"("receiveOnlyConnectionSecret");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_invoice_key" ON "Bid"("invoice");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_preimage_key" ON "Bid"("preimage");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_paymentHash_key" ON "Bid"("paymentHash");
