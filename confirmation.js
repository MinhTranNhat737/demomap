// Confirmation Page - RadioCar Taxi
// Displays trip details with traffic congestion information

class ConfirmationPage {
    constructor() {
        this.map = null;
        this.pickupLocation = null;
        this.dropoffLocation = null;
        this.route = null;
        this.congestionSegments = [];
        this.weatherApiKey = '8a4755cdd81b4bdcb9973512251210';
        this.trafficApiKey = 'bQrbmvGHDhZA0DUXLOFxLRnYNNrbqgEq';
        
        this.init();
    }

    init() {
        console.log('Initializing Confirmation Page...');
        this.loadTripData();
        this.initializeMap();
        this.bindEvents();
        this.fetchRealTimeData();
        console.log('Confirmation page initialized successfully!');
    }

    loadTripData() {
        // Load trip data from URL parameters (passed from main page)
        try {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Try to get data from URL parameters first
            if (urlParams.has('pickup') && urlParams.has('dropoff')) {
                this.pickupLocation = JSON.parse(decodeURIComponent(urlParams.get('pickup')));
                this.dropoffLocation = JSON.parse(decodeURIComponent(urlParams.get('dropoff')));
                
                console.log('Trip data loaded from URL:', {
                    pickup: this.pickupLocation.name,
                    dropoff: this.dropoffLocation.name
                });
            } else {
                // If no URL params, redirect back to main page
                this.showNotification('⚠️ Vui lòng chọn điểm đón và điểm đến trước', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to load trip data:', error);
            this.showNotification('❌ Không thể tải dữ liệu chuyến đi', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    initializeMap() {
        // Initialize map centered on the route
        const centerLat = this.pickupLocation ? this.pickupLocation.lat : 21.0285;
        const centerLng = this.pickupLocation ? this.pickupLocation.lng : 105.8542;
        
        this.map = L.map('confirmationMap').setView([centerLat, centerLng], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add markers if locations exist
        if (this.pickupLocation && this.dropoffLocation) {
            this.addLocationMarkers();
            this.calculateRoute();
        }
    }

    addLocationMarkers() {
        // Add pickup marker
        if (this.pickupLocation) {
            const pickupIcon = L.divIcon({
                html: '<div style="background: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>',
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker([this.pickupLocation.lat, this.pickupLocation.lng], { icon: pickupIcon })
                .addTo(this.map)
                .bindPopup(`<strong>Điểm đón:</strong><br>${this.pickupLocation.name}`);
        }

        // Add dropoff marker
        if (this.dropoffLocation) {
            const dropoffIcon = L.divIcon({
                html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>',
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker([this.dropoffLocation.lat, this.dropoffLocation.lng], { icon: dropoffIcon })
                .addTo(this.map)
                .bindPopup(`<strong>Điểm đến:</strong><br>${this.dropoffLocation.name}`);
        }
    }

    async calculateRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) return;

        try {
            const start = `${this.pickupLocation.lng},${this.pickupLocation.lat}`;
            const end = `${this.dropoffLocation.lng},${this.dropoffLocation.lat}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw route with traffic analysis
                this.drawRouteWithTraffic(coordinates, route.distance, route.duration);
                
                // Update UI
                this.updateRouteInfo(route.distance / 1000, route.duration / 60);
            }
        } catch (error) {
            console.error('Route calculation failed:', error);
            this.showNotification('❌ Không thể tính toán đường đi', 'error');
        }
    }

    drawRouteWithTraffic(coordinates, distance, duration) {
        // Clear existing route
        if (this.route) {
            this.map.removeLayer(this.route);
        }

        // Analyze traffic for different segments
        this.analyzeTrafficSegments(coordinates);

        // Draw route with color coding
        const routeStyle = {
            color: '#3b82f6',
            weight: 6,
            opacity: 0.8
        };

        this.route = L.polyline(coordinates, routeStyle).addTo(this.map);
        
        // Fit map to route
        this.map.fitBounds(this.route.getBounds().pad(0.1));
    }

    analyzeTrafficSegments(coordinates) {
        // Divide route into segments and analyze traffic
        const segmentSize = Math.max(1, Math.floor(coordinates.length / 10));
        this.congestionSegments = [];

        for (let i = 0; i < coordinates.length; i += segmentSize) {
            const segment = coordinates.slice(i, i + segmentSize);
            if (segment.length > 1) {
                const midPoint = segment[Math.floor(segment.length / 2)];
                const congestionLevel = this.getSimulatedCongestionLevel(midPoint);
                
                this.congestionSegments.push({
                    coordinates: segment,
                    congestionLevel: congestionLevel,
                    distance: this.calculateSegmentDistance(segment)
                });
            }
        }

        // Draw congested segments in red
        this.drawCongestedSegments();
        this.updateCongestionInfo();
    }

    getSimulatedCongestionLevel(coordinate) {
        // Simulate congestion based on time and location
        const now = new Date();
        const hour = now.getHours();
        const lat = coordinate[0];
        const lng = coordinate[1];

        // Rush hour simulation
        let baseCongestion = 0.3;
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            baseCongestion = 0.7;
        }

        // Location-based congestion (simulate city center)
        const cityCenterLat = 21.0285;
        const cityCenterLng = 105.8542;
        const distanceFromCenter = Math.sqrt(
            Math.pow(lat - cityCenterLat, 2) + Math.pow(lng - cityCenterLng, 2)
        );

        if (distanceFromCenter < 0.05) { // Within city center
            baseCongestion += 0.3;
        }

        return Math.min(1, baseCongestion + Math.random() * 0.2);
    }

    calculateSegmentDistance(coordinates) {
        let distance = 0;
        for (let i = 1; i < coordinates.length; i++) {
            distance += this.calculateDistance(
                coordinates[i-1][0], coordinates[i-1][1],
                coordinates[i][0], coordinates[i][1]
            );
        }
        return distance;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    drawCongestedSegments() {
        this.congestionSegments.forEach(segment => {
            if (segment.congestionLevel > 0.5) {
                const color = segment.congestionLevel > 0.8 ? '#dc2626' : '#f59e0b';
                
                L.polyline(segment.coordinates, {
                    color: color,
                    weight: 8,
                    opacity: 0.9
                }).addTo(this.map);
            }
        });
    }

    updateCongestionInfo() {
        const congestedSegments = this.congestionSegments.filter(s => s.congestionLevel > 0.5);
        const totalCongestedDistance = congestedSegments.reduce((sum, s) => sum + s.distance, 0);
        
        if (congestedSegments.length > 0) {
            document.getElementById('trafficCongestionDetails').classList.remove('hidden');
            
            const congestionInfo = document.getElementById('congestionInfo');
            congestionInfo.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center space-x-2 mb-2">
                        <i class="fas fa-exclamation-triangle text-red-600"></i>
                        <span class="font-semibold text-red-800">Có ${congestedSegments.length} đoạn tắc đường</span>
                    </div>
                    <div class="text-sm text-red-700">
                        <div class="flex justify-between">
                            <span>Quãng đường tắc:</span>
                            <span class="font-bold">${totalCongestedDistance.toFixed(2)} km</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Thời gian tắc ước tính:</span>
                            <span class="font-bold">${Math.round(totalCongestedDistance * 3)} phút</span>
                        </div>
                    </div>
                </div>
            `;

            // Update traffic info overlay
            this.updateTrafficInfoOverlay(congestedSegments, totalCongestedDistance);
        }
    }

    updateTrafficInfoOverlay(congestedSegments, totalDistance) {
        const overlay = document.getElementById('trafficInfoOverlay');
        const content = document.getElementById('trafficInfoContent');
        
        overlay.classList.remove('hidden');
        content.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span>Đoạn tắc:</span>
                    <span class="font-bold text-red-600">${congestedSegments.length}</span>
                </div>
                <div class="flex justify-between">
                    <span>Quãng đường:</span>
                    <span class="font-bold">${totalDistance.toFixed(2)} km</span>
                </div>
                <div class="flex justify-between">
                    <span>Thời gian thêm:</span>
                    <span class="font-bold text-orange-600">+${Math.round(totalDistance * 3)} phút</span>
                </div>
            </div>
        `;
    }

    async fetchRealTimeData() {
        if (!this.pickupLocation) return;

        try {
            // Fetch weather data using WeatherAPI.com
            await this.fetchWeatherData();
            
            // Fetch traffic data
            await this.fetchTrafficData();
            
            // Update conditions display
            this.updateConditionsDisplay();
            
        } catch (error) {
            console.error('Failed to fetch real-time data:', error);
        }
    }

    async fetchWeatherData() {
        try {
            const url = `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${this.pickupLocation.lat},${this.pickupLocation.lng}&aqi=no`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.weatherData = {
                    temperature: data.current.temp_c,
                    condition: data.current.condition.text,
                    humidity: data.current.humidity,
                    windSpeed: data.current.wind_kph
                };
                console.log('Weather data fetched:', this.weatherData);
            } else {
                console.log('Weather API failed, using simulated data');
                this.weatherData = this.simulateWeatherData();
            }
        } catch (error) {
            console.error('Weather fetch failed:', error);
            this.weatherData = this.simulateWeatherData();
        }
    }

    async fetchTrafficData() {
        try {
            const midLat = (this.pickupLocation.lat + this.dropoffLocation.lat) / 2;
            const midLng = (this.pickupLocation.lng + this.dropoffLocation.lng) / 2;
            
            const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${this.trafficApiKey}&point=${midLat},${midLng}`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.trafficData = data.flowSegmentData;
                console.log('Traffic data fetched:', this.trafficData);
            } else {
                console.log('Traffic API failed, using simulated data');
                this.trafficData = this.simulateTrafficData();
            }
        } catch (error) {
            console.error('Traffic fetch failed:', error);
            this.trafficData = this.simulateTrafficData();
        }
    }

    simulateWeatherData() {
        const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm'];
        return {
            temperature: Math.round(Math.random() * 15 + 20), // 20-35°C
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            humidity: Math.round(Math.random() * 40 + 40), // 40-80%
            windSpeed: Math.round(Math.random() * 20 + 5) // 5-25 km/h
        };
    }

    simulateTrafficData() {
        return {
            currentSpeed: Math.round(Math.random() * 30 + 20), // 20-50 km/h
            freeFlowSpeed: Math.round(Math.random() * 20 + 50), // 50-70 km/h
            confidence: Math.round(Math.random() * 20 + 80) // 80-100%
        };
    }

    updateRouteInfo(distance, duration) {
        document.getElementById('distance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('duration').textContent = `${Math.round(duration)} phút`;
        
        // Calculate estimated price
        const basePrice = 15000;
        const pricePerKm = 15000;
        const estimatedPrice = Math.round(basePrice + (distance * pricePerKm));
        document.getElementById('estimatedPrice').textContent = `${estimatedPrice.toLocaleString()} VNĐ`;
    }

    updateConditionsDisplay() {
        // Update rush hour status
        const now = new Date();
        const hour = now.getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        
        const rushHourIcon = document.getElementById('rushHourIcon');
        const rushHourStatus = document.getElementById('rushHourStatus');
        
        if (isRushHour) {
            rushHourIcon.textContent = '🔴';
            rushHourStatus.textContent = 'Giờ cao điểm';
            rushHourStatus.className = 'text-red-600 font-semibold';
        } else {
            rushHourIcon.textContent = '🟢';
            rushHourStatus.textContent = 'Bình thường';
            rushHourStatus.className = 'text-green-600';
        }

        // Update traffic status
        const trafficIcon = document.getElementById('trafficIcon');
        const trafficStatus = document.getElementById('trafficStatus');
        
        if (this.trafficData) {
            const speedRatio = this.trafficData.currentSpeed / this.trafficData.freeFlowSpeed;
            if (speedRatio < 0.5) {
                trafficIcon.textContent = '🔴';
                trafficStatus.textContent = 'Tắc nghiêm trọng';
                trafficStatus.className = 'text-red-600 font-semibold';
            } else if (speedRatio < 0.8) {
                trafficIcon.textContent = '🟡';
                trafficStatus.textContent = 'Chậm';
                trafficStatus.className = 'text-orange-600 font-semibold';
            } else {
                trafficIcon.textContent = '🟢';
                trafficStatus.textContent = 'Thông thoáng';
                trafficStatus.className = 'text-green-600';
            }
        }

        // Update weather status
        const weatherIcon = document.getElementById('weatherIcon');
        const weatherStatus = document.getElementById('weatherStatus');
        
        if (this.weatherData) {
            weatherIcon.textContent = '🌤️';
            weatherStatus.textContent = `${this.weatherData.temperature}°C`;
            weatherStatus.className = 'text-blue-600';
        }

        // Update location status
        const locationIcon = document.getElementById('locationIcon');
        const locationStatus = document.getElementById('locationStatus');
        
        locationIcon.textContent = '📍';
        locationStatus.textContent = 'Trung tâm thành phố';
        locationStatus.className = 'text-purple-600';
    }

    bindEvents() {
        // Back to booking button
        const backBtn = document.getElementById('backToBooking');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Confirm booking button
        const confirmBtn = document.getElementById('confirmBooking');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.processBooking();
            });
        }
    }

    processBooking() {
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const notes = document.getElementById('notes').value;

        if (!customerName || !customerPhone) {
            this.showNotification('⚠️ Vui lòng điền đầy đủ thông tin khách hàng', 'warning');
            return;
        }

        // Simulate booking process
        const button = document.getElementById('confirmBooking');
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading mr-2"></div>Đang xử lý...';
        button.disabled = true;

        setTimeout(() => {
            this.showBookingSuccess();
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }

    showBookingSuccess() {
        this.showNotification('✅ Đặt xe thành công! Tài xế sẽ liên hệ trong 5 phút', 'success');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `mb-4 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = message;

        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ConfirmationPage();
});
