document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const forecastGrid = document.getElementById('forecast-grid');
    const weatherLocation = document.getElementById('weather-location');
    const loadingSpinner = document.getElementById('weather-loading');
    
    // Assuming your search input is inside the .navbar
    const searchInput = document.querySelector('.navbar input[type="text"]'); 
    
    // You can add a "Use My Location" button to your HTML with this ID
    const locationBtn = document.getElementById('use-location-btn'); 

    // --- API & Data Handling ---

    /**
     * Maps WMO weather codes from Open-Meteo to display icons.
     * @param {number} code - The WMO weather code.
     * @returns {object} - An object with the icon and its corresponding animation class.
     */
    function getWeatherInfo(code) {
        if (code === 0) return { icon: '☀️', animationClass: 'anim-sun' }; // Clear sky
        if (code >= 1 && code <= 3) return { icon: '☁️', animationClass: 'anim-cloud' }; // Mainly clear, partly cloudy, and overcast
        if (code === 45 || code === 48) return { icon: '🌫️', animationClass: 'anim-fog' }; // Fog
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', animationClass: 'anim-rain' }; // Drizzle, Rain
        if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { icon: '❄️', animationClass: 'anim-snow' }; // Snow
        if (code >= 95 && code <= 99) return { icon: '⛈️', animationClass: 'anim-storm' }; // Thunderstorm
        return { icon: '🌍', animationClass: '' }; // Default
    }

    /**
     * Fetches 10-day forecast data from the backend proxy.
     * @param {number} lat - Latitude.
     * @param {number} lon - Longitude.
     * @param {string} name - The name of the location to display.
     */
    async function fetchForecast(lat, lon, name) {
        if (!forecastGrid || !loadingSpinner || !weatherLocation) return;

        forecastGrid.innerHTML = '';
        loadingSpinner.style.display = 'block';
        weatherLocation.textContent = `Loading forecast for ${name}...`;

        // This calls the /weather endpoint on your Node.js server
        const apiUrl = `/weather?lat=${lat}&lon=${lon}&days=10`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            weatherLocation.textContent = name;
            displayForecast(data);

        } catch (error) {
            console.error("Error fetching weather data:", error);
            weatherLocation.textContent = 'Could not load weather data.';
            forecastGrid.innerHTML = `<p class="muted" style="text-align:center;">Failed to retrieve forecast. Please try again later.</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Renders the forecast data into the DOM.
     * @param {object} data - The weather data from the Open-Meteo API.
     */
    function displayForecast(data) {
        if (!data || !data.daily || !data.daily.time) {
            forecastGrid.innerHTML = `<p class="muted" style="text-align:center;">No forecast data available.</p>`;
            return;
        }

        const { time, temperature_2m_max, precipitation_sum, windspeed_10m_max, weathercode } = data.daily;

        time.forEach((dateString, i) => {
            const date = new Date(dateString);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

            const tempMax = Math.round(temperature_2m_max[i]);
            const precip = precipitation_sum[i];
            const wind = Math.round(windspeed_10m_max[i]);
            const code = weathercode[i];
            const weatherInfo = getWeatherInfo(code);

            const forecastItemHTML = `
                <div class="forecast-item">
                    <div class="forecast-day">${dayOfWeek}</div>
                    <div class="forecast-icon ${weatherInfo.animationClass}">${weatherInfo.icon}</div>
                    <div class="forecast-temp">${tempMax}°</div>
                    <div class="forecast-details">
                        💧 ${precip} mm<br>
                        💨 ${wind} km/h
                    </div>
                </div>
            `;
            forecastGrid.insertAdjacentHTML('beforeend', forecastItemHTML);
        });
    }

    // --- Location & User Interaction ---

    /**
     * Fetches coordinates for a city name using Open-Meteo's Geocoding API.
     * @param {string} city - The name of the city.
     */
    async function getCoordsForCity(city) {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        
        try {
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const { latitude, longitude, name, admin1, country } = data.results[0];
                const locationName = admin1 ? `${name}, ${admin1}` : `${name}, ${country}`;
                fetchForecast(latitude, longitude, locationName);
            } else {
                alert('City not found. Please try another search.');
                weatherLocation.textContent = 'City not found.';
            }
        } catch (error) {
            console.error("Error geocoding city:", error);
            alert('Could not search for city.');
        }
    }

    /**
     * Gets the user's current location via the browser's Geolocation API.
     */
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    fetchForecast(latitude, longitude, "Your Location");
                },
                () => {
                    // If user denies location, default to a major city
                    fetchForecast(51.5074, -0.1278, "London, UK"); // Default to London
                }
            );
        } else {
            // Geolocation not supported, default to London
            fetchForecast(51.5074, -0.1278, "London, UK");
        }
    }

    // --- Event Listeners ---
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value) {
                getCoordsForCity(searchInput.value);
                searchInput.value = ''; // Optional: Clear input after search
            }
        });
    }

    if (locationBtn) {
        locationBtn.addEventListener('click', getUserLocation);
    }

    // --- Initial Load ---
    getUserLocation(); // Get weather for user's location on page load
});