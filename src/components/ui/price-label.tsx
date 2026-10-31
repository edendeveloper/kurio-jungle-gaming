export function PriceLabel({
  amount,
  previousAmount,
}: {
  amount: string
  previousAmount?: string
}) {
  return (
    <div className="price-label">
      <span>
        <span className="sr-only">Preço: </span>
        {amount} ETH
      </span>
      {previousAmount && (
        <del>
          <span className="sr-only">Preço anterior: </span>
          {previousAmount} ETH
        </del>
      )}
    </div>
  )
}
