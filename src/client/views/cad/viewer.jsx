/* G. Hemingway Copyright @2015
 * Manage the drawing context/canvas as a React View
 */

"use strict";


var React               = require('react'),
    ViewerControls      = require('./viewer_controls');
    require('./shaders/CopyShader');
    require('./shaders/EffectComposer');
    require('./shaders/FXAAShader');
    require('./shaders/VelvetyShader');
    require('./shaders/SSAOShader');
    require('./shaders/ShaderPass');

/*************************************************************************/

module.exports = class CADViewer extends React.Component {
    constructor(props) {
        super(props);
    }

    componentWillMount() {
        this.renderTargetParametersRGBA = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        };

        this.sceneCenter = new THREE.Vector3(0,0,0);
        this.sceneRadius = 10000;
    }

    componentDidMount() {
        var self = this;
        // RENDERER
        this.canvasParent = document.getElementById(this.props.viewContainerId);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('cadjs-canvas'),
            antialias: true,
            alpha: true
        });
        this.autoAntialiasing = !!this.renderer.context.getContextAttributes().antialias;
        this.renderer.setClearColor(new THREE.Color(0x000000), 1);
        this.renderer.setSize(this.canvasParent.offsetWidth, this.canvasParent.offsetHeight);
        this.renderer.sortObjects = true;
        this.renderer.autoClear = false;

        // SCENES
        this.geometryScene = new THREE.Scene();
        this.annotationScene = new THREE.Scene();
        this.overlayScene = new THREE.Scene();

        // CAMERA
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvasParent.offsetWidth / this.canvasParent.offsetHeight,
            0.1,
            1000000
        );
        this.camera.position.x = -5000;
        this.camera.position.y = -5000;
        this.camera.position.z = 0;
        this.camera.lookAt(this.geometryScene.position);

        // EFFECTS

        // EFFECT FXAA
        var renderPassFXAA = new THREE.ShaderPass(THREE.FXAAShader);
        renderPassFXAA.uniforms['resolution'].value.set(1/this.canvasParent.offsetWidth, 1/this.canvasParent.offsetHeight);
        renderPassFXAA.renderToScreen = true;
        var renderPassCopy = new THREE.ShaderPass(THREE.CopyShader);
        renderPassCopy.renderToScreen = true;

        // ADD RENDER PASSES
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderPassFXAA);
        this.composer.addPass(renderPassCopy);

        // VIEW CONTROLS
        this.controls =  ViewerControls({
            viewer: this,
            camera: this.camera,
            canvas: this.renderer.domElement,
            renderPassFXAA: renderPassFXAA
        });

        // SCREEN RESIZE
        window.addEventListener("resize", function() {
            console.log('CADViewer Resize');
            renderPassFXAA.uniforms['resolution'].value.set(1/self.canvasParent.offsetWidth, 1/self.canvasParent.offsetHeight);
            self.renderer.setSize(self.canvasParent.offsetWidth, self.canvasParent.offsetHeight);
            self.camera.aspect = self.canvasParent.offsetWidth / self.canvasParent.offsetHeight;
            self.composer.reset();
            self.controls.handleResize();
            self.controls.dispatchEvent({type: 'change'});
            self.update();
        });

        this.props.app.dispatchEvent({ type: 'cadViewer::mounted' });
    }

    invalidate() {
        this.shouldRender = true;
    }

    add3DObject(a3DObject, sceneName) {
        switch(sceneName) {
            case 'overlay':
                this.overlayScene.add(a3DObject);
                break;
            case 'annotation':
                this.annotationScene.add(a3DObject);
                break;
            case 'geometry':
            default:
                this.geometryScene.add(a3DObject);
                break;
        }
        invalidate();
    }

    render() {
        return <canvas id="cadjs-canvas" />;
    }

    update() {
        if (this.autoAntialiasing) {
            this.renderer.clear();
            this.renderer.render(this.geometryScene, this.camera);
        } else {
            //depthPassPlugin.enabled = true;
            this.renderer.render(this.geometryScene, this.camera, this.composer.renderTarget2, true);
            //depthPassPlugin.enabled = false;
            this.composer.render(0.5);
        }
        this.renderer.clear(false, true, false);
        this.renderer.render(this.overlayScene, this.camera);
        this.renderer.render(this.annotationScene, this.camera);
    };
};

