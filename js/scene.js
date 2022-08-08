import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from './lil-gui.module.min.js';

let camera, scene, renderer, stats, mixer;

			const clock = new THREE.Clock();

			init();
			animate();

			function init() {

				renderer = new THREE.WebGLRenderer();
				const container = document.getElementById( 'canvas-container' );
				var w = container.offsetWidth;
				var h = container.offsetHeight;
				renderer.setSize(w, h);
				document.body.appendChild( container );

				//Add Camera
				camera = new THREE.PerspectiveCamera( 55, w / h, 10,1000 );
				camera.position.z = 300;

				scene = new THREE.Scene();
				scene.background = new THREE.Color( 0xFFFFFF );
			

				const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
				hemiLight.position.set( 0, 200, 0 );
				scene.add( hemiLight );

				const dirLight = new THREE.DirectionalLight( 0xffffff );
				dirLight.position.set( 0, 200, 100 );
				dirLight.castShadow = true;
				dirLight.shadow.camera.top = 180;
				dirLight.shadow.camera.bottom = - 100;
				dirLight.shadow.camera.left = - 120;
				dirLight.shadow.camera.right = 120;
				scene.add( dirLight );

				// scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

				// ground
				
			    const grid = new THREE.GridHelper( 200, 10, 0x000000, 0x000000 );
				grid.material.opacity = 0.5;
				grid.material.transparent = true;
				scene.add( grid );

				// model
				const loader = new FBXLoader();
				loader.load( '../idle.fbx', function ( object ) {

					mixer = new THREE.AnimationMixer( object );

					const action = mixer.clipAction( object.animations[ 0 ] );
					action.play();

					object.traverse( function ( child ) {

						if ( child.isMesh ) {

							child.castShadow = true;
							child.receiveShadow = true;

						}

					} );

					scene.add( object );

					

				} );

				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.shadowMap.enabled = true;
				container.appendChild( renderer.domElement );

				const controls = new OrbitControls( camera, renderer.domElement );
				controls.target.set( 0, 100, 0 );
				controls.update();

				window.addEventListener( 'resize', onWindowResize );

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			//

			function animate() {

				requestAnimationFrame( animate );

				const delta = clock.getDelta();

				if ( mixer ) mixer.update( delta );

				renderer.render( scene, camera );
			}