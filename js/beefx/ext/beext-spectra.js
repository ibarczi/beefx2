/* eslint-disable no-multi-spaces */

import {Corelib, BeeFX, onWaapiReady} from '../beeproxy.js'

const {nop, undef} = Corelib
const {wassert} = Corelib.Debug //eslint-disable-line no-unused-vars

const {min, max, round} = Math

onWaapiReady.then(waCtx => {
  const {registerFxType, beeRAF, radioDef, createRadioCmds} = BeeFX(waCtx)
  
  const logPerfOn = false
  const plog = (...args) => logPerfOn && console.log(...args)
  
  const drawFrame = fx => {
    const {int, atm} = fx
    const {cc, width, height, ccext, mirror} = int
    
    const drawSpectrum = (chn, yStartRatio, yFact, {dontClear = false} = {}) => {
      const timer = Corelib.Tardis.createPerfTimer()
      const spectrum = int.spectrum[chn]
      const freqData = int.freqData[chn]
      const prevFreqData = int.prevFreqData[chn]
      wassert(spectrum && freqData)
      spectrum.getByteFrequencyData(freqData)
      const flen = freqData.length

      const yStart = yStartRatio * height
      const flexY = y => yStart + y * yFact

      dontClear || cc.clearRect(0, 0, width, height)
      
      const nyquist = waCtx.sampleRate / 2
      
      const drawFreqVertical = (hue, lite, freq) => {
        const freqbinPt = freq / nyquist
        const x = Math.pow(freqbinPt, 1 / atm.freqDyn) * width
        ccext.setLineStyle(`hsla(${hue}, 0%, 50%, .6)`, 3)
        ccext.drawLine(x, flexY(0), x, flexY((360 - hue) / 6))
      }
      
      drawFreqVertical(320, 55, 55)
      drawFreqVertical(280, 65, 110)
      drawFreqVertical(240, 75, 220)
      drawFreqVertical(200, 55, 440)
      drawFreqVertical(160, 50, 880)
      drawFreqVertical(120, 50, 1760)
      drawFreqVertical(80, 50, 3520)
      drawFreqVertical(40, 50, 7040)
      drawFreqVertical(0, 50, 14080)
      
      const mult = atm.laziness
      const div = atm.laziness + 1
      
      const db = []
      //const pixPerBin = width / flen
  
      for (let x = 0; x < width; x += 2) { //:Draw the frequency domain chart.
        const xpt = x / width
        const i = Math.round(flen * Math.pow(xpt, atm.freqDyn))
        const newValue = freqData[i]
        const oldValue = prevFreqData[i] || 0
        const value = Math.max(newValue, (newValue + oldValue * mult) / div)
        prevFreqData[i] = value
        const procPerc = i / flen * 50
        const sat = Math.round(100 - procPerc)
        const lit = Math.round(procPerc + 50)
        cc.beginPath()
        cc.strokeStyle = `hsl(0, ${sat}%, ${lit}%)`
        cc.lineWidth = 2
        cc.moveTo(x, flexY(height))
        cc.lineTo(x, flexY(height - height * value / 266))
        cc.stroke()
        db.push({i, x, procPerc, newValue, oldValue, color: `hsl(0, ${sat}%, ${lit}%)`})
      }
      
      timer.mark('stroke&text')
      if (logPerfOn) {
        const sum = timer.sum()
        int.prof.push(sum.dur.sum)
        if (int.prof.length % 110 === 105) {
          const last = int.prof.slice(-100).map(a => parseFloat(a))
          let agg = 0
          for (let i = 0; i < 100; i++) {
            agg += last[i]
          }
          agg = Math.round(agg * 10)
          plog(`###SPECTR avg: ${agg}ms **** `, int.prof.slice(-20).join(' / '))
        }
      }
    }
    if (cc) {  //: refresh reducer!
      //.inf  here comes the channel logic
      // console.log(int.channelMode)
      void ({
        LplusR: () => mirror ? drawSpectrum(0, 1, -1) : drawSpectrum(0, 0, 1),
        L: () => mirror ? drawSpectrum(0, 1, -1) : drawSpectrum(0, 0, 1),
        R: () => mirror ? drawSpectrum(0, 0, 1) : drawSpectrum(0, 1, -1),
        LandR: () => {
          if (mirror) {
            drawSpectrum(0, .5, -.5)
            drawSpectrum(1, .5, .5, {dontClear: true})
          } else {
            drawSpectrum(0, 0, .497)
            drawSpectrum(1, 1, -.497, {dontClear: true})
          }
        }
      }[int.channelMode]())
    }
    int.isRAFOn && beeRAF(_ => drawFrame(fx))
  }

  const channelCmdsDef = {
    LplusR: radioDef('active', 'Mono', 'LeqR'),
    L: radioDef('off', 'Left', 'L'),
    R: radioDef('off', 'Right', 'R'),
    LandR: radioDef('off', 'Stereo', 'LandR')
  }

  const spectrumFlex = { //.head ------- hi-res spectrum -------
    def: {
      ...channelCmdsDef,
      mirrorCmd: {defVal: 'off', type: 'cmd', subType: 'led', color: 30, name: 'Mirror'},
      laziness: {defVal: 0, min: 0, max: 10, subType: 'int'},
      freqDyn: {defVal: 2, min: 1, max: 5},
      spectrogram: {type: 'graph'}
    },
    name: 'Spectrum flex',
    graphs: {
      spectrogram: {
        graphType: 'custom',
        onInit: ({cc, ccext, width, height, fx}) => fx.int.capture({cc, ccext, width, height})
      }
    }
  }
  spectrumFlex.setValue = (fx, key, value, {int} = fx) => ({ //.dev ------- setValue -------
    laziness: nop,
    freqDyn: nop,
    mirrorCmd: _ => {
      if (value === 'fire') {
        int.mirror = !int.mirror
        fx.setValue('mirrorCmd', int.mirror ? 'active.ledon' : 'off.ledoff')
      }
    },
  }[key] || (() => fx.cmdProc(value, key))) // LplusR, L, R, LandR
  
  spectrumFlex.onActivated = (fx, isActive) => isActive ? fx.startSpect() : fx.stopSpect()
  
  spectrumFlex.construct = (fx, pars, {int} = fx) => { //.dev ------- construct -------
    // int.channelMode = 'LplusR'
    // int.freqData = new Uint8Array(int.frequencyBinCount)
    int.isRAFOn = false
    int.prof = []
    int.spectrum = []
    int.prevFreqData = []
    int.freqData = []
 
    int.cc = undef    //: baseGraph fills these with onInit
    int.width = 2048
    int.height = 300

    fx.startSpect = () => {
      if (!int.isRAFOn) {
        int.isRAFOn = true
        beeRAF(_ => drawFrame(fx))
      }
    }
    fx.stopSpect = () => int.isRAFOn = false

    const createSpectrum = chn => {
      int.spectrum[chn] = waCtx.createAnalyser()
      int.spectrum[chn].minDecibels = -140
      int.spectrum[chn].maxDecibels = 0
      int.spectrum[chn].smoothingTimeConstant = 0
      int.spectrum[chn].fftSize = 2048 * 4
      int.prevFreqData[chn] = []
      int.freqData[chn] = new Uint8Array(int.spectrum[chn].frequencyBinCount) //: fftSize / 2
    }

    fx.build = () => {  //.dev  build
      int.firstOn = true
      int.secondOn = int.channelMode === 'LandR'
      int.splitted = ['L', 'R', 'LandR'].includes(int.channelMode)

      createSpectrum(0)
      int.secondOn && createSpectrum(1)

      if (int.splitted) {
        int.splitter = waCtx.createChannelSplitter(2)
        fx.start.connect(int.splitter)
        int.splitter.connect(int.spectrum[0], 0)
        int.secondOn && int.splitter.connect(int.spectrum[1], 1)
      } else {
        fx.start.connect(int.spectrum[0])
        //: int.splitter = void 0
      }
        
      fx.start.connect(fx.output)
      fx.startSpect()
    }

    fx.destroy = () => { //.dev  destroy
      fx.stopSpect()

      if (!int.spectrum[0]) {
        console.log('nothing to destroy (first?)')
        return
      }

      if (int.splitted) {
        fx.start.disconnect(int.splitter)
        int.splitter.disconnect(int.spectrum[0], 0)
        int.secondOn && int.splitter.disconnect(int.spectrum[1], 1)
        delete int.splitter
      } else {
        fx.start.disconnect(int.spectrum[0])
      }

      fx.start.disconnect(fx.output)

      delete int.spectrum[0]
      int.secondOn && delete int.spectrum[1]
      // no need to delete freqData
    }

    fx.reconfigure = ({channelMode = int.channelMode}) => {
      if (channelMode !== int.channelMode) {
        console.log(`spect will rebuild [${int.channelMode} -> ${channelMode}]`)
        fx.destroy()
        fx.int.channelMode = channelMode
        fx.build()
      } else {
        console.log('spect will skip reconf as nothing changed', {channelMode})
      }
    }

    fx.cmdProc = (fire, mode) => {
      console.log('spectre cmd', {fire, mode})
      if ((fire === 'active' || fire === 'fire') && mode !== int.channelMode) {
        // channelCmds.check(mode, val => fx.reconfigure({channelMode: val}))
        fx.reconfigure({channelMode: mode})
        fx.setValue('LplusR', int.channelMode === 'LplusR' ? 'active' : 'off')
        fx.setValue('L', int.channelMode === 'L' ? 'active' : 'off')
        fx.setValue('R', int.channelMode === 'R' ? 'active' : 'off')
        fx.setValue('LandR', int.channelMode === 'LandR' ? 'active' : 'off')
      }
    }
  }
  
  registerFxType('fx_spectrumFlex', spectrumFlex)
})
