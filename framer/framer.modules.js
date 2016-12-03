require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"myModule":[function(require,module,exports){
exports.myVar = "myVariable";

exports.myFunction = function() {
  return print("myFunction is running");
};

exports.myArray = [1, 2, 3];


},{}],"shortcuts":[function(require,module,exports){

/*
  Shortcuts for Framer 1.0
  http://github.com/facebook/shortcuts-for-framer

  Copyright (c) 2014, Facebook, Inc.
  All rights reserved.

  Readme:
  https://github.com/facebook/shortcuts-for-framer

  License:
  https://github.com/facebook/shortcuts-for-framer/blob/master/LICENSE.md
 */

/*
  CONFIGURATION
 */
var shortcuts;

shortcuts = {};

Framer.Defaults.FadeAnimation = {
  curve: "bezier-curve",
  time: 0.2
};

Framer.Defaults.SlideAnimation = {
  curve: "spring(400,40,0)"
};


/*
  LOOP ON EVERY LAYER

  Shorthand for applying a function to every layer in the document.

  Example:
  ```shortcuts.everyLayer(function(layer) {
    layer.visible = false;
  });```
 */

shortcuts.everyLayer = function(fn) {
  var _layer, layerName, results1;
  results1 = [];
  for (layerName in window.Layers) {
    _layer = window.Layers[layerName];
    results1.push(fn(_layer));
  }
  return results1;
};


/*
  SHORTHAND FOR ACCESSING LAYERS

  Convert each layer coming from the exporter into a Javascript object for shorthand access.

  This has to be called manually in Framer3 after you've ran the importer.

  myLayers = Framer.Importer.load("...")
  shortcuts.initialize(myLayers)

  If you have a layer in your PSD/Sketch called "NewsFeed", this will create a global Javascript variable called "NewsFeed" that you can manipulate with Framer.

  Example:
  `NewsFeed.visible = false;`

  Notes:
  Javascript has some names reserved for internal function that you can't override (for ex. )
  If you call initialize without anything, it will use all currently available layers.
 */

shortcuts.initialize = function(layers) {
  var layer;
  if (!layers) {
    layer = Framer.CurrentContext._layerList;
  }
  window.Layers = layers;
  return shortcuts.everyLayer(function(layer) {
    var sanitizedLayerName;
    sanitizedLayerName = layer.name.replace(/[-+!?:*\[\]\(\)\/]/g, '').trim().replace(/\s/g, '_');
    window[sanitizedLayerName] = layer;
    shortcuts.saveOriginalFrame(layer);
    return shortcuts.initializeTouchStates(layer);
  });
};


/*
  FIND CHILD LAYERS BY NAME

  Retrieves subLayers of selected layer that have a matching name.

  getChild: return the first sublayer whose name includes the given string
  getChildren: return all subLayers that match

  Useful when eg. iterating over table cells. Use getChild to access the button found in each cell. This is **case insensitive**.

  Example:
  `topLayer = NewsFeed.getChild("Top")` Looks for layers whose name matches Top. Returns the first matching layer.

  `childLayers = Table.getChildren("Cell")` Returns all children whose name match Cell in an array.
 */

Layer.prototype.getChild = function(needle, recursive) {
  var i, j, len, len1, ref, ref1, subLayer;
  if (recursive == null) {
    recursive = false;
  }
  ref = this.subLayers;
  for (i = 0, len = ref.length; i < len; i++) {
    subLayer = ref[i];
    if (subLayer.name.toLowerCase().indexOf(needle.toLowerCase()) !== -1) {
      return subLayer;
    }
  }
  if (recursive) {
    ref1 = this.subLayers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      subLayer = ref1[j];
      if (subLayer.getChild(needle, recursive)) {
        return subLayer.getChild(needle, recursive);
      }
    }
  }
};

Layer.prototype.getChildren = function(needle, recursive) {
  var i, j, len, len1, ref, ref1, results, subLayer;
  if (recursive == null) {
    recursive = false;
  }
  results = [];
  if (recursive) {
    ref = this.subLayers;
    for (i = 0, len = ref.length; i < len; i++) {
      subLayer = ref[i];
      results = results.concat(subLayer.getChildren(needle, recursive));
    }
    if (this.name.toLowerCase().indexOf(needle.toLowerCase()) !== -1) {
      results.push(this);
    }
    return results;
  } else {
    ref1 = this.subLayers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      subLayer = ref1[j];
      if (subLayer.name.toLowerCase().indexOf(needle.toLowerCase()) !== -1) {
        results.push(subLayer);
      }
    }
    return results;
  }
};


/*
  CONVERT A NUMBER RANGE TO ANOTHER

  Converts a number within one range to another range

  Example:
  We want to map the opacity of a layer to its x location.

  The opacity will be 0 if the X coordinate is 0, and it will be 1 if the X coordinate is 640. All the X coordinates in between will result in intermediate values between 0 and 1.

  `myLayer.opacity = convertRange(0, 640, myLayer.x, 0, 1)`

  By default, this value might be outside the bounds of NewMin and NewMax if the OldValue is outside OldMin and OldMax. If you want to cap the final value to NewMin and NewMax, set capped to true.
  Make sure NewMin is smaller than NewMax if you're using this. If you need an inverse proportion, try swapping OldMin and OldMax.
 */

shortcuts.convertRange = function(OldMin, OldMax, OldValue, NewMin, NewMax, capped) {
  var NewRange, NewValue, OldRange;
  OldRange = OldMax - OldMin;
  NewRange = NewMax - NewMin;
  NewValue = (((OldValue - OldMin) * NewRange) / OldRange) + NewMin;
  if (capped) {
    if (NewValue > NewMax) {
      return NewMax;
    } else if (NewValue < NewMin) {
      return NewMin;
    } else {
      return NewValue;
    }
  } else {
    return NewValue;
  }
};


/*
  ORIGINAL FRAME

  Stores the initial location and size of a layer in the "originalFrame" attribute, so you can revert to it later on.

  Example:
  The x coordinate of MyLayer is initially 400 (from the PSD)

  ```MyLayer.x = 200; // now we set it to 200.
  MyLayer.x = MyLayer.originalFrame.x // now we set it back to its original value, 400.```
 */

shortcuts.saveOriginalFrame = function(layer) {
  return layer.originalFrame = layer.frame;
};


/*
  SHORTHAND HOVER SYNTAX

  Quickly define functions that should run when I hover over a layer, and hover out.

  Example:
  `MyLayer.hover(function() { OtherLayer.show() }, function() { OtherLayer.hide() });`
 */

Layer.prototype.hover = function(enterFunction, leaveFunction) {
  this.on('mouseenter', enterFunction);
  return this.on('mouseleave', leaveFunction);
};


/*
  SHORTHAND TAP SYNTAX

  Instead of `MyLayer.on(Events.TouchEnd, handler)`, use `MyLayer.tap(handler)`
 */

Layer.prototype.tap = function(handler) {
  return this.on(Events.TouchEnd, handler);
};


/*
  SHORTHAND CLICK SYNTAX

  Instead of `MyLayer.on(Events.Click, handler)`, use `MyLayer.click(handler)`
 */

Layer.prototype.click = function(handler) {
  return this.on(Events.Click, handler);
};


