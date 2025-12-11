import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { authenticate } from "../lib/authenticate";
import { NWCConnectionManager } from "../lib/NWCConnectionManager";

type NewListing = {
  title: string;
  description: string;
  imageUrl: string;
  startingBid?: number;
  public: boolean;
  endsAt?: number;
  minimumBidAbsolute?: string;
  minimumBidPercentage?: string;
};

type NewBid = {
  amount: number;
};

interface UserRoutesOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  connectionManager: NWCConnectionManager;
}

export async function listingRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions
) {
  fastify.post<{ Body: NewListing }>(
    "/",
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Body: NewListing }>,
      reply: FastifyReply
    ) => {
      const newListing = request.body;
      try {
        const { pubkey } = await request.jwtVerify<{ pubkey: string }>();

        const user = await options.prisma.user.findUniqueOrThrow({
          where: {
            pubkey,
          },
        });

        if (!user.receiveOnlyConnectionSecret) {
          throw new Error("User has not configured wallet connection");
        }

        if (
          newListing.startingBid &&
          (Math.floor(newListing.startingBid) !== newListing.startingBid ||
            newListing.startingBid < 0)
        ) {
          throw new Error("Invalid starting bid in sats");
        }

        const createdListing = await options.prisma.listing.create({
          data: {
            title: newListing.title,
            description: newListing.description,
            imageUrl: newListing.imageUrl,
            startingBid: newListing.startingBid || 1,
            public: newListing.public,
            endsAt: newListing.endsAt ? new Date(newListing.endsAt) : undefined,
            sellerId: user.id,
            pin: generatePin(),
            minimumBidAbsolute: newListing.minimumBidAbsolute
              ? parseInt(newListing.minimumBidAbsolute)
              : undefined,
            minimumBidPercentage: newListing.minimumBidPercentage
              ? parseInt(newListing.minimumBidPercentage)
              : undefined,
          },
        });

        fastify.log.info({ pubkey: createdListing.id }, "Listing created");
        return reply.send({
          id: createdListing.id,
        });
      } catch (error: any) {
        fastify.log.error(error, `Error creating listing`);

        return reply
          .code(500)
          .send({ message: "Internal Server Error during creating listing" });
      }
    }
  );

  fastify.get("/", async (request, reply) => {
    try {
      let loggedInPubkey: string | undefined;
      try {
        const { pubkey } = await request.jwtVerify<{ pubkey: string }>();
        loggedInPubkey = pubkey;
      } catch (error) {}

      const listings = await options.prisma.listing.findMany({
        where: {
          public: true,
          endedAt: null,
          OR: [
            { endsAt: null },
            {
              endsAt: {
                gt: new Date(),
              },
            },
          ],
        },
        include: {
          bids: {
            where: {
              paid: true,
            },
            include: {
              bidder: true,
            },
          },
          seller: true,
          winner: true,
        },
      });

      return reply.send(
        listings.map((listing) => mapListing(listing, loggedInPubkey))
      );
    } catch (error: any) {
      fastify.log.error(error, `Error fetching listing`);

      return reply.code(500).send();
    }
  });
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      let loggedInPubkey: string | undefined;
      try {
        const { pubkey } = await request.jwtVerify<{ pubkey: string }>();
        loggedInPubkey = pubkey;
      } catch (error) {}

      const listing = await options.prisma.listing.findUniqueOrThrow({
        where: {
          id: request.params.id,
        },
        include: {
          bids: {
            where: {
              paid: true,
            },
            include: {
              bidder: true,
            },
            orderBy: {
              amount: "desc",
            },
          },
          seller: true,
          winner: true,
        },
      });

      return reply.send(mapListing(listing, loggedInPubkey));
    } catch (error: any) {
      fastify.log.error(error, `Error fetching listing`);

      return reply.code(500).send();
    }
  });

  fastify.post<{ Params: { id: string }; Body: NewBid }>(
    "/:id/bids",
    async (request, reply) => {
      try {
        const { pubkey } = await request.jwtVerify<{ pubkey: string }>();

        const listing = await options.prisma.listing.findUniqueOrThrow({
          where: {
            id: request.params.id,
          },
          include: {
            seller: true,
            bids: {
              where: {
                paid: true,
              },
            },
          },
        });

        // TODO: extract duplicated code
        let nextBidAmount = listing.startingBid;
        const heldBid = listing.bids.find((bid) => bid.held);
        if (heldBid) {
          nextBidAmount = Math.max(
            heldBid.amount + Math.max(1, listing.minimumBidAbsolute || 0),
            Math.ceil(
              heldBid.amount * (1 + (listing.minimumBidPercentage ?? 100) / 100)
            )
          );
        }

        if (request.body.amount < nextBidAmount) {
          return reply.code(400).send({ message: "Bid amount is too low" });
        }

        const bidder = await options.prisma.user.findUniqueOrThrow({
          where: {
            pubkey,
          },
        });

        const toHexString = (bytes: Uint8Array<ArrayBuffer>) =>
          bytes.reduce(
            (str, byte) => str + byte.toString(16).padStart(2, "0"),
            ""
          );

        const preimageBytes = crypto.getRandomValues(new Uint8Array(32));
        const preimage = toHexString(preimageBytes);

        const hashBuffer = await crypto.subtle.digest("SHA-256", preimageBytes);
        const paymentHashBytes = new Uint8Array(hashBuffer);
        const paymentHash = toHexString(paymentHashBytes);

        const receiveOnlyConnectionSecret =
          listing.seller.receiveOnlyConnectionSecret;
        if (!receiveOnlyConnectionSecret) {
          throw new Error("Seller has not connected their wallet");
        }
        const client = options.connectionManager.getConnection(
          receiveOnlyConnectionSecret
        ).client;

        const holdInvoiceResponse = await client.makeHoldInvoice({
          amount: request.body.amount * 1000, // in millisats
          description: `Satoshi's Auction House Bid - Listing ${listing.id}`,
          payment_hash: paymentHash,
        });

        const createdBid = await options.prisma.bid.create({
          data: {
            amount: request.body.amount,
            listingId: listing.id,
            bidderId: bidder.id,
            held: false,
            paid: false,
            settled: false,
            invoice: holdInvoiceResponse.invoice,
            preimage: preimage,
            paymentHash: holdInvoiceResponse.payment_hash,
          },
        });

        return {
          id: createdBid.id,
          invoice: createdBid.invoice,
        };
      } catch (error: any) {
        fastify.log.error(error, `Error fetching listing`);

        return reply
          .code(500)
          .send({ message: "Internal Server Error during fetching listing" });
      }
    }
  );
}

