// these need to be seen by all demos
var demoGlobals = {
  keysdown: {},
  //cameraPos: new Vec3(-22.06, 0.00, -8.16),
  cameraPos: new Vec3(0, 0, 0),
  //cameraQuat: new Quat(-0.01, 0.32, 0.00, 0.95).unit(),
  cameraQuat: new Quat(),
  mouseX: 0,
  mouseY: 0,
  mouseZ: 0,
};

$(function () {
  'use strict';

  var element = document.getElementById('screenshow-container');
/*
  document.onmousedown = function (ev) {
    if (element.requestPointerLock) {
      element.requestPointerLock();
    } else if (element.webkitRequestPointerLock) {
      element.webkitRequestPointerLock();
    } else if (element.mozRequestPointerLock) {
      element.mozRequestPointerLock();
    }
    demoGlobals.pointerLock = true;
  };

  function pointerLockChange (ev) {
    console.info(ev);
  }

  document.addEventListener('pointerlockchange', pointerLockChange);

  document.onkeydown = function (ev) {
    // console.info(ev);
    demoGlobals.keysdown[ev.code] = true;
    if (ev.code === 'KeyEsc') {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      } else if (document.mozExitPointerLock) {
        document.mozExitPointerLock();
      } else if (document.webkitExitPointerLock) {
        document.webkitExitPointerLock();
      }
      demoGlobals.pointerLock = false;
    } else if (ev.code === 'KeyP') {
      demoGlobals.paused = !demoGlobals.paused;
    }
  };*/

  element.onmousemove = function (event) {
    if (!demoGlobals.pointerLock) {
      return;
    }
    demoGlobals.mouseX += event.movementX * 0.005;
    demoGlobals.mouseY += event.movementY * 0.005;
  };
  document.onkeyup = function (ev) {
    // console.info(ev);
    demoGlobals.keysdown[ev.code] = false;
  };
  document.onwheel = function (ev) {
    var delta = ev.deltaY;
    var mode = ev.deltaMode; // pixels, lines or pages
    if (mode === 0x00) {
      // pixels; this is what we want
    } else if (mode === 0x01) {
      delta *= 24; // lines; assume some line height and multiply
    } else if (mode === 0x02) {
      delta /= 8; // pages; does any browser do this?
    }
    demoGlobals.mouseZ -= delta;
    ev.preventDefault();
  };

  function updateCamera (dt) {
    // this should be part of each effect anyway...

    var motion = 25.0 * dt;
    var forward = 0, right = 0;
    var keysdown = demoGlobals.keysdown;
    if (keysdown.KeyW) { forward += motion; }
    if (keysdown.KeyS) { forward -= motion; }
    if (keysdown.KeyA) { right -= motion; }
    if (keysdown.KeyD) { right += motion; }
    // Rotate camera around vertical axis and then the horizontal
    // (which is still what we want after the first rotation).
    // This is basically an FPS camera.
    var cameraRotation = Mat44.rotate(demoGlobals.mouseX, new Vec3(0, 1, 0));
    cameraRotation = cameraRotation.mul(Mat44.rotate(demoGlobals.mouseY, new Vec3(1, 0, 0)));
    var cameraMotion = cameraRotation.transpose().mulVec3(new Vec3(right, 0, -forward));
    demoGlobals.cameraRotation = cameraRotation;

    /*
    var cameraQuat = Quat.fromAngleAxis(demoGlobals.mouseX, new Vec3(0, 1, 0));
    cameraQuat = Quat.fromAngleAxis(demoGlobals.mouseY, new Vec3(1, 0, 0)).mul(cameraQuat);
    demoGlobals.cameraQuat = cameraQuat;*/

    demoGlobals.cameraPos = demoGlobals.cameraPos.add(cameraMotion);
    demoGlobals.cameraTransform = Mat44.translate(demoGlobals.cameraPos.flip()).mul(cameraRotation);
  } // */

  function updateAspect () {
    demoGlobals.aspect = window.innerWidth / window.innerHeight;
  }
  window.addEventListener('resize', function (ev) {
    updateAspect();
  });
  updateAspect();
  console.info('aspect: ' + demoGlobals.aspect);

  var lastTime = window.performance.now();
  var NUM_FRAMETIMES = 5;
  var frametimes = new Int32Array(NUM_FRAMETIMES);
  var nextFrametime = 0;
  var sumFrametimes = 0;
  var lastUpdate = 0;
  var lowestFrametime = 9000;
  var highestFrametime = 0;
  var numFrames = 0;

  var placeholder = document.getElementById('jmpress');
  var domFrametime = document.createElement('div');
  var domFrametimeRange = document.createElement('div');
  var domCameraPos = document.createElement('div');
  var domCameraQuat = document.createElement('div');
  // placeholder.innerHTML = "";
  /*
  placeholder.appendChild(domFrametime);
  domFrametime.setAttribute('style', 'font-size: 24px');
  placeholder.appendChild(domFrametimeRange);
  domFrametimeRange.setAttribute('style', 'font-size: 20px');
  placeholder.appendChild(domCameraPos);
  domCameraPos.setAttribute('style', 'font-size: 20px');
  placeholder.appendChild(domCameraQuat);
  domCameraQuat.setAttribute('style', 'font-size: 20px');
  */

  var USE_SYNC = true; // set to false for benchmarking

  function fmtMs (num) { return num.toFixed(1); }

  function getWorstFrametime () {
    var worst = 0;
    frametimes.forEach(function (val) {
      if (val > worst) {
        worst = val;
      }
    });
    return worst;
  }
  function getBestFrametime () {
    var best = 90000;
    frametimes.forEach(function (val) {
      if (val < best) {
        best = val;
      }
    });
    return best;
  }

  function runDemo (time) {
    if (USE_SYNC) {
      window.requestAnimationFrame(runDemo);
    } else {
      window.setTimeout(function () {
        runDemo(window.performance.now());
      }, 0);
    }

    var millis = time - lastTime;
    lastTime = time;

    if (millis > highestFrametime && numFrames > 0) {
      highestFrametime = millis;
    }
    if (millis < lowestFrametime && numFrames > 0) {
      lowestFrametime = millis;
    }

    sumFrametimes -= frametimes[nextFrametime];
    frametimes[nextFrametime] = millis;
    sumFrametimes += frametimes[nextFrametime];
    nextFrametime = (nextFrametime + 1) % NUM_FRAMETIMES;

    function fmtFloat(f) {
      return f.toFixed(2);
    }
    function fmtFloatArray(a) {
      for(var i=0; i<a.length; i++) {
        a[i] = fmtFloat(a[i]);
      }
      return a;
    }
    function fmtVec3 (v) {
      return '(' + fmtFloatArray([v.x, v.y, v.z]).join(', ') + ')';
    }
    function fmtQuat (q) {
      return '(' + fmtFloatArray([q.x, q.y, q.z, q.w]).join(', ') + ')';
    }

    if (time - lastUpdate > 1000) {
      domFrametime.innerHTML = '' + fmtMs(sumFrametimes / NUM_FRAMETIMES) + ' ms';
      domFrametimeRange.innerHTML = '' + getBestFrametime() + ' - ' + getWorstFrametime();
      domCameraPos.innerHTML = fmtVec3(demoGlobals.cameraPos);
      domCameraQuat.innerHTML = fmtQuat(demoGlobals.cameraQuat);
      lastUpdate = time;
    }

    var dt = (sumFrametimes / NUM_FRAMETIMES) / 1000;
    if (dt > 1.0) {
      dt = 1.0;
    }

    updateCamera(dt);
    screenshowEffects.run(dt, demoGlobals);
    numFrames++;
  }
  runDemo(lastTime);

});
