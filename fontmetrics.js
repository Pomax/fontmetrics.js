/**
  This library rewrites the Canvas2D "measureText" function
  so that it returns a more complete metrics object.

  Author: Mike "Pomax" Kamermans
**/
(function(){
  var NAME = "FontMetrics Library"
  var VERSION = "1-2011.0927.1431";
  var debug = true;

  // if there is no getComputedStyle, this library won't work.
  if(!document.defaultView.getComputedStyle) {
    throw("ERROR: 'document.defaultView.getComputedStyle' not found. This library only works in browsers that can report computed CSS values.");
  }

  // store the old text metrics function on the Canvas2D prototype
  CanvasRenderingContext2D.prototype.measureTextWidth = CanvasRenderingContext2D.prototype.measureText;

  /**
   *  shortcut function for getting computed CSS values
   */
  var getCSSValue = function(element, property) {
    return document.defaultView.getComputedStyle(element,null).getPropertyValue(property);
  };

  // debug function
  var show = function(canvas, ctx, xstart, w, h, metrics)
  {
    document.body.appendChild(canvas);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';

    ctx.beginPath();
    ctx.moveTo(xstart,0);
    ctx.lineTo(xstart,h);
    ctx.closePath();
    ctx.stroke(); 

    ctx.beginPath();
    ctx.moveTo(xstart+metrics.bounds.maxx,0);
    ctx.lineTo(xstart+metrics.bounds.maxx,h);
    ctx.closePath();
    ctx.stroke(); 

    ctx.beginPath();
    ctx.moveTo(0,h/2-metrics.ascent);
    ctx.lineTo(w,h/2-metrics.ascent);
    ctx.closePath();
    ctx.stroke(); 

    ctx.beginPath();
    ctx.moveTo(0,h/2+metrics.descent);
    ctx.lineTo(w,h/2+metrics.descent);
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * The new text metrics function
   */
  CanvasRenderingContext2D.prototype.measureText = function(textstring) {
    var metrics = this.measureTextWidth(textstring);
        fontFamily = getCSSValue(this.canvas,"font-family"),
        fontSize = getCSSValue(this.canvas,"font-size").replace("px","");
        metrics.fontsize = fontSize;
    var canvas = document.createElement("canvas");
    var padding = 100;
    canvas.width = metrics.width + padding;
    canvas.height = 3*fontSize;
    canvas.style.opacity = 1;
    canvas.style.fontFamily = fontFamily;
    canvas.style.fontSize = fontSize;
    var ctx = canvas.getContext("2d");
    ctx.font = fontSize + "px " + fontFamily;

    // for text lead values, we meaure a multiline text container.
    var leadDiv = document.createElement("div");
    leadDiv.style.position = "absolute";
    leadDiv.style.opacity = 0;
    leadDiv.style.font = fontSize + "px " + fontFamily;
    leadDiv.innerHTML = textstring + "<br/>" + textstring;
    document.body.appendChild(leadDiv);

    var w = canvas.width,
        h = canvas.height,
        baseline = h/2;

    // Set all canvas pixeldata values to 255, with all the content
    // data being 0. This lets us scan for data[i] != 255.
    ctx.fillStyle = "white";
    ctx.fillRect(-1, -1, w+2, h+2);
    ctx.fillStyle = "black";
    ctx.fillText(textstring, padding/2, baseline);
    var pixelData = ctx.getImageData(0, 0, w, h).data;

    // canvas pixel data is w*4 by h*4, because R, G, B and A are separate,
    // consecutive values in the array, rather than stored as 32 bit ints.
    var i = 0,
        w4 = w * 4,
        len = pixelData.length;

    // Finding the ascent uses a normal, forward scanline
    while (++i < len && pixelData[i] === 255) {}
    var ascent = (i/w4)|0;

    // Finding the descent uses a reverse scanline
    i = len - 1;
    while (--i > 0 && pixelData[i] === 255) {}
    var descent = (i/w4)|0;

    // find the min-x coordinate
    for(i = 0; i<len && pixelData[i] === 255; ) {
      i += w4;
      if(i>=len) { i = (i-len) + 4; }}
    var minx = ((i%w4)/4) | 0;

    // find the max-x coordinate
    var step = 1;
    for(i = len-3; i>=0 && pixelData[i] === 255; ) {
      i -= w4;
      if(i<0) { i = (len - 3) - (step++)*4; }}
    var maxx = ((i%w4)/4) + 1 | 0;

    // set font metrics
    metrics.ascent = (baseline - ascent);
    metrics.descent = (descent - baseline);
    metrics.bounds = { minx: minx - (padding/2),
                       maxx: maxx - (padding/2),
                       miny: 0,
                       maxy: descent-ascent };
    metrics.height = 1+(descent - ascent);
                       
    // make some initial guess at the text leading (using the standard TeX ratio)
    metrics.leading = 1.2 * fontSize;

    // then we try to get the real value from the browser
    var leadDivHeight = getCSSValue(leadDiv,"height");
    leadDivHeight = leadDivHeight.replace("px","");
    if (leadDivHeight >= fontSize * 2) { metrics.leading = (leadDivHeight/2) | 0; }
    document.body.removeChild(leadDiv); 

    // show the canvas and bounds if required
    if(debug){show(canvas, ctx, 50, w, h, metrics);}

    return metrics;
  };
}());