import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleAlert, LoaderCircle } from 'lucide-react'
import { healthQueryOptions } from '@/lib/api/health'
import { env } from '@/lib/env'
import { Button } from '@/components/ui/button'

export function ApiStatus() {
  const health = useQuery({
    ...healthQueryOptions(),
    enabled: env.mocksEnabled,
  })
  if (!env.mocksEnabled)
    return <p className="text-xs text-muted-foreground">API mock desativada</p>
  const Icon = health.isPending
    ? LoaderCircle
    : health.isError
      ? CircleAlert
      : CircleCheck
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <p role="status" className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4" />
        {health.isPending
          ? 'API mock: verificando…'
          : health.isError
            ? 'API mock: indisponível'
            : `API mock: ${health.data.status}`}
      </p>
      {health.isError && (
        <Button
          variant="outline"
          size="sm"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
