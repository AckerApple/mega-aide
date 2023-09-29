
export function updateElementAttributes(
  elm: Element,
  object: Record<string, any>
) {
  Object.entries(object).forEach(([name, value]) =>
    elm.setAttribute(name, value === undefined ? '' : value)
  )
}

export function elmAttributesToObject(element: Element) {
  return element.getAttributeNames()
    .reduce((all, name) => {
      all[name] = element.getAttribute(name)
      return all
    }, {} as Record<string, string | null>)
}

export function getElementsByTagName(
  elm: Element | Document,
  tagName: string
): Element[] {
  return new Array( ...elm.getElementsByTagName(tagName) as any )
}

export function findElementText(game: Element, tagName: string) {
  const elements = game.getElementsByTagName(tagName)
  return elements.length ? elements[0].textContent : ''
}
