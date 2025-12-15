import { useBitcoinRate } from "@/lib/hooks/useBitcoinRate";
import { cn } from "@/lib/utils";

type FormattedFiatAmountProps = {
  amount: number;
  className?: string;
  showApprox?: boolean;
};

export default function FormattedFiatAmount({
  amount,
  className,
  showApprox,
}: FormattedFiatAmountProps) {
  const currency = "USD";
  const bitcoinRate = useBitcoinRate(currency);

  if (!bitcoinRate) {
    return null;
  }

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      {showApprox && bitcoinRate && "~"}
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toLowerCase(),
      }).format((amount / 100_000_000) * bitcoinRate)}
    </div>
  );
}
