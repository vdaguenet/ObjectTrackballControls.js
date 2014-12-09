Object Trackball Controls
=========================
Custom version of Three.js [TrackballControls.js](https://github.com/mrdoob/three.js/blob/master/examples/js/controls/TrackballControls.js).

It allows you to move only one object of your scene and zoom/pan with the camera

# Usage
```js
controls = new THREE.ObjectTrackballControls( object, camera, domElement );
```

See [example](./example) to usage precisions.

# API
* `enabled`: Enable controls. Default is `true`.
* `moveCamera`: Moe camera instead of object (equivalent as using classic TrackballControls). Default is `false`.
* `rotateSpeed`: Rotation speed factor.
* `zoomSpeed`: Zoom speed factor.
* `panSpeed`: Pan speed factor.
* `noRotate`: Disable rotation. Default is `false`.
* `noZoom`: Disable camera zoom. Default is `false`.
* `noPan`: Disable camera paning. Default is `false`.
* `noRoll`: Disable rolling effect. Default is `false`.
* `staticMoving`: Disable inertia effect. Default is `false`.
* `dynamicCameraDampingFactor`: Factor of camera inertia. Used when `moveCamera` is set to `true`
* `dynamicObjectDampingFactor`: Factor of object inertia. Used when `moveCamera` is set to `false`
* `minDistance`: Minimal distance the camera can reach while zoom.
* `maxDistance`: Maximal distance the camera can reach while zoom.