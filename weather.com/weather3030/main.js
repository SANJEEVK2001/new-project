/* global THREE */

(function () {
  const $ = (id) => document.getElementById(id);

  // ---------- Rotating 3D Earth (Three.js) ----------
  const canvas = $("earth");
  let renderer, scene, camera, earthMesh, cloudsMesh;
  let addLocationMarkerAndZoom = null;

  function initEarth() {
    if (!canvas || typeof THREE === "undefined") return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 8; // Start up close to Earth

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Load texture if available; fallback to a color material.
    const geometry = new THREE.SphereGeometry(5, 64, 64);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a84ff,
      roughness: 1,
      metalness: 0.05,
    });

    earthMesh = new THREE.Mesh(geometry, mat);
    scene.add(earthMesh);

    // Cloud layer slightly larger than the Earth
    const cloudsGeo = new THREE.SphereGeometry(5.05, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending, // Makes black transparent and white opaque
      depthWrite: false
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthMesh.add(cloudsMesh);

    // Atmospheric Glow (Halo Effect)
    const atmosphereGeo = new THREE.SphereGeometry(5.25, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          // Calculate normal vector facing the camera
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // Fresnel effect: Intense at the edges (vNormal.z near 0), transparent at center
          float intensity = pow(1.0 - vNormal.z, 2.5);
          gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0) * intensity * 1.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    earthMesh.add(atmosphereMesh);

    // Lights for a more "3D" look
    const hemi = new THREE.HemisphereLight(0x9bd6ff, 0x0b1020, 0.9);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 3, 8);
    scene.add(dir);

    // "Brahmand" (Universe/Galaxy) Background Animation
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 3000;
    const posArray = new Float32Array(starsCount * 3);
    for(let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 150;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const starMesh = new THREE.Points(starsGeo, starsMat);
    scene.add(starMesh);

    // ---------- Futuristic Orbital Rings ----------
    const ringGeo1 = new THREE.TorusGeometry(6.5, 0.015, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2;
    earthMesh.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(7.5, 0.01, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x7b61ff, transparent: true, opacity: 0.4 });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = Math.PI / 2.2;
    ringMesh2.rotation.y = Math.PI / 8;
    earthMesh.add(ringMesh2);

    // ---------- Distant Planets / Exoplanets ----------
    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);

    const planetLoader = new THREE.TextureLoader();
    const planetData = [
      { radius: 1.5, color: 0xffffff, textureUrl: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/mars_1k_color.jpg", x: -15, y: 8, z: -20 },
      { radius: 0.8, color: 0xffffff, textureUrl: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg", x: 20, y: -5, z: -15 },
      { radius: 2.2, color: 0xffffff, textureUrl: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg", x: 10, y: 12, z: -25 },
      { radius: 1.0, color: 0xffffff, textureUrl: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/venus_surface_2048.jpg", x: -25, y: -10, z: -18 }
    ];

    planetData.forEach(data => {
      const pGeo = new THREE.SphereGeometry(data.radius, 32, 32);
      const pMat = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.8,
        metalness: 0.1
      });

      if (data.textureUrl) {
        planetLoader.load(data.textureUrl, (tex) => {
          pMat.map = tex;
          pMat.needsUpdate = true;
        });
      }

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(data.x, data.y, data.z);
      planetsGroup.add(pMesh);
    });

    // ---------- Large Chunky Asteroids ----------
    const largeAsteroidsGroup = new THREE.Group();
    scene.add(largeAsteroidsGroup);
    
    for(let i = 0; i < 20; i++) {
      const size = 0.4 + Math.random() * 1.2;
      const astGeo = new THREE.DodecahedronGeometry(size, 1);
      
      // Distort vertices to make it look like a jagged space rock
      const posAttribute = astGeo.attributes.position;
      for (let j = 0; j < posAttribute.count; j++) {
        posAttribute.setX(j, posAttribute.getX(j) + (Math.random() - 0.5) * size * 0.3);
        posAttribute.setY(j, posAttribute.getY(j) + (Math.random() - 0.5) * size * 0.3);
        posAttribute.setZ(j, posAttribute.getZ(j) + (Math.random() - 0.5) * size * 0.3);
      }
      astGeo.computeVertexNormals();

      const astMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.2 });
      const astMesh = new THREE.Mesh(astGeo, astMat);
      
      const radius = 15 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 15;
      
      astMesh.position.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
      astMesh.userData = { rotX: (Math.random() - 0.5)*0.02, rotY: (Math.random() - 0.5)*0.02, rotZ: (Math.random() - 0.5)*0.02 };
      largeAsteroidsGroup.add(astMesh);
    }

    // ---------- Asteroid Field ----------
    const asteroidGeo = new THREE.BufferGeometry();
    const asteroidCount = 400;
    const astPosArray = new Float32Array(asteroidCount * 3);
    for(let i = 0; i < asteroidCount * 3; i+=3) {
      const radius = 12 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 8;
      astPosArray[i] = Math.cos(theta) * radius;
      astPosArray[i+1] = y;
      astPosArray[i+2] = Math.sin(theta) * radius;
    }
    asteroidGeo.setAttribute('position', new THREE.BufferAttribute(astPosArray, 3));
    const asteroidMat = new THREE.PointsMaterial({ size: 0.15, color: 0xaaaaaa, transparent: true, opacity: 0.8 });
    const asteroidMesh = new THREE.Points(asteroidGeo, asteroidMat);
    scene.add(asteroidMesh);

    // ---------- Satellite ----------
    const satPivot = new THREE.Group();
    scene.add(satPivot);
    
    const satelliteGroup = new THREE.Group();
    // Sat Body
    const satBodyGeo = new THREE.BoxGeometry(0.2, 0.2, 0.4);
    const satBodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
    satelliteGroup.add(satBody);
    // Sat Solar Panels
    const panelGeo = new THREE.BoxGeometry(0.8, 0.02, 0.25);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1144aa, metalness: 0.6, roughness: 0.4 });
    const panel1 = new THREE.Mesh(panelGeo, panelMat);
    panel1.position.x = 0.5;
    satelliteGroup.add(panel1);
    const panel2 = new THREE.Mesh(panelGeo, panelMat);
    panel2.position.x = -0.5;
    satelliteGroup.add(panel2);
    
    satelliteGroup.position.set(8, 0, 0); // Distance from Earth
    satelliteGroup.rotation.x = Math.PI / 4;
    satPivot.add(satelliteGroup);
    satPivot.rotation.z = Math.PI / 6; // Orbital tilt

    let autoRotate = true;
    let targetCameraPos = new THREE.Vector3(0, 0, 8); // Start target up close
    let marker = null;
    let markerWorldPos = new THREE.Vector3();

    addLocationMarkerAndZoom = (lat, lon) => {
      if (marker) earthMesh.remove(marker);
      
      autoRotate = false; // Stop auto-rotation to focus on the city

      const radius = 5.0;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = (radius * Math.sin(phi) * Math.sin(theta));
      const y = radius * Math.cos(phi);

      const markerGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(x, y, z);
      earthMesh.add(marker);

      // Get the world position of the marker to pull the camera towards it
      earthMesh.updateMatrixWorld();
      marker.getWorldPosition(markerWorldPos);
      
      // Set target camera position closer to the Earth for a "zoom" effect
      targetCameraPos.copy(markerWorldPos).normalize().multiplyScalar(7.5);

      // Initialize tooltip text
      const tooltip = document.getElementById("globe-tooltip");
      if (tooltip) {
        tooltip.innerHTML = `Lat: ${lat.toFixed(2)}<br>Lon: ${lon.toFixed(2)}`;
      }
    };

    // ---------- Interactive Mouse/Touch Drag ----------
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.style.cursor = "grab";

    canvas.addEventListener("pointerdown", (e) => {
      isDragging = true;
      autoRotate = false; // Stop auto-rotation when user takes control
      canvas.style.cursor = "grabbing";
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("pointermove", (e) => {
      if (isDragging && earthMesh) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };

        earthMesh.rotation.y += deltaMove.x * 0.005;
        earthMesh.rotation.x += deltaMove.y * 0.005;

        // Limit vertical rotation to prevent the globe from going completely upside down
        earthMesh.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, earthMesh.rotation.x));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener("pointerup", () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    });

    // ---------- Cinematic Zoom Out Sequence ----------
    setTimeout(() => {
      if (autoRotate && !isDragging) {
        targetCameraPos.set(0, 0, 26); // Smoothly pull back to reveal everything!
      }
    }, 2000); // Waits exactly 2 seconds

    // ---------- Interactive Mouse Scroll Zoom ----------
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault(); // Prevents the whole page from scrolling
      const zoomSpeed = 0.01;
      const zoomDelta = e.deltaY * zoomSpeed;

      let dist = targetCameraPos.length() + zoomDelta;
      dist = Math.max(5.5, Math.min(dist, 40)); // Allow zooming out further
      targetCameraPos.setLength(dist);
    }, { passive: false });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      (tex) => {
        earthMesh.material = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 1,
          metalness: 0.05,
        });
      },
      undefined,
      () => {
        // keep fallback material
      }
    );

    // Load cloud texture map
    textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
      (tex) => {
        cloudsMesh.material.map = tex;
        cloudsMesh.material.needsUpdate = true;
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);

      if (autoRotate) {
        if (earthMesh) earthMesh.rotation.y += 0.002;
        // Apply the smooth cinematic camera movement 
        camera.position.lerp(targetCameraPos, 0.015); 
      } else {
        // Smoothly swoop the camera to look at the city
        camera.position.lerp(targetCameraPos, 0.03);
      }
      camera.lookAt(scene.position);

      // Animate the Universe (Brahmand) background
      if (starMesh) {
        starMesh.rotation.y += 0.0003;
        starMesh.rotation.x += 0.0001;
      }

      // Slowly drift the clouds around the Earth
      if (cloudsMesh) {
        cloudsMesh.rotation.y += 0.0004;
      }

      // Animate the new additions
      if (asteroidMesh) {
        asteroidMesh.rotation.y += 0.0005;
      }
      if (planetsGroup) {
        planetsGroup.rotation.y += 0.0002;
        planetsGroup.children.forEach(planet => {
          planet.rotation.y += 0.0015; // Slow rotation on its own axis
        });
      }
      if (largeAsteroidsGroup) {
        largeAsteroidsGroup.rotation.y += 0.0006;
        largeAsteroidsGroup.children.forEach(ast => {
          ast.rotation.x += ast.userData.rotX;
          ast.rotation.y += ast.userData.rotY;
          ast.rotation.z += ast.userData.rotZ;
        });
      }
      if (satPivot) {
        satPivot.rotation.y += 0.004; // Orbit speed around Earth
        satelliteGroup.rotation.y -= 0.001; // Satellite spinning on its axis
      }
      if (ringMesh1 && ringMesh2) {
        ringMesh1.rotation.z -= 0.001;
        ringMesh2.rotation.z += 0.0015;
      }

      // Update 2D Tooltip Position over the 3D marker
      const tooltip = document.getElementById("globe-tooltip");
      if (marker && tooltip) {
        marker.getWorldPosition(markerWorldPos);
        
        // Check if marker is facing the camera
        const cameraToMarker = new THREE.Vector3().subVectors(markerWorldPos, camera.position).normalize();
        const markerNormal = markerWorldPos.clone().normalize();
        
        // If dot product is negative, they are facing opposite directions (marker is on the front)
        if (cameraToMarker.dot(markerNormal) < -0.2) {
          const vector = markerWorldPos.clone();
          vector.project(camera);
          
          const rect = canvas.getBoundingClientRect();
          const x = rect.left + window.scrollX + (vector.x * 0.5 + 0.5) * rect.width;
          const y = rect.top + window.scrollY + (-(vector.y * 0.5) + 0.5) * rect.height;
          
          tooltip.style.display = "block";
          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
        } else {
          tooltip.style.display = "none"; // Hide if rotated to the back of the globe
        }
      }

      // Subtle "space glow" via light flicker
      if (dir) dir.intensity = 0.75 + Math.sin(Date.now() / 900) * 0.12;

      renderer.render(scene, camera);
    };

    // Resize renderer to canvas box
    const resize = () => {
      // Get dimensions from parent container for full-screen Hero Section
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = width / height; // Prevent stretching on wide screens
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", resize);
    resize();
    animate();
  }

  // ---------- Weather Phrase Mapping ----------
  function getWeatherPhrase(code) {
    const phrases = {
      0: "Clear Sky",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing Rime Fog",
      51: "Light Drizzle",
      53: "Moderate Drizzle",
      55: "Dense Drizzle",
      56: "Light Freezing Drizzle",
      57: "Dense Freezing Drizzle",
      61: "Slight Rain",
      63: "Moderate Rain",
      65: "Heavy Rain",
      66: "Light Freezing Rain",
      67: "Heavy Freezing Rain",
      71: "Slight Snowfall",
      73: "Moderate Snowfall",
      75: "Heavy Snowfall",
      77: "Snow Grains",
      80: "Slight Rain Showers",
      81: "Moderate Rain Showers",
      82: "Violent Rain Showers",
      85: "Slight Snow Showers",
      86: "Heavy Snow Showers",
      95: "Thunderstorm",
      96: "Thunderstorm with Hail",
      99: "Thunderstorm with Heavy Hail",
    };
    return phrases[code] || "Unknown Conditions";
  }

  // ---------- Live Location ----------
  function formatCoord(n) {
    return Number(n).toFixed(5);
  }

  function requestLocation() {
    const locEl = $("location");
    if (!navigator.geolocation) {
      if (locEl) locEl.textContent = "Geolocation not supported";
      return;
    }

    if (locEl) locEl.textContent = "Detecting...";

    // Show floating tooltip while detecting
    const tooltip = document.getElementById("globe-tooltip");
    if (tooltip) {
      tooltip.style.display = "block";
      tooltip.innerHTML = "Detecting location...";
      const rect = $("earth").getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
      tooltip.style.top = `${rect.top + window.scrollY + rect.height / 2}px`;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (locEl) locEl.textContent = `Lat: ${formatCoord(lat)} | Lon: ${formatCoord(lon)}`;

        // Zoom and place a marker on the detected city
        if (typeof addLocationMarkerAndZoom === 'function') {
          addLocationMarkerAndZoom(lat, lon);
        }

        // Update Weather.com-style UI titles
        const locationTitle = document.getElementById("current-location-title");
        if (locationTitle) {
          locationTitle.textContent = `Lat: ${formatCoord(lat)}, Lon: ${formatCoord(lon)}`;
        }

        // Update Live Radar iframe with real earth weather imagery based on location
        const radarIframe = $("liveRadarIframe");
        const toggleRadarBtn = $("toggleRadarBtn");
        const toggleSatelliteBtn = $("toggleSatelliteBtn");
        
        window.userLat = lat; // Save coordinates for map toggles
        window.userLon = lon;

        if (radarIframe) radarIframe.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=5&level=surface&overlay=radar&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
        if (toggleRadarBtn) { toggleRadarBtn.style.display = "inline-block"; toggleRadarBtn.textContent = "Live Radar"; }
        if (toggleSatelliteBtn) toggleSatelliteBtn.style.display = "inline-block";

        // Use BigDataCloud reverse geocode to get city name (no CORS issues)
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
          .then(res => res.json())
          .then(geoData => {
            const city = geoData.city || geoData.locality || "your area";
            window.userCity = city;
            window.userCountryCode = geoData.countryCode || undefined;
            const localityLanguage = geoData.localityLanguage || 'en';

            if (window.setRobotLanguage) {
              window.setRobotLanguage(localityLanguage);
            }

            const fahrenheitCountries = ["US", "LR", "BZ", "KY"];
            const isFahrenheit = fahrenheitCountries.includes(geoData.countryCode);
            const symbol = isFahrenheit ? "°F" : "°C";

            initWeatherMockData(isFahrenheit);
            fetchAndRenderForecast(lat, lon, isFahrenheit);
            fetchAllWeatherData(lat, lon, isFahrenheit, symbol);
          })
          .catch(() => {
            window.userCity = "your area";
            initWeatherMockData(true);
            fetchAndRenderForecast(lat, lon, true);
            fetchAllWeatherData(lat, lon, true, "°F");
          });

        const auroraEl = $("aurora");
        if (lat >= 0) auroraEl.textContent = "Moderate";
        else auroraEl.textContent = "Elevated";
      },
      (err) => {
        if (locEl) locEl.textContent = `Location error: ${err.message || "unknown"}`;
        if (tooltip) {
          tooltip.innerHTML = "Location error";
          setTimeout(() => { tooltip.style.display = "none"; }, 3000);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }


  // ---------- Open-Meteo Weather Data ----------
  function updateElementText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateUVIndex(uvIndex) {
    updateElementText("uvValueLarge", uvIndex.toFixed(1));

    var uvStatus = "Low";
    var uvAdvice = "No protection required.";
    var uvColor = "#00c864";

    if (uvIndex >= 11) {
      uvStatus = "Extreme";
      uvAdvice = "Avoid sun exposure. Wear SPF 50+, protective clothing, and sunglasses.";
      uvColor = "#9b00ff";
    } else if (uvIndex >= 8) {
      uvStatus = "Very High";
      uvAdvice = "Minimize sun exposure between 10am-4pm. SPF 50+ essential.";
      uvColor = "#ff0000";
    } else if (uvIndex >= 6) {
      uvStatus = "High";
      uvAdvice = "Reduce sun exposure between 10am-4pm. Wear SPF 30+ and protective clothing.";
      uvColor = "#ff8c00";
    } else if (uvIndex >= 3) {
      uvStatus = "Moderate";
      uvAdvice = "Wear SPF 30+ and protective clothing during midday hours.";
      uvColor = "#ffc800";
    }

    var uvStatusEl = document.getElementById("uvStatus");
    var uvBarMarkerEl = document.getElementById("uvBarMarker");
    var uvAdviceEl = document.getElementById("uvAdvice");

    if (uvStatusEl) {
      uvStatusEl.textContent = uvStatus;
      uvStatusEl.style.color = uvColor;
    }
    if (uvAdviceEl) uvAdviceEl.textContent = uvAdvice;

    var markerPercent = Math.min(100, (uvIndex / 11) * 100);
    if (uvBarMarkerEl) {
      uvBarMarkerEl.style.left = markerPercent + "%";
      uvBarMarkerEl.style.borderColor = uvColor;
    }
  }

  function updateAirQuality(aqiValue) {
    updateElementText("aqiValue", aqiValue);

    var aqiStatus = "Good";
    var aqiColorClass = "";
    var aqiColor = "#00c864";

    if (aqiValue > 200) {
      aqiStatus = "Very Unhealthy";
      aqiColorClass = "bad";
      aqiColor = "#c80000";
    } else if (aqiValue > 150) {
      aqiStatus = "Unhealthy";
      aqiColorClass = "unhealthy";
      aqiColor = "#ff6400";
    } else if (aqiValue > 100) {
      aqiStatus = "Unhealthy for Sensitive Groups";
      aqiColorClass = "unhealthy";
      aqiColor = "#ff6400";
    } else if (aqiValue > 50) {
      aqiStatus = "Moderate";
      aqiColorClass = "moderate";
      aqiColor = "#ffc800";
    }

    var aqiStatusEl = document.getElementById("aqiStatus");
    var aqiCircleEl = document.getElementById("aqiCircle");

    if (aqiStatusEl) {
      aqiStatusEl.textContent = aqiStatus;
      aqiStatusEl.style.color = aqiColor;
    }
    if (aqiCircleEl) {
      aqiCircleEl.className = "aqi-circle";
      if (aqiColorClass) aqiCircleEl.classList.add(aqiColorClass);
    }
  }

  function fetchAllWeatherData(lat, lon, isFahrenheit, symbol) {
    var unit = isFahrenheit ? "fahrenheit" : "celsius";
    var windUnitLabel = isFahrenheit ? "mph" : "km/h";
    var locationTitle = document.getElementById("current-location-title");
    var tempEl = $("temperature");
    var phraseEl = document.querySelector(".weather-phrase");

    var weatherUrl = "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max" +
      "&hourly=precipitation_probability,precipitation" +
      "&temperature_unit=" + unit + "&wind_speed_unit=" + (isFahrenheit ? "mph" : "kmh") +
      "&timezone=auto&forecast_days=1";

    var aqiUrl = "https://air-quality-api.open-meteo.com/v1/air-quality" +
      "?latitude=" + lat + "&longitude=" + lon +
      "&current=european_aqi,pm10,pm2_5,ozone,nitrogen_dioxide" +
      "&timezone=auto";

    fetch(weatherUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.current) return;

        var current = data.current;
        var daily = data.daily;

        var temp = Math.round(current.temperature_2m);
        if (locationTitle) locationTitle.textContent = (window.userCity || "") + " | " + temp + symbol;
        if (tempEl) tempEl.textContent = temp;

        var phrase = getWeatherPhrase(current.weather_code);
        if (phraseEl) phraseEl.textContent = phrase;

        updateElementText("feelsLike", Math.round(current.apparent_temperature) + "\u00B0");
        updateElementText("humidity", current.relative_humidity_2m + "%");
        updateElementText("windSpeed", Math.round(current.wind_speed_10m) + " " + windUnitLabel);
        updateElementText("windDirection", current.wind_direction_10m + "\u00B0");
        updateElementText("pressure", Math.round(current.surface_pressure) + " hPa");

        var vis = "10+ km";
        var wc = current.weather_code;
        if (wc >= 45 && wc <= 48) vis = "1-2 km";
        else if (wc >= 51 && wc <= 67) vis = "5-8 km";
        else if (wc >= 71 && wc <= 86) vis = "2-5 km";
        else if (wc >= 95) vis = "3-6 km";
        updateElementText("visibility", vis);

        if (daily && daily.sunrise && daily.sunrise[0]) {
          var sr = new Date(daily.sunrise[0]);
          updateElementText("sunrise", sr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
        if (daily && daily.sunset && daily.sunset[0]) {
          var ss = new Date(daily.sunset[0]);
          updateElementText("sunset", ss.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }

        if (daily && daily.precipitation_probability_max) {
          updateElementText("rainChance", daily.precipitation_probability_max[0] + "%");
        }

        if (data.hourly && data.hourly.precipitation) {
          var totalPrecip = 0;
          for (var i = 0; i < data.hourly.precipitation.length; i++) {
            totalPrecip += (data.hourly.precipitation[i] || 0);
          }
          updateElementText("precipitation", totalPrecip.toFixed(1) + " mm");

          var rainHours = 0;
          for (var j = 0; j < data.hourly.precipitation.length; j++) {
            if (data.hourly.precipitation[j] > 0.1) rainHours++;
          }
          updateElementText("rainDuration", rainHours + " hrs");
        }

        var snowProb = 0;
        if (wc >= 71 && wc <= 77) snowProb = 80;
        else if (wc >= 85 && wc <= 86) snowProb = 70;
        else if (daily && daily.temperature_2m_min && daily.temperature_2m_min[0] < 0) snowProb = 20;
        updateElementText("snowChance", snowProb + "%");

        if (daily && daily.uv_index_max) {
          updateUVIndex(daily.uv_index_max[0]);
        }

        updateApiBadge("live");
      })
      .catch(function (err) {
        console.error("Weather fetch failed:", err);
        if (locationTitle) locationTitle.textContent = (window.userCity || "") + " | Error loading weather";
        updateApiBadge("offline");
      });

    fetch(aqiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.current) return;

        var aqi = data.current;
        var aqiValue = aqi.european_aqi || 0;

        updateAirQuality(aqiValue);
        updateElementText("pm25", (aqi.pm2_5 != null ? aqi.pm2_5.toFixed(1) : "--") + " \u00B5g/m\u00B3");
        updateElementText("pm10", (aqi.pm10 != null ? aqi.pm10.toFixed(1) : "--") + " \u00B5g/m\u00B3");
        updateElementText("ozone", (aqi.ozone != null ? aqi.ozone.toFixed(1) : "--") + " \u00B5g/m\u00B3");
        updateElementText("no2", (aqi.nitrogen_dioxide != null ? aqi.nitrogen_dioxide.toFixed(1) : "--") + " \u00B5g/m\u00B3");
      })
      .catch(function (err) {
        console.error("Air quality fetch failed:", err);
      });
  }

  // ---------- Search City ----------
  function initSearch() {
    var searchInput = document.querySelector('.search-input');
    var suggestionsBox = document.getElementById('search-suggestions');
    if (!searchInput) return;

    var debounceTimer;

    if (suggestionsBox) {
      searchInput.addEventListener('input', function (e) {
        var query = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
          suggestionsBox.style.display = 'none';
          return;
        }

        debounceTimer = setTimeout(function () {
          fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=5&language=en&format=json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
              if (!data.results || data.results.length === 0) {
                suggestionsBox.style.display = 'none';
                return;
              }
              suggestionsBox.innerHTML = '';
              data.results.forEach(function (result) {
                var item = document.createElement('div');
                item.className = 'suggestion-item';
                var parts = [result.name];
                if (result.admin1 && result.admin1 !== result.name) parts.push(result.admin1);
                if (result.country) parts.push(result.country);
                var locationName = parts.join(', ');
                item.textContent = locationName;
                item.addEventListener('click', function () {
                  searchInput.value = locationName;
                  suggestionsBox.style.display = 'none';
                  performSearch(locationName, result.latitude, result.longitude, result.country_code);
                  searchInput.value = '';
                });
                suggestionsBox.appendChild(item);
              });
              suggestionsBox.style.display = 'block';
            })
            .catch(function () {
              suggestionsBox.style.display = 'none';
            });
        }, 300);
      });

      document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
          suggestionsBox.style.display = 'none';
        }
      });
    }

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && searchInput.value.trim() !== '') {
        performSearch(searchInput.value.trim());
        searchInput.blur();
        searchInput.value = '';
        if (suggestionsBox) suggestionsBox.style.display = 'none';
      }
    });
  }

  function performSearch(query, lat, lon, countryCode) {
    var tooltip = document.getElementById("globe-tooltip");
    if (tooltip) {
      tooltip.style.display = "block";
      tooltip.innerHTML = 'Searching for "' + query + '"...';
      var rect = $("earth").getBoundingClientRect();
      tooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + "px";
      tooltip.style.top = (rect.top + window.scrollY + rect.height / 2) + "px";
    }

    if (lat === undefined || lon === undefined) {
      fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=1&language=en&format=json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.results || data.results.length === 0) {
            if (tooltip) {
              tooltip.innerHTML = "City not found";
              setTimeout(function () { tooltip.style.display = "none"; }, 3000);
            }
            return;
          }
          var result = data.results[0];
          performSearch(query, result.latitude, result.longitude, result.country_code);
        })
        .catch(function () {
          if (tooltip) {
            tooltip.innerHTML = "Search failed";
            setTimeout(function () { tooltip.style.display = "none"; }, 3000);
          }
        });
      return;
    }

    window.userLat = lat;
    window.userLon = lon;
    window.userCity = query.split(',')[0].trim();
    window.userCountryCode = countryCode || undefined;

    if (typeof addLocationMarkerAndZoom === 'function') {
      addLocationMarkerAndZoom(lat, lon);
    }

    var radarIframe = $("liveRadarIframe");
    if (radarIframe) {
      var isSatellite = radarIframe.src.includes('overlay=satellite');
      var overlay = isSatellite ? 'satellite' : 'radar';
      var product = isSatellite ? 'satellite' : 'radar';
      radarIframe.src = 'https://embed.windy.com/embed2.html?lat=' + lat + '&lon=' + lon + '&zoom=5&level=surface&overlay=' + overlay + '&product=' + product + '&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1';
    }
    var toggleRadarBtn = $("toggleRadarBtn");
    var toggleSatelliteBtn = $("toggleSatelliteBtn");
    if (toggleRadarBtn) toggleRadarBtn.style.display = "inline-block";
    if (toggleSatelliteBtn) toggleSatelliteBtn.style.display = "inline-block";

    var fahrenheitCountries = ["US", "LR", "BZ", "KY"];
    var isFahrenheit = fahrenheitCountries.includes(countryCode);
    var symbol = isFahrenheit ? "\u00B0F" : "\u00B0C";

    initWeatherMockData(isFahrenheit);
    fetchAndRenderForecast(lat, lon, isFahrenheit);

    var locationTitle = document.getElementById("current-location-title");
    if (locationTitle) locationTitle.textContent = query + " | Loading...";

    fetchAllWeatherData(lat, lon, isFahrenheit, symbol);
  }

  // ---------- 10-Day Forecast API Integration ----------
  function fetchAndRenderForecast(lat, lon, isFahrenheit) {
    const tenDayContainer = $("ten-day-forecast");
    if (!tenDayContainer) return;

    // Display a loading state immediately
    tenDayContainer.innerHTML = '<div class="daily-item" style="justify-content: center;">Loading 10-day forecast...</div>';

    const unit = isFahrenheit ? "fahrenheit" : "celsius";
    // Fetch 10 days of data from Open-Meteo
    const windUnit = isFahrenheit ? "mph" : "kmh";
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relativehumidity_2m_mean,windspeed_10m_max,uv_index_max&temperature_unit=${unit}&windspeed_unit=${windUnit}&timezone=auto&forecast_days=10`;

    // Radar forecast (10-day, rain timing) using hourly precipitation probability
    fetchAndRenderRadar10Day(lat, lon, isFahrenheit);

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.daily || !data.daily.time) {
          tenDayContainer.innerHTML = '<div class="daily-item" style="justify-content: center;">Forecast data unavailable.</div>';
          return;
        }

        let tenDayHTML = "";
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const forecastDays = data.daily.time;

        forecastDays.forEach((dateString, i) => {
          // Use UTC date to avoid timezone-related "off-by-one-day" errors
          const date = new Date(dateString + 'T00:00:00Z');
          const dayName = i === 0 ? "Today" : days[date.getUTCDay()];
          
          const high = Math.round(data.daily.temperature_2m_max[i]);
          const low = Math.round(data.daily.temperature_2m_min[i]);
          const precip = data.daily.precipitation_probability_max[i];
          const humidity = Math.round(data.daily.relativehumidity_2m_mean[i]);
          const wind = Math.round(data.daily.windspeed_10m_max[i]);
          const uv = Math.round(data.daily.uv_index_max[i]);

          tenDayHTML += `
            <div class="daily-item" data-speakable>
                <div class="daily-item-summary">
                    <div style="flex: 1; font-weight: bold;">${dayName}</div>
                    <div style="flex: 1; color: #64b5f6;">💧 ${precip}%</div>
                    <div style="flex: 1; text-align: right;">
                        <span style="font-weight: bold;">${high}°</span>
                        <span style="opacity: 0.7;">${low}°</span>
                    </div>
                    <div class="expand-icon"></div>
                </div>
                <div class="daily-item-details">
                    <p>A high of <strong>${high}°</strong> and a low of <strong>${low}°</strong>.
                    <br>Wind: up to <strong>${wind} ${windUnit}</strong>.
                    <br>Humidity: <strong>${humidity}%</strong> (avg).
                    <br>Max UV Index: <strong>${uv}</strong>.
                    </p>
                </div>
            </div>`;
        });

        tenDayContainer.innerHTML = tenDayHTML;
      })
      .catch(err => {
        console.error("10-Day Forecast fetch failed:", err);
        tenDayContainer.innerHTML = '<div class="daily-item" style="justify-content: center;">Error loading forecast.</div>';
      });
  }

  // ---------- 10-Day Radar View (Forecast) ----------
  function fetchAndRenderRadar10Day(lat, lon, isFahrenheit) {
    const canvas = $("radar10dayCanvas");
    const select = $("radar10dayBinSelect");
    const details = $("radar10dayDetails");
    if (!canvas || !select || !details) return;

    const rows = 10; // days
    const cols = 6; // time bins (every 4 hours)
    const timeBins = [0, 4, 8, 12, 16, 20]; // hour of day (local time)

    // clear state
    select.innerHTML = "";
    details.textContent = "Loading 10-day radar forecast…";

    const windUnit = isFahrenheit ? "mph" : "kmh";
    const hourlyUnitWind = isFahrenheit ? "mph" : "kmh";

    // hourly precipitation_probability and windspeed_10m
    // forecast_days=10 gives enough future hourly points for local time bins
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability,wind_speed_10m&forecast_days=10&timezone=auto&windspeed_unit=${hourlyUnitWind}&temperature_unit=${isFahrenheit ? "fahrenheit" : "celsius"}`;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const hourly = data?.hourly;
        if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.precipitation_probability)) {
          details.textContent = "Radar forecast unavailable for this location.";
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        // Build bins: [dayIndex][colIndex] => probability, wind, datetime
        const timeArr = hourly.time; // ISO strings in local timezone (because timezone=auto)
        const popArr = hourly.precipitation_probability;
        const windArr = hourly.wind_speed_10m || [];

        const binCells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

        // Determine "today" start based on first timestamp's local date
        const firstDate = new Date(timeArr[0]);
        const startDateLocal = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());

        // Helper: map a timestamp to dayIndex + colIndex (nearest bin hour)
        for (let i = 0; i < timeArr.length; i++) {
          const dt = new Date(timeArr[i]);
          const localDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
          const dayIndex = Math.floor((localDate - startDateLocal) / (24 * 60 * 60 * 1000));

          if (dayIndex < 0 || dayIndex >= rows) continue;

          const hour = dt.getHours();
          // Snap to nearest bin by hour-of-day (exact match to bins)
          const binIndex = timeBins.indexOf(hour);
          if (binIndex === -1) continue;

          // if multiple samples match, keep the maximum probability
          const pop = typeof popArr[i] === "number" ? popArr[i] : parseFloat(popArr[i]);
          const wind = typeof windArr[i] === "number" ? windArr[i] : parseFloat(windArr[i]);

          const existing = binCells[dayIndex][binIndex];
          if (!existing || (Number.isFinite(pop) && pop > existing.precipProb)) {
            binCells[dayIndex][binIndex] = {
              dt,
              precipProb: Number.isFinite(pop) ? pop : 0,
              windSpeed: Number.isFinite(wind) ? wind : null
            };
          }
        }

        // Fill select options for each bin
        // Use details when user picks a specific bin
        const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
        const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });

        for (let d = 0; d < rows; d++) {
          for (let c = 0; c < cols; c++) {
            const cell = binCells[d][c];
            const labelDay = cell?.dt ? dateFormatter.format(cell.dt) : `Day ${d + 1}`;
            const labelTime = cell?.dt ? timeFormatter.format(cell.dt) : `${timeBins[c]}:00`;
            const optionValue = `${d}-${c}`;
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = `${labelDay} • ${labelTime}`;
            select.appendChild(option);
          }
        }

        // Default select first cell that exists
        const firstNonNull = (() => {
          for (let d = 0; d < rows; d++) for (let c = 0; c < cols; c++) if (binCells[d][c]) return `${d}-${c}`;
          return "0-0";
        })();

        select.value = firstNonNull;

        // Render canvas
        renderRadarGrid(canvas, binCells, rows, cols);

        // Update details initially
        updateRadarDetailsFromSelect();
        select.onchange = updateRadarDetailsFromSelect;

        function updateRadarDetailsFromSelect() {
          const [dStr, cStr] = (select.value || "").split("-");
          const d = parseInt(dStr, 10);
          const c = parseInt(cStr, 10);

          const cell = binCells[d]?.[c];
          if (!cell) {
            details.textContent = "No radar/precipitation data for this timing bin.";
            return;
          }

          const dayName = dateFormatter.format(cell.dt);
          const timeStr = timeFormatter.format(cell.dt);
          const windPart = cell.windSpeed == null ? "" : ` • Wind ~${Math.round(cell.windSpeed)} ${windUnit}`;

          details.textContent = `Rain chance: ${Math.round(cell.precipProb)}% at ${timeStr}, ${dayName}${windPart}.`;
        }
      })
      .catch(err => {
        console.error("10-day radar forecast fetch failed:", err);
        details.textContent = "Failed to load radar forecast.";
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      });

    function renderRadarGrid(canvasEl, cells, rowsCount, colsCount) {
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;

      // set drawing sizes based on canvas pixel dimensions
      const W = canvasEl.width;
      const H = canvasEl.height;

      ctx.clearRect(0, 0, W, H);

      // grid layout padding
      const pad = 14;
      const gridW = W - pad * 2;
      const gridH = H - pad * 2;

      const cellW = gridW / colsCount;
      const cellH = gridH / rowsCount;

      // draw background grid
      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.fillRect(0, 0, W, H);

      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < colsCount; c++) {
          const cell = cells[r]?.[c];
          const x = pad + c * cellW;
          const y = pad + r * cellH;

          const pop = cell?.precipProb ?? 0; // 0..100
          const t = Math.max(0, Math.min(1, pop / 100));

          // radar-like palette: cyan->blue->violet->red with opacity
          const alpha = 0.12 + t * 0.78;
          const rCol = Math.round(20 + t * 200);
          const gCol = Math.round(220 - t * 120);
          const bCol = Math.round(255 - t * 30);

          ctx.fillStyle = `rgba(${rCol},${gCol},${bCol},${alpha})`;
          ctx.fillRect(x + 1, y + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));

          // grid lines
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);

          // label small probability if high
          if (pop >= 60) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${Math.round(pop)}%`, x + cellW / 2, y + cellH / 2);
          }
        }
      }
    }
  }

  // ---------- Live Clock ----------
  let liveClockTimerId = null;

  function startLiveClock() {
    const timeEl = $("current-time");
    if (!timeEl) return;

    const renderTime = () => {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Render immediately, then tick every second
    renderTime();
    if (liveClockTimerId) clearInterval(liveClockTimerId);

    liveClockTimerId = setInterval(renderTime, 1000);
  }

  // ---------- Temperature (placeholder) ----------
  // Real temperature is fetched from the weather API based on location.
  function initTemperaturePlaceholder() {
    const tempEl = $("temperature");
    if (tempEl) tempEl.textContent = "72";
  }

  // ---------- Space Weather Cards (demo animation) ----------
  function initSpaceWeatherDemo() {
    const solarWind = $("solarWind");
    const radIndex = $("radIndex");
    const satRisk = $("satRisk");
    const aurora = $("aurora");

    let t = 0;
    setInterval(() => {
      t += 1;

      const wind = 520 + Math.round(Math.sin(t / 5) * 140 + Math.random() * 40);
      solarWind.textContent = `${Math.max(250, wind)} km/s`;

      const riskRoll = Math.random();
      satRisk.textContent = riskRoll > 0.82 ? "High" : riskRoll > 0.52 ? "Medium" : "Low";

      const rad = 1 + Math.round(Math.abs(Math.cos(t / 6) * 8));
      radIndex.textContent = `${rad}/10`;

      const aRoll = 0.4 + Math.random() * 0.6;
      aurora.textContent = aRoll > 0.82 ? "Strong" : aRoll > 0.62 ? "Moderate" : "Low";
    }, 1800);
  }

  // ---------- 4D Weather Visual Demo (Sun + Rain + Clouds) ----------
  let rainOn = false;

  function initRainViz() {
    const rainViz = $("rainViz");
    const stormBtn = $("stormBtn");
    const rainBtn = $("rainBtn");

    if (!rainViz || !stormBtn || !rainBtn) return;

    function makeDrops(count) {
      // Clear old drops if any
      rainViz.innerHTML = "";
      rainViz.style.position = "relative";

      for (let i = 0; i < count; i++) {
        const drop = document.createElement("div");
        drop.className = "rain-drop";
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${0.7 + Math.random() * 1.2}s`;
        drop.style.animationDelay = `${Math.random() * 0.6}s`;
        drop.style.opacity = `${0.35 + Math.random() * 0.6}`;
        rainViz.appendChild(drop);
      }
    }

    makeDrops(180);

    function setRain(enabled) {
      rainOn = enabled;
      rainViz.style.display = enabled ? "block" : "none";
    }

    setRain(false);

    rainBtn.addEventListener("click", () => {
      setRain(!rainOn);
      // When turning on, re-randomize for a "4D feel"
      if (!rainOn) makeDrops(180 + Math.floor(Math.random() * 80));
    });

    stormBtn.addEventListener("click", () => {
      // quick pulse: stronger rain for a moment
      setRain(true);
      makeDrops(280 + Math.floor(Math.random() * 120));
      const prev = rainViz.style.filter;
      rainViz.style.filter = "hue-rotate(15deg) saturate(1.25)";

      setTimeout(() => {
        rainViz.style.filter = prev || "none";
        if (Math.random() > 0.35) setRain(false);
      }, 1400);
    });

    // Live Radar & Satellite Toggle Logic
    const toggleRadarBtn = $("toggleRadarBtn");
    const toggleSatelliteBtn = $("toggleSatelliteBtn");
    const abstractViz = $("abstractViz");
    const liveRadarIframe = $("liveRadarIframe");
    let vizMode = "abstract"; // abstract, radar, satellite

    function setVizMode(mode) {
      vizMode = mode;
      if (mode === "abstract") {
        abstractViz.style.opacity = "1";
        abstractViz.style.pointerEvents = "auto";
        liveRadarIframe.style.opacity = "0";
        liveRadarIframe.style.pointerEvents = "none";
        if (toggleRadarBtn) toggleRadarBtn.textContent = "Live Radar";
        if (toggleSatelliteBtn) toggleSatelliteBtn.textContent = "Real Earth";
      } else {
          abstractViz.style.opacity = "0";
          abstractViz.style.pointerEvents = "none";
          liveRadarIframe.style.opacity = "1";
          liveRadarIframe.style.pointerEvents = "auto";
          
          if (mode === "radar") {
            liveRadarIframe.src = `https://embed.windy.com/embed2.html?lat=${window.userLat}&lon=${window.userLon}&zoom=5&level=surface&overlay=radar&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
            if (toggleRadarBtn) toggleRadarBtn.textContent = "View 4D Viz";
            if (toggleSatelliteBtn) toggleSatelliteBtn.textContent = "Real Earth";
          } else if (mode === "satellite") {
            liveRadarIframe.src = `https://embed.windy.com/embed2.html?lat=${window.userLat}&lon=${window.userLon}&zoom=5&level=surface&overlay=satellite&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
            if (toggleSatelliteBtn) toggleSatelliteBtn.textContent = "View 4D Viz";
            if (toggleRadarBtn) toggleRadarBtn.textContent = "Live Radar";
          }
        }
    }

    if (toggleRadarBtn && toggleSatelliteBtn && abstractViz && liveRadarIframe) {
      toggleRadarBtn.addEventListener("click", () => setVizMode(vizMode === "radar" ? "abstract" : "radar"));
      toggleSatelliteBtn.addEventListener("click", () => setVizMode(vizMode === "satellite" ? "abstract" : "satellite"));
    }
  }

  // ---------- AI Assistant (voice) ----------
  function initAI() {
    const aiBtn = $("aiBtn");
    const statusEl = $("assistantStatus");
    const outEl = $("assistantOutput");

    if (!aiBtn || !statusEl || !outEl) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    function ensureRecognition() {
      if (recognition) return recognition;
      if (!SpeechRecognition) return null;

      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        statusEl.textContent = "Listening...";
        outEl.textContent = "";
      };

      recognition.onerror = (event) => {
        statusEl.textContent = "Voice error";
        outEl.textContent = `Error: ${event.error || "unknown"}`;
      };

      recognition.onresult = (event) => {
        const transcript = (event.results?.[0]?.[0]?.transcript || "").trim();
        statusEl.textContent = "Recognized";
        if (!transcript) {
          outEl.textContent = "I heard nothing. Try again.";
          return;
        }
        const answer = respondToCommand(transcript);
        outEl.textContent = `You said: "${transcript}"\n\n${answer}`;
      };

      recognition.onend = () => {
        if (statusEl.textContent === "Listening...") statusEl.textContent = "Idle";
      };

      return recognition;
    }

    function respondToCommand(text) {
      const t = text.toLowerCase();

      if (t.includes("rain") && (t.includes("today") || t.includes("now") || t.includes("will"))) {
        return "Rain likelihood today: 58% (demo). Tip: carry a light umbrella.";
      }

      if (t.includes("2050") || t.includes("climate prediction")) {
        return "2050 climate outlook (demo): warmer by ~1.7–2.4°C depending on emissions. Heat risk increases, rainfall becomes more variable.";
      }

      if (t.includes("air quality") || t.includes("aqi")) {
        return "Air quality (demo): AQI 42 (Moderate). Improve ventilation and limit outdoor activity during peak hours.";
      }

      if (t.includes("space") || t.includes("storm") || t.includes("solar")) {
        return "Space weather (demo): Aurora chances are moderate. If you’re operating satellites/aviation, monitor risk updates.";
      }

      if (t.includes("help")) {
        return "Try: “will it rain today”, “show climate prediction for 2050”, “display air quality”, or “space weather”.";
      }

      return "Command not recognized. Say “help” for examples.";
    }

    aiBtn.addEventListener("click", () => {
      const rec = ensureRecognition();
      if (!rec) {
        statusEl.textContent = "Voice not supported";
        outEl.textContent = "Your browser doesn’t support Web Speech API. Try Chrome/Edge.";
        return;
      }
      statusEl.textContent = "Starting...";
      rec.start();
    });

    // ---------- Interactive AI News Insights ----------
    const newsItems = document.querySelectorAll(".ai-news-list li");
    newsItems.forEach(item => {
      item.addEventListener("click", () => {
        const topic = item.querySelector("div").textContent.trim();
        statusEl.textContent = "Generating Insight...";
        outEl.textContent = `Analyzing: "${topic}"\n\nAccording to recent data models, this trend indicates significant shifts in global patterns. Our AI suggests monitoring these developments closely for localized weather impacts over the next 5-10 days.`;
      });
    });
  }

  // ---------- Nav Buttons ----------
  function initNavButtons() {
    $("locBtn")?.addEventListener("click", () => requestLocation());
    $("spacePulseBtn")?.addEventListener("click", () => {
      const aurora = $("aurora");
      if (!aurora) return;
      aurora.textContent = "Elevated";
      setTimeout(() => (aurora.textContent = "Moderate"), 900);
    });
  }

  // ---------- Weather.com Mock Data Generation ----------
  function initWeatherMockData(isFahrenheit = true) {
    const hourlyContainer = $("hourly-forecast");
    
    // Adjust base mock temperatures depending on unit
    const baseHourly = isFahrenheit ? 72 : 22;
    const baseHigh = isFahrenheit ? 70 : 21;
    const varRange = isFahrenheit ? 8 : 4;
    const highVar = isFahrenheit ? 12 : 6;
    const lowDiff = isFahrenheit ? 10 : 5;

    if (hourlyContainer) {
      let hourlyHTML = "";
      let currentHour = new Date().getHours();
      const conditions = ["☀️ Sunny", "⛅ Partly Cloudy", "☁️ Cloudy", "🌧️ Rain"];
      for (let i = 0; i < 8; i++) {
        let time = (currentHour + i) % 24;
        let ampm = time >= 12 ? "PM" : "AM";
        time = time % 12;
        time = time ? time : 12;
        let temp = baseHourly - Math.floor(Math.random() * varRange);
        let cond = conditions[Math.floor(Math.random() * conditions.length)];
        hourlyHTML += `<div class="hourly-item" data-speakable><div>${i === 0 ? "Now" : time + " " + ampm}</div><div style="font-size: 1.5rem; margin: 5px 0;">${temp}°</div><div style="font-size: 0.8rem">${cond}</div></div>`;
      }
      hourlyContainer.innerHTML = hourlyHTML;
    }

    const tenDayContainer = $("ten-day-forecast");
    if (tenDayContainer) {
      let tenDayHTML = "";
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let currentDay = new Date().getDay();
      for (let i = 0; i < 10; i++) {
        let dayName = i === 0 ? "Today" : days[(currentDay + i) % 7];
        let high = baseHigh + Math.floor(Math.random() * highVar);
        let low = high - lowDiff - Math.floor(Math.random() * varRange);
        let precip = Math.floor(Math.random() * 30);
        let wind = 10 + Math.floor(Math.random() * 15);
        let humidity = 40 + Math.floor(Math.random() * 30);
        let uv = Math.floor(Math.random() * 8);
        const windUnit = isFahrenheit ? "mph" : "kmh";

        tenDayHTML += `
          <div class="daily-item" data-speakable>
              <div class="daily-item-summary">
                  <div style="flex: 1; font-weight: bold;">${dayName}</div>
                  <div style="flex: 1; color: #64b5f6;">💧 ${precip}%</div>
                  <div style="flex: 1; text-align: right;">
                      <span style="font-weight: bold;">${high}°</span>
                      <span style="opacity: 0.7;">${low}°</span>
                  </div>
                  <div class="expand-icon"></div>
              </div>
              <div class="daily-item-details">
                  <p>Mock Details:
                    <br>Wind: <strong>${wind} ${windUnit}</strong>.
                    <br>Humidity: <strong>${humidity}%</strong>.
                    <br>Max UV Index: <strong>${uv}</strong>.
                  </p>
              </div>
          </div>`;
      }
      tenDayContainer.innerHTML = tenDayHTML;
    }
  }

  // ---------- Breaking News (NewsAPI top headlines + categories) ----------
  function initBreakingNews() {
    const subtitle = document.getElementById("breakingNewsSubtitle");
    const listEl = document.getElementById("breakingNewsList");
    const categoriesEl = document.getElementById("breakingNewsCategories");
    if (!subtitle || !listEl || !categoriesEl) return;

    const apiKey = window.NEWSAPI_KEY;
    const renderError = (msg) => {
      subtitle.textContent = msg;
      listEl.innerHTML = "";
    };

    const renderLoading = (label) => {
      subtitle.textContent = label || "Loading top headlines…";
      listEl.innerHTML = "";
    };

    if (!apiKey || String(apiKey).includes("YOUR_") || String(apiKey).includes("NEWSAPI_KEY")) {
      renderError("Set window.NEWSAPI_KEY to fetch headlines.");
      return;
    }

    const city = window.userCity || "your city";
    const countryCode = window.userCountryCode || "";
    const q = city;

    // NewsAPI supports these categories: business, entertainment, general, health, science, sports, technology
    // Map requested categories into nearest NewsAPI buckets.
    const categories = [
      { id: "all", label: "All", newsapiCategory: null },
      { id: "politics", label: "Politics", newsapiCategory: "general" },
      { id: "crime", label: "Crime & Justice", newsapiCategory: "general" },
      { id: "jobs", label: "Jobs & Governance", newsapiCategory: "general" },
      { id: "economy", label: "Economy & Inflation", newsapiCategory: "business" },
      { id: "entertainment", label: "Entertainment & Bollywood", newsapiCategory: "entertainment" },
      { id: "weather", label: "Weather & Climate", newsapiCategory: "science" },
      { id: "sports", label: "Sports", newsapiCategory: "sports" },
      { id: "international", label: "International News", newsapiCategory: "general" },
      { id: "tech", label: "Tech & Gadgets", newsapiCategory: "technology" },
      { id: "health", label: "Health & Wellness", newsapiCategory: "health" },
    ];

    const makeCategoryButton = (cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "breaking-news-category";
      btn.dataset.categoryId = cat.id;
      btn.textContent = cat.label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", "false");
      return btn;
    };

    categoriesEl.innerHTML = "";
    categories.forEach((c) => categoriesEl.appendChild(makeCategoryButton(c)));

    let activeCategoryId = "all";

    const setActive = (categoryId) => {
      activeCategoryId = categoryId;
      const buttons = categoriesEl.querySelectorAll(".breaking-news-category");
      buttons.forEach((b) => {
        const isActive = b.dataset.categoryId === categoryId;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    };

    const fetchHeadlines = async (cat) => {
      // Per your choice: "All" should use top-headlines default (no category param).
      // For other buckets we add NewsAPI category param.
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("pageSize", "10");
      params.set("language", "en");

      if (countryCode) params.set("country", String(countryCode).toUpperCase());

      if (cat.newsapiCategory) params.set("category", cat.newsapiCategory);

      params.set("apiKey", apiKey);

      const url = `https://newsapi.org/v2/top-headlines?${params.toString()}`;

      return fetch(url).then((res) => res.json());
    };

    const renderArticles = (data, cat) => {
      if (!data || data.status !== "ok" || !Array.isArray(data.articles)) {
        renderError("Headlines unavailable for this location.");
        return;
      }

      const articles = data.articles.slice(0, 10);
      if (articles.length === 0) {
        renderError("No headlines found.");
        return;
      }

      const readableCat = cat.label;
      const loc = city ? `for ${city}` : "for your location";
      const c = countryCode ? `, ${countryCode}` : "";
      subtitle.textContent = `${readableCat} ${loc}${c}`.trim();

      listEl.innerHTML = "";
      articles.forEach((a) => {
        const title = a.title || "Untitled";
        const url = a.url || "#";

        const item = document.createElement("div");
        item.className = "breaking-news-item";
        item.setAttribute("role", "listitem");

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = title;

        item.appendChild(link);
        listEl.appendChild(item);
      });
    };

    categoriesEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".breaking-news-category");
      if (!btn) return;

      const categoryId = btn.dataset.categoryId;
      const cat = categories.find((c) => c.id === categoryId) || categories[0];

      setActive(categoryId);
      renderLoading(`Loading ${cat.label}…`);

      fetchHeadlines(cat)
        .then((data) => renderArticles(data, cat))
        .catch(() => renderError("Failed to load headlines."));
    });

    // Default load: All
    const allCat = categories.find((c) => c.id === "all") || categories[0];
    setActive("all");
    renderLoading("Loading top headlines…");
    fetchHeadlines(allCat)
      .then((data) => renderArticles(data, allCat))
      .catch(() => renderError("Failed to load headlines."));
  }

  // ---------- Detailed Weather Data (Rain, AQI, UV, etc.) ----------
  function fetchAndRenderWeatherDetails(lat, lon, isFahrenheit) {
    const unit = isFahrenheit ? "fahrenheit" : "celsius";
    const windUnit = isFahrenheit ? "mph" : "kmh";

    // Fetch current weather details from Open-Meteo
    const detailsUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,` +
      `wind_speed_10m,wind_direction_10m,surface_pressure` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
      `precipitation_probability_max,sunrise,sunset,uv_index_max` +
      `&hourly=precipitation_probability,precipitation` +
      `&temperature_unit=${unit}&wind_speed_unit=${windUnit}` +
      `&timezone=auto&forecast_days=1`;

    fetch(detailsUrl)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.current) return;

        const current = data.current;
        const daily = data.daily;

        // Update Current Weather Details
        const feelsLikeEl = document.getElementById("feelsLike");
        const humidityEl = document.getElementById("humidity");
        const windSpeedEl = document.getElementById("windSpeed");
        const windDirectionEl = document.getElementById("windDirection");
        const visibilityEl = document.getElementById("visibility");
        const pressureEl = document.getElementById("pressure");
        const sunriseEl = document.getElementById("sunrise");
        const sunsetEl = document.getElementById("sunset");

        if (feelsLikeEl) feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°`;
        if (humidityEl) humidityEl.textContent = `${current.relative_humidity_2m}%`;
        if (windSpeedEl) windSpeedEl.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
        if (windDirectionEl) windDirectionEl.textContent = `${current.wind_direction_10m}°`;
        if (pressureEl) pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;

        // Visibility (not in Open-Meteo free, estimate from weather code)
        if (visibilityEl) {
          const weatherCode = current.weather_code;
          let vis = "10+ km";
          if (weatherCode >= 45 && weatherCode <= 48) vis = "1-2 km";
          else if (weatherCode >= 51 && weatherCode <= 67) vis = "5-8 km";
          else if (weatherCode >= 71 && weatherCode <= 86) vis = "2-5 km";
          else if (weatherCode >= 95) vis = "3-6 km";
          visibilityEl.textContent = vis;
        }

        // Sunrise & Sunset
        if (daily && daily.sunrise && daily.sunset) {
          const sunriseTime = new Date(daily.sunrise[0]);
          const sunsetTime = new Date(daily.sunset[0]);
          if (sunriseEl) sunriseEl.textContent = sunriseTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          if (sunsetEl) sunsetEl.textContent = sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }

        // Update Rain & Precipitation
        const rainChanceEl = document.getElementById("rainChance");
        const precipitationEl = document.getElementById("precipitation");
        const rainDurationEl = document.getElementById("rainDuration");
        const snowChanceEl = document.getElementById("snowChance");

        if (daily && daily.precipitation_probability_max) {
          const rainProb = daily.precipitation_probability_max[0];
          if (rainChanceEl) rainChanceEl.textContent = `${rainProb}%`;
        }

        // Calculate total precipitation from hourly data
        if (data.hourly && data.hourly.precipitation) {
          const totalPrecip = data.hourly.precipitation.reduce((sum, val) => sum + (val || 0), 0);
          if (precipitationEl) precipitationEl.textContent = `${totalPrecip.toFixed(1)} mm`;

          // Estimate rain duration (hours with > 0.1mm precipitation)
          const rainHours = data.hourly.precipitation.filter(p => p > 0.1).length;
          if (rainDurationEl) rainDurationEl.textContent = `${rainHours} hrs`;
        }

        // Snow chance (estimate from weather code)
        if (snowChanceEl) {
          const weatherCode = current.weather_code;
          let snowProb = 0;
          if (weatherCode >= 71 && weatherCode <= 77) snowProb = 80;
          else if (weatherCode >= 85 && weatherCode <= 86) snowProb = 70;
          else if (daily && daily.temperature_2m_min && daily.temperature_2m_min[0] < 0) snowProb = 20;
          snowChanceEl.textContent = `${snowProb}%`;
        }

        // Update UV Index
        const uvValueLargeEl = document.getElementById("uvValueLarge");
        const uvStatusEl = document.getElementById("uvStatus");
        const uvBarMarkerEl = document.getElementById("uvBarMarker");
        const uvAdviceEl = document.getElementById("uvAdvice");

        if (daily && daily.uv_index_max) {
          const uvIndex = daily.uv_index_max[0];
          if (uvValueLargeEl) uvValueLargeEl.textContent = uvIndex.toFixed(1);

          let uvStatus = "Low";
          let uvAdvice = "No protection required.";
          let uvColor = "#00c864";

          if (uvIndex >= 11) {
            uvStatus = "Extreme";
            uvAdvice = "Avoid sun exposure. Wear SPF 50+, protective clothing, and sunglasses.";
            uvColor = "#9b00ff";
          } else if (uvIndex >= 8) {
            uvStatus = "Very High";
            uvAdvice = "Minimize sun exposure between 10am-4pm. SPF 50+ essential.";
            uvColor = "#ff0000";
          } else if (uvIndex >= 6) {
            uvStatus = "High";
            uvAdvice = "Reduce sun exposure between 10am-4pm. Wear SPF 30+ and protective clothing.";
            uvColor = "#ff8c00";
          } else if (uvIndex >= 3) {
            uvStatus = "Moderate";
            uvAdvice = "Wear SPF 30+ and protective clothing during midday hours.";
            uvColor = "#ffc800";
          }

          if (uvStatusEl) {
            uvStatusEl.textContent = uvStatus;
            uvStatusEl.style.color = uvColor;
          }
          if (uvAdviceEl) uvAdviceEl.textContent = uvAdvice;

          // Position marker on UV bar (0-11+ scale)
          const markerPercent = Math.min(100, (uvIndex / 11) * 100);
          if (uvBarMarkerEl) {
            uvBarMarkerEl.style.left = `${markerPercent}%`;
            uvBarMarkerEl.style.borderColor = uvColor;
          }
        }
      })
      .catch(err => {
        console.error("Weather details fetch failed:", err);
      });

    // Fetch Air Quality data from Open-Meteo Air Quality API
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=european_aqi,pm10,pm2_5,ozone,nitrogen_dioxide` +
      `&timezone=auto`;

    fetch(aqiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.current) return;

        const aqi = data.current;
        const aqiValue = aqi.european_aqi || 0;

        const aqiValueEl = document.getElementById("aqiValue");
        const aqiStatusEl = document.getElementById("aqiStatus");
        const aqiCircleEl = document.getElementById("aqiCircle");
        const pm25El = document.getElementById("pm25");
        const pm10El = document.getElementById("pm10");
        const ozoneEl = document.getElementById("ozone");
        const no2El = document.getElementById("no2");

        if (aqiValueEl) aqiValueEl.textContent = aqiValue;

        // Determine AQI status and color
        let status = "Good";
        let colorClass = "";

        if (aqiValue > 150) {
          status = "Very Poor";
          colorClass = "bad";
        } else if (aqiValue > 100) {
          status = "Poor";
          colorClass = "unhealthy";
        } else if (aqiValue > 50) {
          status = "Moderate";
          colorClass = "moderate";
        }

        if (aqiStatusEl) {
          aqiStatusEl.textContent = status;
          aqiStatusEl.style.color = aqiValue <= 50 ? "#00c864" : aqiValue <= 100 ? "#ffc800" : aqiValue <= 150 ? "#ff6400" : "#c80000";
        }

        if (aqiCircleEl) {
          aqiCircleEl.className = "aqi-circle";
          if (colorClass) aqiCircleEl.classList.add(colorClass);
        }

        if (pm25El) pm25El.textContent = `${aqi.pm2_5.toFixed(1)} µg/m³`;
        if (pm10El) pm10El.textContent = `${aqi.pm10.toFixed(1)} µg/m³`;
        if (ozoneEl) ozoneEl.textContent = `${aqi.ozone.toFixed(1)} µg/m³`;
        if (no2El) no2El.textContent = `${aqi.nitrogen_dioxide.toFixed(1)} µg/m³`;
      })
      .catch(err => {
        console.error("Air quality fetch failed:", err);
      });
  }

  // ---------- Boot ----------
  function initGoogleMapsPinpointSequence() {
    // Run once (per page load)
    if (window.__gmapsPinpointStarted) return;
    window.__gmapsPinpointStarted = true;

    // Wait 2 seconds after landing on the page
    setTimeout(async () => {
      // Wait until we have location data from your existing flow
      const waitForUserCoords = (ms = 2500) =>
        new Promise((resolve) => {
          const start = Date.now();
          const check = () => {
            if (typeof window.userLat === "number" && typeof window.userLon === "number") {
              resolve(true);
              return;
            }
            if (Date.now() - start >= ms) {
              resolve(false);
              return;
            }
            setTimeout(check, 150);
          };
          check();
        });

      const hasCoords = await waitForUserCoords(3500);
      if (!hasCoords) return;

      const overlay = document.getElementById("googleMapsPinOverlay");
      const container = document.getElementById("googleMapsPinContainer");
      if (!overlay || !container) return;

      // If no API key is configured, just skip gracefully
      const apiKey = window.GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey.includes("YOUR_GOOGLE_MAPS_API_KEY_HERE")) return;

      // Load Google Maps JS API dynamically
      const loadGoogleMaps = () =>
        new Promise((resolve, reject) => {
          if (window.google && window.google.maps) {
            resolve();
            return;
          }
          const existing = document.querySelector('script[data-google-maps="true"]');
          if (existing) {
            // If script exists but google isn't ready yet, wait a bit
            const t = setInterval(() => {
              if (window.google && window.google.maps) {
                clearInterval(t);
                resolve();
              }
            }, 150);
            return;
          }

          const script = document.createElement("script");
          script.setAttribute("data-google-maps", "true");
          script.async = true;
          script.defer = true;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google Maps JS API."));
          document.head.appendChild(script);
        });

      try {
        await loadGoogleMaps();
        if (!window.google || !window.google.maps) return;

        // Animate overlay in
        overlay.style.opacity = "0";
        overlay.setAttribute("aria-hidden", "false");

        // Dim the Windy radar iframe slightly to let pinpoint stand out
        const windyIframe = document.getElementById("liveRadarIframe");
        const prevIframeOpacity = windyIframe ? windyIframe.style.opacity : "";

        if (windyIframe) windyIframe.style.opacity = "0.25";

        // Small staged animation
        requestAnimationFrame(() => {
          overlay.style.opacity = "1";
        });

        // Create a map centered on user coords (render into the overlay container)
        const center = { lat: window.userLat, lng: window.userLon };

        // Create/refresh map each time (marker pinpoint)
        container.innerHTML = "";
        const map = new window.google.maps.Map(container, {
          center,
          zoom: 14,
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });

        const marker = new window.google.maps.Marker({
          position: center,
          map,
          title: window.userCity || "Pinned location",
        });

        // Highlight animation: bounce marker briefly if supported
        if (typeof marker.setAnimation === "function" && window.google.maps.Animation) {
          marker.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => {
            marker.setAnimation(null);
          }, 1300);
        }

        // After a short sequence, restore iframe opacity and keep overlay visible briefly
        setTimeout(() => {
          if (windyIframe) windyIframe.style.opacity = prevIframeOpacity || "0";
        }, 2000);

        // Keep overlay for the remainder of user session (or fade it away later)
        setTimeout(() => {
          overlay.style.opacity = "0";
          overlay.setAttribute("aria-hidden", "true");
        }, 6500);
      } catch (e) {
        // Fail silently; the rest of the app should still work
        console.warn(e);
      }
    }, 2000);
  }

  // ---------- Weather.com API Badge Status ----------
  function updateApiBadge(status, message) {
    const badge = document.getElementById("weatherApiBadge");
    const statusDot = badge?.querySelector(".api-status-dot");
    const statusText = badge?.querySelector(".api-status-text");
    
    if (!badge || !statusDot || !statusText) return;
    
    badge.classList.remove("error", "offline");
    
    switch (status) {
      case "live":
        statusDot.style.background = "#00c864";
        statusText.textContent = "Live";
        statusText.style.color = "#00c864";
        badge.querySelector(".api-badge-status").style.background = "rgba(0, 200, 100, 0.2)";
        badge.querySelector(".api-badge-status").style.borderColor = "rgba(0, 200, 100, 0.4)";
        break;
      case "fallback":
        badge.classList.add("error");
        statusDot.style.background = "#ff6400";
        statusText.textContent = "Fallback";
        statusText.style.color = "#ff6400";
        badge.querySelector(".api-badge-status").style.background = "rgba(255, 100, 0, 0.2)";
        badge.querySelector(".api-badge-status").style.borderColor = "rgba(255, 100, 0, 0.4)";
        break;
      case "offline":
        badge.classList.add("offline");
        statusDot.style.background = "#999";
        statusText.textContent = "Offline";
        statusText.style.color = "#999";
        badge.querySelector(".api-badge-status").style.background = "rgba(150, 150, 150, 0.2)";
        badge.querySelector(".api-badge-status").style.borderColor = "rgba(150, 150, 150, 0.4)";
        break;
    }
  }

  // Update badge on page load
  setTimeout(() => updateApiBadge("live"), 3500);

  // ---------- Boot ----------
  window.addEventListener("DOMContentLoaded", () => {
    initEarth();
    initTemperaturePlaceholder();
    startLiveClock();
    requestLocation();
    initSpaceWeatherDemo();
    initRainViz();
    initAI();
    initWeatherMockData();
    initNavButtons();
    initBreakingNews();
    initSearch();
  });
})();