import * as THREE from 'three';

const COLORS = [
    0x00FFFF, 0x00FFFF, 0xCC00FF, 0xCC00FF,
    0x00FF00, 0x00FF00, 0x0055FF, 0x0055FF,
    0xFF0055, 0xFF0055, 0xFFD700, 0xFFD700
];

export async function createMultiverse(scene) {
    const textureLoader = new THREE.TextureLoader();
    
    // Contenedor principal. ESTE GRUPO YA NO SE ROTARÁ.
    const ringGroup = new THREE.Group(); 
    const universeMeshes = []; 

    const texture = await new Promise((resolve) => {
        textureLoader.load('./assets/galaxy.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.center.set(0.5, 0.5);
            resolve(tex);
        });
    });

    // Definimos los radios. Los devolveremos al final para usarlos en main.js
    const radiusX = 10;
    const radiusY = 7.5;
    
    // Geometrías compartidas
    const innerGeo = new THREE.CircleGeometry(1.5, 32); 
    const outerGeo = new THREE.SphereGeometry(1.7, 64, 64);
    const rimGeo = new THREE.SphereGeometry(1.8, 64, 64);
    
    const startAngle = Math.PI / 2 + (Math.PI / 12); 

    for (let i = 0; i < 12; i++) {
        const group = new THREE.Group();
        const color = new THREE.Color(COLORS[i]);

        // A. Galaxia
        const innerMat = new THREE.MeshBasicMaterial({
            map: texture, color: 0xffffff, side: THREE.DoubleSide
        });
        innerMat.color.lerp(color, 0.2); 
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        group.add(innerMesh);

        // B. Cristal
        const outerMat = new THREE.MeshPhysicalMaterial({
            color: color, emissive: color, emissiveIntensity: 0.2,
            transmission: 1.0, thickness: 2.0, roughness: 0.0,
            metalness: 0.1, transparent: true, opacity: 0.5,
            clearcoat: 1.0, side: THREE.FrontSide
        });
        const outerSphere = new THREE.Mesh(outerGeo, outerMat);
        group.add(outerSphere);

        // C. Borde
        const rimMat = new THREE.MeshBasicMaterial({
            color: color, side: THREE.BackSide,
            transparent: true, opacity: 0.05,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        group.add(rimMesh);

        // --- POSICIONAMIENTO INICIAL ---
        const initialAngle = startAngle - (i / 12) * Math.PI * 2;
        
        // Calculamos la posición inicial una vez
        group.position.x = radiusX * Math.cos(initialAngle);
        group.position.y = radiusY * Math.sin(initialAngle);
        group.scale.set(1, 1, 1);
        
        // --- METADATA CRÍTICA ---
        group.userData = { 
            id: i + 1, 
            baseScale: 1.0,
            // NUEVO: Guardamos el ángulo actual para poder actualizarlo en el animate loop
            currentAngle: initialAngle 
        };
        if (i === 7) group.userData.isU7 = true;

        ringGroup.add(group);
        universeMeshes.push(group);
    }

    scene.add(ringGroup);

    // Devolvemos los radios para usarlos en la animación
    return { ringGroup, universeMeshes, radiusX, radiusY };
}