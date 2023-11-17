import { Injectable } from "@angular/core"
import { DirectoryManager, FileStats } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, EMPTY, from, map, mergeMap, Observable, of, shareReplay, switchMap } from "rxjs"
import { SessionProvider } from "../session.provider"

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'
const pathTo = 'xarcade-xinput/mappings'

/** Used in two different sections that cannot share references
 * 1. In LaunchBox, we need the relative path to Xinput from within LaunchBox
 * 2. In the XInput dedicated section, we don't care about relative paths
*/
@Injectable() export class XArcadeXInputProvider {
  directoryChange = new BehaviorSubject<DirectoryManager | undefined>( undefined )
  
  directoryByLaunchBox$ = this.session.launchBox.directoryChange.pipe(
    switchMap(() => {
      // are we maybe already loaded?
      const directory = this.directoryChange.getValue()
      if ( directory ) {
        return of(directory)
      }
      
      // load from launch box
      if ( this.session.launchBox.xarcadeDir ) {
        this.directoryChange.next(this.session.launchBox.xarcadeDir)
        // return EMPTY
        return of(this.session.launchBox.xarcadeDir)
      }

      return of(undefined)
      // return EMPTY
    }), // continue if directory defined otherwise cancel pipe
    shareReplay(1),
  )

  directory$ = combineLatest([
    this.directoryChange,
    this.directoryByLaunchBox$,
  ]).pipe(
    switchMap((c, x) => c ? of(c) : EMPTY), // continue if directory defined otherwise cancel pipe
    map(x => x[0] as DirectoryManager),
    shareReplay(1), // once we have a defined directory, remember for new subs
  )

  mappings$: Observable<FileStats[] | undefined> = this.directory$.pipe(
    mergeMap(
      (directory: DirectoryManager) => from(this.getMappings(directory)),
    ),
    shareReplay(1),
  )

  constructor(public session: SessionProvider) {}
 
  async findMappingsDir() {
    const directory = this.directoryChange.getValue()

    if ( !directory ) {
      return
    }

    let mappings = await directory.findDirectory('mappings')

    if ( mappings ) {
      return mappings
    }
    
    return await directory.findDirectory(pathTo)
  }

  async getMappings(
    directory: DirectoryManager
  ): Promise<FileStats[] | undefined> {
    if(!directory) {
      return
    }

    const mappings = await this.findMappingsDir()
      
    if ( !mappings ) {
      this.session.warn(`unable to locate "mappings" or "${pathTo}" 📁 folder(s) within ${directory.path}`)
      return
    }
    
    try {
      const files = await mappings.getFiles()
      
      const mappingFiles = await Promise.all(
        files.filter(file => file.name.split('.').pop() === 'json')
        .map(file => file.stats())
      )

      return mappingFiles
    } catch (err) {
      this.session.error(`Error loading XArcade mappings folder ${pathTo}`,err)
      throw err
    }
  }
}
