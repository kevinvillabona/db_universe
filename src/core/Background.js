import * as THREE from 'three';

// 1. Generador de Textura de Humo (Smoke)
// Crea una textura irregular en memoria, no un círculo perfecto.
function createSmokeTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Fondo transparente
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, size, size);

    // Dibujamos un gradiente radial suave pero "deformado"
    const center = size / 2;
    
    // Capas de opacidad para simular gas
    const grad = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Centro denso
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Borde invisible

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, size/2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// 2. Textura de Estrella (Punto brillante con halo)
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(200, 200, 255, 0.2)');
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

export function createBackground(scene) {
    const smokeTexture = createSmokeTexture();
    const starTexture = createStarTexture();

    // --- A. ESTRELLAS (MUCHAS MÁS) ---
    // Usamos 3 capas de estrellas para dar profundidad
    const starsGroup = new THREE.Group();
    
    function addStarLayer(count, size, range, color) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        
        for(let i=0; i<count * 3; i++) {
            pos[i] = (Math.random() - 0.5) * range;
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            size: size,
            map: starTexture,
            transparent: true,
            opacity: 0.8,
            color: color,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        const points = new THREE.Points(geo, mat);
        starsGroup.add(points);
        return points;
    }

    // Capa 1: Polvo estelar lejano (Muy pequeñas, muchísimas)
    const distantStars = addStarLayer(5000, 0.4, 600, 0xaaaaaa);
    
    // Capa 2: Estrellas medias
    const mediumStars = addStarLayer(2000, 0.8, 400, 0xccccff); // Tono azulado
    
    // Capa 3: Estrellas brillantes cercanas
    const brightStars = addStarLayer(300, 1.5, 300, 0xffffff);

    scene.add(starsGroup);


    // --- B. NEBULOSA (CLOUD PLANES) ---
    // Aquí está el truco: Usamos planos gigantes (Billboards) en lugar de puntos
    const cloudGroup = new THREE.Group();
    
    // Colores extraídos de tu imagen de referencia
    // Azul galáctico, Morado profundo, Rosa cósmico
    const cloudColors = [0x0044aa, 0x4b0082, 0x330066, 0x001133]; 
    
    const cloudGeo = new THREE.PlaneGeometry(60, 60); // ¡Planos gigantes de 60x60 unidades!
    
    // Creamos 40 "nubes" gigantes
    const cloudMeshes = [];

    for(let i=0; i<40; i++) {
        const material = new THREE.MeshBasicMaterial({
            map: smokeTexture,
            transparent: true,
            // Opacidad MUY baja para que se mezclen los colores
            opacity: 0.08, 
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: cloudColors[Math.floor(Math.random() * cloudColors.length)],
            side: THREE.DoubleSide
        });

        const cloud = new THREE.Mesh(cloudGeo, material);
        
        // Posicionamos las nubes aleatoriamente en el fondo
        cloud.position.x = (Math.random() - 0.5) * 150;
        cloud.position.y = (Math.random() - 0.5) * 80;
        cloud.position.z = -20 - Math.random() * 80; // Siempre detrás de los anillos
        
        // Rotación aleatoria inicial
        cloud.rotation.z = Math.random() * Math.PI * 2;
        
        // Guardamos una velocidad de rotación única para cada nube
        cloud.userData = {
            rotSpeed: (Math.random() - 0.5) * 0.002
        };

        cloudGroup.add(cloud);
        cloudMeshes.push(cloud);
    }
    
    // Añadimos una "nube principal" violeta detrás del centro para dar foco
    const centerCloudMat = new THREE.MeshBasicMaterial({
        map: smokeTexture,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0x6600cc // Violeta brillante
    });
    const centerCloud = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), centerCloudMat);
    centerCloud.position.set(0,0,-50);
    cloudGroup.add(centerCloud);
    cloudMeshes.push(centerCloud);

    scene.add(cloudGroup);


    function updateBackground() {
        // 1. Rotación lenta de todo el campo de estrellas
        starsGroup.rotation.y += 0.0002;
        starsGroup.rotation.x += 0.00005;

        // 2. Movimiento orgánico de las nubes
        cloudMeshes.forEach(cloud => {
            // Rotan sobre su propio eje (efecto remolino)
            cloud.rotation.z += cloud.userData.rotSpeed || 0.001;
            
            // Hacemos que "miren" siempre hacia la cámara para que no parezcan planos 2D
            // (Billboard effect parcial)
            // cloud.lookAt(scene.position); // Opcional, a veces es mejor que sean planos estáticos
        });
        
        // Rotación general del grupo de nubes
        cloudGroup.rotation.z -= 0.0001;
    }

    return { updateBackground };
}