import * as THREE from 'three';

export function setupInteraction(camera, scene, universeMeshes, onSelectCallback) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-2, -2); 
    const pointerDownPos = new THREE.Vector2(); // Nuevo: Guardamos dónde toca inicialmente
    
    const SENSITIVITY = 0.002;
    const FRICTION = 0.95;
    const MAX_VELOCITY = 0.05;

    let isDragging = false;
    let previousMouseX = 0;
    let velocity = 0; 
    let isHovering = false;
    let targetMesh = null;
    let isPaused = false; 

    // Función auxiliar para actualizar coordenadas
    function updateMousePos(clientX, clientY) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    function onPointerDown(e) {
        if (isPaused || !e.isPrimary) return; 
        
        isDragging = true;
        previousMouseX = e.clientX;
        pointerDownPos.set(e.clientX, e.clientY); 
        
        updateMousePos(e.clientX, e.clientY); // CRUCIAL para móviles: actualiza al tocar
        
        document.body.style.cursor = 'grabbing';
        velocity = 0;
    }

    function onPointerUp(e) {
        if (!e.isPrimary) return;
        isDragging = false;
        
        // --- LÓGICA DE TAP (Reemplaza el evento 'click' nativo) ---
        // Calculamos cuánto se movió el dedo desde que tocó hasta que soltó
        const moveDistance = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        
        // Si se movió menos de 10 píxeles, es un tap intencional
        if (moveDistance < 10 && !isPaused) {
            updateMousePos(e.clientX, e.clientY);
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            let clickedMesh = null;
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while(obj.parent && obj.parent.type === 'Group' && obj.parent !== scene) {
                    if(obj.userData.id) {
                        clickedMesh = obj;
                        break;
                    }
                    obj = obj.parent;
                }
            }

            if (clickedMesh && onSelectCallback) {
                onSelectCallback(clickedMesh);
            }
        }
        
        if (!isPaused) {
            document.body.style.cursor = isHovering ? 'pointer' : 'default';
        }
        
        // Limpiamos el raycaster si es pantalla táctil para que no quede "hover" trabado
        if (e.pointerType === 'touch') {
            mouse.set(-2, -2);
        }
    }

    function onPointerMove(e) {
        if (!e.isPrimary) return;
        
        updateMousePos(e.clientX, e.clientY);

        if (isDragging && !isPaused) {
            const deltaX = e.clientX - previousMouseX;
            velocity = deltaX * SENSITIVITY; 
            
            if (velocity > MAX_VELOCITY) velocity = MAX_VELOCITY;
            if (velocity < -MAX_VELOCITY) velocity = -MAX_VELOCITY;

            previousMouseX = e.clientX;
        }
    }

    // Usamos { passive: false } para mayor control sobre el touch
    window.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointercancel', onPointerUp); 
    // NOTA: Eliminamos el window.addEventListener('click', onClick) por completo.

    function update() {
        if (!isDragging) {
            velocity *= FRICTION;
            if (Math.abs(velocity) < 0.0001) velocity = 0;
        }

        // Raycaster visual para el hover en escritorio
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
            velocity = 0; 
            isDragging = false;
        }
    }

    return { update, setPaused };
}