/*
  SHORTHAND ANIMATION SYNTAX

  A shorter animation syntax that mirrors the jQuery syntax:
  layer.animate(properties, [time], [curve], [callback])

  All parameters except properties are optional and can be omitted.

  Old:
  ```MyLayer.animate({
    properties: {
      x: 500
    },
    time: 500,
    curve: 'bezier-curve'
  })```

  New:
  ```MyLayer.animateTo({
    x: 500
  })```

  Optionally (with 1000ms duration and spring):
    ```MyLayer.animateTo({
    x: 500
  }, 1000, "spring(100,10,0)")
 */

Layer.prototype.animateTo = function(properties, first, second, third) {
  var callback, curve, thisLayer, time;
  thisLayer = this;
  time = curve = callback = null;
  if (typeof first === "number") {
    time = first;
    if (typeof second === "string") {
      curve = second;
      callback = third;
    }
    if (typeof second === "function") {
      callback = second;
    }
  } else if (typeof first === "string") {
    curve = first;
    if (typeof second === "function") {
      callback = second;
    }
  } else if (typeof first === "function") {
    callback = first;
  }
  if ((time != null) && (curve == null)) {
    curve = 'bezier-curve';
  }
  if (curve == null) {
    curve = Framer.Defaults.Animation.curve;
  }
  if (time == null) {
    time = Framer.Defaults.Animation.time;
  }
  thisLayer.animationTo = new Animation({
    layer: thisLayer,
    properties: properties,
    curve: curve,
    time: time
  });
  thisLayer.animationTo.on('start', function() {
    return thisLayer.isAnimating = true;
  });
  thisLayer.animationTo.on('end', function() {
    thisLayer.isAnimating = null;
    if (callback != null) {
      return callback();
    }
  });
  return thisLayer.animationTo.start();
};


/*
  ANIMATE MOBILE LAYERS IN AND OUT OF THE VIEWPORT

  Shorthand syntax for animating layers in and out of the viewport. Assumes that the layer you are animating is a whole screen and has the same dimensions as your container.

  Enable the device preview in Framer Studio to use this – it lets this script figure out what the bounds of your screen are.

  Example:
  * `MyLayer.slideToLeft()` will animate the layer **to** the left corner of the screen (from its current position)

  * `MyLayer.slideFromLeft()` will animate the layer into the viewport **from** the left corner (from x=-width)

  Configuration:
  * (By default we use a spring curve that approximates iOS. To use a time duration, change the curve to bezier-curve.)
  * Framer.Defaults.SlideAnimation.time
  * Framer.Defaults.SlideAnimation.curve


  How to read the configuration:
  ```slideFromLeft:
    property: "x"     // animate along the X axis
    factor: "width"
    from: -1          // start value: outside the left corner ( x = -width_phone )
    to: 0             // end value: inside the left corner ( x = width_layer )
  ```
 */

shortcuts.slideAnimations = {
  slideFromLeft: {
    property: "x",
    factor: "width",
    from: -1,
    to: 0
  },
  slideToLeft: {
    property: "x",
    factor: "width",
    to: -1
  },
  slideFromRight: {
    property: "x",
    factor: "width",
    from: 1,
    to: 0
  },
  slideToRight: {
    property: "x",
    factor: "width",
    to: 1
  },
  slideFromTop: {
    property: "y",
    factor: "height",
    from: -1,
    to: 0
  },
  slideToTop: {
    property: "y",
    factor: "height",
    to: -1
  },
  slideFromBottom: {
    property: "y",
    factor: "height",
    from: 1,
    to: 0
  },
  slideToBottom: {
    property: "y",
    factor: "height",
    to: 1
  }
};

_.each(shortcuts.slideAnimations, function(opts, name) {
  return Layer.prototype[name] = function(time) {
    var _animationConfig, _curve, _factor, _phone, _property, _time, err, ref, ref1;
    _phone = (ref = Framer.Device) != null ? (ref1 = ref.screen) != null ? ref1.frame : void 0 : void 0;
    if (!_phone) {
      err = "Please select a device preview in Framer Studio to use the slide preset animations.";
      print(err);
      console.log(err);
      return;
    }
    _property = opts.property;
    _factor = _phone[opts.factor];
    if (opts.from != null) {
      this[_property] = opts.from * _factor;
    }
    _animationConfig = {};
    _animationConfig[_property] = opts.to * _factor;
    if (time) {
      _time = time;
      _curve = "bezier-curve";
    } else {
      _time = Framer.Defaults.SlideAnimation.time;
      _curve = Framer.Defaults.SlideAnimation.curve;
    }
    return this.animate({
      properties: _animationConfig,
      time: _time,
      curve: _curve
    });
  };
});


/*
  EASY FADE IN / FADE OUT

  .show() and .hide() are shortcuts to affect opacity and pointer events. This is essentially the same as hiding with `visible = false` but can be animated.

  .fadeIn() and .fadeOut() are shortcuts to fade in a hidden layer, or fade out a visible layer.

  These shortcuts work on individual layer objects as well as an array of layers.

  Example:
  * `MyLayer.fadeIn()` will fade in MyLayer using default timing.
  * `[MyLayer, OtherLayer].fadeOut(4)` will fade out both MyLayer and OtherLayer over 4 seconds.

  To customize the fade animation, change the variables time and curve inside `Framer.Defaults.FadeAnimation`.
 */

Layer.prototype.show = function() {
  this.opacity = 1;
  this.style.pointerEvents = 'auto';
  return this;
};

Layer.prototype.hide = function() {
  this.opacity = 0;
  this.style.pointerEvents = 'none';
  return this;
};

Layer.prototype.fadeIn = function(time) {
  if (time == null) {
    time = Framer.Defaults.FadeAnimation.time;
  }
  if (this.opacity === 1) {
    return;
  }
  if (!this.visible) {
    this.opacity = 0;
    this.visible = true;
  }
  return this.animateTo({
    opacity: 1
  }, time, Framer.Defaults.FadeAnimation.curve);
};

Layer.prototype.fadeOut = function(time) {
  var that;
  if (time == null) {
    time = Framer.Defaults.FadeAnimation.time;
  }
  if (this.opacity === 0) {
    return;
  }
  that = this;
  return this.animateTo({
    opacity: 0
  }, time, Framer.Defaults.FadeAnimation.curve, function() {
    return that.style.pointerEvents = 'none';
  });
};

_.each(['show', 'hide', 'fadeIn', 'fadeOut'], function(fnString) {
  return Object.defineProperty(Array.prototype, fnString, {
    enumerable: false,
    value: function(time) {
      _.each(this, function(layer) {
        if (layer instanceof Layer) {
          return Layer.prototype[fnString].call(layer, time);
        }
      });
      return this;
    }
  });
});


/*
  EASY HOVER AND TOUCH/CLICK STATES FOR LAYERS

  By naming your layer hierarchy in the following way, you can automatically have your layers react to hovers, clicks or taps.

  Button_touchable
  - Button_default (default state)
  - Button_down (touch/click state)
  - Button_hover (hover)
 */

