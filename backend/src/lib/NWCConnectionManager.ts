import { Nip47Notification, NWCClient } from "@getalby/sdk";
import { PrismaClient } from "../generated/prisma";
import { getSettleDeadlineFromCurrentBlockHeight } from "./utils";

export class NWCConnectionManager {
  private _connections: Record<
    string,
    { client: NWCClient; unsub: () => void }
  >;
  private _prisma: PrismaClient;
  private _blockHeight: number;
  constructor(prisma: PrismaClient) {
    this._connections = {};
    this._prisma = prisma;
    this._blockHeight = 0;
  }

  setBlockHeight(blockHeight: number) {
    this._blockHeight = blockHeight;
  }

  getConnection(receiveOnlyConnectionSecret: string) {
    return this._connections[receiveOnlyConnectionSecret];
  }

  unsubscribe(receiveOnlyConnectionSecret: string) {
    const connection = this._connections[receiveOnlyConnectionSecret];
    if (!connection) {
      return;
    }
    delete this._connections[receiveOnlyConnectionSecret];
    connection.client.close();
    connection.unsub();
    console.log("unsubscribed from wallet", {
      pubkey: connection.client.publicKey,
    });
  }
  async subscribe(receiveOnlyConnectionSecret: string) {
    this.unsubscribe(receiveOnlyConnectionSecret);
    const client = new NWCClient({
      nostrWalletConnectUrl: receiveOnlyConnectionSecret,
    });

    const onNotification = async (notification: Nip47Notification) => {
      while (!this._blockHeight) {
        console.error("received notification while not ready yet");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      try {
        const bid = await this._prisma.bid.findUnique({
          where: {
            paymentHash: notification.notification.payment_hash,
          },
          include: {
            listing: true,
          },
        });
        if (!bid) {
          // NOTE: you should use an isolated app connection
          console.warn("Received hold invoice unrelated to this app", {
            payment_hash: notification.notification.payment_hash,
          });
          return;
        }
        console.info("hold invoice accepted", notification);

        if (!notification.notification.settle_deadline) {
          await client.cancelHoldInvoice({
            payment_hash: notification.notification.payment_hash,
          });
          console.error("Cancelled bid due to no settle deadline", {
            id: bid.id,
          });
          return;
        }

        if (bid.listing.endedAt) {
          await client.cancelHoldInvoice({
            payment_hash: bid.paymentHash,
          });
          console.info("Cancelled bid after auction ended", {
            bid_id: bid.id,
          });
          return;
        }

        if (bid.listing.endsAt && Date.now() > bid.listing.endsAt.getTime()) {
          // bid might have no active listings and still have ended
          await client.cancelHoldInvoice({
            payment_hash: bid.paymentHash,
          });
          console.info("Cancelled bid after auction ended", {
            bid_id: bid.id,
          });
          return;
        }

        const settleDeadline = getSettleDeadlineFromCurrentBlockHeight(
          notification.notification.settle_deadline,
          this._blockHeight
        );

        const ONE_HOUR = 60 * 60 * 1000;
        if (settleDeadline.getTime() - Date.now() < ONE_HOUR) {
          await client.cancelHoldInvoice({
            payment_hash: bid.paymentHash,
          });
          console.error("Bid has too short settle deadline", {
            bid_id: bid.id,
          });
          return;
        }

        const updatedBid = await this._prisma.bid.update({
          where: {
            invoice: notification.notification.invoice,
          },
          include: {
            listing: true,
          },
          data: {
            paid: true,
            held: true,

            settleDeadline,
            settleDeadlineBlocks: notification.notification.settle_deadline,
          },
        });

        const highestBidResult = await this._prisma.bid.findMany({
          where: {
            listingId: updatedBid.listingId,
            held: true,
            paid: true,
          },
          orderBy: {
            amount: "desc",
          },
          take: 1,
        });
        const highestBid = highestBidResult[0];
        if (!highestBid) {
          throw new Error("No highest bid for listing");
        }

        if (highestBid.id === bid.id) {
          const TWO_MINUTES = 2 * 60 * 1000;
          if (
            bid.listing.endsAt &&
            bid.listing.endsAt.getTime() - Date.now() < TWO_MINUTES
          ) {
            console.info("Extending nearly-closed listing", {
              bid_id: bid.id,
              listing_id: bid.listingId,
            });
            await this._prisma.listing.update({
              where: {
                id: bid.listingId,
              },
              data: {
                endsAt: new Date(Date.now() + TWO_MINUTES),
              },
            });
          }
        }

        // cancel lower bids
        const lowerBidsToCancel = await this._prisma.bid.updateManyAndReturn({
          where: {
            listingId: updatedBid.listingId,
            held: true,
            NOT: {
              id: highestBid.id,
            },
          },
          data: {
            held: false,
          },
        });
        for (const lowerBidToCancel of lowerBidsToCancel) {
          await client.cancelHoldInvoice({
            payment_hash: lowerBidToCancel.paymentHash,
          });
          console.info("Cancelled lower bid", lowerBidToCancel.amount);
        }
      } catch (error) {
        console.error("Failed to update bid for notification", {
          notification,
          error,
        });
      }
    };

    const unsub = await client.subscribeNotifications(onNotification, [
      "hold_invoice_accepted",
    ]);

    this._connections[receiveOnlyConnectionSecret] = { client, unsub };
    console.log("subscribed to wallet", { pubkey: client.publicKey });
  }
}
