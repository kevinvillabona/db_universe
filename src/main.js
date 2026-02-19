import * as THREE from 'three';
import { createScene } from './core/SceneSetup.js';
import { setupLighting } from './core/Lighting.js';
import { createMultiverse } from './entities/Universe.js';
import { setupInteraction } from './utils/Interaction.js';
import { createBackground } from './core/Background.js';

const UNIVERSES_MAP = {
    7: ["Goku", "Vegeta", "Piccolo", "Gohan", "Freezer", "Android 17", "Android 18", "Krillin", "Master Roshi", "Tien Shinhan", "Yamcha", "Majin Buu", "Broly", "Pan", "Trunks", "Bulma"],
    6: ["Hit", "Cabba", "Caulifla", "Kale", "Frost", "Magetta", "Botamo", "Saonel", "Pirina"],
    11: ["Jiren", "Toppo", "Dyspo", "Kahseral", "Cocotte"],
    2: ["Ribrianne", "Kakunsa", "Rozie"]
};
let apiData = [];
let apiLoaded = false;

async function fetchDragonBallData() {
    try {
        const response = await fetch('https://dragonball-api.com/api/characters?limit=150');
        const data = await response.json();
        apiData = data.items;
        apiLoaded = true;
        document.getElementById('roster-loader').style.display = 'none';
    } catch (e) {
        document.getElementById('roster-loader').innerText = "Error de conexión con el radar del dragón.";
    }
}

function renderRoster(universeId) {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';
    
    // Título flotante HTML
    const floatingTitle = document.getElementById('floating-title');
    floatingTitle.innerHTML = `UNIVERSO <span class="text-[#ff9900] drop-shadow-[0_0_20px_#ff9900]">${universeId}</span>`;

    const namesToFind = UNIVERSES_MAP[universeId] || [];
    const filtered = apiData.filter(pj => namesToFind.includes(pj.name));

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-gray-300 text-center col-span-full font-sans text-xl mt-10">Sin registros en la base de datos multidimensional.</p>';
        return;
    }

    filtered.forEach(pj => {
        let theme = 'u-theme-default';
        if(universeId === 7) theme = 'u-theme-7';
        if(universeId === 6) theme = 'u-theme-6';
        if(universeId === 11) theme = 'u-theme-11';
        if(universeId === 2) theme = 'u-theme-2';

        const card = document.createElement('div');
        card.className = `char-card ${theme}`;
        card.innerHTML = `
            <div class="img-container">
                <img src="${pj.image}" class="char-img" alt="${pj.name}">
            </div>
            <div class="info-panel">
                <div class="u-tag">U${universeId}</div>
                <span class="char-race">${pj.race}</span>
                <h2 class="char-name">${pj.name}</h2>
                <div style="margin-top:5px; font-size:1.1rem; color:var(--u-color); font-weight:bold;">
                    KI: ${pj.ki}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function init() {
    fetchDragonBallData();

    const { scene, camera, renderer, composer } = createScene();
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    setupLighting(scene);

    const background = createBackground(scene);
    const { universeMeshes, radiusX, radiusY } = await createMultiverse(scene);

    const loadingEl = document.getElementById('loading');
    const logoContainer = document.getElementById('logo-container');
    const backBtn = document.getElementById('back-btn');
    const tooltipEl = document.getElementById('hover-tooltip');
    
    const rosterPanel = document.getElementById('roster-panel');
    const leftZone = document.getElementById('left-zone');
    
    setTimeout(() => {
        loadingEl.classList.add('fade-out');
        setTimeout(() => loadingEl.style.display = 'none', 500);
        logoContainer.classList.remove('logo-center');
        logoContainer.classList.add('logo-top-left');
    }, 800);

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

    function enterFocusMode(group) {
        isFocused = true;
        focusedIndex = universeMeshes.indexOf(group);
        interaction.setPaused(true); 
        backBtn.classList.remove('hidden');

        if(apiLoaded) renderRoster(group.userData.id);
        rosterPanel.classList.add('roster-active');
        leftZone.classList.remove('hidden');

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
        
        rosterPanel.classList.remove('roster-active');
        leftZone.classList.add('hidden');
        
        targetRotationOffset = currentRotationOffset + (Math.PI * 2);
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0001;
        background.updateBackground();

        if (snakeProgress < 1.0) {
            snakeProgress += 0.02; 
            if (snakeProgress > 1.0) snakeProgress = 1.0;
            if (!isFocused) interaction.setPaused(true);
        }
        if (snakeProgress >= 1.0 && !isFocused) {
            interaction.setPaused(false);
        }

        const { rotationDelta, hoveredGroup } = interaction.update();

        if (hoveredGroup && !isFocused && focusProgress < 0.1 && snakeProgress >= 1.0) {
            tooltipEl.textContent = `Universo ${hoveredGroup.userData.id}`;
            tooltipEl.classList.remove('opacity-0');
            const vector = new THREE.Vector3();
            hoveredGroup.getWorldPosition(vector);
            vector.y += 1.8; 
            vector.project(camera);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
        } else {
            tooltipEl.classList.add('opacity-0');
        }

        const targetProgress = isFocused ? 1.0 : 0.0;
        focusProgress = THREE.MathUtils.lerp(focusProgress, targetProgress, 0.04);
        currentRotationOffset = THREE.MathUtils.lerp(currentRotationOffset, targetRotationOffset, 0.04);
        
        if (!isFocused && Math.abs(currentRotationOffset - targetRotationOffset) < 0.001) {
            targetRotationOffset = currentRotationOffset;
        }

        // --- CÁLCULO DINÁMICO DE PROYECCIÓN 3D A 2D ---
        // --- CÁLCULO DINÁMICO DE PROYECCIÓN 3D A 2D ---
        const isMobile = window.innerWidth < 768;
        const targetCenterZ = isMobile ? 0 : 2; 
        
        const dist = camera.position.z - targetCenterZ;
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
        const visibleWidth = visibleHeight * camera.aspect;
        
        // En desktop va a la izquierda. En mobile se queda al centro en X.
        const targetCenterX = isMobile ? 0 : -(visibleWidth * 0.3); 
        
        // FIX CLAVE: En mobile, subimos el universo exactamente un 25% del alto visible de la pantalla.
        const targetCenterY = isMobile ? (visibleHeight * 0.25) : 0; 

        universeMeshes.forEach((group, index) => {
            const inner = group.children[0];
            const outer = group.children[1];
            const rim = group.children[2];

            if (focusProgress < 0.99) {
                group.userData.currentAngle += rotationDelta;
            }

            const finalAngle = group.userData.currentAngle + currentRotationOffset;
            const orbitX = radiusX * Math.cos(finalAngle);
            const orbitY = radiusY * Math.sin(finalAngle);
            
            const isTarget = (index === focusedIndex);

            if (isTarget) {
                group.position.x = THREE.MathUtils.lerp(orbitX, targetCenterX, focusProgress);
                group.position.y = THREE.MathUtils.lerp(orbitY, targetCenterY, focusProgress);
                group.position.z = THREE.MathUtils.lerp(0, targetCenterZ, focusProgress);
            } else {
                group.position.x = orbitX;
                group.position.y = orbitY;
                group.position.z = 0;
            }

            const yNorm = orbitY / radiusY; 
            let dynamicBaseScale = 1.0 - (yNorm * 0.25);
            const totalItems = universeMeshes.length;
            const itemDelay = (index / totalItems) * 0.75; 
            let snakeScaleFactor = (snakeProgress - itemDelay) * 5.0;
            snakeScaleFactor = THREE.MathUtils.clamp(snakeScaleFactor, 0, 1);

            if (isTarget) {
                // FIX CLAVE 2: En mobile no lo escalamos a 2.5, lo achicamos a 1.2 para que no tape el título
                const finalFocusScale = isMobile ? 1.2 : 2.5;
                dynamicBaseScale = THREE.MathUtils.lerp(dynamicBaseScale, finalFocusScale, focusProgress);
            } else {
                let targetScaleNoFocus = dynamicBaseScale * snakeScaleFactor;
                dynamicBaseScale = THREE.MathUtils.lerp(targetScaleNoFocus, 0, focusProgress);
            }

            const isHovered = (hoveredGroup === group) && !isFocused && focusProgress < 0.1 && snakeProgress >= 1.0;
            const targetScale = isHovered ? dynamicBaseScale * 1.15 : dynamicBaseScale;
            group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

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