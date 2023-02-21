import { BehaviorSubject } from "rxjs"

/** 
 * 1. reads a string, especially a stream of strings, looking for one specific tagName
 *  1.a Use the class function examineString() to stream read
 * 2. When found it reads the child tag names and their textContent to create an Object of key/value pairs
 * 3. If any other matching tag is found, with the sames data points, it will register as a duplicate
 * 4. The event duplicatesFound$ will be emitted when duplicate is found
 * 5. Use the class function rewriteString() to stream read a string so that you can rewrite it elsewhere
 *   5.a rewriteString() removes the duplicates of a tag that shares the same values, and returns a new string
 * 
*/
export class ContentTagReader {
  seenSupports: string[] = []
  duplicatesFound$ = new BehaviorSubject(0)
  duplicatesFixed$ = new BehaviorSubject(0)
  lastSliceLeftOvers: string | undefined

  constructor(
    public tagName: string,
    public uniqueKeys?: string[] // when not supplied all keys are used (usually ok)
  ) {}

  processMatches(
    matches: RegExpExecArray
  ): {index: number, length: number} | void {
    const data = xmlToObj(matches[0])
    
    // the original tag name comes out as a data point (remove)
    delete data[this.tagName]

    const uniqueKeys = this.uniqueKeys || Object.keys(data)
    const keyValues: (string | null)[] = uniqueKeys.map(x => data[x])
    
    const keyValue = keyValues.join(':')    
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
      const lastUnclosedTag = getLastUnclosedTagByName(string, this.tagName)
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

export function getMatchCount(
  regx: RegExp,
  string: string,
): number {
  let count = 0

  while ((regx.exec(string)) != null) {
    ++count
  }
  
  return count
}