import fastifyJwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import path from "path";
import { PrismaClient } from "./generated/prisma/client";
import { NWCConnectionManager } from "./lib/NWCConnectionManager";
import { getSettleDeadlineFromCurrentBlockHeight } from "./lib/utils";
import { listingRoutes } from "./routes/listings";
import { userRoutes } from "./routes/users";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../../frontend/dist"),
  prefix: "/",
});

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  fastify.log.error("JWT_SECRET environment variable is not set!");
  process.exit(1);
}
fastify.register(fastifyJwt, {
  secret: jwtSecret,
});

const prisma = new PrismaClient();
const connectionManager = new NWCConnectionManager(prisma);

fastify.register(userRoutes, {
  prefix: "/api/users",
  prisma,
  connectionManager,
});

fastify.register(listingRoutes, {
  prefix: "/api/listings",
  prisma,
  connectionManager,
});

// Fallback route to serve index.html for client-side routing
fastify.setNotFoundHandler((request, reply) => {
  // Check if the request is not for an API endpoint
  if (!request.raw.url?.startsWith("/api")) {
    reply.sendFile("index.html");
  } else {
    reply.code(404).send({ message: "Not Found" });
  }
});

const start = async () => {
  try {
    fastify.log.info("Starting NWC subscriptions");
    const users = await prisma.user.findMany();

    for (const user of users) {
      if (user.receiveOnlyConnectionSecret) {
        connectionManager.subscribe(user.receiveOnlyConnectionSecret);
      }
    }

    fastify.log.info("Monitoring listings...");
    (async () => {
      // check for leading bids that have expired and end the listings
      for (let i = 0; ; i++) {
        if (i > 0) {
          // don't sleep on first run
          await new Promise((resolve) => setTimeout(resolve, 60_000));
        }

        let blockHeight = 0;
        try {
          let blockHeightResponse = await fetch(
            "https://mempool.space/api/blocks/tip/height"
          );
          if (!blockHeightResponse.ok) {
            console.error("Failed to get block height from mempool.space");
            blockHeightResponse = await fetch(
              "https://blockstream.info/api/blocks/tip/height"
            );

            if (!blockHeightResponse.ok) {
              console.error("Failed to get block height from blockstream.info");
              continue;
            }
          }
          const blockHeightText = await blockHeightResponse.text();
          blockHeight = parseInt(blockHeightText);
          if (
            !blockHeight ||
            isNaN(blockHeight) ||
            blockHeight < 900_000 ||
            blockHeight > 9_000_000
          ) {
            throw new Error("Unexpected block height: " + blockHeightText);
          }
        } catch (error) {
          console.error("failed to fetch block height", error);
          continue;
        }
        connectionManager.setBlockHeight(blockHeight);

        const activeListings = await prisma.listing.findMany({
          where: {
            endedAt: null,
            bids: {
              some: {
                held: true,
              },
            },
          },
          include: {
            bids: true,
            seller: true,
          },
        });

        for (const activeListing of activeListings) {
          if (activeListing.bids.length === 0) {
            continue;
          }
          const heldBid = activeListing.bids.find((bid) => bid.held);
          if (!heldBid?.settleDeadline) {
            console.error("no held bid found", {
              listingId: activeListing.id,
            });
            continue;
          }
          let settleDeadline = heldBid.settleDeadline;
          // update settle deadline
          if (heldBid.settleDeadlineBlocks) {
            settleDeadline = getSettleDeadlineFromCurrentBlockHeight(
              heldBid.settleDeadlineBlocks,
              blockHeight
            );

            await prisma.bid.update({
              where: {
                id: heldBid.id,
              },
              data: {
                settleDeadline,
              },
            });
          }

          if (settleDeadline.getTime() > Date.now()) {
            console.info("Highest bid not expired yet", {
              bid_id: heldBid.id,
              ends_in_minutes: Math.floor(
                (settleDeadline.getTime() - Date.now()) / 1000 / 60
              ),
            });

            if (!activeListing.endsAt) {
              continue;
            }

            console.info("Listing has fixed end date", {
              listing_id: heldBid.id,
              ends_in_minutes: Math.floor(
                (activeListing.endsAt.getTime() - Date.now()) / 1000 / 60
              ),
            });
            if (activeListing.endsAt.getTime() > Date.now()) {
              continue;
            }
          }
          console.log("ending listing", {
            bid_id: heldBid.id,
            listing_id: heldBid.listingId,
            settle_deadline: settleDeadline.getTime(),
            ends_at: activeListing.endsAt,
            now: Date.now(),
          });

          const receiveOnlyConnectionSecret =
            activeListing.seller.receiveOnlyConnectionSecret;
          if (!receiveOnlyConnectionSecret) {
            console.error("no receive only connection secret for listing", {
              listing_id: activeListing.id,
            });
            continue;
          }

          const connection = await connectionManager.getConnection(
            receiveOnlyConnectionSecret
          );
          if (!connection) {
            console.error("no active connection for listing", {
              listingId: activeListing.id,
            });
            continue;
          }

          try {
            await connection.client.settleHoldInvoice({
              preimage: heldBid.preimage,
            });

            await prisma.listing.update({
              where: {
                id: heldBid.listingId,
              },
              data: {
                endedAt: new Date(),
                winnerId: heldBid.bidderId,
              },
            });

            await prisma.bid.update({
              where: {
                id: heldBid.id,
              },
              data: {
                settled: true,
                held: false,
              },
            });
          } catch (error) {
            console.error("Failed to end listing", error);
          }
        }
      }
    })();

    await fastify.listen({ port: 3001, host: "0.0.0.0" }); // Use port 3001 for the backend
    fastify.log.info(
      `Server listening on ${fastify.server.address()?.toString()}`
    );
  } catch (err) {
    fastify.log.error(err, "failed to start server");
    process.exit(1);
  }
};

start();
