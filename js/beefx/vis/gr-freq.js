/* eslint-disable no-multi-spaces */

import {Corelib} from '../beeproxy.js'

const {clamp, createMaxCollector} = Corelib
const {createPerfTimer, startEndThrottle} = Corelib.Tardis

const {min, log: mathlog, LN10, pow, round} = Math

export const renderFreqResponse = ({fx, ccext}) => {
  const {
    waCtx, cc, canvasLine, setTextStyle, height, halfHeight, width, initCanvas, setLineStyle,
    minFreqScaleGap, dbToY, drawDynLine,
    scaleAndRoundFreqX, magCurveColor, phaseCurveColor, hzTextColor, freqGridColor,
    graphDesc, renderSet, customRenderer, graph
  } = ccext

  const calibrateFreqScale = ({diynamic = 1} = {}) => {
    const freq = {diynamic}
    const nOctaves = 11
    const maxNyquistFreq = waCtx.sampleRate / 2 // 22050
    const minNyquistFreq = maxNyquistFreq / pow(2, nOctaves - 1)
    const nyquistRange = maxNyquistFreq / minNyquistFreq // this is constant if ..22050: 1024
    freq.capture({nOctaves, minNyquistFreq, maxNyquistFreq, nyquistRange})
    freq.i2Hz = i => maxNyquistFreq * pow(2, nOctaves * (pow(i / width, diynamic) - 1))
    freq.hzArr = new Float32Array(width + 1)
    freq.magResponse = new Float32Array(width + 1)
    freq.phaseResponse = new Float32Array(width + 1)
    freq.freq2X = new Int16Array(maxNyquistFreq)
    let freqIx = 0
   
    for (let i = 0; i <= width; i++) {
      const hz = freq.hzArr[i] = freq.i2Hz(i)
      while (freqIx < hz && freqIx < maxNyquistFreq) { //: reverse array
        freq.freq2X[freqIx++] = i
      }
    }
    return freq
  }
  
  const drawFreqGrid = freq => { //8#77b9 ----- draw octave grid -----
    const {nOctaves, i2Hz} = freq
    setTextStyle(hzTextColor, 'left')
    setLineStyle(freqGridColor, 4)
    cc.beginPath()
    const txty = 36
    let lastx = -100
    
    for (let octave = 0; octave <= nOctaves; octave++) { // Draw frequency scale
      const xx = octave * width / nOctaves
      const x = scaleAndRoundFreqX(xx)
      if (lastx + minFreqScaleGap > x) {
        continue
      }
      lastx = x
      canvasLine(x, txty, x, height - 1)
      
      const txtx = clamp(x - 2, 10, width - 18)
      const valueHerz = round(i2Hz(xx))
      const [value, unit] = valueHerz > 1000
        ? [round(valueHerz / 100) / 10, 'k']//was kHz but it won't fit on small rect
        : [valueHerz, '']//was Hz
        
      cc.save()
      cc.translate(txtx, txty)
      cc.rotate(-Math.PI / 4)
      cc.fillText(value + unit, 0, 0)
      cc.restore()
    }
    cc.stroke()
  }

  const drawMagResponse = ({magResponse, curveColor}) => { //8#88e --- draw magResponse curve ---
    cc.lineWidth = 4.5
    for (let x = 0; x < width; ++x) {
      const magReX = magResponse[x]
      if (!Number.isNaN(magReX)) {
        const dbResponse = 20 * mathlog(magReX) / LN10
        const y = dbToY(dbResponse)
        drawDynLine(x, y, curveColor({fx, xpt: x / width}))
      }
    }
  }

  const drawPhaseResponse = ({phaseResponse}) => { //8#aae --- draw phaseResponse curve ---
    setLineStyle(phaseCurveColor, 4)
    cc.beginPath()
    for (let x = 0; x < width; ++x) {
      const phReX = phaseResponse[x]
      if (!Number.isNaN(phReX)) {
        const dbResponse = 20 * mathlog(phReX) / LN10
        const y = dbToY(dbResponse)
        x ? cc.lineTo(x, y) : cc.moveTo(x, y)
      }
    }
    cc.stroke()
  }

  const {diynamic = 1, filter} = graphDesc
  const freq = calibrateFreqScale({diynamic})
  freq.curveColor = graphDesc.curveColor || (_ => magCurveColor)

  const render = () => { // return render function
    initCanvas()
    void customRenderer.pre?.({fx, cc, ccext, freq})
    if (renderSet.doGrid) {
      drawFreqGrid(freq)
      ccext.drawDbGrid({doLeft: true, doRight: true})
    }
    graph.filter = fx.int[filter] //: have to reread here every time as filter can change!
    
    if (renderSet.doGraph && graph.filter) {
      graph.filter.getFrequencyResponse(freq.hzArr, freq.magResponse, freq.phaseResponse)
      drawPhaseResponse(freq)
      drawMagResponse(freq)
    }
    void customRenderer.post?.({fx, cc, ccext, freq})
  }

  return {render}
}