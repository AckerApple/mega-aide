/** v0.0.1 */

export interface TipOptions {
  level?: 'warn',
  showFor?: number,
  links?: {
    label: string
    url: string
    target?: '_blank'
  }[]
}

export interface Tip extends TipOptions {
  message: string
  close: () => unknown
  closeIn: (ms: number) => unknown
}

export class Tips {
  tips: Tip[] = [] // ui only logs
  maxTips = 3
  readtime = 3000 // how long to absolutely ensure message shows even if we go over message count

  getTipLogTime(time: number, tipLog: Tip[]) {
    const quantifier = tipLog ? tipLog.length + 1 : 1
    return (quantifier > 10 ? time/2 : time) * quantifier
  }

  /** on screen message that wait for previous message to complete */
  async displayForTime(
    msg: string,
    showFor: 5000,
    options: TipOptions = {},
  ): Promise<Tip> {
    return this.displayTip(msg, {showFor, ...options})
  }

  checkToClose() {
    const needToClose = this.tips.length - this.maxTips
    if ( needToClose > 0 ) {
      for (let index = this.tips.length - 1; index >= 0; --index) {
        const x = this.tips[index]
        
        if ( !x.showFor ) {
          x.close()
          return
        }
      }
    }
  }

  /** on screen message that wait for previous message to complete */
  displayTip(
    message: string,
    options: TipOptions = {},
  ): Tip {
    const duplicate = this.tips.find(tip => tip.message === message)
    if ( duplicate ) {
      return duplicate
    }

    const remove = () => {
      const index = this.tips.findIndex(x => x === tip)
      this.tips.splice(index, 1)
    }

    const closeIn = (ms: number) => {
      setTimeout(() => {
        remove()
        this.checkToClose()
      }, ms)
    }

    const close = () => {
      if ( options.showFor ) {
        return // it will close on its own
      }

      tip.close = () => null // disable being called twice
      tip.closeIn = () => null // disable being called twice

      closeIn(this.readtime)
    }

    // how long to show for
    const tip: Tip = {
      ...options,
      message,
      close, closeIn,
    }

    this.tips.unshift( tip )
    this.checkToClose()

    // always keep last 3 logs on screen
    if ( options.showFor ) {
      const showFor = this.getTipLogTime(options.showFor, this.tips)
      setTimeout(remove, showFor)
    }
    
    return tip
  }
}
