// Taxi Booking App - Free Version with OpenStreetMap
// Uses free services and predefined location database

class FreeTaxiBookingApp {
    constructor() {
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
        
        // Initialize the application
        this.init();
    }

    init() {
        console.log('Initializing Taxi Booking App...');
        this.setupLocationDatabase();
        this.initializeMap();
        this.bindEvents();
        this.restoreState(); // Restore saved state
        console.log('App initialized successfully!');
    }

    initializeMap() {
        // Initialize OpenStreetMap centered on Ho Chi Minh City
        this.map = L.map('map').setView([10.8231, 106.6297], 13);

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

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'locationSelectionModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <div class="text-center mb-6">
                        <div class="text-4xl mb-3">📍</div>
                        <h3 class="text-xl font-semibold text-gray-800 mb-2">Chọn loại địa điểm</h3>
                        <p class="text-sm text-gray-600">Bạn muốn đặt "${location.name}" làm gì?</p>
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
        
        // Add traffic factor (city center is more expensive)
        let trafficFactor = 1.0;
        if (this.pickupLocation && this.dropoffLocation) {
            const isCityCenter = this.isCityCenter(this.pickupLocation) || this.isCityCenter(this.dropoffLocation);
            if (isCityCenter) trafficFactor = 1.2;
        }
        
        return Math.round((basePrice + (distance * pricePerKm)) * trafficFactor);
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
                console.log('Book taxi clicked');
                this.handleBooking();
            });
            console.log('Book taxi button event bound');
        } else {
            console.error('Book taxi button not found!');
        }

        // New booking button
        const newBookingBtn = document.getElementById('newBooking');
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => {
                console.log('New booking clicked');
                this.resetBooking();
            });
            console.log('New booking button event bound');
        } else {
            console.error('New booking button not found!');
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
        
        console.log('All events bound successfully!');
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

    confirmRoute() {
        if (!this.pickupLocation || !this.dropoffLocation) {
            alert('Vui lòng chọn cả điểm đón và điểm đến trước khi xác nhận!');
            return;
        }
        
        console.log('Confirming route calculation...');
        this.isRouteCalculated = true;
        
        // Show trip details
        document.getElementById('tripDetails').classList.remove('hidden');
        
        // Calculate and display route
        this.calculateRoute();
        
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

        const results = this.searchLocations(value);
        console.log(`Found ${results.length} results for "${value}"`);
        this.showSuggestions(results, type);
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
            
            item.innerHTML = `
                <div class="flex items-center space-x-3 p-2">
                    <span class="text-lg">${icon}</span>
                    <div class="flex-1">
                        <div class="font-medium text-gray-800">${result.name}</div>
                        <div class="text-xs text-gray-500">${result.district} • ${result.city || 'TP.HCM'} • ${this.capitalizeFirst(result.category)}</div>
                    </div>
                    <button class="focus-location-btn text-blue-600 hover:text-blue-800 p-1" 
                            title="Xem trên bản đồ">
                        <i class="fas fa-eye"></i>
                    </button>
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
            
            // Add hover effects
            item.addEventListener('mouseenter', () => {
                this.highlightLocationOnMap(result);
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

    clearLocationHighlight() {
        if (this.highlightMarker) {
            this.map.removeLayer(this.highlightMarker);
            this.highlightMarker = null;
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

    // Save state to localStorage
    saveState() {
        const state = {
            pickupLocation: this.pickupLocation,
            dropoffLocation: this.dropoffLocation,
            pickupInput: document.getElementById('pickupLocation')?.value || '',
            dropoffInput: document.getElementById('dropoffLocation')?.value || '',
            currentCity: this.currentCity,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('taxiAppState', JSON.stringify(state));
            console.log('State saved to localStorage');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    // Restore state from localStorage
    restoreState() {
        try {
            const savedState = localStorage.getItem('taxiAppState');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('Restoring state from localStorage:', state);
                
                // Restore input values
                const pickupInput = document.getElementById('pickupLocation');
                const dropoffInput = document.getElementById('dropoffLocation');
                
                if (pickupInput && state.pickupInput) {
                    pickupInput.value = state.pickupInput;
                }
                
                if (dropoffInput && state.dropoffInput) {
                    dropoffInput.value = state.dropoffInput;
                }
                
                // Restore city selection
                if (state.currentCity && state.currentCity !== 'all') {
                    this.filterByCity(state.currentCity);
                }
                
                // Restore locations if they exist
                if (state.pickupLocation) {
                    this.setPickupLocation(state.pickupLocation);
                }
                
                if (state.dropoffLocation) {
                    this.setDropoffLocation(state.dropoffLocation);
                }
                
                // Calculate route if both locations exist
                if (state.pickupLocation && state.dropoffLocation) {
                    this.calculateRoute();
                }
                
                // Show restoration notification
                this.showNotification('Đã khôi phục dữ liệu từ lần sử dụng trước!', 'success');
                console.log('State restored successfully');
            }
        } catch (error) {
            console.error('Failed to restore state:', error);
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
        // Reset customer information
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('notes').value = '';

        // Reset locations
        this.pickupLocation = null;
        this.dropoffLocation = null;
        this.currentSelectionMode = null;
        this.isRouteCalculated = false;

        // Clear markers and route
        if (this.pickupMarker) {
            this.map.removeLayer(this.pickupMarker);
            this.pickupMarker = null;
        }
        if (this.dropoffMarker) {
            this.map.removeLayer(this.dropoffMarker);
            this.dropoffMarker = null;
        }
        if (this.route) {
            this.map.removeLayer(this.route);
            this.route = null;
        }

        // Reset UI to initial state
        document.getElementById('selectionMode').classList.remove('hidden');
        document.getElementById('locationSearch').classList.add('hidden');
        document.getElementById('selectedLocations').classList.add('hidden');
        document.getElementById('tripDetails').classList.add('hidden');

        // Reset trip details
        document.getElementById('distance').textContent = '-- km';
        document.getElementById('duration').textContent = '-- phút';
        document.getElementById('estimatedPrice').textContent = '-- VNĐ';
        
        // Hide route type indicator
        const routeTypeElement = document.getElementById('routeType');
        if (routeTypeElement) {
            routeTypeElement.classList.add('hidden');
        }

        // Reset booking status
        document.getElementById('bookingStatus').classList.add('hidden');
        document.getElementById('bookingDetails').classList.add('hidden');
        
        // Save state after reset
        this.saveState();

        document.querySelector('.bg-white.rounded-lg.shadow-xl').style.display = 'block';

        this.map.setView([10.8231, 106.6297], 13);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FreeTaxiBookingApp();
});
