import { Nip47Notification, NWCClient } from "@getalby/sdk";
import { PrismaClient } from "../generated/prisma";

export class NWCConnectionManager {
  private _connections: Record<
    string,
    { client: NWCClient; unsub: () => void }
  >;
  private _prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this._connections = {};
    this._prisma = prisma;
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
      console.info("hold invoice accepted", notification);

      try {
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
            // FIXME: use real settle deadline
            settleDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        });

        if (updatedBid.listing.endedAt) {
          await client.cancelHoldInvoice({
            payment_hash: updatedBid.paymentHash,
          });
          console.info("Cancelled bid after auction ended", updatedBid.amount);
          return;
        }

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
