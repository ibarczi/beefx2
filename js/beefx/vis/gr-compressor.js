/* eslint-disable no-multi-spaces */

const {min} = Math

export const renderCompressor = ({fx, ccext}) => {
  const {
    initCanvas, setLineStyle, 
    msdbLine, msdbLineTo, drawDbGrid, dbdbLine, dbdbQuadratic,
    dbGridColorLo, dbGridColorHi, minDb, maxDb, maxMs
  } = ccext

  const render = () => { // return render function
    const {attack, release, ratio, threshold, knee, makeupGain} = fx.atm
    initCanvas()

    drawDbGrid({doLeft: true, doRight: true, maxDbLimitY: 32}) //: left side db/db grid
    setLineStyle(dbGridColorHi, 2)            // right side ms/db grid
    msdbLine(0, minDb, 0, maxDb)
    msdbLine(1000, minDb, 1000, maxDb)
    msdbLine(2000, minDb, 2000, maxDb)
    setLineStyle(dbGridColorLo, 2)
    msdbLine(500, minDb, 500, maxDb)
    msdbLine(1500, minDb, 1500, maxDb)
    msdbLine(2500, minDb, 2500, maxDb)
    
    const refColor = 'hsl(200, 60%, 40%)'
    const thresholdColor = 'hsl(0, 75%, 50%)'
    const makeupColor = 'hsl(30, 80%, 50%)'
    const kneeCurveColor = 'hsl(60, 85%, 45%)'        
    const inColor = 'hsl(200, 60%, 40%)'
    const outBaseColor = 'hsl(30, 90%, 50%)'
    
    const topDb = 0
    const bottomDb = -40
    const startMs = -500
    const upMs = 250
    const downMs = 1500
    const thrDb = threshold
    
    setLineStyle(thresholdColor, 4)           // threshold cross horizontal line
    msdbLine(-maxMs, thrDb, maxMs, thrDb)
        //dbdbLine(threshold, minDb, threshold, maxDb)

    setLineStyle(inColor, 12)                 // right side timing diagram base
    msdbLine(startMs, bottomDb, upMs, bottomDb)
    msdbLineTo(upMs, topDb)
    msdbLineTo(downMs, topDb)
    msdbLineTo(downMs, bottomDb)
    msdbLineTo(maxMs, bottomDb)
    
    const mug = makeupGain                    // right side timing diagram live signal
    setLineStyle(outBaseColor, 4)
    msdbLine(startMs, mug + bottomDb, upMs, mug + bottomDb)
    msdbLineTo(upMs, mug + topDb)
    msdbLineTo(upMs + attack, mug + thrDb + (topDb - thrDb) / ratio)
    msdbLineTo(downMs, mug + thrDb + (topDb - thrDb) / ratio) 
    msdbLineTo(downMs, mug + thrDb + (topDb - thrDb) / ratio - (topDb - bottomDb))
    msdbLineTo(downMs + release, mug + bottomDb)
    msdbLineTo(maxMs, mug + bottomDb)

    setLineStyle(refColor, 8)                 // left side fix 45deg dB line
    dbdbLine(minDb, minDb, maxDb, maxDb)

    setLineStyle(thresholdColor, 4)           // threshold cross vertical line
    dbdbLine(threshold, minDb, threshold, maxDb)
    
    const compx1 = threshold
    const compx2 = maxDb
    const compWi = compx2 - compx1
    const compy1 = threshold + makeupGain
    const compHi = compWi / ratio
    
    const kneeRight = min(maxDb + 3, compx1 + knee) - compx1
    const kneex1 = compx1 - knee
    const kneex2 = compx1 + kneeRight
    const kneey1 = compy1 - knee
    const kneey2 = compy1 + kneeRight / ratio
    
    setLineStyle(kneeCurveColor, 5)           // left side live knee
    dbdbQuadratic(kneex1, kneey1, compx1, compy1, kneex2, kneey2)

    setLineStyle(makeupColor, 5)              // left side live non-knee
    dbdbLine(minDb, minDb + makeupGain, kneex1, kneey1)
    dbdbLine(kneex2, kneey2, compx2, compy1 + compHi)
  }

  return {render}
}