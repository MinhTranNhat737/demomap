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
        this.tollStations = [];
        this.speedLimits = [];
        this.routeBounds = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Confirmation Page...');
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
                
                // Show route type indicator
                const routeTypeElement = document.getElementById('routeType');
                if (routeTypeElement) {
                    routeTypeElement.classList.remove('hidden');
                }
                
                // Fetch toll stations and speed limits
                this.fetchTollStationsAndSpeedLimits();
            }
        } catch (error) {
            console.error('Route calculation failed:', error);
            this.showNotification('❌ Không thể tính toán đường đi', 'error');
        }
    }

    async fetchTollStationsAndSpeedLimits() {
        if (!this.route) return;

        try {
            const bounds = this.route.getBounds();
            this.routeBounds = bounds;
            
            // Get bounding box
            const south = bounds.getSouth();
            const west = bounds.getWest();
            const north = bounds.getNorth();
            const east = bounds.getEast();
            
            // Fetch toll stations using Overpass API
            await this.fetchTollStations(south, west, north, east);
            
            // Fetch speed limits for the route
            await this.fetchSpeedLimits(south, west, north, east);
            
        } catch (error) {
            console.error('Failed to fetch toll/speed data:', error);
            // Use simulated data as fallback
            this.simulateTollAndSpeedData();
        }
    }

    async fetchTollStations(south, west, north, east) {
        try {
            const overpassUrl = 'https://overpass-api.de/api/interpreter';
            // Mở rộng bounding box để tìm trạm thu phí chính xác hơn
            const margin = 0.05;
            const query = `
                [out:json][timeout:25];
                (
                    node["barrier"="toll_booth"](${south - margin},${west - margin},${north + margin},${east + margin});
                    node["amenity"="toll_booth"](${south - margin},${west - margin},${north + margin},${east + margin});
                    way["toll"="yes"](${south - margin},${west - margin},${north + margin},${east + margin});
                    way["highway"]["toll:hgv"](${south - margin},${west - margin},${north + margin},${east + margin});
                );
                out body;
                >;
                out skel qt;
            `;
            
            const response = await fetch(overpassUrl, {
                method: 'POST',
                body: query
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Overpass API response:', data.elements.length, 'elements found');
                
                // Lọc chỉ lấy những điểm gần route
                const filteredElements = this.filterNearbyTollStations(data.elements);
                
                if (filteredElements.length > 0) {
                    this.processTollStations(filteredElements);
                } else {
                    console.log('No toll stations found near route, using Vietnam-specific data');
                    this.simulateTollStations();
                }
            } else {
                console.log('Overpass API failed, using Vietnam-specific data');
                this.simulateTollStations();
            }
        } catch (error) {
            console.error('Toll fetch failed:', error);
            this.simulateTollStations();
        }
    }

    filterNearbyTollStations(elements) {
        if (!this.route) return elements;
        
        const routeCoords = this.route.getLatLngs();
        const filtered = [];
        
        elements.forEach(element => {
            if (element.type === 'node' && element.lat && element.lon) {
                // Kiểm tra xem trạm có gần route không (trong bán kính 2km)
                for (let coord of routeCoords) {
                    const distance = this.calculateDistance(
                        element.lat, element.lon,
                        coord.lat, coord.lng
                    );
                    if (distance < 2) { // 2km
                        filtered.push(element);
                        break;
                    }
                }
            }
        });
        
        return filtered;
    }

    async fetchSpeedLimits(south, west, north, east) {
        try {
            const overpassUrl = 'https://overpass-api.de/api/interpreter';
            const query = `
                [out:json][timeout:25];
                (
                    way["highway"]["maxspeed"](${south},${west},${north},${east});
                );
                out body;
                >;
                out skel qt;
            `;
            
            const response = await fetch(overpassUrl, {
                method: 'POST',
                body: query
            });
            
            if (response.ok) {
                const data = await response.json();
                this.processSpeedLimits(data.elements);
                console.log('Speed limits fetched:', data.elements.length);
            } else {
                console.log('Speed limit API failed, using simulated data');
                this.simulateSpeedLimits();
            }
        } catch (error) {
            console.error('Speed limit fetch failed:', error);
            this.simulateSpeedLimits();
        }
    }

    processTollStations(elements) {
        this.tollStations = [];
        const processedLocations = new Set();
        
        elements.forEach(element => {
            if (element.type === 'node' && element.lat && element.lon) {
                // Làm tròn tọa độ để tránh trùng lặp
                const locationKey = `${element.lat.toFixed(3)}_${element.lon.toFixed(3)}`;
                
                // Kiểm tra trùng lặp
                if (!processedLocations.has(locationKey) && this.tollStations.length < 5) {
                    const tollInfo = {
                        lat: element.lat,
                        lng: element.lon,
                        name: element.tags?.name || 'Trạm thu phí',
                        type: element.tags?.toll || 'yes'
                    };
                    this.tollStations.push(tollInfo);
                    this.addTollMarker(tollInfo);
                    processedLocations.add(locationKey);
                }
            }
        });
        
        console.log(`✅ Processed ${this.tollStations.length} toll stations (filtered from ${elements.length} elements)`);
        
        // If no toll stations found, simulate some
        if (this.tollStations.length === 0) {
            this.simulateTollStations();
        } else {
            this.updateTollInformation();
        }
    }

    processSpeedLimits(elements) {
        this.speedLimits = [];
        
        elements.forEach(element => {
            if (element.type === 'way' && element.tags?.maxspeed) {
                const speedLimit = {
                    maxspeed: element.tags.maxspeed,
                    highway: element.tags.highway,
                    name: element.tags.name || 'Unnamed road'
                };
                this.speedLimits.push(speedLimit);
            }
        });
        
        if (this.speedLimits.length === 0) {
            this.simulateSpeedLimits();
        } else {
            this.updateSpeedLimitInformation();
        }
    }

    simulateTollStations() {
        // Simulate toll stations for Vietnam highways
        if (!this.route) return;
        
        const coordinates = this.route.getLatLngs();
        const routeDistance = this.calculateTotalDistance();
        
        console.log(`🛣️ Route distance: ${routeDistance.toFixed(2)} km`);
        
        // Danh sách trạm thu phí thực tế phổ biến ở Việt Nam
        const vietnamTollStations = [
            { name: 'Trạm thu phí Pháp Vân - Cầu Giẽ', lat: 20.9736, lng: 105.8481 },
            { name: 'Trạm thu phí Hòa Lạc - Hòa Bình', lat: 20.9814, lng: 105.6789 },
            { name: 'Trạm thu phí Cầu Bính', lat: 21.0892, lng: 105.9234 },
            { name: 'Trạm thu phí Bắc Hưng Hải', lat: 20.8542, lng: 106.1234 },
            { name: 'Trạm thu phí Đại Thịnh', lat: 21.1234, lng: 105.7890 },
            { name: 'Trạm thu phí Ninh Bình', lat: 20.2506, lng: 105.9745 }
        ];
        
        // Tìm trạm thu phí gần route (trong bán kính 3km)
        vietnamTollStations.forEach(station => {
            let minDistance = Infinity;
            
            // Kiểm tra khoảng cách đến route
            for (let coord of coordinates) {
                const distance = this.calculateDistance(
                    station.lat, station.lng,
                    coord.lat, coord.lng
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
            
            // Chỉ thêm nếu cách route < 3km và chưa đủ 3 trạm
            if (minDistance < 3 && this.tollStations.length < 3) {
                const tollInfo = {
                    lat: station.lat,
                    lng: station.lng,
                    name: station.name,
                    type: 'vietnam_known'
                };
                
                this.tollStations.push(tollInfo);
                this.addTollMarker(tollInfo);
                console.log(`📍 Found toll station: ${station.name} (${minDistance.toFixed(2)} km from route)`);
            }
        });
        
        console.log(`✅ Total toll stations found: ${this.tollStations.length}`);
        
        this.updateTollInformation();
    }

    simulateSpeedLimits() {
        // Simulate speed limits based on road type
        this.speedLimits = [
            { maxspeed: '80', highway: 'primary', name: 'Đường chính' },
            { maxspeed: '60', highway: 'secondary', name: 'Đường nhánh' },
            { maxspeed: '50', highway: 'residential', name: 'Đường nội thành' }
        ];
        
        this.updateSpeedLimitInformation();
    }

    simulateTollAndSpeedData() {
        this.simulateTollStations();
        this.simulateSpeedLimits();
    }

    estimateTollFee() {
        // Estimate toll fee based on vehicle type (assuming 4-seat car)
        const fees = ['30,000 VNĐ', '40,000 VNĐ', '50,000 VNĐ', '60,000 VNĐ'];
        return fees[Math.floor(Math.random() * fees.length)];
    }

    addTollMarker(tollInfo) {
        const tollIcon = L.divIcon({
            html: `
                <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 3px solid white;">
                    <i class="fas fa-toll-highway" style="font-size: 16px;"></i>
                </div>
            `,
            className: 'toll-marker',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        
        const marker = L.marker([tollInfo.lat, tollInfo.lng], { icon: tollIcon })
            .addTo(this.map)
            .bindPopup(`
                <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #ea580c;">
                        <i class="fas fa-toll-highway" style="margin-right: 5px;"></i>${tollInfo.name}
                    </h3>
                    <div style="background: #ffedd5; padding: 10px; border-radius: 8px; border-left: 4px solid #f97316;">
                        <p style="margin: 0; font-size: 13px; color: #9a3412;">
                            <i class="fas fa-info-circle" style="margin-right: 4px;"></i>
                            <strong>Lưu ý:</strong> Có trạm thu phí trên tuyến
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 12px; color: #c2410c;">
                            Vui lòng chuẩn bị tiền mặt hoặc thẻ thanh toán
                        </p>
                    </div>
                </div>
            `);
        
        // Add to toll stations array for reference
        if (!this.tollMarkers) this.tollMarkers = [];
        this.tollMarkers.push(marker);
    }

    updateTollInformation() {
        // Chỉ hiển thị thông báo, không tính tiền
        const tollInfoHtml = `
            <div class="mt-6 p-5 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-300 shadow-lg">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="bg-orange-600 p-3 rounded-full shadow-md">
                        <i class="fas fa-toll-highway text-white text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-orange-800">Thông báo trạm thu phí</h3>
                        <p class="text-sm text-orange-600">Phát hiện ${this.tollStations.length} trạm thu phí trên tuyến</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-3">
                    ${this.tollStations.map((toll, index) => `
                        <div class="bg-white p-3 rounded-lg border-l-4 border-orange-400 shadow-sm flex items-center space-x-3">
                            <div class="bg-orange-100 text-orange-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                ${index + 1}
                            </div>
                            <div class="flex-1">
                                <span class="font-semibold text-gray-800">${toll.name}</span>
                            </div>
                            <i class="fas fa-map-marker-alt text-orange-500"></i>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 p-4 bg-orange-100 border-l-4 border-orange-500 rounded">
                    <div class="flex items-start space-x-3">
                        <i class="fas fa-exclamation-circle text-orange-600 text-xl mt-1"></i>
                        <div>
                            <p class="font-semibold text-orange-800 text-sm">Lưu ý quan trọng</p>
                            <p class="text-orange-700 text-xs mt-1">Vui lòng chuẩn bị tiền mặt hoặc thẻ để thanh toán phí đường bộ. Phí thu tùy thuộc vào loại xe.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after traffic congestion details
        const trafficDetails = document.getElementById('trafficCongestionDetails');
        if (trafficDetails) {
            // Remove old toll info if exists
            const oldTollInfo = document.getElementById('tollInformation');
            if (oldTollInfo) oldTollInfo.remove();
            
            // Add new toll info
            const tollDiv = document.createElement('div');
            tollDiv.id = 'tollInformation';
            tollDiv.innerHTML = tollInfoHtml;
            trafficDetails.parentNode.insertBefore(tollDiv, trafficDetails.nextSibling);
        }
    }

    calculateTotalDistance() {
        if (!this.route) return 0;
        const coords = this.route.getLatLngs();
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            total += this.calculateDistance(
                coords[i-1].lat, coords[i-1].lng,
                coords[i].lat, coords[i].lng
            );
        }
        return total;
    }

    estimateDuration(distance) {
        // Estimate duration based on distance (assuming 40 km/h average)
        return (distance / 40) * 60; // in minutes
    }

    updateSpeedLimitInformation() {
        // Get unique speed limits
        const uniqueSpeeds = [...new Set(this.speedLimits.map(s => s.maxspeed))].sort((a, b) => {
            return parseInt(b) - parseInt(a);
        });
        
        const speedInfoHtml = `
            <div class="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-lg">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="bg-blue-600 p-3 rounded-full shadow-md">
                        <i class="fas fa-tachometer-alt text-white text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-blue-800">Giới hạn tốc độ trên tuyến</h3>
                        <p class="text-sm text-blue-600">Các mức tốc độ cần tuân thủ</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${uniqueSpeeds.map(speed => {
                        const speedValue = parseInt(speed);
                        let colorClass = 'bg-green-50 border-green-300 text-green-700';
                        if (speedValue >= 80) colorClass = 'bg-red-50 border-red-300 text-red-700';
                        else if (speedValue >= 60) colorClass = 'bg-yellow-50 border-yellow-300 text-yellow-700';
                        
                        return `
                            <div class="${colorClass} p-4 rounded-lg border-2 text-center">
                                <div class="text-3xl font-bold mb-1">${speed}</div>
                                <div class="text-xs font-semibold">km/h</div>
                                <div class="text-xs mt-2 opacity-75">Giới hạn</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <div class="flex items-start space-x-3">
                        <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mt-1"></i>
                        <div>
                            <p class="font-semibold text-yellow-800 text-sm">Lưu ý quan trọng</p>
                            <p class="text-yellow-700 text-xs mt-1">Vui lòng tuân thủ tốc độ giới hạn để đảm bảo an toàn. Vi phạm tốc độ có thể bị phạt nặng.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after toll information
        const tollInfo = document.getElementById('tollInformation');
        if (tollInfo) {
            // Remove old speed info if exists
            const oldSpeedInfo = document.getElementById('speedLimitInformation');
            if (oldSpeedInfo) oldSpeedInfo.remove();
            
            // Add new speed info
            const speedDiv = document.createElement('div');
            speedDiv.id = 'speedLimitInformation';
            speedDiv.innerHTML = speedInfoHtml;
            tollInfo.parentNode.insertBefore(speedDiv, tollInfo.nextSibling);
        }
    }

    drawRouteWithTraffic(coordinates, distance, duration) {
        // Clear existing route layers
        if (this.route) {
            this.map.removeLayer(this.route);
        }
        
        // Clear all traffic segment layers
        if (this.trafficLayers) {
            this.trafficLayers.forEach(layer => this.map.removeLayer(layer));
        }
        this.trafficLayers = [];

        // Analyze traffic for different segments
        this.analyzeTrafficSegments(coordinates);

        // Draw base route (main line)
        const baseRouteStyle = {
            color: '#3b82f6',
            weight: 8,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round'
        };

        this.route = L.polyline(coordinates, baseRouteStyle).addTo(this.map);
        
        // Draw traffic congestion overlays AFTER base route (so they appear on top)
        this.drawCongestedSegments();
        
        // Fit map to route
        this.map.fitBounds(this.route.getBounds().pad(0.1));
        
        // Update route quality indicator
        this.updateRouteQuality();
    }

    analyzeTrafficSegments(coordinates) {
        // Divide route into more segments for better accuracy (15-20 segments)
        const numSegments = 15;
        const segmentSize = Math.max(1, Math.floor(coordinates.length / numSegments));
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

        // Log traffic statistics for debugging
        const congestedCount = this.congestionSegments.filter(s => s.congestionLevel > 0.4).length;
        const severeCount = this.congestionSegments.filter(s => s.congestionLevel > 0.8).length;
        console.log(`Traffic Analysis: ${congestedCount}/${this.congestionSegments.length} segments congested (${severeCount} severe)`);

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

        // Chỉ 30% đoạn đường có khả năng bị tắc
        const hasCongestion = Math.random() < 0.3;
        
        if (!hasCongestion) {
            // 70% đường thông thoáng (0-0.2)
            return Math.random() * 0.2;
        }

        // Với 30% đoạn có tắc, phân bổ mức độ
        let baseCongestion = 0.1;
        
        // Rush hour chỉ tăng nhẹ xác suất tắc
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        if (isRushHour) {
            baseCongestion = 0.2;
        }

        // Location-based congestion (simulate city center)
        const cityCenterLat = 21.0285;
        const cityCenterLng = 105.8542;
        const distanceFromCenter = Math.sqrt(
            Math.pow(lat - cityCenterLat, 2) + Math.pow(lng - cityCenterLng, 2)
        );

        // Chỉ khu vực trung tâm mới có khả năng tắc cao
        if (distanceFromCenter < 0.02) { // Very close to center
            baseCongestion += 0.4;
        } else if (distanceFromCenter < 0.05) { // Within city center
            baseCongestion += 0.2;
        }

        // Thêm yếu tố ngẫu nhiên nhưng không quá cao
        const randomFactor = Math.random() * 0.4;
        
        return Math.min(0.95, baseCongestion + randomFactor);
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
        this.congestionSegments.forEach((segment, index) => {
            let color, weight, opacity, dashArray;
            
            if (segment.congestionLevel > 0.8) {
                // Severe congestion - RED with thick line
                color = '#dc2626';
                weight = 12;
                opacity = 0.95;
                dashArray = null;
            } else if (segment.congestionLevel > 0.6) {
                // Heavy congestion - DARK RED
                color = '#ef4444';
                weight = 11;
                opacity = 0.9;
                dashArray = null;
            } else if (segment.congestionLevel > 0.4) {
                // Moderate congestion - ORANGE
                color = '#f59e0b';
                weight = 10;
                opacity = 0.85;
                dashArray = null;
            } else if (segment.congestionLevel > 0.2) {
                // Light congestion - YELLOW
                color = '#fbbf24';
                weight = 9;
                opacity = 0.75;
                dashArray = '10, 5';
            } else {
                // Good traffic - GREEN
                color = '#10b981';
                weight = 8;
                opacity = 0.7;
                dashArray = '10, 5';
            }
            
            const layer = L.polyline(segment.coordinates, {
                color: color,
                weight: weight,
                opacity: opacity,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: dashArray
            }).addTo(this.map);
            
            // Add popup with congestion info and speed limit
            const congestionPercent = Math.round(segment.congestionLevel * 100);
            let statusText = '';
            let statusIcon = '';
            
            if (segment.congestionLevel > 0.8) {
                statusText = 'Tắc nghiêm trọng';
                statusIcon = '🔴';
            } else if (segment.congestionLevel > 0.6) {
                statusText = 'Tắc nặng';
                statusIcon = '🔴';
            } else if (segment.congestionLevel > 0.4) {
                statusText = 'Tắc vừa';
                statusIcon = '🟠';
            } else if (segment.congestionLevel > 0.2) {
                statusText = 'Chậm';
                statusIcon = '🟡';
            } else {
                statusText = 'Thông thoáng';
                statusIcon = '🟢';
            }
            
            // Determine speed limit for this segment
            const speedLimit = this.getSpeedLimitForSegment(segment);
            const speedLimitHtml = speedLimit ? `
                <div class="mt-3 pt-3 border-t border-gray-300">
                    <div class="flex items-center justify-center space-x-2 bg-blue-50 p-2 rounded">
                        <i class="fas fa-tachometer-alt text-blue-600"></i>
                        <span class="font-bold text-blue-800">Giới hạn: ${speedLimit} km/h</span>
                    </div>
                </div>
            ` : '';
            
            layer.bindPopup(`
                <div style="min-width: 220px;">
                    <div class="text-center">
                        <div class="text-3xl mb-2">${statusIcon}</div>
                        <div class="font-bold text-xl mb-2 text-gray-800">${statusText}</div>
                        <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div class="bg-gray-100 p-2 rounded">
                                <div class="text-gray-600 text-xs">Đoạn</div>
                                <div class="font-bold text-gray-800">#${index + 1}</div>
                            </div>
                            <div class="bg-gray-100 p-2 rounded">
                                <div class="text-gray-600 text-xs">Mức độ</div>
                                <div class="font-bold text-gray-800">${congestionPercent}%</div>
                            </div>
                        </div>
                        <div class="bg-indigo-50 p-2 rounded">
                            <div class="text-xs text-gray-600">Quãng đường</div>
                            <div class="font-bold text-indigo-700">${segment.distance.toFixed(2)} km</div>
                        </div>
                        ${speedLimitHtml}
                    </div>
                </div>
            `);
            
            this.trafficLayers.push(layer);
        });
    }

    getSpeedLimitForSegment(segment) {
        // Get speed limit from fetched data or estimate based on road type
        if (this.speedLimits && this.speedLimits.length > 0) {
            // Return most common speed limit or random from available
            const speeds = this.speedLimits.map(s => parseInt(s.maxspeed));
            const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            return Math.round(avgSpeed);
        }
        
        // Estimate based on congestion level and location
        const midPoint = segment.coordinates[Math.floor(segment.coordinates.length / 2)];
        const cityCenterLat = 21.0285;
        const cityCenterLng = 105.8542;
        const distanceFromCenter = this.calculateDistance(
            midPoint[0], midPoint[1],
            cityCenterLat, cityCenterLng
        );
        
        if (distanceFromCenter < 2) {
            return 50; // City center
        } else if (distanceFromCenter < 5) {
            return 60; // Urban area
        } else if (distanceFromCenter < 10) {
            return 80; // Suburban
        } else {
            return 90; // Highway
        }
    }

    updateRouteQuality() {
        // Calculate overall route quality
        const totalCongestion = this.congestionSegments.reduce((sum, seg) => sum + seg.congestionLevel, 0);
        const avgCongestion = totalCongestion / this.congestionSegments.length;
        
        // Quality is inverse of congestion (0-100%, where 100% is best)
        const quality = Math.round((1 - avgCongestion) * 100);
        
        const qualityBar = document.getElementById('routeQualityBar');
        const qualityText = document.getElementById('routeQualityText');
        
        if (qualityBar && qualityText) {
            qualityBar.style.width = `${quality}%`;
            
            if (quality >= 70) {
                qualityText.textContent = 'Tốt';
                qualityText.className = 'text-sm font-bold text-green-600';
            } else if (quality >= 40) {
                qualityText.textContent = 'TB';
                qualityText.className = 'text-sm font-bold text-orange-600';
            } else {
                qualityText.textContent = 'Kém';
                qualityText.className = 'text-sm font-bold text-red-600';
            }
        }
    }

    updateCongestionInfo() {
        const severeSegments = this.congestionSegments.filter(s => s.congestionLevel > 0.8);
        const heavySegments = this.congestionSegments.filter(s => s.congestionLevel > 0.6 && s.congestionLevel <= 0.8);
        const moderateSegments = this.congestionSegments.filter(s => s.congestionLevel > 0.4 && s.congestionLevel <= 0.6);
        const congestedSegments = this.congestionSegments.filter(s => s.congestionLevel > 0.4);
        const totalCongestedDistance = congestedSegments.reduce((sum, s) => sum + s.distance, 0);
        
        // Chỉ hiển thị cảnh báo nếu có đoạn tắc
        if (congestedSegments.length > 0) {
            document.getElementById('trafficCongestionDetails').classList.remove('hidden');
            
            const congestionInfo = document.getElementById('congestionInfo');
            const totalSegments = this.congestionSegments.length;
            const smoothSegments = totalSegments - congestedSegments.length;
            
            congestionInfo.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-white border-2 border-blue-200 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-road text-blue-600 text-xl"></i>
                                <span class="font-bold text-gray-800 text-lg">Tình trạng giao thông</span>
                            </div>
                            <span class="text-sm text-gray-600">${congestedSegments.length}/${totalSegments} đoạn có tắc</span>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            ${severeSegments.length > 0 ? `
                                <div class="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                                        <span class="font-semibold text-red-800">Tắc nghiêm trọng</span>
                                    </div>
                                    <p class="text-red-700 font-bold text-lg">${severeSegments.length}</p>
                                </div>
                            ` : ''}
                            ${heavySegments.length > 0 ? `
                                <div class="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                                        <span class="font-semibold text-orange-800">Tắc nặng</span>
                                    </div>
                                    <p class="text-orange-700 font-bold text-lg">${heavySegments.length}</p>
                                </div>
                            ` : ''}
                            ${moderateSegments.length > 0 ? `
                                <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <span class="font-semibold text-yellow-800">Tắc vừa</span>
                                    </div>
                                    <p class="text-yellow-700 font-bold text-lg">${moderateSegments.length}</p>
                                </div>
                            ` : ''}
                            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                                <div class="flex items-center space-x-2 mb-1">
                                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span class="font-semibold text-green-800">Thông thoáng</span>
                                </div>
                                <p class="text-green-700 font-bold text-lg">${smoothSegments}</p>
                            </div>
                            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <div class="flex items-center space-x-2 mb-1">
                                    <i class="fas fa-route text-blue-600"></i>
                                    <span class="font-semibold text-blue-800">Quãng tắc</span>
                                </div>
                                <p class="text-blue-700 font-bold text-lg">${totalCongestedDistance.toFixed(1)} km</p>
                            </div>
                        </div>
                    </div>
                    ${totalCongestedDistance > 0.5 ? `
                        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-clock text-yellow-600 text-xl mt-1"></i>
                                <div>
                                    <p class="font-semibold text-yellow-800">Thời gian chậm trễ dự kiến</p>
                                    <p class="text-yellow-700 text-lg font-bold">+${Math.round(totalCongestedDistance * 3)} phút</p>
                                    <p class="text-sm text-yellow-600 mt-1">Do tắc đường tại một số đoạn</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            // Update traffic info overlay
            this.updateTrafficInfoOverlay(congestedSegments, totalCongestedDistance);
        } else {
            // Ẩn cảnh báo nếu không có tắc đường
            document.getElementById('trafficCongestionDetails').classList.add('hidden');
            document.getElementById('trafficInfoOverlay').classList.add('hidden');
        }
    }

    updateTrafficInfoOverlay(congestedSegments, totalDistance) {
        const overlay = document.getElementById('trafficInfoOverlay');
        const content = document.getElementById('trafficInfoContent');
        
        if (congestedSegments.length > 0) {
            overlay.classList.remove('hidden');
            
            const severeCount = congestedSegments.filter(s => s.congestionLevel > 0.8).length;
            const heavyCount = congestedSegments.filter(s => s.congestionLevel > 0.6 && s.congestionLevel <= 0.8).length;
            
            content.innerHTML = `
                <div class="space-y-3">
                    <div class="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-semibold text-red-800">Đoạn tắc nghiêm trọng</span>
                            <span class="font-bold text-red-600 text-xl">${severeCount}</span>
                        </div>
                    </div>
                    <div class="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-semibold text-orange-800">Đoạn tắc nặng</span>
                            <span class="font-bold text-orange-600 text-xl">${heavyCount}</span>
                        </div>
                    </div>
                    <div class="border-t-2 border-gray-300 pt-3">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-700">Tổng quãng tắc:</span>
                            <span class="font-bold text-gray-900">${totalDistance.toFixed(2)} km</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Chậm trễ dự kiến:</span>
                            <span class="font-bold text-red-600 text-lg">+${Math.round(totalDistance * 3)} phút</span>
                        </div>
                    </div>
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-300 text-center">
                        <i class="fas fa-lightbulb text-yellow-600 mr-1"></i>
                        <span class="text-xs text-yellow-800 font-semibold">Nhấn vào đường đỏ để xem chi tiết</span>
                    </div>
                </div>
            `;
        } else {
            overlay.classList.add('hidden');
        }
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
        // Update pickup and dropoff locations
        if (this.pickupLocation) {
            const pickupDisplay = document.getElementById('pickupLocationDisplay');
            if (pickupDisplay) pickupDisplay.textContent = this.pickupLocation.name;
            
            // Update pickup coordinates
            const pickupCoords = document.getElementById('pickupCoords');
            if (pickupCoords) {
                pickupCoords.textContent = `Tọa độ: ${this.pickupLocation.lat.toFixed(4)}, ${this.pickupLocation.lng.toFixed(4)}`;
            }
        }
        
        if (this.dropoffLocation) {
            const dropoffDisplay = document.getElementById('dropoffLocationDisplay');
            if (dropoffDisplay) dropoffDisplay.textContent = this.dropoffLocation.name;
            
            // Update dropoff coordinates
            const dropoffCoords = document.getElementById('dropoffCoords');
            if (dropoffCoords) {
                dropoffCoords.textContent = `Tọa độ: ${this.dropoffLocation.lat.toFixed(4)}, ${this.dropoffLocation.lng.toFixed(4)}`;
            }
        }

        // Update distance
        document.getElementById('distance').textContent = `${distance.toFixed(1)} km`;
        
        // Update duration
        document.getElementById('duration').textContent = `${Math.round(duration)} phút`;
        
        // Update duration note based on traffic
        const durationNote = document.getElementById('durationNote');
        if (durationNote) {
            const now = new Date();
            const hour = now.getHours();
            const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
            
            if (isRushHour) {
                durationNote.textContent = `+${Math.round(duration * 0.3)} phút nếu tắc`;
            } else {
                durationNote.textContent = 'Thời gian ước tính chính xác';
            }
        }
        
        // Calculate average speed
        const avgSpeed = duration > 0 ? (distance / (duration / 60)).toFixed(1) : 0;
        const avgSpeedElement = document.getElementById('avgSpeed');
        if (avgSpeedElement) {
            avgSpeedElement.textContent = `${avgSpeed} km/h`;
        }
        
        // Update additional information
        this.updateAdditionalTripInfo(distance, duration, avgSpeed);
        
        // Calculate pricing breakdown
        this.calculateDetailedPricing(distance, duration);
    }

    updateAdditionalTripInfo(distance, duration, avgSpeed) {
        // Calculate fuel estimate (assuming 8km/liter average)
        const fuelEstimate = (distance / 8).toFixed(1);
        const fuelElement = document.getElementById('fuelEstimate');
        if (fuelElement) {
            fuelElement.textContent = `${fuelEstimate} lít`;
        }
        
        // Calculate CO2 emission (2.31 kg CO2 per liter of gasoline)
        const co2Estimate = (fuelEstimate * 2.31).toFixed(2);
        const co2Element = document.getElementById('co2Estimate');
        if (co2Element) {
            co2Element.textContent = `${co2Estimate} kg`;
        }
        
        // Determine road type based on average speed
        const roadTypeElement = document.getElementById('roadType');
        if (roadTypeElement) {
            if (avgSpeed > 60) {
                roadTypeElement.textContent = 'Đường cao tốc';
            } else if (avgSpeed > 40) {
                roadTypeElement.textContent = 'Đường liên tỉnh';
            } else if (avgSpeed > 25) {
                roadTypeElement.textContent = 'Đường thành phố';
            } else {
                roadTypeElement.textContent = 'Đường nội thành';
            }
        }
    }

    calculateDetailedPricing(distance, duration) {
        const now = new Date();
        const hour = now.getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        
        // Base pricing
        const baseFee = 15000;
        const pricePerKm = 15000;
        const waitTimeFee = 0; // No wait time for estimation
        const waitTimeFeePerMin = 5000;
        
        // Calculate base amounts
        const distanceFee = Math.round(distance * pricePerKm);
        const waitFee = Math.round(waitTimeFee * waitTimeFeePerMin);
        
        // Update distance quantity
        const distanceQty = document.getElementById('distanceQty');
        if (distanceQty) distanceQty.textContent = `${distance.toFixed(1)} km`;
        
        // Update distance fee
        const distanceFeeTotal = document.getElementById('distanceFeeTotal');
        if (distanceFeeTotal) distanceFeeTotal.textContent = `${distanceFee.toLocaleString()} VNĐ`;
        
        // Calculate subtotal before surcharges
        let subtotal = baseFee + distanceFee + waitFee;
        
        // Rush hour surcharge (8%) - Giảm xuống dưới 10%
        let rushHourFee = 0;
        if (isRushHour) {
            rushHourFee = Math.round(subtotal * 0.08);
            const rushHourRow = document.getElementById('rushHourFeeRow');
            const rushHourFeeTotal = document.getElementById('rushHourFeeTotal');
            if (rushHourRow) rushHourRow.classList.remove('hidden');
            if (rushHourFeeTotal) rushHourFeeTotal.textContent = `${rushHourFee.toLocaleString()} VNĐ`;
        }
        
        // Weather surcharge (5%) - Đã dưới 10%
        let weatherFee = 0;
        if (this.weatherData && ['Rain', 'Thunderstorm', 'Heavy Rain'].includes(this.weatherData.condition)) {
            weatherFee = Math.round(subtotal * 0.05);
            const weatherRow = document.getElementById('weatherFeeRow');
            const weatherFeeTotal = document.getElementById('weatherFeeTotal');
            if (weatherRow) weatherRow.classList.remove('hidden');
            if (weatherFeeTotal) weatherFeeTotal.textContent = `${weatherFee.toLocaleString()} VNĐ`;
        }
        
        // KHÔNG cộng phí thu vào tổng tiền
        // Chỉ thông báo có trạm thu phí
        
        // Calculate subtotal with surcharges (KHÔNG bao gồm toll)
        subtotal = subtotal + rushHourFee + weatherFee;
        
        // Calculate VAT (8%)
        const vat = Math.round(subtotal * 0.08);
        
        // Calculate total
        const total = subtotal + vat;
        
        // Update UI
        const subtotalElement = document.getElementById('subtotalAmount');
        const vatElement = document.getElementById('vatAmount');
        const totalElement = document.getElementById('totalAmount');
        
        if (subtotalElement) subtotalElement.textContent = `${subtotal.toLocaleString()} VNĐ`;
        if (vatElement) vatElement.textContent = `${vat.toLocaleString()} VNĐ`;
        if (totalElement) totalElement.textContent = `${total.toLocaleString()} VNĐ`;
        
        // Also update the old estimatedPrice element if it exists
        const estimatedPriceElement = document.getElementById('estimatedPrice');
        if (estimatedPriceElement) {
            estimatedPriceElement.textContent = `${total.toLocaleString()} VNĐ`;
        }
    }

    updateConditionsDisplay() {
        // Update rush hour status
        const now = new Date();
        const hour = now.getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        
        const rushHourIcon = document.getElementById('rushHourIcon');
        const rushHourStatus = document.getElementById('rushHourStatus');
        const rushHourBar = document.getElementById('rushHourBar');
        
        if (isRushHour) {
            rushHourIcon.textContent = '🔴';
            rushHourStatus.textContent = 'Giờ cao điểm';
            rushHourStatus.className = 'text-base font-bold text-red-600 mt-1';
            if (rushHourBar) rushHourBar.style.width = '90%';
        } else {
            rushHourIcon.textContent = '🟢';
            rushHourStatus.textContent = 'Bình thường';
            rushHourStatus.className = 'text-base font-bold text-green-600 mt-1';
            if (rushHourBar) rushHourBar.style.width = '30%';
        }

        // Update traffic status
        const trafficIcon = document.getElementById('trafficIcon');
        const trafficStatus = document.getElementById('trafficStatus');
        const trafficBar = document.getElementById('trafficBar');
        
        if (this.trafficData) {
            const speedRatio = this.trafficData.currentSpeed / this.trafficData.freeFlowSpeed;
            if (speedRatio < 0.5) {
                trafficIcon.textContent = '🔴';
                trafficStatus.textContent = 'Tắc nghiêm trọng';
                trafficStatus.className = 'text-base font-bold text-red-600 mt-1';
                if (trafficBar) trafficBar.style.width = '95%';
            } else if (speedRatio < 0.8) {
                trafficIcon.textContent = '🟡';
                trafficStatus.textContent = 'Chậm';
                trafficStatus.className = 'text-base font-bold text-orange-600 mt-1';
                if (trafficBar) trafficBar.style.width = '60%';
            } else {
                trafficIcon.textContent = '🟢';
                trafficStatus.textContent = 'Thông thoáng';
                trafficStatus.className = 'text-base font-bold text-green-600 mt-1';
                if (trafficBar) trafficBar.style.width = '20%';
            }
        }

        // Update weather status
        const weatherIcon = document.getElementById('weatherIcon');
        const weatherStatus = document.getElementById('weatherStatus');
        const weatherDetails = document.getElementById('weatherDetails');
        
        if (this.weatherData) {
            const condition = this.weatherData.condition;
            if (condition.includes('Rain') || condition.includes('Thunder')) {
                weatherIcon.textContent = '🌧️';
            } else if (condition.includes('Cloud')) {
                weatherIcon.textContent = '☁️';
            } else {
                weatherIcon.textContent = '☀️';
            }
            weatherStatus.textContent = `${this.weatherData.temperature}°C`;
            weatherStatus.className = 'text-base font-bold text-blue-600 mt-1';
            
            if (weatherDetails) {
                weatherDetails.textContent = `Nhiệt độ: ${this.weatherData.temperature}°C | Độ ẩm: ${this.weatherData.humidity}%`;
            }
        }

        // Update location status
        const locationIcon = document.getElementById('locationIcon');
        const locationStatus = document.getElementById('locationStatus');
        const locationDetails = document.getElementById('locationDetails');
        
        if (this.pickupLocation) {
            // Check if in city center based on coordinates
            const cityCenterLat = 21.0285;
            const cityCenterLng = 105.8542;
            const distance = this.calculateDistance(
                this.pickupLocation.lat, this.pickupLocation.lng,
                cityCenterLat, cityCenterLng
            );
            
            if (distance < 2) {
                locationIcon.textContent = '🏛️';
                locationStatus.textContent = 'Trung tâm';
                locationStatus.className = 'text-base font-bold text-purple-600 mt-1';
                if (locationDetails) locationDetails.textContent = `Cách trung tâm: ${distance.toFixed(2)} km`;
            } else if (distance < 5) {
                locationIcon.textContent = '🏙️';
                locationStatus.textContent = 'Nội thành';
                locationStatus.className = 'text-base font-bold text-indigo-600 mt-1';
                if (locationDetails) locationDetails.textContent = `Cách trung tâm: ${distance.toFixed(2)} km`;
            } else {
                locationIcon.textContent = '🌆';
                locationStatus.textContent = 'Ngoại thành';
                locationStatus.className = 'text-base font-bold text-gray-600 mt-1';
                if (locationDetails) locationDetails.textContent = `Cách trung tâm: ${distance.toFixed(2)} km`;
            }
        }
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

        // Print invoice button
        const printBtn = document.getElementById('printInvoice');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printInvoice();
            });
        }
    }

    printInvoice() {
        // Create a print-friendly version
        window.print();
    }

    processBooking() {
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const notes = document.getElementById('notes').value.trim();

        // Validation
        if (!customerName || !customerPhone) {
            this.showNotification('⚠️ Vui lòng điền đầy đủ thông tin khách hàng', 'warning');
            
            // Scroll to customer info section
            document.getElementById('customerName').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Validate phone number (basic check)
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(customerPhone.replace(/[\s-]/g, ''))) {
            this.showNotification('⚠️ Số điện thoại không hợp lệ', 'warning');
            return;
        }

        // Get selected payment method
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';

        // Simulate booking process
        const button = document.getElementById('confirmBooking');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Đang xử lý...</span>';
        button.disabled = true;

        setTimeout(() => {
            const bookingData = {
                invoiceNumber: document.getElementById('invoiceNumber').textContent,
                customerName: customerName,
                customerPhone: customerPhone,
                notes: notes,
                paymentMethod: paymentMethod,
                pickup: this.pickupLocation,
                dropoff: this.dropoffLocation,
                distance: document.getElementById('distance').textContent,
                duration: document.getElementById('duration').textContent,
                totalAmount: document.getElementById('totalAmount').textContent
            };
            
            this.showBookingSuccess(bookingData);
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }

    showBookingSuccess(bookingData) {
        this.showNotification('✅ Đặt xe thành công! Tài xế sẽ liên hệ trong 5 phút', 'success');
        
        // Log booking data
        console.log('Booking confirmed:', bookingData);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Optional: Could save to localStorage or send to backend
        // localStorage.setItem('lastBooking', JSON.stringify(bookingData));
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


