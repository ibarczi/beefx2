/* eslint-disable no-multi-spaces */

import {Corelib} from '../beeproxy.js'

const {clamp, createMaxCollector} = Corelib
const {createPerfTimer, startEndThrottle} = Corelib.Tardis

const {min, max, abs, round} = Math

export const renderAudioBuffer = ({fx, ccext}) => {
  const {
    cc, drawLine, setTextStyle, height, halfHeight, width, initCanvas, setLineStyle,
    dbGridColor, dbGridColorHi, clog, graphDesc
  } = ccext

  const bufferHost = fx.int[graphDesc.bufferHost]

  const render = () => { // return render function
    const buffer = bufferHost.buffer
    if (!buffer) {
      return clog('no sample buffer')
    }
    const timer = createPerfTimer()
    const length = buffer.length
    const isMono = buffer.numberOfChannels === 1
    const samplePerPix = length / width
    
    const data0 = buffer.getChannelData(0)
    const data1 = isMono ? data0 : buffer.getChannelData(1)

    const sec = length / buffer.sampleRate
    //const randomizer04 = parseInt(fx.zholger) % 5
    const OVERSAMPLING = 8 // Math.pow(2, randomizer04) // 8
    const samplePerPixOver = samplePerPix / OVERSAMPLING
    const oversamp = []
    for (let x = 0; x < width * OVERSAMPLING; ++x) {
      const dataIx = ~~(x * samplePerPixOver)
      oversamp[x] = (data0[dataIx] + data1[dataIx]) / 2
    }
    oversamp[0] = 0 //: filtering glitches out
    timer.mark('oversampling')
    
    const bigminusarr = []
    const bigplusarr = []
    const avgarr = []
    
    for (let i = 0, oIndex = 0; i < width; ++i) {
      for (let o = 0; o < OVERSAMPLING; o++, oIndex++) {
        const oSample = oversamp[oIndex] 
        if (o === 0) {
          bigminusarr[i] = oSample
          bigplusarr[i] = oSample
          avgarr[i] = 0
        } else {
          if (oSample > 0) {
            bigplusarr[i] = max(bigplusarr[i], oSample)
          } else {
            bigminusarr[i] = min(bigminusarr[i], oSample)
          }
        }
        bigminusarr[i] = min(bigminusarr[i], 0)
        bigplusarr[i] = max(bigplusarr[i], 0)
        avgarr[i] += oSample
      }
      avgarr[i] /= OVERSAMPLING
    }

    const maxer = createMaxCollector(3)
    const mixer = createMaxCollector(3)
    let lastOver01 = 1
    for (let i = 0; i < width; i++) {
      maxer(bigplusarr[i])
      mixer(-bigminusarr[i])
      max(abs(bigplusarr[i]), abs(bigminusarr[i])) > .01 && (lastOver01 = i)
    }
    const maxPlus = maxer(0)[0]
    const minMinus = mixer(0)[0]
    const maxAbs = (abs(maxPlus) + abs(minMinus)) / 2
    const yScaleFactor = maxAbs < .25 ? 4 : maxAbs < .5 ? 2 : 1
    const yScale = halfHeight * yScaleFactor
    const xScale = clamp(width / (lastOver01 + 10), 1, 5)
    const pixPerSec = width / sec * xScale
    timer.mark('minmaxavg')
    
    clog('End', {pixPerSec, maxPlus, minMinus, maxAbs, lastOver01, xScale, yScale})
    const tab = []
    for (let i = 0, j = 0; i < width; i += 30, j++) {
      tab[j] = {
        bigplus: bigplusarr[i].toFixed(3),
        bigminus: bigminusarr[i].toFixed(3),
        avg: avgarr[i].toFixed(3)
      }
    }
    //console.table(tab)
    
    initCanvas()
    cc.font = '32px roboto condensed'
    
    if (pixPerSec > 10) {
      if (pixPerSec > 200) {
        setLineStyle(dbGridColor, 3)
        for (let x = 0; x < width; x += pixPerSec / 10) {
          drawLine(x, 0, x, height)
        }
      }
      setLineStyle(dbGridColorHi, 3)
      for (let x = 0; x < width; x += pixPerSec) {
        drawLine(x, 0, x, height)
      }
    }
    
    const audioBufferTextColor = 'hsl(50, 30%, 50%)'
    const ms = isMono ? 'Mono' : 'Stereo'
    const viewSec = round(sec / xScale * 1000) / 1000
    const fullSec = round(sec * 1000) / 1000
    
    setTextStyle(audioBufferTextColor, 'right')
    const txtx = width - 12
    cc.fillText(`zoomX: ${xScale.toFixed(1)}`, txtx, 40)
    cc.fillText(`zoomY: ${yScaleFactor}`, txtx, 80)
    cc.fillText(`overSampling: ${OVERSAMPLING}x`, txtx, height - 60)
    cc.fillText(`${viewSec}s of ${fullSec}s ${ms}`, txtx, height - 20)
    
    const audioBufferMaxColor = `hsl(100, 70%, 70%, .66)`
    const audioBufferAvgColor = `hsl(100, 99%, 90%, .99)`
    
    setLineStyle(audioBufferMaxColor, 3)
    cc.beginPath()
    for (let x = 0; x < width; ++x) {
      const ytop = bigplusarr[x] * yScale + halfHeight
      const ybottom = bigminusarr[x] * yScale + halfHeight
      const xx = xScale * x
      x ? cc.lineTo(xx, ytop) : cc.moveTo(xx, ytop)
      cc.lineTo(xx, ybottom)
    }
    cc.stroke()
    timer.mark('maxdraw')  
    
    setLineStyle(audioBufferAvgColor, 3)
    cc.beginPath()
    for (let x = 0; x < width; ++x) {
      const sample = avgarr[x]
      const y = sample * yScale + halfHeight
      const xx = xScale * x
      x ? cc.lineTo(xx, y) : cc.moveTo(xx, y)
    }
    cc.stroke()
    timer.mark('avgdraw')  
    clog(`sampleDraw`, timer.summary())
  }

  return {render}
}