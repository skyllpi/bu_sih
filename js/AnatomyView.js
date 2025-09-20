import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

class AnatomyView {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.controls = null;
        this.currentModelType = "male";
        this.isWireframe = false;
        this.polyCount = 0;
        this.init();
    }

    init() {
        this.initScene();
        this.loadModel(this.currentModelType);
        this.setupEventListeners();
        this.animate();
    }

    initScene() {
        const container = document.getElementById("anatomy-canvas-container");
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2c3e50);
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 3);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        this.scene.add(hemiLight);
        const mainDirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainDirLight.position.set(3, 5, 5);
        this.scene.add(mainDirLight);
        this.initControls();
        window.addEventListener("resize", () => this.onWindowResize());
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, -0.5, 0);
        this.controls.update();
    }

    loadModel(modelType) {
        if (this.model) {
            this.scene.remove(this.model);
        }
        const loadingIndicator = document.getElementById("anatomyLoadingIndicator");
        if (loadingIndicator) loadingIndicator.style.display = "block";
        const loader = new GLTFLoader();
        let modelPath;
        switch (modelType) {
            case "male":
                modelPath = "./models/male_base_mesh_with_muscle_detail/scene.gltf";
                break;
            case "skeleton":
                modelPath = "./models/skeleton/scene.gltf";
                break;
            case "scoliosis":
                modelPath = "./models/scoliosis/scene.gltf";
                break;
            default:
                modelPath = "./models/male_base_mesh_with_muscle_detail/scene.gltf";
        }
        console.log("Loading model from:", modelPath);
        loader.load(modelPath, (gltf) => {
            const model = gltf.scene;
            if (modelType === "skeleton") {
                model.scale.set(1.8, 1.8, 1.8);
                model.position.set(0, -4, 0);
            } else if (modelType === "scoliosis") {
                model.scale.set(0.01, 0.01, 0.01);
                model.position.set(0, -1.5, 0);
            } else {
                model.scale.set(1.5, 1.5, 1.5);
                model.position.set(0, -1.5, 0);
            }
            model.rotation.y = Math.PI;
            this.polyCount = 0;
            model.traverse((child) => {
                if (child.isMesh) {
                    this.polyCount += child.geometry.attributes.position.count / 3;
                }
            });
            this.scene.add(model);
            this.model = model;
            this.currentModelType = modelType;
            this.toggleWireframe(true);
            this.updateModelInfo();
            if (loadingIndicator) loadingIndicator.style.display = "none";
        }, (progress) => {
            if (loadingIndicator) {
                const percent = (progress.loaded / progress.total * 100).toFixed(0);
                loadingIndicator.querySelector("div:last-child").textContent = `Loading... ${percent}%`;
            }
        }, (error) => {
            console.error(`Error loading model:`, error);
            this.createFallbackModel(modelType);
        });
    }

    createFallbackModel() {
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, -1.5, 0);
        this.scene.add(cube);
        this.model = cube;
        this.polyCount = geometry.attributes.position.count / 3;
        this.updateModelInfo();
    }

    updateModelInfo() {
        const modelNames = {
            male: "Male Torso",
            skeleton: "Skeleton",
            scoliosis: "Scoliosis Model",
        };
        document.getElementById("currentModel").textContent = modelNames[this.currentModelType] || "Unknown";
        document.getElementById("polyCount").innerHTML = `${Math.floor(this.polyCount)}<span class="metric-unit"> faces</span>`;
        document.getElementById("modelInfo").innerHTML = `<div class="pressure-item"><span>Wireframe</span><span class="pressure-value">${this.isWireframe ? "On" : "Off"}</span></div>`;
    }

    setupEventListeners() {
        document.getElementById("maleBtn").addEventListener("click", () => this.selectModel("male"));
        document.getElementById("skeletonBtn").addEventListener("click", () => this.selectModel("skeleton"));
        document.getElementById("scoliosisBtn").addEventListener("click", () => this.selectModel("scoliosis"));
        document.getElementById("wireframeBtn").addEventListener("click", () => this.toggleWireframe());
        document.getElementById("resetAnatomyBtn").addEventListener("click", () => this.resetView());
    }

    selectModel(modelType) {
        document.querySelectorAll(".control-panel .control-button").forEach(btn => btn.classList.remove("active"));
        document.getElementById(`${modelType}Btn`).classList.add("active");
        this.loadModel(modelType);
    }

    toggleWireframe(forceUpdate = false) {
        if (!forceUpdate) {
            this.isWireframe = !this.isWireframe;
        }
        document.getElementById("wireframeBtn").classList.toggle("active", this.isWireframe);
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.material.wireframe = this.isWireframe;
                }
            });
        }
        this.updateModelInfo();
    }

    resetView() {
        if (this.model) this.model.rotation.set(0, Math.PI, 0);
        this.camera.position.set(0, 0, 3);
        if (this.controls) {
            this.controls.target.set(0, -0.5, 0);
            this.controls.update();
        }
    }

    onWindowResize() {
        const container = document.getElementById("anatomy-canvas-container");
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }
}

export default AnatomyView;