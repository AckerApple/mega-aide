
export function xmlDocToString(doc: Document) {
  const s = new XMLSerializer()
  return s.serializeToString(doc)
}
