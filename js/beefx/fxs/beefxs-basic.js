/* eslint-disables no-debugger, spaced-comment, no-multi-spaces, valid-typeof, 
   object-curly-spacing, no-trailing-spaces, indent, new-cap, block-spacing, comma-spacing,
   handle-callback-err, no-return-assign, camelcase, yoda, object-property-newline,
   no-void, quotes, no-floating-decimal, import/first, space-unary-ops, 
   standard/no-callback-literal, object-curly-newline */
   
import {BeeFX, onWaapiReady} from '../beeproxy.js'

onWaapiReady.then(waCtx => {
  const {connectArr, registerFxType, nowa, detuneFreq} = BeeFX(waCtx)
  
  const blankFx = { //8#bbb ------- blank (there won't be any simpler Fx than this) -------
    def: {}
  }
  blankFx.construct = fx => fx.start.connect(fx.output)

  registerFxType('fx_blank', blankFx)
  
  const gainFx = { //.head ------- WAU gain -------
    def: {
      gain: {defVal: 1, min: 0.05, max: 10, name: 'gain', subType: 'exp'}
    },
    midi: {pars: ['gain']}
  }
  gainFx.setValue = (fx, key, value) => ({
    gain: _ => fx.setAt('gain', 'gain', Math.pow((value - gainFx.def.gain.min) / .9, .6))
  }[key])
  
  gainFx.construct = (fx, pars, {int} = fx) => {
    int.gain = waCtx.createGain()
    connectArr(fx.start, int.gain, fx.output)
  }
  registerFxType('fx_gain', gainFx)

  const stereoGainFx = { //.head ------- WAU stereoGain -------
    def: {
      gainL: {defVal: 1, min: 0.05, max: 10, name: 'gainLeft', subType: 'exp'},
      gainR: {defVal: 1, min: 0.05, max: 10, name: 'gainRight', subType: 'exp'}
    },
    midi: {pars: ['gainL,gainR']}
  }
  stereoGainFx.setValue = (fx, key, value) => ({
    gainL: _ => fx.setAt('gainL', 'gain', (Math.max(0, value - stereoGainFx.def.gainL.min) / .9) ** .6),
    gainR: _ => fx.setAt('gainR', 'gain', (Math.max(0, value - stereoGainFx.def.gainR.min) / .9) ** .6)
  }[key])
  
  stereoGainFx.construct = (fx, pars, {int} = fx) => {
    int.splitter = waCtx.createChannelSplitter(2)
    int.merger = waCtx.createChannelMerger(2)
    int.gainL = waCtx.createGain()
    int.gainR = waCtx.createGain()
    
    fx.start.connect(int.splitter)
    int.splitter.connect(int.gainL, 0)
    int.splitter.connect(int.gainR, 1)
    int.gainL.connect(int.merger, 0, 0)
    int.gainR.connect(int.merger, 0, 1)
    int.merger.connect(fx.output)
  }
  registerFxType('fx_stereoGain', stereoGainFx)
  
  const delayWAFx = { //.head ------- WAU delay -------
    def: {
      delayTime: {defVal: 0, min: 0, max: 2, unit: 's'}
    },
    midi: {pars: ['delayTime']}
  }
  delayWAFx.setValue = (fx, key, value) => ({
    //: Unsolved issue: what is the best way to set the delay? (it clicks like H).
    //delayTime: _ => fx.setDelayTime('delay', value)
    delayTime: _ => fx.int.delay.delayTime.linearRampToValueAtTime(value, nowa(), .05)
  }[key])

  delayWAFx.construct = (fx, pars, {int} = fx) => {
    int.delay = waCtx.createDelay(10)
    connectArr(fx.start, int.delay, fx.output)
  }
  registerFxType('fx_delayWA', delayWAFx)
  
  const biquadOptions = [ //.head  ------- WAU biquadFilter -------
    ['lowpass', 'lowpass [no gain]'],
    ['highpass', 'highpass [no gain]'],
    ['bandpass', 'bandpass [no gain]'],
    ['lowshelf', 'lowshelf, [no Q]'],
    ['highshelf', 'highshelf [no Q]'],
    ['allpass', 'allpass [no gain]'],
    ['notch', 'notch [no gain]'],
    ['peaking', 'peaking']
  ]
  const biquadFx = {
    def: {
      filterType: {defVal: 'peaking', type: 'strings', subType: biquadOptions},
      frequency: {defVal: 800, min: 20, max: 22050, subType: 'exp', unit: 'Hz'},
      detune: {defVal: 0, min: -600, max: 600, unit: 'cent', subType: 'int'},
      gain: {defVal: 0, min: -40, max: 40, unit: 'dB'},
      Q: {defVal: 1, min: .0001, max: 100, subType: 'exp'},
      freqGraph: {type: 'graph'}
    },
    midi: {pars: ['gain,Q', 'frequency,detune']},
    name: 'BiquadFilter',
    graphs: {
      freqGraph: {
        graphType: 'freq',
        filter: 'biquad',
        minDb: -43,
        maxDb: 53,
        diynamic: .8
      }
    }
  }
  //: const detuneFactor = Math.log(2) / 1200
  //: const hz = Math.pow2(detune / 1200)
  //: const detune = Math.log(hz) / Math.log(2) * 1200
  //: const detune = Math.log(hz) / detuneFactor
  
  biquadFx.setValue = (fx, key, value) => ({
    filterType: _ => fx.int.biquad.type = value,
    frequency: _ => fx.setAt('biquad', 'frequency', value),
    detune: _ => fx.setAt('biquad', 'detune', value),
    gain: _ => fx.setAt('biquad', 'gain', value),
    Q: _ => fx.int.biquad.Q.value = value
  }[key])
    
  biquadFx.construct = (fx, pars, {int} = fx) => {
    int.biquad = waCtx.createBiquadFilter()
    connectArr(fx.start, int.biquad, fx.output)
  }
  registerFxType('fx_biquad', biquadFx)

  const freqOptions = [ //.head ------- WAU customBiquadFilter ------- 
    ['0', '-'],
    ['93', '93Hz'],
    ['1100', '1100Hz'],
    ['8370', '8370Hz']
  ]
  const channelModeOptions = [
    ['LR', 'Left + Right'],
    ['L', 'Left only'],
    ['R', 'Right only']
  ]
  const [leftMagCol, rightMagCol] = ['hsla(200, 75%, 55%)', 'hsla(10, 75%, 50%)']
  const [leftPhaseCol, rightPhaseCol] = ['hsla(200, 75%, 35%)', 'hsla(10, 75%, 30%)']

  const getChannelData = (chn, icon) => ({
    ['filterType' + chn]: {defVal: 'notch', type: 'strings', subType: biquadOptions},
    ['freqPreset' + chn]: {defVal: '93', type: 'strings', subType: freqOptions},
    ['frequency' + chn]: {defVal: 93, min: 20, max: 22050, subType: 'exp', unit: 'Hz' + icon},
    ['detune' + chn]: {defVal: 0, min: -200, max: 200, unit: 'cent' + icon, subType: 'int'},
    ['gain' + chn]: {defVal: 0, min: -40, max: 40, unit: 'dB' + icon},
    ['Q' + chn]: {defVal: 1, min: .0001, max: 100, subType: 'exp', unit: icon}
  })

  const customBiquadFx = {
    def: {
      ...getChannelData('L', '🔹'),
      freqGraph: {type: 'graph'},
      ...getChannelData('R', '🔸'),
    },
    midi: {pars: ['frequencyL,detuneL,gainL,QL', 'frequencyR,detuneR,gainR,QR']},
    name: 'Custom BiquadFilter',
    graphs: {
      freqGraph: [{
        graphType: 'freq',
        filter: 'biquadL',
        magCurveColor: leftMagCol,
        phaseCurveColor: leftPhaseCol,
        minDb: -43,
        maxDb: 53,
        diynamic: .8
      }, {
        graphType: 'freq',
        filter: 'biquadR',
        magCurveColor: rightMagCol,
        phaseCurveColor: rightPhaseCol,
        renderSet: {doClear: false, doGrid: false, doGraph: true},
        minDb: -43,
        maxDb: 53,
        diynamic: .8,
        customRenderer: {
          pre: ({fx, cc, ccext, freq}) => {
            const {width} = ccext
            cc.font = '700 32px roboto condensed'
            ccext.setTextStyle(leftMagCol, 'left')
            cc.fillText(detuneFreq(fx.atm.frequencyL, fx.atm.detuneL) + 'Hz', 80, 80)
            ccext.setTextStyle(rightMagCol, 'right')
            cc.fillText(detuneFreq(fx.atm.frequencyR, fx.atm.detuneR) + 'Hz', width - 80, 80)
          }
        }
      }]
    }
  }

  const setChannelValue = (fx, shortKey, chn, value, int, biquad = fx.int['biquad' + chn]) => ({
    filterType: () => biquad.type = value,
    freqPreset: () => ~~value && fx.setValue('frequency' + chn, ~~value),
    frequency: () => {
      fx.setAt(biquad, 'frequency', value)
      value !== ~~fx.atm['freqPreset' + chn] && fx.setValue('freqPreset' + chn, '0')
      fx.valueChanged('frequency' + chn)
    },
    detune: () => fx.setAt(biquad, 'detune', value),
    gain: () => fx.setAt(biquad, 'gain', value),
    Q: () => biquad.Q.value = value,
  }[shortKey])

  customBiquadFx.setValue = (fx, key, value) => setChannelValue(fx, key.slice(0, -1), key.at(-1), value)
    
  customBiquadFx.construct = (fx, pars, {int} = fx) => {
    int.biquadL = waCtx.createBiquadFilter()
    int.biquadR = waCtx.createBiquadFilter()
    int.splitter = waCtx.createChannelSplitter(2)
    int.merger = waCtx.createChannelMerger(2)

    fx.start.connect(int.splitter)
    int.splitter.connect(int.biquadL, 0)
    int.splitter.connect(int.biquadR, 1)
    int.biquadL.connect(int.merger, 0, 0)
    int.biquadR.connect(int.merger, 0, 1)
    int.merger.connect(fx.output)
  }
  registerFxType('fx_customBiquad', customBiquadFx)
})
