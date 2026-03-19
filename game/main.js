import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// 1. SETUP THE WORLD
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0002); // Subtle fog fades distant stars

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- POST-PROCESSING PIPELINE ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.5; // Higher threshold so only VERY bright objects bloom
bloomPass.strength = 0.4;  // Toned down from 1.2 to remove the "acid trip" vibe
composer.addPass(bloomPass);

// 2. ADD THE "SENSE OF MOTION" (EXPANDED STARFIELD)
const starGeo = new THREE.BufferGeometry();
const starCoords = [];
const starColors = [];
for (let i = 0; i < 20000; i++) {
    // Much larger spread to fly around in
    starCoords.push(
        THREE.MathUtils.randFloatSpread(4000), 
        THREE.MathUtils.randFloatSpread(4000), 
        THREE.MathUtils.randFloatSpread(4000)
    );
    
    // Varied star/galaxy colors to make it look majestic
    const color = new THREE.Color();
    const type = Math.random();
    if (type > 0.95) color.setHex(0xd4af37); // Gold
    else if (type > 0.8) color.setHex(0x88ccff); // Light blue
    else if (type > 0.7) color.setHex(0xffbbbb); // Faint pink/red
    else color.setHex(0xffffff); // Standard white
    
    starColors.push(color.r, color.g, color.b);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ 
    size: 1.5, 
    vertexColors: true,
    transparent: true,
    opacity: 0.9 
}));
scene.add(stars);

// 3. THE SHIP (PLAYER) - Upgraded Geometry
const shipGroup = new THREE.Group(); 
const shipMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, wireframe: true });

const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 8), shipMat);
body.rotation.x = -Math.PI / 2; // Point forward

const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 3), shipMat);
wingL.position.set(-0.6, 0, 0.2);
wingL.rotation.set(-Math.PI / 2, 0, -Math.PI / 8); 

const wingR = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 3), shipMat);
wingR.position.set(0.6, 0, 0.2);
wingR.rotation.set(-Math.PI / 2, 0, Math.PI / 8); 

const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.5, 8), shipMat);
engine.position.z = 1;
engine.rotation.x = -Math.PI / 2;

const jetMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.8 });
const jetGeo = new THREE.ConeGeometry(0.2, 1.5, 6);
jetGeo.translate(0, 0.75, 0); // Shift origin to the base so it scales OUTWARD instead of both ways
const jet = new THREE.Mesh(jetGeo, jetMat);
jet.position.z = 1.25; // Attach perfectly flush to the back of the engine
jet.rotation.x = Math.PI / 2; // Point backwards

shipGroup.add(body, wingL, wingR, engine, jet);
scene.add(shipGroup);

// 3.5 TRAJECTORY PREDICTION LINE
const trajectoryMat = new THREE.LineDashedMaterial({ 
    color: 0x00ffff, 
    linewidth: 2, 
    dashSize: 4, 
    gapSize: 2, 
    transparent: true, 
    opacity: 0.5 
});
const trajectoryGeo = new THREE.BufferGeometry();
const trajectoryPoints = new Float32Array(60 * 3); // Predict 60 steps into the future
trajectoryGeo.setAttribute('position', new THREE.BufferAttribute(trajectoryPoints, 3));
const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
scene.add(trajectoryLine);

// 3.8 BLACK HOLE & ACCRETION DISK
const blackHoleGroup = new THREE.Group();
blackHoleGroup.position.set(400, -100, -800); // Looming in the distance

const eventHorizon = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
);

