import { NWCClient } from "@getalby/sdk";
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { NostrEvent, validateEvent } from "nostr-tools";
import { PrismaClient } from "../generated/prisma/client";
import { authenticate } from "../lib/authenticate";
import { NWCConnectionManager } from "../lib/NWCConnectionManager";

type LoginBody = NostrEvent;

type UserSettings = {
  receiveOnlyConnectionSecret?: string;
  contactInfo?: string;
};

interface UserRoutesOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  connectionManager: NWCConnectionManager;
}

export async function userRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions
) {
  fastify.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply
    ) => {
      const nostrEvent = request.body;

      if (!nostrEvent) {
        return reply.code(400).send({ message: "no body provided" });
      }

      if (!validateEvent(nostrEvent)) {
        return reply.code(400).send({ message: "invalid nostr event" });
      }

      if (Math.abs(Date.now() / 1000 - nostrEvent.created_at) > 60 * 1000) {
        return reply.code(400).send({ message: "request has expired" });
      }

      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        return reply.code(500).send({ message: "no base url set" });
      }

      if (
        !nostrEvent.tags.find((t) => t[0] === "u" && t[1].startsWith(baseUrl))
      ) {
        return reply.code(500).send({ message: "auth is not for this site" });
      }

      try {
        await options.prisma.user.upsert({
          create: {
            pubkey: nostrEvent.pubkey,
          },
          update: {},
          where: {
            pubkey: nostrEvent.pubkey,
          },
        });

        const token = fastify.jwt.sign({ pubkey: nostrEvent.pubkey });
        fastify.log.info({ pubkey: nostrEvent.pubkey }, `User logged in`);
        return reply.send({ token });
      } catch (error: any) {
        fastify.log.error(error, `Error logging in`);

        return reply
          .code(500)
          .send({ message: "Internal Server Error during login" });
      }
    }
  );

  fastify.patch<{ Body: UserSettings }>(
    "/settings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as FastifyRequest<{ Body: UserSettings }>;

      try {
        const { pubkey } = await request.jwtVerify<{ pubkey: string }>();

        const user = await options.prisma.user.findUniqueOrThrow({
          where: {
            pubkey,
          },
        });

        if (
          req.body.receiveOnlyConnectionSecret &&
          req.body.receiveOnlyConnectionSecret !==
            user.receiveOnlyConnectionSecret
        ) {
          if (user.receiveOnlyConnectionSecret) {
            options.connectionManager.unsubscribe(
              user.receiveOnlyConnectionSecret
            );
          }
          const nwcClient = new NWCClient({
            nostrWalletConnectUrl: req.body.receiveOnlyConnectionSecret,
          });
          const info = await nwcClient.getInfo();
          nwcClient.close();
          if (!info.notifications) {
            throw new Error(
              "Notifications are not supported by this wallet connection"
            );
          }
          if (info.notifications.indexOf("hold_invoice_accepted") === -1) {
            throw new Error(
              "HOLD invoices are not supported by this wallet connection"
            );
          }
          if (info.methods.indexOf("pay_invoice") > -1) {
            throw new Error("Please provide a receive-only connection");
          }
          options.connectionManager.subscribe(
            req.body.receiveOnlyConnectionSecret
          );
        }

        await options.prisma.user.update({
          where: { pubkey },
          data: {
            receiveOnlyConnectionSecret: req.body.receiveOnlyConnectionSecret,
            contactInfo: req.body.contactInfo,
          },
        });

        return reply.send({ message: "Settings updated successfully" });
      } catch (error: any) {
        fastify.log.error(error, `Error updating user settings`);

        return reply
          .code(500)
          .send({ message: "Internal Server Error during user update" });
      }
    }
  );

  fastify.get(
    "/settings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { pubkey } = await request.jwtVerify<{ pubkey: string }>();

      const user = await options.prisma.user.findUniqueOrThrow({
        where: { pubkey },
      });

      const userSettings: UserSettings = {
        receiveOnlyConnectionSecret:
          user.receiveOnlyConnectionSecret || undefined,
        contactInfo: user.contactInfo || undefined,
      };

      return reply.send(userSettings);
    }
  );
}
