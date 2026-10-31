export function nftImageSrcSet(source: string) {
  if (!source.endsWith('.webp')) return undefined
  const stem = source.slice(0, -'.webp'.length)
  return [256, 512, 768]
    .map((width) => `${stem}-${width}.webp ${width}w`)
    .concat(`${source} 1254w`)
    .join(', ')
}
