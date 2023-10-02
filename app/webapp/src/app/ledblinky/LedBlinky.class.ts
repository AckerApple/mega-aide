import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers';
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader';
import {
  BehaviorSubject,
  bufferCount,
  combineLatest,
  concatMap,
  EMPTY,
  firstValueFrom,
  from,
  map,
  mergeMap,
  Observable,
  of,
  shareReplay,
  Subject,
  Subscription,
  switchMap,
  take,
  toArray,
} from 'rxjs';
import { SessionProvider } from '../session.provider';
import {
  InputsMap,
  getControlDefaultsByControlXml,
  getEmulatorsByControl,
  getLastLayoutFileByLightsConfig,
  getLightConfigByLayoutFile,
  IniNameValuePairs,
  iniToObject,
  LedBlinkyControls,
  UniqueInputCode,
  UniqueInputLabel,
  LedControllerDetails,
  LightsConfig,
  marryPlayerControlsToLights,
  fileTryLoadingPipes,
  addMissingControlsToLightControls,
  getNameAveragesByControls$,
  getAvailControlsMap,
  registerPorts,
  mapPortElm,
} from './LedBlinky.utils';
import { PlayerControl } from './PlayerControl.class';
import { xmlDocToString } from '../xml.functions';
import { createElement } from '../launchbox/games.utils';
import { LedController } from './LEDController.class';
import { Port } from './LedPort.class';
import { NgZone } from '@angular/core';
import {  NewControlGroup } from './ControlGroup.class';
import { LightAndControl } from './LightAndControl.interface';
import { NewPlayer, PlayerDetails } from './Player.class';
import { Emulator, EmulatorDetails, NewEmulator } from './Emulator.class';
import { elmAttributesToObject, getElementsByTagName } from './element.utils';

enum LEDBlinkyFiles {
  UnknownGames = 'UnknownGames.dat',
  NewInputCodes = 'NewInputCodes.ini',
  Color_RGB = 'Color-RGB.ini',
  LEDBlinkyAnimationEditor = 'LEDBlinkyAnimationEditor.ini',
  LEDBlinkyControls = 'LEDBlinkyControls.xml',
  LEDBlinkyInputMap = 'LEDBlinkyInputMap.xml',
  // maps things like P3B2=KEYCODE_RSHIFT
  LEDBlinkyConfigWizard = 'LEDBlinkyConfigWizard.ini',
}

interface Size {
  width: number;
  height: number;
}

const displaySizes: Size[] = [
  { width: 640, height: 480 }, // 1
  { width: 1024, height: 768 }, // 2
  { width: 1280, height: 960 }, // 3
];

export class LedBlinky {
  constructor(
    public session: SessionProvider,
    private ngZone: NgZone,
  ) {
    // when config is loaded or changes, lets set the curve
    this.subs.add(
      this.session.config$.subscribe(config => 
        this.curve$.next( config.ledBlinky.curve || 0.6 )
      )
    )

    // when our curve changes, lets save to storage
    this.subs.add(
      this.curveChange$.subscribe(curve => {
        this.curve$.next( curve )
        this.session.config.ledBlinky.curve = curve
        session.saveStorage()
      })
    )
  }

  curve$ = new BehaviorSubject<number>(0.6)
  curveChange$ = new Subject<number>()

  // directory?: DirectoryManager
  directoryChange = new BehaviorSubject<DirectoryManager | undefined>(
    undefined
  );
  directory$ = this.directoryChange.pipe(
    switchMap((c) => (c ? of(c) : EMPTY)), // cancel pipe if directory is not defined
    shareReplay(1),
    take(1), // make sure Observable appears as closed (TODO: find out if this gets in the way of choosing a new directory)
  );

  displaySize?: Size;
  pickerId = 'ledBlinkyPicker';

  // custom to this app
  zoom: number = 2;
  zoom$ = new BehaviorSubject<number>(this.zoom);

  colors?: IniNameValuePairs;
  colors$: Observable<IniNameValuePairs> = this.directoryChange.pipe(
    mergeMap((directory) => {
      if (!directory) {
        return from(Promise.resolve({}));
      }

      const iniFileName = LEDBlinkyFiles.Color_RGB;
      return from(
        new Promise<IniNameValuePairs>(async (res, rej) => {
          const fxEditorConfig = await directory.findFileByPath(iniFileName);

          if (!fxEditorConfig) {
            this.session.warn(
              `Cannot load colors$ ${directory.path} ${iniFileName}`
            );
            res({});
            return {} as IniNameValuePairs;
          }

          const config = await fxEditorConfig.readAsText();
          const configObject = iniToObject(config)['Colors'];
          this.colors = configObject;
          res(this.colors);
          return this.colors;
        })
      );
    }),
    shareReplay(1)
  );

