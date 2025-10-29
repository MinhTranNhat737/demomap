// Confirmation Page - RadioCar Taxi with Mapbox + TomTom Traffic API
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
        this.tollStations = [];
        this.speedLimits = [];
        this.routeBounds = null;
        
        // Mapbox configuration
        this.mapboxAccessToken = 'pk.eyJ1Ijoic3ViaGFtcHJlZXQiLCJhIjoiY2toY2IwejF1MDdodzJxbWRuZHAweDV6aiJ9.Ys8MP5kVTk5P9V2TDvnuDg';
        
        this.init();
    }

    init() {
        console.log('Initializing Confirmation Page with Mapbox...');
        this.generateInvoiceNumber();
        this.setInvoiceDateTime();
        this.loadTripData();
        this.initializeMap();
        this.bindEvents();
        this.fetchRealTimeData();
        this.setupPaymentMethods();
        console.log('Confirmation page initialized successfully!');
    }

    generateInvoiceNumber() {
        // Generate a unique invoice number
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const invoiceNumber = `#INV-${year}${month}${day}-${random}`;
        
        const invoiceElement = document.getElementById('invoiceNumber');
        if (invoiceElement) {
            invoiceElement.textContent = invoiceNumber;
        }
    }

    setInvoiceDateTime() {
        const now = new Date();
        
        // Format date
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const dateStr = now.toLocaleDateString('vi-VN', dateOptions);
        
        // Format time
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const dateElement = document.getElementById('invoiceDate');
        const timeElement = document.getElementById('invoiceTime');
        
        if (dateElement) dateElement.textContent = dateStr;
        if (timeElement) timeElement.textContent = timeStr;
    }

    setupPaymentMethods() {
        // Setup payment method selection
        const paymentOptions = document.querySelectorAll('.payment-method');
        paymentOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all
                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.remove('border-blue-500', 'bg-blue-50');
                    opt.classList.add('border-gray-300');
                });
                
                // Add active class to selected
                const selectedOption = this.querySelector('.payment-option');
                selectedOption.classList.remove('border-gray-300');
                selectedOption.classList.add('border-blue-500', 'bg-blue-50');
                
                // Check the radio button
                this.querySelector('input[type="radio"]').checked = true;
            });
        });
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
                // Fallback to localStorage
                const savedState = localStorage.getItem('taxiAppState');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    this.pickupLocation = state.pickupLocation;
                    this.dropoffLocation = state.dropoffLocation;
                    
                    console.log('Trip data loaded from localStorage:', {
                        pickup: this.pickupLocation?.name,
                        dropoff: this.dropoffLocation?.name
                    });
                } else {
                    // Default locations for demo
                    this.pickupLocation = {
                        coords: [105.8342, 21.0285],
                        name: 'Hồ Gươm, Hà Nội'
                    };
                    this.dropoffLocation = {
                        coords: [105.8067, 21.2211],
                        name: 'Sân bay Nội Bài'
                    };
                }
            }
            
            // Update UI with trip data
            this.updateTripInfo();
            
        } catch (error) {
            console.error('Error loading trip data:', error);
            // Set default locations
            this.pickupLocation = {
                coords: [105.8342, 21.0285],
                name: 'Hồ Gươm, Hà Nội'
            };
            this.dropoffLocation = {
                coords: [105.8067, 21.2211],
                name: 'Sân bay Nội Bài'
            };
            this.updateTripInfo();
        }
    }

    updateTripInfo() {
        // Update pickup location display
        const pickupElement = document.getElementById('pickupLocationDisplay');
        const pickupCoordsElement = document.getElementById('pickupCoords');
        if (pickupElement && this.pickupLocation) {
            pickupElement.textContent = this.pickupLocation.name || 'Điểm đón';
        }
        if (pickupCoordsElement && this.pickupLocation) {
            pickupCoordsElement.textContent = `Tọa độ: ${this.pickupLocation.coords[1].toFixed(6)}, ${this.pickupLocation.coords[0].toFixed(6)}`;
        }

        // Update dropoff location display
        const dropoffElement = document.getElementById('dropoffLocationDisplay');
        const dropoffCoordsElement = document.getElementById('dropoffCoords');
        if (dropoffElement && this.dropoffLocation) {
            dropoffElement.textContent = this.dropoffLocation.name || 'Điểm đến';
        }
        if (dropoffCoordsElement && this.dropoffLocation) {
            dropoffCoordsElement.textContent = `Tọa độ: ${this.dropoffLocation.coords[1].toFixed(6)}, ${this.dropoffLocation.coords[0].toFixed(6)}`;
        }
    }

    initializeMap() {
        console.log('Initializing Mapbox map for confirmation page...');
        
        // Set Mapbox access token
        mapboxgl.accessToken = this.mapboxAccessToken;
        
        // Initialize map
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: this.pickupLocation?.coords || [105.8342, 21.0285],
            zoom: 12
        });

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl());

        // Wait for map to load
        this.map.on('load', () => {
            console.log('Mapbox map loaded successfully');
            this.setupMapLayers();
            this.calculateRoute();
        });
    }

    setupMapLayers() {
        // Add traffic layer source
        this.map.addSource('traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1'
        });

        // Add traffic layer
        this.map.addLayer({
            id: 'traffic-layer',
            type: 'line',
            source: 'traffic',
            'source-layer': 'traffic',
            paint: {
                'line-width': 2,
                'line-color': [
                    'case',
                    ['==', ['get', 'congestion'], 'low'], '#4CAF50',
                    ['==', ['get', 'congestion'], 'moderate'], '#FF9800',
                    ['==', ['get', 'congestion'], 'heavy'], '#F44336',
                    ['==', ['get', 'congestion'], 'severe'], '#9C27B0',
                    '#2196F3'
                ]
            }
        });
    }

    async calculateRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) return;

        try {
            // Use Mapbox Directions API
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${this.pickupLocation.coords[0]},${this.pickupLocation.coords[1]};${this.dropoffLocation.coords[0]},${this.dropoffLocation.coords[1]}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&annotations=duration,distance,speed`
            );
            
            if (response.ok) {
                const data = await response.json();
                this.displayRoute(data);
                await this.updateRouteInfo(data);
                this.fetchTrafficData(data);
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

        // Add markers
        this.addLocationMarkers();

        // Fit map to route
        const coordinates = routeData.routes[0].geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, { padding: 50 });
    }

    addLocationMarkers() {
        // Add pickup marker
        if (this.pickupLocation) {
            new mapboxgl.Marker({ color: 'green' })
                .setLngLat(this.pickupLocation.coords)
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <div class="p-2">
                        <h3 class="font-bold text-green-600">Điểm đón</h3>
                        <p>${this.pickupLocation.name}</p>
                    </div>
                `))
                .addTo(this.map);
        }

        // Add dropoff marker
        if (this.dropoffLocation) {
            new mapboxgl.Marker({ color: 'red' })
                .setLngLat(this.dropoffLocation.coords)
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <div class="p-2">
                        <h3 class="font-bold text-red-600">Điểm trả</h3>
                        <p>${this.dropoffLocation.name}</p>
                    </div>
                `))
                .addTo(this.map);
        }
    }

    async updateRouteInfo(routeData) {
        const route = routeData.routes[0];
        const distance = route.distance / 1000; // Convert to km
        const duration = route.duration / 60; // Convert to minutes
        const averageSpeed = (distance / (duration / 60)).toFixed(1); // km/h

        // Update distance
        const distanceElement = document.getElementById('distance');
        if (distanceElement) {
            distanceElement.textContent = `${distance.toFixed(1)} km`;
        }

        // Update duration
        const durationElement = document.getElementById('duration');
        if (durationElement) {
            durationElement.textContent = `${Math.round(duration)} phút`;
        }

        // Update average speed
        const speedElement = document.getElementById('avgSpeed');
        if (speedElement) {
            speedElement.textContent = `${averageSpeed} km/h`;
        }

        // Calculate fuel estimate
        const fuelEstimate = (distance * 0.08).toFixed(1); // 8L per 100km
        const fuelElement = document.getElementById('fuelEstimate');
        if (fuelElement) {
            fuelElement.textContent = `${fuelEstimate} L`;
        }

        // Calculate CO2 estimate
        const co2Estimate = (distance * 0.12).toFixed(1); // 120g CO2 per km
        const co2Element = document.getElementById('co2Estimate');
        if (co2Element) {
            co2Element.textContent = `${co2Estimate} kg`;
        }

        // Update road type
        const roadTypeElement = document.getElementById('roadType');
        if (roadTypeElement) {
            roadTypeElement.textContent = this.getRoadType(distance);
        }

        // Update turn-by-turn directions
        await this.updateTurnByTurnDirections(route);

        // Update traffic and weather conditions
        this.updateTrafficAndWeather();

        // Calculate pricing
        this.calculateDetailedPricing(route);
    }

    getRoadType(distance) {
        if (distance < 5) return 'Đường nội thành';
        if (distance < 20) return 'Đường liên tỉnh';
        return 'Đường cao tốc';
    }

    async updateTurnByTurnDirections(route) {
        const directionsContainer = document.getElementById('turnByTurnDirections');
        if (!directionsContainer) return;

        try {
            const legs = route.legs;
            let directionsHtml = '<div class="space-y-3">';
            
            for (let legIndex = 0; legIndex < legs.length; legIndex++) {
                const leg = legs[legIndex];
                
                for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
                    const step = leg.steps[stepIndex];
                    const instruction = this.translateInstruction(step.maneuver.instruction);
                    const distance = (step.distance / 1000).toFixed(1);
                    const duration = Math.round(step.duration / 60);
                    
                    // Get maneuver type and icon
                    const maneuverType = step.maneuver.type;
                    const icon = this.getManeuverIcon(maneuverType);
                    
                    // Get traffic data for this step
                    const trafficInfo = await this.getTrafficForStep(step);
                    const trafficIcon = this.getTrafficIcon(trafficInfo.level);
                    const trafficText = this.getTrafficText(trafficInfo.level);
                    
                    directionsHtml += `
                        <div class="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                            <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 text-sm font-bold">${stepIndex + 1}</span>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-2">
                                    <span class="text-2xl">${icon}</span>
                                    <p class="text-sm font-semibold text-gray-800">${instruction}</p>
                                </div>
                                <div class="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                                    <span><i class="fas fa-route mr-1"></i>${distance} km</span>
                                    <span><i class="fas fa-clock mr-1"></i>${duration} phút</span>
                                </div>
                                <div class="flex items-center space-x-2 text-xs">
                                    <span class="text-lg">${trafficIcon}</span>
                                    <span class="font-medium ${this.getTrafficColor(trafficInfo.level)}">${trafficText}</span>
                                    ${trafficInfo.speed ? `<span class="text-gray-500">(${trafficInfo.speed} km/h)</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
            directionsHtml += '</div>';
            directionsContainer.innerHTML = directionsHtml;
            
        } catch (error) {
            console.error('Error generating turn-by-turn directions:', error);
            directionsContainer.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Không thể tạo hướng dẫn chi tiết</p>
                </div>
            `;
        }
    }

    getManeuverIcon(maneuverType) {
        const iconMap = {
            'turn': '↩️',
            'turn-left': '↩️',
            'turn-right': '↪️',
            'turn-sharp-left': '↰',
            'turn-sharp-right': '↱',
            'uturn': '↶',
            'straight': '⬆️',
            'ramp': '↗️',
            'merge': '🔀',
            'roundabout': '🔄',
            'rotary': '🔄',
            'fork': '🔀',
            'off-ramp': '↘️',
            'arrive': '🏁',
            'depart': '🚀'
        };
        
        return iconMap[maneuverType] || '➡️';
    }

    validateAndConfirmBooking() {
        // Get form elements
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('customerPhone');
        const emailInput = document.getElementById('customerEmail');
        const contactTimeSelect = document.getElementById('contactTime');
        const instructionsTextarea = document.getElementById('specialInstructions');
        const emergencyContactInput = document.getElementById('emergencyContact');
        const emergencyPhoneInput = document.getElementById('emergencyPhone');

        // Get values
        const customerName = nameInput?.value?.trim() || '';
        const customerPhone = phoneInput?.value?.trim() || '';
        const customerEmail = emailInput?.value?.trim() || '';
        const contactTime = contactTimeSelect?.value || '';
        const specialInstructions = instructionsTextarea?.value?.trim() || '';
        const emergencyContact = emergencyContactInput?.value?.trim() || '';
        const emergencyPhone = emergencyPhoneInput?.value?.trim() || '';

        // Validate required fields
        if (!customerName) {
            alert('Vui lòng nhập họ và tên khách hàng.');
            nameInput?.focus();
            // Hide the form after user acknowledges the error
            this.hideCustomerForm();
            return;
        }

        if (!customerPhone) {
            alert('Vui lòng nhập số điện thoại khách hàng.');
            phoneInput?.focus();
            // Hide the form after user acknowledges the error
            this.hideCustomerForm();
            return;
        }

        // Validate phone number format
        const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
        if (!phoneRegex.test(customerPhone)) {
            alert('Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0).');
            phoneInput?.focus();
            // Hide the form after user acknowledges the error
            this.hideCustomerForm();
            return;
        }

        // Validate email if provided
        if (customerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerEmail)) {
                alert('Vui lòng nhập email hợp lệ.');
                emailInput?.focus();
                // Hide the form after user acknowledges the error
                this.hideCustomerForm();
                return;
            }
        }

        // Validate emergency phone if emergency contact is provided
        if (emergencyContact && emergencyPhone) {
            if (!phoneRegex.test(emergencyPhone)) {
                alert('Vui lòng nhập số điện thoại khẩn cấp hợp lệ.');
                emergencyPhoneInput?.focus();
                // Hide the form after user acknowledges the error
                this.hideCustomerForm();
                return;
            }
        }

        // Collect all customer information
        const customerInfo = {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            contactTime: contactTime,
            specialInstructions: specialInstructions,
            emergencyContact: emergencyContact,
            emergencyPhone: emergencyPhone
        };

        // Hide the form first
        this.hideCustomerForm();

        // Show success message and proceed
        alert('Thông tin khách hàng đã được lưu thành công!');
        
        // Here you would typically send the data to your backend
        console.log('Customer Information:', customerInfo);
        console.log('Trip Details:', {
            pickup: this.pickupLocation,
            dropoff: this.dropoffLocation,
            pricing: this.pricing
        });

        // Show final confirmation
        this.showFinalConfirmation(customerInfo);
    }

    hideCustomerForm() {
        const customerForm = document.getElementById('customerInfoForm');
        if (customerForm) {
            customerForm.style.display = 'none';
        }
    }

    async updateTrafficAndWeather() {
        // Update traffic conditions
        await this.updateTrafficConditions();
        
        // Update weather conditions
        await this.updateWeatherConditions();
        
        // Update route quality assessment
        this.updateRouteQualityAssessment();
    }

    async updateTrafficConditions() {
        if (!this.trafficApiKey) {
            this.setTrafficPlaceholder();
            return;
        }

        try {
            // Get coordinates from route
            const coordinates = this.routeData?.routes?.[0]?.geometry?.coordinates;
            if (!coordinates || coordinates.length === 0) {
                this.setTrafficPlaceholder();
                return;
            }

            // Use the first coordinate for traffic check
            const [lng, lat] = coordinates[0];
            
            const response = await fetch(
                `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${this.trafficApiKey}&point=${lat},${lng}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.flowSegmentData) {
                    const flow = data.flowSegmentData;
                    this.updateTrafficDisplay(flow);
                } else {
                    this.setTrafficPlaceholder();
                }
            } else {
                this.setTrafficPlaceholder();
            }
        } catch (error) {
            console.error('Error fetching traffic data:', error);
            this.setTrafficPlaceholder();
        }
    }

    updateTrafficDisplay(flow) {
        const currentSpeed = flow.currentSpeed;
        const freeFlowSpeed = flow.freeFlowSpeed;
        
        // Update traffic level
        const trafficLevelElement = document.getElementById('trafficLevel');
        if (trafficLevelElement) {
            trafficLevelElement.textContent = this.getTrafficLevel(currentSpeed, freeFlowSpeed);
        }
        
        // Update current speed
        const currentSpeedElement = document.getElementById('currentSpeed');
        if (currentSpeedElement) {
            currentSpeedElement.textContent = `${currentSpeed || '--'} km/h`;
        }
        
        // Update normal speed
        const normalSpeedElement = document.getElementById('normalSpeed');
        if (normalSpeedElement) {
            normalSpeedElement.textContent = `${freeFlowSpeed || '--'} km/h`;
        }

        // Update estimated time
        const estimatedTimeElement = document.getElementById('estimatedTime');
        if (estimatedTimeElement && currentSpeed) {
            const distance = this.routeData?.routes?.[0]?.distance || 0;
            const estimatedTime = Math.round((distance / 1000) / (currentSpeed / 3.6) * 60);
            estimatedTimeElement.textContent = `${estimatedTime} phút`;
        }
    }

    setTrafficPlaceholder() {
        const trafficLevelElement = document.getElementById('trafficLevel');
        const currentSpeedElement = document.getElementById('currentSpeed');
        const normalSpeedElement = document.getElementById('normalSpeed');
        const estimatedTimeElement = document.getElementById('estimatedTime');
        
        if (trafficLevelElement) trafficLevelElement.textContent = 'Không xác định';
        if (currentSpeedElement) currentSpeedElement.textContent = '-- km/h';
        if (normalSpeedElement) normalSpeedElement.textContent = '-- km/h';
        if (estimatedTimeElement) estimatedTimeElement.textContent = '-- phút';
    }

    async updateWeatherConditions() {
        if (!this.weatherApiKey) {
            this.setWeatherPlaceholder();
            return;
        }

        try {
            const response = await fetch(
                `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=Hanoi&lang=vi`
            );

            if (response.ok) {
                const data = await response.json();
                this.updateWeatherDisplay(data);
            } else {
                this.setWeatherPlaceholder();
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
            this.setWeatherPlaceholder();
        }
    }

    updateWeatherDisplay(weatherData) {
        const weatherConditionElement = document.getElementById('weatherCondition');
        const temperatureElement = document.getElementById('temperature');
        const humidityElement = document.getElementById('humidity');
        const weatherImpactElement = document.getElementById('weatherImpact');
        
        if (weatherConditionElement) {
            weatherConditionElement.textContent = weatherData.current?.condition?.text || 'Không xác định';
        }
        
        if (temperatureElement) {
            temperatureElement.textContent = `${weatherData.current?.temp_c || '--'}°C`;
        }
        
        if (humidityElement) {
            humidityElement.textContent = `${weatherData.current?.humidity || '--'}%`;
        }
        
        if (weatherImpactElement) {
            const condition = weatherData.current?.condition?.text?.toLowerCase() || '';
            if (condition.includes('mưa') || condition.includes('rain')) {
                weatherImpactElement.textContent = 'Có thể ảnh hưởng';
                weatherImpactElement.className = 'font-semibold text-red-600';
            } else if (condition.includes('nắng') || condition.includes('sunny')) {
                weatherImpactElement.textContent = 'Tốt';
                weatherImpactElement.className = 'font-semibold text-green-600';
            } else {
                weatherImpactElement.textContent = 'Bình thường';
                weatherImpactElement.className = 'font-semibold text-orange-600';
            }
        }
    }

    setWeatherPlaceholder() {
        const weatherConditionElement = document.getElementById('weatherCondition');
        const temperatureElement = document.getElementById('temperature');
        const humidityElement = document.getElementById('humidity');
        const weatherImpactElement = document.getElementById('weatherImpact');
        
        if (weatherConditionElement) weatherConditionElement.textContent = 'Không xác định';
        if (temperatureElement) temperatureElement.textContent = '--°C';
        if (humidityElement) humidityElement.textContent = '--%';
        if (weatherImpactElement) {
            weatherImpactElement.textContent = 'Bình thường';
            weatherImpactElement.className = 'font-semibold text-orange-600';
        }
    }

    updateRouteQualityAssessment() {
        const routeScoreElement = document.getElementById('routeScore');
        const trafficScoreElement = document.getElementById('trafficScore');
        const safetyScoreElement = document.getElementById('safetyScore');
        
        // Calculate route quality score (1-10)
        const distance = this.routeData?.routes?.[0]?.distance || 0;
        const duration = this.routeData?.routes?.[0]?.duration || 0;
        
        let routeScore = 8; // Base score
        if (distance > 50000) routeScore -= 1; // Long distance
        if (duration > 3600) routeScore -= 1; // Long duration
        
        if (routeScoreElement) {
            routeScoreElement.textContent = routeScore;
        }
        
        // Calculate traffic score (1-10)
        let trafficScore = 7; // Base score
        // This would be updated with real traffic data
        if (trafficScoreElement) {
            trafficScoreElement.textContent = trafficScore;
        }
        
        // Calculate safety score (1-10)
        let safetyScore = 9; // Base score
        if (distance > 100000) safetyScore -= 1; // Very long distance
        if (safetyScoreElement) {
            safetyScoreElement.textContent = safetyScore;
        }
    }

    showFinalConfirmation(customerInfo) {
        // Create a modal for final confirmation
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div class="text-center mb-6">
                    <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-check text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">Đặt xe thành công!</h3>
                    <p class="text-gray-600">Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 class="font-semibold text-gray-800 mb-2">Thông tin đặt xe:</h4>
                    <div class="text-sm text-gray-600 space-y-1">
                        <p><strong>Khách hàng:</strong> ${customerInfo.name}</p>
                        <p><strong>Số điện thoại:</strong> ${customerInfo.phone}</p>
                        <p><strong>Điểm đón:</strong> ${this.pickupLocation?.name || '--'}</p>
                        <p><strong>Điểm đến:</strong> ${this.dropoffLocation?.name || '--'}</p>
                        <p><strong>Tổng cộng:</strong> ${this.pricing?.totalAmount || '--'} VNĐ</p>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button id="closeModal" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Đóng
                    </button>
                    <button id="printReceipt" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
                        In hóa đơn
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        document.getElementById('printReceipt')?.addEventListener('click', () => {
            window.print();
            document.body.removeChild(modal);
        });
    }

    async getTrafficForStep(step) {
        if (!this.trafficApiKey) {
            return { level: 'unknown', speed: null };
        }

        try {
            // Get coordinates from step geometry
            const coordinates = step.geometry.coordinates;
            if (!coordinates || coordinates.length === 0) {
                return { level: 'unknown', speed: null };
            }

            // Use the first coordinate for traffic check
            const [lng, lat] = coordinates[0];
            
            const response = await fetch(
                `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${this.trafficApiKey}&point=${lat},${lng}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.flowSegmentData) {
                    const flow = data.flowSegmentData;
                    const currentSpeed = flow.currentSpeed;
                    const freeFlowSpeed = flow.freeFlowSpeed;
                    
                    if (currentSpeed && freeFlowSpeed) {
                        const ratio = currentSpeed / freeFlowSpeed;
                        let level = 'unknown';
                        
                        if (ratio >= 0.8) level = 'free';
                        else if (ratio >= 0.6) level = 'moderate';
                        else if (ratio >= 0.4) level = 'slow';
                        else if (ratio >= 0.2) level = 'heavy';
                        else level = 'severe';
                        
                        return { level, speed: Math.round(currentSpeed) };
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching traffic data for step:', error);
        }
        
        return { level: 'unknown', speed: null };
    }

    getTrafficIcon(level) {
        const iconMap = {
            'free': '🟢',
            'moderate': '🟡',
            'slow': '🟠',
            'heavy': '🔴',
            'severe': '🔴',
            'unknown': '⚪'
        };
        
        return iconMap[level] || '⚪';
    }

    getTrafficText(level) {
        const textMap = {
            'free': 'Thông thoáng',
            'moderate': 'Hơi chậm',
            'slow': 'Chậm',
            'heavy': 'Rất chậm',
            'severe': 'Tắc đường',
            'unknown': 'Không xác định'
        };
        
        return textMap[level] || 'Không xác định';
    }

    getTrafficColor(level) {
        const colorMap = {
            'free': 'text-green-600',
            'moderate': 'text-yellow-600',
            'slow': 'text-orange-600',
            'heavy': 'text-red-600',
            'severe': 'text-red-700',
            'unknown': 'text-gray-500'
        };
        
        return colorMap[level] || 'text-gray-500';
    }

    translateInstruction(instruction) {
        // Common instruction translations
        const translations = {
            'Head': 'Đi thẳng',
            'Turn left': 'Rẽ trái',
            'Turn right': 'Rẽ phải',
            'Turn sharp left': 'Rẽ trái gấp',
            'Turn sharp right': 'Rẽ phải gấp',
            'Turn slight left': 'Rẽ trái nhẹ',
            'Turn slight right': 'Rẽ phải nhẹ',
            'Continue straight': 'Tiếp tục đi thẳng',
            'Go straight': 'Đi thẳng',
            'Keep left': 'Giữ bên trái',
            'Keep right': 'Giữ bên phải',
            'Take the ramp': 'Lên đường dốc',
            'Take the exit': 'Rời khỏi',
            'Merge': 'Nhập làn',
            'Roundabout': 'Vòng xoay',
            'U-turn': 'Quay đầu',
            'Arrive': 'Đến nơi',
            'Depart': 'Khởi hành',
            'at': 'tại',
            'onto': 'vào',
            'on': 'trên',
            'in': 'trong',
            'for': 'trong',
            'meters': 'mét',
            'kilometers': 'km',
            'feet': 'feet',
            'miles': 'dặm'
        };

        let translatedInstruction = instruction;
        
        // Replace common English phrases with Vietnamese
        Object.keys(translations).forEach(english => {
            const regex = new RegExp(english, 'gi');
            translatedInstruction = translatedInstruction.replace(regex, translations[english]);
        });

        return translatedInstruction;
    }

    updateEnhancedTripDetails(distance, duration, averageSpeed) {
        // Update total distance
        const totalDistanceElement = document.getElementById('totalDistance');
        if (totalDistanceElement) {
            totalDistanceElement.textContent = `${distance.toFixed(1)} km`;
        }

        // Update estimated duration
        const estimatedDurationElement = document.getElementById('estimatedDuration');
        if (estimatedDurationElement) {
            estimatedDurationElement.textContent = `${Math.round(duration)} phút`;
        }

        // Update average speed
        const averageSpeedElement = document.getElementById('averageSpeed');
        if (averageSpeedElement) {
            averageSpeedElement.textContent = `${averageSpeed} km/h`;
        }

        // Calculate and update route quality metrics
        this.updateRouteQualityMetrics(distance, duration, averageSpeed);
    }

    updateRouteQualityMetrics(distance, duration, averageSpeed) {
        // Calculate route score (0-100)
        const routeScore = Math.min(100, Math.max(0, 
            (averageSpeed / 50) * 40 + // Speed factor (max 40 points)
            (distance > 0 ? 30 : 0) + // Distance factor (30 points if route exists)
            (duration > 0 ? 30 : 0) // Duration factor (30 points if route exists)
        ));

        // Calculate traffic level (1-5, 1 being best)
        const trafficLevel = averageSpeed < 20 ? 5 : 
                           averageSpeed < 30 ? 4 : 
                           averageSpeed < 40 ? 3 : 
                           averageSpeed < 50 ? 2 : 1;

        // Calculate safety level (1-5, 1 being safest)
        const safetyLevel = distance < 5 ? 1 : 
                           distance < 15 ? 2 : 
                           distance < 30 ? 3 : 
                           distance < 50 ? 4 : 5;

        // Update route score
        const routeScoreElement = document.getElementById('routeScore');
        if (routeScoreElement) {
            routeScoreElement.textContent = `${Math.round(routeScore)}/100`;
        }

        // Update traffic level
        const trafficLevelElement = document.getElementById('trafficLevel');
        if (trafficLevelElement) {
            const trafficText = ['Rất tốt', 'Tốt', 'Trung bình', 'Kém', 'Rất kém'][trafficLevel - 1];
            trafficLevelElement.textContent = trafficText;
        }

        // Update safety level
        const safetyLevelElement = document.getElementById('safetyLevel');
        if (safetyLevelElement) {
            const safetyText = ['Rất an toàn', 'An toàn', 'Trung bình', 'Cần cẩn thận', 'Rủi ro cao'][safetyLevel - 1];
            safetyLevelElement.textContent = safetyText;
        }
    }

    calculateDetailedPricing(route) {
        const distance = route.distance / 1000;
        const duration = route.duration / 60;

        // Base pricing
        const baseFare = 15000;
        const perKmRate = 12000;
        const perMinuteRate = 500;

        // Calculate base costs
        const distanceFare = distance * perKmRate;
        const timeFare = duration * perMinuteRate;
        const subtotal = baseFare + distanceFare + timeFare;

        // Apply surcharges
        const rushHourFactor = this.getRushHourFactor();
        const weatherFactor = this.getWeatherFactor();
        const trafficFactor = this.getTrafficCongestionFactor();

        const rushHourSurcharge = subtotal * rushHourFactor;
        const weatherSurcharge = subtotal * weatherFactor;
        const trafficSurcharge = subtotal * trafficFactor;
        const totalSurcharge = rushHourSurcharge + weatherSurcharge + trafficSurcharge;

        // Calculate VAT (10%)
        const beforeVAT = subtotal + totalSurcharge;
        const vat = beforeVAT * 0.1;
        const total = beforeVAT + vat;

        // Update pricing display
        this.updatePricingDisplay({
            baseFare,
            distanceFare: distanceFare.toFixed(0),
            timeFare: timeFare.toFixed(0),
            subtotal: subtotal.toFixed(0),
            rushHourSurcharge: rushHourSurcharge.toFixed(0),
            weatherSurcharge: weatherSurcharge.toFixed(0),
            trafficSurcharge: trafficSurcharge.toFixed(0),
            totalSurcharge: totalSurcharge.toFixed(0),
            vat: vat.toFixed(0),
            total: total.toFixed(0),
            rushHourFactor: (rushHourFactor * 100).toFixed(1),
            weatherFactor: (weatherFactor * 100).toFixed(1),
            trafficFactor: (trafficFactor * 100).toFixed(1)
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

    updatePricingDisplay(pricing) {
        // Update individual pricing elements
        const baseFeeTotal = document.getElementById('baseFeeTotal');
        if (baseFeeTotal) baseFeeTotal.textContent = `${parseInt(pricing.baseFare).toLocaleString()} VNĐ`;

        const distanceQty = document.getElementById('distanceQty');
        const distanceFeeTotal = document.getElementById('distanceFeeTotal');
        if (distanceQty) distanceQty.textContent = `${parseFloat(pricing.distanceFare / 12000).toFixed(1)} km`;
        if (distanceFeeTotal) distanceFeeTotal.textContent = `${parseInt(pricing.distanceFare).toLocaleString()} VNĐ`;

        const waitTimeFeeTotal = document.getElementById('waitTimeFeeTotal');
        if (waitTimeFeeTotal) waitTimeFeeTotal.textContent = `${parseInt(pricing.timeFare).toLocaleString()} VNĐ`;

        const subtotalAmount = document.getElementById('subtotalAmount');
        if (subtotalAmount) subtotalAmount.textContent = `${parseInt(pricing.subtotal).toLocaleString()} VNĐ`;

        const vatAmount = document.getElementById('vatAmount');
        if (vatAmount) vatAmount.textContent = `${parseInt(pricing.vat).toLocaleString()} VNĐ`;

        const totalAmount = document.getElementById('totalAmount');
        if (totalAmount) totalAmount.textContent = `${parseInt(pricing.total).toLocaleString()} VNĐ`;

        // Show/hide surcharge rows based on factors
        const rushHourFeeRow = document.getElementById('rushHourFeeRow');
        const rushHourFeeTotal = document.getElementById('rushHourFeeTotal');
        if (pricing.rushHourFactor > 0) {
            if (rushHourFeeRow) rushHourFeeRow.classList.remove('hidden');
            if (rushHourFeeTotal) rushHourFeeTotal.textContent = `${parseInt(pricing.rushHourSurcharge).toLocaleString()} VNĐ`;
        }

        const weatherFeeRow = document.getElementById('weatherFeeRow');
        const weatherFeeTotal = document.getElementById('weatherFeeTotal');
        if (pricing.weatherFactor > 0) {
            if (weatherFeeRow) weatherFeeRow.classList.remove('hidden');
            if (weatherFeeTotal) weatherFeeTotal.textContent = `${parseInt(pricing.weatherSurcharge).toLocaleString()} VNĐ`;
        }
    }

    async fetchTrafficData(routeData) {
        if (!this.trafficApiKey) return;

        try {
            // Use TomTom Traffic API
            const coordinates = routeData.routes[0].geometry.coordinates;
            const bbox = this.calculateBoundingBox(coordinates);
            
            const response = await fetch(
                `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${this.trafficApiKey}&point=${coordinates[0][1]},${coordinates[0][0]}`
            );
            
            if (response.ok) {
                const data = await response.json();
                this.processTrafficData(data);
            }
        } catch (error) {
            console.error('Traffic data fetch error:', error);
        }
    }

    calculateBoundingBox(coordinates) {
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];
        let minLng = coordinates[0][0];
        let maxLng = coordinates[0][0];

        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
        });

        return `${minLat},${minLng},${maxLat},${maxLng}`;
    }

    processTrafficData(data) {
        // Process TomTom traffic data
        if (data.flowSegmentData) {
            const flowData = data.flowSegmentData;
            this.updateTrafficInfo(flowData);
        }
    }

    updateTrafficInfo(flowData) {
        // Update traffic information display
        const trafficElement = document.getElementById('trafficInfo');
        if (trafficElement) {
            const speed = flowData.currentSpeed || 0;
            const freeFlowSpeed = flowData.freeFlowSpeed || 0;
            const congestionLevel = speed / freeFlowSpeed;

            let congestionText = 'Thông thoáng';
            let congestionColor = 'text-green-600';

            if (congestionLevel < 0.3) {
                congestionText = 'Rất tắc';
                congestionColor = 'text-red-600';
            } else if (congestionLevel < 0.6) {
                congestionText = 'Tắc đường';
                congestionColor = 'text-orange-600';
            } else if (congestionLevel < 0.8) {
                congestionText = 'Chậm';
                congestionColor = 'text-yellow-600';
            }

            trafficElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <span>Tình trạng giao thông:</span>
                    <span class="font-semibold ${congestionColor}">${congestionText}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Tốc độ hiện tại:</span>
                    <span class="font-semibold">${speed} km/h</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Tốc độ bình thường:</span>
                    <span class="font-semibold">${freeFlowSpeed} km/h</span>
                </div>
            `;
        }
    }

    async fetchRealTimeData() {
        // Fetch weather data
        if (this.weatherApiKey && this.pickupLocation) {
            try {
                const response = await fetch(
                    `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${this.pickupLocation.coords[1]},${this.pickupLocation.coords[0]}&lang=vi`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    this.updateWeatherInfo(data);
                }
            } catch (error) {
                console.error('Weather data fetch error:', error);
            }
        }

        // Update conditions display
        this.updateConditionsDisplay();
    }

    updateWeatherInfo(data) {
        const weatherElement = document.getElementById('weatherInfo');
        if (weatherElement && data.current) {
            const current = data.current;
            weatherElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <span>Thời tiết:</span>
                    <span class="font-semibold">${current.condition.text}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Nhiệt độ:</span>
                    <span class="font-semibold">${current.temp_c}°C</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Độ ẩm:</span>
                    <span class="font-semibold">${current.humidity}%</span>
                </div>
            `;
        }
    }

    updateConditionsDisplay() {
        // Update rush hour status
        const rushHourElement = document.getElementById('rushHourStatus');
        if (rushHourElement) {
            const isRushHour = this.getRushHourFactor() > 0;
            rushHourElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-clock ${isRushHour ? 'text-orange-500' : 'text-green-500'}"></i>
                    <span class="${isRushHour ? 'text-orange-600' : 'text-green-600'}">
                        ${isRushHour ? 'Giờ cao điểm' : 'Giờ bình thường'}
                    </span>
                </div>
            `;
        }

        // Update traffic status
        const trafficElement = document.getElementById('trafficStatus');
        if (trafficElement) {
            trafficElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-car text-blue-500"></i>
                    <span class="text-blue-600">Đang kiểm tra tình trạng giao thông...</span>
                </div>
            `;
        }

        // Update weather status
        const weatherElement = document.getElementById('weatherStatus');
        if (weatherElement) {
            weatherElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-cloud-sun text-yellow-500"></i>
                    <span class="text-yellow-600">Đang kiểm tra thời tiết...</span>
                </div>
            `;
        }

        // Update location status
        const locationElement = document.getElementById('locationStatus');
        if (locationElement) {
            locationElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-map-marker-alt text-green-500"></i>
                    <span class="text-green-600">Vị trí đã xác định</span>
                </div>
            `;
        }
    }

    bindEvents() {
        // Back to booking button
        document.getElementById('backToBooking')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Confirm booking button with validation
        document.getElementById('confirmBooking')?.addEventListener('click', () => {
            this.validateAndConfirmBooking();
        });

        // Print invoice button
        document.getElementById('printInvoice')?.addEventListener('click', () => {
            window.print();
        });

        // Confirm booking button
        document.getElementById('confirmBooking')?.addEventListener('click', () => {
            this.confirmBooking();
        });

        // Trip details close button
        document.getElementById('closeTripDetails')?.addEventListener('click', () => {
            this.hideTripDetails();
        });
    }

    confirmBooking() {
        // Show confirmation message
        alert('Đặt xe thành công! Chúng tôi sẽ liên hệ với bạn trong vòng 5 phút.');
        
        // Redirect to main page
        window.location.href = 'index.html';
    }

    hideTripDetails() {
        const tripDetails = document.getElementById('tripDetails');
        if (tripDetails) {
            tripDetails.style.display = 'none';
        }
    }
}

// Initialize confirmation page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ConfirmationPage();
});