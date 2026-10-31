export function PagePlaceholder({
  title,
  description = 'Esta página será implementada nas próximas etapas.',
}: {
  title: string
  description?: string
}) {
  return (
    <section className="rounded-xl border bg-card p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-card-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </section>
  )
}
