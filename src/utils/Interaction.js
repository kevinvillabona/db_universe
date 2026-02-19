import * as THREE from 'three';

export function setupInteraction(camera, scene, universeMeshes, onSelectCallback) {
    const raycaster = new THREE.Raycaster();
    // Inicializamos el "mouse" fuera de la pantalla para evitar hovers fantasmas al cargar
    const mouse = new THREE.Vector2(-2, -2); 
    
    // --- CONFIGURACIÓN DE FÍSICA ---
    const SENSITIVITY = 0.002;
    const FRICTION = 0.95;
    const MAX_VELOCITY = 0.05;

    // Variables de Estado
    let isDragging = false;
    let previousMouseX = 0;
    let velocity = 0; 
    let isHovering = false;
    let targetMesh = null;
    let isPaused = false; 

    function onPointerDown(e) {
        if (isPaused) return; 
        if (!e.isPrimary) return; // Ignoramos toques secundarios (multi-touch)
        
        isDragging = true;
        previousMouseX = e.clientX;
        document.body.style.cursor = 'grabbing';
        velocity = 0;
    }

    function onPointerUp(e) {
        if (!e.isPrimary) return;
        
        isDragging = false;
        if (!isPaused) {
            document.body.style.cursor = isHovering ? 'pointer' : 'default';
        }
        
        // FIX UI/UX MOBILE: Si es táctil, sacamos el raycaster de la pantalla al levantar el dedo
        if (e.pointerType === 'touch') {
            mouse.set(-2, -2);
        }
    }

    function onPointerMove(e) {
        if (!e.isPrimary) return;
        
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (isDragging && !isPaused) {
            const deltaX = e.clientX - previousMouseX;
            let newVel = deltaX * SENSITIVITY;
            velocity = newVel; 

            if (velocity > MAX_VELOCITY) velocity = MAX_VELOCITY;
            if (velocity < -MAX_VELOCITY) velocity = -MAX_VELOCITY;

            previousMouseX = e.clientX;
        }
    }

    function onClick() {
        if (isPaused) return; 

        // Si la velocidad es alta, es un drag, no un click
        if (Math.abs(velocity) > 0.005) return;

        if (targetMesh && onSelectCallback) {
            onSelectCallback(targetMesh);
        }
    }

    // --- POINTER EVENTS (Soporte Universal Mouse + Táctil) ---
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointercancel', onPointerUp); // FIX CRÍTICO: Libera el drag si el SO interrumpe
    window.addEventListener('click', onClick);

    function update() {
        // 1. Fricción
        if (!isDragging) {
            velocity *= FRICTION;
            if (Math.abs(velocity) < 0.0001) velocity = 0;
        }

        // 2. Raycaster (Solo si no está pausado y velocidad baja)
        if (!isPaused && Math.abs(velocity) < 0.05) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            targetMesh = null;
            isHovering = false;

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while(obj.parent && obj.parent.type === 'Group' && obj.parent !== scene) {
                    if(obj.userData.id) {
                        targetMesh = obj;
                        isHovering = true;
                        break;
                    }
                    obj = obj.parent;
                }
            }
        } else {
            targetMesh = null;
            isHovering = false;
        }
        
        if (!isDragging && !isPaused) {
            document.body.style.cursor = isHovering ? 'pointer' : 'default';
        } else if (isPaused) {
             document.body.style.cursor = 'default';
        }

        return { 
            rotationDelta: velocity, 
            hoveredGroup: targetMesh 
        };
    }

    function setPaused(value) {
        isPaused = value;
        if(isPaused) {
            velocity = 0; // Frenar en seco al pausar
            isDragging = false;
        }
    }

    return { update, setPaused };
}