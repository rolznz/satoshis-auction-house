import fastifyJwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import path from "path";
import { PrismaClient } from "./generated/prisma/client";
import { NWCConnectionManager } from "./lib/NWCConnectionManager";
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

    (async () => {
      // check for leading bids that have expired and end the listings
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
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
          if (heldBid.settleDeadline.getTime() > Date.now()) {
            console.log("Highest bid not expired yet", { bidId: heldBid.id });
            continue;
          }
          console.log(
            "Highest bid settle deadline is expiring, ending listing",
            {
              bidId: heldBid.id,
              listingId: heldBid.listingId,
              settleDeadline: heldBid.settleDeadline.getTime(),
              now: Date.now(),
            }
          );

          const receiveOnlyConnectionSecret =
            activeListing.seller.receiveOnlyConnectionSecret;
          if (!receiveOnlyConnectionSecret) {
            console.error("no receive only connection secret for listing", {
              listingId: activeListing.id,
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
