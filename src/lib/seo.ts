export function setPageMetadata(title: string, description: string) {
  document.title = title
  const descriptionElement = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  )
  if (descriptionElement) descriptionElement.content = description
}
