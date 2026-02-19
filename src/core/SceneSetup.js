import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function createScene() {
    const scene = new THREE.Scene();
    
    const spaceColor = new THREE.Color(0x050510); 
    scene.background = spaceColor;
    scene.fog = new THREE.FogExp2(0x050510, 0.0025);

    // Lente Teleobjetivo
    const camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 56); 
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // El tamaño se asignará en el onResize
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.strength = 0.4; 
    bloomPass.radius = 0.4;
    bloomPass.threshold = 0.1;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const onResize = () => {
        // LEEMOS DEL CONTENEDOR FÍSICO, NO DEL WINDOW. Cero margen de error.
        const container = document.getElementById('canvas-container');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
        composer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);

    // Forzamos el tamaño en el primer frame de renderizado
    onResize();
    
    // Doble chequeo por si las fuentes personalizadas retrasan el layout
    setTimeout(onResize, 50);

    return { scene, camera, renderer, composer };
}