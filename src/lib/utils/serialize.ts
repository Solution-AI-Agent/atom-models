export function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc))
}