const accretionDisk = new THREE.Mesh(
    new THREE.RingGeometry(80, 150, 64),
    new THREE.MeshBasicMaterial({ color: 0xff4400, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
);
accretionDisk.rotation.x = Math.PI / 2 - 0.2; // Tilted slightly for cinematic effect
blackHoleGroup.add(eventHorizon, accretionDisk);
scene.add(blackHoleGroup);

// 3.9 SOLAR WIND SLIPSTREAM (The "Ocean Current")
// Generate a massive, winding closed-loop track in deep space
const slipstreamRadius = 1000;
const slipstreamPoints = [];
for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const x = Math.cos(angle) * slipstreamRadius + THREE.MathUtils.randFloatSpread(500);
    const z = Math.sin(angle) * slipstreamRadius + THREE.MathUtils.randFloatSpread(500);
    const y = Math.sin(angle * 3) * 300; 
    slipstreamPoints.push(new THREE.Vector3(x, y, z));
}
const slipstreamCurve = new THREE.CatmullRomCurve3(slipstreamPoints, true); // true = closed loop

const tubeGeo = new THREE.TubeGeometry(slipstreamCurve, 300, 100, 16, true); // 16 radial segments for rounder look
const tubeMat = new THREE.MeshBasicMaterial({ 
    color: 0xff6600, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
});
const slipstreamMesh = new THREE.Mesh(tubeGeo, tubeMat);
scene.add(slipstreamMesh);

// 3.95 SLIPSTREAM PARTICLES (Subtle flow direction)
const slipstreamParticles = [];
const particleGeo = new THREE.SphereGeometry(2, 4, 4);
const particleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
for(let i = 0; i < 100; i++) {
    const mesh = new THREE.Mesh(particleGeo, particleMat);
    const t = Math.random();
    mesh.position.copy(slipstreamCurve.getPointAt(t));
    scene.add(mesh);
    slipstreamParticles.push({ mesh, t, speed: 0.0002 + Math.random() * 0.0004 });
}

// Precompute the curve's path data so we aren't doing heavy math every frame
const slipstreamSamples = 600;
const slipstreamData = [];
for (let i = 0; i < slipstreamSamples; i++) {
    const t = i / slipstreamSamples;
    slipstreamData.push({
        point: slipstreamCurve.getPointAt(t),
        tangent: slipstreamCurve.getTangentAt(t).normalize()
    });
}

// 3.98 ASTEROIDS & COMBAT
const asteroids = [];
const asteroidGeo = new THREE.DodecahedronGeometry(12, 1); // Rugged, low-poly rocks
const asteroidMat = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true });
for(let i = 0; i < 150; i++) {
    const mesh = new THREE.Mesh(asteroidGeo, asteroidMat);
    mesh.position.set(
        THREE.MathUtils.randFloatSpread(4000),
        THREE.MathUtils.randFloatSpread(4000),
        THREE.MathUtils.randFloatSpread(4000)
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(mesh);
    asteroids.push({ mesh, isExploding: false, rotSpeed: new THREE.Vector3(Math.random()*0.02, Math.random()*0.02, Math.random()*0.02) });
}

const lasers = [];
const laserGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 4);
laserGeo.rotateX(Math.PI / 2); // Align with Z axis (forward)
const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click to shoot
        const laser = new THREE.Mesh(laserGeo, laserMat);
        laser.position.copy(shipGroup.position);
        laser.quaternion.copy(shipGroup.quaternion);
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
        const laserVel = forward.multiplyScalar(20.0).add(velocity); // Shoots forward relative to ship speed
        
        scene.add(laser);
        lasers.push({ mesh: laser, velocity: laserVel, age: 0 });
    }
});

// 4. PHYSICS STATE
let fuel = 100;
let baseSpeed = 1.0;
let currentSpeed = baseSpeed;
let velocity = new THREE.Vector3(0, 0, -baseSpeed);
const keys = {}; // Fixed crash here!