/*
function Viewer(CADjs) {
    var that = this,
        shouldRender = false,
        continuousRendering = false,
        canvasParent, renderer, canvas, geometryScene, annotationScene, overlayScene, camera,
        controls, compass,
        render, animate, add3DObject, invalidate, zoomToFit,
        renderTargetParametersRGBA, depthTarget, depthPassPlugin,
        composer, renderPassSSAO, renderPassFXAA, renderPassCopy,
        autoAntialiasing;

    renderTargetParametersRGBA = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    };

    this.sceneCenter = new THREE.Vector3(0,0,0);
    this.sceneRadius = 10000;

    // RENDERER
    canvasParent = document.getElementById(CADjs._viewContainerId);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    this.renderer = renderer;
    autoAntialiasing = !!renderer.context.getContextAttributes().antialias;

    renderer.setClearColor(CADjs.getThemeValue('canvasClearColor'));
    renderer.setSize(canvasParent.offsetWidth, canvasParent.offsetHeight);
    renderer.sortObjects = true;
    renderer.autoClear = false;
    // DEPTH PASS
    depthTarget = new THREE.WebGLRenderTarget(canvasParent.offsetWidth, canvasParent.offsetHeight, renderTargetParametersRGBA);
    depthPassPlugin = new THREE.DepthPassPlugin();
    depthPassPlugin.renderTarget = depthTarget;
    depthPassPlugin.enabled = false;
    renderer.addPrePlugin(depthPassPlugin);
    // CANVAS
    canvas = renderer.domElement;
    canvasParent.appendChild(canvas);
    // SCENES
    geometryScene = new THREE.Scene();
    annotationScene = new THREE.Scene();
    overlayScene = new THREE.Scene();
    // CAMERA
    camera = new THREE.PerspectiveCamera(
        75,
        canvasParent.offsetWidth / canvasParent.offsetHeight,
        0.1,
        1000000
    );
    camera.position.x = -5000;
    camera.position.y = -5000;
    camera.position.z = 0;
    camera.lookAt(geometryScene.position);

    // EFFECTS
    // EFFECT SSAO
    renderPassSSAO = new THREE.ShaderPass(THREE.SSAOShader);
    renderPassSSAO.uniforms['tDepth'].value = depthTarget;
    renderPassSSAO.uniforms['size'].value.set(canvasParent.offsetWidth, canvasParent.offsetHeight);
    renderPassSSAO.uniforms['cameraNear'].value = camera.near;
    renderPassSSAO.uniforms['cameraFar'].value = camera.far;
    renderPassSSAO.uniforms['aoClamp'].value = 0.9;
    renderPassSSAO.uniforms['lumInfluence'].value = 0.5;
    renderPassSSAO.enabled = false;
    // EFFECT FXAA
    renderPassFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    renderPassFXAA.uniforms['resolution'].value.set(1/canvasParent.offsetWidth, 1/canvasParent.offsetHeight);
    //renderPassFXAA.renderToScreen = true;
    renderPassCopy = new THREE.ShaderPass(THREE.CopyShader);
    renderPassCopy.renderToScreen = true;
    // ADD RENDER PASSES
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPassSSAO);
    composer.addPass(renderPassFXAA);
    composer.addPass(renderPassCopy);

    // VIEW CONTROLS
    controls =  ViewerControls({
        viewer: this,
        camera: camera,
        canvas: canvas,
        renderPassSSAO: renderPassSSAO,
        renderPassFXAA: renderPassFXAA
    });

    // COMPASS
    compass = new Compass(CADjs._compassContainerId, camera, controls);

    // PRIVATE FUNCTIONS
    render = function() {
        if (autoAntialiasing) {
            renderer.clear();
            renderer.render(geometryScene, camera);
        } else {
            //depthPassPlugin.enabled = true;
            renderer.render(geometryScene, camera, composer.renderTarget2, true);
            //depthPassPlugin.enabled = false;
            composer.render(0.5);
        }
        renderer.clear(false, true, false);
        renderer.render(overlayScene, camera);
        renderer.render(annotationScene, camera);
    };
    animate = function(forceRendering) {
        requestAnimationFrame(function() {
            animate(false);
        });
        if (continuousRendering === true || shouldRender === true || forceRendering === true) {
            shouldRender = false;
            render();
            controls.update();
            compass.update();
        }
    };
    invalidate = function() {
        shouldRender = true;
    };
    add3DObject = function(a3DObject, sceneName) {
        switch(sceneName) {
            case 'overlay':
                overlayScene.add(a3DObject);
                break;
            case 'annotation':
                annotationScene.add(a3DObject);
                break;
            case 'geometry':
            default:
                geometryScene.add(a3DObject);
                break;
        }
        invalidate();
    };
    zoomToFit = function (object) {
        var object3d = object.getObject3D(),
            boundingBox = object.getBoundingBox(),
            radius = boundingBox.size().length() * 0.5,
            horizontalFOV = 2 * Math.atan(THREE.Math.degToRad(camera.fov * 0.5) * camera.aspect),
            fov = Math.min(THREE.Math.degToRad(camera.fov), horizontalFOV),
            dist = radius / Math.sin(fov * 0.5),
            newTargetPosition = boundingBox.max.clone().
                lerp(boundingBox.min, 0.5).
                applyMatrix4(object3d.matrixWorld);
        camera.position.
            sub(controls.target).
            setLength(dist).
            add(newTargetPosition);
        controls.target.copy(newTargetPosition);
        invalidate();
    };

    // CONTROL EVENT HANDLERS
    controls.addEventListener("change", function() {
        var x0 = that.sceneCenter,
            x1 = camera.position,
            x2 = controls.target,
            x2subX1 = x2.clone().sub(x1),
            x1subX0 = x1.clone().sub(x0),
            c = x2subX1.clone().cross(x1.clone().sub(x0)).lengthSq() / x2subX1.lengthSq(),
            d = Math.sqrt(Math.abs(c - x1subX0.lengthSq()));
        camera.near = Math.max(0.1, d - that.sceneRadius);
        camera.far = d + that.sceneRadius;
        camera.updateProjectionMatrix();
        invalidate();
    });
    controls.addEventListener("start", function() {
        continuousRendering = true;
    });
    controls.addEventListener("end", function() {
        invalidate();
        continuousRendering = false;
    });

    // SCREEN RESIZE
    window.addEventListener("resize", function() {
        depthTarget = new THREE.WebGLRenderTarget(canvasParent.offsetWidth, canvasParent.offsetHeight, renderTargetParametersRGBA);
        depthPassPlugin.renderTarget = depthTarget;
        renderPassSSAO.uniforms['tDepth'].value = depthTarget;
        renderPassSSAO.uniforms['size'].value.set(canvasParent.offsetWidth, canvasParent.offsetHeight);
        renderPassFXAA.uniforms['resolution'].value.set(1/canvasParent.offsetWidth, 1/canvasParent.offsetHeight);
        renderer.setSize(canvasParent.offsetWidth, canvasParent.offsetHeight);
        camera.aspect = canvasParent.offsetWidth / canvasParent.offsetHeight;
        composer.reset();
        controls.handleResize();
        controls.dispatchEvent({type: 'change'});
        render();
    });

    // MAKING PUBLIC
    this.camera = camera;
    this.controls = controls;
    this.invalidate = invalidate;
    this.add3DObject = add3DObject;
    this.zoomToFit = zoomToFit;
    animate(true); // Initial Rendering
}

Viewer.prototype.updateSceneBoundingBox = function (newBoundingBox) {
    this.sceneCenter.copy(newBoundingBox.center());
    this.sceneRadius = newBoundingBox.size().length()/2;
};

// Extend Viewer with events
THREE.EventDispatcher.prototype.apply(Viewer.prototype);


//module.exports = Viewer;
*/