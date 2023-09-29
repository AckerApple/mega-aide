import { findElementText } from "src/app/ledblinky/element.utils"

export function getGameElementTitle(game: Element) {
  return findElementText(game, 'Title')
  // return game.getElementsByTagName('Title')[0].textContent
}

export function getGameElementId(game: Element) {
  return findElementText(game, 'ID')
}
