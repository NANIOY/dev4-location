const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let treasures = [];
let score = 0;
let currentLocationMarker = null;

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

function getRandomOffset() {
    return (Math.random() * 0.02) - 0.01;
}

function createTreasures(userLat, userLng) {
    for (let i = 0; i < 5; i++) {
        const latOffset = getRandomOffset();
        const lngOffset = getRandomOffset();
        treasures.push({ lat: userLat + latOffset, lng: userLng + lngOffset, found: false });
    }
}

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

function initializeMapAndTreasures(lat, lng) {
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
    }

    currentLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup('You are here!')
        .openPopup();

    map.setView([lat, lng], 13);

    if (treasures.length === 0) {
        createTreasures(lat, lng);
    }

    treasures.forEach(treasure => {
        if (treasure.lat && treasure.lng) {
            L.marker([treasure.lat, treasure.lng], { icon: treasureIcon }).addTo(map)
                .bindPopup('A hidden treasure is nearby!');
        }
    });

    logTreasureInfo();
}

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        initializeMapAndTreasures(lat, lng);

        treasures.forEach((treasure, index) => {
            if (!treasure.found && getDistance(lat, lng, treasure.lat, treasure.lng) < 50) {
                treasure.found = true;
                score += 10;
                document.getElementById('score').innerText = score;
                document.querySelector('.treasureInfo').style.display = 'block';

                L.popup()
                    .setLatLng([lat, lng])
                    .setContent("You found a treasure! Your score is now " + score)
                    .openOn(map);

                localStorage.setItem('score', score);
                localStorage.setItem('treasures', JSON.stringify(treasures));
            }
        });
    });
} else {
    alert("Geolocation is not supported by this browser.");
}

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
        }
    });
}

function logTreasureInfo() {
    treasures.forEach(treasure => {
        console.log(`Treasure Location: Latitude: ${treasure.lat}, Longitude: ${treasure.lng}`);
        console.log(`Timezone ID: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
        console.log(`Locale: ${navigator.language}`);
    });
}
