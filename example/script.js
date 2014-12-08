var scene, camera, renderer, controls;
var cube;

(function () {
    init();
    render();
})();

function init () {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 50;
    camera.position.z = 600;


    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xececec, 1);
    renderer.setSize( window.innerWidth, window.innerHeight );
    var el =  document.getElementById('render');
    el.appendChild( renderer.domElement );

    var boxGeometry = new THREE.BoxGeometry(100, 100, 100);
    var cubeMaterial = new THREE.MeshNormalMaterial();
    cube = new THREE.Mesh(boxGeometry, cubeMaterial);
    cube.position.y = 100;
    scene.add(cube);

    var planeGeometry = new THREE.PlaneGeometry(100, 100);
    planeGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    var planeMaterial = new THREE.MeshBasicMaterial(
    {
        color: 0xe0e0e0
    });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);

    var light = new THREE.AmbientLight( 0x404040 );
    scene.add( light );
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(300, 300, 300);
    spotLight.intensity = 1;
    scene.add(spotLight);

    controls = new THREE.ObjectTrackballControls( cube, camera, el );
}

function render() {
    requestAnimationFrame( render );

    controls.update();
    renderer.render( scene, camera );
}