// Taxi Booking App - Hybrid Version with Mapbox + TomTom Traffic API
// Uses Mapbox for map display and TomTom for traffic data

class FreeTaxiBookingApp {
    constructor() {
        // Prevent multiple instances
        if (window.taxiAppInstance) {
            console.log('App instance already exists, returning existing instance');
            return window.taxiAppInstance;
        }
        
        this.map = null;
        this.pickupMarker = null;
        this.dropoffMarker = null;
        this.route = null;
        this.pickupLocation = null;
        this.dropoffLocation = null;
        this.currentCity = 'all'; // Track current selected city
        
        // New UI state management
        this.currentSelectionMode = null; // 'pickup' or 'dropoff'
        this.isRouteCalculated = false;
        
        // API configuration
        this.weatherApiKey = '8a4755cdd81b4bdcb9973512251210';
        this.trafficApiKey = null;
        this.trafficData = null;
        this.hasRestoredState = false; // Flag to prevent multiple restorations
        this.saveStateTimeout = null; // For debouncing save operations
        this.loadApiKeys();
        
        // Mapbox configuration
        this.mapboxAccessToken = 'pk.eyJ1Ijoic3ViaGFtcHJlZXQiLCJhIjoiY2toY2IwejF1MDdodzJxbWRuZHAweDV6aiJ9.Ys8MP5kVTk5P9V2TDvnuDg';
        
        // Initialize the application
        this.init();
        
        // Store instance globally
        window.taxiAppInstance = this;
    }
    
    loadApiKeys() {
        try {
            this.weatherApiKey = localStorage.getItem('weatherApiKey');
            this.trafficApiKey = localStorage.getItem('trafficApiKey') || 'bQrbmvGHDhZA0DUXLOFxLRnYNNrbqgEq';
            console.log('API keys loaded from storage');
            console.log('Weather API:', this.weatherApiKey ? 'Configured' : 'Not configured');
            console.log('Traffic API:', this.trafficApiKey ? 'Configured' : 'Not configured');
            console.log('TomTom API Key loaded:', this.trafficApiKey);
        
        // Auto-test the API key if available
        if (this.trafficApiKey) {
            setTimeout(() => {
                this.testApiKeyValidity(this.trafficApiKey).then(result => {
                    if (result.valid) {
                        console.log('✅ TomTom API Key is valid and ready to use!');
                    } else {
                        console.log('❌ TomTom API Key validation failed:', result.message);
                    }
                });
            }, 2000);
        }
        } catch (error) {
            console.error('Failed to load API keys:', error);
        }
    }
    
    saveApiKeys(weatherKey, trafficKey) {
        try {
            if (weatherKey) {
                localStorage.setItem('weatherApiKey', weatherKey);
                this.weatherApiKey = weatherKey;
            }
            if (trafficKey) {
                localStorage.setItem('trafficApiKey', trafficKey);
                this.trafficApiKey = trafficKey;
            }
            console.log('API keys saved successfully');
        } catch (error) {
            console.error('Failed to save API keys:', error);
        }
    }
    
    clearApiKeys() {
        try {
            localStorage.removeItem('weatherApiKey');
            localStorage.removeItem('trafficApiKey');
            this.weatherApiKey = null;
            this.trafficApiKey = null;
            this.weatherData = null;
            this.trafficData = null;
            console.log('API keys cleared');
        } catch (error) {
            console.error('Failed to clear API keys:', error);
        }
    }

    init() {
        console.log('Initializing Taxi Booking App with Mapbox...');
        this.setupLocationDatabase();
        this.initializeMap();
        this.bindEvents();
        this.clearOldState(); // Clear old state on page load
        this.restoreState(); // Restore state after a short delay
        
        // Debug: Check if buttons exist
        console.log('Pickup button exists:', !!document.getElementById('selectPickupBtn'));
        console.log('Dropoff button exists:', !!document.getElementById('selectDropoffBtn'));
    }

    setupLocationDatabase() {
        // Comprehensive location database for Vietnam
        this.locations = {
            'all': {
                name: 'Tất cả thành phố',
                center: [105.8342, 21.0285], // Hanoi coordinates
                zoom: 6
            },
            'hanoi': {
                name: 'Hà Nội',
                center: [105.8342, 21.0285],
                zoom: 12,
                places: [
                    { name: 'Sân bay Nội Bài', coords: [105.8067, 21.2211], type: 'airport' },
                    { name: 'Ga Hà Nội', coords: [105.8442, 21.0245], type: 'station' },
                    { name: 'Hồ Gươm', coords: [105.8327, 21.0285], type: 'landmark' },
                    { name: 'Chợ Đồng Xuân', coords: [105.8389, 21.0356], type: 'market' },
                    { name: 'Vincom Center', coords: [105.8206, 21.0147], type: 'shopping' },
                    { name: 'Bệnh viện Bạch Mai', coords: [105.8422, 21.0011], type: 'hospital' },
                    { name: 'Đại học Bách Khoa', coords: [105.8411, 21.0044], type: 'university' },
                    { name: 'Times City', coords: [105.8567, 21.0189], type: 'shopping' },
                    { name: 'Royal City', coords: [105.8089, 21.0044], type: 'shopping' },
                    { name: 'Lotte Center', coords: [105.8089, 21.0044], type: 'shopping' }
                ]
            },
            'hcm': {
                name: 'TP. Hồ Chí Minh',
                center: [106.6297, 10.8231],
                zoom: 12,
                places: [
                    { name: 'Sân bay Tân Sơn Nhất', coords: [106.6520, 10.8188], type: 'airport' },
                    { name: 'Ga Sài Gòn', coords: [106.7067, 10.7767], type: 'station' },
                    { name: 'Chợ Bến Thành', coords: [106.6967, 10.7722], type: 'market' },
                    { name: 'Vincom Center', coords: [106.7067, 10.7767], type: 'shopping' },
                    { name: 'Bệnh viện Chợ Rẫy', coords: [106.6967, 10.7722], type: 'hospital' },
                    { name: 'Đại học Bách Khoa', coords: [106.6967, 10.7722], type: 'university' },
                    { name: 'Landmark 81', coords: [106.7200, 10.7944], type: 'landmark' },
                    { name: 'Saigon Centre', coords: [106.7067, 10.7767], type: 'shopping' },
                    { name: 'Diamond Plaza', coords: [106.7067, 10.7767], type: 'shopping' },
                    { name: 'Crescent Mall', coords: [106.7200, 10.7944], type: 'shopping' }
                ]
            },
            'danang': {
                name: 'Đà Nẵng',
                center: [108.2208, 16.0544],
                zoom: 12,
                places: [
                    { name: 'Sân bay Đà Nẵng', coords: [108.1989, 16.0439], type: 'airport' },
                    { name: 'Ga Đà Nẵng', coords: [108.2208, 16.0544], type: 'station' },
                    { name: 'Cầu Rồng', coords: [108.2208, 16.0544], type: 'landmark' },
                    { name: 'Chợ Hàn', coords: [108.2208, 16.0544], type: 'market' },
                    { name: 'Vincom Plaza', coords: [108.2208, 16.0544], type: 'shopping' },
                    { name: 'Bệnh viện Đà Nẵng', coords: [108.2208, 16.0544], type: 'hospital' },
                    { name: 'Đại học Đà Nẵng', coords: [108.2208, 16.0544], type: 'university' }
                ]
            }
        };
    }

