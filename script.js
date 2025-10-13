// Taxi Booking App - Free Version with OpenStreetMap
// Uses free services and predefined location database

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
        console.log('Initializing Taxi Booking App...');
        this.setupLocationDatabase();
        this.initializeMap();
        this.bindEvents();
        this.clearOldState(); // Clear old state on page load
        console.log('App initialized successfully!');
    }

    initializeMap() {
        // Initialize OpenStreetMap centered on Hanoi (21.0285, 105.8542)
        this.map = L.map('map').setView([21.0285, 105.8542], 13);

        // Add OpenStreetMap tiles (completely free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add click event to map for location selection
        this.map.on('click', (e) => {
            this.handleMapClick(e.latlng);
        });

        // Add initial location markers
        this.addLocationMarkers();
        
        // Add map controls for clearing selections
        this.addMapControls();
    }
    
    addMapControls() {
        // Create custom control for clearing map selections
        const clearControlDiv = L.Control.extend({
            options: {
                position: 'topright'
            },
            
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                
                container.style.backgroundColor = 'white';
                container.style.padding = '5px';
                container.style.cursor = 'pointer';
                container.style.borderRadius = '4px';
                container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button id="clearPickupMapBtn" class="map-control-btn" style="background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; white-space: nowrap;" title="Xóa điểm đón">
                            <i class="fas fa-times"></i>
                            <span>Xóa đón</span>
                        </button>
                        <button id="clearDropoffMapBtn" class="map-control-btn" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; white-space: nowrap;" title="Xóa điểm đến">
                            <i class="fas fa-times"></i>
                            <span>Xóa đến</span>
                        </button>
                        <button id="clearAllMapBtn" class="map-control-btn" style="background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; white-space: nowrap;" title="Xóa tất cả">
                            <i class="fas fa-trash-alt"></i>
                            <span>Xóa tất cả</span>
                        </button>
                    </div>
                `;
                
                // Prevent map click events on control
                L.DomEvent.disableClickPropagation(container);
                
                return container;
            }
        });
        
        this.map.addControl(new clearControlDiv());
        
        // Bind events after control is added to DOM
        setTimeout(() => {
            this.bindMapControlEvents();
        }, 100);
    }
    
    bindMapControlEvents() {
        const clearPickupBtn = document.getElementById('clearPickupMapBtn');
        const clearDropoffBtn = document.getElementById('clearDropoffMapBtn');
        const clearAllBtn = document.getElementById('clearAllMapBtn');
        
        if (clearPickupBtn) {
            clearPickupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearPickupFromMap();
            });
        }
        
        if (clearDropoffBtn) {
            clearDropoffBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearDropoffFromMap();
            });
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearAllFromMap();
            });
        }
        
        console.log('Map controls bound successfully');
    }
    
    clearPickupFromMap() {
        if (!this.pickupLocation) {
            this.showNotification('⚠️ Chưa có điểm đón để xóa', 'warning');
            return;
        }
        
        console.log('🗑️ Clearing pickup location from map');
        this.clearPickupLocation();
        this.updateSelectedLocationsDisplay();
        this.showNotification('✅ Đã xóa điểm đón', 'success');
    }
    
    clearDropoffFromMap() {
        if (!this.dropoffLocation) {
            this.showNotification('⚠️ Chưa có điểm đến để xóa', 'warning');
            return;
        }
        
        console.log('🗑️ Clearing dropoff location from map');
        this.clearDropoffLocation();
        this.updateSelectedLocationsDisplay();
        this.showNotification('✅ Đã xóa điểm đến', 'success');
    }
    
    clearAllFromMap() {
        if (!this.pickupLocation && !this.dropoffLocation) {
            this.showNotification('⚠️ Chưa có điểm nào để xóa', 'warning');
            return;
        }
        
        if (confirm('Bạn có chắc muốn xóa tất cả điểm đón và điểm đến?')) {
            console.log('🗑️ Clearing all locations from map');
            
            if (this.pickupLocation) {
                this.clearPickupLocation();
            }
            if (this.dropoffLocation) {
                this.clearDropoffLocation();
            }
            
            this.updateSelectedLocationsDisplay();
            this.showNotification('✅ Đã xóa tất cả điểm', 'success');
        }
    }

    setupLocationDatabase() {
        // Comprehensive database of locations in Ho Chi Minh City and Hanoi
        this.locations = [
            // === HÀ NỘI ===
            // Airports & Transportation - Hanoi
            { name: "Sân bay Nội Bài", lat: 21.2211, lng: 105.8073, category: "airport", district: "Sóc Sơn", city: "Hà Nội" },
            { name: "Ga Hà Nội", lat: 21.0285, lng: 105.8542, category: "transport", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Bến xe Mỹ Đình", lat: 21.0285, lng: 105.7742, category: "transport", district: "Nam Từ Liêm", city: "Hà Nội" },
            { name: "Bến xe Giáp Bát", lat: 20.9755, lng: 105.8417, category: "transport", district: "Hoàng Mai", city: "Hà Nội" },
            { name: "Bến xe Gia Lâm", lat: 21.0425, lng: 105.8917, category: "transport", district: "Long Biên", city: "Hà Nội" },
            { name: "Bến xe Yên Nghĩa", lat: 20.9755, lng: 105.7417, category: "transport", district: "Hà Đông", city: "Hà Nội" },
            { name: "Bến xe Nước Ngầm", lat: 21.0085, lng: 105.8142, category: "transport", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Bến xe Thường Tín", lat: 20.8755, lng: 105.8517, category: "transport", district: "Thường Tín", city: "Hà Nội" },

            // Shopping Centers - Hanoi
            { name: "Trung tâm thương mại Vincom Center", lat: 21.0285, lng: 105.8542, category: "shopping", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Trung tâm thương mại Royal City", lat: 21.0085, lng: 105.8142, category: "shopping", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Trung tâm thương mại Times City", lat: 20.9985, lng: 105.8442, category: "shopping", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Chợ Đồng Xuân", lat: 21.0385, lng: 105.8342, category: "shopping", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Trung tâm thương mại Lotte Center", lat: 21.0185, lng: 105.8242, category: "shopping", district: "Ba Đình", city: "Hà Nội" },
            { name: "Trung tâm thương mại Aeon Mall", lat: 20.9885, lng: 105.7842, category: "shopping", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Trung tâm thương mại The Garden", lat: 21.0285, lng: 105.8042, category: "shopping", district: "Nam Từ Liêm", city: "Hà Nội" },
            { name: "Big C Thăng Long", lat: 21.0485, lng: 105.8142, category: "shopping", district: "Nam Từ Liêm", city: "Hà Nội" },
            { name: "Big C Long Biên", lat: 21.0425, lng: 105.8917, category: "shopping", district: "Long Biên", city: "Hà Nội" },
            { name: "Big C Hà Đông", lat: 20.9755, lng: 105.7417, category: "shopping", district: "Hà Đông", city: "Hà Nội" },
            { name: "Vincom Mega Mall Royal City", lat: 21.0085, lng: 105.8142, category: "shopping", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Vincom Center Ocean Park", lat: 20.9685, lng: 105.7642, category: "shopping", district: "Gia Lâm", city: "Hà Nội" },
            { name: "Chợ Hàng Da", lat: 21.0285, lng: 105.8442, category: "shopping", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Chợ Bưởi", lat: 21.0485, lng: 105.8042, category: "shopping", district: "Tây Hồ", city: "Hà Nội" },
            { name: "Chợ Cầu Giấy", lat: 21.0285, lng: 105.7942, category: "shopping", district: "Cầu Giấy", city: "Hà Nội" },

            // Universities - Hanoi
            { name: "Đại học Quốc gia Hà Nội", lat: 21.0385, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Bách Khoa Hà Nội", lat: 21.0085, lng: 105.8442, category: "education", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Đại học Kinh tế Quốc dân", lat: 21.0185, lng: 105.8342, category: "education", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Đại học Y Hà Nội", lat: 21.0285, lng: 105.8442, category: "education", district: "Đống Đa", city: "Hà Nội" },
            { name: "Đại học Ngoại thương", lat: 20.9985, lng: 105.7942, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Thương mại", lat: 20.9885, lng: 105.7742, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Luật Hà Nội", lat: 21.0085, lng: 105.8242, category: "education", district: "Ba Đình", city: "Hà Nội" },
            { name: "Đại học Sư phạm Hà Nội", lat: 20.9785, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Khoa học Xã hội và Nhân văn", lat: 21.0385, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Khoa học Tự nhiên", lat: 21.0385, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Công nghệ", lat: 21.0385, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Việt Nhật", lat: 21.0385, lng: 105.7842, category: "education", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Đại học Mở Hà Nội", lat: 21.0085, lng: 105.8142, category: "education", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Đại học Hà Nội", lat: 21.0085, lng: 105.8142, category: "education", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Học viện Báo chí và Tuyên truyền", lat: 21.0285, lng: 105.8542, category: "education", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Học viện Ngoại giao", lat: 21.0185, lng: 105.8342, category: "education", district: "Ba Đình", city: "Hà Nội" },
            { name: "Học viện Tài chính", lat: 20.9985, lng: 105.7942, category: "education", district: "Cầu Giấy", city: "Hà Nội" },

            // Hospitals - Hanoi
            { name: "Bệnh viện Bạch Mai", lat: 20.9985, lng: 105.8542, category: "healthcare", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Bệnh viện Việt Đức", lat: 21.0285, lng: 105.8442, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện K", lat: 21.0185, lng: 105.8342, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Tim Hà Nội", lat: 21.0085, lng: 105.8242, category: "healthcare", district: "Ba Đình", city: "Hà Nội" },
            { name: "Bệnh viện Nhi Trung ương", lat: 20.9885, lng: 105.8142, category: "healthcare", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Bệnh viện Phụ sản Hà Nội", lat: 20.9785, lng: 105.8042, category: "healthcare", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Bệnh viện Da liễu Trung ương", lat: 20.9685, lng: 105.7942, category: "healthcare", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Bệnh viện Mắt Trung ương", lat: 21.0285, lng: 105.8442, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Tai Mũi Họng Trung ương", lat: 21.0285, lng: 105.8442, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Răng Hàm Mặt Trung ương", lat: 21.0285, lng: 105.8442, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Nội tiết Trung ương", lat: 21.0185, lng: 105.8342, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Lão khoa Trung ương", lat: 21.0085, lng: 105.8242, category: "healthcare", district: "Ba Đình", city: "Hà Nội" },
            { name: "Bệnh viện Tâm thần Trung ương", lat: 21.0485, lng: 105.8142, category: "healthcare", district: "Nam Từ Liêm", city: "Hà Nội" },
            { name: "Bệnh viện Châm cứu Trung ương", lat: 21.0285, lng: 105.8542, category: "healthcare", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Bệnh viện Đa khoa Quốc tế Vinmec", lat: 21.0085, lng: 105.8142, category: "healthcare", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Bệnh viện Đa khoa Quốc tế Thu Cúc", lat: 21.0285, lng: 105.8442, category: "healthcare", district: "Đống Đa", city: "Hà Nội" },
            { name: "Bệnh viện Đa khoa Hồng Ngọc", lat: 21.0185, lng: 105.8342, category: "healthcare", district: "Ba Đình", city: "Hà Nội" },

            // Tourist Attractions - Hanoi
            { name: "Hồ Gươm", lat: 21.0285, lng: 105.8542, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Lăng Chủ tịch Hồ Chí Minh", lat: 21.0385, lng: 105.8342, category: "tourism", district: "Ba Đình", city: "Hà Nội" },
            { name: "Văn Miếu Quốc Tử Giám", lat: 21.0185, lng: 105.8442, category: "tourism", district: "Đống Đa", city: "Hà Nội" },
            { name: "Chùa Một Cột", lat: 21.0385, lng: 105.8342, category: "tourism", district: "Ba Đình", city: "Hà Nội" },
            { name: "Nhà hát Lớn Hà Nội", lat: 21.0285, lng: 105.8542, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Phố cổ Hà Nội", lat: 21.0385, lng: 105.8442, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Bảo tàng Hồ Chí Minh", lat: 21.0485, lng: 105.8342, category: "tourism", district: "Ba Đình", city: "Hà Nội" },
            { name: "Bảo tàng Lịch sử Việt Nam", lat: 21.0285, lng: 105.8642, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Công viên Thống Nhất", lat: 20.9985, lng: 105.8542, category: "tourism", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Công viên Lê Nin", lat: 21.0185, lng: 105.8142, category: "tourism", district: "Ba Đình", city: "Hà Nội" },
            { name: "Hồ Tây", lat: 21.0585, lng: 105.8242, category: "tourism", district: "Tây Hồ", city: "Hà Nội" },
            { name: "Chùa Trấn Quốc", lat: 21.0485, lng: 105.8342, category: "tourism", district: "Tây Hồ", city: "Hà Nội" },
            { name: "Chùa Quán Sứ", lat: 21.0285, lng: 105.8442, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Chùa Kim Liên", lat: 21.0385, lng: 105.8442, category: "tourism", district: "Đống Đa", city: "Hà Nội" },
            { name: "Chùa Láng", lat: 21.0185, lng: 105.8142, category: "tourism", district: "Đống Đa", city: "Hà Nội" },
            { name: "Nhà tù Hỏa Lò", lat: 21.0285, lng: 105.8542, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Bảo tàng Dân tộc học", lat: 21.0385, lng: 105.7942, category: "tourism", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Bảo tàng Phụ nữ Việt Nam", lat: 21.0285, lng: 105.8542, category: "tourism", district: "Hoàn Kiếm", city: "Hà Nội" },

            // Business Districts - Hanoi
            { name: "Tòa nhà Lotte Center", lat: 21.0185, lng: 105.8242, category: "business", district: "Ba Đình", city: "Hà Nội" },
            { name: "Tòa nhà Keangnam", lat: 20.9885, lng: 105.7842, category: "business", district: "Cầu Giấy", city: "Hà Nội" },
            { name: "Tòa nhà Vietcombank Tower", lat: 21.0285, lng: 105.8542, category: "business", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Tòa nhà BIDV Tower", lat: 21.0185, lng: 105.8342, category: "business", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Tòa nhà Techcombank Tower", lat: 21.0085, lng: 105.8142, category: "business", district: "Thanh Xuân", city: "Hà Nội" },

            // Hotels - Hanoi
            { name: "Khách sạn Sofitel Legend Metropole", lat: 21.0285, lng: 105.8542, category: "hotel", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Khách sạn Hilton Hanoi Opera", lat: 21.0185, lng: 105.8442, category: "hotel", district: "Hoàn Kiếm", city: "Hà Nội" },
            { name: "Khách sạn JW Marriott Hanoi", lat: 21.0385, lng: 105.8342, category: "hotel", district: "Ba Đình", city: "Hà Nội" },
            { name: "Khách sạn InterContinental Hanoi", lat: 21.0085, lng: 105.8242, category: "hotel", district: "Ba Đình", city: "Hà Nội" },
            { name: "Khách sạn Sheraton Hanoi", lat: 20.9985, lng: 105.8142, category: "hotel", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Khách sạn Lotte Hanoi", lat: 21.0185, lng: 105.8242, category: "hotel", district: "Ba Đình", city: "Hà Nội" },

            // Residential Areas - Hanoi
            { name: "Khu đô thị Ciputra", lat: 21.0485, lng: 105.8042, category: "residential", district: "Tây Hồ", city: "Hà Nội" },
            { name: "Khu đô thị Vinhomes Riverside", lat: 20.9685, lng: 105.7742, category: "residential", district: "Long Biên", city: "Hà Nội" },
            { name: "Khu đô thị Times City", lat: 20.9985, lng: 105.8442, category: "residential", district: "Hai Bà Trưng", city: "Hà Nội" },
            { name: "Khu đô thị Royal City", lat: 21.0085, lng: 105.8142, category: "residential", district: "Thanh Xuân", city: "Hà Nội" },
            { name: "Khu đô thị Gamuda Gardens", lat: 20.9785, lng: 105.7842, category: "residential", district: "Hoàng Mai", city: "Hà Nội" },

            // === TP.HỒ CHÍ MINH ===
            // Airports & Transportation - HCMC
            { name: "Sân bay Tân Sơn Nhất", lat: 10.8188, lng: 106.6520, category: "airport", district: "Tân Bình", city: "TP.HCM" },
            { name: "Bến xe miền Tây", lat: 10.7442, lng: 106.6359, category: "transport", district: "Bình Tân", city: "TP.HCM" },
            { name: "Bến xe miền Đông", lat: 10.8421, lng: 106.8095, category: "transport", district: "Quận 9", city: "TP.HCM" },
            { name: "Ga Sài Gòn", lat: 10.7769, lng: 106.7009, category: "transport", district: "Quận 3", city: "TP.HCM" },
            { name: "Bến xe An Sương", lat: 10.8421, lng: 106.6095, category: "transport", district: "Quận 12", city: "TP.HCM" },
            { name: "Bến xe Chợ Lớn", lat: 10.7529, lng: 106.6621, category: "transport", district: "Quận 5", city: "TP.HCM" },
            { name: "Bến xe Củ Chi", lat: 11.0421, lng: 106.5095, category: "transport", district: "Củ Chi", city: "TP.HCM" },
            { name: "Bến xe Hóc Môn", lat: 10.8821, lng: 106.6095, category: "transport", district: "Hóc Môn", city: "TP.HCM" },

            // Shopping Centers - HCMC
            { name: "Chợ Bến Thành", lat: 10.7720, lng: 106.6983, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Trung tâm Thương mại Vincom", lat: 10.7778, lng: 106.7008, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Diamond Plaza", lat: 10.7769, lng: 106.7009, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Parkson", lat: 10.7756, lng: 106.7019, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Saigon Centre", lat: 10.7772, lng: 106.7011, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Lotte Mart", lat: 10.7721, lng: 106.6956, category: "shopping", district: "Quận 1", city: "TP.HCM" },
            { name: "Trung tâm thương mại Crescent Mall", lat: 10.7442, lng: 106.6359, category: "shopping", district: "Quận 7", city: "TP.HCM" },
            { name: "Trung tâm thương mại SC VivoCity", lat: 10.7442, lng: 106.6359, category: "shopping", district: "Quận 7", city: "TP.HCM" },
            { name: "Trung tâm thương mại Vincom Landmark 81", lat: 10.7944, lng: 106.7219, category: "shopping", district: "Bình Thạnh", city: "TP.HCM" },
            { name: "Big C Nguyễn Kiệm", lat: 10.7829, lng: 106.7021, category: "shopping", district: "Phú Nhuận", city: "TP.HCM" },
            { name: "Big C Thủ Đức", lat: 10.8421, lng: 106.8095, category: "shopping", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Big C An Lạc", lat: 10.7442, lng: 106.6359, category: "shopping", district: "Bình Tân", city: "TP.HCM" },
            { name: "Big C Tân Bình", lat: 10.8188, lng: 106.6520, category: "shopping", district: "Tân Bình", city: "TP.HCM" },
            { name: "Co.opmart Nguyễn Đình Chiểu", lat: 10.7829, lng: 106.7021, category: "shopping", district: "Quận 3", city: "TP.HCM" },
            { name: "Co.opmart Xa Lộ Hà Nội", lat: 10.8421, lng: 106.8095, category: "shopping", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Aeon Mall Tân Phú", lat: 10.7829, lng: 106.6021, category: "shopping", district: "Tân Phú", city: "TP.HCM" },
            { name: "Aeon Mall Bình Tân", lat: 10.7442, lng: 106.6359, category: "shopping", district: "Bình Tân", city: "TP.HCM" },
            { name: "Chợ Kim Biên", lat: 10.7529, lng: 106.6621, category: "shopping", district: "Quận 5", city: "TP.HCM" },
            { name: "Chợ Tân Bình", lat: 10.8188, lng: 106.6520, category: "shopping", district: "Tân Bình", city: "TP.HCM" },
            { name: "Chợ Hóc Môn", lat: 10.8821, lng: 106.6095, category: "shopping", district: "Hóc Môn", city: "TP.HCM" },

            // Universities - HCMC
            { name: "Trường Đại học Bách Khoa", lat: 10.7726, lng: 106.6599, category: "education", district: "Quận 10", city: "TP.HCM" },
            { name: "Đại học Kinh tế TP.HCM", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 10", city: "TP.HCM" },
            { name: "Đại học Sư phạm TP.HCM", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 5", city: "TP.HCM" },
            { name: "Đại học Y khoa Phạm Ngọc Thạch", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 5", city: "TP.HCM" },
            { name: "Đại học Khoa học Tự nhiên TP.HCM", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 5", city: "TP.HCM" },
            { name: "Đại học Ngoại thương TP.HCM", lat: 10.7729, lng: 106.6921, category: "education", district: "Quận 1", city: "TP.HCM" },
            { name: "Đại học Luật TP.HCM", lat: 10.7829, lng: 106.7021, category: "education", district: "Quận 3", city: "TP.HCM" },
            { name: "Đại học Kiến trúc TP.HCM", lat: 10.7529, lng: 106.6621, category: "education", district: "Quận 10", city: "TP.HCM" },
            { name: "Đại học Công nghệ Thông tin TP.HCM", lat: 10.7429, lng: 106.6521, category: "education", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Đại học Quốc tế TP.HCM", lat: 10.7329, lng: 106.6421, category: "education", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Đại học Khoa học Xã hội và Nhân văn TP.HCM", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 1", city: "TP.HCM" },
            { name: "Đại học Tài chính Marketing", lat: 10.7829, lng: 106.7021, category: "education", district: "Quận 3", city: "TP.HCM" },
            { name: "Đại học Ngân hàng TP.HCM", lat: 10.7729, lng: 106.6921, category: "education", district: "Quận 1", city: "TP.HCM" },
            { name: "Đại học Công nghiệp TP.HCM", lat: 10.8421, lng: 106.8095, category: "education", district: "Quận 9", city: "TP.HCM" },
            { name: "Đại học Giao thông Vận tải TP.HCM", lat: 10.7829, lng: 106.7021, category: "education", district: "Quận 3", city: "TP.HCM" },
            { name: "Đại học Nông Lâm TP.HCM", lat: 10.8421, lng: 106.8095, category: "education", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Đại học Sài Gòn", lat: 10.7629, lng: 106.6821, category: "education", district: "Quận 1", city: "TP.HCM" },
            { name: "Đại học Mở TP.HCM", lat: 10.7829, lng: 106.7021, category: "education", district: "Quận 3", city: "TP.HCM" },
            { name: "Đại học Văn Hiến", lat: 10.8421, lng: 106.8095, category: "education", district: "Thủ Đức", city: "TP.HCM" },
            { name: "Đại học Hoa Sen", lat: 10.7729, lng: 106.6921, category: "education", district: "Quận 1", city: "TP.HCM" },

            // Hospitals - HCMC
            { name: "Bệnh viện Chợ Rẫy", lat: 10.7559, lng: 106.6889, category: "healthcare", district: "Quận 5", city: "TP.HCM" },
            { name: "Bệnh viện Nhi đồng 1", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Quận 10", city: "TP.HCM" },
            { name: "Bệnh viện Đại học Y dược", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Quận 5", city: "TP.HCM" },
            { name: "Bệnh viện Thống Nhất", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Tân Bình", city: "TP.HCM" },
            { name: "Bệnh viện Nhi đồng 2", lat: 10.7829, lng: 106.7021, category: "healthcare", district: "Quận 3", city: "TP.HCM" },
            { name: "Bệnh viện Phụ sản Từ Dũ", lat: 10.7729, lng: 106.6921, category: "healthcare", district: "Quận 1", city: "TP.HCM" },
            { name: "Bệnh viện Tim Tâm Đức", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Quận 10", city: "TP.HCM" },
            { name: "Bệnh viện Mắt TP.HCM", lat: 10.7829, lng: 106.7021, category: "healthcare", district: "Quận 3", city: "TP.HCM" },
            { name: "Bệnh viện Da liễu TP.HCM", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Quận 10", city: "TP.HCM" },
            { name: "Bệnh viện Tai Mũi Họng TP.HCM", lat: 10.7829, lng: 106.7021, category: "healthcare", district: "Quận 3", city: "TP.HCM" },
            { name: "Bệnh viện Răng Hàm Mặt TP.HCM", lat: 10.7729, lng: 106.6921, category: "healthcare", district: "Quận 1", city: "TP.HCM" },
            { name: "Bệnh viện Nhiệt đới", lat: 10.7629, lng: 106.6821, category: "healthcare", district: "Quận 5", city: "TP.HCM" },
            { name: "Bệnh viện Đa khoa Quốc tế Vinmec Central Park", lat: 10.7729, lng: 106.6921, category: "healthcare", district: "Quận 1", city: "TP.HCM" },
            { name: "Bệnh viện Đa khoa Quốc tế Vinmec Times City", lat: 10.8421, lng: 106.8095, category: "healthcare", district: "Quận 9", city: "TP.HCM" },
            { name: "Bệnh viện Đa khoa Quốc tế Columbia Asia", lat: 10.7829, lng: 106.7021, category: "healthcare", district: "Quận 3", city: "TP.HCM" },
            { name: "Bệnh viện Đa khoa Quốc tế FV", lat: 10.7729, lng: 106.6921, category: "healthcare", district: "Quận 7", city: "TP.HCM" },

            // Tourist Attractions
            { name: "Nhà hát Thành phố", lat: 10.7769, lng: 106.7009, category: "tourism", district: "Quận 1" },
            { name: "Bưu điện Trung tâm", lat: 10.7794, lng: 106.6996, category: "tourism", district: "Quận 1" },
            { name: "Nhà thờ Đức Bà", lat: 10.7797, lng: 106.6991, category: "tourism", district: "Quận 1" },
            { name: "Dinh Độc Lập", lat: 10.7772, lng: 106.6956, category: "tourism", district: "Quận 1" },
            { name: "Bảo tàng Lịch sử Việt Nam", lat: 10.7889, lng: 106.7053, category: "tourism", district: "Quận 1" },
            { name: "Công viên Lê Văn Tám", lat: 10.7821, lng: 106.6951, category: "tourism", district: "Quận 1" },

            // Business Districts
            { name: "Tòa nhà Bitexco", lat: 10.7719, lng: 106.7032, category: "business", district: "Quận 1" },
            { name: "Landmark 81", lat: 10.7944, lng: 106.7219, category: "business", district: "Bình Thạnh" },
            { name: "Tòa nhà Vietcombank", lat: 10.7778, lng: 106.7008, category: "business", district: "Quận 1" },
            { name: "Tòa nhà HSBC", lat: 10.7778, lng: 106.7008, category: "business", district: "Quận 1" },

            // Hotels
            { name: "Khách sạn Rex", lat: 10.7769, lng: 106.7009, category: "hotel", district: "Quận 1" },
            { name: "Khách sạn Continental", lat: 10.7769, lng: 106.7009, category: "hotel", district: "Quận 1" },
            { name: "Khách sạn Majestic", lat: 10.7769, lng: 106.7009, category: "hotel", district: "Quận 1" },
            { name: "Khách sạn Caravelle", lat: 10.7769, lng: 106.7009, category: "hotel", district: "Quận 1" },

            // Residential Areas
            { name: "Phú Mỹ Hưng", lat: 10.7442, lng: 106.6359, category: "residential", district: "Quận 7" },
            { name: "Thủ Thiêm", lat: 10.7889, lng: 106.7053, category: "residential", district: "Quận 2" },
            { name: "Bình An", lat: 10.7629, lng: 106.6821, category: "residential", district: "Quận 2" },
            { name: "Vinhomes Grand Park", lat: 10.8421, lng: 106.8095, category: "residential", district: "Quận 9" },

            // Industrial Zones
            { name: "Khu công nghiệp Tân Thuận", lat: 10.7442, lng: 106.6359, category: "industrial", district: "Quận 7" },
            { name: "Khu công nghiệp Hiệp Phước", lat: 10.7442, lng: 106.6359, category: "industrial", district: "Nhà Bè" },
            { name: "Khu công nghiệp Linh Trung", lat: 10.8421, lng: 106.8095, category: "industrial", district: "Thủ Đức" }
        ];

        // Create search index for fast lookup
        this.searchIndex = this.locations.map(loc => ({
            ...loc,
            searchText: loc.name.toLowerCase() + ' ' + loc.district.toLowerCase() + ' ' + loc.category.toLowerCase() + ' ' + (loc.city || '').toLowerCase()
        }));
        
        console.log(`Location database loaded: ${this.locations.length} locations`);
        console.log(`Cities available:`, [...new Set(this.locations.map(loc => loc.city).filter(city => city))]);
    }

    addLocationMarkers(locationsToShow = null) {
        const locations = locationsToShow || this.locations;
        
        // Add markers for different categories with different colors
        const categoryColors = {
            airport: '#ff6b6b',
            transport: '#4ecdc4',
            shopping: '#45b7d1',
            education: '#96ceb4',
            healthcare: '#feca57',
            tourism: '#ff9ff3',
            business: '#54a0ff',
            hotel: '#5f27cd',
            residential: '#00d2d3',
            industrial: '#ff9f43'
        };

        locations.forEach(location => {
            const marker = L.circleMarker([location.lat, location.lng], {
                radius: 6,
                fillColor: categoryColors[location.category] || '#3498db',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="p-2">
                    <h3 class="font-semibold text-blue-600">${location.name}</h3>
                    <p class="text-sm text-gray-600">${location.district} • ${location.city || 'TP.HCM'}</p>
                    <p class="text-xs text-gray-500 capitalize">${location.category}</p>
                    <div class="mt-2 space-x-2">
                        <button class="pickup-btn text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" 
                                data-location='${JSON.stringify(location)}'>
                            Điểm đón
                        </button>
                        <button class="dropoff-btn text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" 
                                data-location='${JSON.stringify(location)}'>
                            Điểm đến
                        </button>
                    </div>
                </div>
            `);

            // Add click handlers to popup buttons
            marker.on('popupopen', () => {
                const popup = marker.getPopup();
                const element = popup.getElement();
                
                element.querySelector('.pickup-btn').addEventListener('click', (e) => {
                    const locationData = JSON.parse(e.target.getAttribute('data-location'));
                    this.selectLocation(locationData, 'pickup');
                    this.map.closePopup();
                });

                element.querySelector('.dropoff-btn').addEventListener('click', (e) => {
                    const locationData = JSON.parse(e.target.getAttribute('data-location'));
                    this.selectLocation(locationData, 'dropoff');
                    this.map.closePopup();
                });
            });
        });
    }

    handleMapClick(latlng) {
        console.log('Map clicked at:', latlng);
        
        // Find nearest location
        const nearestLocation = this.findNearestLocation(latlng.lat, latlng.lng);
        
        if (nearestLocation) {
            const distance = this.calculateDistance(
                latlng.lat, latlng.lng,
                nearestLocation.lat, nearestLocation.lng
            );

            // If within 200m, use the predefined location
            if (distance < 0.2) {
                console.log(`Found nearby location: ${nearestLocation.name} (${distance.toFixed(2)}km away)`);
                this.showLocationSelectionModal(nearestLocation, 'predefined');
            } else {
                // Use reverse geocoding for custom location
                console.log('No nearby location found, using reverse geocoding');
                this.reverseGeocode(latlng.lat, latlng.lng, (address) => {
                    const customLocation = {
                        name: address,
                        lat: latlng.lat,
                        lng: latlng.lng,
                        category: 'custom',
                        district: 'Custom Location'
                    };
                    
                    this.showLocationSelectionModal(customLocation, 'custom');
                });
            }
        } else {
            console.log('No location found at clicked point');
        }
    }

    findNearestLocation(lat, lng) {
        let nearest = null;
        let minDistance = Infinity;

        this.locations.forEach(location => {
            const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = location;
            }
        });

        return nearest;
    }

    reverseGeocode(lat, lng, callback) {
        // Use free Nominatim service for reverse geocoding
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.display_name) {
                    // Extract Vietnamese address if available
                    const address = data.display_name;
                    callback(address);
                } else {
                    callback(`Địa chỉ tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            })
            .catch(error => {
                console.error('Reverse geocoding failed:', error);
                callback(`Địa chỉ tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            });
    }

    selectLocation(location, type) {
        console.log(`Selecting location: ${location.name} as ${type}`);
        
        if (type === 'pickup') {
            // Clear dropoff if it's the same location to avoid confusion
            if (this.dropoffLocation && 
                this.dropoffLocation.lat === location.lat && 
                this.dropoffLocation.lng === location.lng) {
                this.clearDropoffLocation();
            }
            
            this.setPickupLocation(location);
        } else if (type === 'dropoff') {
            // Clear pickup if it's the same location to avoid confusion
            if (this.pickupLocation && 
                this.pickupLocation.lat === location.lat && 
                this.pickupLocation.lng === location.lng) {
                this.clearPickupLocation();
            }
            
            this.setDropoffLocation(location);
        } else {
            console.error('Invalid location type:', type);
            return;
        }
        
        // Focus on the selected location
        this.focusOnSelectedLocation(location);
        
        // Update UI display
        this.updateSelectedLocationsDisplay();
        
        // Go back to selection mode
        this.backToSelectionMode();
        
        this.hideSuggestions();
    }

    clearPickupLocation() {
        console.log('Clearing pickup location...');
        this.pickupLocation = null;
        
        // Remove pickup marker from map
        if (this.pickupMarker) {
            this.map.removeLayer(this.pickupMarker);
            this.pickupMarker = null;
        }
        
        // Remove route if exists
        if (this.route) {
            this.map.removeLayer(this.route);
            this.route = null;
        }
        
        // Reset route calculation flag
        this.isRouteCalculated = false;
        
        // Hide trip details
        document.getElementById('tripDetails').classList.add('hidden');
        
        console.log('Pickup location cleared successfully');
    }

    clearDropoffLocation() {
        console.log('Clearing dropoff location...');
        this.dropoffLocation = null;
        
        // Remove dropoff marker from map
        if (this.dropoffMarker) {
            this.map.removeLayer(this.dropoffMarker);
            this.dropoffMarker = null;
        }
        
        // Remove route if exists
        if (this.route) {
            this.map.removeLayer(this.route);
            this.route = null;
        }
        
        // Reset route calculation flag
        this.isRouteCalculated = false;
        
        // Hide trip details
        document.getElementById('tripDetails').classList.add('hidden');
        
        console.log('Dropoff location cleared successfully');
    }

    showLocationSelectionModal(location, locationType) {
        // Remove existing modal if any
        const existingModal = document.getElementById('locationSelectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal - positioned at very top of screen to avoid covering form
        const modal = document.createElement('div');
        modal.id = 'locationSelectionModal';
        modal.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-sm w-80">
                <div class="p-4">
                    <div class="text-center mb-4">
                        <div class="flex items-center justify-between mb-3">
                            <div class="text-3xl">📍</div>
                            <button class="cancel-btn text-gray-400 hover:text-gray-600 text-xl">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Chọn loại địa điểm</h3>
                        <p class="text-xs text-gray-600 leading-relaxed">Bạn muốn đặt "${location.name}" làm gì?</p>
                    </div>
                    
                    <div class="space-y-3">
                        <button class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 select-pickup-btn">
                            <i class="fas fa-map-pin"></i>
                            <span>Điểm đón</span>
                        </button>
                        
                        <button class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 select-dropoff-btn">
                            <i class="fas fa-flag"></i>
                            <span>Điểm đến</span>
                        </button>
                        
                        <button class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 cancel-btn">
                            <i class="fas fa-times"></i>
                            <span>Hủy</span>
                        </button>
                    </div>
                    
                    <div class="mt-4 text-xs text-gray-500 text-center">
                        <i class="fas fa-info-circle mr-1"></i>
                        ${locationType === 'predefined' ? 'Địa điểm có sẵn trong hệ thống' : 'Địa chỉ tùy chỉnh từ bản đồ'}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.select-pickup-btn').addEventListener('click', () => {
            this.selectLocation(location, 'pickup');
            modal.remove();
        });

        modal.querySelector('.select-dropoff-btn').addEventListener('click', () => {
            this.selectLocation(location, 'dropoff');
            modal.remove();
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    focusOnSelectedLocation(location) {
        console.log(`Focusing on selected location: ${location.name}`);
        // Smooth zoom to the location
        this.map.setView([location.lat, location.lng], 16, {
            animate: true,
            duration: 1
        });
    }

    setPickupLocation(location) {
        console.log(`Setting pickup location: ${location.name}`);
        this.pickupLocation = location;

        // Remove existing pickup marker
        if (this.pickupMarker) {
            this.map.removeLayer(this.pickupMarker);
        }

        // Add new pickup marker
        this.pickupMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'custom-marker pickup-marker',
                html: '<i class="fas fa-map-pin"></i>',
                iconSize: [40, 40]
            })
        }).addTo(this.map);

        this.pickupMarker.bindPopup(`
            <div class="p-2">
                <h3 class="font-semibold text-green-600">📍 Điểm đón</h3>
                <p class="text-sm">${location.name}</p>
                <p class="text-xs text-gray-500">${location.district} • ${location.city || 'TP.HCM'}</p>
            </div>
        `).openPopup();
        
        // Save state after setting pickup location
        this.saveState();
    }

    setDropoffLocation(location) {
        console.log(`Setting dropoff location: ${location.name}`);
        this.dropoffLocation = location;

        // Remove existing dropoff marker
        if (this.dropoffMarker) {
            this.map.removeLayer(this.dropoffMarker);
        }

        // Add new dropoff marker
        this.dropoffMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'custom-marker dropoff-marker',
                html: '<i class="fas fa-flag"></i>',
                iconSize: [40, 40]
            })
        }).addTo(this.map);

        this.dropoffMarker.bindPopup(`
            <div class="p-2">
                <h3 class="font-semibold text-red-600">🏁 Điểm đến</h3>
                <p class="text-sm">${location.name}</p>
                <p class="text-xs text-gray-500">${location.district} • ${location.city || 'TP.HCM'}</p>
            </div>
        `).openPopup();
        
        // Save state after setting dropoff location
        this.saveState();
    }

    calculateRoute() {
        console.log('Calculating route...');
        console.log('Pickup location:', this.pickupLocation);
        console.log('Dropoff location:', this.dropoffLocation);
        
        if (!this.pickupLocation || !this.dropoffLocation) {
            console.log('Missing pickup or dropoff location');
            return;
        }

        // Only calculate route if explicitly confirmed
        if (!this.isRouteCalculated) {
            console.log('Route not confirmed yet, skipping calculation');
            return;
        }

        // Remove existing route
        if (this.route) {
            this.map.removeLayer(this.route);
        }

        // Show loading state
        document.getElementById('distance').textContent = 'Đang tính...';
        document.getElementById('duration').textContent = 'Đang tính...';
        document.getElementById('estimatedPrice').textContent = 'Đang tính...';

        // Calculate actual route using OpenRouteService (free routing service)
        this.calculateActualRoute(
            this.pickupLocation.lng, this.pickupLocation.lat,
            this.dropoffLocation.lng, this.dropoffLocation.lat
        );
    }

    async calculateActualRoute(startLng, startLat, endLng, endLat) {
        try {
            console.log('Calculating actual route...');
            
            // Try multiple free routing services
            // First try: OpenRouteService (requires free API key)
            let routeData = await this.tryOpenRouteService(startLng, startLat, endLng, endLat);
            
            if (!routeData) {
                // Fallback: Try GraphHopper (free tier available)
                routeData = await this.tryGraphHopper(startLng, startLat, endLng, endLat);
            }
            
            if (!routeData) {
                // Final fallback: Use OSRM (free, no API key required)
                routeData = await this.tryOSRM(startLng, startLat, endLng, endLat);
            }
            
            if (routeData) {
                // Update UI with actual route data
                document.getElementById('distance').textContent = `${routeData.distance} km`;
                document.getElementById('duration').textContent = `${routeData.duration} phút`;
                document.getElementById('estimatedPrice').textContent = `${routeData.estimatedPrice.toLocaleString()} VNĐ`;
                
                // Show route type indicator
                const routeTypeElement = document.getElementById('routeType');
                if (routeTypeElement) {
                    routeTypeElement.classList.remove('hidden');
                    routeTypeElement.innerHTML = '<i class="fas fa-route mr-1"></i>Đường thực tế';
                    routeTypeElement.className = 'text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full';
                }
                
                // Draw actual route on map
                this.drawActualRoute(routeData.coordinates);
                
                // Display pricing breakdown
                setTimeout(() => {
                    this.displayPricingBreakdown();
                }, 100);
                
                console.log(`Route calculated: ${routeData.distance} km, ${routeData.duration} minutes`);
            } else {
                throw new Error('All routing services failed');
            }
            
        } catch (error) {
            console.warn('All routing services failed, falling back to straight line distance:', error);
            this.calculateFallbackRoute();
        }
    }

    async tryOSRM(startLng, startLat, endLng, endLat) {
        try {
            console.log('Trying OSRM routing service...');
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
            
            if (!response.ok) {
                throw new Error('OSRM service unavailable');
            }
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                return {
                    distance: (route.distance / 1000).toFixed(1),
                    duration: Math.round(route.duration / 60),
                    coordinates: route.geometry.coordinates,
                    estimatedPrice: this.calculatePrice(parseFloat((route.distance / 1000).toFixed(1)))
                };
            }
            
            return null;
        } catch (error) {
            console.warn('OSRM routing failed:', error);
            return null;
        }
    }

    async tryOpenRouteService(startLng, startLat, endLng, endLat) {
        try {
            console.log('Trying OpenRouteService...');
            // This would require a free API key from https://openrouteservice.org/
            // For demo purposes, we'll skip this and use OSRM
            return null;
        } catch (error) {
            console.warn('OpenRouteService failed:', error);
            return null;
        }
    }

    async tryGraphHopper(startLng, startLat, endLng, endLat) {
        try {
            console.log('Trying GraphHopper...');
            // This would require a free API key from https://graphhopper.com/
            // For demo purposes, we'll skip this and use OSRM
            return null;
        } catch (error) {
            console.warn('GraphHopper failed:', error);
            return null;
        }
    }

    calculateFallbackRoute() {
        // Fallback to straight line distance if routing service fails
        const distance = this.calculateDistance(
            this.pickupLocation.lat, this.pickupLocation.lng,
            this.dropoffLocation.lat, this.dropoffLocation.lng
        );

        // Apply a factor to estimate actual driving distance (typically 1.3-1.5x straight line)
        const actualDistance = distance * 1.4;
        const duration = Math.round(actualDistance * 2.5); // Assume average speed of 24 km/h in city
        const estimatedPrice = this.calculatePrice(actualDistance);

        // Update UI
        document.getElementById('distance').textContent = `${actualDistance.toFixed(1)} km (ước tính)`;
        document.getElementById('duration').textContent = `${duration} phút`;
        document.getElementById('estimatedPrice').textContent = `${estimatedPrice.toLocaleString()} VNĐ`;

        // Show route type indicator for fallback
        const routeTypeElement = document.getElementById('routeType');
        if (routeTypeElement) {
            routeTypeElement.classList.remove('hidden');
            routeTypeElement.innerHTML = '<i class="fas fa-plane mr-1"></i>Đường chim bay';
            routeTypeElement.className = 'text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full';
        }

        // Draw straight line route
        this.drawRoute();
        
        // Display pricing breakdown
        setTimeout(() => {
            this.displayPricingBreakdown();
        }, 100);
    }

    drawActualRoute(coordinates) {
        if (!coordinates || coordinates.length === 0) {
            console.warn('No route coordinates provided');
            return;
        }

        // Convert coordinates to Leaflet format [lat, lng]
        const routeCoordinates = coordinates.map(coord => [coord[1], coord[0]]);

        // Create polyline for the actual route
        this.route = L.polyline(routeCoordinates, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(this.map);

        // Fit map to show the entire route
        this.map.fitBounds(this.route.getBounds().pad(0.1));
        
        console.log('Actual route drawn on map');
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    calculatePrice(distance) {
        // Vietnam taxi pricing
        const basePrice = 12000; // 12,000 VNĐ base fare
        const pricePerKm = 15000; // 15,000 VNĐ per kilometer
        
        let totalFactor = 1.0;
        this.pricingFactors = []; // Store factors for display
        
        // 1. Traffic factor based on location (city center)
        let trafficFactor = 1.0;
        if (this.pickupLocation && this.dropoffLocation) {
            const isCityCenter = this.isCityCenter(this.pickupLocation) || this.isCityCenter(this.dropoffLocation);
            if (isCityCenter) {
                trafficFactor = 1.2;
                this.pricingFactors.push({
                    name: 'Phụ phí khu vực trung tâm',
                    factor: 1.2,
                    icon: '🏙️'
                });
            }
        }
        
        // 2. Rush hour factor (giờ cao điểm)
        const rushHourFactor = this.getRushHourFactor();
        if (rushHourFactor > 1.0) {
            this.pricingFactors.push({
                name: 'Phụ phí giờ cao điểm',
                factor: rushHourFactor,
                icon: '⏰'
            });
        }
        
        // 3. Weather factor (if available)
        const weatherFactor = this.getWeatherFactor();
        if (weatherFactor > 1.0) {
            this.pricingFactors.push({
                name: 'Phụ phí thời tiết xấu',
                factor: weatherFactor,
                icon: '🌧️'
            });
        }
        
        // 4. Traffic congestion factor (simulated based on time and location)
        const congestionFactor = this.getTrafficCongestionFactor();
        if (congestionFactor > 1.0) {
            this.pricingFactors.push({
                name: 'Phụ phí tắc đường',
                factor: congestionFactor,
                icon: '🚦'
            });
        }
        
        // Calculate total factor
        totalFactor = trafficFactor * rushHourFactor * weatherFactor * congestionFactor;
        
        const finalPrice = Math.round((basePrice + (distance * pricePerKm)) * totalFactor);
        
        // Store pricing breakdown for display
        this.pricingBreakdown = {
            basePrice: basePrice,
            distance: distance,
            pricePerKm: pricePerKm,
            distancePrice: distance * pricePerKm,
            totalFactor: totalFactor,
            finalPrice: finalPrice
        };
        
        return finalPrice;
    }
    
    getRushHourFactor() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Weekend - no rush hour
        if (day === 0 || day === 6) {
            return 1.0;
        }
        
        // Morning rush hour: 6:30 AM - 9:00 AM
        if (hour >= 6.5 && hour < 9) {
            return 1.08; // 8% - Giảm từ 30%
        }
        
        // Evening rush hour: 5:00 PM - 8:00 PM
        if (hour >= 17 && hour < 20) {
            return 1.08; // 8% - Giảm từ 30%
        }
        
        // Lunch time: 11:30 AM - 1:30 PM
        if (hour >= 11.5 && hour < 13.5) {
            return 1.05; // 5% - Giảm từ 15%
        }
        
        return 1.0;
    }
    
    getWeatherFactor() {
        // Use stored weather data if available
        if (this.weatherData) {
            const weather = this.weatherData.weather[0].main.toLowerCase();
            const rain = this.weatherData.rain ? this.weatherData.rain['1h'] || 0 : 0;
            
            // Heavy rain or storm
            if (weather.includes('storm') || weather.includes('thunderstorm')) {
                return 1.08; // 8% - Giảm từ 50%
            }
            
            // Rain
            if (weather.includes('rain') || rain > 0) {
                if (rain > 5) { // Heavy rain (>5mm/hour)
                    return 1.07; // 7% - Giảm từ 40%
                }
                return 1.05; // 5% - Giảm từ 25%
            }
            
            // Snow (rare in Vietnam but included for completeness)
            if (weather.includes('snow')) {
                return 1.07; // 7% - Giảm từ 40%
            }
            
            // Fog or mist
            if (weather.includes('fog') || weather.includes('mist')) {
                return 1.05; // 5% - Giảm từ 20%
            }
        }
        
        return 1.0;
    }
    
    getTrafficCongestionFactor() {
        // Use real traffic data if available
        if (this.trafficData && this.trafficData.flowSegmentData) {
            const flow = this.trafficData.flowSegmentData;
            
            // TomTom returns currentSpeed and freeFlowSpeed
            const currentSpeed = flow.currentSpeed;
            const freeFlowSpeed = flow.freeFlowSpeed;
            const confidence = flow.confidence || 0.5;
            
            // Calculate congestion based on speed ratio
            const speedRatio = currentSpeed / freeFlowSpeed;
            
            console.log(`🚦 Real traffic data - Current: ${currentSpeed} km/h, Free flow: ${freeFlowSpeed} km/h, Ratio: ${speedRatio.toFixed(2)}`);
            
            let congestionFactor = 1.0;
            
            if (speedRatio < 0.3) {
                // Extremely slow (< 30% of free flow speed)
                congestionFactor = 1.09; // 9% - Giảm từ 50%
            } else if (speedRatio < 0.5) {
                // Heavy congestion (30-50% of free flow speed)
                congestionFactor = 1.08; // 8% - Giảm từ 35%
            } else if (speedRatio < 0.7) {
                // Moderate congestion (50-70% of free flow speed)
                congestionFactor = 1.06; // 6% - Giảm từ 20%
            } else if (speedRatio < 0.85) {
                // Light congestion (70-85% of free flow speed)
                congestionFactor = 1.03; // 3% - Giảm từ 10%
            }
            
            // Adjust based on confidence level
            const finalFactor = 1.0 + ((congestionFactor - 1.0) * confidence);
            
            console.log(`📊 Traffic congestion factor: ${finalFactor.toFixed(2)}x (confidence: ${(confidence * 100).toFixed(0)}%)`);
            return finalFactor;
        }
        
        // Fallback to simulated data based on location and time
        console.log('⚠️ Using simulated traffic data');
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Check if both locations are in high-traffic areas
        const pickupHighTraffic = this.isHighTrafficArea(this.pickupLocation);
        const dropoffHighTraffic = this.isHighTrafficArea(this.dropoffLocation);
        
        let congestionLevel = 1.0;
        
        // Base congestion on location
        if (pickupHighTraffic && dropoffHighTraffic) {
            congestionLevel = 1.06; // 6% - Giảm từ 15%
        } else if (pickupHighTraffic || dropoffHighTraffic) {
            congestionLevel = 1.04; // 4% - Giảm từ 10%
        }
        
        // Increase during peak hours (thêm nhẹ)
        if (day >= 1 && day <= 5) { // Weekdays
            if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
                congestionLevel += 0.03; // Thêm 3% thay vì nhân 1.2
            }
        }
        
        return Math.min(congestionLevel, 1.09); // Giới hạn tối đa 9%
    }
    
    isHighTrafficArea(location) {
        if (!location) return false;
        
        // High traffic districts in Hanoi
        const hanoiHighTraffic = ['Hoàn Kiếm', 'Ba Đình', 'Đống Đa', 'Hai Bà Trưng'];
        // High traffic districts in HCMC
        const hcmcHighTraffic = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 10', 'Bình Thạnh'];
        
        if (location.city === 'Hà Nội') {
            return hanoiHighTraffic.includes(location.district);
        } else if (location.city === 'TP.HCM') {
            return hcmcHighTraffic.includes(location.district);
        }
        
        return false;
    }
    
    async fetchWeatherData(lat, lng) {
        try {
            // Check if API key is configured
            if (!this.weatherApiKey) {
                console.log('⚠️ No weather API key configured - using simulated data');
                this.simulateWeatherData();
                return;
            }
            
            console.log('🌤️ Fetching real weather data from WeatherAPI.com...');
            const url = `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${lat},${lng}&aqi=no`;
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.log('WeatherAPI Error Response:', errorText);
                
                if (response.status === 401) {
                    throw new Error('API key không hợp lệ hoặc hết hạn. Vui lòng kiểm tra lại!');
                } else if (response.status === 403) {
                    throw new Error('API key không có quyền truy cập WeatherAPI.com');
                } else if (response.status === 429) {
                    throw new Error('Đã vượt quá giới hạn số lượt gọi API. Vui lòng thử lại sau!');
                }
                throw new Error(`WeatherAPI error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Weather data fetched successfully:', data);
            
            this.weatherData = {
                temperature: Math.round(data.current.temp_c),
                condition: data.current.condition.text,
                humidity: data.current.humidity,
                windSpeed: Math.round(data.current.wind_kph)
            };
            
            // Show success notification
            this.showNotification('✅ Đã lấy dữ liệu thời tiết thực!', 'success');
            
            // Update UI with weather info
            this.displayWeatherInfo();
            
        } catch (error) {
            console.error('❌ Failed to fetch weather data:', error);
            this.showNotification(`❌ Lỗi thời tiết: ${error.message}`, 'error');
            
            // Debug: Test API key directly
            this.debugApiKey();
            
            // Use simulated data as fallback
            this.simulateWeatherData();
        }
    }
    
    async fetchTrafficData(lat, lng) {
        try {
            // Check if API key is configured
            if (!this.trafficApiKey) {
                console.log('⚠️ No traffic API key configured - using simulated data');
                this.trafficData = null;
                return;
            }
            
            console.log('🚦 Fetching real traffic data from TomTom...');
            // TomTom Traffic Flow API
            const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${this.trafficApiKey}&point=${lat},${lng}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API key không hợp lệ hoặc đã hết hạn');
                } else if (response.status === 429) {
                    throw new Error('Đã vượt quá giới hạn số lượt gọi API');
                }
                throw new Error(`Traffic API error: ${response.status}`);
            }
            
            this.trafficData = await response.json();
            console.log('✅ Traffic data fetched successfully:', this.trafficData);
            
            // Show success notification
            this.showNotification('✅ Đã lấy dữ liệu tắc đường thực!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to fetch traffic data:', error);
            this.showNotification(`❌ Lỗi tắc đường: ${error.message}`, 'warning');
            this.trafficData = null;
        }
    }
    
    async debugApiKey() {
        console.log('🔍 Debugging API key...');
        console.log('Current API key:', this.weatherApiKey);
        console.log('API key length:', this.weatherApiKey?.length);
        
        if (!this.weatherApiKey) {
            console.log('❌ No API key configured');
            this.showNotification('❌ Không có API key được cấu hình', 'error');
            return;
        }
        
        this.showNotification('🔍 Đang debug API key...', 'info');
        
        try {
            const testUrl = `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=21.0285,105.8542&aqi=no`;
            console.log('🔍 Testing URL:', testUrl);
            
            const response = await fetch(testUrl);
            console.log('🔍 Response status:', response.status);
            console.log('🔍 Response ok:', response.ok);
            
            const responseText = await response.text();
            console.log('🔍 Response text:', responseText);
            
            if (!response.ok) {
                console.log('❌ API call failed');
                this.showNotification(`❌ API call failed: ${response.status} - ${responseText}`, 'error');
            } else {
                console.log('✅ API call successful');
                const data = JSON.parse(responseText);
                this.showNotification(`✅ API key hoạt động! Nhiệt độ: ${data.current.temp_c}°C`, 'success');
            }
        } catch (error) {
            console.log('❌ Debug test failed:', error);
            this.showNotification(`❌ Debug test failed: ${error.message}`, 'error');
        }
    }

    simulateWeatherData() {
        // Simulate random weather conditions for demo
        const conditions = [
            { main: 'Clear', description: 'Trời quang', icon: '☀️', rain: 0 },
            { main: 'Clouds', description: 'Nhiều mây', icon: '☁️', rain: 0 },
            { main: 'Rain', description: 'Mưa nhẹ', icon: '🌧️', rain: 3 },
            { main: 'Rain', description: 'Mưa vừa', icon: '🌧️', rain: 7 },
            { main: 'Thunderstorm', description: 'Mưa dông', icon: '⛈️', rain: 10 }
        ];
        
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        
        this.weatherData = {
            weather: [randomCondition],
            main: {
                temp: 25 + Math.random() * 10,
                humidity: 60 + Math.random() * 30
            },
            rain: randomCondition.rain > 0 ? { '1h': randomCondition.rain } : undefined
        };
        
        console.log('Simulated weather data:', this.weatherData);
        this.displayWeatherInfo();
    }
    
    displayWeatherInfo() {
        // Add weather info to trip details if it exists
        const tripDetails = document.getElementById('tripDetails');
        if (!tripDetails || tripDetails.classList.contains('hidden')) {
            return;
        }
        
        // Remove existing weather info
        const existingWeather = document.getElementById('weatherInfo');
        if (existingWeather) {
            existingWeather.remove();
        }
        
        // Create weather info element
        const weatherInfo = document.createElement('div');
        weatherInfo.id = 'weatherInfo';
        weatherInfo.className = 'mt-4 p-4 bg-blue-50 rounded-lg';
        
        const weather = this.weatherData.weather[0];
        const weatherIcon = this.getWeatherIcon(weather.main);
        
        weatherInfo.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-3xl">${weatherIcon}</span>
                <div>
                    <div class="font-semibold text-gray-800">Thời tiết hiện tại</div>
                    <div class="text-sm text-gray-600">
                        ${weather.description} • ${Math.round(this.weatherData.main.temp)}°C
                        ${this.weatherData.rain ? ` • Lượng mưa: ${this.weatherData.rain['1h']}mm/h` : ''}
                    </div>
                </div>
            </div>
        `;
        
        const priceSection = document.querySelector('#tripDetails .grid');
        if (priceSection) {
            priceSection.parentNode.insertBefore(weatherInfo, priceSection.nextSibling);
        }
    }
    
    getWeatherIcon(weatherMain) {
        const icons = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
        };
        return icons[weatherMain] || '🌤️';
    }
    
    goToConfirmation() {
        console.log('🚀 goToConfirmation called');
        console.log('Pickup location:', this.pickupLocation);
        console.log('Dropoff location:', this.dropoffLocation);
        
        // Check if both locations are selected
        if (!this.pickupLocation || !this.dropoffLocation) {
            console.log('❌ Missing locations, showing warning');
            this.showNotification('⚠️ Vui lòng chọn điểm đón và điểm đến trước', 'warning');
            return;
        }
        
        // Pass trip data via URL parameters to confirmation page
        const params = new URLSearchParams({
            pickup: encodeURIComponent(JSON.stringify(this.pickupLocation)),
            dropoff: encodeURIComponent(JSON.stringify(this.dropoffLocation))
        });
        
        const confirmationUrl = `confirmation.html?${params.toString()}`;
        console.log('🔗 Navigating to:', confirmationUrl);
        
        // Navigate to confirmation page
        window.location.href = confirmationUrl;
    }


    displayPricingBreakdown() {
        // Remove existing pricing breakdown if any
        const existingBreakdown = document.getElementById('pricingBreakdown');
        if (existingBreakdown) {
            existingBreakdown.remove();
        }
        
        if (!this.pricingBreakdown) {
            return;
        }
        
        // Update current conditions display
        this.updateConditionsDisplay();
        
        // Create pricing breakdown element
        const breakdown = document.createElement('div');
        breakdown.id = 'pricingBreakdown';
        breakdown.className = 'mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200';
        
        let factorsHTML = '';
        if (this.pricingFactors && this.pricingFactors.length > 0) {
            factorsHTML = `
                <div class="mt-3 pt-3 border-t border-yellow-200">
                    <div class="font-semibold text-gray-700 mb-2">Các phụ phí áp dụng:</div>
                    <div class="space-y-2">
                        ${this.pricingFactors.map(factor => `
                            <div class="flex items-center justify-between text-sm">
                                <span class="flex items-center space-x-2">
                                    <span class="text-lg">${factor.icon}</span>
                                    <span class="text-gray-700">${factor.name}</span>
                                </span>
                                <span class="font-semibold text-orange-600">+${Math.round((factor.factor - 1) * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        breakdown.innerHTML = `
            <div class="flex items-start space-x-3">
                <span class="text-2xl">💰</span>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800 mb-2">Chi tiết giá cước</div>
                    
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Giá khởi điểm:</span>
                            <span class="font-medium">${this.pricingBreakdown.basePrice.toLocaleString()} VNĐ</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Khoảng cách (${this.pricingBreakdown.distance.toFixed(1)} km × ${this.pricingBreakdown.pricePerKm.toLocaleString()} VNĐ/km):</span>
                            <span class="font-medium">${Math.round(this.pricingBreakdown.distancePrice).toLocaleString()} VNĐ</span>
                        </div>
                        ${factorsHTML}
                        <div class="flex justify-between pt-3 border-t border-yellow-300">
                            <span class="font-semibold text-gray-800">Tổng cộng:</span>
                            <span class="text-lg font-bold text-green-600">${this.pricingBreakdown.finalPrice.toLocaleString()} VNĐ</span>
                        </div>
                        ${this.pricingBreakdown.totalFactor > 1.0 ? `
                            <div class="text-xs text-gray-500 italic text-center">
                                * Giá đã tăng ${Math.round((this.pricingBreakdown.totalFactor - 1) * 100)}% so với giá cơ bản
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Insert after trip details
        const tripDetailsGrid = document.querySelector('#tripDetails .grid');
        if (tripDetailsGrid) {
            tripDetailsGrid.parentNode.insertBefore(breakdown, tripDetailsGrid.nextSibling);
        }
    }
    
    updateConditionsDisplay() {
        // Update rush hour status
        const rushHourFactor = this.getRushHourFactor();
        const rushHourStatus = document.getElementById('rushHourStatus');
        const rushHourIcon = document.getElementById('rushHourIcon');
        if (rushHourStatus) {
            if (rushHourFactor > 1.2) {
                rushHourStatus.textContent = 'Giờ cao điểm';
                rushHourStatus.className = 'text-red-600 font-semibold';
                rushHourIcon.textContent = '🔴';
            } else if (rushHourFactor > 1.0) {
                rushHourStatus.textContent = 'Giờ bận';
                rushHourStatus.className = 'text-orange-600 font-semibold';
                rushHourIcon.textContent = '🟡';
            } else {
                rushHourStatus.textContent = 'Bình thường';
                rushHourStatus.className = 'text-green-600';
                rushHourIcon.textContent = '🟢';
            }
        }
        
        // Update traffic status
        const congestionFactor = this.getTrafficCongestionFactor();
        const trafficStatus = document.getElementById('trafficStatus');
        const trafficIcon = document.getElementById('trafficIcon');
        if (trafficStatus) {
            if (congestionFactor > 1.3) {
                trafficStatus.textContent = 'Tắc nghiêm trọng';
                trafficStatus.className = 'text-red-600 font-semibold';
                trafficIcon.textContent = '🔴';
            } else if (congestionFactor > 1.15) {
                trafficStatus.textContent = 'Tắc vừa phải';
                trafficStatus.className = 'text-orange-600 font-semibold';
                trafficIcon.textContent = '🟡';
            } else if (congestionFactor > 1.0) {
                trafficStatus.textContent = 'Có chút tắc';
                trafficStatus.className = 'text-yellow-600';
                trafficIcon.textContent = '🟡';
            } else {
                trafficStatus.textContent = 'Thông thoáng';
                trafficStatus.className = 'text-green-600';
                trafficIcon.textContent = '🟢';
            }
        }
        
        // Update weather status
        const weatherFactor = this.getWeatherFactor();
        const weatherStatus = document.getElementById('weatherStatus');
        const weatherIcon = document.getElementById('weatherIcon');
        if (weatherStatus && this.weatherData) {
            const weather = this.weatherData.weather[0].main;
            if (weatherFactor > 1.4) {
                weatherStatus.textContent = 'Mưa to/bão';
                weatherStatus.className = 'text-red-600 font-semibold';
                weatherIcon.textContent = '⛈️';
            } else if (weatherFactor > 1.2) {
                weatherStatus.textContent = 'Mưa/thời tiết xấu';
                weatherStatus.className = 'text-orange-600 font-semibold';
                weatherIcon.textContent = '🌧️';
            } else {
                weatherStatus.textContent = 'Thời tiết tốt';
                weatherStatus.className = 'text-green-600';
                weatherIcon.textContent = this.getWeatherIcon(weather);
            }
        } else if (weatherStatus) {
            weatherStatus.textContent = 'Chưa có dữ liệu';
            weatherStatus.className = 'text-gray-500';
        }
        
        // Update location status
        const locationStatus = document.getElementById('locationStatus');
        const locationIcon = document.getElementById('locationIcon');
        if (locationStatus && this.pickupLocation && this.dropoffLocation) {
            const isCityCenter = this.isCityCenter(this.pickupLocation) || this.isCityCenter(this.dropoffLocation);
            if (isCityCenter) {
                locationStatus.textContent = 'Khu trung tâm';
                locationStatus.className = 'text-orange-600 font-semibold';
                locationIcon.textContent = '🏙️';
            } else {
                locationStatus.textContent = 'Khu ngoại ô';
                locationStatus.className = 'text-green-600';
                locationIcon.textContent = '🏡';
            }
        }
    }

    isCityCenter(location) {
        // Check if location is in city center (District 1, 3)
        const cityCenterDistricts = ['Quận 1', 'Quận 3'];
        return cityCenterDistricts.includes(location.district);
    }

    drawRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) {
            return;
        }

        const routeCoordinates = [
            [this.pickupLocation.lat, this.pickupLocation.lng],
            [this.dropoffLocation.lat, this.dropoffLocation.lng]
        ];

        // Draw dashed line to indicate this is straight line distance
        this.route = L.polyline(routeCoordinates, {
            color: '#ef4444', // Red color to indicate fallback
            weight: 3,
            opacity: 0.8,
            dashArray: '15, 10' // Dashed pattern
        }).addTo(this.map);

        // Add popup to indicate this is estimated route
        this.route.bindPopup(`
            <div class="p-2">
                <h3 class="font-semibold text-red-600">⚠️ Đường chim bay</h3>
                <p class="text-sm">Khoảng cách ước tính theo đường thẳng</p>
                <p class="text-xs text-gray-500">Không phải đường đi thực tế</p>
            </div>
        `);

        // Fit map to show both locations
        const group = new L.featureGroup([this.pickupMarker, this.dropoffMarker]);
        this.map.fitBounds(group.getBounds().pad(0.1));
        
        console.log('Fallback route (straight line) drawn');
    }

    bindEvents() {
        console.log('Binding events...');
        
        // New UI event handlers
        this.bindNewUIEvents();
        
        // Bind popular locations toggle
        this.bindPopularLocationsToggle();
        
        // Bind trip details close button
        this.bindTripDetailsClose();
        
        // Bind traffic test locations
        this.bindTrafficTestLocations();
        
        // Location search input events
        const locationSearchInput = document.getElementById('locationSearchInput');
        
        if (locationSearchInput) {
            locationSearchInput.addEventListener('input', (e) => {
                console.log('Location search input changed:', e.target.value);
                this.handleLocationInput(e.target.value, this.currentSelectionMode);
            });
            console.log('Location search input event bound');
        } else {
            console.error('Location search input not found!');
        }

        // Popular location buttons
        const popularButtons = document.querySelectorAll('.popular-location');
        console.log(`Found ${popularButtons.length} popular location buttons`);
        
        popularButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('Popular location clicked:', e.target.textContent);
                const type = e.target.getAttribute('data-type');
                const locationName = e.target.getAttribute('data-location');
                const location = this.locations.find(loc => loc.name === locationName);
                
                console.log('Location found:', location);
                
                if (location) {
                    if (type === 'pickup' || type === 'both') {
                        document.getElementById('pickupLocation').value = location.name;
                        this.setPickupLocation(location);
                    }
                    if (type === 'dropoff' || type === 'both') {
                        document.getElementById('dropoffLocation').value = location.name;
                        this.setDropoffLocation(location);
                    }
                    this.calculateRoute();
                }
            });
        });

        // City filter buttons
        const cityButtons = document.querySelectorAll('.city-filter');
        console.log(`Found ${cityButtons.length} city filter buttons`);
        
        cityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('City filter clicked:', e.target.textContent);
                const city = e.target.getAttribute('data-city');
                console.log('City:', city);
                this.filterByCity(city);
                
                // Update button styles
                cityButtons.forEach(btn => {
                    btn.className = btn.className.replace('bg-blue-100 text-blue-800', 'bg-gray-100 text-gray-700');
                });
                e.target.className = e.target.className.replace('bg-gray-100 text-gray-700', 'bg-blue-100 text-blue-800');
            });
        });

        // Category filter buttons
        const categoryButtons = document.querySelectorAll('.category-filter');
        console.log(`Found ${categoryButtons.length} category filter buttons`);
        
        categoryButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('Category filter clicked:', e.target.textContent);
                const category = e.target.getAttribute('data-category');
                console.log('Category:', category);
                this.showCategoryLocations(category);
            });
        });

        // Get current location button
        const currentLocationBtn = document.getElementById('getCurrentLocation');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => {
                console.log('Get current location clicked');
                this.getCurrentLocation();
            });
            console.log('Current location button event bound');
        } else {
            console.error('Current location button not found!');
        }

        // Booking button
        const bookTaxiBtn = document.getElementById('bookTaxi');
        if (bookTaxiBtn) {
            bookTaxiBtn.addEventListener('click', () => {
                console.log('🚗 Book taxi button clicked');
                this.goToConfirmation();
            });
            console.log('✅ Book taxi button event bound');
        } else {
            console.error('❌ Book taxi button not found!');
        }

        // New booking button
        const newBookingBtn = document.getElementById('newBooking');
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => {
                console.log('🔄 New booking button clicked');
                this.goToConfirmation();
            });
            console.log('✅ New booking button event bound');
        } else {
            console.error('❌ New booking button not found!');
        }

        // Clear saved data button
        const clearSavedDataBtn = document.getElementById('clearSavedData');
        if (clearSavedDataBtn) {
            clearSavedDataBtn.addEventListener('click', () => {
                console.log('Clear saved data clicked');
                if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu đã lưu?')) {
                    this.clearSavedState();
                    this.resetBooking();
                    alert('Đã xóa dữ liệu đã lưu!');
                }
            });
            console.log('Clear saved data button event bound');
        } else {
            console.error('Clear saved data button not found!');
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.location-input-container')) {
                this.hideSuggestions();
            }
        });
        
        // API Settings Modal events
        this.bindApiSettingsEvents();
        
        console.log('All events bound successfully!');
    }
    
    bindApiSettingsEvents() {
        console.log('Binding API settings events...');
        
        // Open API settings modal
        const apiSettingsBtn = document.getElementById('apiSettingsBtn');
        const apiSettingsModal = document.getElementById('apiSettingsModal');
        const closeApiSettings = document.getElementById('closeApiSettings');
        
        if (apiSettingsBtn) {
            apiSettingsBtn.addEventListener('click', () => {
                console.log('Opening API settings modal');
                this.openApiSettingsModal();
            });
        }
        
        // Close modal
        if (closeApiSettings) {
            closeApiSettings.addEventListener('click', () => {
                apiSettingsModal.classList.add('hidden');
            });
        }
        
        // Close when clicking outside
        if (apiSettingsModal) {
            apiSettingsModal.addEventListener('click', (e) => {
                if (e.target === apiSettingsModal) {
                    apiSettingsModal.classList.add('hidden');
                }
            });
        }
        
        // Save API keys
        const saveApiSettings = document.getElementById('saveApiSettings');
        if (saveApiSettings) {
            saveApiSettings.addEventListener('click', () => {
                this.saveApiKeysFromModal();
            });
        }
        
        // Clear API keys
        const clearApiSettings = document.getElementById('clearApiSettings');
        if (clearApiSettings) {
            clearApiSettings.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn xóa tất cả API keys?')) {
                    this.clearApiKeysFromModal();
                }
            });
        }
        
        // Test weather API
        const testWeatherApi = document.getElementById('testWeatherApi');
        if (testWeatherApi) {
            testWeatherApi.addEventListener('click', () => {
                this.testWeatherApi();
            });
        }
        
        const debugApiKey = document.getElementById('debugApiKey');
        if (debugApiKey) {
            debugApiKey.addEventListener('click', () => {
                this.debugApiKey();
            });
        }
        
        // Test API key validity
        const testApiKey = document.getElementById('testApiKey');
        if (testApiKey) {
            testApiKey.addEventListener('click', () => {
                this.testApiKeyOnly();
            });
        }
        
        // Test traffic API
        const testTrafficApi = document.getElementById('testTrafficApi');
        if (testTrafficApi) {
            testTrafficApi.addEventListener('click', () => {
                this.testTrafficApi();
            });
        }
        
        console.log('API settings events bound successfully!');
    }
    
    openApiSettingsModal() {
        const modal = document.getElementById('apiSettingsModal');
        const weatherApiKeyInput = document.getElementById('weatherApiKey');
        const trafficApiKeyInput = document.getElementById('trafficApiKey');
        
        // Load current API keys
        if (weatherApiKeyInput) {
            weatherApiKeyInput.value = this.weatherApiKey || '';
        }
        if (trafficApiKeyInput) {
            trafficApiKeyInput.value = this.trafficApiKey || 'bQrbmvGHDhZA0DUXLOFxLRnYNNrbqgEq';
        }
        
        // Update status displays
        this.updateApiStatusDisplay();
        
        // Show modal
        modal.classList.remove('hidden');
    }
    
    updateApiStatusDisplay() {
        const weatherStatus = document.getElementById('weatherApiStatus');
        const trafficStatus = document.getElementById('trafficApiStatus');
        
        if (weatherStatus) {
            if (this.weatherApiKey) {
                weatherStatus.textContent = 'Đã cấu hình ✓';
                weatherStatus.className = 'text-xs px-2 py-1 rounded bg-green-100 text-green-700';
            } else {
                weatherStatus.textContent = 'Chưa cấu hình';
                weatherStatus.className = 'text-xs px-2 py-1 rounded bg-gray-200 text-gray-700';
            }
        }
        
        if (trafficStatus) {
            if (this.trafficApiKey) {
                trafficStatus.textContent = 'Đã cấu hình ✓';
                trafficStatus.className = 'text-xs px-2 py-1 rounded bg-green-100 text-green-700';
            } else {
                trafficStatus.textContent = 'Chưa cấu hình';
                trafficStatus.className = 'text-xs px-2 py-1 rounded bg-gray-200 text-gray-700';
            }
        }
    }
    
    saveApiKeysFromModal() {
        const weatherApiKeyInput = document.getElementById('weatherApiKey');
        const trafficApiKeyInput = document.getElementById('trafficApiKey');
        
        const weatherKey = weatherApiKeyInput.value.trim();
        const trafficKey = trafficApiKeyInput.value.trim();
        
        if (!weatherKey && !trafficKey) {
            alert('Vui lòng nhập ít nhất một API key!');
            return;
        }
        
        this.saveApiKeys(weatherKey, trafficKey);
        this.updateApiStatusDisplay();
        
        this.showNotification('✅ Đã lưu API keys thành công!', 'success');
        
        // Close modal
        document.getElementById('apiSettingsModal').classList.add('hidden');
    }
    
    clearApiKeysFromModal() {
        this.clearApiKeys();
        
        // Clear input fields
        document.getElementById('weatherApiKey').value = '';
        document.getElementById('trafficApiKey').value = '';
        
        this.updateApiStatusDisplay();
        this.showNotification('✅ Đã xóa API keys!', 'success');
    }
    
    async testWeatherApi() {
        const weatherApiKeyInput = document.getElementById('weatherApiKey');
        const testBtn = document.getElementById('testWeatherApi');
        const apiKey = weatherApiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Vui lòng nhập API key trước!');
            return;
        }
        
        // Save original button text
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang kiểm tra...';
        testBtn.disabled = true;
        
        try {
            // Test with Hanoi coordinates using WeatherAPI.com
            const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=21.0285,105.8542&aqi=no`;
            console.log('Testing WeatherAPI.com with URL:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response:', errorText);
                
                if (response.status === 401) {
                    throw new Error('API key không hợp lệ hoặc hết hạn!');
                } else if (response.status === 403) {
                    throw new Error('API key không có quyền truy cập!');
                } else if (response.status === 429) {
                    throw new Error('Đã vượt quá giới hạn API calls!');
                }
                throw new Error(`WeatherAPI Error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Weather API test successful:', data);
            
            this.showNotification(`✅ API hoạt động! Thời tiết Hà Nội: ${data.current.condition.text}, ${Math.round(data.current.temp_c)}°C`, 'success');
            
        } catch (error) {
            console.error('Weather API test failed:', error);
            this.showNotification(`❌ Lỗi: ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }
    
    async testTrafficApi() {
        const trafficApiKeyInput = document.getElementById('trafficApiKey');
        const testBtn = document.getElementById('testTrafficApi');
        const testLatInput = document.getElementById('testLat');
        const testLngInput = document.getElementById('testLng');
        const resultsDiv = document.getElementById('trafficTestResults');
        const resultsContent = document.getElementById('trafficResultsContent');
        
        const apiKey = trafficApiKeyInput.value.trim();
        const lat = parseFloat(testLatInput.value) || 10.8231;
        const lng = parseFloat(testLngInput.value) || 106.6297;
        
        if (!apiKey) {
            this.showNotification('⚠️ Vui lòng nhập TomTom API key trước!', 'warning');
            return;
        }
        
        // Save original button text
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang phân tích...';
        testBtn.disabled = true;
        
        // Hide previous results
        resultsDiv.classList.add('hidden');
        
        try {
            console.log(`Testing TomTom Traffic API at coordinates: ${lat}, ${lng}`);
            
            // First test API key validity
            const keyTest = await this.testApiKeyValidity(apiKey);
            if (!keyTest.valid) {
                throw new Error(keyTest.message);
            }
            
            // Test with user coordinates
            const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${apiKey}&point=${lat},${lng}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API key không hợp lệ hoặc không có quyền truy cập!');
                } else if (response.status === 429) {
                    throw new Error('Đã vượt quá giới hạn requests (2,500/ngày)!');
                } else if (response.status === 400) {
                    throw new Error('Tọa độ không hợp lệ!');
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Traffic API response:', data);
            
            // Parse traffic data
            const trafficData = data.flowSegmentData;
            if (!trafficData) {
                throw new Error('Không có dữ liệu traffic tại vị trí này!');
            }
            
            // Calculate traffic metrics
            const currentSpeed = trafficData.currentSpeed || 0;
            const freeFlowSpeed = trafficData.freeFlowSpeed || 0;
            const confidence = trafficData.confidence || 0;
            
            // Determine traffic condition
            let trafficCondition = 'Unknown';
            let trafficColor = 'gray';
            let trafficIcon = '❓';
            
            if (currentSpeed > 0 && freeFlowSpeed > 0) {
                const speedRatio = currentSpeed / freeFlowSpeed;
                
                if (speedRatio >= 0.8) {
                    trafficCondition = 'Thông thoáng';
                    trafficColor = 'green';
                    trafficIcon = '🟢';
                } else if (speedRatio >= 0.5) {
                    trafficCondition = 'Chậm';
                    trafficColor = 'yellow';
                    trafficIcon = '🟡';
                } else if (speedRatio >= 0.2) {
                    trafficCondition = 'Tắc đường';
                    trafficColor = 'red';
                    trafficIcon = '🔴';
                } else {
                    trafficCondition = 'Tắc đường nghiêm trọng';
                    trafficColor = 'red';
                    trafficIcon = '🛑';
                }
            }
            
            // Calculate road segments (simplified)
            const roadLength = 1; // Assume 1km radius
            const congestedLength = freeFlowSpeed > 0 ? roadLength * (1 - (currentSpeed / freeFlowSpeed)) : 0;
            const freeFlowLength = roadLength - congestedLength;
            
            // Display results
            resultsContent.innerHTML = `
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-${trafficColor}-50 p-3 rounded border border-${trafficColor}-200">
                        <div class="text-center">
                            <div class="text-2xl mb-1">${trafficIcon}</div>
                            <div class="text-sm font-semibold text-${trafficColor}-800">${trafficCondition}</div>
                        </div>
                    </div>
                    <div class="bg-blue-50 p-3 rounded border border-blue-200">
                        <div class="text-center">
                            <div class="text-lg font-bold text-blue-800">${currentSpeed} km/h</div>
                            <div class="text-xs text-blue-600">Tốc độ hiện tại</div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <span class="text-sm font-medium">🚗 Tốc độ hiện tại:</span>
                        <span class="font-bold">${currentSpeed} km/h</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <span class="text-sm font-medium">🏃 Tốc độ tối đa:</span>
                        <span class="font-bold">${freeFlowSpeed} km/h</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <span class="text-sm font-medium">📊 Độ tin cậy:</span>
                        <span class="font-bold">${confidence}%</span>
                    </div>
                </div>
                
                <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <h6 class="text-sm font-semibold text-blue-800 mb-2">📏 Phân tích đoạn đường (1km):</h6>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="flex justify-between">
                            <span>🟢 Thông thoáng:</span>
                            <span class="font-bold text-green-600">${freeFlowLength.toFixed(2)} km</span>
                        </div>
                        <div class="flex justify-between">
                            <span>🔴 Tắc đường:</span>
                            <span class="font-bold text-red-600">${congestedLength.toFixed(2)} km</span>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3 text-xs text-gray-600">
                    <i class="fas fa-info-circle mr-1"></i>
                    Dữ liệu tại tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
            `;
            
            // Show results
            resultsDiv.classList.remove('hidden');
            this.showNotification(`✅ Phân tích traffic thành công! Tình trạng: ${trafficCondition}`, 'success');
            
            // Add traffic marker to map
            this.addTrafficFlowToMap(lat, lng, data);
            
            // Add clear traffic button to results
            const clearTrafficBtn = document.createElement('button');
            clearTrafficBtn.className = 'w-full mt-3 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors';
            clearTrafficBtn.innerHTML = '<i class="fas fa-trash mr-2"></i>Xóa marker trên map';
            clearTrafficBtn.onclick = () => {
                if (this.trafficMarker) {
                    this.map.removeLayer(this.trafficMarker);
                    this.trafficMarker = null;
                    this.showNotification('✅ Đã xóa traffic marker', 'success');
                }
            };
            resultsContent.appendChild(clearTrafficBtn);
            
        } catch (error) {
            console.error('Traffic API test failed:', error);
            
            // Show error in results
            resultsContent.innerHTML = `
                <div class="bg-red-50 p-3 rounded border border-red-200">
                    <div class="text-center">
                        <div class="text-2xl mb-2">❌</div>
                        <div class="text-sm font-semibold text-red-800">Lỗi kết nối API</div>
                        <div class="text-xs text-red-600 mt-1">${error.message}</div>
                    </div>
                </div>
            `;
            
            resultsDiv.classList.remove('hidden');
            this.showNotification(`❌ ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    // Visual Traffic Flow Display on Map
    addTrafficFlowToMap(lat, lng, trafficData) {
        // Remove existing traffic markers
        if (this.trafficMarker) {
            this.map.removeLayer(this.trafficMarker);
        }
        
        if (!trafficData || !trafficData.flowSegmentData) {
            return;
        }
        
        const currentSpeed = trafficData.flowSegmentData.currentSpeed || 0;
        const freeFlowSpeed = trafficData.flowSegmentData.freeFlowSpeed || 0;
        
        // Calculate traffic condition
        let trafficColor = 'gray';
        let trafficIcon = '❓';
        let trafficText = 'Unknown';
        
        if (currentSpeed > 0 && freeFlowSpeed > 0) {
            const speedRatio = currentSpeed / freeFlowSpeed;
            
            if (speedRatio >= 0.8) {
                trafficColor = 'green';
                trafficIcon = '🟢';
                trafficText = 'Thông thoáng';
            } else if (speedRatio >= 0.5) {
                trafficColor = 'yellow';
                trafficIcon = '🟡';
                trafficText = 'Chậm';
            } else if (speedRatio >= 0.2) {
                trafficColor = 'red';
                trafficIcon = '🔴';
                trafficText = 'Tắc đường';
            } else {
                trafficColor = 'red';
                trafficIcon = '🛑';
                trafficText = 'Tắc nghiêm trọng';
            }
        }
        
        // Create traffic marker
        const trafficIconHtml = `
            <div style="background: white; border: 2px solid ${trafficColor === 'green' ? '#10b981' : trafficColor === 'yellow' ? '#f59e0b' : '#ef4444'}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                ${trafficIcon}
            </div>
        `;
        
        const trafficIconDiv = L.divIcon({
            html: trafficIconHtml,
            className: 'traffic-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        this.trafficMarker = L.marker([lat, lng], { icon: trafficIconDiv })
            .addTo(this.map)
            .bindPopup(`
                <div style="min-width: 200px;">
                    <div style="text-align: center; margin-bottom: 10px;">
                        <div style="font-size: 24px; margin-bottom: 5px;">${trafficIcon}</div>
                        <div style="font-weight: bold; color: ${trafficColor === 'green' ? '#10b981' : trafficColor === 'yellow' ? '#f59e0b' : '#ef4444'};">${trafficText}</div>
                    </div>
                    <div style="font-size: 14px;">
                        <div style="margin-bottom: 5px;"><strong>🚗 Tốc độ hiện tại:</strong> ${currentSpeed} km/h</div>
                        <div style="margin-bottom: 5px;"><strong>🏃 Tốc độ tối đa:</strong> ${freeFlowSpeed} km/h</div>
                        <div style="margin-bottom: 5px;"><strong>📊 Độ tin cậy:</strong> ${trafficData.flowSegmentData.confidence || 0}%</div>
                        <div style="font-size: 12px; color: #666; margin-top: 10px;">
                            Dữ liệu thời gian thực từ TomTom
                        </div>
                    </div>
                </div>
            `);
        
        // Auto-open popup for a few seconds
        this.trafficMarker.openPopup();
        setTimeout(() => {
            if (this.trafficMarker) {
                this.trafficMarker.closePopup();
            }
        }, 5000);
        
        console.log(`Traffic marker added at ${lat}, ${lng}: ${trafficText} (${currentSpeed} km/h)`);
    }

    bindPopularLocationsToggle() {
        const toggleBtn = document.getElementById('togglePopularLocations');
        const contentDiv = document.getElementById('popularLocationsContent');
        const toggleText = document.getElementById('popularLocationsToggleText');
        const toggleIcon = document.getElementById('popularLocationsToggleIcon');
        
        if (!toggleBtn || !contentDiv) {
            console.log('Popular locations toggle elements not found');
            return;
        }
        
        // Load saved state
        const isHidden = localStorage.getItem('popularLocationsHidden') === 'true';
        this.updatePopularLocationsToggle(isHidden, toggleText, toggleIcon, contentDiv);
        
        toggleBtn.addEventListener('click', () => {
            const isCurrentlyHidden = contentDiv.classList.contains('hidden');
            const newState = !isCurrentlyHidden;
            
            // Save state to localStorage
            localStorage.setItem('popularLocationsHidden', newState.toString());
            
            // Update UI
            this.updatePopularLocationsToggle(newState, toggleText, toggleIcon, contentDiv);
            
            // Show notification
            const message = newState ? 'Đã ẩn địa điểm phổ biến' : 'Đã hiện địa điểm phổ biến';
            this.showNotification(`✅ ${message}`, 'success');
            
            console.log(`Popular locations ${newState ? 'hidden' : 'shown'}`);
        });
        
        console.log('Popular locations toggle bound successfully');
    }
    
    updatePopularLocationsToggle(isHidden, toggleText, toggleIcon, contentDiv) {
        if (isHidden) {
            contentDiv.classList.add('hidden');
            toggleText.textContent = 'Hiện';
            toggleIcon.className = 'fas fa-eye text-xs';
            toggleIcon.parentElement.className = toggleIcon.parentElement.className.replace('text-gray-600', 'text-green-600');
        } else {
            contentDiv.classList.remove('hidden');
            toggleText.textContent = 'Ẩn';
            toggleIcon.className = 'fas fa-eye-slash text-xs';
            toggleIcon.parentElement.className = toggleIcon.parentElement.className.replace('text-green-600', 'text-gray-600');
        }
    }

    bindTripDetailsClose() {
        const closeBtn = document.getElementById('closeTripDetails');
        const confirmBtn = document.getElementById('confirmTripDetails');
        const tripDetails = document.getElementById('tripDetails');
        
        // Handle close button (X)
        if (closeBtn && tripDetails) {
            closeBtn.addEventListener('click', () => {
                this.hideTripDetails();
                this.showNotification('❌ Đã hủy thông tin chuyến đi', 'info');
                console.log('Trip details cancelled');
            });
        }
        
        // Handle confirm button
        if (confirmBtn && tripDetails) {
            confirmBtn.addEventListener('click', () => {
                this.hideTripDetails();
                this.scrollToBookingSection();
                this.showNotification('✅ Đã xác nhận thông tin chuyến đi', 'success');
                console.log('Trip details confirmed and scrolled to booking');
            });
        }
        
        console.log('Trip details buttons bound successfully');
    }

    hideTripDetails() {
        const tripDetails = document.getElementById('tripDetails');
        const map = document.getElementById('map');
        
        // Remove blur from map
        if (map) {
            map.classList.remove('blurred');
        }
        
        // Hide with animation
        tripDetails.style.transform = 'scale(0.95)';
        tripDetails.style.opacity = '0';
        
        setTimeout(() => {
            tripDetails.classList.add('hidden');
        }, 200);
    }

    scrollToBookingSection() {
        // Find the customer information section (form đặt xe)
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
    
    // Test function to show trip details
    testTripDetails() {
        const tripDetails = document.getElementById('tripDetails');
        if (tripDetails) {
            tripDetails.classList.remove('hidden');
            tripDetails.style.zIndex = '9999';
            console.log('Trip details test - should be visible on top of map');
        }
    }
    
    bindTrafficTestLocations() {
        const testLocationBtns = document.querySelectorAll('.traffic-test-location');
        const testLatInput = document.getElementById('testLat');
        const testLngInput = document.getElementById('testLng');
        
        testLocationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const lat = btn.getAttribute('data-lat');
                const lng = btn.getAttribute('data-lng');
                const name = btn.getAttribute('data-name');
                
                // Update test coordinates
                if (testLatInput) testLatInput.value = lat;
                if (testLngInput) testLngInput.value = lng;
                
                // Show notification
                this.showNotification(`📍 Đã chọn ${name} để test traffic`, 'info');
                
                // Auto test if API key is available
                const trafficApiKey = document.getElementById('trafficApiKey')?.value;
                if (trafficApiKey && trafficApiKey.trim()) {
                    setTimeout(() => {
                        this.testTrafficApi();
                    }, 500);
                }
                
                console.log(`Traffic test location selected: ${name} (${lat}, ${lng})`);
            });
        });
        
        console.log('Traffic test locations bound successfully');
    }
    
    // Test API key validity
    async testApiKeyValidity(apiKey) {
        try {
            // Test with a simple request
            const testUrl = `https://api.tomtom.com/search/2/search/hanoi.json?key=${apiKey}&limit=1`;
            const response = await fetch(testUrl);
            
            if (response.ok) {
                return { valid: true, message: 'API key hợp lệ' };
            } else if (response.status === 403) {
                return { valid: false, message: 'API key không có quyền truy cập Traffic Flow API' };
            } else if (response.status === 401) {
                return { valid: false, message: 'API key không hợp lệ' };
            } else {
                return { valid: false, message: `Lỗi: ${response.status}` };
            }
        } catch (error) {
            return { valid: false, message: 'Lỗi kết nối: ' + error.message };
        }
    }
    
    async testApiKeyOnly() {
        const trafficApiKeyInput = document.getElementById('trafficApiKey');
        const testBtn = document.getElementById('testApiKey');
        const apiKey = trafficApiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showNotification('⚠️ Vui lòng nhập TomTom API key trước!', 'warning');
            return;
        }
        
        // Save original button text
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang kiểm tra...';
        testBtn.disabled = true;
        
        try {
            const keyTest = await this.testApiKeyValidity(apiKey);
            
            if (keyTest.valid) {
                this.showNotification(`✅ ${keyTest.message}`, 'success');
                console.log('API key is valid');
            } else {
                this.showNotification(`❌ ${keyTest.message}`, 'error');
                console.log('API key validation failed:', keyTest.message);
            }
        } catch (error) {
            this.showNotification(`❌ Lỗi: ${error.message}`, 'error');
            console.error('API key test failed:', error);
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    bindNewUIEvents() {
        console.log('Binding new UI events...');
        
        // Selection mode buttons
        const selectPickupBtn = document.getElementById('selectPickupBtn');
        const selectDropoffBtn = document.getElementById('selectDropoffBtn');
        
        if (selectPickupBtn) {
            selectPickupBtn.addEventListener('click', () => {
                console.log('Select pickup mode clicked');
                this.setSelectionMode('pickup');
            });
        }
        
        if (selectDropoffBtn) {
            selectDropoffBtn.addEventListener('click', () => {
                console.log('Select dropoff mode clicked');
                this.setSelectionMode('dropoff');
            });
        }
        
        // Back button
        const backToModeBtn = document.getElementById('backToModeBtn');
        if (backToModeBtn) {
            backToModeBtn.addEventListener('click', () => {
                console.log('Back to mode clicked');
                this.backToSelectionMode();
            });
        }
        
        // Get current location button
        const getCurrentLocationBtn = document.getElementById('getCurrentLocationBtn');
        if (getCurrentLocationBtn) {
            getCurrentLocationBtn.addEventListener('click', () => {
                console.log('Get current location clicked');
                this.getCurrentLocation();
            });
        }
        
        // Clear buttons
        const clearPickupBtn = document.getElementById('clearPickupBtn');
        const clearDropoffBtn = document.getElementById('clearDropoffBtn');
        
        if (clearPickupBtn) {
            clearPickupBtn.addEventListener('click', () => {
                console.log('Clear pickup clicked');
                this.clearPickupLocation();
                this.updateSelectedLocationsDisplay();
            });
        }
        
        if (clearDropoffBtn) {
            clearDropoffBtn.addEventListener('click', () => {
                console.log('Clear dropoff clicked');
                this.clearDropoffLocation();
                this.updateSelectedLocationsDisplay();
            });
        }

        // Popular location buttons
        const popularLocationBtns = document.querySelectorAll('.popular-location');
        popularLocationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const locationName = btn.getAttribute('data-location');
                const locationType = btn.getAttribute('data-type');
                
                console.log('Popular location clicked:', locationName, 'type:', locationType);
                
                // Find the location in our database
                const location = this.locations.find(loc => loc.name === locationName);
                if (location) {
                    if (locationType === 'pickup') {
                        this.selectLocation(location, 'pickup');
                    } else if (locationType === 'dropoff') {
                        this.selectLocation(location, 'dropoff');
                    } else if (locationType === 'both') {
                        // Show modal to choose pickup or dropoff
                        this.showLocationSelectionModal(location, 'both');
                    }
                } else {
                    console.error('Location not found in database:', locationName);
                }
            });
        });
        
        // Confirm route button
        const confirmRouteBtn = document.getElementById('confirmRouteBtn');
        if (confirmRouteBtn) {
            confirmRouteBtn.addEventListener('click', () => {
                console.log('Confirm route clicked');
                this.confirmRoute();
            });
        }
        
        console.log('New UI events bound successfully!');
    }

    setSelectionMode(mode) {
        console.log(`Setting selection mode to: ${mode}`);
        this.currentSelectionMode = mode;
        
        // Hide selection mode, show location search
        document.getElementById('selectionMode').classList.add('hidden');
        document.getElementById('locationSearch').classList.remove('hidden');
        
        // Update search UI based on mode
        const searchIcon = document.getElementById('searchIcon');
        const searchTitle = document.getElementById('searchTitle');
        const searchInput = document.getElementById('locationSearchInput');
        
        if (mode === 'pickup') {
            searchIcon.className = 'fas fa-map-pin text-green-600 mr-2';
            searchTitle.textContent = 'Chọn điểm đón';
            searchInput.placeholder = 'Nhập địa chỉ điểm đón hoặc chọn từ danh sách';
        } else if (mode === 'dropoff') {
            searchIcon.className = 'fas fa-flag text-red-600 mr-2';
            searchTitle.textContent = 'Chọn điểm đến';
            searchInput.placeholder = 'Nhập địa chỉ điểm đến hoặc chọn từ danh sách';
        }
        
        // Clear search input and focus
        searchInput.value = '';
        searchInput.focus();
        
        // Clear suggestions
        this.hideSuggestions();
    }

    backToSelectionMode() {
        console.log('Going back to selection mode');
        this.currentSelectionMode = null;
        
        // Hide location search, show selection mode
        document.getElementById('locationSearch').classList.add('hidden');
        document.getElementById('selectionMode').classList.remove('hidden');
        
        // Clear search input and suggestions
        const searchInput = document.getElementById('locationSearchInput');
        searchInput.value = '';
        this.hideSuggestions();
    }

    updateSelectedLocationsDisplay() {
        const selectedLocations = document.getElementById('selectedLocations');
        const selectedPickupDisplay = document.getElementById('selectedPickupDisplay');
        const selectedDropoffDisplay = document.getElementById('selectedDropoffDisplay');
        const selectedPickupName = document.getElementById('selectedPickupName');
        const selectedDropoffName = document.getElementById('selectedDropoffName');
        
        // Show/hide pickup display
        if (this.pickupLocation) {
            selectedPickupDisplay.classList.remove('hidden');
            selectedPickupName.textContent = this.pickupLocation.name;
        } else {
            selectedPickupDisplay.classList.add('hidden');
        }
        
        // Show/hide dropoff display
        if (this.dropoffLocation) {
            selectedDropoffDisplay.classList.remove('hidden');
            selectedDropoffName.textContent = this.dropoffLocation.name;
        } else {
            selectedDropoffDisplay.classList.add('hidden');
        }
        
        // Show selected locations section if at least one is selected
        if (this.pickupLocation || this.dropoffLocation) {
            selectedLocations.classList.remove('hidden');
        } else {
            selectedLocations.classList.add('hidden');
        }
    }

    async confirmRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) {
            alert('Vui lòng chọn cả điểm đón và điểm đến trước khi xác nhận!');
            return;
        }
        
        console.log('Confirming route calculation...');
        this.isRouteCalculated = true;
        
        // Show trip details with animation
        const tripDetails = document.getElementById('tripDetails');
        const map = document.getElementById('map');
        
        // Blur map behind
        if (map) {
            map.classList.add('blurred');
        }
        
        // Show trip details with animation
        tripDetails.classList.remove('hidden');
        tripDetails.style.zIndex = '9999';
        
        // Add smooth animation
        setTimeout(() => {
            tripDetails.style.transform = 'scale(1)';
            tripDetails.style.opacity = '1';
        }, 10);
        
        // Fetch real-time data (both in parallel)
        const midLat = (this.pickupLocation.lat + this.dropoffLocation.lat) / 2;
        const midLng = (this.pickupLocation.lng + this.dropoffLocation.lng) / 2;
        
        await Promise.all([
            this.fetchWeatherData(this.pickupLocation.lat, this.pickupLocation.lng),
            this.fetchTrafficData(midLat, midLng)
        ]);
        
        // Calculate and display route
        this.calculateRoute();
        
        // Display pricing breakdown
        setTimeout(() => {
            this.displayPricingBreakdown();
        }, 500);
        
        // Scroll to trip details
        document.getElementById('tripDetails').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    handleLocationInput(value, type) {
        console.log(`Handling input for ${type}:`, value);
        
        if (value.length < 2) {
            this.hideSuggestions(type);
            return;
        }

        // Tìm kiếm trong database local trước (hiển thị ngay)
        const localResults = this.searchLocations(value);
        console.log(`Found ${localResults.length} local results for "${value}"`);
        this.showSuggestions(localResults, type);
        
        // Debounce API call để tránh gọi quá nhiều
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Gọi API tìm kiếm sau 500ms không gõ
        if (value.length >= 3) {
            this.searchTimeout = setTimeout(() => {
                this.searchWithMultipleAPIs(value, type, localResults);
            }, 500);
        }
    }

    async searchWithMultipleAPIs(query, type, localResults) {
        try {
            // Gọi TomTom Search API (chính) và Nominatim (bổ sung)
            const [tomtomResults, nominatimResults] = await Promise.allSettled([
                this.searchWithTomTomAPI(query),
                this.searchWithNominatimAPI(query)
            ]);
            
            let allApiResults = [];
            
            // Xử lý kết quả TomTom (ưu tiên)
            if (tomtomResults.status === 'fulfilled') {
                allApiResults = allApiResults.concat(tomtomResults.value);
            }
            
            // Xử lý kết quả Nominatim (bổ sung)
            if (nominatimResults.status === 'fulfilled') {
                allApiResults = allApiResults.concat(nominatimResults.value);
            }
            
            console.log(`🔍 Total API results: ${allApiResults.length}`);
            
            // Kết hợp kết quả local và API
            const combinedResults = this.mergeSearchResults(localResults, allApiResults);
            console.log(`✅ Total combined results: ${combinedResults.length}`);
            
            this.showSuggestions(combinedResults, type);
            
        } catch (error) {
            console.error('Multiple API search error:', error);
            this.showSuggestions(localResults, type);
        }
    }

    async searchWithTomTomAPI(query) {
        try {
            if (!this.trafficApiKey) {
                console.log('⚠️ No TomTom API key configured');
                return [];
            }

            // Sử dụng TomTom Search API
            const searchParams = new URLSearchParams({
                key: this.trafficApiKey,
                query: query,
                limit: '15',
                countrySet: 'VN',
                language: 'vi-VN',
                idxSet: 'Geo,PAD,POI',
                typeahead: 'true',
                view: 'Unified'
            });
            
            const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?${searchParams}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'RadioCarTaxi/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`🗺️ TomTom API found ${data.results?.length || 0} results`);
                
                if (data.results && data.results.length > 0) {
                    return data.results.map(place => this.formatTomTomPlaceDetails(place));
                }
                return [];
            } else {
                console.log('⚠️ TomTom Search API failed');
                return [];
            }
        } catch (error) {
            console.error('TomTom Search API error:', error);
            return [];
        }
    }

    formatTomTomPlaceDetails(place) {
        const poi = place.poi || {};
        const address = place.address || {};
        
        // Tạo tên hiển thị
        let displayName = place.poi?.name || place.address?.freeformAddress || place.address?.streetName || 'Địa điểm';
        
        // Tạo địa chỉ đầy đủ
        const fullAddress = [
            address.houseNumber,
            address.streetName,
            address.municipality,
            address.countrySubdivision,
            address.country
        ].filter(part => part && part.trim()).join(', ');
        
        return {
            name: displayName,
            fullAddress: fullAddress,
            lat: place.position?.lat || 0,
            lng: place.position?.lon || 0,
            city: address.municipality || address.countrySubdivision || 'Việt Nam',
            district: address.municipalitySubdivision || '',
            street: address.streetName || '',
            houseNumber: address.houseNumber || '',
            category: this.guessTomTomCategory(place),
            importance: place.score || 0,
            placeType: poi.classifications?.[0]?.code || 'unknown',
            placeClass: poi.classifications?.[0]?.names?.[0] || 'unknown',
            source: 'tomtom',
            // Thông tin bổ sung từ TomTom
            phone: poi.phone || '',
            website: poi.url || '',
            openingHours: poi.openingHours?.[0]?.text || '',
            brand: poi.brand?.[0]?.name || '',
            // Thông tin đánh giá
            rating: this.calculateTomTomRating(place)
        };
    }

    guessTomTomCategory(place) {
        const poi = place.poi || {};
        const classifications = poi.classifications || [];
        
        if (classifications.length > 0) {
            const classification = classifications[0].code;
            
            if (classification.includes('HOSPITAL') || classification.includes('CLINIC')) return 'healthcare';
            if (classification.includes('SCHOOL') || classification.includes('UNIVERSITY')) return 'education';
            if (classification.includes('SHOPPING') || classification.includes('STORE')) return 'shopping';
            if (classification.includes('HOTEL') || classification.includes('LODGING')) return 'hotel';
            if (classification.includes('MUSEUM') || classification.includes('ATTRACTION')) return 'tourism';
            if (classification.includes('OFFICE') || classification.includes('BUSINESS')) return 'business';
            if (classification.includes('AIRPORT') || classification.includes('STATION')) return 'transportation';
        }
        
        return 'other';
    }

    calculateTomTomRating(place) {
        let rating = 0;
        
        // Điểm cơ bản từ score
        if (place.score) {
            rating += Math.min(place.score * 2, 5);
        }
        
        // Bonus cho địa điểm có thông tin chi tiết
        const poi = place.poi || {};
        if (poi.phone) rating += 0.5;
        if (poi.url) rating += 0.5;
        if (poi.openingHours) rating += 0.3;
        if (poi.brand) rating += 0.2;
        
        return Math.min(rating, 5);
    }

    async searchWithNominatimAPI(query) {
        try {
            // Sử dụng Nominatim API từ OpenStreetMap với nhiều tham số tìm kiếm
            const searchParams = new URLSearchParams({
                q: query,
                countrycodes: 'vn',
                format: 'json',
                limit: '15',
                addressdetails: '1',
                'accept-language': 'vi',
                extratags: '1',
                namedetails: '1',
                dedupe: '1',
                bounded: '1',
                viewbox: '102.1,8.1,109.5,23.4', // Bounding box cho Việt Nam
                'bounded': '1'
            });
            
            const url = `https://nominatim.openstreetmap.org/search?${searchParams}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'RadioCarTaxi/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`📍 Nominatim API found ${data.length} results`);
                
                // Chuyển đổi kết quả API sang format chi tiết
                return data.map(place => this.formatPlaceDetails(place));
            } else {
                console.log('⚠️ Nominatim API failed');
                return [];
            }
        } catch (error) {
            console.error('Nominatim API error:', error);
            return [];
        }
    }

    formatPlaceDetails(place) {
        const address = place.address || {};
        
        // Tạo tên hiển thị ngắn gọn
        let displayName = place.name || place.display_name;
        if (displayName.length > 80) {
            displayName = displayName.substring(0, 80) + '...';
        }
        
        // Lấy thông tin địa chỉ chi tiết
        const city = address.city || address.town || address.village || address.province || 'Việt Nam';
        const district = address.suburb || address.district || address.county || '';
        const street = address.road || address.street || '';
        const houseNumber = address.house_number || '';
        
        // Tạo địa chỉ đầy đủ
        const fullAddress = [houseNumber, street, district, city]
            .filter(part => part && part.trim())
            .join(', ');
        
        return {
            name: displayName,
            fullAddress: fullAddress,
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            city: city,
            district: district,
            street: street,
            houseNumber: houseNumber,
            category: this.guessCategory(place),
            importance: place.importance || 0,
            placeType: place.type || 'unknown',
            placeClass: place.class || 'unknown',
            source: 'nominatim',
            osmId: place.osm_id,
            osmType: place.osm_type,
            // Thông tin bổ sung từ extratags
            phone: place.extratags?.phone || '',
            website: place.extratags?.website || '',
            openingHours: place.extratags?.['opening_hours'] || '',
            wheelchair: place.extratags?.wheelchair || '',
            // Thông tin đánh giá
            rating: this.calculatePlaceRating(place)
        };
    }

    calculatePlaceRating(place) {
        let rating = 0;
        
        // Điểm cơ bản từ importance
        if (place.importance) {
            rating += Math.min(place.importance * 10, 5);
        }
        
        // Bonus cho địa điểm có thông tin chi tiết
        if (place.extratags?.phone) rating += 0.5;
        if (place.extratags?.website) rating += 0.5;
        if (place.extratags?.['opening_hours']) rating += 0.3;
        
        // Bonus cho loại địa điểm quan trọng
        const importantTypes = ['hospital', 'university', 'airport', 'railway_station', 'bus_station'];
        if (importantTypes.includes(place.type)) {
            rating += 1;
        }
        
        return Math.min(rating, 5);
    }

    createLocationDetails(result) {
        let details = [];
        
        // Thông tin cơ bản
        if (result.category && result.category !== 'other') {
            details.push(`<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${this.capitalizeFirst(result.category)}</span>`);
        }
        
        // Thông tin từ API
        if (result.source === 'tomtom') {
            if (result.phone) {
                details.push(`<span class="text-xs text-gray-600">📞 ${result.phone}</span>`);
            }
            if (result.website) {
                details.push(`<span class="text-xs text-gray-600">🌐 Website</span>`);
            }
            if (result.openingHours) {
                details.push(`<span class="text-xs text-gray-600">🕒 ${result.openingHours}</span>`);
            }
            if (result.brand) {
                details.push(`<span class="text-xs text-blue-600">🏷️ ${result.brand}</span>`);
            }
            
            // Hiển thị rating nếu có
            if (result.rating > 0) {
                const stars = '★'.repeat(Math.floor(result.rating)) + '☆'.repeat(5 - Math.floor(result.rating));
                details.push(`<span class="text-xs text-yellow-600">${stars}</span>`);
            }
        } else if (result.source === 'nominatim') {
            if (result.phone) {
                details.push(`<span class="text-xs text-gray-600">📞 ${result.phone}</span>`);
            }
            if (result.website) {
                details.push(`<span class="text-xs text-gray-600">🌐 Website</span>`);
            }
            if (result.openingHours) {
                details.push(`<span class="text-xs text-gray-600">🕒 ${result.openingHours}</span>`);
            }
            if (result.wheelchair === 'yes') {
                details.push(`<span class="text-xs text-green-600">♿ Accessible</span>`);
            }
            
            // Hiển thị rating nếu có
            if (result.rating > 0) {
                const stars = '★'.repeat(Math.floor(result.rating)) + '☆'.repeat(5 - Math.floor(result.rating));
                details.push(`<span class="text-xs text-yellow-600">${stars}</span>`);
            }
        }
        
        // Thông tin địa điểm quan trọng
        if (result.importance > 0.5) {
            details.push(`<span class="text-xs text-orange-600">⭐ Quan trọng</span>`);
        }
        
        return details.length > 0 ? `<div class="flex flex-wrap gap-1 mt-2">${details.join('')}</div>` : '';
    }

    guessCategory(place) {
        const type = place.type?.toLowerCase() || '';
        const placeClass = place.class?.toLowerCase() || '';
        
        if (type.includes('hospital') || type.includes('clinic')) return 'healthcare';
        if (type.includes('university') || type.includes('school')) return 'education';
        if (type.includes('mall') || type.includes('shop')) return 'shopping';
        if (type.includes('hotel') || type.includes('resort')) return 'hotel';
        if (type.includes('museum') || type.includes('temple')) return 'tourism';
        if (type.includes('office') || type.includes('building')) return 'business';
        if (type.includes('airport') || type.includes('station')) return 'transportation';
        
        return 'other';
    }

    mergeSearchResults(localResults, apiResults) {
        const merged = [...localResults];
        const existingNames = new Set(localResults.map(r => r.name.toLowerCase()));
        
        // Thêm kết quả API không trùng với local
        apiResults.forEach(result => {
            const nameKey = result.name.toLowerCase().substring(0, 50);
            if (!existingNames.has(nameKey)) {
                merged.push(result);
                existingNames.add(nameKey);
            }
        });
        
        // Sắp xếp theo độ liên quan và rating
        merged.sort((a, b) => {
            // Ưu tiên: Local > TomTom > Nominatim
            const sourcePriority = { 'local': 0, 'tomtom': 1, 'nominatim': 2 };
            const priorityA = sourcePriority[a.source] || 3;
            const priorityB = sourcePriority[b.source] || 3;
            
            if (priorityA !== priorityB) return priorityA - priorityB;
            
            // Sau đó sắp xếp theo rating
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (ratingA !== ratingB) return ratingB - ratingA;
            
            // Cuối cùng sắp xếp theo importance
            const importanceA = a.importance || 0;
            const importanceB = b.importance || 0;
            return importanceB - importanceA;
        });
        
        // Giới hạn tổng số kết quả
        return merged.slice(0, 15);
    }

    searchLocations(query) {
        const searchQuery = query.toLowerCase();
        return this.searchIndex
            .filter(location => location.searchText.includes(searchQuery))
            .slice(0, 10) // Limit to 10 results
            .sort((a, b) => {
                // Sort by relevance (exact match first)
                const aExact = a.name.toLowerCase().startsWith(searchQuery);
                const bExact = b.name.toLowerCase().startsWith(searchQuery);
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;
                return 0;
            });
    }

    showSuggestions(results, type) {
        const container = document.getElementById('locationSuggestions');
        if (!container) {
            console.error('Location suggestions container not found!');
            return;
        }
        container.innerHTML = '';
        console.log(`Showing ${results.length} suggestions for ${type}`);
        
        if (results.length === 0) {
            container.innerHTML = '<div class="suggestion-item">Không tìm thấy địa chỉ</div>';
            container.classList.remove('hidden');
            return;
        }

        results.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item cursor-pointer hover:bg-blue-50 transition-colors';
            
            // Get category icon
            const categoryIcons = {
                airport: '✈️',
                transport: '🚌',
                shopping: '🛍️',
                education: '🎓',
                healthcare: '🏥',
                tourism: '🎭',
                business: '🏢',
                hotel: '🏨',
                residential: '🏠',
                industrial: '🏭'
            };
            
            const icon = categoryIcons[result.category] || '📍';
            
            // Tạo thông tin chi tiết cho địa điểm
            const detailInfo = this.createLocationDetails(result);
            
            item.innerHTML = `
                <div class="flex items-center space-x-3 p-3 border-b border-gray-100">
                    <span class="text-lg">${icon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-800 truncate">${result.name}</div>
                        <div class="text-xs text-gray-500 mt-1">
                            ${result.fullAddress || `${result.district} • ${result.city || 'TP.HCM'}`}
                        </div>
                        ${detailInfo}
                    </div>
                    <div class="flex flex-col items-end space-y-1">
                        <button class="focus-location-btn text-blue-600 hover:text-blue-800 p-1" 
                                title="Xem trên bản đồ">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${result.source === 'tomtom' ? '<span class="text-xs text-blue-600">🗺️ TomTom</span>' : 
                          result.source === 'nominatim' ? '<span class="text-xs text-green-600">🌐 OSM</span>' : ''}
                    </div>
                </div>
            `;
            
            // Add click handlers
            item.addEventListener('click', (e) => {
                console.log(`Clicked on suggestion: ${result.name}`);
                if (e.target.closest('.focus-location-btn')) {
                    e.stopPropagation();
                    this.focusOnLocation(result);
                } else {
                    this.selectLocation(result, type);
                }
            });
            
            // Add hover effects với thông tin chi tiết
            item.addEventListener('mouseenter', () => {
                this.highlightLocationOnMapWithDetails(result);
            });
            
            item.addEventListener('mouseleave', () => {
                this.clearLocationHighlight();
            });
            
            container.appendChild(item);
        });

        container.classList.remove('hidden');
    }

    hideSuggestions(type = null) {
        // Hide the new location suggestions container
        const locationSuggestions = document.getElementById('locationSuggestions');
        if (locationSuggestions) {
            locationSuggestions.classList.add('hidden');
        }
        
        // Also hide old containers if they exist (for backward compatibility)
        if (type) {
            const oldContainer = document.getElementById(`${type}Suggestions`);
            if (oldContainer) {
                oldContainer.classList.add('hidden');
            }
        } else {
            const pickupSuggestions = document.getElementById('pickupSuggestions');
            const dropoffSuggestions = document.getElementById('dropoffSuggestions');
            if (pickupSuggestions) pickupSuggestions.classList.add('hidden');
            if (dropoffSuggestions) dropoffSuggestions.classList.add('hidden');
        }
    }

    // New methods for location focusing and highlighting
    focusOnLocation(location) {
        console.log('Focusing on location:', location.name);
        // Zoom and center map on the location
        this.map.setView([location.lat, location.lng], 16, {
            animate: true,
            duration: 1
        });
        
        // Create a temporary marker to show the location
        const tempMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'temp-location-marker',
                html: '<i class="fas fa-map-marker-alt text-yellow-500"></i>',
                iconSize: [30, 30]
            })
        }).addTo(this.map);

        // Show popup with location info
        tempMarker.bindPopup(`
            <div class="p-2">
                <h3 class="font-semibold text-blue-600">${location.name}</h3>
                <p class="text-sm text-gray-600">${location.district} • ${location.city || 'TP.HCM'}</p>
                <p class="text-xs text-gray-500 capitalize">${location.category}</p>
                <div class="mt-2 space-x-2">
                    <button class="select-pickup-btn text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                        Chọn làm điểm đón
                    </button>
                    <button class="select-dropoff-btn text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                        Chọn làm điểm đến
                    </button>
                </div>
            </div>
        `).openPopup();

        // Add click handlers to popup buttons
        tempMarker.on('popupopen', () => {
            const popup = tempMarker.getPopup();
            const element = popup.getElement();
            
            element.querySelector('.select-pickup-btn').addEventListener('click', () => {
                this.selectLocation(location, 'pickup');
                this.map.removeLayer(tempMarker);
            });

            element.querySelector('.select-dropoff-btn').addEventListener('click', () => {
                this.selectLocation(location, 'dropoff');
                this.map.removeLayer(tempMarker);
            });
        });

        // Remove temporary marker after 10 seconds
        setTimeout(() => {
            if (this.map.hasLayer(tempMarker)) {
                this.map.removeLayer(tempMarker);
            }
        }, 10000);
    }

    highlightLocationOnMap(location) {
        // Clear previous highlight
        this.clearLocationHighlight();
        
        // Create highlight marker
        this.highlightMarker = L.circleMarker([location.lat, location.lng], {
            radius: 15,
            fillColor: '#fbbf24',
            color: '#f59e0b',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);

        // Create pulsing animation
        this.highlightMarker.setStyle({
            className: 'pulse-marker'
        });
    }

    highlightLocationOnMapWithDetails(location) {
        if (!this.map || !location) return;
        
        // Xóa marker cũ nếu có
        this.clearLocationHighlight();
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }
        
        // Tạo marker với thông tin chi tiết
        const markerIcon = this.createDetailedMarkerIcon(location);
        this.tempMarker = L.marker([location.lat, location.lng], {
            icon: markerIcon
        }).addTo(this.map);
        
        // Tạo popup chi tiết
        const popupContent = this.createDetailedPopupContent(location);
        this.tempMarker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'detailed-popup'
        }).openPopup();
        
        // Pan to location với zoom phù hợp
        this.map.setView([location.lat, location.lng], 16);
    }

    createDetailedMarkerIcon(location) {
        // Tạo icon marker với màu sắc theo loại địa điểm
        const categoryColors = {
            healthcare: '#e53e3e',    // Đỏ
            education: '#3182ce',      // Xanh dương
            shopping: '#38a169',       // Xanh lá
            hotel: '#d69e2e',          // Vàng
            tourism: '#805ad5',        // Tím
            business: '#2d3748',       // Xám đen
            transportation: '#ed8936',  // Cam
            other: '#4a5568'           // Xám
        };
        
        const color = categoryColors[location.category] || categoryColors.other;
        const categoryIcons = {
            healthcare: '🏥',
            education: '🎓',
            shopping: '🛍️',
            hotel: '🏨',
            tourism: '🎭',
            business: '🏢',
            transportation: '🚌',
            other: '📍'
        };
        
        const icon = categoryIcons[location.category] || '📍';
        
        return L.divIcon({
            className: 'detailed-marker',
            html: `
                <div class="marker-container" style="
                    background: ${color};
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: markerPulse 2s infinite;
                ">
                    <span style="font-size: 18px;">${icon}</span>
                </div>
                <style>
                    @keyframes markerPulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                </style>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    createDetailedPopupContent(location) {
        const details = [];
        
        // Thông tin cơ bản
        details.push(`
            <div class="popup-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #2d3748;">${location.name}</h3>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #718096;">${location.fullAddress || `${location.district} • ${location.city}`}</p>
            </div>
        `);
        
        // Thông tin chi tiết
        if (location.source === 'tomtom') {
            if (location.phone) {
                details.push(`<div style="margin: 4px 0;"><strong>📞:</strong> ${location.phone}</div>`);
            }
            if (location.website) {
                details.push(`<div style="margin: 4px 0;"><strong>🌐:</strong> <a href="${location.website}" target="_blank" style="color: #3182ce;">Website</a></div>`);
            }
            if (location.openingHours) {
                details.push(`<div style="margin: 4px 0;"><strong>🕒:</strong> ${location.openingHours}</div>`);
            }
            if (location.brand) {
                details.push(`<div style="margin: 4px 0;"><strong>🏷️:</strong> ${location.brand}</div>`);
            }
        } else if (location.source === 'nominatim') {
            if (location.phone) {
                details.push(`<div style="margin: 4px 0;"><strong>📞:</strong> ${location.phone}</div>`);
            }
            if (location.website) {
                details.push(`<div style="margin: 4px 0;"><strong>🌐:</strong> <a href="${location.website}" target="_blank" style="color: #3182ce;">Website</a></div>`);
            }
            if (location.openingHours) {
                details.push(`<div style="margin: 4px 0;"><strong>🕒:</strong> ${location.openingHours}</div>`);
            }
            if (location.wheelchair === 'yes') {
                details.push(`<div style="margin: 4px 0;"><strong>♿:</strong> Accessible</div>`);
            }
        }
        
        // Rating và importance
        if (location.rating > 0) {
            const stars = '★'.repeat(Math.floor(location.rating)) + '☆'.repeat(5 - Math.floor(location.rating));
            details.push(`<div style="margin: 4px 0;"><strong>⭐:</strong> ${stars} (${location.rating.toFixed(1)})</div>`);
        }
        
        if (location.importance > 0.5) {
            details.push(`<div style="margin: 4px 0;"><strong>⭐:</strong> Địa điểm quan trọng</div>`);
        }
        
        // Nguồn dữ liệu
        const sourceText = location.source === 'tomtom' ? '🗺️ TomTom' : 
                          location.source === 'nominatim' ? '🌐 OpenStreetMap' : '📱 Local';
        details.push(`<div style="margin: 4px 0; font-size: 11px; color: #718096;"><strong>Nguồn:</strong> ${sourceText}</div>`);
        
        // Nút hành động
        details.push(`
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button onclick="window.selectLocationFromPopup('${location.lat}', '${location.lng}', '${location.name}')" 
                        style="background: #3182ce; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                    Chọn địa điểm
                </button>
                <button onclick="window.viewOnMap('${location.lat}', '${location.lng}')" 
                        style="background: #38a169; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                    Xem chi tiết
                </button>
            </div>
        `);
        
        return details.join('');
    }

    clearLocationHighlight() {
        if (this.highlightMarker) {
            this.map.removeLayer(this.highlightMarker);
            this.highlightMarker = null;
        }
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    }

    clearAllMarkers() {
        // Clear all location markers
        this.map.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker && layer !== this.pickupMarker && layer !== this.dropoffMarker) {
                this.map.removeLayer(layer);
            }
        });
        
        // Clear route if exists
        if (this.route) {
            this.map.removeLayer(this.route);
            this.route = null;
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Save state to localStorage with debouncing
    saveState() {
        // State saving disabled - app will start fresh each time
        console.log('ℹ️ State saving disabled - App will start fresh on next load');
        return;
    }
    
    // Actual save operation
    doSaveState() {
        const state = {
            pickupLocation: this.pickupLocation,
            dropoffLocation: this.dropoffLocation,
            pickupInput: document.getElementById('pickupLocation')?.value || '',
            dropoffInput: document.getElementById('dropoffLocation')?.value || '',
            currentCity: this.currentCity,
            timestamp: Date.now() // For reference only - NO auto-expiration
        };
        
        try {
            localStorage.setItem('taxiAppState', JSON.stringify(state));
            console.log('💾 State saved to localStorage - Locations will persist indefinitely');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    // Restore state from localStorage
    clearOldState() {
        // Clear old state on page load to start fresh
        try {
            localStorage.removeItem('taxiAppState');
            console.log('🗑️ Old state cleared - Starting fresh');
            
            // Clear all UI elements
            const pickupInput = document.getElementById('pickupLocation');
            const dropoffInput = document.getElementById('dropoffLocation');
            
            if (pickupInput) {
                pickupInput.value = '';
            }
            
            if (dropoffInput) {
                dropoffInput.value = '';
            }
            
            // Reset all internal state
            this.pickupLocation = null;
            this.dropoffLocation = null;
            this.currentSelectionMode = null;
            this.isRouteCalculated = false;
            
            // Hide trip details
            const tripDetails = document.getElementById('tripDetails');
            if (tripDetails) {
                tripDetails.classList.add('hidden');
            }
            
            console.log('✅ Application started with fresh state');
        } catch (error) {
            console.error('Failed to clear old state:', error);
        }
    }

    // Clear saved state
    clearSavedState() {
        try {
            localStorage.removeItem('taxiAppState');
            console.log('Saved state cleared');
        } catch (error) {
            console.error('Failed to clear saved state:', error);
        }
    }
    
    // Cleanup method
    destroy() {
        // Clear any pending timeouts
        if (this.saveStateTimeout) {
            clearTimeout(this.saveStateTimeout);
            this.saveStateTimeout = null;
        }
        
        // Clear global instance
        if (window.taxiAppInstance === this) {
            window.taxiAppInstance = null;
            window.taxiAppInitialized = false;
        }
        
        console.log('App instance destroyed');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notification if any
        const existingNotification = document.getElementById('appNotification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'appNotification';
        notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        // Set color based on type
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-sm">${message}</span>
                <button class="text-white hover:text-gray-200 ml-2" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 3000);
    }

    filterByCity(city) {
        console.log(`Filtering by city: ${city}`);
        
        // Update current city
        this.currentCity = city;
        
        // Clear existing markers
        this.clearAllMarkers();
        
        if (city === 'all') {
            // Show all locations
            this.addLocationMarkers();
            // Center map on Vietnam
            this.map.setView([16.0, 108.0], 6);
        } else {
            // Filter locations by city
            const cityLocations = this.locations.filter(loc => loc.city === city);
            console.log(`Found ${cityLocations.length} locations in ${city}`);
            
            if (cityLocations.length === 0) {
                alert(`Không tìm thấy địa điểm nào trong thành phố ${city}`);
                return;
            }
            
            // Show only city locations
            this.addLocationMarkers(cityLocations);
            
            // Center map on the city
            if (city === 'Hà Nội') {
                this.map.setView([21.0285, 105.8542], 12);
            } else if (city === 'TP.HCM') {
                this.map.setView([10.8231, 106.6297], 12);
            }
        }
        
        // Save state after city change
        this.saveState();
    }

    showCategoryLocations(category) {
        const categoryLocations = this.locations.filter(loc => loc.category === category);

        if (categoryLocations.length === 0) {
            alert('Không tìm thấy địa điểm nào trong danh mục này');
            return;
        }

        // Create a modal or overlay to show category locations
        this.showLocationModal(categoryLocations, category);
    }

    showLocationModal(locations, category) {
        // Remove existing modal if any
        const existingModal = document.getElementById('locationModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'locationModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
                <div class="p-4 border-b bg-blue-50">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-map-marker-alt text-blue-600 mr-2"></i>
                            ${this.getCategoryName(category)} (${locations.length} địa điểm)
                        </h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700 text-xl">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="p-4 max-h-80 overflow-y-auto">
                    <div class="grid gap-2">
                        ${locations.map(location => `
                            <div class="location-item p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors" 
                                 data-location='${JSON.stringify(location)}'>
                                <div class="flex items-center space-x-3">
                                    <span class="text-lg">${this.getCategoryIcon(location.category)}</span>
                                    <div class="flex-1">
                                        <div class="font-medium text-gray-800">${location.name}</div>
                                        <div class="text-sm text-gray-500">${location.district} • ${location.city || 'TP.HCM'}</div>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button class="select-as-pickup text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" 
                                                data-location='${JSON.stringify(location)}'>
                                            Điểm đón
                                        </button>
                                        <button class="select-as-dropoff text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" 
                                                data-location='${JSON.stringify(location)}'>
                                            Điểm đến
                                        </button>
                                        <button class="view-on-map text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" 
                                                data-location='${JSON.stringify(location)}'>
                                            Xem bản đồ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add click handlers for location items
        modal.querySelectorAll('.location-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const location = JSON.parse(item.getAttribute('data-location'));
                this.highlightLocationOnMap(location);
            });

            item.addEventListener('mouseleave', () => {
                this.clearLocationHighlight();
            });
        });

        // Add click handlers for action buttons
        modal.querySelectorAll('.select-as-pickup').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const location = JSON.parse(button.getAttribute('data-location'));
                this.selectLocation(location, 'pickup');
                modal.remove();
            });
        });

        modal.querySelectorAll('.select-as-dropoff').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const location = JSON.parse(button.getAttribute('data-location'));
                this.selectLocation(location, 'dropoff');
                modal.remove();
            });
        });

        modal.querySelectorAll('.view-on-map').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const location = JSON.parse(button.getAttribute('data-location'));
                this.focusOnLocation(location);
                modal.remove();
            });
        });
    }

    getCategoryName(category) {
        const categoryNames = {
            airport: 'Sân bay & Giao thông',
            transport: 'Giao thông công cộng',
            shopping: 'Trung tâm mua sắm',
            education: 'Trường học & Đại học',
            healthcare: 'Bệnh viện & Y tế',
            tourism: 'Địa điểm du lịch',
            business: 'Tòa nhà văn phòng',
            hotel: 'Khách sạn',
            residential: 'Khu dân cư',
            industrial: 'Khu công nghiệp'
        };
        return categoryNames[category] || category;
    }

    getCategoryIcon(category) {
        const categoryIcons = {
            airport: '✈️',
            transport: '🚌',
            shopping: '🛍️',
            education: '🎓',
            healthcare: '🏥',
            tourism: '🎭',
            business: '🏢',
            hotel: '🏨',
            residential: '🏠',
            industrial: '🏭'
        };
        return categoryIcons[category] || '📍';
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('Trình duyệt không hỗ trợ định vị GPS');
            return;
        }

        const button = document.getElementById('getCurrentLocationBtn');
        if (button) {
            button.innerHTML = '<div class="loading"></div>';
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Find nearest predefined location
                const nearestLocation = this.findNearestLocation(lat, lng);
                const distance = this.calculateDistance(lat, lng, nearestLocation.lat, nearestLocation.lng);

                let selectedLocation;
                if (distance < 0.5) { // Within 500m
                    selectedLocation = nearestLocation;
                } else {
                    this.reverseGeocode(lat, lng, (address) => {
                        selectedLocation = {
                            name: address,
                            lat: lat,
                            lng: lng,
                            category: 'custom',
                            district: 'Vị trí hiện tại'
                        };
                        
                        // Select the location based on current mode
                        this.selectLocation(selectedLocation, this.currentSelectionMode);
                        
                        // Reset button
                        if (button) {
                            button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                        }
                    });
                    return;
                }
                
                // Select the location based on current mode
                this.selectLocation(selectedLocation, this.currentSelectionMode);
                
                // Reset button
                if (button) {
                    button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                }
            },
            (error) => {
                alert('Không thể lấy vị trí hiện tại: ' + error.message);
                if (button) {
                    button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                }
            }
        );
    }

    handleBooking() {
        if (!this.validateForm()) {
            return;
        }

        const button = document.getElementById('bookTaxi');
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading mr-2"></div>Đang xử lý...';
        button.disabled = true;

        setTimeout(() => {
            this.processBooking();
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        if (!this.pickupLocation) {
            errors.push('Vui lòng chọn điểm đón');
            document.getElementById('pickupLocation').classList.add('form-error');
            isValid = false;
        } else {
            document.getElementById('pickupLocation').classList.remove('form-error');
        }

        if (!this.dropoffLocation) {
            errors.push('Vui lòng chọn điểm đến');
            document.getElementById('dropoffLocation').classList.add('form-error');
            isValid = false;
        } else {
            document.getElementById('dropoffLocation').classList.remove('form-error');
        }

        const customerName = document.getElementById('customerName').value.trim();
        if (!customerName) {
            errors.push('Vui lòng nhập họ và tên');
            document.getElementById('customerName').classList.add('form-error');
            isValid = false;
        } else {
            document.getElementById('customerName').classList.remove('form-error');
        }

        const customerPhone = document.getElementById('customerPhone').value.trim();
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!customerPhone) {
            errors.push('Vui lòng nhập số điện thoại');
            document.getElementById('customerPhone').classList.add('form-error');
            isValid = false;
        } else if (!phoneRegex.test(customerPhone)) {
            errors.push('Số điện thoại không hợp lệ');
            document.getElementById('customerPhone').classList.add('form-error');
            isValid = false;
        } else {
            document.getElementById('customerPhone').classList.remove('form-error');
        }

        if (!isValid) {
            alert('Vui lòng kiểm tra lại thông tin:\n' + errors.join('\n'));
        }

        return isValid;
    }

    processBooking() {
        const bookingId = 'RC' + Date.now().toString().slice(-6);
        
        const bookingData = {
            id: bookingId,
            pickup: this.pickupLocation,
            dropoff: this.dropoffLocation,
            customer: {
                name: document.getElementById('customerName').value.trim(),
                phone: document.getElementById('customerPhone').value.trim()
            },
            notes: document.getElementById('notes').value.trim(),
            distance: document.getElementById('distance').textContent,
            duration: document.getElementById('duration').textContent,
            price: document.getElementById('estimatedPrice').textContent,
            timestamp: new Date().toLocaleString('vi-VN')
        };

        this.showBookingStatus('success', bookingData);
    }

    showBookingStatus(status, bookingData) {
        const statusContainer = document.getElementById('bookingStatus');
        const iconContainer = document.getElementById('statusIcon');
        const titleContainer = document.getElementById('statusTitle');
        const messageContainer = document.getElementById('statusMessage');
        const detailsContainer = document.getElementById('bookingDetails');

        document.querySelector('.bg-white.rounded-lg.shadow-xl').style.display = 'none';

        if (status === 'success') {
            iconContainer.innerHTML = '<i class="fas fa-check-circle text-green-600"></i>';
            titleContainer.textContent = 'Đặt xe thành công!';
            messageContainer.textContent = 'Chúng tôi đã nhận được yêu cầu đặt xe của bạn. Tài xế sẽ liên hệ trong vài phút tới.';
            
            detailsContainer.innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="font-semibold">Mã đặt xe:</span>
                        <span class="text-blue-600 font-bold">${bookingData.id}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Điểm đón:</span>
                        <span>${bookingData.pickup.name}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Điểm đến:</span>
                        <span>${bookingData.dropoff.name}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Khoảng cách:</span>
                        <span>${bookingData.distance}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Thời gian dự kiến:</span>
                        <span>${bookingData.duration}</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="font-semibold">Ước tính giá:</span>
                        <span class="text-lg font-bold text-green-600">${bookingData.price}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Thời gian đặt:</span>
                        <span>${bookingData.timestamp}</span>
                    </div>
                </div>
            `;
            detailsContainer.classList.remove('hidden');
        }

        statusContainer.classList.remove('hidden');
        statusContainer.classList.add('fade-in');
    }

    resetBooking() {
        console.log('🔄 Resetting booking - Keeping pickup/dropoff locations');
        
        // Reset customer information ONLY
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('notes').value = '';

        // ⚠️ IMPORTANT: DO NOT reset locations - Keep them for easy re-booking
        // this.pickupLocation = null;  // COMMENTED OUT
        // this.dropoffLocation = null; // COMMENTED OUT
        
        // Keep selection mode and route state
        // this.currentSelectionMode = null; // COMMENTED OUT
        // this.isRouteCalculated = false;   // COMMENTED OUT

        // ⚠️ IMPORTANT: DO NOT clear markers - Keep them visible
        // Markers and route stay on map for reference
        // Users can manually clear them if needed using the X buttons

        // Reset booking status UI
        document.getElementById('bookingStatus').classList.add('hidden');
        document.getElementById('bookingDetails').classList.add('hidden');
        
        // Show main booking form again
        document.querySelector('.bg-white.rounded-lg.shadow-xl').style.display = 'block';

        // Scroll back to top of form
        document.querySelector('.bg-white.rounded-lg.shadow-xl').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Show notification
        this.showNotification('✅ Sẵn sàng đặt xe mới! Điểm đón/đến được giữ nguyên.', 'success');
        
        console.log('✅ Booking reset complete - Locations preserved for easy re-booking');
    }
}

// Initialize the application when DOM is loaded

// Global functions for popup buttons
window.selectLocationFromPopup = (lat, lng, name) => {
    if (window.taxiAppInstance) {
        console.log('Selecting location from popup:', { lat, lng, name });
        
        // Tạo object location
        const location = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            name: name,
            city: 'Việt Nam',
            district: '',
            category: 'other'
        };
        
        // Xác định mode hiện tại
        const currentMode = window.taxiAppInstance.currentSelectionMode || 'pickup';
        
        if (currentMode === 'pickup') {
            window.taxiAppInstance.setPickupLocation(location);
            document.getElementById('pickupLocation').value = name;
        } else {
            window.taxiAppInstance.setDropoffLocation(location);
            document.getElementById('dropoffLocation').value = name;
        }
        
        // Ẩn suggestions
        window.taxiAppInstance.hideSuggestions();
        
        // Tính toán route nếu có cả pickup và dropoff
        if (window.taxiAppInstance.pickupLocation && window.taxiAppInstance.dropoffLocation) {
            window.taxiAppInstance.calculateRoute();
        }
        
        // Đóng popup
        if (window.taxiAppInstance.tempMarker) {
            window.taxiAppInstance.tempMarker.closePopup();
        }
    }
};

window.viewOnMap = (lat, lng) => {
    if (window.taxiAppInstance) {
        console.log('Viewing location on map:', { lat, lng });
        
        // Zoom vào địa điểm
        window.taxiAppInstance.map.setView([parseFloat(lat), parseFloat(lng)], 18);
        
        // Đóng popup
        if (window.taxiAppInstance.tempMarker) {
            window.taxiAppInstance.tempMarker.closePopup();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Prevent multiple initializations
    if (!window.taxiAppInitialized) {
        console.log('Initializing Taxi Booking App...');
        window.taxiAppInitialized = true;
        window.taxiAppInstance = new FreeTaxiBookingApp();
    } else {
        console.log('App already initialized, skipping...');
    }
});
