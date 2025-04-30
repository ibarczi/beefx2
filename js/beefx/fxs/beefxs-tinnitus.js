import {Corelib, BeeFX, onWaapiReady} from '../beeproxy.js'

const {nop} = Corelib
const {startEndThrottle, adelay} = Corelib.Tardis
const {min, max, round, SQRT2} = Math

onWaapiReady.then(waCtx => {
  const {connectArr, registerFxType, nowa, detuneFreq, radioDef, createRadioCmds} = BeeFX(waCtx)
  
  const freqOptions = [ //.head ------- WAU tinnitusBiquadFilter ------- 
    ['0', '-'],
    ['93', '93Hz'],
    ['1100', '1100Hz'],
    ['8370', '8370Hz']
  ]
  const [leftHue, rightHue] = [200, 10]
  const [leftMagCol, rightMagCol] = [`hsla(${leftHue}, 75%, 55%)`, `hsla(${rightHue}, 75%, 50%)`]
  const [leftPhaseCol, rightPhaseCol] = [`hsla(${leftHue}, 75%, 35%)`, `hsla(${rightHue}, 75%, 30%)`]

  const getChannelData = (chn, icon) => ({
    ['freqPreset' + chn]: {defVal: '93', type: 'strings', subType: freqOptions},
    ['frequency' + chn]: {defVal: 93, min: 20, max: 22050, subType: 'exp', unit: 'Hz' + icon},
    ['detune' + chn]: {defVal: 0, min: -200, max: 200, unit: 'cent' + icon, subType: 'int'},
    ['Q' + chn]: {defVal: 1, min: .0001, max: 100, subType: 'exp', unit: icon}
  })

  const channelCmdsDef = {
    LeqR: radioDef('off', 'Mono', 'LeqR'),
    L: radioDef('off', 'Left', 'L'),
    R: radioDef('off', 'Right', 'R'),
    LandR: radioDef('active', 'Stereo', 'LandR')
  }

  const tinnitusBiquadFx = {
    def: {
      freqDisp: {defVal: '440Hz#def', type: 'box', width: 32},
      ...channelCmdsDef,
      cascade: {defVal: 1, min: 1, max: 6, subType: 'int'},
      ...getChannelData('L', '🔹'),
      freqGraph: {type: 'graph'},
      ...getChannelData('R', '🔸'),
    },
    // midi: {pars: ['frequencyL,detuneL,gainL,QL', 'frequencyR,detuneR,gainR,QR']},
    name: 'Tinnitus BiquadFilter',
    graphs: {
      freqGraph: [{
        graphType: 'freq',
        filter: 'biquadL',
        magCurveColor: leftMagCol,
        phaseCurveColor: leftPhaseCol,
        minDb: -25,
        maxDb: 15,
        diynamic: .8,
        customRenderer: {
          pre: ({fx, cc, ccext, freq}) => {
            const drawBar = (lower, upper, hue) => {
              const lowerX = freq.freq2X[lower] || 0
              const upperX = freq.freq2X[upper] || 0
              const gradient = cc.createLinearGradient(lowerX, 0, upperX, 0)
              gradient.addColorStop(0, `hsla(${hue},75%,50%,.6)`)
              // gradient.addColorStop(.25, `hsla(${hue},75%,66%,.5)`)
              gradient.addColorStop(.5, `hsla(${hue},75%,50%,.25)`)
              // gradient.addColorStop(.75, `hsla(${hue},75%,66%,.5)`)
              gradient.addColorStop(1, `hsla(${hue},75%,50%,.6)`)
              cc.fillStyle = gradient
              cc.fillRect(lowerX, 0, upperX - lowerX, ccext.height)
            }
            drawBar(fx.int.lowerFreqL, fx.int.upperFreqL, leftHue)
            drawBar(fx.int.lowerFreqR, fx.int.upperFreqR, rightHue)
          }
        },
      }, {
        graphType: 'freq',
        filter: 'biquadR',
        magCurveColor: rightMagCol,
        phaseCurveColor: rightPhaseCol,
        renderSet: {doClear: false, doGrid: false, doGraph: true},
        minDb: -25,
        maxDb: 15,
        diynamic: .8,
        customRenderer: {
          // pre: ({fx, cc, ccext, freq}) => {
          //   const lowerX = freq.freq2X[fx.int.lowerFreqR] || 0
          //   const upperX = freq.freq2X[fx.int.upperFreqR] || 0
          //   const gradient = cc.createLinearGradient(lowerX, 0, upperX, 0)
          //   gradient.addColorStop(0, `hsla(${rightHue},75%,50%,.33)`)
          //   gradient.addColorStop(.25, `hsla(${rightHue},75%,66%,.5)`)
          //   gradient.addColorStop(.5, `hsla(${rightHue},75%,90%,.75)`)
          //   gradient.addColorStop(.75, `hsla(${rightHue},75%,66%,.5)`)
          //   gradient.addColorStop(1, `hsla(${rightHue},75%,50%,.33)`)
          //   cc.fillStyle = gradient
          //   cc.fillRect(lowerX, 0, upperX - lowerX, ccext.height)
          // },
          post: ({fx, cc, ccext, freq}) => {
            const {width} = ccext
            cc.font = '700 32px roboto condensed'
            ccext.setTextStyle(leftMagCol, 'center')
            cc.fillText(fx.int.realFreqL + 'Hz', 140, 70)
            ccext.setTextStyle(rightMagCol, 'center')
            cc.fillText(fx.int.realFreqR + 'Hz', width - 140, 70)
            ccext.setTextStyle('#fff', 'center')
            cc.fillText(fx.atm.cascade + 'x', width / 2, 90)

            cc.font = '700 24px roboto condensed'
            ccext.setTextStyle(leftMagCol, 'center')
            cc.fillText(`${fx.int.lowerFreqL}Hz - ${fx.int.upperFreqL}Hz`, 140, 100)
            ccext.setTextStyle(rightMagCol, 'center')
            cc.fillText(`${fx.int.lowerFreqR}Hz - ${fx.int.upperFreqR}Hz`, width - 140, 100)
          }
        }
      }]
    }
  }

  const setAllBiquads = (fx, chn, singleFun, {int, atm} = fx) => {
    const otherChn = chn === 'L' ? 'R' : 'L'
    for (let n = 0; n < atm.cascade; n++) {
      singleFun?.(int['biquadA' + chn][n])
      // int.channelMode === 'LeqR' && singleFun?.(int['biquadA' + otherChn][n])
    }
    fx.recalc()
  }

  const channelSelector = (fx, shortKey, chn, value, setter) => {
    const {channelMode} = fx.int
    if (channelMode === 'LeqR' && chn === 'L') { // mono left has to copy settings to right
      setAllBiquads(fx, 'L', setter)
      fx.setValue(shortKey + 'R', value)
    } else if (channelMode === 'R' && chn === 'L') {
      fx.setValue(shortKey + 'R', value)
    } else {
      setAllBiquads(fx, chn, setter)
    }
    //.fix  if channelMode === 'R' 
  }

  const setAllChannelValues = (fx, shortKey, chn, value) => ({
    freqPreset: () => ~~value && fx.setValue('frequency' + chn, ~~value),
    frequency: () => {
      channelSelector(fx, shortKey, chn, value, biquad => fx.setAt(biquad, 'frequency', value))
      value !== ~~fx.atm['freqPreset' + chn] && fx.setValue('freqPreset' + chn, '0')
      fx.valueChanged('frequency' + chn)
      fx.recalc()
    },
    detune: () => channelSelector(fx, shortKey, chn, value, biquad => fx.setAt(biquad, 'detune', value)),
    Q: () => channelSelector(fx, shortKey, chn, value, biquad => biquad.Q.value = value)
  }[shortKey])
  
  const _setAllChannelValuesOrig = (fx, shortKey, chn, value) => ({
    freqPreset: () => ~~value && fx.setValue('frequency' + chn, ~~value),
    frequency: () => {
      setAllBiquads(fx, chn, biquad => fx.setAt(biquad, 'frequency', value))
      value !== ~~fx.atm['freqPreset' + chn] && fx.setValue('freqPreset' + chn, '0')
      fx.valueChanged('frequency' + chn)
      fx.recalc()
    },
    detune: () => setAllBiquads(fx, chn, biquad => fx.setAt(biquad, 'detune', value)),
    Q: () => setAllBiquads(fx, chn, biquad => biquad.Q.value = value),
  }[shortKey])

  tinnitusBiquadFx.setValue = (fx, key, value) => ({
    freqDisp: nop,
    LeqR: () => fx.cmdProc(value, key),
    L: () => fx.cmdProc(value, key),
    R: () => fx.cmdProc(value, key),
    LandR: () => fx.cmdProc(value, key),
    cascade: () => fx.reconfigure({multi: value}),
  }[key] || setAllChannelValues(fx, key.slice(0, -1), key.at(-1), value))

  let cnt = 10

  tinnitusBiquadFx.construct = (fx, pars, {int, atm} = fx) => {
    fx.channelCmds = createRadioCmds(fx, channelCmdsDef)
    int.channelMode = 'LandR'
    int.multi = 1

    int.biquadAL = []
    int.biquadAR = []
    int.splitter = waCtx.createChannelSplitter(2)
    int.merger = waCtx.createChannelMerger(2)
    fx.start.connect(int.splitter)
    int.merger.connect(fx.output)

    fx.destroy = () => {
      console.log('will destroy int.multi:', int.multi)
      if (!int.biquadAL[0]) {
        console.log('nothing to destroy (first?)')
        return
      }
      const last = int.multi - 1
      int.splitter.disconnect(int.biquadAL[0], 0)
      int.splitter.disconnect(int.biquadAR[0], 1)
      for (let n = 0; n < last; n++) {
        int.biquadAL[n].disconnect(int.biquadAL[n + 1], 0, 0)
        int.biquadAR[n].disconnect(int.biquadAR[n + 1], 0, 0)
      }
      int.biquadAL[last].disconnect(int.merger, 0, 0)
      int.biquadAR[last].disconnect(int.merger, 0, 1)
      for (let n = 0; n < int.multi; n++) {
        delete int.biquadAL[n]
        delete int.biquadAR[n]
      }
      int.biquadL = void 0
      int.biquadR = void 0
    }
  
    fx.build = () => {
      console.log(fx)
      console.log('will build int.multi:', int.multi)
      const last = int.multi - 1
      for (let n = 0; n < int.multi; n++) {
        int.biquadAL[n] = waCtx.createBiquadFilter()
        int.biquadAL[n].type = 'notch'
        int.biquadAL[n].lime = `biquadAL🔵[${n}]#${cnt++}`
        int.biquadAR[n] = waCtx.createBiquadFilter()
        int.biquadAR[n].type = 'notch'
        int.biquadAR[n].lime = `biquadAR🔴[${n}]#${cnt++}`
      }
      int.biquadL = int.biquadAL[0]
      int.biquadR = int.biquadAR[0]
  
      int.splitter.connect(int.biquadAL[0], 0)
      int.splitter.connect(int.biquadAR[0], 1)
      for (let n = 0; n < last; n++) {
        int.biquadAL[n].connect(int.biquadAL[n + 1], 0, 0)
        int.biquadAR[n].connect(int.biquadAR[n + 1], 0, 0)
      }
      int.biquadAL[last].connect(int.merger, 0, 0)
      int.biquadAR[last].connect(int.merger, 0, 1)
      fx.setValue('frequencyL')
      fx.setValue('detuneL')
      fx.setValue('QL')
      fx.setValue('frequencyR')
      fx.setValue('detuneR')
      fx.setValue('QR')
    }

    fx.reconfigure = ({channelMode = int.channelMode, multi = int.multi}) => {
      console.log('rebuild will rebuild from ch/multi', int.channelMode, int.multi)
      console.log('rebuild will rebuild to', {channelMode, multi})
      fx.destroy()
      fx.int.channelMode = channelMode
      fx.int.multi = multi
      fx.build()
    }

    fx.cmdProc = (fire, mode) => {
      // console.log('tinnitus cmd', {fire, mode})
      if ((fire === 'active' || fire === 'fire') && mode !== int.channelMode) {
        fx.reconfigure({channelMode: mode})
        fx.setValue('LeqR', int.channelMode === 'LeqR' ? 'active' : 'off')
        fx.setValue('L', int.channelMode === 'L' ? 'active' : 'off')
        fx.setValue('R', int.channelMode === 'R' ? 'active' : 'off')
        fx.setValue('LandR', int.channelMode === 'LandR' ? 'active' : 'off')
      }
    }

    const dumpBiquads = () => {
      console.log([
        `LEFT: [${int.lowerFreqL}... (%c${int.realFreqL}%c) ...${int.upperFreqL}]`,
        `RIGHT: [${int.lowerFreqR}... (%c${int.realFreqR}%c) ...${int.upperFreqR}]`
      ].join(' '), 'color: #66f', 'color:#fff', 'color: #f33', 'color:#fff')
      const out = [int.biquadL, int.biquadR, ...int.biquadAL, ...int.biquadAR]
        .map(({lime, frequency, Q}) => ({
          lime,
          frequency: `${round(frequency.value)}Hz`,
          Q: `${Q.value.toFixed(3)}`
        }))
      console.table(out)  
    }
    const dumpBiquadsThrottled = startEndThrottle(dumpBiquads, 100)

    fx.recalc = () => {
      int.realFreqL = detuneFreq(atm.frequencyL, atm.detuneL)
      int.realFreqR = detuneFreq(atm.frequencyR, atm.detuneR)
      int.lowerFreqL = round(int.realFreqL / SQRT2)
      int.upperFreqL = round(int.realFreqL * SQRT2)
      int.lowerFreqR = round(int.realFreqR / SQRT2)
      int.upperFreqR = round(int.realFreqR * SQRT2)
      adelay(30).then(() => dumpBiquadsThrottled())
    }
  }
  registerFxType('fx_tinnitusBiquad', tinnitusBiquadFx)
})
