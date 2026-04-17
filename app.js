let scene, camera, renderer, particleSystem;
let particlesCount = 15000;
let targetPositions = new Float32Array(particlesCount * 3);
let currentPositions = new Float32Array(particlesCount * 3);

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < particlesCount * 3; i++) {
        currentPositions[i] = (Math.random() - 0.5) * 10;
        targetPositions[i] = currentPositions[i];
    }

    geo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    const mat = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x00ffcc,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geo, mat);
    scene.add(particleSystem);
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    const posAttr = particleSystem.geometry.attributes.position;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        
        // Deteksi Jari
        const isIndexUp = hand[8].y < hand[6].y;
        const isMiddleUp = hand[12].y < hand[10].y;
        
        // Jarak Jempol ke Kelingking (Buka/Tutup)
        const dist = Math.sqrt(Math.pow(hand[4].x - hand[20].x, 2) + Math.pow(hand[4].y - hand[20].y, 2));

        // Posisi Tangan (Mapping ke Koordinat 3D)
        const hX = (hand[9].x - 0.5) * -10;
        const hY = (hand[9].y - 0.5) * -10;

        for (let i = 0; i < particlesCount; i++) {
            let ix = i * 3;
            let tx, ty, tz;

            // 1. KONDISI: JARI TELUNJUK & TENGAH (PESAWAT)
            if (isIndexUp && isMiddleUp) {
                const ratio = i / particlesCount;
                tx = (ratio - 0.5) * 4; 
                ty = -Math.abs(tx) * 3.5 + 3.5; // Bentuk pesawat
                tz = (i % 2 === 0) ? 1.2 : -1.2;
            } 
            // 2. KONDISI: JARI TELUNJUK SAJA (SATURNUS)
            else if (isIndexUp) {
                const angle = (i / particlesCount) * Math.PI * 2;
                if (i > particlesCount * 0.4) {
                    // Cincin Saturnus
                    tx = Math.cos(angle) * 2.8;
                    ty = Math.sin(angle) * 0.3;
                    tz = Math.sin(angle) * 2.8;
                } else {
                    // Planet (Bola)
                    const phi = Math.acos(-1 + (2 * i) / (particlesCount * 0.4));
                    const theta = Math.sqrt(particlesCount * 0.4 * Math.PI) * phi;
                    tx = Math.cos(theta) * Math.sin(phi) * 1.2;
                    ty = Math.sin(theta) * Math.sin(phi) * 1.2;
                    tz = Math.cos(phi) * 1.2;
                }
            }
            // 3. KONDISI: JARI TENGAH SAJA (BINTANG)
            else if (isMiddleUp) {
                const angle = (i / particlesCount) * Math.PI * 2;
                const r = 2.5 * (Math.abs(Math.sin(angle * 2.5))); // Rumus pola bintang 5 sudut
                tx = Math.cos(angle) * r;
                ty = Math.sin(angle) * r;
                tz = (Math.random() - 0.5) * 0.5;
            }
            // DEFAULT: BOLA BIASA
            else {
                const phi = Math.acos(-1 + (2 * i) / particlesCount);
                const theta = Math.sqrt(particlesCount * Math.PI) * phi;
                tx = Math.cos(theta) * Math.sin(phi) * 2;
                ty = Math.sin(theta) * Math.sin(phi) * 2;
                tz = Math.cos(phi) * 2;
            }

            // Efek Interaksi Telapak Tangan (Mendekat/Menjauh)
            let multiplier = 1.0;
            if (dist > 0.45) multiplier = 2.0; // Tangan terbuka lebar -> Partikel menjauh
            if (dist < 0.15) multiplier = 0.2; // Tangan mengepal -> Partikel mengumpul

            // Animasi Lerp (Perpindahan Halus)
            posAttr.array[ix] += ((tx * multiplier + hX) - posAttr.array[ix]) * 0.1;
            posAttr.array[ix+1] += ((ty * multiplier + hY) - posAttr.array[ix+1]) * 0.1;
            posAttr.array[ix+2] += (tz - posAttr.array[ix+2]) * 0.1;
        }
    }
    posAttr.needsUpdate = true;
});

const videoElement = document.getElementById('video-preview');
const cameraInput = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});

init();
cameraInput.start();

function animate() {
    requestAnimationFrame(animate);

    // Membuat seluruh sistem partikel berputar perlahan secara otomatis
    if (particleSystem) {
        particleSystem.rotation.y += 0.005; // Mengatur kecepatan rotasi horizontal
        particleSystem.rotation.x += 0.002; // Mengatur kecepatan rotasi vertikal
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
