/**
 * A modified version of the TrackballControls.js control for Three.js from mrdoob's Three.js examples.
 * It allows to move only one object of your scene and zoom with the camera
 */
THREE.ObjectTrackballControls = function ( camera, object, domElement ) {

    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

    this.camera = camera;
    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };
    this.onlyMoveObject = true;

    this.rotateSpeed = 0.08;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;
    this.noRoll = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;
    this.dynamicObjectDampingFactor = 0.1;

    this.fadeDampingFactor = 0.01;

    this.minDistance = 240;
    this.maxDistance = 10000;

    // internals

    this.target = new THREE.Vector3();

    var EPS = 0.000001;

    var lastCameraPosition = new THREE.Vector3();
    var lastObjectPosition = new THREE.Vector3();

    var _state = STATE.NONE,
    _prevState = STATE.NONE,

    _eye = new THREE.Vector3(),

    _rotateStart = new THREE.Vector3(),
    _rotateEnd = new THREE.Vector3(),

    _zoomStart = new THREE.Vector2(),
    _zoomEnd = new THREE.Vector2(),

    _touchZoomDistanceStart = 0,
    _touchZoomDistanceEnd = 0,

    _panStart = new THREE.Vector2(),
    _panEnd = new THREE.Vector2();

    // for reset

    this.target0 = this.target.clone();
    this.objectPosition0 = this.object.position.clone();
    this.objectUp0 = this.object.up.clone();
    this.cameraPosition0 = this.camera.position.clone();
    this.cameraUp0 = this.camera.up.clone();

    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};


    // methods

    this.handleResize = function () {

        this.screen.left = 0;
        this.screen.top = 0;
        this.screen.width = window.innerWidth;
        this.screen.height = window.innerHeight;

    };

    this.handleEvent = function ( event ) {

        if ( typeof this[ event.type ] == 'function' ) {

            this[ event.type ]( event );

        }

    };

    var getMouseOnScreen = ( function () {

        var vector = new THREE.Vector2();

        return function ( pageX, pageY ) {

            vector.set(
                ( pageX - _this.screen.left ) / _this.screen.width,
                ( pageY - _this.screen.top ) / _this.screen.height
            );

            return vector;

        };

    }() );

    var getMouseProjectionOnBall = ( function () {

        var vector = new THREE.Vector3();
        var objectUp = new THREE.Vector3();
        var mouseOnBall = new THREE.Vector3();

        return function ( pageX, pageY ) {

            mouseOnBall.set(
                ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / (_this.screen.width*.5),
                ( _this.screen.height * 0.5 + _this.screen.top - pageY ) / (_this.screen.height*.5),
                0.0
            );

            var length = mouseOnBall.length();

            if ( _this.noRoll ) {

                if ( length < Math.SQRT1_2 ) {

                    mouseOnBall.z = Math.sqrt( 1.0 - length*length );

                } else {

                    mouseOnBall.z = .5 / length;

                }

            } else if ( length > 1.0 ) {

                mouseOnBall.normalize();

            } else {

                mouseOnBall.z = Math.sqrt( 1.0 - length * length );

            }

            return mouseOnBall;

            // _eye.copy( _this.object.position ).sub( _this.target );

            // vector.copy( _this.object.up ).setLength( mouseOnBall.y )
            // vector.add( objectUp.copy( _this.object.up ).cross( _eye ).setLength( mouseOnBall.x ) );
            // vector.add( _eye.setLength( mouseOnBall.z ) );

            // return vector;


        };

    }() );

    this.rotateCamera = (function(){

        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion();


        return function () {

            var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

            if ( angle ) {

                axis.crossVectors( _rotateStart, _rotateEnd ).normalize();

                angle *= _this.rotateSpeed;

                quaternion.setFromAxisAngle( axis, -angle );

                _eye.applyQuaternion( quaternion );
                _this.camera.up.applyQuaternion( quaternion );

                _rotateEnd.applyQuaternion( quaternion );

                if ( _this.staticMoving ) {

                    _rotateStart.copy( _rotateEnd );

                } else {

                    quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
                    _rotateStart.applyQuaternion( quaternion );

                }

            }
        };

    }());

    this.rotateObject = (function(){

        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion();


        return function () {

            var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

            if ( angle ) {

                axis.crossVectors( _rotateStart, _rotateEnd ).normalize();
                angle *= _this.rotateSpeed;
                quaternion.setFromAxisAngle( axis, angle );

                curQuaternion = _this.object.quaternion;
                curQuaternion.multiplyQuaternions(quaternion, curQuaternion);
                curQuaternion.normalize();

                _this.object.setRotationFromQuaternion(curQuaternion);

                _rotateEnd.x += ( _rotateStart.x - _rotateEnd.x ) * _this.dynamicObjectDampingFactor;
                _rotateEnd.y += ( _rotateStart.y - _rotateEnd.y ) * _this.dynamicObjectDampingFactor;
                _rotateEnd.z += ( _rotateStart.z - _rotateEnd.z ) * _this.dynamicObjectDampingFactor;

            }
        };

    }());

    this.zoomCamera = function () {

        if ( _state === STATE.TOUCH_ZOOM_PAN ) {

            var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
            _eye.multiplyScalar( factor );

        } else {

            var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( factor !== 1.0 && factor > 0.0 ) {

                _eye.multiplyScalar( factor );

                if ( _this.staticMoving ) {

                    _zoomStart.copy( _zoomEnd );

                } else {

                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

                }

            }

        }

    };

    this.panCamera = (function(){

        var mouseChange = new THREE.Vector2(),
            cameraUp = new THREE.Vector3(),
            pan = new THREE.Vector3();

        return function () {

            mouseChange.copy( _panEnd ).sub( _panStart );

            if ( mouseChange.lengthSq() ) {

                mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

                pan.copy( _eye ).cross( _this.camera.up ).setLength( mouseChange.x );
                pan.add( cameraUp.copy( _this.camera.up ).setLength( mouseChange.y ) );

                _this.camera.position.add( pan );
                _this.target.add( pan );

                if ( _this.staticMoving ) {

                    _panStart.copy( _panEnd );

                } else {

                    _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

                }

            }
        }

    }());

    this.checkDistances = function () {

        if ( !_this.noZoom || !_this.noPan ) {

            if ( _eye.lengthSq() > _this.maxDistance * _this.maxDistance ) {

                _this.camera.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );

            }

            if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

                _this.camera.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );

            }

        }

    };

    this.update = function () {

        _eye.subVectors( _this.camera.position, _this.target );

        if ( !_this.noRotate ) {

            // _this.rotateCamera();
            _this.rotateObject();

        }

        if ( !_this.noZoom ) {

            _this.zoomCamera();

        }

        if ( !_this.noPan ) {

            _this.panCamera();

        }


        _this.checkDistances();

        _this.camera.lookAt( _this.target );
        _this.camera.position.addVectors( _this.target, _eye );

        if ( lastCameraPosition.distanceToSquared( _this.camera.position ) > EPS ) {

            _this.dispatchEvent( changeEvent );

            lastCameraPosition.copy( _this.camera.position );

        }

        if ( lastObjectPosition.distanceToSquared( _this.object.position ) > EPS ) {

            _this.dispatchEvent( changeEvent );

            lastObjectPosition.copy( _this.object.position );

        }

    };

    this.reset = function () {

        _state = STATE.NONE;
        _prevState = STATE.NONE;

        _this.target.copy( _this.target0 );
        _this.object.position.copy( _this.objectPosition0 );
        _this.object.up.copy( _this.objectUp0 );
        _this.camera.position.copy( _this.cameraPosition0 );
        _this.camera.up.copy( _this.cameraUp0 );

        _eye.subVectors( _this.camera.position, _this.target );

        _this.camera.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );

        lastCameraPosition.copy( _this.camera.position );
        lastObjectPosition.copy( _this.object.position );

    };

    this.resetWithFade = function () {

        _this.target.x += (_this.target0.x - _this.target.x) * _this.fadeDampingFactor;
        _this.target.y += (_this.target0.y - _this.target.y) * _this.fadeDampingFactor;
        _this.target.z += (_this.target0.z - _this.target.z) * _this.fadeDampingFactor;

        _this.object.position.x += (_this.objectPosition0.x - _this.object.position.x) * _this.fadeDampingFactor;
        _this.object.position.y += (_this.objectPosition0.y - _this.object.position.y) * _this.fadeDampingFactor;
        _this.object.position.z += (_this.objectPosition0.z - _this.object.position.z) * _this.fadeDampingFactor;

        _this.object.up.x += (_this.objectUp0.x - _this.object.up.x) * _this.fadeDampingFactor;
        _this.object.up.y += (_this.objectUp0.y - _this.object.up.y) * _this.fadeDampingFactor;
        _this.object.up.z += (_this.objectUp0.z - _this.object.up.z) * _this.fadeDampingFactor;

        _this.camera.position.x += (_this.cameraPosition0.x - _this.camera.position.x) * _this.fadeDampingFactor;
        _this.camera.position.y += (_this.cameraPosition0.y - _this.camera.position.y) * _this.fadeDampingFactor;
        _this.camera.position.z += (_this.cameraPosition0.z - _this.camera.position.z) * _this.fadeDampingFactor;

        _this.camera.up.x += (_this.cameraUp0.x - _this.camera.up.x) * _this.fadeDampingFactor;
        _this.camera.up.y += (_this.cameraUp0.y - _this.camera.up.y) * _this.fadeDampingFactor;
        _this.camera.up.z += (_this.cameraUp0.z - _this.camera.up.z) * _this.fadeDampingFactor;

        _eye.subVectors( _this.camera.position, _this.target );

        _this.camera.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );

        lastCameraPosition.copy( _this.camera.position );
        lastObjectPosition.copy( _this.object.position );

        _state = STATE.NONE;
        _prevState = STATE.NONE;
    };

    function mousedown( event ) {

        if ( _this.enabled === false ) return;

        // event.preventDefault();
        // event.stopPropagation();

        if ( _state === STATE.NONE ) {

            _state = event.button;

        }

        if ( _state === STATE.ROTATE && !_this.noRotate ) {

            _rotateStart.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
            _rotateEnd.copy( _rotateStart );

        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

            _zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _zoomEnd.copy(_zoomStart);

        } else if ( _state === STATE.PAN && !_this.noPan ) {

            _panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _panEnd.copy(_panStart);

        }

        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );

        _this.dispatchEvent( startEvent );

    }

    function mousemove( event ) {

        if ( _this.enabled === false ) return;

        // event.preventDefault();
        // event.stopPropagation();

        if ( _state === STATE.ROTATE && !_this.noRotate ) {

            _rotateEnd.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );

        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

            _zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        } else if ( _state === STATE.PAN && !_this.noPan ) {

            _panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        }

    }

    function mouseup( event ) {

        if ( _this.enabled === false ) return;

        // event.preventDefault();
        // event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );
        _this.dispatchEvent( endEvent );

    }

    function mousewheel( event ) {

        if ( _this.enabled === false ) return;

        // event.preventDefault();
        // event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta / 40;

        } else if ( event.detail ) { // Firefox

            delta = - event.detail / 3;

        }

        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );

    }

    function touchstart( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _state = STATE.TOUCH_ROTATE;
                _rotateStart.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateEnd.copy( _rotateStart );
                break;

            case 2:
                _state = STATE.TOUCH_ZOOM_PAN;
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panStart.copy( getMouseOnScreen( x, y ) );
                _panEnd.copy( _panStart );
                break;

            default:
                _state = STATE.NONE;

        }
        _this.dispatchEvent( startEvent );


    }

    function touchmove( event ) {

        if ( _this.enabled === false ) return;

        // event.preventDefault();
        // event.stopPropagation();

        switch ( event.touches.length ) {

            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                break;

            case 2:
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                break;

            default:
                _state = STATE.NONE;

        }

    }

    function touchend( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateStart.copy( _rotateEnd );
                break;

            case 2:
                _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                _panStart.copy( _panEnd );
                break;

        }

        _state = STATE.NONE;
        _this.dispatchEvent( endEvent );

    }

    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
    this.domElement.addEventListener( 'mousedown', mousedown, false );

    this.domElement.addEventListener( 'mousewheel', mousewheel, false );
    this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

    this.domElement.addEventListener( 'touchstart', touchstart, false );
    this.domElement.addEventListener( 'touchend', touchend, false );
    this.domElement.addEventListener( 'touchmove', touchmove, false );

    this.handleResize();

    // force an update at start
    this.update();

};

THREE.ObjectTrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );