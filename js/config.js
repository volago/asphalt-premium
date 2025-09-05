/* ==========================================
   CONFIG - Asphalt Premium
   ========================================== */

const CONFIG = {
    // OverpassAPI Configuration
    OVERPASS_API_URLS: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
    ],
    
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
        },
        unknown: {
            color: '#2563eb',
            weight: 2,
            opacity: 0.6,
            dashArray: null
        }
    },
    
    // Polish Voivodeships with proper naming and administrative names
    VOIVODESHIPS: {
        'opolskie': {
            name: 'Opolskie (małe - szybkie ⚡)',
            adminName: 'opolskie',
            bbox: [16.8650, 50.2959, 18.8654, 51.1635], // kept for fallback and zoom purposes
            size: 'small'
        },
        'lubuskie': {
            name: 'Lubuskie (małe - szybkie ⚡)',
            adminName: 'lubuskie',
            bbox: [14.1225, 51.2568, 16.2444, 52.9739],
            size: 'small'
        },
        'swietokrzyskie': {
            name: 'Świętokrzyskie (małe - szybkie ⚡)',
            adminName: 'świętokrzyskie',
            bbox: [19.6653, 50.0527, 21.4791, 51.2694],
            size: 'small'
        },
        'slaskie': {
            name: 'Śląskie (średnie)',
            adminName: 'śląskie',
            bbox: [18.4417, 49.8094, 19.9372, 50.8277],
            size: 'medium'
        },
        'kujawsko-pomorskie': {
            name: 'Kujawsko-pomorskie (średnie)',
            adminName: 'kujawsko-pomorskie',
            bbox: [17.0282, 52.1849, 19.6703, 53.5504],
            size: 'medium'
        },
        'lodzkie': {
            name: 'Łódzkie (średnie)',
            adminName: 'łódzkie',
            bbox: [18.2182, 51.0154, 20.6367, 52.5838],
            size: 'medium'
        },
        'pomorskie': {
            name: 'Pomorskie (średnie)',
            adminName: 'pomorskie',
            bbox: [16.9367, 53.4782, 19.3288, 54.8391],
            size: 'medium'
        },
        'dolnoslaskie': {
            name: 'Dolnośląskie (duże - może być powolne ⏳)',
            adminName: 'dolnośląskie',
            bbox: [14.6197, 49.9892, 17.8984, 51.8337],
            size: 'large'
        },
        'lubelskie': {
            name: 'Lubelskie (duże - może być powolne ⏳)',
            adminName: 'lubelskie',
            bbox: [21.6926, 50.2397, 24.1459, 51.6168],
            size: 'large'
        },
        'malopolskie': {
            name: 'Małopolskie (duże - może być powolne ⏳)',
            adminName: 'małopolskie',
            bbox: [19.1044, 49.1441, 21.2697, 50.7837],
            size: 'large'
        },
        'podkarpackie': {
            name: 'Podkarpackie (duże - może być powolne ⏳)',
            adminName: 'podkarpackie',
            bbox: [21.0371, 49.0273, 23.0311, 50.6841],
            size: 'large'
        },
        'podlaskie': {
            name: 'Podlaskie (duże - może być powolne ⏳)',
            adminName: 'podlaskie',
            bbox: [22.1170, 52.8071, 24.1508, 54.3634],
            size: 'large'
        },
        'warminsko-mazurskie': {
            name: 'Warmińsko-mazurskie (duże - może być powolne ⏳)',
            adminName: 'warmińsko-mazurskie',
            bbox: [19.3288, 53.3274, 23.0260, 54.5186],
            size: 'large'
        },
        'wielkopolskie': {
            name: 'Wielkopolskie (bardzo duże - powolne ⏳)',
            adminName: 'wielkopolskie',
            bbox: [14.6197, 51.4000, 18.9365, 53.3274],
            size: 'xlarge'
        },
        'zachodniopomorskie': {
            name: 'Zachodniopomorskie (bardzo duże - powolne ⏳)',
            adminName: 'zachodniopomorskie',
            bbox: [14.1225, 53.1580, 16.9367, 54.8391],
            size: 'xlarge'
        },
        'mazowieckie': {
            name: 'Mazowieckie (największe - bardzo powolne ⏳⏳)',
            adminName: 'mazowieckie',
            bbox: [19.3152, 51.7294, 23.1826, 53.4839],
            size: 'xxlarge'
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