  newInputCodesFile$ = this.getFileTryLoader(LEDBlinkyFiles.NewInputCodes);
  newInputCodes$ = this.newInputCodesFile$.pipe(
    mergeMap((file) => from(this.getNewInputCodes(file))),
    shareReplay(1),
  );

  animEditorObjectFile$ = this.getFileTryLoader(
    LEDBlinkyFiles.LEDBlinkyAnimationEditor
  );
  animEditorObject$ = this.animEditorObjectFile$.pipe(
    mergeMap((file) => this.getAnimEditorObject(file)),
    shareReplay(1)
  )

  controlsFile$ = this.getFileTryLoader(LEDBlinkyFiles.LEDBlinkyControls)
  inputsMapFile$ = this.getFileTryLoader(LEDBlinkyFiles.LEDBlinkyInputMap)
  inputsMap$: Observable<InputsMap> = this.inputsMapFile$.pipe(
    mergeMap((file) => from(this.getInputsMapByDir(file))),
    shareReplay(1),
  );

  controls$: Observable<LedBlinkyControls> = combineLatest([
    this.inputsMap$,
    this.controlsFile$, // LEDBlinkyControls.xml
  ]).pipe(
    mergeMap(([inputsMap, controlsFile]) => {
      if (!inputsMap) {
        throw new Error('💾 Cannot load inputs map file')
        // return of(null);
      }
      return from(this.getControlsByDir(inputsMap, controlsFile))
    }),
    map(controls => {
      if ( !controls ) {
        throw new Error('💾 Cannot load LEDBlinkyControls.xml file. No controls found')
      }

      return controls
    }),
    shareReplay(1), // this cache may not be good for changes?
  )

  unknownGamesFile$ = this.getFileTryLoader(LEDBlinkyFiles.UnknownGames)
  unknownGames$: Observable<NewEmulator[] | undefined> =
    this.unknownGamesFile$.pipe(
      mergeMap((datFile) => {
        return from(this.getUnknownGamesByDat(datFile).then(dat => {
          return dat
        }).catch((err: Error) => {
          this.session.error('Error in LedBlinky.class.ts@unknownGames$',err)
          throw err
        }))
      }),
      shareReplay(1),
      take(1),
    )

    
  // storage of last chosen layout name
  layoutName$$ = new BehaviorSubject<string | undefined>(undefined)

  layoutNames$: Observable<string[]> = this.directory$.pipe(
    mergeMap(directory => 
      from(
        directory.listFiles()
          .then(files => files.filter((v) => v.includes('.lay')))
      )
    )
  )

  // use chosen layoutName$$ layout OR lookup default
  layoutName$ = combineLatest([
    this.directory$,
    this.layoutName$$,
    this.animEditorObject$,
  ]).pipe(
    mergeMap(([dir, layoutName, animEditorObject]) => {
      if ( layoutName || !dir ) {
        return of( layoutName )
      }
      
      if ( layoutName ) {
        return of(layoutName) // no default needed
      }
  
      if ( !animEditorObject ) {
        return of(null)
      }
      
      const name = getLastLayoutFileByLightsConfig(animEditorObject)
      return of(name)
    }),
    shareReplay(1)
  )

  subs = new Subscription()

  /** brings LEDBlinkyControls.xml.<controlGroup> and a *.layout file together */
  marryControlsToLights$(
    controlGroup: NewControlGroup, // game map of lights  
  ): Observable<LightAndControl[]> {
    return combineLatest([
      this.lightLayout$,
      this.layoutName$, // when the layout name changes, lets redraw
    ]).pipe(
      mergeMap(([
        lightLayoutConfig,
      ]) => {
        const promise = (async () => {      
          if ( !lightLayoutConfig ) {
            return []
          }
      
          const lightAndControls: LightAndControl[] = []
          const proms = controlGroup.players.map(async (player) => {
            const lightControls = await marryPlayerControlsToLights(
              player, lightLayoutConfig as LightsConfig, this
            )
      
            lightAndControls.push(...lightControls)
          })
      
          await Promise.all(proms)
      
          // add lights that could not be matched
          const lightProms = lightLayoutConfig.lights.map(light => {
            const found = lightAndControls.find(lightControl => lightControl.light.details.name === light.details.name)
      
            if ( found ) {
              return
            }
      
            // fall back when light could not be matched to a control
            const playerDetails: PlayerDetails = {} as PlayerDetails
            const player = new NewPlayer(
              playerDetails,
              controlGroup,
              [],
              0,
              createElement('player'),
              this
            )
            // ??? TODO: it maybe possible that we need to controlGroup.xml.element.appendChild( player.xml.element )
            const control = new PlayerControl(this, [], player)
            control.edit = true // start off in edit mode
            lightAndControls.push(
              new LightAndControl(light, control, this)
            )
          })
      
          // after all above is calculated then ghost in lights that were not matched
          Promise.all(lightProms)
            .then(() => {
              // add missing controls
              controlGroup.players.forEach(player =>
                addMissingControlsToLightControls(player, lightAndControls, this)
              )
            })
          
      
          return lightAndControls  
        })()
        
        return from(promise)
      })
    )    
  }

