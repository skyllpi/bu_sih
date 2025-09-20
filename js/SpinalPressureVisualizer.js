import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class SpinalPressureVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.controls = null;
        this.pressureData = [];
        this.websocket = null;
        this.isPaused = false;
        this.viewMode = 'pressure';
        this.pressureTexture = null;
        this.pressureCanvas = null;
        this.pressureContext = null;
        this.gridWidth = 8;
        this.gridHeight = 8;
        this.maxPressure = 0;
        this.avgPressure = 0;
        this.activeSensors = 0;
        this.topPressurePoints = [];
        this.init();
    }

    init() {
        this.initScene();
        this.initPressureTexture();
        this.loadTorsoModel();
        this.initWebSocket();
        this.setupEventListeners();
        this.animate();
        setTimeout(() => this.startSimulation(), 2000);
    }

    initScene() {
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.error("❌ Missing #canvas-container in DOM");
            return;
        }
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 3);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        this.initControls();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 10;
        this.controls.target.set(0, -0.5, 0);
        this.controls.update();
    }

    initPressureTexture() {
        this.pressureCanvas = document.createElement('canvas');
        this.pressureCanvas.width = 256;
        this.pressureCanvas.height = 256;
        this.pressureContext = this.pressureCanvas.getContext('2d');
        this.pressureTexture = new THREE.CanvasTexture(this.pressureCanvas);
        this.pressureTexture.minFilter = THREE.LinearFilter;
        this.pressureTexture.magFilter = THREE.LinearFilter;
    }

    loadTorsoModel() {
        const loader = new GLTFLoader();
        const modelPath = 'models/male_base_mesh_with_muscle_detail/scene.gltf';
        loader.load(modelPath, (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
            model.position.set(0, -1.5, 0);
            model.rotation.y = Math.PI;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.userData.originalMaterial = child.material;
                    child.userData.pressureMaterial = new THREE.MeshStandardMaterial({
                        map: this.pressureTexture,
                        transparent: true,
                        opacity: 0.9,
                        roughness: 0.7,
                    });
                }
            });
            this.scene.add(model);
            this.model = model;
            const loading = document.getElementById('loadingIndicator');
            if (loading) loading.style.display = 'none';
            this.setViewMode('pressure');
        }, (progress) => {
            if (progress.total > 0) {
                const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
                const loadingText = document.querySelector('.loading div:nth-child(2)');
                if (loadingText) {
                    loadingText.textContent = `Loading 3D Model... ${percent}%`;
                }
            }
        }, (error) => {
            console.error('Error loading model:', error);
            this.showErrorMessage();
            this.createFallbackGeometry();
        });
    }

    showErrorMessage() {
        const errorBox = document.getElementById('errorMessage');
        if (errorBox) errorBox.style.display = 'block';
    }

    createFallbackGeometry() {
        const torsoGeometry = new THREE.Group();
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0xfdbcb4,
            transparent: true,
            opacity: 0.8,
        });
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.5, 16), bodyMaterial);
        torso.userData.originalMaterial = bodyMaterial.clone();
        torso.userData.pressureMaterial = new THREE.MeshStandardMaterial({
            map: this.pressureTexture,
            transparent: true,
            opacity: 0.9,
            roughness: 0.7,
        });
        torsoGeometry.add(torso);
        this.scene.add(torsoGeometry);
        this.model = torsoGeometry;
        this.setViewMode('pressure');
    }

    setupEventListeners() {
        const map = {
            pressureBtn: () => this.setViewMode('pressure'),
            anatomyBtn: () => this.setViewMode('anatomy'),
            resetViewBtn: () => this.resetView(),
            pauseBtn: () => this.togglePause(),
            retryBtn: () => location.reload(),
            fallbackBtn: () => this.createFallbackGeometry(),
        };
        for (const [id, handler] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        document.querySelectorAll('.control-button').forEach((btn) => btn.classList.remove('active'));
        if (!this.model) return;
        if (mode === 'pressure') {
            const btn = document.getElementById('pressureBtn');
            if (btn) btn.classList.add('active');
            this.model.traverse((child) => {
                if (child.isMesh && child.userData.pressureMaterial) {
                    child.material = child.userData.pressureMaterial;
                }
            });
        } else {
            const btn = document.getElementById('anatomyBtn');
            if (btn) btn.classList.add('active');
            this.model.traverse((child) => {
                if (child.isMesh && child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            });
        }
    }

    resetView() {
        if (this.model) {
            this.model.rotation.set(0, Math.PI, 0);
            this.model.position.set(0, -1.5, 0);
        }
        this.camera.position.set(0, 0, 3);
        this.controls.target.set(0, -0.5, 0);
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    initWebSocket() {
        setTimeout(() => this.updateConnectionStatus(true), 1000);
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        const text = document.getElementById('connectionText');
        if (!indicator || !text) return;
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    startSimulation() {
        setInterval(() => {
            if (!this.isPaused) {
                this.generateSimulatedData();
                this.updatePressureVisualization();
                this.updateMetrics();
            }
        }, 100);
    }

    generateSimulatedData() {
        this.pressureData = [];
        let total = 0;
        let count = 0;
        const time = Date.now() * 0.001;
        const centerY = this.gridHeight * 0.6;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const dist = Math.abs(x - this.gridWidth / 2) + Math.abs(y - centerY) * 0.5;
                const falloff = Math.max(0, 1 - dist * 0.3);
                const wave = (Math.sin(2 * time + x * 0.5) + Math.cos(1.5 * time + y * 0.7)) * 0.1;
                const breathing = Math.sin(time * 0.8) * 0.2;
                let value = (falloff + wave + breathing) * 45;
                value = Math.max(0, Math.min(50, value));
                if (value > 1) {
                    count++;
                    total += value;
                }
                this.pressureData.push({ x, y, value });
            }
        }
        this.activeSensors = count;
        this.avgPressure = count > 0 ? total / count : 0;
        this.maxPressure = Math.max(...this.pressureData.map((p) => p.value));
        this.updateTopPressurePoints();
    }

    updateTopPressurePoints() {
        const top = [...this.pressureData].filter((p) => p.value > 5).sort((a, b) => b.value - a.value).slice(0, 3);
        const labels = ['L4 Vertebra', 'T12 Region', 'Lumbar'];
        this.topPressurePoints = top.map((p, i) => ({
            location: labels[i] || `Zone ${p.x}-${p.y}`,
            value: p.value,
        }));
    }

    updatePressureVisualization() {
        const ctx = this.pressureContext;
        const canvas = this.pressureCanvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cellW = canvas.width / this.gridWidth;
        const cellH = canvas.height / this.gridHeight;
        for (const p of this.pressureData) {
            const ratio = p.value / 50;
            let r, g, b;
            if (ratio < 0.25) {
                r = 0;
                g = Math.floor(ratio * 4 * 255);
                b = 255;
            } else if (ratio < 0.5) {
                r = 0;
                g = 255;
                b = Math.floor((0.5 - ratio) * 4 * 255);
            } else if (ratio < 0.75) {
                r = Math.floor((ratio - 0.5) * 4 * 255);
                g = 255;
                b = 0;
            } else {
                r = 255;
                g = Math.floor((1 - ratio) * 4 * 255);
                b = 0;
            }
            const alpha = Math.max(0.1, ratio * 0.9);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillRect(p.x * cellW, p.y * cellH, cellW, cellH);
        }
        this.pressureTexture.needsUpdate = true;
    }

    updateMetrics() {
        const maxEl = document.getElementById('maxPressure');
        const avgEl = document.getElementById('avgPressure');
        const activeEl = document.getElementById('activeSensors');
        const pointsEl = document.getElementById('pressurePoints');
        if (maxEl) maxEl.innerHTML = `${this.maxPressure.toFixed(1)}<span class="metric-unit">kPa</span>`;
        if (avgEl) avgEl.innerHTML = `${this.avgPressure.toFixed(1)}<span class="metric-unit">kPa</span>`;
        if (activeEl) activeEl.innerHTML = `${this.activeSensors}<span class="metric-unit">/ 64</span>`;
        if (pointsEl) {
            pointsEl.innerHTML = '';
            if (this.topPressurePoints.length === 0) {
                pointsEl.innerHTML = '<div class="pressure-item"><span class="pressure-location">--</span><span class="pressure-value">--</span></div>';
            } else {
                this.topPressurePoints.forEach((p) => {
                    const div = document.createElement('div');
                    div.className = 'pressure-item';
                    div.innerHTML = `<span class="pressure-location">${p.location}</span><span class="pressure-value">${p.value.toFixed(1)} kPa</span>`;
                    pointsEl.appendChild(div);
                });
            }
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        if (btn) {
            btn.textContent = this.isPaused ? 'Resume' : 'Pause';
            btn.classList.toggle('active', this.isPaused);
        }
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        if (!container || !this.camera || !this.renderer) return;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

export default SpinalPressureVisualizer;