let isFlipping = false;
let flipProgress = 0;
let flipStartQuat = new THREE.Quaternion();
let flipEndQuat = new THREE.Quaternion();

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Press 'X' for an automatic 180-degree quick turn!
    if (e.code === 'KeyX' && !isFlipping) {
        isFlipping = true;
        flipProgress = 0;
        flipStartQuat.copy(shipGroup.quaternion);
        // Calculate a 180 degree rotation around the ship's local Y (Up) axis
        const flipRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        flipEndQuat.copy(flipStartQuat).multiply(flipRotation);
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Handle window resize nicely
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    // --- CONTROLS: PITCH, YAW, ROLL ---
    if (isFlipping) {
        // Perform the automatic 180 quick-turn
        flipProgress += 0.04; // Adjust this value to make the spin faster/slower
        if (flipProgress >= 1.0) {
            flipProgress = 1.0;
            isFlipping = false;
        }
        shipGroup.quaternion.slerpQuaternions(flipStartQuat, flipEndQuat, flipProgress);
    } else {
        // Normal manual flight controls
        if (keys['KeyW'] || keys['ArrowUp']) shipGroup.rotateX(0.03);     // Pitch up
        if (keys['KeyS'] || keys['ArrowDown']) shipGroup.rotateX(-0.03);  // Pitch down
        if (keys['KeyA'] || keys['ArrowLeft']) shipGroup.rotateY(0.03);   // Yaw left
        if (keys['KeyD'] || keys['ArrowRight']) shipGroup.rotateY(-0.03); // Yaw right
        if (keys['KeyQ']) shipGroup.rotateZ(0.04);                        // Roll left
        if (keys['KeyE']) shipGroup.rotateZ(-0.04);                       // Roll right
    }

    // --- BOOST & BRAKE ---
    let targetSpeed = baseSpeed;
    if (keys['ShiftLeft'] || keys['ShiftRight']) targetSpeed = baseSpeed * 3.0; // Boost
    if (keys['Space']) targetSpeed = baseSpeed * 0.2; // Brake
    
    currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, 0.05);
    
    // Jet flare visually responds to speed
    jet.scale.set(1, currentSpeed / baseSpeed, 1);
    jet.material.opacity = (currentSpeed / baseSpeed) * 0.5;

    // --- SAILING PHYSICS ---
    // Find which way the ship is currently facing
    const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
    
    // Desired velocity is "straight ahead" at our current speed
    const targetVelocity = facing.clone().multiplyScalar(currentSpeed);
    
    // --- BLACK HOLE GRAVITY ---
    const toBlackHole = new THREE.Vector3().subVectors(blackHoleGroup.position, shipGroup.position);
    const distToBHSq = Math.max(toBlackHole.lengthSq(), 1000); // Cap gravity to prevent infinite acceleration at center
    // Inverse square law for gravitational pull
    const gravityForce = toBlackHole.normalize().multiplyScalar(50000 / distToBHSq); // Weakened gravity
    targetVelocity.add(gravityForce);

    // --- SLIPSTREAM WIND LOGIC ---
    let closestDistSq = Infinity;
    let closestData = null;
    
    for (let i = 0; i < slipstreamData.length; i++) {
        const distSq = shipGroup.position.distanceToSquared(slipstreamData[i].point);
        if (distSq < closestDistSq) {
            closestDistSq = distSq;
            closestData = slipstreamData[i];
        }
    }
    
    if (closestDistSq < 100 * 100) { // 100 is the new wider radius of our solar wind tube
        // Apply massive river current boost!
        const streamVelocity = closestData.tangent.clone().multiplyScalar(baseSpeed * 6.0);
        targetVelocity.add(streamVelocity);
        
        // Stronger pull toward the center of the current so you don't easily get spat out
        const toCenter = new THREE.Vector3().subVectors(closestData.point, shipGroup.position).multiplyScalar(0.08);
        targetVelocity.add(toCenter);
        
        // Visual effects for being in the stream (glow + warp speed camera)
        tubeMat.opacity = 0.2; // Brighter when inside
        camera.fov = THREE.MathUtils.lerp(camera.fov, 100, 0.05); 
    } else {
        tubeMat.opacity = 0.05;
        camera.fov = THREE.MathUtils.lerp(camera.fov, 75, 0.05); 
    }
    
    camera.updateProjectionMatrix();

    // Slowly "drift" our actual velocity toward the target velocity (the whip effect)
    velocity.lerp(targetVelocity, 0.015); 

    // --- APPLY MOVEMENT ---
    shipGroup.position.add(velocity);
    
    // Slowly twist the accretion disk
    accretionDisk.rotation.z += 0.01;

    // --- ANIMATE SLIPSTREAM PARTICLES ---
    for (let p of slipstreamParticles) {
        p.t += p.speed;
        if (p.t > 1.0) p.t -= 1.0;
        p.mesh.position.copy(slipstreamCurve.getPointAt(p.t));
    }

    // --- ANIMATE LASERS & ASTEROID COLLISIONS ---
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.mesh.position.add(l.velocity);
        l.age++;
        
        let hit = false;
        for (let a of asteroids) {
            if (!a.isExploding && l.mesh.position.distanceToSquared(a.mesh.position) < 200) { // Collision detected
                a.isExploding = true;
                hit = true;
                break; // One laser hits one asteroid
            }
        }
        if (hit || l.age > 60) { // Remove laser on hit or max range
            scene.remove(l.mesh);
            lasers.splice(i, 1);
        }
    }

    for (let a of asteroids) {
        if (a.isExploding) {
            a.mesh.scale.multiplyScalar(0.8); // Shrink rapidly to "dissipate"
            if (a.mesh.scale.x < 0.05) {
                a.isExploding = false;
                a.mesh.scale.set(1, 1, 1);
                // Respawn far away to keep the map populated
                a.mesh.position.set(
                    shipGroup.position.x + THREE.MathUtils.randFloatSpread(4000),
                    shipGroup.position.y + THREE.MathUtils.randFloatSpread(4000),
                    shipGroup.position.z + THREE.MathUtils.randFloatSpread(4000)
                );
            }
        } else {
            a.mesh.rotation.x += a.rotSpeed.x;
            a.mesh.rotation.y += a.rotSpeed.y;
        }
    }

    // --- UPDATE TRAJECTORY PREDICTION ---
    const steps = 60;
    const timeStep = 3.0; // Scale prediction into the future
    let simPos = shipGroup.position.clone();
    let simVel = velocity.clone();
    
    const linePositions = trajectoryLine.geometry.attributes.position.array;
    for (let i = 0; i < steps; i++) {
        linePositions[i * 3] = simPos.x;
        linePositions[i * 3 + 1] = simPos.y;
        linePositions[i * 3 + 2] = simPos.z;

        // Simulate gravity for this specific future point
        const simToBH = new THREE.Vector3().subVectors(blackHoleGroup.position, simPos);
        const simGravity = simToBH.normalize().multiplyScalar(50000 / Math.max(simToBH.lengthSq(), 1000)); // Match the weakened gravity
        const stepTargetVel = facing.clone().multiplyScalar(currentSpeed).add(simGravity);

        simVel.lerp(stepTargetVel, 0.015);
        simPos.add(simVel.clone().multiplyScalar(timeStep));
    }
    trajectoryLine.geometry.attributes.position.needsUpdate = true;
    trajectoryLine.computeLineDistances(); // Required for the dashed line to render correctly

    // --- CAMERA "CHASE" LOGIC ---
    const offset = new THREE.Vector3(0, 4, 12); 
    offset.applyQuaternion(shipGroup.quaternion); 
    const targetCamPos = shipGroup.position.clone().add(offset);
    camera.position.lerp(targetCamPos, 0.1);
    
    // Update camera "Up" direction so barrel rolls work perfectly
    const targetUp = new THREE.Vector3(0, 1, 0).applyQuaternion(shipGroup.quaternion);
    camera.up.lerp(targetUp, 0.1);
    
    const lookTarget = shipGroup.position.clone().add(facing.clone().multiplyScalar(5));
    camera.lookAt(lookTarget);

    // --- ENDLESS STARFIELD LOGIC ---
    const positions = stars.geometry.attributes.position.array;
    let starMoved = false;
    const bound = 2000;
    const size = 4000;
    
    for (let i = 0; i < positions.length; i += 3) {
        if (positions[i] - camera.position.x > bound) { positions[i] -= size; starMoved = true; }
        else if (positions[i] - camera.position.x < -bound) { positions[i] += size; starMoved = true; }
        
        if (positions[i+1] - camera.position.y > bound) { positions[i+1] -= size; starMoved = true; }
        else if (positions[i+1] - camera.position.y < -bound) { positions[i+1] += size; starMoved = true; }
        
        if (positions[i+2] - camera.position.z > bound) { positions[i+2] -= size; starMoved = true; }
        else if (positions[i+2] - camera.position.z < -bound) { positions[i+2] += size; starMoved = true; }
    }
    if (starMoved) stars.geometry.attributes.position.needsUpdate = true;

    // --- UPDATE UI ---
    const fuelBar = document.getElementById('fuel-bar');
    if (fuelBar) fuelBar.style.width = `${Math.max(0, fuel)}%`;
    
    const velocityDisplay = document.getElementById('velocity-display');
    if (velocityDisplay) velocityDisplay.innerText = `VELOCITY: ${(velocity.length() * 10).toFixed(2)}`;

    composer.render(); // Let the post-processing effects handle the rendering!
}

animate();