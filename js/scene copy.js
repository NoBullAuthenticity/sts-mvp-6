import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from './lil-gui.module.min.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

var camera, scene, renderer, mesh, material, stats;
let model, skeleton, mixer, clock;

const crossFadeControls = [];

			let currentBaseAction = 'idle';
			const allActions = [];
			const baseActions = {
				idle: { weight: 1 },
				walk: { weight: 0 },
				run: { weight: 0 }
			};
			const additiveActions = {
				sneak_pose: { weight: 1 },
				sad_pose: { weight: 1 },
				agree: { weight: 0.65 },
				headShake: { weight: 0.28 }
			};
			let panelSettings, numAnimations;


init();
animate();

function init() {
    // Renderer.
    renderer = new THREE.WebGLRenderer();
    //renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.setSize(window.innerWidth, window.innerHeight);
    // Add renderer to page
    //document.body.appendChild(renderer.domElement);
    
    // get container to contain three.js canvas.
    var container = document.getElementById('canvas-container');
    clock = new THREE.Clock();
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    // Create camera.
    //camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera = new THREE.PerspectiveCamera(70, w / h ,5, 100);
    camera.position.set( 300, 1, - 50 );

    const controls = new OrbitControls( camera, renderer.domElement );

    //controls.update() must be called after any manual changes to the camera's transform
    camera.position.set( 50, 10, 30 );
    controls.update();

    // Create scene.
    scene = new THREE.Scene();

    // Create material
    material = new THREE.MeshPhongMaterial();

    // Create cube and add to scene.
    //var geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
    //mesh = new THREE.Mesh(geometry, material);
    //scene.add(mesh);

    //model
    let loader = new GLTFLoader();
    loader.load('../sts-dancer.glb', function(gltf){
        model = gltf.scene;
        scene.add( model );

        model.traverse( function ( object ) {

            if ( object.isMesh ) object.castShadow = true;

        } );

        skeleton = new THREE.SkeletonHelper( model );
        skeleton.visible = false;
        scene.add( skeleton );

        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer( model );

        numAnimations = animations.length;

        for ( let i = 0; i !== numAnimations; ++ i ) {

            let clip = animations[ i ];
            const name = clip.name;

            if ( baseActions[ name ] ) {

                const action = mixer.clipAction( clip );
                activateAction( action );
                baseActions[ name ].action = action;
                allActions.push( action );

            } else if ( additiveActions[ name ] ) {

                // Make the clip additive and remove the reference frame

                THREE.AnimationUtils.makeClipAdditive( clip );

                if ( clip.name.endsWith( '_pose' ) ) {

                    clip = THREE.AnimationUtils.subclip( clip, clip.name, 2, 3, 30 );

                }

                const action = mixer.clipAction( clip );
                activateAction( action );
                additiveActions[ name ].action = action;
                allActions.push( action );

            }

        }

        createPanel();

        animate();

    } );
    
    //background color
    scene.background = new THREE.Color(0xFFFFFF);

    //grid helper
    const gridHelper = new THREE.GridHelper( 30, 30, 0x888888, 0x444444 );
				scene.add( gridHelper );

    // Create ambient light and add to scene.
    var light = new THREE.AmbientLight(0xE21C21); // soft white light
    scene.add(light);

    // Create directional light and add to scene.
    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Add listener for window resize.
    //window.addEventListener('resize', onWindowResize, false);
}

//animation controls 

function createPanel() {

    const panel = new GUI( { width: 310 } );

    const folder1 = panel.addFolder( 'Base Actions' );
    const folder2 = panel.addFolder( 'Additive Action Weights' );
    const folder3 = panel.addFolder( 'General Speed' );

    panelSettings = {
        'modify time scale': 1.0
    };

    const baseNames = [ 'None', ...Object.keys( baseActions ) ];

    for ( let i = 0, l = baseNames.length; i !== l; ++ i ) {

        const name = baseNames[ i ];
        const settings = baseActions[ name ];
        panelSettings[ name ] = function () {

            const currentSettings = baseActions[ currentBaseAction ];
            const currentAction = currentSettings ? currentSettings.action : null;
            const action = settings ? settings.action : null;

            if ( currentAction !== action ) { 
            
                prepareCrossFade( currentAction, action, 0.35 );
            
            }

        };

        crossFadeControls.push( folder1.add( panelSettings, name ) );

    }

    for ( const name of Object.keys( additiveActions ) ) {

        const settings = additiveActions[ name ];

        panelSettings[ name ] = settings.weight;
        folder2.add( panelSettings, name, 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {

            setWeight( settings.action, weight );
            settings.weight = weight;

        } );

    }

    folder3.add( panelSettings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

    folder1.open();
    folder2.open();
    folder3.open();

    crossFadeControls.forEach( function ( control ) {

        control.setInactive = function () {

            control.domElement.classList.add( 'control-inactive' );

        };

        control.setActive = function () {

            control.domElement.classList.remove( 'control-inactive' );

        };

        const settings = baseActions[ control.property ];

        if ( ! settings || ! settings.weight ) {

            control.setInactive();

        }

    } );

}

function activateAction( action ) {

    const clip = action.getClip();
    const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
    setWeight( action, settings.weight );
    action.play();

}

function modifyTimeScale( speed ) {

    mixer.timeScale = speed;

}

function prepareCrossFade( startAction, endAction, duration ) {

    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop

    if ( currentBaseAction === 'idle' || ! startAction || ! endAction ) {

        executeCrossFade( startAction, endAction, duration );

    } else {

        synchronizeCrossFade( startAction, endAction, duration );

    }

    // Update control colors

    if ( endAction ) {

        const clip = endAction.getClip();
        currentBaseAction = clip.name;

    } else {

        currentBaseAction = 'None';

    }

    crossFadeControls.forEach( function ( control ) {

        const name = control.property;

        if ( name === currentBaseAction ) {

            control.setActive();

        } else {

            control.setInactive();

        }

    } );

}

function synchronizeCrossFade( startAction, endAction, duration ) {

    mixer.addEventListener( 'loop', onLoopFinished );

    function onLoopFinished( event ) {

        if ( event.action === startAction ) {

            mixer.removeEventListener( 'loop', onLoopFinished );

            executeCrossFade( startAction, endAction, duration );

        }

    }

}

function executeCrossFade( startAction, endAction, duration ) {

    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)

    if ( endAction ) {

        setWeight( endAction, 1 );
        endAction.time = 0;

        if ( startAction ) {

            // Crossfade with warping

            startAction.crossFadeTo( endAction, duration, true );

        } else {

            // Fade in

            endAction.fadeIn( duration );

        }

    } else {

        // Fade out

        startAction.fadeOut( duration );

    }

}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))

function setWeight( action, weight ) {

    action.enabled = true;
    action.setEffectiveTimeScale( 1 );
    action.setEffectiveWeight( weight );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    requestAnimationFrame(animate);
    for ( let i = 0; i !== numAnimations; ++ i ) {

        const action = allActions[ i ];
        const clip = action.getClip();
        const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
        settings.weight = action.getEffectiveWeight();

    }

    // Get the time elapsed since the last frame, used for mixer update

    const mixerUpdateDelta = clock.getDelta();

    // Update the animation mixer, the stats panel, and render this frame

    mixer.update( mixerUpdateDelta );
    renderer.render(scene, camera);
}
/*
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
*/