    initializeMap() {
        console.log('Initializing Mapbox map...');
        
        // Check if mapboxgl is available
        if (typeof mapboxgl === 'undefined') {
            console.error('Mapbox GL JS not loaded!');
            return;
        }
        
        // Set Mapbox access token
        mapboxgl.accessToken = this.mapboxAccessToken;
        
        try {
            // Initialize map
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: this.locations['hanoi'].center,
                zoom: this.locations['hanoi'].zoom
            });

            // Add navigation controls
            this.map.addControl(new mapboxgl.NavigationControl());

            // Add geolocate control
            this.map.addControl(new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true
            }));

            // Wait for map to load
            this.map.on('load', () => {
                console.log('Mapbox map loaded successfully');
                this.setupMapInteractions();
            });

            // Handle map clicks
            this.map.on('click', (e) => {
                this.handleMapClick(e.lngLat);
            });
            
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    setupMapInteractions() {
        // Add search functionality
        this.setupSearchBox();
        
        // Add traffic layer if TomTom API is available
        if (this.trafficApiKey) {
            this.addTrafficLayer();
        }
    }

    setupSearchBox() {
        // Create search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        searchContainer.style.cssText = 'margin: 10px; width: 300px;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Tìm kiếm địa điểm...';
        searchInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
        searchInput.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;';
        
        searchContainer.appendChild(searchInput);
        
        // Add to map
        this.map.addControl({
            onAdd: () => searchContainer,
            onRemove: () => searchContainer.remove()
        }, 'top-left');

        // Add search functionality
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    async performSearch(query) {
        if (!query || query.length < 2) return;

        try {
            // Use TomTom Search API
            const response = await fetch(
                `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${this.trafficApiKey}&countrySet=VN&limit=5`
            );
            
            if (response.ok) {
                const data = await response.json();
                this.displaySearchResults(data.results);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displaySearchResults(results) {
        // Create results container
        let resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'absolute top-16 left-4 bg-white rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto';
            resultsContainer.style.cssText = 'width: 300px; max-height: 200px; overflow-y: auto;';
            document.getElementById('map').appendChild(resultsContainer);
        }

        resultsContainer.innerHTML = '';
        
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer';
            item.innerHTML = `
                <div class="font-medium">${result.poi?.name || result.address?.freeformAddress}</div>
                <div class="text-sm text-gray-600">${result.address?.freeformAddress}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectSearchResult(result);
                resultsContainer.style.display = 'none';
            });
            
            resultsContainer.appendChild(item);
        });
    }

    selectSearchResult(result) {
        const coords = [result.position.lon, result.position.lat];
        
        if (this.currentSelectionMode === 'pickup') {
            this.setPickupLocation(coords, result.poi?.name || result.address?.freeformAddress);
        } else if (this.currentSelectionMode === 'dropoff') {
            this.setDropoffLocation(coords, result.poi?.name || result.address?.freeformAddress);
        }
    }

    handleMapClick(lngLat) {
        if (!this.currentSelectionMode) {
            // If no selection mode, show selection options
            this.showSelectionOptions(lngLat);
            return;
        }
        
        const coords = [lngLat.lng, lngLat.lat];
        
        if (this.currentSelectionMode === 'pickup') {
            this.setPickupLocation(coords);
        } else if (this.currentSelectionMode === 'dropoff') {
            this.setDropoffLocation(coords);
        }
    }

    showSelectionOptions(lngLat) {
        // Create a popup with selection options
        const popup = new mapboxgl.Popup()
            .setLngLat(lngLat)
            .setHTML(`
                <div class="p-3">
                    <h3 class="font-bold text-gray-800 mb-3">Chọn loại điểm</h3>
                    <div class="space-y-2">
                        <button onclick="window.taxiAppInstance.setPickupFromPopup([${lngLat.lng}, ${lngLat.lat}])" 
                                class="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors">
                            <i class="fas fa-map-pin mr-2"></i>Điểm đón
                            </button>
                        <button onclick="window.taxiAppInstance.setDropoffFromPopup([${lngLat.lng}, ${lngLat.lat}])" 
                                class="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm transition-colors">
                            <i class="fas fa-map-pin mr-2"></i>Điểm trả
                        </button>
                    </div>
                    </div>
            `)
            .addTo(this.map);
    }

    setPickupLocation(coords, name = null) {
        this.pickupLocation = { coords, name };
        
        // Remove existing marker
        if (this.pickupMarker) {
            this.pickupMarker.remove();
        }
        
        // Add new marker with popup
        this.pickupMarker = new mapboxgl.Marker({ color: 'green' })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
                    <h3 class="font-bold text-green-600">Điểm đón</h3>
                    <p>${name || 'Vị trí đã chọn'}</p>
                    <p class="text-xs text-gray-500">${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}</p>
            </div>
            `))
            .addTo(this.map);
        
        // Update UI
        this.updateLocationDisplay('pickup', coords, name);
        
        // Exit selection mode only if we're in pickup mode
        if (this.currentSelectionMode === 'pickup') {
            this.exitSelectionMode();
        }
        
        // Calculate route if both locations are set
        if (this.dropoffLocation) {
            this.calculateRoute();
        }
        
        // Save state
        this.saveState();
    }

    setDropoffLocation(coords, name = null) {
        this.dropoffLocation = { coords, name };
        
        // Remove existing marker
        if (this.dropoffMarker) {
            this.dropoffMarker.remove();
        }
        
        // Add new marker with popup
        this.dropoffMarker = new mapboxgl.Marker({ color: 'red' })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="p-2">
                    <h3 class="font-bold text-red-600">Điểm trả</h3>
                    <p>${name || 'Vị trí đã chọn'}</p>
                    <p class="text-xs text-gray-500">${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}</p>
                </div>
            `))
            .addTo(this.map);
        
        // Update UI
        this.updateLocationDisplay('dropoff', coords, name);
        
        // Exit selection mode only if we're in dropoff mode
        if (this.currentSelectionMode === 'dropoff') {
            this.exitSelectionMode();
        }
        
        // Calculate route if both locations are set
        if (this.pickupLocation) {
            this.calculateRoute();
        }
        
        // Save state
        this.saveState();
    }

    updateLocationDisplay(type, coords, name) {
        const displayElement = document.getElementById(`selected${type.charAt(0).toUpperCase() + type.slice(1)}Display`);
        const nameElement = document.getElementById(`selected${type.charAt(0).toUpperCase() + type.slice(1)}Name`);
        
        if (displayElement) {
            displayElement.classList.remove('hidden');
        }
        
        if (nameElement) {
            nameElement.textContent = name || `Vị trí ${type === 'pickup' ? 'đón' : 'trả'}`;
        }
        
        // Show the selected locations container
        const selectedLocationsContainer = document.getElementById('selectedLocations');
        if (selectedLocationsContainer) {
            selectedLocationsContainer.classList.remove('hidden');
        }
        
        // Show trip info form if both locations are selected
        if (this.pickupLocation && this.dropoffLocation) {
            this.showTripInfoForm();
        }
    }

    async calculateRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) return;

        try {
            // Use Mapbox Directions API
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${this.pickupLocation.coords[0]},${this.pickupLocation.coords[1]};${this.dropoffLocation.coords[0]},${this.dropoffLocation.coords[1]}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true`
            );
            
            if (response.ok) {
            const data = await response.json();
                this.displayRoute(data);
                this.calculatePricing(data);
            }
        } catch (error) {
            console.error('Route calculation error:', error);
        }
    }

    displayRoute(routeData) {
        // Remove existing route
        if (this.map.getSource('route')) {
            this.map.removeLayer('route');
            this.map.removeSource('route');
        }

        // Add route to map
        this.map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: routeData.routes[0].geometry
            }
        });

        this.map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3b82f6',
                'line-width': 4
            }
        });

        // Fit map to route
        const coordinates = routeData.routes[0].geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, { padding: 50 });
    }

    calculatePricing(routeData) {
        const route = routeData.routes[0];
        const distance = route.distance / 1000; // Convert to km
        const duration = route.duration / 60; // Convert to minutes

        // Base pricing
        const baseFare = 15000; // 15,000 VND
        const perKmRate = 12000; // 12,000 VND per km
        const perMinuteRate = 500; // 500 VND per minute

        // Calculate total
        const distanceFare = distance * perKmRate;
        const timeFare = duration * perMinuteRate;
        const subtotal = baseFare + distanceFare + timeFare;

        // Apply surcharges
        const rushHourFactor = this.getRushHourFactor();
        const weatherFactor = this.getWeatherFactor();
        const trafficFactor = this.getTrafficCongestionFactor();

        const totalSurcharge = (rushHourFactor + weatherFactor + trafficFactor) * subtotal;
        const total = subtotal + totalSurcharge;

        // Update trip info form
        this.updateTripInfoForm({
            distance: distance.toFixed(1),
            duration: Math.round(duration),
            baseFare,
            distanceFare,
            timeFare,
            subtotal,
            rushHourFactor,
            weatherFactor,
            trafficFactor,
            totalSurcharge,
            total
        });
    }
    
    getRushHourFactor() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // Weekdays: 7-9 AM, 5-7 PM
        if (day >= 1 && day <= 5) {
            if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
                return 0.08; // 8% surcharge
            }
        }
        
        // Lunch time: 11:30 AM - 1:30 PM
        if (hour >= 11.5 && hour <= 13.5) {
            return 0.05; // 5% surcharge
        }
        
        return 0;
    }
    
    getWeatherFactor() {
        // This would be connected to weather API
        // For now, return 0
        return 0;
    }
    
    getTrafficCongestionFactor() {
        // This would be connected to TomTom Traffic API
        // For now, return 0
        return 0;
    }

    showTripInfoForm() {
        const tripInfoForm = document.getElementById('tripInfoForm');
        if (tripInfoForm) {
            tripInfoForm.classList.remove('hidden');
        }
    }

    hideTripInfoForm() {
        const tripInfoForm = document.getElementById('tripInfoForm');
        if (tripInfoForm) {
            tripInfoForm.classList.add('hidden');
        }
    }

    showClearConfirmModal(type) {
        const modal = document.getElementById('clearConfirmModal');
        const messageElement = document.getElementById('clearConfirmMessage');
        
        if (!modal || !messageElement) return;

        let message = '';
        let action = '';

        switch (type) {
            case 'pickup':
                message = 'Điểm đón hiện tại sẽ bị xóa và bạn cần chọn lại.';
                action = 'pickup';
                break;
            case 'dropoff':
                message = 'Điểm đến hiện tại sẽ bị xóa và bạn cần chọn lại.';
                action = 'dropoff';
                break;
            case 'all':
                message = 'Tất cả địa điểm đã chọn sẽ bị xóa. Bạn cần chọn lại cả điểm đón và điểm đến.';
                action = 'all';
                break;
        }

        messageElement.textContent = message;
        this.pendingClearAction = action;
        modal.classList.remove('hidden');
    }

    hideClearConfirmModal() {
        const modal = document.getElementById('clearConfirmModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.pendingClearAction = null;
    }

    confirmClearLocation() {
        if (!this.pendingClearAction) return;

        switch (this.pendingClearAction) {
            case 'pickup':
                this.removeLocation('pickup');
                break;
            case 'dropoff':
                this.removeLocation('dropoff');
                break;
            case 'all':
                this.clearAllLocations();
                break;
        }

        this.hideClearConfirmModal();
    }

    clearAllLocations() {
        // Clear pickup location
        if (this.pickupLocation) {
            this.removeLocation('pickup');
        }

        // Clear dropoff location
        if (this.dropoffLocation) {
            this.removeLocation('dropoff');
        }

        // Hide selected locations container
        const selectedLocationsContainer = document.getElementById('selectedLocations');
        if (selectedLocationsContainer) {
            selectedLocationsContainer.classList.add('hidden');
        }

        // Reset selection mode
        this.exitSelectionMode();

        // Show success message
        this.showNotification('Đã xóa tất cả địa điểm', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        const icon = type === 'success' ? 'fas fa-check' : type === 'error' ? 'fas fa-times' : 'fas fa-info';
        
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="${icon} text-white"></i>
                <span class="text-white font-medium">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-2">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        notification.className += ` ${bgColor}`;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    updateTripInfoForm(pricing) {
        // Update main trip info
        const distanceElement = document.getElementById('tripDistance');
        const durationElement = document.getElementById('tripDuration');
        const priceElement = document.getElementById('tripPrice');
        
        if (distanceElement) distanceElement.textContent = `${pricing.distance} km`;
        if (durationElement) durationElement.textContent = `${pricing.duration} phút`;
        if (priceElement) priceElement.textContent = `${pricing.total.toLocaleString()} VNĐ`;
        
        // Update price breakdown
        const baseFareElement = document.getElementById('baseFare');
        const distanceFareElement = document.getElementById('distanceFare');
        const timeFareElement = document.getElementById('timeFare');
        const totalFareElement = document.getElementById('totalFare');
        
        if (baseFareElement) baseFareElement.textContent = `${pricing.baseFare.toLocaleString()} VNĐ`;
        if (distanceFareElement) distanceFareElement.textContent = `${pricing.distanceFare.toLocaleString()} VNĐ`;
        if (timeFareElement) timeFareElement.textContent = `${pricing.timeFare.toLocaleString()} VNĐ`;
        if (totalFareElement) totalFareElement.textContent = `${pricing.total.toLocaleString()} VNĐ`;
        
        // Update traffic and rush hour status
        this.updateTrafficStatus();
        this.updateRushHourStatus();
    }

    updateTrafficStatus() {
        const trafficElement = document.getElementById('trafficCondition');
        if (trafficElement) {
            // Simulate traffic check
            const trafficLevels = ['Thông thoáng', 'Hơi tắc', 'Tắc đường', 'Rất tắc'];
            const randomLevel = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
            trafficElement.textContent = randomLevel;
        }
    }

    updateRushHourStatus() {
        const rushHourElement = document.getElementById('rushHourStatus');
        if (rushHourElement) {
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();
            
            let status = 'Bình thường';
            if (day >= 1 && day <= 5) {
                if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
                    status = 'Giờ cao điểm';
                } else if (hour >= 11.5 && hour <= 13.5) {
                    status = 'Giờ trưa';
                }
            }
            
            rushHourElement.textContent = status;
        }
    }

    addTrafficLayer() {
        // This would integrate TomTom Traffic API with Mapbox
        // For now, we'll add a placeholder
        console.log('Traffic layer would be added here with TomTom API');
    }

    // Event handlers
    bindEvents() {
        console.log('Binding events...');
        
        // Selection mode buttons
        const pickupBtn = document.getElementById('selectPickupBtn');
        const dropoffBtn = document.getElementById('selectDropoffBtn');
        
        console.log('Pickup button found:', !!pickupBtn);
        console.log('Dropoff button found:', !!dropoffBtn);
        
        if (pickupBtn) {
            pickupBtn.addEventListener('click', () => {
                console.log('Pickup button clicked');
                this.enterSelectionMode('pickup');
            });
        } else {
            console.error('Pickup button not found!');
        }
        
        if (dropoffBtn) {
            dropoffBtn.addEventListener('click', () => {
                console.log('Dropoff button clicked');
                this.enterSelectionMode('dropoff');
            });
        } else {
            console.error('Dropoff button not found!');
        }

        // City selection
        document.getElementById('citySelect')?.addEventListener('change', (e) => {
            this.changeCity(e.target.value);
        });

        // Trip details
        document.getElementById('confirmRouteBtn')?.addEventListener('click', () => {
            this.confirmRoute();
        });


        // Book taxi → go to confirmation page
        document.getElementById('bookTaxi')?.addEventListener('click', () => {
            this.navigateToConfirmationPage();
        });


        // Clear location buttons
        document.getElementById('clearPickupBtn')?.addEventListener('click', () => {
            this.showClearConfirmModal('pickup');
        });

        document.getElementById('clearDropoffBtn')?.addEventListener('click', () => {
            this.showClearConfirmModal('dropoff');
        });

        // Clear all locations button
        document.getElementById('clearAllLocationsBtn')?.addEventListener('click', () => {
            this.showClearConfirmModal('all');
        });

        // Clear trip info button
        document.getElementById('clearTripInfoBtn')?.addEventListener('click', () => {
            this.hideTripInfoForm();
        });

        // Confirmation modal buttons
        document.getElementById('confirmClearBtn')?.addEventListener('click', () => {
            this.confirmClearLocation();
        });

        document.getElementById('cancelClearBtn')?.addEventListener('click', () => {
            this.hideClearConfirmModal();
        });

        // API Settings Modal
        document.getElementById('apiSettingsBtn')?.addEventListener('click', () => {
            this.showApiSettings();
        });

        document.getElementById('closeApiSettings')?.addEventListener('click', () => {
            this.hideApiSettings();
        });

        document.getElementById('saveApiSettings')?.addEventListener('click', () => {
            this.saveApiSettings();
        });

        document.getElementById('clearApiSettings')?.addEventListener('click', () => {
            this.clearApiSettings();
        });

        // Weather API Testing
        document.getElementById('testWeatherApi')?.addEventListener('click', () => {
            this.testWeatherApi();
        });

        document.getElementById('clearWeatherApi')?.addEventListener('click', () => {
            this.clearWeatherApi();
        });

        // Traffic API Testing
        document.getElementById('testApiKey')?.addEventListener('click', () => {
            this.testTrafficApiKey();
        });

        document.getElementById('testTrafficApi')?.addEventListener('click', () => {
            this.testTrafficApi();
        });

        document.getElementById('clearTrafficApi')?.addEventListener('click', () => {
            this.clearTrafficApi();
        });

        // Traffic test location buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('traffic-test-location')) {
                this.setTestCoordinates(e.target);
            }
        });
    }

    enterSelectionMode(mode) {
        console.log('Entering selection mode:', mode);
        this.currentSelectionMode = mode;
        
        // Update UI
        document.querySelectorAll('.location-mode-btn').forEach(btn => {
            btn.classList.remove('ring-4', 'ring-blue-300');
        });
        
        const activeBtn = document.getElementById(`select${mode.charAt(0).toUpperCase() + mode.slice(1)}Btn`);
        console.log('Active button found:', !!activeBtn);
        if (activeBtn) {
            activeBtn.classList.add('ring-4', 'ring-blue-300');
        }

        // Transform the button area into search interface
        this.transformToSearchInterface(mode);
    }

    exitSelectionMode() {
        this.currentSelectionMode = null;
        
        // Update UI
        document.querySelectorAll('.location-mode-btn').forEach(btn => {
            btn.classList.remove('ring-4', 'ring-blue-300');
        });

        // Restore original selection interface
        this.restoreOriginalInterface();
    }

    restoreOriginalInterface() {
        const selectionModeContainer = document.getElementById('selectionMode');
        if (selectionModeContainer && this.originalSelectionContent) {
            selectionModeContainer.innerHTML = this.originalSelectionContent;
            
            // Re-bind events for the restored buttons
            this.bindEvents();
        }
    }

    transformToSearchInterface(mode) {
        // Find the selection mode container
        const selectionModeContainer = document.getElementById('selectionMode');
        if (!selectionModeContainer) return;

        // Store original content
        if (!this.originalSelectionContent) {
            this.originalSelectionContent = selectionModeContainer.innerHTML;
        }

        // Transform to search interface
        selectionModeContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">
                        <i class="fas fa-search text-blue-500 mr-2"></i>
                        ${mode === 'pickup' ? 'Tìm điểm đón' : 'Tìm điểm đến'}
                    </h3>
                    <button onclick="window.taxiAppInstance.exitSelectionMode()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="mb-4">
                    <input type="text" 
                           id="locationSearchInput" 
                           placeholder="Nhập địa chỉ hoặc tên địa điểm..."
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                
                <div id="searchResults" class="max-h-60 overflow-y-auto mb-4">
                    <!-- Search results will appear here -->
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="window.taxiAppInstance.exitSelectionMode()" 
                            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                        Hủy
                    </button>
                    <button onclick="window.taxiAppInstance.useCurrentLocation('${mode}')" 
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                        <i class="fas fa-crosshairs mr-2"></i>Vị trí hiện tại
                    </button>
                </div>
            </div>
        `;
        
        // Focus on search input
        setTimeout(() => {
            const searchInput = document.getElementById('locationSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
        
        // Bind search events
        this.bindSearchEvents();
    }

    hideSearchForm() {
        const searchForm = document.getElementById('locationSearchForm');
        if (searchForm) {
            searchForm.remove();
        }
    }

    bindSearchEvents() {
        const searchInput = document.getElementById('locationSearchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performLocationSearch(e.target.value);
                }, 300);
            });
        }
    }

    async performLocationSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }

        try {
            // Use TomTom Search API
            const response = await fetch(
                `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${this.trafficApiKey}&countrySet=VN&limit=5`
            );
            
            if (response.ok) {
            const data = await response.json();
                this.displaySearchResults(data.results);
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError();
        }
    }

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-search text-2xl mb-2"></i>
                    <p>Không tìm thấy kết quả</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="window.taxiAppInstance.selectSearchResult([${result.position.lon}, ${result.position.lat}], '${result.poi?.name || result.address?.freeformAddress}', '${this.currentSelectionMode}')">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-map-marker-alt text-blue-500"></i>
                    <div class="flex-1">
                        <div class="font-medium text-gray-800">${result.poi?.name || result.address?.freeformAddress}</div>
                        <div class="text-sm text-gray-600">${result.address?.freeformAddress}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    selectSearchResult(coords, name, mode) {
        if (mode === 'pickup') {
            this.setPickupLocation(coords, name);
        } else if (mode === 'dropoff') {
            this.setDropoffLocation(coords, name);
        }
        
        // Exit selection mode
        this.exitSelectionMode();
        
        // Zoom to location
        this.zoomToLocation(coords);
        
        // Show location suggestions on map
        this.showLocationSuggestions(coords, name);
    }

    zoomToLocation(coords) {
        if (this.map) {
            this.map.flyTo({
                center: coords,
                zoom: 15,
                duration: 1000
            });
        }
    }

    showLocationSuggestions(coords, name) {
        // Remove existing suggestions
        this.clearLocationSuggestions();
        
        // Add suggestion markers around the selected location
        const suggestions = this.getNearbySuggestions(coords);
        
        suggestions.forEach((suggestion, index) => {
            const marker = new mapboxgl.Marker({ 
                color: '#3b82f6',
                scale: 0.8
            })
            .setLngLat(suggestion.coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="p-2">
                    <h3 class="font-bold text-blue-600">${suggestion.name}</h3>
                    <p class="text-sm text-gray-600">${suggestion.address}</p>
                    <p class="text-xs text-gray-500">${suggestion.distance}m từ vị trí chọn</p>
                </div>
            `))
            .addTo(this.map);
            
            // Store marker for later removal
            if (!this.suggestionMarkers) {
                this.suggestionMarkers = [];
            }
            this.suggestionMarkers.push(marker);
        });
    }

    getNearbySuggestions(centerCoords) {
        // Generate nearby suggestions (simplified - in real app, use proper API)
        const suggestions = [
            {
                name: 'Địa điểm gần 1',
                address: 'Địa chỉ gần vị trí đã chọn',
                coords: [centerCoords[0] + 0.001, centerCoords[1] + 0.001],
                distance: 100
            },
            {
                name: 'Địa điểm gần 2', 
                address: 'Địa chỉ khác gần vị trí',
                coords: [centerCoords[0] - 0.001, centerCoords[1] + 0.001],
                distance: 150
            },
            {
                name: 'Địa điểm gần 3',
                address: 'Địa chỉ thứ 3 gần vị trí',
                coords: [centerCoords[0] + 0.001, centerCoords[1] - 0.001],
                distance: 200
            }
        ];
        
        return suggestions;
    }

    clearLocationSuggestions() {
        if (this.suggestionMarkers) {
            this.suggestionMarkers.forEach(marker => marker.remove());
            this.suggestionMarkers = [];
        }
    }

    useCurrentLocation(mode) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = [position.coords.longitude, position.coords.latitude];
                    if (mode === 'pickup') {
                        this.setPickupLocation(coords, 'Vị trí hiện tại');
                    } else if (mode === 'dropoff') {
                        this.setDropoffLocation(coords, 'Vị trí hiện tại');
                    }
                    
                    this.exitSelectionMode();
                    this.zoomToLocation(coords);
                    this.showLocationSuggestions(coords, 'Vị trí hiện tại');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
                }
            );
            } else {
            alert('Trình duyệt không hỗ trợ định vị.');
        }
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    showSearchError() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Lỗi tìm kiếm. Vui lòng thử lại.</p>
                </div>
            `;
        }
    }

    hideSelectionInstructions() {
        const instructions = document.getElementById('selectionInstructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
    }

    changeCity(cityId) {
        if (this.locations[cityId]) {
            const city = this.locations[cityId];
            this.currentCity = cityId;
            
            // Update map center
            this.map.flyTo({
                center: city.center,
                zoom: city.zoom,
                duration: 1000
            });

            // Update location suggestions
            this.updateLocationSuggestions(cityId);
        }
    }

    updateLocationSuggestions(cityId) {
        const suggestionsContainer = document.getElementById('locationSuggestions');
        if (suggestionsContainer && this.locations[cityId]?.places) {
            const places = this.locations[cityId].places;
            suggestionsContainer.innerHTML = `
                <h4 class="font-semibold text-gray-800 mb-3">Địa điểm phổ biến:</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${places.map(place => `
                        <button class="location-suggestion-btn text-left p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" 
                                data-coords="${place.coords[0]},${place.coords[1]}" 
                                data-name="${place.name}">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-${this.getPlaceIcon(place.type)} text-blue-500"></i>
                                <span class="text-sm">${place.name}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            `;

            // Bind click events
            suggestionsContainer.querySelectorAll('.location-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const coords = btn.dataset.coords.split(',').map(Number);
                    const name = btn.dataset.name;
                    
                    if (this.currentSelectionMode === 'pickup') {
                        this.setPickupLocation(coords, name);
                    } else if (this.currentSelectionMode === 'dropoff') {
                        this.setDropoffLocation(coords, name);
                    }
                });
            });
        }
    }

    getPlaceIcon(type) {
        const icons = {
            'airport': 'plane',
            'station': 'train',
            'landmark': 'monument',
            'market': 'shopping-cart',
            'shopping': 'store',
            'hospital': 'hospital',
            'university': 'graduation-cap'
        };
        return icons[type] || 'map-marker-alt';
    }

    confirmRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) {
            alert('Vui lòng chọn cả điểm đón và điểm trả khách');
            return;
        }

        // Calculate route and scroll directly to booking section
        this.calculateRoute();
        this.scrollToBookingSection();
    }


    navigateToConfirmationPage() {
        // Ensure required data exists
        if (!this.pickupLocation || !this.dropoffLocation) {
            alert('Vui lòng chọn cả điểm đón và điểm đến trước khi tiếp tục.');
            return;
        }

        // Collect and validate customer info
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('customerPhone');
        const notesInput = document.getElementById('notes');

        const customerName = nameInput?.value?.trim() || '';
        const customerPhone = phoneInput?.value?.trim() || '';

        // Validate required customer information
        if (!customerName) {
            alert('Vui lòng nhập họ và tên khách hàng.');
            nameInput?.focus();
            return;
        }

        if (!customerPhone) {
            alert('Vui lòng nhập số điện thoại khách hàng.');
            phoneInput?.focus();
            return;
        }

        // Validate phone number format (basic Vietnamese phone number validation)
        const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
        if (!phoneRegex.test(customerPhone)) {
            alert('Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0).');
            phoneInput?.focus();
            return;
        }

        const customer = {
            name: customerName,
            phone: customerPhone,
            notes: notesInput?.value?.trim() || ''
        };

        // Persist latest state so confirmation page can fallback if needed
        try {
            const state = {
                pickupLocation: this.pickupLocation,
                dropoffLocation: this.dropoffLocation,
                customer,
                timestamp: Date.now()
            };
            localStorage.setItem('taxiAppState', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not persist state:', e);
        }

        // Pass data via URL for immediate availability on confirmation page
        const pickupParam = encodeURIComponent(JSON.stringify(this.pickupLocation));
        const dropoffParam = encodeURIComponent(JSON.stringify(this.dropoffLocation));
        const url = `confirmation.html?pickup=${pickupParam}&dropoff=${dropoffParam}`;
        window.location.href = url;
    }

    hideTripDetails() {
        const tripDetails = document.getElementById('tripDetails');
        if (tripDetails) {
            tripDetails.style.display = 'none';
            this.map.getContainer().classList.remove('blurred');
        }
    }

    scrollToBookingSection() {
        // Find the customer information section
        const customerSection = document.querySelector('.border-t.pt-6');
        if (customerSection) {
            customerSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
            
            // Add highlight effect
            customerSection.style.transition = 'all 0.3s ease';
            customerSection.style.transform = 'scale(1.02)';
            customerSection.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
            
            setTimeout(() => {
                customerSection.style.transform = 'scale(1)';
                customerSection.style.boxShadow = '';
            }, 1000);
        }
    }


    setPickupFromPopup(coords) {
        this.setPickupLocation(coords);
        // Close any open popups
        this.map.getContainer().querySelectorAll('.mapboxgl-popup').forEach(popup => {
            popup.remove();
        });
    }

    setDropoffFromPopup(coords) {
        this.setDropoffLocation(coords);
        // Close any open popups
        this.map.getContainer().querySelectorAll('.mapboxgl-popup').forEach(popup => {
            popup.remove();
        });
    }

    editLocation(type) {
        // Enter selection mode for the specified type
        this.enterSelectionMode(type);
        
        // Show instructions
        this.showSelectionInstructions(type);
    }

    removeLocation(type) {
        if (type === 'pickup') {
            if (this.pickupMarker) {
                this.pickupMarker.remove();
                this.pickupMarker = null;
            }
            this.pickupLocation = null;
            
            // Update UI
            const displayElement = document.getElementById('selectedPickupDisplay');
            if (displayElement) {
                displayElement.classList.add('hidden');
            }
            
            // Show notification
            this.showNotification('Đã xóa điểm đón', 'success');
        } else if (type === 'dropoff') {
            if (this.dropoffMarker) {
                this.dropoffMarker.remove();
                this.dropoffMarker = null;
            }
            this.dropoffLocation = null;
            
            // Update UI
            const displayElement = document.getElementById('selectedDropoffDisplay');
            if (displayElement) {
                displayElement.classList.add('hidden');
            }
            
            // Show notification
            this.showNotification('Đã xóa điểm đến', 'success');
        }
        
        // Hide trip info form if not both locations are selected
        if (!this.pickupLocation || !this.dropoffLocation) {
            const tripInfoForm = document.getElementById('tripInfoForm');
            if (tripInfoForm) {
                tripInfoForm.classList.add('hidden');
            }
        }
        
        // Remove route if it exists
        if (this.map.getSource('route')) {
            this.map.removeLayer('route');
            this.map.removeSource('route');
        }
        
        // Save state
        this.saveState();
    }

    // State management
    clearOldState() {
        try {
            // Clear any old state that might interfere
            localStorage.removeItem('taxiAppState');
            console.log('Old state cleared');
        } catch (error) {
            console.error('Error clearing old state:', error);
        }
    }

    restoreState() {
        if (this.hasRestoredState) return;
        
        try {
            const savedState = localStorage.getItem('taxiAppState');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('Restoring state:', state);
                
                // Restore locations if available
                if (state.pickupLocation) {
                    this.setPickupLocation(state.pickupLocation.coords, state.pickupLocation.name);
                }
                if (state.dropoffLocation) {
                    this.setDropoffLocation(state.dropoffLocation.coords, state.dropoffLocation.name);
                }
                
                this.hasRestoredState = true;
            }
        } catch (error) {
            console.error('Error restoring state:', error);
        }
    }

    saveState() {
        if (this.saveStateTimeout) {
            clearTimeout(this.saveStateTimeout);
        }
        
        this.saveStateTimeout = setTimeout(() => {
            try {
                const state = {
                    pickupLocation: this.pickupLocation,
                    dropoffLocation: this.dropoffLocation,
                    currentCity: this.currentCity,
                    timestamp: Date.now()
                };
                
                localStorage.setItem('taxiAppState', JSON.stringify(state));
                console.log('State saved');
            } catch (error) {
                console.error('Error saving state:', error);
            }
        }, 1000);
    }

    // API testing methods
    async testWeatherApi() {
        const apiKey = document.getElementById('weatherApiKey')?.value;
        if (!apiKey) {
            this.showApiTestResult('weatherTestResults', 'weatherResultsContent', 'Vui lòng nhập API key', 'error');
            return;
        }

        try {
            this.showApiTestResult('weatherTestResults', 'weatherResultsContent', 'Đang kiểm tra API...', 'loading');
            
            const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Hanoi&lang=vi`);
            
            if (response.ok) {
                const data = await response.json();
                const result = `
                    ✅ API hoạt động bình thường<br>
                    📍 Vị trí: ${data.location?.name || 'Hà Nội'}<br>
                    🌡️ Nhiệt độ: ${data.current?.temp_c || '--'}°C<br>
                    ☁️ Thời tiết: ${data.current?.condition?.text || '--'}<br>
                    💨 Độ ẩm: ${data.current?.humidity || '--'}%
                `;
                this.showApiTestResult('weatherTestResults', 'weatherResultsContent', result, 'success');
                this.updateApiStatus('weatherApiStatus', 'success');
            } else {
                this.showApiTestResult('weatherTestResults', 'weatherResultsContent', `❌ Lỗi API: ${response.status}`, 'error');
                this.updateApiStatus('weatherApiStatus', 'error');
            }
        } catch (error) {
            this.showApiTestResult('weatherTestResults', 'weatherResultsContent', `❌ Lỗi kết nối: ${error.message}`, 'error');
            this.updateApiStatus('weatherApiStatus', 'error');
        }
    }

    async testTrafficApiKey() {
        const apiKey = document.getElementById('trafficApiKey')?.value;
        if (!apiKey) {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', 'Vui lòng nhập API key', 'error');
            return;
        }

        try {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', 'Đang kiểm tra API key...', 'loading');
            
            const response = await fetch(`https://api.tomtom.com/search/2/search/hanoi.json?key=${apiKey}&limit=1`);
            
            if (response.ok) {
                this.showApiTestResult('trafficTestResults', 'trafficResultsContent', '✅ API key hợp lệ', 'success');
                this.updateApiStatus('trafficApiStatus', 'success');
            } else {
                this.showApiTestResult('trafficTestResults', 'trafficResultsContent', `❌ API key không hợp lệ: ${response.status}`, 'error');
                this.updateApiStatus('trafficApiStatus', 'error');
            }
        } catch (error) {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', `❌ Lỗi kết nối: ${error.message}`, 'error');
            this.updateApiStatus('trafficApiStatus', 'error');
        }
    }

    async testTrafficApi() {
        const apiKey = document.getElementById('trafficApiKey')?.value;
        const lat = document.getElementById('testLat')?.value;
        const lng = document.getElementById('testLng')?.value;
        
        if (!apiKey || !lat || !lng) {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', 'Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        try {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', 'Đang phân tích giao thông...', 'loading');
            
            const response = await fetch(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${apiKey}&point=${lat},${lng}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.flowSegmentData) {
                    const flow = data.flowSegmentData;
                    const result = `
                        ✅ Phân tích giao thông thành công<br>
                        🚗 Tốc độ hiện tại: ${flow.currentSpeed || '--'} km/h<br>
                        🛣️ Tốc độ bình thường: ${flow.freeFlowSpeed || '--'} km/h<br>
                        📊 Mức độ tắc đường: ${this.getTrafficLevel(flow.currentSpeed, flow.freeFlowSpeed)}
                    `;
                    this.showApiTestResult('trafficTestResults', 'trafficResultsContent', result, 'success');
                } else {
                    this.showApiTestResult('trafficTestResults', 'trafficResultsContent', '⚠️ Không có dữ liệu giao thông tại vị trí này', 'warning');
                }
            } else {
                this.showApiTestResult('trafficTestResults', 'trafficResultsContent', `❌ Lỗi API: ${response.status}`, 'error');
            }
        } catch (error) {
            this.showApiTestResult('trafficTestResults', 'trafficResultsContent', `❌ Lỗi kết nối: ${error.message}`, 'error');
        }
    }

    setTestCoordinates(button) {
        const lat = button.dataset.lat;
        const lng = button.dataset.lng;
        const name = button.dataset.name;
        
        document.getElementById('testLat').value = lat;
        document.getElementById('testLng').value = lng;
        
        this.showNotification(`Đã chọn tọa độ: ${name}`, 'info');
    }

    showApiTestResult(containerId, contentId, message, type) {
        const container = document.getElementById(containerId);
        const content = document.getElementById(contentId);
        
        if (container && content) {
            container.classList.remove('hidden');
            content.innerHTML = message;
            
            // Update container styling based on type
            container.className = container.className.replace(/bg-\w+-\d+/g, '');
            if (type === 'success') container.classList.add('bg-green-50', 'border-green-200');
            else if (type === 'error') container.classList.add('bg-red-50', 'border-red-200');
            else if (type === 'warning') container.classList.add('bg-yellow-50', 'border-yellow-200');
            else container.classList.add('bg-gray-50', 'border-gray-200');
        }
    }

    updateApiStatus(statusId, status) {
        const statusElement = document.getElementById(statusId);
        if (statusElement) {
            statusElement.className = 'text-xs px-2 py-1 rounded';
            if (status === 'success') {
                statusElement.classList.add('bg-green-200', 'text-green-800');
                statusElement.textContent = 'Đã cấu hình';
            } else if (status === 'error') {
                statusElement.classList.add('bg-red-200', 'text-red-800');
                statusElement.textContent = 'Lỗi';
            } else {
                statusElement.classList.add('bg-gray-200', 'text-gray-700');
                statusElement.textContent = 'Chưa cấu hình';
            }
        }
    }

    getTrafficLevel(currentSpeed, freeFlowSpeed) {
        if (!currentSpeed || !freeFlowSpeed) return 'Không xác định';
        const ratio = currentSpeed / freeFlowSpeed;
        if (ratio >= 0.8) return 'Thông thoáng';
        if (ratio >= 0.6) return 'Hơi chậm';
        if (ratio >= 0.4) return 'Chậm';
        if (ratio >= 0.2) return 'Rất chậm';
        return 'Tắc đường';
    }

    clearWeatherApi() {
        document.getElementById('weatherApiKey').value = '';
        document.getElementById('weatherTestResults').classList.add('hidden');
        this.updateApiStatus('weatherApiStatus', '');
        this.showNotification('Đã xóa cấu hình Weather API', 'info');
    }

    clearTrafficApi() {
        document.getElementById('trafficApiKey').value = '';
        document.getElementById('trafficTestResults').classList.add('hidden');
        this.updateApiStatus('trafficApiStatus', '');
        this.showNotification('Đã xóa cấu hình Traffic API', 'info');
    }

    showApiSettings() {
        document.getElementById('apiSettingsModal').classList.remove('hidden');
    }

    hideApiSettings() {
        document.getElementById('apiSettingsModal').classList.add('hidden');
    }

    saveApiSettings() {
        const weatherKey = document.getElementById('weatherApiKey')?.value;
        const trafficKey = document.getElementById('trafficApiKey')?.value;
        
        this.saveApiKeys(weatherKey, trafficKey);
        this.showNotification('Đã lưu cấu hình API', 'success');
        this.hideApiSettings();
    }

    clearApiSettings() {
        this.clearApiKeys();
        document.getElementById('weatherApiKey').value = '';
        document.getElementById('trafficApiKey').value = '';
        document.getElementById('weatherTestResults').classList.add('hidden');
        document.getElementById('trafficTestResults').classList.add('hidden');
        this.updateApiStatus('weatherApiStatus', '');
        this.updateApiStatus('trafficApiStatus', '');
        this.showNotification('Đã xóa tất cả cấu hình API', 'info');
    }

    // API testing
    async testApiKeyValidity(apiKey) {
        try {
            const response = await fetch(`https://api.tomtom.com/search/2/search/hanoi.json?key=${apiKey}&limit=1`);
            
            if (response.ok) {
                return { valid: true, message: 'API key is valid' };
        } else {
                return { valid: false, message: `API returned status: ${response.status}` };
            }
        } catch (error) {
            return { valid: false, message: `Network error: ${error.message}` };
        }
    }
}

