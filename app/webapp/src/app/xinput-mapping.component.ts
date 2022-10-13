import { Component, Inject } from '@angular/core'
import { ActivatedRoute, Route, Router } from '@angular/router'
import { SessionProvider } from './session.provider'
import windowsKeys from './windowsKeys.json'
import gamepad from './gamepad.json'

@Component({
  templateUrl: './xinput-mapping.component.html',
}) export class XinputMappingComponent {
  windowsKeys: { [index: string]: { num: number, description: string} } = windowsKeys
  gamepad: { [index: string]: boolean } = gamepad

  playerArray: PlayerInput[] = []
  editRow?: ButtonParameters

  constructor(
    public activatedRoute: ActivatedRoute,
    public session: SessionProvider,
    public router: Router,
  ){}

  ngOnInit(){
    const fileName = this.activatedRoute.snapshot.paramMap.get('fileName')

    if ( !fileName || !this.session.xarcadeDirectory ) {
      this.router.navigateByUrl('/xarcade-xinput')
    }

    this.loadMapping(fileName as string)
  }

  async loadMapping( fileName: string ) {
    if ( !this.session.xarcadeDirectory ) {
      return
    }
    
    const mapDir = await this.session.xarcadeDirectory.getDirectory('xarcade-xinput/mappings')
    const file = await mapDir.findFileByPath(fileName)

    if ( !file ) {
      return
    }

    const json = await file.readAsJson()
    this.playerArray = Object.entries(json).reduce((all, [key, value]: [string, [number, string]]) => {
      const playerIndex = value[0]
      
      if ( !all[ playerIndex ] ) {
        while( all.length <= playerIndex ) {
          all[ all.length ] = all[ all.length ] || {playerIndex, keys: {}} as PlayerInput
        }
      }
      
      const rightValues = value.slice(1, value.length) as (string | number)[]
      all[ playerIndex ].keys[ key ] = all[ playerIndex ].keys[ key ] || []
      all[ playerIndex ].keys[ key ] = {
        button: rightValues[0] as string,
        parameters: rightValues.slice(1, rightValues.length) as number[]
      }
      return all
    }, [] as PlayerInput[])
    console.log('playerArray', this.playerArray)
  }

  changePlayerButtonKey(keys: PlayerKeys, oldKey: string, x: number) {
    const match = Object.entries(this.windowsKeys).find(([key, info]) => info.num === x)
    if ( !match ) {
      return
    }

    const newKey = match[0] as string
    keys[ newKey ] = keys[ oldKey ]
    delete keys[ oldKey ]
    
    console.log('match', x, match)
  }
}
interface PlayerInput {
  playerIndex: number
  keys: PlayerKeys
}

interface PlayerKeys {
  [index: string]: ButtonParameters
}

interface ButtonParameters {
  button: string, parameters: number[]
}
