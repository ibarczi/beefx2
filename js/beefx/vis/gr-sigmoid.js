/* eslint-disable no-multi-spaces */

import {Corelib} from '../beeproxy.js'

const {clamp, createMaxCollector} = Corelib
const {createPerfTimer, startEndThrottle} = Corelib.Tardis

const {min, max, abs, round} = Math

export const renderSigmoid = ({fx, ccext}) => {
  const {
    cc, drawLine, setTextStyle, height, halfWidth, halfHeight, width, initCanvas, setLineStyle,
    dbGridColorLo, dbGridColorHi, genCurveColor, dbTextColor, renderSet
  } = ccext

  const render = () => { // return render function
    initCanvas()

    if (renderSet.doGrid) {
      const alg = fx.int.lastAlgName
      cc.font = '32px roboto condensed'
      setTextStyle(dbTextColor, 'right')
      cc.fillText(alg, width - 8, height - 10)
      
      setLineStyle(dbGridColorHi, 4)
      drawLine(0, halfHeight, width, halfHeight)
      drawLine(halfWidth, 0, halfWidth, height)

      setLineStyle(dbGridColorLo, 3)
      drawLine(0, halfHeight * 3 / 2, width, halfHeight * 3 / 2)
      drawLine(0, halfHeight / 2, width, halfHeight / 2)
      drawLine(halfWidth * 3 / 2, 0, halfWidth * 3 / 2, height)
      drawLine(halfWidth / 2, 0, halfWidth / 2, height)        
    }
    if (renderSet.doGraph) {
      const size = fx.int.nSamples
      const data = fx.int.wsCurve
      const step = fx.int.graphDiv
      setLineStyle(genCurveColor, 4)
      cc.beginPath()
      for (let ix = 0; ix < size; ix += step) {
        const x = ix * width / size
        const y = halfHeight - halfHeight * data[ix]
        x ? cc.lineTo(x, y) : cc.moveTo(x, y)
      }
      cc.stroke()
    }
  }

  return {render}
}