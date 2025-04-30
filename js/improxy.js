/* eslint-disable spaced-comment, object-curly-spacing */

export { DragWithDOM } from 'https://rez.mork.work/dom/dragwdom.js' //.fix  rez -> proxy
export { Redact } from 'https://rez.mork.work/dom/redact.js' //.fix  rez -> proxy

export * from './beefx/beeproxy.js'

export * as Midi from 'https://rez.mork.work/webapis/midi/midi-interface-lite.js'
export * as TestMidi from './ui/ui-midi.js'

export * as Sources from './pg-sources.js'
export * as StateManager from './pg-states.js'
export * as StageManager from './pg-stages.js'

export * as FxUiPars from './ui/ui-fxpars.js'
export * as FxUi from './ui/ui-fxpanel.js'
export * as StagesUi from './ui/ui-stages.js'
export * as Observer from './ui/ui-observer.js'
export * as PlayersUi from './ui/ui-players.js'
export * as SourcesUi from './ui/ui-sources.js'
export * as StatesUi from './ui/ui-states.js'

export { createUI } from './ui/ui.js'

export * as Playground from './playground.js'