// Global functions for popup actions
window.selectLocationFromPopup = function(coords, name, type) {
    if (window.taxiAppInstance) {
        if (type === 'pickup') {
            window.taxiAppInstance.setPickupLocation(coords, name);
        } else if (type === 'dropoff') {
            window.taxiAppInstance.setDropoffLocation(coords, name);
        }
    }
};

window.viewOnMap = function(coords) {
    if (window.taxiAppInstance && window.taxiAppInstance.map) {
        window.taxiAppInstance.map.flyTo({
            center: coords,
            zoom: 15,
            duration: 1000
        });
    }
};

// Global functions for location management
window.editLocation = function(type) {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.editLocation(type);
    }
};

window.removeLocation = function(type) {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.removeLocation(type);
    }
};

// Global functions for search form
window.hideSearchForm = function() {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.hideSearchForm();
    }
};

window.exitSelectionMode = function() {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.exitSelectionMode();
    }
};

window.useCurrentLocation = function(mode) {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.useCurrentLocation(mode);
    }
};

window.selectSearchResult = function(coords, name, mode) {
    if (window.taxiAppInstance) {
        window.taxiAppInstance.selectSearchResult(coords, name, mode);
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    setTimeout(() => {
        new FreeTaxiBookingApp();
    }, 100);
});
