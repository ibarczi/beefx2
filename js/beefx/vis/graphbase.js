/* eslint-disable no-multi-spaces */

import {
  Corelib, extendCanvas, renderCompressor, renderAudioBuffer, renderFreqResponse, renderSigmoid
} from '../beeproxy.js'

const {Ø, nop, clamp, createMaxCollector} = Corelib
const {wassert, weject} = Corelib.Debug
const {max, min, round, pow, log: mathlog, log2, floor, LN2, LN10, abs} = Math

//: graphBase draws the commonly used (ie used by more than one fx) graphs.
//: Lots of custom graphs are rendered in the fx modules.
//: (It's a tough question where is the place of fx graph rendering.)
//: Other fxs use graphBase, but still add some extra drawings onto the graph (before or after).
//: Obviously this is not optimal, there should bee(!) a different rendering module
//: for each every graph type. But graphBase was born when we had only one graph 
//: and didn't plan more. -> Later

const logOn = false
const clog = (...args) => logOn && console.log(...args)

export const createGraphBase = waCtx => {
  const graphBase = {}
    
  graphBase.createGraph = (graphDesc, panelGraph) => { //: class, instance
    const graph = {}
    
    const {canvas$, width, height, fx} = panelGraph
    const halfWidth = width / 2
    const halfHeight = height / 2
    const cc = canvas$.getContext('2d')

    const {     //: these defaults can be overridden from graphDesc
      graphType,
      renderSet = {doClear: true, doGrid: true, doGraph: true},
      disableInThisFrame = _ => false,
      customRenderer = {},
      dbGridColor =  'hsla(200, 70%, 55%, 0.5)',
      dbGridColorLo = 'hsla(200, 70%, 55%, 0.3)',
      dbGridColorHi = 'hsla(200, 70%, 55%, 0.7)',
      dbTextColor = 'hsla(260, 68%, 82%, .75)',
      freqGridColor = 'hsla(200, 70%, 60%, .3)',
      hzTextColor = 'hsla(200, 68%, 82%, .75)',
      genCurveColor =  'hsl(120, 90%, 55%)',
      magCurveColor =  'hsl(120, 90%, 55%)',
      phaseCurveColor = 'hsl(180, 70%, 45%, .6)',
      freqMarginLeft = 0,
      freqMarginRight = 0,
      minFreqScaleGap = 36,
      maxDb = 60,  //  30    5
      minDb = -60, // -30  -60
      dbWidthFactor = 1,
      minMs = 0,
      maxMs = 3000, // compressor: 0..2750
      msOffsetFactor = 0
    } = graphDesc
    
    const ccext = { // static canvas context, cannot be changed after init
      graphDesc, clog, waCtx, cc, width, height, halfWidth, halfHeight, renderSet, customRenderer, graph,
      minFreqScaleGap,
      dbGridColor, dbGridColorLo, dbGridColorHi, genCurveColor, dbTextColor,
      magCurveColor, phaseCurveColor, hzTextColor, freqGridColor,
      freqMarginLeft, freqMarginRight, minDb, maxDb, msOffsetFactor, dbWidthFactor, minMs, maxMs
    }
    extendCanvas(ccext)
    const {initCanvas, setTextStyle, setLineStyle, drawLine, dbToY} = ccext
    
    //#939 -------------- BeeFx-specific parts --------------
    
    ccext.drawDbGrid = ({doLeft = false, doRight = true, maxDbLimitY = 52} = {}) => {
      setTextStyle(dbTextColor, 'right')                      //8#96a ---- draw dB grid ----
      const minDb10 = round(minDb / 10) * 10
      
      for (let db = minDb10; db < maxDb - 10; db += 10) { 
        const y = round(dbToY(db))
        
        if (y < height - 6 && y > maxDbLimitY) {
          doLeft && cc.fillText(db + "dB", 54, y - 4)
          doRight && cc.fillText(db + "dB", width - 4, y - 4)
        }
        setLineStyle(db ? dbGridColorLo : dbGridColorHi, db ? 3 : 3)
        drawLine(0, y, width, y)
      }
    }    

    const renderers = {}
      
    renderers.freq = () => renderFreqResponse({fx, ccext}) //#c08  Frequency graph renderer
    
    renderers.sigmoid = () => renderSigmoid({fx, ccext}) //#b08  Sigmoid graph renderer
    
    renderers.compressor = () => renderCompressor({fx, ccext}) //#a0a  Compressor renderer

    renderers.audioBuffer = () => renderAudioBuffer({fx, ccext}) //#90d  Audio sample (from buffer) renderer

    renderers.custom = _ => { //#90f  Custom graph renderer
      wassert(graphDesc.onInit)      
      graphDesc.onInit({cc, width, height, fx, ccext}) //: let the o'scope know the drawing context
      
      const render = _ => nop //: the rendering is in the caller module itself
      return {render}    
    }    
      
    if (renderers[graphType]) {
      graph.renderer = renderers[graphType]()
    } else {
      console.warn('no renderer for graph!', graphType, graphDesc)
    }
    
    graph.render = (...pars) => { //: this is not throttled, be cautious when calling!
      if (graph.renderer) {
        if (!disableInThisFrame(fx)) {
          graph.renderer.render(...pars)
          graphDesc.postRender && graphDesc.postRender({fx, cc, ccext})
        }
      } else {
        console.warn(`no renderer!!!!!!!`, graph)
      }
    }
    return graph
  }
  
  return graphBase
}
