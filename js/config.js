/* ==========================================
   CONFIG - Asphalt Premium
   ========================================== */

const CONFIG = {
    // OverpassAPI Configuration
    OVERPASS_API_URL: 'https://overpass-api.de/api/interpreter',
    
    // Cache Configuration
    CACHE_DURATION_DAYS: 3,
    CACHE_KEY_PREFIX: 'asphalt_premium_',
    
    // Map Configuration
    MAP: {
        DEFAULT_CENTER: [52.0693, 19.4803], // Poland center
        DEFAULT_ZOOM: 7,
        MIN_ZOOM: 6,
        MAX_ZOOM: 18,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    
    // Road Quality Styles
    ROAD_STYLES: {
        excellent: {
            color: '#000000',
            weight: 3,
            opacity: 0.8,
            dashArray: null
        },
        good: {
            color: '#000000',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5'
        },
        poor: {
            color: '#dc2626',
            weight: 3,
            opacity: 0.8,
            dashArray: null
        }
    },
    
    // Polish Voivodeships with proper naming and bounds
    VOIVODESHIPS: {
        'dolnoslaskie': {
            name: 'Dolnośląskie',
            bbox: [14.6197, 49.9892, 17.8984, 51.8337]
        },
        'kujawsko-pomorskie': {
            name: 'Kujawsko-pomorskie',
            bbox: [17.0282, 52.1849, 19.6703, 53.5504]
        },
        'lubelskie': {
            name: 'Lubelskie',
            bbox: [21.6926, 50.2397, 24.1459, 51.6168]
        },
        'lubuskie': {
            name: 'Lubuskie',
            bbox: [14.1225, 51.2568, 16.2444, 52.9739]
        },
        'lodzkie': {
            name: 'Łódzkie',
            bbox: [18.2182, 51.0154, 20.6367, 52.5838]
        },
        'malopolskie': {
            name: 'Małopolskie',
            bbox: [19.1044, 49.1441, 21.2697, 50.7837]
        },
        'mazowieckie': {
            name: 'Mazowieckie',
            bbox: [19.3152, 51.7294, 23.1826, 53.4839]
        },
        'opolskie': {
            name: 'Opolskie',
            bbox: [16.8650, 50.2959, 18.8654, 51.1635]
        },
        'podkarpackie': {
            name: 'Podkarpackie',
            bbox: [21.0371, 49.0273, 23.0311, 50.6841]
        },
        'podlaskie': {
            name: 'Podlaskie',
            bbox: [22.1170, 52.8071, 24.1508, 54.3634]
        },
        'pomorskie': {
            name: 'Pomorskie',
            bbox: [16.9367, 53.4782, 19.3288, 54.8391]
        },
        'slaskie': {
            name: 'Śląskie',
            bbox: [18.4417, 49.8094, 19.9372, 50.8277]
        },
        'swietokrzyskie': {
            name: 'Świętokrzyskie',
            bbox: [19.6653, 50.0527, 21.4791, 51.2694]
        },
        'warminsko-mazurskie': {
            name: 'Warmińsko-mazurskie',
            bbox: [19.3288, 53.3274, 23.0260, 54.5186]
        },
        'wielkopolskie': {
            name: 'Wielkopolskie',
            bbox: [14.6197, 51.4000, 18.9365, 53.3274]
        },
        'zachodniopomorskie': {
            name: 'Zachodniopomorskie',
            bbox: [14.1225, 53.1580, 16.9367, 54.8391]
        }
    },
    
    // Road quality mapping
    SMOOTHNESS_MAPPING: {
        'excellent': 'excellent',
        'good': 'good',
        'intermediate': 'poor',
        'bad': 'poor',
        'very_bad': 'poor',
        'horrible': 'poor',
        'very_horrible': 'poor',
        'impassable': 'poor'
    },
    
    // UI Messages
    MESSAGES: {
        LOADING: 'Ładowanie danych...',
        CACHE_LOADED: 'Dane załadowane z cache',
        DATA_FETCHED: 'Dane pobrane z OverpassAPI',
        ERROR_FETCH: 'Błąd podczas pobierania danych',
        ERROR_PARSE: 'Błąd podczas przetwarzania danych',
        NO_VOIVODESHIP: 'Wybierz województwo',
        NO_DATA: 'Brak danych dla wybranego województwa'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
