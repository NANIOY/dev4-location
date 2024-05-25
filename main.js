const map = L.map('map').setView([51.505, -0.09], 13);

// add OpenStreetMap tile layer to map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let treasures = [];
let score = 0;
let currentLocationMarker = null;
let treasureMarkers = [];

// define custom icons for user and treasure markers
const userIcon = L.divIcon({
    className: 'userIcon',
    html: '<div class="pin"></div><div class="pulse"></div>',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42]
});

const treasureIcon = L.divIcon({
    className: 'treasureIcon',
    html: '<div class="treasure"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// fetch street coordinates near user's location using overpass API
async function fetchStreetCoordinates(lat, lng) {
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];way(around:500,${lat},${lng})["highway"];(._;>;);out body;`;
    const response = await fetch(overpassUrl);
    const data = await response.json();

    const coordinates = [];
    data.elements.forEach(element => {
        if (element.type === 'node') {
            coordinates.push([element.lat, element.lon]);
        }
    });

    return coordinates;
}

// create a treasure at a random street location near the user
async function createTreasure(userLat, userLng) {
    const streetCoords = await fetchStreetCoordinates(userLat, userLng); // fetch street coordinates
    if (streetCoords.length > 0) {
        const randomIndex = Math.floor(Math.random() * streetCoords.length); // select random street coordinate
        const [treasureLat, treasureLng] = streetCoords[randomIndex];
        const treasure = { lat: treasureLat, lng: treasureLng, found: false };
        treasures.push(treasure);
        const marker = L.marker([treasure.lat, treasure.lng], { icon: treasureIcon }).addTo(map)
            .bindPopup('a hidden treasure is nearby!');
        treasureMarkers.push(marker);
    } else {
        console.error("no street coordinates found. unable to place treasure.");
    }
}

// create initial set of treasures near user
async function createInitialTreasures(userLat, userLng) {
    for (let i = 0; i < 5; i++) {
        await createTreasure(userLat, userLng);
    }
}

// calculate distance between two geographic points
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d;
}

// initialize map and treasures
async function initializeMapAndTreasures(lat, lng) {
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
    }

    currentLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);

    map.setView([lat, lng], 13);

    if (treasures.length === 0) {
        await createInitialTreasures(lat, lng);
        logTreasureInfo();
    }
}

// handle geolocation updates
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await initializeMapAndTreasures(lat, lng);

        treasures.forEach(async (treasure, index) => {
            if (!treasure.found && getDistance(lat, lng, treasure.lat, treasure.lng) < 50) {
                treasure.found = true;
                score += 1;
                document.getElementById('score').innerText = score;

                L.popup()
                    .setLatLng([lat, lng])
                    .setContent("you found a treasure! your score is now " + score)
                    .openOn(map);

                map.removeLayer(treasureMarkers[index]);
                treasureMarkers.splice(index, 1);
                treasures.splice(index, 1);
                await createTreasure(lat, lng);
                logTreasureInfo();

                localStorage.setItem('score', score);
                localStorage.setItem('treasures', JSON.stringify(treasures));
            }
        });
    });
} else {
    alert("geolocation is not supported by this browser.");
}

// load game state from local storage
const savedScore = localStorage.getItem('score');
const savedTreasures = localStorage.getItem('treasures');
if (savedScore !== null) {
    score = parseInt(savedScore, 10);
    document.getElementById('score').innerText = score;
}
if (savedTreasures !== null) {
    const savedTreasuresArray = JSON.parse(savedTreasures);
    savedTreasuresArray.forEach(savedTreasure => {
        if (savedTreasure.lat && savedTreasure.lng) {
            treasures.push(savedTreasure);
            const marker = L.marker([savedTreasure.lat, savedTreasure.lng], { icon: treasureIcon }).addTo(map)
                .bindPopup('a hidden treasure is nearby!');
            treasureMarkers.push(marker);
        }
    });
}

// log treasure information to console
function logTreasureInfo() {
    treasures.forEach(treasure => {
        console.log(`treasure location: latitude: ${treasure.lat}, longitude: ${treasure.lng}`);
    });
}