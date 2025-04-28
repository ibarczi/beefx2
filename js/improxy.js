/* eslint-disable spaced-comment, object-curly-spacing */

export { DragWithDOM } from 'https://rez.mork.work/dom/dragwdom.js' //.fix  rez -> proxy
export { Redact } from 'https://rez.mork.work/dom/redact.js' //.fix  rez -> proxy

export * from './beefx/beeproxy.js'

// export * from 'https://rez.mork.work/webapis/midi/midi-interface.js'
// export * as Midi from './red/esm/webapis/midi-interface-esm.js'
export * as Midi from 'https://rez.mork.work/webapis/midi/midi-interface-lite.js'
export * as TestMidi from './ui/ui-midi-esm.js'

export * as Sources from './pg-sources.js'
export * as StateManager from './pg-states.js'
export * as StageManager from './pg-stages.js'

export * as FxUiPars from './ui/ui-fxpars-esm.js'
export * as FxUi from './ui/ui-fxpanel-esm.js'
export * as StagesUi from './ui/ui-stages-esm.js'
export * as Observer from './ui/ui-observer-esm.js'
export * as PlayersUi from './ui/ui-players-esm.js'
export * as SourcesUi from './ui/ui-sources-esm.js'
export * as StatesUi from './ui/ui-states-esm.js'

export { createUI } from './ui/ui-esm.js'

export * as Playground from './playground.js'
// import '../contest/ct-esm.js'
