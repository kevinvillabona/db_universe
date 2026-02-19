import * as THREE from 'three';
import { createScene } from './core/SceneSetup.js';
import { setupLighting } from './core/Lighting.js';
import { createMultiverse } from './entities/Universe.js';
import { setupInteraction } from './utils/Interaction.js';
import { createBackground } from './core/Background.js';

async function init() {
    const { scene, camera, renderer, composer } = createScene();
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    setupLighting(scene);

    const background = createBackground(scene);
    // Esperamos a que los cristales/texturas terminen de cargar
    const { universeMeshes, radiusX, radiusY } = await createMultiverse(scene);

    const loadingEl = document.getElementById('loading');
    const logoContainer = document.getElementById('logo-container');
    const backBtn = document.getElementById('back-btn');
    const tooltipEl = document.getElementById('hover-tooltip');
    
    // Dejamos que el logo se luzca en el centro por un segundo antes de moverlo
    setTimeout(() => {
        // Desvanecer spinner de carga
        loadingEl.classList.add('fade-out');
        setTimeout(() => loadingEl.style.display = 'none', 500);

        // Mover logo hacia la esquina
        logoContainer.classList.remove('logo-center');
        logoContainer.classList.add('logo-top-left');
    }, 800);

    // --- VARIABLES DE ESTADO ---
    let isFocused = false;          
    let focusedIndex = -1;          
    let focusProgress = 0; 
    let targetRotationOffset = 0;   
    let currentRotationOffset = 0;  
    let snakeProgress = 0; 

    const interaction = setupInteraction(camera, scene, universeMeshes, (selectedGroup) => {
        if (!isFocused && snakeProgress >= 0.99) {
            enterFocusMode(selectedGroup);
        }
    });

    backBtn.addEventListener('click', () => {
        if (isFocused && focusProgress >= 0.99) {
            exitFocusMode();
        }
    });

    // --- LÓGICA DE TRANSICIÓN ---
    function enterFocusMode(group) {
        isFocused = true;
        focusedIndex = universeMeshes.indexOf(group);
        interaction.setPaused(true); 
        backBtn.classList.remove('hidden');

        let currentAngle = group.userData.currentAngle % (Math.PI * 2);
        if (currentAngle < 0) currentAngle += Math.PI * 2;
        
        const targetVisualAngle = 3 * Math.PI / 2; 

        let delta = targetVisualAngle - currentAngle;
        
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        delta -= Math.PI * 2; 

        targetRotationOffset = currentRotationOffset + delta;
    }

    function exitFocusMode() {
        isFocused = false;
        focusedIndex = -1;
        interaction.setPaused(false); 
        backBtn.classList.add('hidden');
        
        targetRotationOffset = currentRotationOffset + (Math.PI * 2);
    }

    // --- LOOP DE ANIMACIÓN ---
    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0001;

        background.updateBackground();

        // 1. Progreso Serpiente
        if (snakeProgress < 1.0) {
            snakeProgress += 0.02; 
            if (snakeProgress > 1.0) snakeProgress = 1.0;
            if (!isFocused) interaction.setPaused(true);
        }
        
        if (snakeProgress >= 1.0 && !isFocused) {
            interaction.setPaused(false);
        }

        const { rotationDelta, hoveredGroup } = interaction.update();

        // 2. Lógica del Tooltip Hover
        if (hoveredGroup && !isFocused && focusProgress < 0.1 && snakeProgress >= 1.0) {
            // Actualizar texto según el ID del Universo (ej: Universo 7)
            tooltipEl.textContent = `Universo ${hoveredGroup.userData.id}`;
            tooltipEl.classList.remove('opacity-0');
            
            // Proyección 3D a 2D para que el tooltip siga al modelo
            const vector = new THREE.Vector3();
            hoveredGroup.getWorldPosition(vector);
            vector.y += 1.8; // Desplazar un poco hacia arriba del universo
            vector.project(camera);
            
            // Convertir coordenadas proyectadas (-1 a +1) a píxeles de pantalla
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
            
            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
        } else {
            // Ocultar suavemente cuando no hay hover
            tooltipEl.classList.add('opacity-0');
        }

        // 3. Transición Focus
        const targetProgress = isFocused ? 1.0 : 0.0;
        focusProgress = THREE.MathUtils.lerp(focusProgress, targetProgress, 0.04);

        // 4. Transición Rotación Anillo
        currentRotationOffset = THREE.MathUtils.lerp(currentRotationOffset, targetRotationOffset, 0.04);
        
        if (!isFocused && Math.abs(currentRotationOffset - targetRotationOffset) < 0.001) {
            targetRotationOffset = currentRotationOffset;
        }

        universeMeshes.forEach((group, index) => {
            const inner = group.children[0];
            const outer = group.children[1];
            const rim = group.children[2];

            // A. POSICIÓN
            if (focusProgress < 0.99) {
                group.userData.currentAngle += rotationDelta;
            }

            const finalAngle = group.userData.currentAngle + currentRotationOffset;
            const orbitX = radiusX * Math.cos(finalAngle);
            const orbitY = radiusY * Math.sin(finalAngle);
            
            const centerX = 0;
            const centerY = 0;
            const centerZ = 4; 

            const isTarget = (index === focusedIndex);

            if (isTarget) {
                group.position.x = THREE.MathUtils.lerp(orbitX, centerX, focusProgress);
                group.position.y = THREE.MathUtils.lerp(orbitY, centerY, focusProgress);
                group.position.z = THREE.MathUtils.lerp(0, centerZ, focusProgress);
            } else {
                group.position.x = orbitX;
                group.position.y = orbitY;
                group.position.z = 0;
            }

            // B. ESCALA
            const yNorm = orbitY / radiusY; 
            let dynamicBaseScale = 1.0 - (yNorm * 0.25);

            const totalItems = universeMeshes.length;
            const itemDelay = (index / totalItems) * 0.75; 
            let snakeScaleFactor = (snakeProgress - itemDelay) * 5.0;
            snakeScaleFactor = THREE.MathUtils.clamp(snakeScaleFactor, 0, 1);

            if (isTarget) {
                dynamicBaseScale = THREE.MathUtils.lerp(dynamicBaseScale, 2.5, focusProgress);
            } else {
                let targetScaleNoFocus = dynamicBaseScale * snakeScaleFactor;
                dynamicBaseScale = THREE.MathUtils.lerp(targetScaleNoFocus, 0, focusProgress);
            }

            const isHovered = (hoveredGroup === group) && !isFocused && focusProgress < 0.1 && snakeProgress >= 1.0;
            const targetScale = isHovered ? dynamicBaseScale * 1.15 : dynamicBaseScale;
            group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

            // C. OPACIDAD
            let visibilityMult = snakeScaleFactor; 
            if (!isTarget) visibilityMult *= (1.0 - focusProgress);

            if(rim.material) {
                const baseOpacity = isHovered ? 0.5 : 0.05;
                rim.material.opacity = THREE.MathUtils.lerp(rim.material.opacity, baseOpacity * visibilityMult, 0.1);
            }
            if(outer.material) {
                 const baseOp = 0.5;
                 outer.material.opacity = THREE.MathUtils.lerp(outer.material.opacity, baseOp * visibilityMult, 0.1);
                 const targetEm = isHovered ? 0.8 : 0.2;
                 outer.material.emissiveIntensity = THREE.MathUtils.lerp(outer.material.emissiveIntensity, targetEm * visibilityMult, 0.1);
            }

            // D. ROTACIÓN
            inner.quaternion.copy(camera.quaternion);
            inner.rotateZ(time + (group.userData.id * 0.5));
            outer.rotation.x += 0.0005;
            outer.rotation.y += 0.0005;
        });

        composer.render();
    }

    animate();
}

init();