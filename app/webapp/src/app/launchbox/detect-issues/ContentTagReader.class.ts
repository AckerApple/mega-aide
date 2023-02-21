import { BehaviorSubject } from "rxjs"

export class ContentTagReader {
  seenSupports: string[] = []
  duplicatesFound$ = new BehaviorSubject(0)
  duplicatesFixed$ = new BehaviorSubject(0)
  lastSliceLeftOvers: string | undefined

  constructor(public tagName: string) {}

  processMatches(
    matches: RegExpExecArray
  ): {index: number, length: number} | void {
    // todo: will need to define how to get values of an object
    const {ControllerId, GameId, SupportLevel} = xmlToObj(matches[0])
    const keyValue = `${ControllerId}:${GameId}:${SupportLevel}`
    const remove = this.seenSupports.includes(keyValue)
  
    if ( remove ) {
      return {index: matches.index, length: matches[0].length}
    } else {
      this.seenSupports.push(keyValue)
    }
  }

  examineString(
    string: string,
    isLast: boolean
  ): void {
    this.processString(string, isLast, () => {
      const duplicatesFound = this.duplicatesFound$.getValue()
      this.duplicatesFound$.next( duplicatesFound + 1 )
    })
  }

  rewriteString(
    string: string,
    isLast: boolean
  ): string {
    const toRemove: {index: number, length: number}[] = []
    
    string = this.processString(string, isLast, remove => {
      const duplicatesFixed = this.duplicatesFixed$.getValue()
      this.duplicatesFixed$.next( duplicatesFixed + 1 )
      toRemove.push(remove)
    })

    toRemove.reverse().forEach(({index, length}) => {
      string = string.slice(0, index) + string.slice(index + length, string.length)
    })

    return string
  }

  processString(
    string: string,
    isLast: boolean, // is this the last string being streamed?
    onDup: (remove: {index: number, length: number}) => any
  ): string {
    // did we take a slice of a slice on the last stream?
    if ( this.lastSliceLeftOvers ) {
      string = this.lastSliceLeftOvers + string // add the held value to this stream
      this.lastSliceLeftOvers = undefined
    }

    if ( !isLast ) {
      const lastUnclosedTag = getLastUnclosedTagByName(string, 'GameControllerSupport')
      if ( lastUnclosedTag ) {
        this.lastSliceLeftOvers = string.slice(lastUnclosedTag.index, string.length)
        string = string.slice(0, lastUnclosedTag.index)
      }
    }
    
    const tagName = this.tagName
    const regx = new RegExp(`( |\n|\r)*<${tagName}(.|\n|\r)*?>(.|\n|\r)*?<\/${tagName}>\s*`, 'gi')
    let matches: RegExpExecArray | null
      
    while ((matches = regx.exec(string)) != null) {
      const remove = this.processMatches(matches)

      if ( remove ) {
        onDup(remove)
      }
    }
    
    return string
  }
}

function xmlToObj(xmlString: string) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  const obj: {[index: string]: string | null} = {}
  const nodes = xmlDoc.getElementsByTagName('*')

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    obj[node.nodeName] = node.textContent
  }

  return obj;
}

function getLastUnclosedTagByName(
  string: string,
  tagName: string,
): RegExpExecArray | undefined {
  const regx = new RegExp(`<${tagName}[^>]*(?!.*<\/${tagName}+>)`, 'gi')
  let lastMatch: RegExpExecArray | null
  let lastGoodMatch: RegExpExecArray | undefined

  while ((lastMatch = regx.exec(string)) != null) {
    lastGoodMatch = lastMatch
  }
  
  return lastGoodMatch
}