shortcuts.initializeTouchStates = function(layer) {
  var _default, _down, _hover, hitTarget;
  _default = layer.getChild('default');
  if (layer.name.toLowerCase().indexOf('touchable') && _default) {
    if (!Framer.Utils.isMobile()) {
      _hover = layer.getChild('hover');
    }
    _down = layer.getChild('down');
    if (_hover != null) {
      _hover.hide();
    }
    if (_down != null) {
      _down.hide();
    }
    if (_hover || _down) {
      hitTarget = new Layer({
        background: 'transparent',
        frame: _default.frame
      });
      hitTarget.superLayer = layer;
      hitTarget.bringToFront();
    }
    if (_hover) {
      layer.hover(function() {
        _default.hide();
        return _hover.show();
      }, function() {
        _default.show();
        return _hover.hide();
      });
    }
    if (_down) {
      layer.on(Events.TouchStart, function() {
        _default.hide();
        if (_hover != null) {
          _hover.hide();
        }
        return _down.show();
      });
      return layer.on(Events.TouchEnd, function() {
        _down.hide();
        if (_hover) {
          return _hover.show();
        } else {
          return _default.show();
        }
      });
    }
  }
};

_.extend(exports, shortcuts);


},{}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWVyLm1vZHVsZXMuanMiLCJzb3VyY2VzIjpbIi4uL21vZHVsZXMvc2hvcnRjdXRzLmNvZmZlZSIsIi4uL21vZHVsZXMvbXlNb2R1bGUuY29mZmVlIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIjIyNcbiAgU2hvcnRjdXRzIGZvciBGcmFtZXIgMS4wXG4gIGh0dHA6Ly9naXRodWIuY29tL2ZhY2Vib29rL3Nob3J0Y3V0cy1mb3ItZnJhbWVyXG5cbiAgQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICBBbGwgcmlnaHRzIHJlc2VydmVkLlxuXG4gIFJlYWRtZTpcbiAgaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3Nob3J0Y3V0cy1mb3ItZnJhbWVyXG5cbiAgTGljZW5zZTpcbiAgaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3Nob3J0Y3V0cy1mb3ItZnJhbWVyL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiMjI1xuXG5cblxuXG4jIyNcbiAgQ09ORklHVVJBVElPTlxuIyMjXG5cbnNob3J0Y3V0cyA9IHt9XG5cbkZyYW1lci5EZWZhdWx0cy5GYWRlQW5pbWF0aW9uID1cbiAgY3VydmU6IFwiYmV6aWVyLWN1cnZlXCJcbiAgdGltZTogMC4yXG5cbkZyYW1lci5EZWZhdWx0cy5TbGlkZUFuaW1hdGlvbiA9XG4gIGN1cnZlOiBcInNwcmluZyg0MDAsNDAsMClcIlxuXG5cblxuIyMjXG4gIExPT1AgT04gRVZFUlkgTEFZRVJcblxuICBTaG9ydGhhbmQgZm9yIGFwcGx5aW5nIGEgZnVuY3Rpb24gdG8gZXZlcnkgbGF5ZXIgaW4gdGhlIGRvY3VtZW50LlxuXG4gIEV4YW1wbGU6XG4gIGBgYHNob3J0Y3V0cy5ldmVyeUxheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgbGF5ZXIudmlzaWJsZSA9IGZhbHNlO1xuICB9KTtgYGBcbiMjI1xuc2hvcnRjdXRzLmV2ZXJ5TGF5ZXIgPSAoZm4pIC0+XG4gIGZvciBsYXllck5hbWUgb2Ygd2luZG93LkxheWVyc1xuICAgIF9sYXllciA9IHdpbmRvdy5MYXllcnNbbGF5ZXJOYW1lXVxuICAgIGZuIF9sYXllclxuXG5cbiMjI1xuICBTSE9SVEhBTkQgRk9SIEFDQ0VTU0lORyBMQVlFUlNcblxuICBDb252ZXJ0IGVhY2ggbGF5ZXIgY29taW5nIGZyb20gdGhlIGV4cG9ydGVyIGludG8gYSBKYXZhc2NyaXB0IG9iamVjdCBmb3Igc2hvcnRoYW5kIGFjY2Vzcy5cblxuICBUaGlzIGhhcyB0byBiZSBjYWxsZWQgbWFudWFsbHkgaW4gRnJhbWVyMyBhZnRlciB5b3UndmUgcmFuIHRoZSBpbXBvcnRlci5cblxuICBteUxheWVycyA9IEZyYW1lci5JbXBvcnRlci5sb2FkKFwiLi4uXCIpXG4gIHNob3J0Y3V0cy5pbml0aWFsaXplKG15TGF5ZXJzKVxuXG4gIElmIHlvdSBoYXZlIGEgbGF5ZXIgaW4geW91ciBQU0QvU2tldGNoIGNhbGxlZCBcIk5ld3NGZWVkXCIsIHRoaXMgd2lsbCBjcmVhdGUgYSBnbG9iYWwgSmF2YXNjcmlwdCB2YXJpYWJsZSBjYWxsZWQgXCJOZXdzRmVlZFwiIHRoYXQgeW91IGNhbiBtYW5pcHVsYXRlIHdpdGggRnJhbWVyLlxuXG4gIEV4YW1wbGU6XG4gIGBOZXdzRmVlZC52aXNpYmxlID0gZmFsc2U7YFxuXG4gIE5vdGVzOlxuICBKYXZhc2NyaXB0IGhhcyBzb21lIG5hbWVzIHJlc2VydmVkIGZvciBpbnRlcm5hbCBmdW5jdGlvbiB0aGF0IHlvdSBjYW4ndCBvdmVycmlkZSAoZm9yIGV4LiApXG4gIElmIHlvdSBjYWxsIGluaXRpYWxpemUgd2l0aG91dCBhbnl0aGluZywgaXQgd2lsbCB1c2UgYWxsIGN1cnJlbnRseSBhdmFpbGFibGUgbGF5ZXJzLlxuIyMjXG5zaG9ydGN1dHMuaW5pdGlhbGl6ZSA9IChsYXllcnMpIC0+XG5cbiAgbGF5ZXIgPSBGcmFtZXIuQ3VycmVudENvbnRleHQuX2xheWVyTGlzdCBpZiBub3QgbGF5ZXJzXG5cbiAgd2luZG93LkxheWVycyA9IGxheWVyc1xuXG4gIHNob3J0Y3V0cy5ldmVyeUxheWVyIChsYXllcikgLT5cbiAgICBzYW5pdGl6ZWRMYXllck5hbWUgPSBsYXllci5uYW1lLnJlcGxhY2UoL1stKyE/OipcXFtcXF1cXChcXClcXC9dL2csICcnKS50cmltKCkucmVwbGFjZSgvXFxzL2csICdfJylcbiAgICB3aW5kb3dbc2FuaXRpemVkTGF5ZXJOYW1lXSA9IGxheWVyXG4gICAgc2hvcnRjdXRzLnNhdmVPcmlnaW5hbEZyYW1lIGxheWVyXG4gICAgc2hvcnRjdXRzLmluaXRpYWxpemVUb3VjaFN0YXRlcyBsYXllclxuXG5cbiMjI1xuICBGSU5EIENISUxEIExBWUVSUyBCWSBOQU1FXG5cbiAgUmV0cmlldmVzIHN1YkxheWVycyBvZiBzZWxlY3RlZCBsYXllciB0aGF0IGhhdmUgYSBtYXRjaGluZyBuYW1lLlxuXG4gIGdldENoaWxkOiByZXR1cm4gdGhlIGZpcnN0IHN1YmxheWVyIHdob3NlIG5hbWUgaW5jbHVkZXMgdGhlIGdpdmVuIHN0cmluZ1xuICBnZXRDaGlsZHJlbjogcmV0dXJuIGFsbCBzdWJMYXllcnMgdGhhdCBtYXRjaFxuXG4gIFVzZWZ1bCB3aGVuIGVnLiBpdGVyYXRpbmcgb3ZlciB0YWJsZSBjZWxscy4gVXNlIGdldENoaWxkIHRvIGFjY2VzcyB0aGUgYnV0dG9uIGZvdW5kIGluIGVhY2ggY2VsbC4gVGhpcyBpcyAqKmNhc2UgaW5zZW5zaXRpdmUqKi5cblxuICBFeGFtcGxlOlxuICBgdG9wTGF5ZXIgPSBOZXdzRmVlZC5nZXRDaGlsZChcIlRvcFwiKWAgTG9va3MgZm9yIGxheWVycyB3aG9zZSBuYW1lIG1hdGNoZXMgVG9wLiBSZXR1cm5zIHRoZSBmaXJzdCBtYXRjaGluZyBsYXllci5cblxuICBgY2hpbGRMYXllcnMgPSBUYWJsZS5nZXRDaGlsZHJlbihcIkNlbGxcIilgIFJldHVybnMgYWxsIGNoaWxkcmVuIHdob3NlIG5hbWUgbWF0Y2ggQ2VsbCBpbiBhbiBhcnJheS5cbiMjI1xuTGF5ZXI6OmdldENoaWxkID0gKG5lZWRsZSwgcmVjdXJzaXZlID0gZmFsc2UpIC0+XG4gICMgU2VhcmNoIGRpcmVjdCBjaGlsZHJlblxuICBmb3Igc3ViTGF5ZXIgaW4gQHN1YkxheWVyc1xuICAgIHJldHVybiBzdWJMYXllciBpZiBzdWJMYXllci5uYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihuZWVkbGUudG9Mb3dlckNhc2UoKSkgaXNudCAtMSBcblxuICAjIFJlY3Vyc2l2ZWx5IHNlYXJjaCBjaGlsZHJlbiBvZiBjaGlsZHJlblxuICBpZiByZWN1cnNpdmVcbiAgICBmb3Igc3ViTGF5ZXIgaW4gQHN1YkxheWVyc1xuICAgICAgcmV0dXJuIHN1YkxheWVyLmdldENoaWxkKG5lZWRsZSwgcmVjdXJzaXZlKSBpZiBzdWJMYXllci5nZXRDaGlsZChuZWVkbGUsIHJlY3Vyc2l2ZSkgXG5cblxuTGF5ZXI6OmdldENoaWxkcmVuID0gKG5lZWRsZSwgcmVjdXJzaXZlID0gZmFsc2UpIC0+XG4gIHJlc3VsdHMgPSBbXVxuXG4gIGlmIHJlY3Vyc2l2ZVxuICAgIGZvciBzdWJMYXllciBpbiBAc3ViTGF5ZXJzXG4gICAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQgc3ViTGF5ZXIuZ2V0Q2hpbGRyZW4obmVlZGxlLCByZWN1cnNpdmUpXG4gICAgcmVzdWx0cy5wdXNoIEAgaWYgQG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKG5lZWRsZS50b0xvd2VyQ2FzZSgpKSBpc250IC0xXG4gICAgcmV0dXJuIHJlc3VsdHNcblxuICBlbHNlXG4gICAgZm9yIHN1YkxheWVyIGluIEBzdWJMYXllcnNcbiAgICAgIGlmIHN1YkxheWVyLm5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKG5lZWRsZS50b0xvd2VyQ2FzZSgpKSBpc250IC0xIFxuICAgICAgICByZXN1bHRzLnB1c2ggc3ViTGF5ZXIgXG4gICAgcmV0dXJuIHJlc3VsdHNcblxuXG5cbiMjI1xuICBDT05WRVJUIEEgTlVNQkVSIFJBTkdFIFRPIEFOT1RIRVJcblxuICBDb252ZXJ0cyBhIG51bWJlciB3aXRoaW4gb25lIHJhbmdlIHRvIGFub3RoZXIgcmFuZ2VcblxuICBFeGFtcGxlOlxuICBXZSB3YW50IHRvIG1hcCB0aGUgb3BhY2l0eSBvZiBhIGxheWVyIHRvIGl0cyB4IGxvY2F0aW9uLlxuXG4gIFRoZSBvcGFjaXR5IHdpbGwgYmUgMCBpZiB0aGUgWCBjb29yZGluYXRlIGlzIDAsIGFuZCBpdCB3aWxsIGJlIDEgaWYgdGhlIFggY29vcmRpbmF0ZSBpcyA2NDAuIEFsbCB0aGUgWCBjb29yZGluYXRlcyBpbiBiZXR3ZWVuIHdpbGwgcmVzdWx0IGluIGludGVybWVkaWF0ZSB2YWx1ZXMgYmV0d2VlbiAwIGFuZCAxLlxuXG4gIGBteUxheWVyLm9wYWNpdHkgPSBjb252ZXJ0UmFuZ2UoMCwgNjQwLCBteUxheWVyLngsIDAsIDEpYFxuXG4gIEJ5IGRlZmF1bHQsIHRoaXMgdmFsdWUgbWlnaHQgYmUgb3V0c2lkZSB0aGUgYm91bmRzIG9mIE5ld01pbiBhbmQgTmV3TWF4IGlmIHRoZSBPbGRWYWx1ZSBpcyBvdXRzaWRlIE9sZE1pbiBhbmQgT2xkTWF4LiBJZiB5b3Ugd2FudCB0byBjYXAgdGhlIGZpbmFsIHZhbHVlIHRvIE5ld01pbiBhbmQgTmV3TWF4LCBzZXQgY2FwcGVkIHRvIHRydWUuXG4gIE1ha2Ugc3VyZSBOZXdNaW4gaXMgc21hbGxlciB0aGFuIE5ld01heCBpZiB5b3UncmUgdXNpbmcgdGhpcy4gSWYgeW91IG5lZWQgYW4gaW52ZXJzZSBwcm9wb3J0aW9uLCB0cnkgc3dhcHBpbmcgT2xkTWluIGFuZCBPbGRNYXguXG4jIyNcbnNob3J0Y3V0cy5jb252ZXJ0UmFuZ2UgPSAoT2xkTWluLCBPbGRNYXgsIE9sZFZhbHVlLCBOZXdNaW4sIE5ld01heCwgY2FwcGVkKSAtPlxuICBPbGRSYW5nZSA9IChPbGRNYXggLSBPbGRNaW4pXG4gIE5ld1JhbmdlID0gKE5ld01heCAtIE5ld01pbilcbiAgTmV3VmFsdWUgPSAoKChPbGRWYWx1ZSAtIE9sZE1pbikgKiBOZXdSYW5nZSkgLyBPbGRSYW5nZSkgKyBOZXdNaW5cblxuICBpZiBjYXBwZWRcbiAgICBpZiBOZXdWYWx1ZSA+IE5ld01heFxuICAgICAgTmV3TWF4XG4gICAgZWxzZSBpZiBOZXdWYWx1ZSA8IE5ld01pblxuICAgICAgTmV3TWluXG4gICAgZWxzZVxuICAgICAgTmV3VmFsdWVcbiAgZWxzZVxuICAgIE5ld1ZhbHVlXG5cblxuIyMjXG4gIE9SSUdJTkFMIEZSQU1FXG5cbiAgU3RvcmVzIHRoZSBpbml0aWFsIGxvY2F0aW9uIGFuZCBzaXplIG9mIGEgbGF5ZXIgaW4gdGhlIFwib3JpZ2luYWxGcmFtZVwiIGF0dHJpYnV0ZSwgc28geW91IGNhbiByZXZlcnQgdG8gaXQgbGF0ZXIgb24uXG5cbiAgRXhhbXBsZTpcbiAgVGhlIHggY29vcmRpbmF0ZSBvZiBNeUxheWVyIGlzIGluaXRpYWxseSA0MDAgKGZyb20gdGhlIFBTRClcblxuICBgYGBNeUxheWVyLnggPSAyMDA7IC8vIG5vdyB3ZSBzZXQgaXQgdG8gMjAwLlxuICBNeUxheWVyLnggPSBNeUxheWVyLm9yaWdpbmFsRnJhbWUueCAvLyBub3cgd2Ugc2V0IGl0IGJhY2sgdG8gaXRzIG9yaWdpbmFsIHZhbHVlLCA0MDAuYGBgXG4jIyNcbnNob3J0Y3V0cy5zYXZlT3JpZ2luYWxGcmFtZSA9IChsYXllcikgLT5cbiAgbGF5ZXIub3JpZ2luYWxGcmFtZSA9IGxheWVyLmZyYW1lXG5cbiMjI1xuICBTSE9SVEhBTkQgSE9WRVIgU1lOVEFYXG5cbiAgUXVpY2tseSBkZWZpbmUgZnVuY3Rpb25zIHRoYXQgc2hvdWxkIHJ1biB3aGVuIEkgaG92ZXIgb3ZlciBhIGxheWVyLCBhbmQgaG92ZXIgb3V0LlxuXG4gIEV4YW1wbGU6XG4gIGBNeUxheWVyLmhvdmVyKGZ1bmN0aW9uKCkgeyBPdGhlckxheWVyLnNob3coKSB9LCBmdW5jdGlvbigpIHsgT3RoZXJMYXllci5oaWRlKCkgfSk7YFxuIyMjXG5MYXllcjo6aG92ZXIgPSAoZW50ZXJGdW5jdGlvbiwgbGVhdmVGdW5jdGlvbikgLT5cbiAgdGhpcy5vbiAnbW91c2VlbnRlcicsIGVudGVyRnVuY3Rpb25cbiAgdGhpcy5vbiAnbW91c2VsZWF2ZScsIGxlYXZlRnVuY3Rpb25cblxuXG4jIyNcbiAgU0hPUlRIQU5EIFRBUCBTWU5UQVhcblxuICBJbnN0ZWFkIG9mIGBNeUxheWVyLm9uKEV2ZW50cy5Ub3VjaEVuZCwgaGFuZGxlcilgLCB1c2UgYE15TGF5ZXIudGFwKGhhbmRsZXIpYFxuIyMjXG5cbkxheWVyOjp0YXAgPSAoaGFuZGxlcikgLT5cbiAgdGhpcy5vbiBFdmVudHMuVG91Y2hFbmQsIGhhbmRsZXJcblxuXG4jIyNcbiAgU0hPUlRIQU5EIENMSUNLIFNZTlRBWFxuXG4gIEluc3RlYWQgb2YgYE15TGF5ZXIub24oRXZlbnRzLkNsaWNrLCBoYW5kbGVyKWAsIHVzZSBgTXlMYXllci5jbGljayhoYW5kbGVyKWBcbiMjI1xuXG5MYXllcjo6Y2xpY2sgPSAoaGFuZGxlcikgLT5cbiAgdGhpcy5vbiBFdmVudHMuQ2xpY2ssIGhhbmRsZXJcblxuXG5cbiMjI1xuICBTSE9SVEhBTkQgQU5JTUFUSU9OIFNZTlRBWFxuXG4gIEEgc2hvcnRlciBhbmltYXRpb24gc3ludGF4IHRoYXQgbWlycm9ycyB0aGUgalF1ZXJ5IHN5bnRheDpcbiAgbGF5ZXIuYW5pbWF0ZShwcm9wZXJ0aWVzLCBbdGltZV0sIFtjdXJ2ZV0sIFtjYWxsYmFja10pXG5cbiAgQWxsIHBhcmFtZXRlcnMgZXhjZXB0IHByb3BlcnRpZXMgYXJlIG9wdGlvbmFsIGFuZCBjYW4gYmUgb21pdHRlZC5cblxuICBPbGQ6XG4gIGBgYE15TGF5ZXIuYW5pbWF0ZSh7XG4gICAgcHJvcGVydGllczoge1xuICAgICAgeDogNTAwXG4gICAgfSxcbiAgICB0aW1lOiA1MDAsXG4gICAgY3VydmU6ICdiZXppZXItY3VydmUnXG4gIH0pYGBgXG5cbiAgTmV3OlxuICBgYGBNeUxheWVyLmFuaW1hdGVUbyh7XG4gICAgeDogNTAwXG4gIH0pYGBgXG5cbiAgT3B0aW9uYWxseSAod2l0aCAxMDAwbXMgZHVyYXRpb24gYW5kIHNwcmluZyk6XG4gICAgYGBgTXlMYXllci5hbmltYXRlVG8oe1xuICAgIHg6IDUwMFxuICB9LCAxMDAwLCBcInNwcmluZygxMDAsMTAsMClcIilcbiMjI1xuXG5cblxuTGF5ZXI6OmFuaW1hdGVUbyA9IChwcm9wZXJ0aWVzLCBmaXJzdCwgc2Vjb25kLCB0aGlyZCkgLT5cbiAgdGhpc0xheWVyID0gdGhpc1xuICB0aW1lID0gY3VydmUgPSBjYWxsYmFjayA9IG51bGxcblxuICBpZiB0eXBlb2YoZmlyc3QpID09IFwibnVtYmVyXCJcbiAgICB0aW1lID0gZmlyc3RcbiAgICBpZiB0eXBlb2Yoc2Vjb25kKSA9PSBcInN0cmluZ1wiXG4gICAgICBjdXJ2ZSA9IHNlY29uZFxuICAgICAgY2FsbGJhY2sgPSB0aGlyZFxuICAgIGNhbGxiYWNrID0gc2Vjb25kIGlmIHR5cGVvZihzZWNvbmQpID09IFwiZnVuY3Rpb25cIlxuICBlbHNlIGlmIHR5cGVvZihmaXJzdCkgPT0gXCJzdHJpbmdcIlxuICAgIGN1cnZlID0gZmlyc3RcbiAgICBjYWxsYmFjayA9IHNlY29uZCBpZiB0eXBlb2Yoc2Vjb25kKSA9PSBcImZ1bmN0aW9uXCJcbiAgZWxzZSBpZiB0eXBlb2YoZmlyc3QpID09IFwiZnVuY3Rpb25cIlxuICAgIGNhbGxiYWNrID0gZmlyc3RcblxuICBpZiB0aW1lPyAmJiAhY3VydmU/XG4gICAgY3VydmUgPSAnYmV6aWVyLWN1cnZlJ1xuICBcbiAgY3VydmUgPSBGcmFtZXIuRGVmYXVsdHMuQW5pbWF0aW9uLmN1cnZlIGlmICFjdXJ2ZT9cbiAgdGltZSA9IEZyYW1lci5EZWZhdWx0cy5BbmltYXRpb24udGltZSBpZiAhdGltZT9cblxuICB0aGlzTGF5ZXIuYW5pbWF0aW9uVG8gPSBuZXcgQW5pbWF0aW9uXG4gICAgbGF5ZXI6IHRoaXNMYXllclxuICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICBjdXJ2ZTogY3VydmVcbiAgICB0aW1lOiB0aW1lXG5cbiAgdGhpc0xheWVyLmFuaW1hdGlvblRvLm9uICdzdGFydCcsIC0+XG4gICAgdGhpc0xheWVyLmlzQW5pbWF0aW5nID0gdHJ1ZVxuXG4gIHRoaXNMYXllci5hbmltYXRpb25Uby5vbiAnZW5kJywgLT5cbiAgICB0aGlzTGF5ZXIuaXNBbmltYXRpbmcgPSBudWxsXG4gICAgaWYgY2FsbGJhY2s/XG4gICAgICBjYWxsYmFjaygpXG5cbiAgdGhpc0xheWVyLmFuaW1hdGlvblRvLnN0YXJ0KClcblxuIyMjXG4gIEFOSU1BVEUgTU9CSUxFIExBWUVSUyBJTiBBTkQgT1VUIE9GIFRIRSBWSUVXUE9SVFxuXG4gIFNob3J0aGFuZCBzeW50YXggZm9yIGFuaW1hdGluZyBsYXllcnMgaW4gYW5kIG91dCBvZiB0aGUgdmlld3BvcnQuIEFzc3VtZXMgdGhhdCB0aGUgbGF5ZXIgeW91IGFyZSBhbmltYXRpbmcgaXMgYSB3aG9sZSBzY3JlZW4gYW5kIGhhcyB0aGUgc2FtZSBkaW1lbnNpb25zIGFzIHlvdXIgY29udGFpbmVyLlxuXG4gIEVuYWJsZSB0aGUgZGV2aWNlIHByZXZpZXcgaW4gRnJhbWVyIFN0dWRpbyB0byB1c2UgdGhpcyDigJPCoGl0IGxldHMgdGhpcyBzY3JpcHQgZmlndXJlIG91dCB3aGF0IHRoZSBib3VuZHMgb2YgeW91ciBzY3JlZW4gYXJlLlxuXG4gIEV4YW1wbGU6XG4gICogYE15TGF5ZXIuc2xpZGVUb0xlZnQoKWAgd2lsbCBhbmltYXRlIHRoZSBsYXllciAqKnRvKiogdGhlIGxlZnQgY29ybmVyIG9mIHRoZSBzY3JlZW4gKGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb24pXG5cbiAgKiBgTXlMYXllci5zbGlkZUZyb21MZWZ0KClgIHdpbGwgYW5pbWF0ZSB0aGUgbGF5ZXIgaW50byB0aGUgdmlld3BvcnQgKipmcm9tKiogdGhlIGxlZnQgY29ybmVyIChmcm9tIHg9LXdpZHRoKVxuXG4gIENvbmZpZ3VyYXRpb246XG4gICogKEJ5IGRlZmF1bHQgd2UgdXNlIGEgc3ByaW5nIGN1cnZlIHRoYXQgYXBwcm94aW1hdGVzIGlPUy4gVG8gdXNlIGEgdGltZSBkdXJhdGlvbiwgY2hhbmdlIHRoZSBjdXJ2ZSB0byBiZXppZXItY3VydmUuKVxuICAqIEZyYW1lci5EZWZhdWx0cy5TbGlkZUFuaW1hdGlvbi50aW1lXG4gICogRnJhbWVyLkRlZmF1bHRzLlNsaWRlQW5pbWF0aW9uLmN1cnZlXG5cblxuICBIb3cgdG8gcmVhZCB0aGUgY29uZmlndXJhdGlvbjpcbiAgYGBgc2xpZGVGcm9tTGVmdDpcbiAgICBwcm9wZXJ0eTogXCJ4XCIgICAgIC8vIGFuaW1hdGUgYWxvbmcgdGhlIFggYXhpc1xuICAgIGZhY3RvcjogXCJ3aWR0aFwiXG4gICAgZnJvbTogLTEgICAgICAgICAgLy8gc3RhcnQgdmFsdWU6IG91dHNpZGUgdGhlIGxlZnQgY29ybmVyICggeCA9IC13aWR0aF9waG9uZSApXG4gICAgdG86IDAgICAgICAgICAgICAgLy8gZW5kIHZhbHVlOiBpbnNpZGUgdGhlIGxlZnQgY29ybmVyICggeCA9IHdpZHRoX2xheWVyIClcbiAgYGBgXG4jIyNcblxuXG5zaG9ydGN1dHMuc2xpZGVBbmltYXRpb25zID1cbiAgc2xpZGVGcm9tTGVmdDpcbiAgICBwcm9wZXJ0eTogXCJ4XCJcbiAgICBmYWN0b3I6IFwid2lkdGhcIlxuICAgIGZyb206IC0xXG4gICAgdG86IDBcblxuICBzbGlkZVRvTGVmdDpcbiAgICBwcm9wZXJ0eTogXCJ4XCJcbiAgICBmYWN0b3I6IFwid2lkdGhcIlxuICAgIHRvOiAtMVxuXG4gIHNsaWRlRnJvbVJpZ2h0OlxuICAgIHByb3BlcnR5OiBcInhcIlxuICAgIGZhY3RvcjogXCJ3aWR0aFwiXG4gICAgZnJvbTogMVxuICAgIHRvOiAwXG5cbiAgc2xpZGVUb1JpZ2h0OlxuICAgIHByb3BlcnR5OiBcInhcIlxuICAgIGZhY3RvcjogXCJ3aWR0aFwiXG4gICAgdG86IDFcblxuICBzbGlkZUZyb21Ub3A6XG4gICAgcHJvcGVydHk6IFwieVwiXG4gICAgZmFjdG9yOiBcImhlaWdodFwiXG4gICAgZnJvbTogLTFcbiAgICB0bzogMFxuXG4gIHNsaWRlVG9Ub3A6XG4gICAgcHJvcGVydHk6IFwieVwiXG4gICAgZmFjdG9yOiBcImhlaWdodFwiXG4gICAgdG86IC0xXG5cbiAgc2xpZGVGcm9tQm90dG9tOlxuICAgIHByb3BlcnR5OiBcInlcIlxuICAgIGZhY3RvcjogXCJoZWlnaHRcIlxuICAgIGZyb206IDFcbiAgICB0bzogMFxuXG4gIHNsaWRlVG9Cb3R0b206XG4gICAgcHJvcGVydHk6IFwieVwiXG4gICAgZmFjdG9yOiBcImhlaWdodFwiXG4gICAgdG86IDFcblxuXG5cbl8uZWFjaCBzaG9ydGN1dHMuc2xpZGVBbmltYXRpb25zLCAob3B0cywgbmFtZSkgLT5cbiAgTGF5ZXIucHJvdG90eXBlW25hbWVdID0gKHRpbWUpIC0+XG4gICAgX3Bob25lID0gRnJhbWVyLkRldmljZT8uc2NyZWVuPy5mcmFtZVxuXG4gICAgdW5sZXNzIF9waG9uZVxuICAgICAgZXJyID0gXCJQbGVhc2Ugc2VsZWN0IGEgZGV2aWNlIHByZXZpZXcgaW4gRnJhbWVyIFN0dWRpbyB0byB1c2UgdGhlIHNsaWRlIHByZXNldCBhbmltYXRpb25zLlwiXG4gICAgICBwcmludCBlcnJcbiAgICAgIGNvbnNvbGUubG9nIGVyclxuICAgICAgcmV0dXJuXG5cbiAgICBfcHJvcGVydHkgPSBvcHRzLnByb3BlcnR5XG4gICAgX2ZhY3RvciA9IF9waG9uZVtvcHRzLmZhY3Rvcl1cblxuICAgIGlmIG9wdHMuZnJvbT9cbiAgICAgICMgSW5pdGlhdGUgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBhbmltYXRpb24gKGkuZS4gb2ZmIHNjcmVlbiBvbiB0aGUgbGVmdCBjb3JuZXIpXG4gICAgICB0aGlzW19wcm9wZXJ0eV0gPSBvcHRzLmZyb20gKiBfZmFjdG9yXG5cbiAgICAjIERlZmF1bHQgYW5pbWF0aW9uIHN5bnRheCBsYXllci5hbmltYXRlKHtfcHJvcGVydHk6IDB9KSB3b3VsZCB0cnkgdG8gYW5pbWF0ZSAnX3Byb3BlcnR5JyBsaXRlcmFsbHksIGluIG9yZGVyIGZvciBpdCB0byBibG93IHVwIHRvIHdoYXQncyBpbiBpdCAoZWcgeCksIHdlIHVzZSB0aGlzIHN5bnRheFxuICAgIF9hbmltYXRpb25Db25maWcgPSB7fVxuICAgIF9hbmltYXRpb25Db25maWdbX3Byb3BlcnR5XSA9IG9wdHMudG8gKiBfZmFjdG9yXG5cbiAgICBpZiB0aW1lXG4gICAgICBfdGltZSA9IHRpbWVcbiAgICAgIF9jdXJ2ZSA9IFwiYmV6aWVyLWN1cnZlXCJcbiAgICBlbHNlXG4gICAgICBfdGltZSA9IEZyYW1lci5EZWZhdWx0cy5TbGlkZUFuaW1hdGlvbi50aW1lXG4gICAgICBfY3VydmUgPSBGcmFtZXIuRGVmYXVsdHMuU2xpZGVBbmltYXRpb24uY3VydmVcblxuICAgIHRoaXMuYW5pbWF0ZVxuICAgICAgcHJvcGVydGllczogX2FuaW1hdGlvbkNvbmZpZ1xuICAgICAgdGltZTogX3RpbWVcbiAgICAgIGN1cnZlOiBfY3VydmVcblxuXG5cbiMjI1xuICBFQVNZIEZBREUgSU4gLyBGQURFIE9VVFxuXG4gIC5zaG93KCkgYW5kIC5oaWRlKCkgYXJlIHNob3J0Y3V0cyB0byBhZmZlY3Qgb3BhY2l0eSBhbmQgcG9pbnRlciBldmVudHMuIFRoaXMgaXMgZXNzZW50aWFsbHkgdGhlIHNhbWUgYXMgaGlkaW5nIHdpdGggYHZpc2libGUgPSBmYWxzZWAgYnV0IGNhbiBiZSBhbmltYXRlZC5cblxuICAuZmFkZUluKCkgYW5kIC5mYWRlT3V0KCkgYXJlIHNob3J0Y3V0cyB0byBmYWRlIGluIGEgaGlkZGVuIGxheWVyLCBvciBmYWRlIG91dCBhIHZpc2libGUgbGF5ZXIuXG5cbiAgVGhlc2Ugc2hvcnRjdXRzIHdvcmsgb24gaW5kaXZpZHVhbCBsYXllciBvYmplY3RzIGFzIHdlbGwgYXMgYW4gYXJyYXkgb2YgbGF5ZXJzLlxuXG4gIEV4YW1wbGU6XG4gICogYE15TGF5ZXIuZmFkZUluKClgIHdpbGwgZmFkZSBpbiBNeUxheWVyIHVzaW5nIGRlZmF1bHQgdGltaW5nLlxuICAqIGBbTXlMYXllciwgT3RoZXJMYXllcl0uZmFkZU91dCg0KWAgd2lsbCBmYWRlIG91dCBib3RoIE15TGF5ZXIgYW5kIE90aGVyTGF5ZXIgb3ZlciA0IHNlY29uZHMuXG5cbiAgVG8gY3VzdG9taXplIHRoZSBmYWRlIGFuaW1hdGlvbiwgY2hhbmdlIHRoZSB2YXJpYWJsZXMgdGltZSBhbmQgY3VydmUgaW5zaWRlIGBGcmFtZXIuRGVmYXVsdHMuRmFkZUFuaW1hdGlvbmAuXG4jIyNcbkxheWVyOjpzaG93ID0gLT5cbiAgQG9wYWNpdHkgPSAxXG4gIEBzdHlsZS5wb2ludGVyRXZlbnRzID0gJ2F1dG8nXG4gIEBcblxuTGF5ZXI6OmhpZGUgPSAtPlxuICBAb3BhY2l0eSA9IDBcbiAgQHN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSdcbiAgQFxuXG5MYXllcjo6ZmFkZUluID0gKHRpbWUgPSBGcmFtZXIuRGVmYXVsdHMuRmFkZUFuaW1hdGlvbi50aW1lKSAtPlxuICByZXR1cm4gaWYgQG9wYWNpdHkgPT0gMVxuXG4gIHVubGVzcyBAdmlzaWJsZVxuICAgIEBvcGFjaXR5ID0gMFxuICAgIEB2aXNpYmxlID0gdHJ1ZVxuXG4gIEBhbmltYXRlVG8gb3BhY2l0eTogMSwgdGltZSwgRnJhbWVyLkRlZmF1bHRzLkZhZGVBbmltYXRpb24uY3VydmVcblxuTGF5ZXI6OmZhZGVPdXQgPSAodGltZSA9IEZyYW1lci5EZWZhdWx0cy5GYWRlQW5pbWF0aW9uLnRpbWUpIC0+XG4gIHJldHVybiBpZiBAb3BhY2l0eSA9PSAwXG5cbiAgdGhhdCA9IEBcbiAgQGFuaW1hdGVUbyBvcGFjaXR5OiAwLCB0aW1lLCBGcmFtZXIuRGVmYXVsdHMuRmFkZUFuaW1hdGlvbi5jdXJ2ZSwgLT4gdGhhdC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnXG5cbiMgYWxsIG9mIHRoZSBlYXN5IGluL291dCBoZWxwZXJzIHdvcmsgb24gYW4gYXJyYXkgb2Ygdmlld3MgYXMgd2VsbCBhcyBpbmRpdmlkdWFsIHZpZXdzXG5fLmVhY2ggWydzaG93JywgJ2hpZGUnLCAnZmFkZUluJywgJ2ZhZGVPdXQnXSwgKGZuU3RyaW5nKS0+ICBcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5IEFycmF5LnByb3RvdHlwZSwgZm5TdHJpbmcsIFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgdmFsdWU6ICh0aW1lKSAtPlxuICAgICAgXy5lYWNoIEAsIChsYXllcikgLT5cbiAgICAgICAgTGF5ZXIucHJvdG90eXBlW2ZuU3RyaW5nXS5jYWxsKGxheWVyLCB0aW1lKSBpZiBsYXllciBpbnN0YW5jZW9mIExheWVyXG4gICAgICBAXG5cblxuIyMjXG4gIEVBU1kgSE9WRVIgQU5EIFRPVUNIL0NMSUNLIFNUQVRFUyBGT1IgTEFZRVJTXG5cbiAgQnkgbmFtaW5nIHlvdXIgbGF5ZXIgaGllcmFyY2h5IGluIHRoZSBmb2xsb3dpbmcgd2F5LCB5b3UgY2FuIGF1dG9tYXRpY2FsbHkgaGF2ZSB5b3VyIGxheWVycyByZWFjdCB0byBob3ZlcnMsIGNsaWNrcyBvciB0YXBzLlxuXG4gIEJ1dHRvbl90b3VjaGFibGVcbiAgLSBCdXR0b25fZGVmYXVsdCAoZGVmYXVsdCBzdGF0ZSlcbiAgLSBCdXR0b25fZG93biAodG91Y2gvY2xpY2sgc3RhdGUpXG4gIC0gQnV0dG9uX2hvdmVyIChob3ZlcilcbiMjI1xuXG5zaG9ydGN1dHMuaW5pdGlhbGl6ZVRvdWNoU3RhdGVzID0gKGxheWVyKSAtPlxuICBfZGVmYXVsdCA9IGxheWVyLmdldENoaWxkKCdkZWZhdWx0JylcblxuICBpZiBsYXllci5uYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZigndG91Y2hhYmxlJykgYW5kIF9kZWZhdWx0XG5cbiAgICB1bmxlc3MgRnJhbWVyLlV0aWxzLmlzTW9iaWxlKClcbiAgICAgIF9ob3ZlciA9IGxheWVyLmdldENoaWxkKCdob3ZlcicpXG4gICAgX2Rvd24gPSBsYXllci5nZXRDaGlsZCgnZG93bicpXG5cbiAgICAjIFRoZXNlIGxheWVycyBzaG91bGQgYmUgaGlkZGVuIGJ5IGRlZmF1bHRcbiAgICBfaG92ZXI/LmhpZGUoKVxuICAgIF9kb3duPy5oaWRlKClcblxuICAgICMgQ3JlYXRlIGZha2UgaGl0IHRhcmdldCAoc28gd2UgZG9uJ3QgcmUtZmlyZSBldmVudHMpXG4gICAgaWYgX2hvdmVyIG9yIF9kb3duXG4gICAgICBoaXRUYXJnZXQgPSBuZXcgTGF5ZXJcbiAgICAgICAgYmFja2dyb3VuZDogJ3RyYW5zcGFyZW50J1xuICAgICAgICBmcmFtZTogX2RlZmF1bHQuZnJhbWVcblxuICAgICAgaGl0VGFyZ2V0LnN1cGVyTGF5ZXIgPSBsYXllclxuICAgICAgaGl0VGFyZ2V0LmJyaW5nVG9Gcm9udCgpXG5cbiAgICAjIFRoZXJlIGlzIGEgaG92ZXIgc3RhdGUsIHNvIGRlZmluZSBob3ZlciBldmVudHMgKG5vdCBmb3IgbW9iaWxlKVxuICAgIGlmIF9ob3ZlclxuICAgICAgbGF5ZXIuaG92ZXIgLT5cbiAgICAgICAgX2RlZmF1bHQuaGlkZSgpXG4gICAgICAgIF9ob3Zlci5zaG93KClcbiAgICAgICwgLT5cbiAgICAgICAgX2RlZmF1bHQuc2hvdygpXG4gICAgICAgIF9ob3Zlci5oaWRlKClcblxuICAgICMgVGhlcmUgaXMgYSBkb3duIHN0YXRlLCBzbyBkZWZpbmUgZG93biBldmVudHNcbiAgICBpZiBfZG93blxuICAgICAgbGF5ZXIub24gRXZlbnRzLlRvdWNoU3RhcnQsIC0+XG4gICAgICAgIF9kZWZhdWx0LmhpZGUoKVxuICAgICAgICBfaG92ZXI/LmhpZGUoKSAjIHRvdWNoIGRvd24gc3RhdGUgb3ZlcnJpZGVzIGhvdmVyIHN0YXRlXG4gICAgICAgIF9kb3duLnNob3coKVxuXG4gICAgICBsYXllci5vbiBFdmVudHMuVG91Y2hFbmQsIC0+XG4gICAgICAgIF9kb3duLmhpZGUoKVxuXG4gICAgICAgIGlmIF9ob3ZlclxuICAgICAgICAgICMgSWYgdGhlcmUgd2FzIGEgaG92ZXIgc3RhdGUsIGdvIGJhY2sgdG8gdGhlIGhvdmVyIHN0YXRlXG4gICAgICAgICAgX2hvdmVyLnNob3coKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgX2RlZmF1bHQuc2hvdygpXG5cblxuXy5leHRlbmQoZXhwb3J0cywgc2hvcnRjdXRzKVxuXG4iLCIjIEFkZCB0aGUgZm9sbG93aW5nIGxpbmUgdG8geW91ciBwcm9qZWN0IGluIEZyYW1lciBTdHVkaW8uIFxuIyBteU1vZHVsZSA9IHJlcXVpcmUgXCJteU1vZHVsZVwiXG4jIFJlZmVyZW5jZSB0aGUgY29udGVudHMgYnkgbmFtZSwgbGlrZSBteU1vZHVsZS5teUZ1bmN0aW9uKCkgb3IgbXlNb2R1bGUubXlWYXJcblxuZXhwb3J0cy5teVZhciA9IFwibXlWYXJpYWJsZVwiXG5cbmV4cG9ydHMubXlGdW5jdGlvbiA9IC0+XG5cdHByaW50IFwibXlGdW5jdGlvbiBpcyBydW5uaW5nXCJcblxuZXhwb3J0cy5teUFycmF5ID0gWzEsIDIsIDNdIiwiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFFQUE7QURJQSxPQUFPLENBQUMsS0FBUixHQUFnQjs7QUFFaEIsT0FBTyxDQUFDLFVBQVIsR0FB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
