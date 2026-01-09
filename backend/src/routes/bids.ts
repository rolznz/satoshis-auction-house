import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { Prisma, PrismaClient } from "../generated/prisma/client";

interface UserRoutesOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function bidRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions
) {
  fastify.get<{
    Params: { id: string };
    Querystring: { claimPreimage?: string };
  }>("/:id", async (request, reply) => {
    try {
      const bid = await options.prisma.bid.findUniqueOrThrow({
        where: {
          id: request.params.id,
        },
        include: {
          bidder: true,
        },
      });

      return reply.send(mapBid(bid));
    } catch (error: any) {
      fastify.log.error(error, `Error fetching listing`);

      return reply.code(500).send();
    }
  });
}

export function mapBid(
  bid: Prisma.BidGetPayload<{
    include: {
      bidder: true;
    };
  }>
) {
  return {
    id: bid.id,
    bidderPubkey: bid.bidder.pubkey,
    createdAt: bid.createdAt.getTime(),
    updatedAt: bid.updatedAt.getTime(),
    amount: bid.amount,
    settled: bid.settled,
    comment: bid.comment,
    errorMessage: bid.errorMessage,
    paid: bid.paid,
  };
}