  async saveControls(
    controls?: LedBlinkyControls // when not supplied we look at existing cache in memory
  ) {
    controls = controls || await firstValueFrom(this.controls$)
    this.session.saveFileXml(controls.file, controls.xml)
  }

  getEmulatorPlayerControls(
    emulator: Emulator,
    playerIndex: number,
  ) {
    const controls: PlayerControl[] = []
    emulator.controlGroups.forEach((controlGroup) => {
      controlGroup.controlGroups.forEach((controlGroup) =>
        controlGroup.players[playerIndex] && 
        controls.push(...controlGroup.players[playerIndex].controls)
        // controlGroup.players.forEach(player => controls.push(...player.controls))
      )
    })

    return controls
  }

  async getEmulatorAverageNameByInputCode(
    emulator: Emulator,
    inputCode: string,
    playerIndex: number,
  ) {
    const controls = this.getEmulatorPlayerControls(emulator, playerIndex)
    const stats = await firstValueFrom(getNameAveragesByControls$(controls, inputCode))
    const bestName = Object.entries(stats).reduce((all,[key, count]) => {
      if ( all.count <= count ) {
        all.name = key
        all.count = count
      }
      return all
    }, {name: '', count: 0})
    return bestName.name
  }

  getAverageNamesForInputCode$(
    inputCode: string,
    playerIndex: number,
  ) {
    const all = {} as { [name: string]: number }
    return this.controls$.pipe(
      switchMap(emuControls => {
        if (!emuControls) {
          //results$.next([])
          //results$.complete()
          //return EMPTY
          return of([])
        }
  
        const controls: PlayerControl[] = []

        emuControls.emulators.forEach((emulator) =>
          controls.push(
            ...this.getEmulatorPlayerControls(emulator, playerIndex)
          )
        )
        return of(controls)
      }),
      concatMap(controls => {
        const controlRead = from(controls).pipe(
          bufferCount(50),
          mergeMap((batch, index) => 
            getNameAveragesByControls$(batch, inputCode)
          ),
          map(stats => {
            Object.entries(stats).forEach(([key, count]) => {
              all[key] = all[key] || 0
              all[key] = all[key] + count
            })

            // update()

            return all
          }),
          take(controls.length),
          toArray()
        )

        return controlRead
      }),
      take(1),
      map(() => {
        return Object.entries(all)
          .sort((a, b) => b[1] - a[1])
          .map(([key]) => key)
      })
    )
  }

  private async getNewInputCodes(newInputCodeFile: DmFileReader) {
    const config = await newInputCodeFile.readAsText();
    const configObject = iniToObject(config)['InputCodes'];
    return configObject;
  }

  // configWiz?: ConfigWiz
  /*
  configWizard$: Observable<ConfigWiz | undefined> = this.directory$.pipe(
    mergeMap(directory => from(this.getConfigWizard(directory)))
  )

  async getConfigWizard(directory: DirectoryManager): Promise<ConfigWiz | undefined> {
    const iniFileName = LEDBlinkyFiles.LEDBlinkyConfigWizard
    const fxEditorConfig = await directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)
    return configObject as ConfigWiz
  }
  */

  async getAnimEditorObject(file: DmFileReader) {
    const config = await file.readAsText();
    const configObject = iniToObject(config)['Settings'];
    this.displaySize = displaySizes[Number(configObject['DisplaySize']) - 1];
    return configObject;
  }

