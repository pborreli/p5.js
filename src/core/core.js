/**
 * @module Structure
 * @submodule Structure
 * @for p5
 * @requires constants
 */
define(function (require) {

  'use strict';

  require('shim');

  // Core needs the PVariables object
  // TODO: ???
  var constants = require('constants');

  /**
   * This is the p5 instance constructor.
   *
   * A p5 instance holds all the properties and methods related to
   * a p5 sketch.  It expects an incoming sketch closure with optional
   * preload(), setup() and draw() properties to attach to this p5
   * instance for running a sketch.  It can also take an optional node
   * parameter for attaching the generated p5 canvas to a node.
   *
   * A p5 sketch can run in "global" or "instance" mode:
   * "global"   - all properties and methods are attached to the window
   * "instance" - all properties and methods are bound to this p5 object
   *
   * @param  {Function}    sketch a closure with optional preload(), setup()
  *                               and draw() properties
   * @param  {HTMLElement} node   an element to attach the generated canvas to
   * @return {p5}                 a p5 instance
   */
  var p5 = function(sketch, node) {

    //////////////////////////////////////////////
    // PUBLIC p5 PROPERTIES AND METHODS
    //////////////////////////////////////////////


    /**
     * Called directly before setup(), the preload() function is used to handle
     * asynchronous loading of external files. If a preload function is
     * defined, setup() will wait until any load calls within have finished.
     * Nothing besides load calls should be inside preload (loadImage,
     * loadJSON, loadStrings, etc).
     *
     * @method preload
     * @example
     * <div><code>
     * var img;
     * var c;
     * function preload() {  // preload() runs once
     *   img = loadImage('assets/laDefense.jpg');
     *   noLoop();
     * }
     * function setup() {  // setup() waits until preload() is done
     *   img.loadPixels();
     *   // get color of middle pixel
     *   c = img.get(img.width/2, img.height/2);
     * }
     * function draw() {
     *   background(c);
     *   image(img, 25, 25, 50, 50);
     * }
     * </code></div>
     */

    /**
     * The setup() function is called once when the program starts. It's used to
     * define initial enviroment properties such as screen size and background
     * color and to load media such as images and fonts as the program starts.
     * There can only be one setup() function for each program and it shouldn't
     * be called again after its initial execution. Note: Variables declared
     * within setup() are not accessible within other functions, including
     * draw().
     *
     * @method setup
     * @example
     * <div><code>
     * var a = 0;
     *
     * function setup() {
     *   background(0);
     *   noStroke();
     *   fill(102);
     * }
     *
     * function draw() {
     *   rect(a++%width, 10, 2, 80); 
     * }
     * </code></div>
     */

    /**
     * Called directly after setup(), the draw() function continuously executes
     * the lines of code contained inside its block until the program is stopped
     * or noLoop() is called. draw() is called automatically and should never be
     * called explicitly.
     *
     * It should always be controlled with noLoop(), redraw() and loop(). After
     * noLoop() stops the code in draw() from executing, redraw() causes the
     * code inside draw() to execute once, and loop() will cause the code
     * inside draw() to resume executing continuously.
     * 
     * The number of times draw() executes in each second may be controlled with
     * the frameRate() function.
     * 
     * There can only be one draw() function for each sketch, and draw() must
     * exist if you want the code to run continuously, or to process events such
     * as mousePressed(). Sometimes, you might have an empty call to draw() in
     * your program, as shown in the above example.
     *
     * @method draw
     * @example
     * <div><code>
     * var yPos = 0;
     * function setup() {  // setup() runs once
     *   frameRate(30);
     * }
     * function draw() {  // draw() loops forever, until stopped
     *   background(204);
     *   yPos = yPos - 1;
     *   if (yPos < 0) {
     *     yPos = height;
     *   }
     *   line(0, yPos, width, yPos);
     * }
     * </code></div>
     */

    
    //////////////////////////////////////////////
    // PRIVATE p5 PROPERTIES AND METHODS
    //////////////////////////////////////////////

    this._setupDone = false;
    this._pixelDensity = window.devicePixelRatio || 1; // for handling hidpi
    this._startTime = new Date().getTime();
    this._userNode = node;
    this._curElement = null;
    this._elements = [];
    this._preloadCount = 0;
    this._updateInterval = 0;
    this._isGlobal = false;
    this._loop = true;
    this.styles = [];
    this._defaultCanvasSize = {
      width: 100,
      height: 100
    };
    this._events = { // keep track of user-events for unregistering later
      'mousemove': null,
      'mousedown': null,
      'mouseup': null,
      'click': null,
      'mousewheel': null,
      'mouseover': null,
      'mouseout': null,
      'keydown': null,
      'keyup': null,
      'keypress': null,
      'touchstart': null,
      'touchmove': null,
      'touchend': null
    };

    this._start = function () {
      // Find node if id given
      if (this._userNode) {
        if (typeof this._userNode === 'string') {
          this._userNode = document.getElementById(this._userNode);
        }
      }

      // Always create a default canvas.
      // Later on if the user calls createCanvas, this default one
      // will be replaced
      this.createCanvas(
        this._defaultCanvasSize.width,
        this._defaultCanvasSize.height,
        true
      );

      var userPreload = this.preload || window.preload; // look for "preload"
      var context = this._isGlobal ? window : this;
      if (userPreload) {
        this._preloadFuncs.forEach(function(f) {
          context[f] = function(path) {
            return context._preload(f, path);
          };
        });
        userPreload();
        if (this._preloadCount === 0) {
          this._setup();
          this._runFrames();
          this._draw();
        }
      } else {
        this._setup();
        this._runFrames();
        this._draw();
      }
    }.bind(this);

    this._preload = function (func, path) {
      var context = this._isGlobal ? window : this;
      context._setProperty('_preloadCount', context._preloadCount + 1);
      return p5.prototype[func].call(context, path, function (resp) {
        context._setProperty('_preloadCount', context._preloadCount - 1);
        if (context._preloadCount === 0) {
          context._setup();
          context._runFrames();
          context._draw();
        }
      });
    }.bind(this);

    this._setup = function() {

      // return preload functions to their normal vals if switched by preload
      var context = this._isGlobal ? window : this;
      if (typeof context.preload === 'function') {
        this._preloadFuncs.forEach(function (f) {
          context[f] = p5.prototype[f];
        });
      }

      // Short-circuit on this, in case someone used the library in "global"
      // mode earlier
      if (typeof context.setup === 'function') {
        context.setup();
      }

      // unhide any hidden canvases that were created
      var reg = new RegExp(/(^|\s)p5_hidden(?!\S)/g);
      var canvases = document.getElementsByClassName('p5_hidden');
      for (var i = 0; i < canvases.length; i++) {
        var k = canvases[i];
        k.style.visibility = '';
        k.className = k.className.replace(reg, '');
      }
      this._setupDone = true;
    }.bind(this);

    this._draw = function () {
      var userSetup = this.setup || window.setup;
      var now = new Date().getTime();
      this._frameRate = 1000.0/(now - this._lastFrameTime);
      this._lastFrameTime = now;

      var userDraw = this.draw || window.draw;

      if (this._loop) {
        if (this._drawInterval) {
          clearInterval(this._drawInterval);
        }
        this._drawInterval = setTimeout(function() {
          window.requestDraw(this._draw.bind(this));
        }.bind(this), 1000 / this._targetFrameRate);
      }
      // call user's draw
      if (typeof userDraw === 'function') {
        this.push();
        if (typeof userSetup === 'undefined') {
          this.scale(this._pixelDensity, this._pixelDensity);
        }
        userDraw();
        this.pop();
      }
    }.bind(this);

    this._runFrames = function() {
      if (this._updateInterval) {
        clearInterval(this._updateInterval);
      }
      this._updateInterval = setInterval(function(){
        this._setProperty('frameCount', this.frameCount + 1);
      }.bind(this), 1000/this._targetFrameRate);
    }.bind(this);

    this._setProperty = function(prop, value) {
      this[prop] = value;
      if (this._isGlobal) {
        window[prop] = value;
      }
    }.bind(this);

    /**
     * @method remove
     */
    this.remove = function() {
      if (this._curElement) {

        // stop draw
        this._loop = false;
        if (this._drawInterval) {
          clearTimeout(this._drawInterval);
        }
        if (this._updateInterval) {
          clearTimeout(this._updateInterval);
        }

        // unregister events sketch-wide
        for (var ev in this._events) {
          window.removeEventListener(ev, this._events[ev]);
        }

        // remove DOM elements created by p5, and listeners
        for (var i=0; i<this._elements.length; i++) {
          var e = this._elements[i];
          if (e.elt.parentNode) {
            e.elt.parentNode.removeChild(e.elt);
          }
          for (var elt_ev in e._events) {
            e.elt.removeEventListener(elt_ev, e._events[elt_ev]);
          }
        }

        // call any registered remove functions
        var self = this;
        this._removeFuncs.forEach(function(f) {
          self[f]();
        });

        // remove window bound properties and methods
        if (this._isGlobal) {
          for (var p in p5.prototype) {
            delete(window[p]);
          }
          for (var p2 in this) {
            if (this.hasOwnProperty(p2)) {
              delete(window[p2]);
            }
          }
        }
      }
    };


    // attach constants to p5 instance
    for (var k in constants) {
      p5.prototype[k] = constants[k];
    }

    // If the user has created a global setup or draw function,
    // assume "global" mode and make everything global (i.e. on the window)
    if (!sketch) {
      this._isGlobal = true;
      // Loop through methods on the prototype and attach them to the window
      for (var p in p5.prototype) {
        if(typeof p5.prototype[p] === 'function') {
          var ev = p.substring(2);
          if (!this._events.hasOwnProperty(ev)) {
            window[p] = p5.prototype[p].bind(this);
          }
        } else {
          window[p] = p5.prototype[p];
        }
      }
      // Attach its properties to the window
      for (var p2 in this) {
        if (this.hasOwnProperty(p2)) {
          window[p2] = this[p2];
        }
      }
      
    } else {
      // Else, the user has passed in a sketch function closure
      // So attach the user given 'setup', 'draw', etc on this
      // instance of p5
      sketch(this);
    }

    // Bind events to window (not using container div bc key events don't work)
    for (var e in this._events) {
      var f = this['on'+e];
      if (f) {
        var m = f.bind(this);
        window.addEventListener(e, m);
        this._events[e] = m;
      }
    }

    var self = this;
    window.addEventListener('focus', function() {
      self._setProperty('focused', true);
    });

    window.addEventListener('blur', function() {
      self._setProperty('focused', false);
    });

    // TODO: ???
    if (document.readyState === 'complete') {
      this._start();
    } else {
      window.addEventListener('load', this._start.bind(this), false);
    }

  };


  // functions that cause preload to wait
  // more can be added by using _registerPreloadFunc(func)
  p5.prototype._preloadFuncs = [
    'loadJSON',
    'loadImage',
    'loadStrings',
    'loadXML',
    'loadShape',
    'loadTable'
  ];

  p5.prototype._removeFuncs = [];

  p5.prototype._registerPreloadFunc = function (func) {
    p5.prototype._preloadFuncs.push(func);
  }.bind(this);

  p5.prototype._registerRemoveFunc = function(func) {
    p5.prototype._removeFuncs.push(func);
  }.bind(this);

  return p5;

});