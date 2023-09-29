import { Observable, Subject, combineLatest, map, mergeMap, of, shareReplay, switchMap, take, takeUntil } from "rxjs"
import { PlayerControl, emitRomsUsingSame } from "./PlayerControl.class"
import { LedBlinky } from "./LedBlinky.class"
import { NewPlayer, Player } from "./Player.class"
import { Light } from "./Light.class"
import { ControlGroup, NewControlGroup } from "./ControlGroup.class"
import { Emulator } from "./Emulator.class"

// Used for <ledblinky-layouts-components>
export class LightControl {
  debug?: boolean

  constructor(public light: Light) {}
}

// Used for <ledblinky-controls-layouts-components>
export class LightAndControl extends LightControl {
  romControl?: NewControlGroup // aka <controlGroup groupName="ROM_NAME" voice="" numPlayers="4" alternating="0" jukebox="0">

  constructor(
    public override light: Light,
    public control: PlayerControl,
    public ledBlinky: LedBlinky,
    // parent element details
    public player?: Player | NewPlayer,
    // public playerIndex?: number,
  ) {
    super(light)
  }

  load = 0

  gamesUsingSame$: Observable<EmulatorRom[]> = combineLatest([
    this.ledBlinky.controls$,
    this.light.details$.pipe(take(1)), // never closes, its a BehaviorSubject
  ]).pipe(
    mergeMap(([controls, details]) => {
      setTimeout(() => ++this.load, 0)
      
      const destroy$ = new Subject<void>() // Notifier to complete the chain
      return of(null).pipe(
        switchMap(() => {
          const emus = controls?.emulators;
    
          if (!emus) {
            return of([]);
          }
    
          return new Observable<EmulatorRom[]>(sub => {
            emitRomsUsingSame(sub, emus, details)
    
            // Cleanup function to unsubscribe and complete the notifier
            return () => {
              destroy$.next()
              destroy$.complete()
              --this.load
            }
          })
        }),
        takeUntil(destroy$), // Complete the chain when the source observables complete
      )
    }),
    // shareReplay(1)
  )

  bestGuesses$ = this.gamesUsingSame$.pipe(
    map(results => {
      const endArray: ControlGuess[] = []
      const emulator = this.control.player.controlGroup.emulator || this.romControl?.emulator

      if ( emulator ) {
        const emuResults = results.filter(result => result.emulator.xml.details.emuname === emulator.xml.details.emuname)

        if ( emuResults.length ) {
          endArray.push( ...bestGuessBySames(emuResults) )
        }
      }

      const first = endArray[0]
      const allGuess = bestGuessBySames(results)
      const duplicate = first ? Object.entries(first)
        .every(([key, value]) => key==='count' || value === allGuess.find(guess => guess.name === key)) : false
      
        const pushSecondGuess = !endArray.length || !duplicate
      if ( pushSecondGuess ) {
        endArray.push( ...allGuess )
      }

      return endArray
    }),
    shareReplay(1)
  )
}

export interface EmulatorRom {
  rom: ControlGroup
  emulator: Emulator
  playerControl: PlayerControl
  playerIndex: number
}


function bestGuessBySames(
  results: EmulatorRom[]
): ControlGuess[] {
  const startWith = {} as Record<string, GuessObject>

  const names = results.reduce((all, result) => {
    const name = result.playerControl.xml.details.name

    if (all[name]) {
      all[name].count = all[name].count + 1
    } else {
      all[name] = {
        name,
        count: 1,
        playerIndexes: {},
        inputCodes: {},
        colors: {},
      }
    }

    const playerIndexes = all[name].playerIndexes
    playerIndexes[result.playerIndex] = playerIndexes[result.playerIndex] ? playerIndexes[result.playerIndex] + 1 : 1

    const color = result.playerControl.xml.details.color
    if ( color ) {
      const allColors = all[name].colors
      allColors[color] = allColors[color] ? allColors[color] + 1 : 1
    }

    const inputCodes = result.playerControl.xml.details.inputCodes
    if ( inputCodes ) {
      const allInputCodes = all[name].inputCodes
      allInputCodes[inputCodes] = allInputCodes[inputCodes] ? allInputCodes[inputCodes] + 1 : 1
    }

    return all
  }, startWith)

  // Object.values(names).sort((b,a)=>Number(a.count)-Number(b.count))
  const best = getBestChoice(names)
  const choices = []

  if ( best ) {
    choices.push(best)
    delete names[ best.name ]
    
    const best2 = getBestChoice(names)
    if ( best2 ) {
      choices.push(best2)
    }
  }

  return choices
}

export interface ControlGuess {
  name: string
  count: number
  playerIndex: number
  inputCodes: string
  color: string
}

interface GuessObject {
  name: string
  count: number,
  colors: {
    [color: string]: number
  },
  playerIndexes: {
    [player: string]: number
  },
  inputCodes: {
    [inputCodes: string]: number
  }
}

function getBestChoice(
  names: Record<string, GuessObject>
): ControlGuess {
  return Object.entries(names).reduce((all, [name, { count, playerIndexes, inputCodes, colors }]) => {
    if (all.count > count) {
      return all // existing record is greater
    }

    all.name = name
    all.count = count
    
    all.playerIndex = Object.entries(playerIndexes).reduce((all,[playerIndex, count]) => {
      if ( count > all.count ) {
        all.playerIndex = Number(playerIndex)
        all.count = count
      }
      return all
    }, {count: 0, playerIndex:0}).playerIndex
    
    all.color = Object.entries(colors).reduce((all,[color, count]) => {
      if ( count > all.count ) {
        all.color = color
        all.count = count
      }
      return all
    }, {count: 0, color: ''}).color
    
    all.inputCodes = Object.entries(inputCodes).reduce((all,[inputCodes, count]) => {
      if ( count > all.count ) {
        all.inputCodes = inputCodes
        all.count = count
      }
      return all
    }, {count: 0, inputCodes: ''}).inputCodes

    return all
  }, { count: 0, playerIndex: 0, inputCodes: '', color: '' } as ControlGuess)
}