  lightLayout$: Observable<LightsConfig | undefined> = combineLatest([
    this.layoutName$,
    this.directory$,
  ]).pipe(
    mergeMap(([layoutName, directory]) => {
      if (!layoutName) {
        this.session.warn(
          `No default layout defined in LEDBlinky path ${directory.path}`
        );
        
        return of(undefined)
      }

      return from(this.getLayoutInDirectory(layoutName, directory))
    }),
    shareReplay(1),
  )

  async getLightLayoutByName(
    directory: DirectoryManager,
    layoutName?: string // will look up current set or default
  ) {
    // possibly lookup default layout name
    if ( !layoutName ) {
      return await firstValueFrom(this.lightLayout$)
    }

    return this.getLayoutInDirectory(layoutName, directory)
  }

  // 🧠 memory lasts while app open
  loadedLayouts: {[layoutName: string]: LightsConfig} = {}
  async getLayoutInDirectory(
    layoutName: string, // *.lay
    directory: DirectoryManager
  ) {
    if ( this.loadedLayouts[layoutName] ) {
      return this.loadedLayouts[layoutName]
    }

    const layoutFile = await directory.findFileByPath(layoutName as string);

    if (!layoutFile) {
      this.session.warn(
        `Cannot load #loadLightLayoutByName ${directory.path} ${layoutName}`
      );
      return;
    }

    const layoutConfig = await getLightConfigByLayoutFile(layoutFile)
    this.loadedLayouts = {
      [layoutName]: layoutConfig
    }

    this.session.debug(`🗺 ⚙️ Loaded layoutConfig ${layoutName}`, {
      lights: layoutConfig.lights.length,
      settings: layoutConfig.settings,
    })
    return layoutConfig  
  }

  getFxEditorByDir(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs
  ) {
    // get relative file path to layout file
    const relativeFile = getLastLayoutFileByLightsConfig(animEditorObject);
    const promise = this.getLightLayoutByName(directory, relativeFile);
    return promise;
  }

  getFileTryLoader(file: LEDBlinkyFiles) {
    return fileTryLoadingPipes(file, this.directory$);
  }

  async getControlsByDir(
    inputsMap: InputsMap,
    controlsFile: DmFileReader
  ): Promise<LedBlinkyControls | undefined> {
    const [xml] = await Promise.all([controlsFile.readAsXml()]);

    if (!inputsMap) {
      return; // a log warning was already fired
    }

    const controlDefaults = getControlDefaultsByControlXml(xml, this)
    
    const emulators = getEmulatorsByControl(
      xml, controlDefaults, this
    )

    const controls: LedBlinkyControls = {
      file: controlsFile,
      inputsMap,
      xml,
      emulators,
      controlDefaults,
    };

    const mame = controlDefaults.find((x) => x.details.groupName === 'MAME');
    if (mame) {
      controls.availMap = await getAvailControlsMap(inputsMap, mame);
    }

    return controls;
  }

  async getInputsMapByDir(inputsMapFile: DmFileReader): Promise<InputsMap> {
    const labels: UniqueInputLabel[] = [];
    const inputCodes: UniqueInputCode[] = [];

    const xml = await inputsMapFile.readAsXml() as any
    const ledControllers = getElementsByTagName(xml, 'ledController').map(
      (element) => {
        const ports: Port[] = getElementsByTagName(element, 'port').map(mapPortElm)
        ports.forEach((port) => registerPorts(port, labels, inputCodes));
        const details = elmAttributesToObject(element) as LedControllerDetails;
        const control = new LedController(
          element, details, ports,
        )
        return control;
      }
    );

    const result: InputsMap = {
      labels,
      inputCodes,
      ledControllers,
      file: inputsMapFile,
      xml,
    };

    return result;
  }

  async getUnknownGamesByDat(datFile: DmFileReader): Promise<NewEmulator[]> {
    const text: string = await datFile.readAsText()
    const lines = text.split(/\n|\r/)
    const results = lines.reduce((all, line) => {
      if (!line.includes('|')) {
        return all;
      }

      const [emuname, gameName] = line.split('|')
      let emuIndex = all.findIndex((one) => one.xml.details.emuname === emuname)

      if (emuIndex < 0) {
        const emuDetails: EmulatorDetails = { emuname }
        const newEmu = new NewEmulator(this.session.ledBlinky, emuDetails)
        newEmu.controlGroups = []
        emuIndex = all.length
        all.push(newEmu)
      }

      const emulator = all[emuIndex]
      
      emulator.createControlGroupByDetails({
        groupName: gameName,
      })

      return all;
    }, [] as NewEmulator[])
        
    return results
  }
}
