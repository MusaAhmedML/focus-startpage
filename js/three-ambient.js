/**
 * Focus Startpage — Elite Three.js Ambient Particle Constellation Engine
 * Renders a GPU-accelerated, dark-minimalist 3D particle field with subtle filaments
 * and smooth mouse parallax. 100% offline, lightweight, and hardware-accelerated.
 */

(function() {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded, skipping ambient 3D background.');
    return;
  }

  let scene, camera, renderer;
  let particles, linesMesh;
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  const PARTICLE_COUNT = 180;
  const particlePositions = [];
  const particleVelocities = [];

  function init() {
    const container = document.getElementById('wallpaper-canvas') || document.body;
    
    // Canvas setup
    const canvas = document.createElement('canvas');
    canvas.id = 'three-ambient-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.75';
    
    const existingCanvas = document.getElementById('three-ambient-canvas');
    if (existingCanvas) existingCanvas.remove();
    document.body.prepend(canvas);

    // Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 700;

    // Renderer with high performance & alpha support
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Geometry & Particle Material
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const baseColor = new THREE.Color(0x8b5cf6); // Violet accent
    const cyanColor = new THREE.Color(0x38bdf8); // Sky accent
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 1600;
      const y = (Math.random() - 0.5) * 1100;
      const z = (Math.random() - 0.5) * 800;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      particlePositions.push(new THREE.Vector3(x, y, z));
      particleVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2
      ));

      // Color variation
      const mix = Math.random();
      const col = mix < 0.6 ? whiteColor : (mix < 0.85 ? cyanColor : baseColor);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle sprite using canvas
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const ctx = particleCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(particleCanvas);

    const material = new THREE.PointsMaterial({
      size: 7,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Event listeners
    document.addEventListener('mousemove', onDocumentMouseMove, { passive: true });
    window.addEventListener('resize', onWindowResize, false);

    animate();
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.4;
    mouseY = (event.clientY - windowHalfY) * 0.4;
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Smooth inertia camera tracking
    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    camera.position.x = targetX * 0.5;
    camera.position.y = -targetY * 0.5;
    camera.lookAt(scene.position);

    // Subtle drift
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = particlePositions[i];
      const vel = particleVelocities[i];

      pos.x += vel.x;
      pos.y += vel.y;
      pos.z += vel.z;

      // Boundary wraps
      if (pos.x < -800) pos.x = 800;
      if (pos.x > 800) pos.x = -800;
      if (pos.y < -550) pos.y = 550;
      if (pos.y > 550) pos.y = -550;

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.00015;

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
