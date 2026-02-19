import * as THREE from 'three';

export function setupLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topLight.position.set(0, 20, 10);
    scene.add(topLight);

    const backLight = new THREE.PointLight(0xffffff, 1.0);
    backLight.position.set(0, -10, -10);
    scene.add(backLight);
}