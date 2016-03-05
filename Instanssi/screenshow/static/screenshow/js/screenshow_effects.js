(function (global) {
  'use strict';
  /**
   * Initializes a screenshow effects manager with given settings.
   *
   * @param screenProps Important settings like: {
   *   canvasNear: canvas-id
   *   canvasFar:  canvas-id
   * }
   */
  function ScreenshowEffects (screenProps) {
    function getGLContext (canvas) {
      return canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }
    // TODO: Should we use the same canvas(es) for every effect?
    // If setting up a GL context is cheap enough we could just rebuild
    // them between effects to avoid GL state issues.
    // (or we could stomp the GL states as hard as possible between them)
    var canvasNear = document.getElementById(screenProps.canvasNear);
    var canvasFar = document.getElementById(screenProps.canvasFar);

    // quarter-HD resolution (aka nHD)
    /*
    canvasNear.width = 640;
    canvasNear.height = 360;
    canvasFar.width = 640;
    canvasFar.height = 360;
    */

    canvasNear.width = 1280;
    canvasNear.height = 720;
    canvasFar.width = 1280;
    canvasFar.height = 720;

    var glNear = getGLContext(canvasNear);
    var glFar = getGLContext(canvasFar);

    var effects = {}; // holds currently registered effects
    var currentEffect;
    var effectQueue = [];

    var resPath = screenProps.resourcePath || '';

    /**
     * Loads texture, shader and general data resources from given URLs.
     * When finished in any sense, calls the given callback with an object
     * holding any successfully fetched resources.
     *
     * Note that due to GL canvas limitations, shaders are not automatically
     * compiled at this stage, nor are images converted into textures.
     */
    function loadResources (resourceMap, callback, who) {
      /* resourcemap is like: {
          shaders = { name_0: { vertex: url_a, fragment: url_b }},
          textures = { tex0: tex0url, tex1: tex1url },
          data =
      }
      */
      var images = resourceMap.images || {};
      var strings = resourceMap.strings || {};

      var holder = {
        images: {},
        strings: {},
      };

      var pendingResources = 1; // 1 to avoid finishing early

      function onResourceLoad (success, type, name) {
        pendingResources--;
        if (success) {
          console.info(who + ' : loaded ' + type + ': ' + name);
        } else if (name) {
          console.error(who + ' : failed to load ' + type + ': ' + name);
        }
        if (pendingResources === 0) {
          callback(true, holder);
        }
      }

      // initiate image loading for every registered image.
      for (var name in images) {
        if (images.hasOwnProperty(name)) {
          // Force a new scope so we can capture key properly.
          // If we don't do this (or use the ES6 "let" keyword),
          // "key" is not captured from inside the loop, but
          // outside it, which is too broad.
          (function (key) {
            pendingResources++;
            var img = new Image();
            img.onload = function () {
              holder.images[key] = img;
              onResourceLoad(true, 'image', key);
            };
            img.onerror = function () {
              // can we provide a dummy resource?
              onResourceLoad(false, 'image', key);
            };
            img.src = resPath + images[key];
          })(name);
        }
      }
      // load strings via async requests
      for (var name in strings) {
        if (strings.hasOwnProperty(name)) {
          (function (key) {
            pendingResources++;
            var req = new XMLHttpRequest();
            req.addEventListener('load', function () {
              // "this" is the request here.
              // req.response is the full body of the response, which
              // may be text, XML, JSON, blob or arraybuffer content.
              holder.strings[key] = req.response;
              onResourceLoad(true, 'string', key);
            });
            req.addEventListener('error', function () {
              onResourceLoad(false, 'string', key);
            });
            req.overrideMimeType('text\/plain; charset=x-user-defined');
            req.open('GET', resPath + strings[key]);
            req.send();
          })(name);
        }
      }
      // trigger the is-finished check once and clear the dummy resource
      onResourceLoad();
    }

    /**
     * Registers an effect for the screenshow.
     *
     * Props should be like: {
     *   name: "effect-name",
     *   author: "author-name",
     *   resourceMap: {
     *     images: {
     *       img0: "image-url",
     *     },
     *     strings: {
     *       data0: "string-url"
     *     }
     *   },
     *   constructor: function(loadStatus, resources, canvas, near, far) -> {
     *                  run(dt, globalState)
     *                }
     * }
     */
    function register (props) {
      var name = props.name;
      var author = props.author;
      var constructor = props.constructor;
      var resourceMap = props.resources || {};
      var onResourcesLoaded = props.onResourcesLoaded;

      if (typeof name != 'string') {
        console.error('Screenshow demo must have a name!');
        return;
      }
      if (typeof author != 'string') {
        console.error('Screenshow demo must name its author!');
        return;
      }
      if (typeof constructor != 'function') {
        console.error('Screenshow demo must have a constructor');
        return;
      }

      var canonicalName = name + '-' + author;

      // we don't want to kill the entire JS with one bad entry
      try {
        loadResources(resourceMap, function (status, loaded) {
          if (typeof onResourcesLoaded == 'function') {
            onResourcesLoaded(status, loaded);
          }
          var effect = {
            back: constructor(canvasFar, glFar, loaded),
            front: constructor(canvasNear, glNear, loaded)
          };
          effects[canonicalName] = effect;
          effectQueue.push(effect);
          if (!currentEffect) {
            currentEffect = effect;
          }
        }, name);
      } catch(e) {
        console.error('Failed to load demo: ' + canonicalName + ' : ' + e);
        throw e;
      }
    }

    /**
     * Cycles smoothly between effects.
     */
    function cycle () {
      // initiate current-effect transition
      // first fade out the canvases
      // then change the currentEffect, popping the front effect
      // and inserting it in the queue back
      // then fade them back in
    }

    /**
     * Tells the current demo to render itself again.
     */
    function run (dt, demoGlobals) {
      // TODO: Handlers!
      //
      // When the currently visible screenshow page has changed,
      // see if the effects have handlers for screenshow-change and
      // pass at least the name of the page to them if they do.
      // - This should let the effects respond to the screenshow.
      // - When the Instanssi logo shows up, do something awesome.
      //
      // Report any possible sensor data to the effects;
      // sound levels, frequency-space/volume data, light levels,
      // network access, etc.
      // - Make 1s and 0s fly around with network traffic?
      //
      // Ideally, this should be like a living, breathing participant in the
      // festival of digital culture and stuff, aka Instanssi.

      // TODO: Fading transitions
      //

      // TODO: State reset on effect change (check out that github project)
      // - It's kind of important if we want live effect uploads.
      // - Or, just re-context the canvas and save resources too.

      // since we want this to run continuously, could we just handle
      // transitions here? need some state to track where we are going,
      // but it's not much of a state machine tbh
      if (currentEffect) {
        currentEffect.back(dt, false, demoGlobals);
        currentEffect.front(dt, true, demoGlobals);
      }
    }

    return {
      register: register,
      cycle: cycle,
      run: run
    };
  }

  global.ScreenshowEffects = ScreenshowEffects;
})(this);
