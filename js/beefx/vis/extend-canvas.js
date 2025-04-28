const {max, min, round, pow, log: mathlog, log2, floor, LN2, LN10, abs} = Math

export const extendCanvas = ccext => {
  const {cc, width, height, halfWidth, renderSet} = ccext

  //#947  Canvas simplifiers

  ccext.initCanvas = _ => {
    renderSet.doClear && cc.clearRect(0, 0, width, height)
    cc.font = '22px roboto condensed'
  }

  //.head  canvas general

  let prev = {}
    
  ccext.drawDynLine = (x, y, col) => { //: canvas API is medieval
    cc.strokeStyle = col
    cc.beginPath() 
    if (x) {
      cc.moveTo(prev.x, prev.y)
      cc.lineTo(x, y) 
    }
    prev = {x, y}
    cc.stroke()
  }
  const drawLine = ccext.drawLine = (x1, y1, x2, y2) => {
    cc.beginPath()
    cc.moveTo(x1, y1)
    cc.lineTo(x2, y2)
    cc.stroke()
  }

  const setTextStyle = ccext.setTextStyle = (fillStyle, textAlign) => {
    cc.fillStyle = fillStyle
    cc.textAlign = textAlign
  }
  ccext.setLineStyle = (strokeStyle, lineWidth) => {
    cc.strokeStyle = strokeStyle
    cc.lineWidth = lineWidth
  }
  ccext.canvasLine = (x1, y1, x2, y2) => {
    cc.moveTo(x1, y1)
    cc.lineTo(x2, y2)
  }
  ccext.drawText = (text, fillStyle, textAlign, fontSize, x, y) => {
    x < 0 && (x += width)
    y < 0 && (y += height)
    cc.font = fontSize + ' roboto condensed'
    setTextStyle(fillStyle, textAlign)
    cc.fillText(text, x, y)
  }

  //.head  canvas+audio

  const {
    freqMarginLeft, freqMarginRight, minDb, maxDb, msOffsetFactor, dbWidthFactor, minMs, maxMs
  } = ccext
  
  const dbScale = maxDb - minDb // 60, 65
  const msScale = maxMs - minMs
  const pixPerMsX = halfWidth / msScale
  const pixPerDbX = width * dbWidthFactor / dbScale
  const pixPerDbY = height / dbScale
  const realFreqWidth = width - freqMarginLeft - freqMarginRight
  const realFreqScaleX = realFreqWidth / width
  
  ccext.scaleAndRoundFreqX = x => round(freqMarginLeft + x * realFreqScaleX)
  
  const dbToY = ccext.dbToY = db => height - (db - minDb) * pixPerDbY
  const dbToX = ccext.dbToX = db => (db - minDb) * pixPerDbX
  
  const msOffsetX = msOffsetFactor * width
  const msToX = ms => (ms - minMs) * pixPerMsX + msOffsetX

  ccext.dbdbLine = (dbx1, dby1, dbx2, dby2) => {
    const x1 = dbToX(dbx1)
    const x2 = dbToX(dbx2)
    const y1 = dbToY(dby1)
    const y2 = dbToY(dby2)
    drawLine(x1, y1, x2, y2)
  }
  ccext.dbdbQuadratic = (dbx1, dby1, dbcpx, dbcpy, dbx2, dby2) => {
    const x1 = dbToX(dbx1)
    const x2 = dbToX(dbx2)
    const cx = dbToX(dbcpx)
    const y1 = dbToY(dby1)
    const y2 = dbToY(dby2)
    const cy = dbToY(dbcpy)
    cc.beginPath()
    cc.moveTo(x1, y1)
    cc.quadraticCurveTo(cx, cy, x2, y2)
    cc.stroke()
  }
  const msdb = {x: 0, y: 0}
  const msdbLineTo = ccext.msdbLineTo = (msx2 = msdb.x, dby2 = msdb.y) => {
    const x1 = msdb.x
    const y1 = msdb.y
    const x2 = msToX(msx2)
    const y2 = dbToY(dby2)
    drawLine(x1, y1, x2, y2)
    msdb.x = x2
    msdb.y = y2
  }
  ccext.msdbLine = (msx1, dby1, msx2, dby2) => {
    msdb.x = msToX(msx1)
    msdb.y = dbToY(dby1)
    msdbLineTo(msx2, dby2)
  }
}
