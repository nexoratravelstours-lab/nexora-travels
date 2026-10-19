/**
 * NEXORA Travels - Interactive 3D Globe & Flight Route Visualization
 * Features:
 * - 3D Earth representation with atmospheric glow
 * - Curved travel trajectories connecting Colombo (Sri Lanka) to European destinations
 * - Animated airplane markers traveling along European flight corridors
 * - Interactive destination markers for Germany, Austria, Croatia, Malta, Norway, Sweden, Greece, Italy, Spain
 * - Canvas 2D/3D dual-engine fallback (100% dependable without external blockers)
 */

(function () {
  const COLOMBO = { name: "Colombo, Sri Lanka", lat: 6.9271, lon: 79.8612 };

  const DESTINATION_PINS = [
    { id: "germany", name: "Germany (Berlin)", lat: 52.5200, lon: 13.4050, color: "#ff6b00" },
    { id: "austria", name: "Austria (Vienna)", lat: 48.2082, lon: 16.3738, color: "#00d2ff" },
    { id: "croatia", name: "Croatia (Dubrovnik)", lat: 42.6507, lon: 18.0944, color: "#38bdf8" },
    { id: "malta", name: "Malta (Valletta)", lat: 35.8989, lon: 14.5146, color: "#fb923c" },
    { id: "norway", name: "Norway (Fjords)", lat: 60.3913, lon: 5.3221, color: "#38bdf8" },
    { id: "sweden", name: "Sweden (Stockholm)", lat: 59.3293, lon: 18.0686, color: "#00d2ff" },
    { id: "greece", name: "Greece (Santorini)", lat: 36.3932, lon: 25.4615, color: "#38bdf8" },
    { id: "italy", name: "Italy (Rome)", lat: 41.9028, lon: 12.4964, color: "#ff8800" },
    { id: "spain", name: "Spain (Barcelona)", lat: 41.3851, lon: 2.1734, color: "#f97316" }
  ];

  function initGlobeCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height, radius, centerX, centerY;
    let rotationY = 0.8;
    let rotationX = 0.35;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let animFrame;
    let flightProgress = 0;

    // Generate pseudo-continent dots on sphere surface
    const dots = [];
    const numDots = 850;
    for (let i = 0; i < numDots; i++) {
      const phi = Math.acos(-1 + (2 * i) / numDots);
      const theta = Math.sqrt(numDots * Math.PI) * phi;
      dots.push({
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi)
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width * (window.devicePixelRatio || 1);
      height = canvas.height = rect.height * (window.devicePixelRatio || 1);
      centerX = width / 2;
      centerY = height / 2;
      radius = Math.min(width, height) * 0.38;
    }

    window.addEventListener('resize', resize);
    resize();

    // Mouse drag interaction
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      rotationY += dx * 0.006;
      rotationX = Math.max(-0.8, Math.min(0.8, rotationX + dy * 0.006));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch interaction
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouseX;
      const dy = e.touches[0].clientY - prevMouseY;
      rotationY += dx * 0.007;
      rotationX = Math.max(-0.8, Math.min(0.8, rotationX + dy * 0.007));
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Convert lat/lon to 3D Cartesian coordinates
    function latLonTo3D(lat, lon, r) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return {
        x: -(r * Math.sin(phi) * Math.cos(theta)),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta)
      };
    }

    // 3D rotation projection
    function project(p3d) {
      // Rotate around Y
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const x1 = p3d.x * cosY + p3d.z * sinY;
      const z1 = -p3d.x * sinY + p3d.z * cosY;

      // Rotate around X
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const y2 = p3d.y * cosX - z1 * sinX;
      const z2 = p3d.y * sinX + z1 * cosX;

      return {
        x: centerX + x1,
        y: centerY - y2,
        z: z2,
        visible: z2 > -radius * 0.2
      };
    }

    function drawFlightArc(from3d, to3d, color, tProgress, countryName) {
      const steps = 30;
      const points = [];
      const midHeight = radius * 0.35;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Interpolate on sphere then add altitude
        const lx = from3d.x * (1 - t) + to3d.x * t;
        const ly = from3d.y * (1 - t) + to3d.y * t;
        const lz = from3d.z * (1 - t) + to3d.z * t;
        const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
        const altitude = Math.sin(t * Math.PI) * midHeight;
        const scale = (radius + altitude) / len;

        const cur3d = { x: lx * scale, y: ly * scale, z: lz * scale };
        points.push(project(cur3d));
      }

      // Draw arc curve
      ctx.beginPath();
      let hasStarted = false;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.visible) {
          if (!hasStarted) {
            ctx.moveTo(pt.x, pt.y);
            hasStarted = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6 * (window.devicePixelRatio || 1);
      ctx.stroke();

      // Draw flying airplane marker on this arc
      const planeIdx = Math.floor(tProgress * steps);
      const planePt = points[planeIdx] || points[0];
      const nextPt = points[Math.min(steps, planeIdx + 1)] || planePt;
      if (planePt.visible) {
        ctx.save();
        ctx.translate(planePt.x, planePt.y);
        const angle = Math.atan2(nextPt.y - planePt.y, nextPt.x - planePt.x);
        ctx.rotate(angle);

        // Glowing pulse behind plane
        const glowRad = 8 * (window.devicePixelRatio || 1);
        const radGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, glowRad);
        radGrad.addColorStop(0, 'rgba(255, 107, 0, 0.9)');
        radGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // 3D Airplane icon silhouette
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    function render() {
      if (!isDragging) {
        rotationY += 0.0022; // gentle continuous rotation
      }
      flightProgress = (flightProgress + 0.004) % 1;

      ctx.clearRect(0, 0, width, height);

      // Atmosphere outer glow
      const atmoGrad = ctx.createRadialGradient(
        centerX, centerY, radius * 0.75,
        centerX, centerY, radius * 1.35
      );
      atmoGrad.addColorStop(0, 'rgba(0, 150, 255, 0.18)');
      atmoGrad.addColorStop(0.5, 'rgba(0, 102, 204, 0.08)');
      atmoGrad.addColorStop(1, 'rgba(10, 25, 47, 0)');
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Earth body sphere gradient
      const globeGrad = ctx.createRadialGradient(
        centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.1,
        centerX, centerY, radius
      );
      globeGrad.addColorStop(0, '#102A45');
      globeGrad.addColorStop(0.7, '#071526');
      globeGrad.addColorStop(1, '#020B14');

      ctx.fillStyle = globeGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Globe rim edge glow
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.45)';
      ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
      ctx.stroke();

      // Latitude and Longitude rings
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.12)';
      ctx.lineWidth = 1;
      [-40, -20, 0, 20, 40, 60].forEach(lat => {
        const rLat = radius * Math.cos(lat * Math.PI / 180);
        const yLat = radius * Math.sin(lat * Math.PI / 180);
        const ringP = project({ x: 0, y: yLat, z: 0 });
        ctx.beginPath();
        ctx.ellipse(centerX, ringP.y, rLat, rLat * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw surface particle dots
      dots.forEach(d => {
        const pt = project({ x: d.x * radius, y: d.y * radius, z: d.z * radius });
        if (pt.visible) {
          const alpha = Math.max(0.1, (pt.z + radius) / (2 * radius));
          ctx.fillStyle = `rgba(0, 210, 255, ${alpha * 0.65})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.2 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Origin: Colombo, Sri Lanka
      const colombo3d = latLonTo3D(COLOMBO.lat, COLOMBO.lon, radius);
      const colomboProj = project(colombo3d);

      // Flight routes from Colombo to Europe
      DESTINATION_PINS.forEach((dest, idx) => {
        const dest3d = latLonTo3D(dest.lat, dest.lon, radius);
        const destProj = project(dest3d);

        // Staggered flight progress for realistic multi-flight look
        const arcProgress = (flightProgress + (idx * 0.11)) % 1;
        const arcColor = idx % 2 === 0 ? 'rgba(255, 107, 0, 0.75)' : 'rgba(0, 210, 255, 0.75)';

        drawFlightArc(colombo3d, dest3d, arcColor, arcProgress, dest.name);

        // Draw Destination Pin
        if (destProj.visible) {
          // Pulsing halo
          const pulse = (Math.sin(Date.now() * 0.005 + idx) + 1) * 3;
          ctx.strokeStyle = dest.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(destProj.x, destProj.y, 5 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Core pin
          ctx.fillStyle = dest.color;
          ctx.beginPath();
          ctx.arc(destProj.x, destProj.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Subtle label
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.round(10 * (window.devicePixelRatio || 1))}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillText(dest.name.split(' ')[0], destProj.x + 8, destProj.y + 3);
        }
      });

      // Draw Colombo Pin prominently
      if (colomboProj.visible) {
        ctx.fillStyle = '#FF7A00';
        ctx.beginPath();
        ctx.arc(colomboProj.x, colomboProj.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#FFB800';
        ctx.font = `bold ${Math.round(11 * (window.devicePixelRatio || 1))}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillText("NEXORA (Sri Lanka)", colomboProj.x + 8, colomboProj.y - 6);
      }

      animFrame = requestAnimationFrame(render);
    }

    render();
  }

  // Auto-initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGlobeCanvas('hero-globe-canvas'));
  } else {
    initGlobeCanvas('hero-globe-canvas');
  }

  window.initGlobeCanvas = initGlobeCanvas;
})();