function mapListing(
  listing: Prisma.ListingGetPayload<{
    include: {
      seller: true;
      winner: true;
      bids: {
        include: {
          bidder: true;
        };
      };
    };
  }>,
  loggedInPubkey: string | undefined
) {
  const showPin =
    loggedInPubkey &&
    (loggedInPubkey === listing.seller.pubkey ||
      loggedInPubkey === listing.winner?.pubkey);

  let endsInMinutes: number | undefined;
  let endsAt =
    (listing.endsAt
      ? listing.endsAt.getTime()
      : listing.bids.find((bid) => bid.held)?.settleDeadline?.getTime()) ||
    undefined;
  if (endsAt) {
    endsInMinutes = Math.ceil((endsAt - Date.now()) / 1000 / 60);
  }

  let nextBidAmount = listing.startingBid;
  const heldBid = listing.bids.find((bid) => bid.held);
  if (heldBid) {
    nextBidAmount = Math.max(
      heldBid.amount + Math.max(1, listing.minimumBidAbsolute || 0),
      Math.ceil(
        heldBid.amount * (1 + (listing.minimumBidPercentage ?? 100) / 100)
      )
    );
  }

  return {
    id: listing.id,
    createdAt: listing.createdAt.getTime(),
    updatedAt: listing.updatedAt.getTime(),
    title: listing.title,
    currentPrice: Math.max(
      listing.startingBid - 1,
      ...listing.bids.map((bid) => bid.amount)
    ),
    description: listing.description,
    imageUrl: listing.imageUrl,
    sellerPubkey: listing.seller.pubkey,
    winnerPubkey: listing.winner?.pubkey,
    startingBidAmount: listing.startingBid,
    nextBidAmount,
    startsAt: listing.startsAt,
    endedAt: listing.endedAt,
    endsAt,
    endsAtBlock: heldBid?.settleDeadlineBlocks,
    endsInMinutes,
    public: listing.public,
    bids: listing.bids.map((bid) => {
      return {
        id: bid.id,
        bidderPubkey: bid.bidder.pubkey,
        createdAt: bid.createdAt.getTime(),
        updatedAt: bid.updatedAt.getTime(),
        amount: bid.amount,
        settled: bid.settled,
      };
    }),
    ...(showPin
      ? {
          pin: listing.pin,
          sellerContactInfo: listing.seller.contactInfo,
          winnerContactInfo: listing.winner?.contactInfo,
        }
      : {}),
  };
}

function generatePin() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}
