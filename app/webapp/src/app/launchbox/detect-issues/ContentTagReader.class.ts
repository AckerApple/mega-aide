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
  duplicatesFound = 0
  duplicatesFixed = 0
  lastSliceLeftOvers = ''
  regx: RegExp

  constructor(
    public tagName: string,
    public uniqueKeys?: string[] // when not supplied all keys are used (usually ok)
  ) {
    this.regx = new RegExp(`( |\n|\r)*<${tagName}(.|\n|\r)*?>(.|\n|\r)*?<\/${tagName}>\s*`, 'gi')
  }

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
    this.processString(string, isLast, () => ++this.duplicatesFound)
  }

  rewriteString(
    string: string,
    isLast: boolean
  ): string {
    const toRemove: {index: number, length: number}[] = []
    
    string = this.processString(string, isLast, remove => {
      const duplicatesFixed = this.duplicatesFixed
      this.duplicatesFixed = duplicatesFixed + 1
      toRemove.push(remove)
    })

    toRemove.reverse().forEach(({index, length}) => {
      string = string.slice(0, index) + string.slice(index + length, string.length)
    })

    return string.trimEnd()
  }

  processString(
    string: string,
    isLast: boolean, // is this the last string being streamed?
    onDup: (remove: {index: number, length: number}) => any
  ): string {
    // did we take a slice of a slice on the last stream?
    if ( this.lastSliceLeftOvers ) {
      string = this.lastSliceLeftOvers + string // add the held value to this stream
      this.lastSliceLeftOvers = ''
    }

    if ( !isLast ) {
      const lastUnclosedTag = getLastUnclosedTagByName(string, this.tagName)
      if ( lastUnclosedTag ) {
        if ( lastUnclosedTag.index + lastUnclosedTag.input.length === string.length ) {
          this.lastSliceLeftOvers = ''
        } else {
          // there is a tag towards the end that has now closing match
          this.lastSliceLeftOvers = string.slice(lastUnclosedTag.index, string.length)
        }
        // take only good parts of the string
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

// converts xml to document element and then gets all children
function xmlToObj(xmlString: string) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  const obj: {[index: string]: string | null} = {}
  const nodes = xmlDoc.getElementsByTagName('*')

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    obj[node.nodeName] = node.textContent
  }

  return obj
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

function getLastUnclosedTagByName(
  string: string, // check on last part of array
  tagName: string,
): RegExpExecArray | undefined {
  // look for an unfinished tag
  const regx = new RegExp(`<${tagName}[^>]*(?!.*<\/${tagName}+>)`, 'gi')
  let lastMatch: RegExpExecArray | null
  let lastGoodMatch: RegExpExecArray | undefined

  while ((lastMatch = regx.exec(string)) != null) {
    lastGoodMatch = lastMatch
  }
  
  return lastGoodMatch
}

const x = getLastUnclosedTagByName(`<AdditionalApplication>
<GogAppId />
<OriginAppId />
<OriginInstallPath />
<Id>07d47271-f3f0-486e-a870-4a869b4bcc3f</Id>
<PlayCount>0</PlayCount>
<PlayTime>0</PlayTime>
<GameID>107e7554-95e0-43f6-b15b-82d6d30f3d8e</GameID>
<ApplicationPath>D:\Arcade\System roms\MAME\roms\kf2k3pcb.zip</ApplicationPath>
<AutoRunAfter>false</AutoRunAfter>
<AutoRunBefore>false</AutoRunBefore>
<CommandLine />
<Name>Play (Japan, JAMMA PCB) Version...</Name>
<UseDosBox>false</UseDosBox>
<UseEmulator>true</UseEmulator>
<WaitForExit>false</WaitForExit>
<ReleaseDate>2003-01-01T03:00:00-05:00</ReleaseDate>
<Developer />
<Publisher>SNK Playmore</Publisher>
<Region>Japan</Region>
<Version>(Japan, JAMMA PCB)</Version>
<Status>good</Status>
<EmulatorId>ad45cc22-b5f6-4745-96f4-da3a129b0ede</EmulatorId>
<SideA>false</SideA>
<SideB>false</SideB>
<Priority>2</Priority>
</AdditionalApplication>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>705a276b-2441-4194-9cfc-68ededfaadbf</GameID>
<Name>American Soccer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>012ed3bb-9198-44ab-8f21-e6ad51d710dd</GameID>
<Name>Gunforce - Battle Fire Engulfed Terror Island</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Pig's and Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>0233ab3e-3ea3-4500-bfdf-993276db37c2</GameID>
<Name>Butasan: Pig's &amp; Bomber's</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7ba91a85-26ce-4627-ad66-4aae7ffbc1e5</GameID>
<Name>Choukou Senki Kikaioh</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9100316b-93e6-4dd0-857b-b978e6157635</GameID>
<Name>Kyros no Yakata</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>94de3f95-3701-4810-b5b9-7ee37cd2c347</GameID>
<Name>Savage Bees</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Ninja Ryuukenden II: Ankoku no Jashinken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7b6f973b-4cd8-43af-928e-b987a64a4f35</GameID>
<Name>Shadow Warriors II: The Dark Sword of Chaos</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>aof3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>e6712bbb-bd6e-4623-b0ad-67e50b23129f</GameID>
<Name>Art of Fighting 3: The Path of the Warrior</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>35707724-5737-486f-8d09-f49623391d5d</GameID>
<Name>Two Crude</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9d134edf-05d3-4e6a-93fc-0a734278ad62</GameID>
<Name>Deluxe 4 U</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>f7ff4939-2bbc-42da-9974-67dbabff6f59</GameID>
<Name>WWIII</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7e41f6ee-5f7b-4774-a6b9-8a1da009ddd5</GameID>
<Name>ヘビー・バレル Hebī Bareru</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>8c87c868-3a85-4bd4-b1aa-18fbeb6cbe51</GameID>
<Name>怒首領蜂 最大往生</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>6ce631d6-5ca0-4fda-bf7f-0c58485252b8</GameID>
<Name>Majestic Twelve: The Space Invaders Part IV</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>4442046a-7597-4526-abcb-a3b5dc84339f</GameID>
<Name>King Of Dynast Gear</Name>
<Region>China</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Xing Yi Quan</Name>
<Region>Asia</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a224f054-17cb-4722-a68d-c57abb936e49</GameID>
<Name>Martial Masters / Xing Yi Quan</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3fa1a229-755a-4e5d-b6eb-8165f007be79</GameID>
<Name>SRD: Super Real Darwin</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>df5fd766-dc6e-41dc-a9ed-6530310b52da</GameID>
<Name>Mizubaku Daibouken</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>400d78e8-289c-4f3e-943e-a3c402a8affa</GameID>
<Name>Street Fighter II Turbo: Hyper Fighting</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3e32f659-03f8-4e47-8b33-5f7e852a88a1</GameID>
<Name>Zero Team Suicide Revival Kit</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>206377d9-f72b-4108-ab30-975a0f465ead</GameID>
<Name>Groove On Fight</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>138deb23-b07e-43b3-b4d8-ce3b6be0a9b0</GameID>
<Name>Starhawk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7b420c67-9d2f-4dff-8e10-808552f40e40</GameID>
<Name>Super Puzzle Fighter II X</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>f2f549bc-58d7-4bfc-878e-b38897b52a4b</GameID>
<Name>Green Beret</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>f2f549bc-58d7-4bfc-878e-b38897b52a4b</GameID>
<Name>Rush'n Attack</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a4c03725-5371-4012-9771-6a3395ebcc5e</GameID>
<Name>The Ultimate 11: The SNK Football Championship</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>2ef4e256-b154-46c1-8a2a-87dc0837157a</GameID>
<Name>Pleasure Goal / Futsal - 5 on 5 Mini Soccer</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>1d640bb0-f06d-4481-9301-59314ba9c286</GameID>
<Name>Donkey Kong Jr.</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Riku Kai Kuu Saizensen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7c6cd65e-c137-49fd-bea9-d1fc9131295a</GameID>
<Name>Land Sea Air Squad</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>aodk</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Tsuukai GANGAN Koushinkyoku</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>18467577-d3f5-4af8-86e4-706eb6be9140</GameID>
<Name>Aggressors of Dark Kombat</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>47fa7585-6abe-4a57-a3e2-c8694f987210</GameID>
<Name>Honey Doll</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Sonic Wings 3</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>23d9c2b0-c3cc-4750-a06e-9e891b6e1ca4</GameID>
<Name>Aero Fighters 3</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>0effb8f4-2499-4ffb-a226-3b9037bb67d1</GameID>
<Name>Chulgyeok D-Day</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fa989091-6650-4dc6-88c8-390869d762e5</GameID>
<Name>Money Puzzle Exchanger</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>a86f783e-7530-4d8e-a3cf-369668dab754</GameID>
<Name>Gigas Mark II</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3fdf1db-7b76-4218-921d-581ac9486fae</GameID>
<Name>Saikyousame</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>190e6479-bf78-4c42-89f2-3ac29499371b</GameID>
<Name>Graduation Certificate</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>5b6adcb0-33c0-458d-9a9b-8836d920e75e</GameID>
<Name>NEW Moero!! Pro Yakyuu Homerun Kyousou</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7f2d072c-e177-450a-80b5-e98e8d4f5c57</GameID>
<Name>Mr. Heli</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>46a90a7e-2cfa-4fd9-9a3a-6d34dad2b8c7</GameID>
<Name>Fatal Fury 3: Road to the Final Victory</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>61a4776d-ac0f-455b-9343-c30a95a9fe1a</GameID>
<Name>Armed Formation</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b5015ee2-cc0a-4be7-b4d2-56f1ac00de8a</GameID>
<Name>Saru-Kani-Hamu-Zou</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>9e44164d-a9fb-4357-b8a3-8d43d802fba8</GameID>
<Name>9-Ball Shootout Championship</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed0502f-5da4-4d76-b33a-d6e9ae79b3ba</GameID>
<Name>Revenger '84</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>bfb5ae80-fce7-418a-95f6-a45ad155f881</GameID>
<Name>Perfect Soldiers</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Suiko Enbu</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>7169007c-4b75-464a-ad60-2ecbe4426446</GameID>
<Name>Outlaws of the Lost Dynasty</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>f829c832-fadd-45f2-a605-b60aa8aa5a99</GameID>
<Name>Sonson</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>a33fe7f7-37c8-4939-ba58-ef86be588d85</GameID>
<Name>RodLand</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>8bf07f25-324d-4201-a07a-8756094d8648</GameID>
<Name>Big Buck Hunter Call of the Wild</Name>
<Region>United States</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>00313611-e78c-4c11-9e42-75a81f76d101</GameID>
<Name>Argus no Senshi</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>38bf4793-7713-4638-b859-7048efc2dc26</GameID>
<Name>Western Express</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>87407015-0299-4ace-8bad-4d81e15e95fc</GameID>
<Name>Star Blazer</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Garou Densetsu Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d764477b-ae41-4707-95ed-58dba19b4281</GameID>
<Name>Real Bout Fatal Fury Special</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>abb8307b-2db9-48e8-9052-93433a201ade</GameID>
<Name>Metal Slug X</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>4bca770f-29b8-483d-afb3-750e447b982b</GameID>
<Name>Kozmik Krooz'r</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>83e50bde-8767-4625-ac22-fad8c1e06469</GameID>
<Name>Exerizer</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>079c77d0-d4f5-48ec-95c6-ae1fb63a562c</GameID>
<Name>Psyvariar: Revision</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Chou-Jikuu Yousai Macross II</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>184ca5da-f490-497b-a81d-9905cc1fa423</GameID>
<Name>Super Spacefortress Macross II</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>c297f8f9-045d-4ea2-bd3b-dac797bb934c</GameID>
<Name>Sega Water Ski</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Thunder &amp; Lightning 2</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>59277593-8f34-4ac2-9616-91aeab556b4f</GameID>
<Name>Block Carnival</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>7d11a98c-3185-44a2-8eaa-9a63b7cdb5f9</GameID>
<Name>Vamp x1/2</Name>
<Region>Korea</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9e71994a-61d4-4685-83aa-8217a947cae1</GameID>
<Name>Ray Force</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Wardner no Mori</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4ed92d92-c2e8-448d-93bf-fbd7cb38d25f</GameID>
<Name>Pyros</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatakot</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>77839aa9-55d5-48f6-bbf0-15163cc05fe3</GameID>
<Name>Tatacot</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>22099903-e2c3-4ceb-9803-f5118cb0ab34</GameID>
<Name>Pitapat Puzzle</Name>
<Region>North America</Region>
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>9a66ef8a-4bf5-4bb8-af73-cbe22747829d</GameID>
<Name>Astro Invader</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Tokushu Butai Jacka</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>d3756255-e4ea-4972-8c25-cbb7a264e684</GameID>
<Name>Jackal</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>ff95285c-492e-4de4-9896-5518c97418e7</GameID>
<Name>grudge</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>3431d27d-5bd7-4c63-b60a-f5b935cfb922</GameID>
<Name>Gunbalina</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>3431d27d-5bd7-4c63-b60a-f5b935cfb922</GameID>
<Name>Gun Bullet</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>114de0f9-5f8d-4948-b0af-ccbb8d0dbbee</GameID>
<Name>Seishun Scandal</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippū Mahō Daisakusen Kingdom-Grandprix</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b418a360-c23d-401b-942e-99a9efc1d4b4</GameID>
<Name>Shippu Mahou Daisakusen</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Hyper Sports Special</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>3187c6f4-ade4-4200-821f-8cacff20a725</GameID>
<Name>Konami '88</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>7923140d-dab1-4103-b3d3-19e132aa6f7c</GameID>
<Name>Pig Out</Name>
<Region>World</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Musashi Ganryuki</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>b3741fc2-02f7-416d-a81f-ad622df07622</GameID>
<Name>Ganryu</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>605d5968-3214-408e-9806-594cc3c8d504</GameID>
<Name>Gouketsuji Ichizoku 2</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>ジョーとマック 戦え原始人 Jō to Makku Tatakae Genshijin</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac: Caveman Ninja</Name>
<Region>Europe</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Tatakae Genshizin Joe &amp; Mac</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>fad04bfd-f790-45c9-940f-474a2af9fab2</GameID>
<Name>Joe &amp; Mac</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>84e496a3-a42f-4ee5-843f-20e7940f81e6</GameID>
<Name>Circus</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>4a1b877f-28b0-4773-b47b-ae7997f4fdf9</GameID>
<Name>Kick Off: Jaleco Cup</Name>
<Region />
</AlternateName>
<AlternateName>
<GameID>0d268d2d-2671-4477-a49f-c9ee4c860471</GameID>
<Name>Ashita no Joe</Name>
<Region>Japan</Region>
</AlternateName>
<AlternateName>
<GameID>0d268d2d-2671-4477-a49f-c9ee4c860`,'AdditionalApplication')

console.log('x',x)