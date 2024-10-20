// Initialize Leaflet map
var map = L.map('map').setView([20, 0], 2); // Initial view set to latitude 20, longitude 0

// Add a tile layer to the map (OpenStreetMap tiles)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Array to store user locations
var populationCoords = [];

// Variable to store the current user’s position
var currentUserPosition = null;
var userMarker = null; // Store the user's marker to update it later

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the Earth in kilometers
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to calculate crowd density and overcrowding probability
function calculateCrowdDensity(centerLat, centerLon, radiusKm) {
    var peopleWithinRadius = populationCoords.filter(function(coords) {
        var distance = haversineDistance(centerLat, centerLon, coords.lat, coords.lon);
        return distance <= radiusKm; // Filter people within radius
    });

    var area = Math.PI * (radiusKm ** 2); // Area of a circle (πr²)
    var density = peopleWithinRadius.length / area;

    // Probability formula: Cap at 1 for maximum probability
    var overcrowdingProb = Math.min(density / 50, 1); // Example: Safe density is 50 people/km²

    return { density, overcrowdingProb };
}

// Function to update the UI with crowd data
function updateCrowdData() {
    var totalPeople = populationCoords.length;
    document.getElementById('people_count').textContent = totalPeople;

    if (totalPeople > 0) {
        // Calculate density and overcrowding probability within a 100-meter radius (0.1 km)
        var center = populationCoords[populationCoords.length - 1];
        var crowdData = calculateCrowdDensity(center.lat, center.lon, 0.1);
        document.getElementById('density').textContent = crowdData.density.toFixed(2);
        document.getElementById('overcrowding_prob').textContent = crowdData.overcrowdingProb.toFixed(2);
    }
}

// Function to get user location and add to the map
function trackUserLocation(position) {
    var lat = position.coords.latitude;
    var lon = position.coords.longitude;
    var accuracy = position.coords.accuracy; // Get accuracy of GPS data

    // Display GPS accuracy
    document.getElementById('accuracy').textContent = accuracy.toFixed(2);

    // If accuracy is poor, notify the user
    if (accuracy > 100) {
        alert('GPS accuracy is poor. You may not be seeing your exact location.');
    }

    // Store current user position
    currentUserPosition = { lat: lat, lon: lon };
    document.getElementById('user_lat').textContent = lat.toFixed(6);
    document.getElementById('user_lon').textContent = lon.toFixed(6);

    // Add user location to populationCoords array
    populationCoords.push({ lat: lat, lon: lon });

    // If this is the first location update, set the map's view to the user's location
    if (!userMarker) {
        map.setView([lat, lon], 15); // Center the map on the user's location with zoom level 15
    }

    // If a marker already exists for the user, update its position; otherwise, create a new one
    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        userMarker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`You are here. Accuracy: ${accuracy} meters`)
            .openPopup();
    }

    // Update crowd data
    updateCrowdData();
}

// Function to calculate the distance to a manually entered second user
function calculateDistance() {
    var lat2 = parseFloat(document.getElementById('lat2').value);
    var lon2 = parseFloat(document.getElementById('lon2').value);

    if (currentUserPosition && !isNaN(lat2) && !isNaN(lon2)) {
        var distance = haversineDistance(currentUserPosition.lat, currentUserPosition.lon, lat2, lon2);
        document.getElementById('distance').textContent = distance.toFixed(2);

        // Add a marker for the second user
        L.marker([lat2, lon2]).addTo(map)
            .bindPopup(`2nd User: ${lat2}, ${lon2}`)
            .openPopup();
    } else {
        alert('Please enter valid coordinates and ensure the first user is tracked.');
    }
}

// Function to fetch user IP address and update it on the page
async function fetchUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.getElementById('user_ip').textContent = data.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
        document.getElementById('user_ip').textContent = 'Error fetching IP';
    }
}

// Initiate user tracking and fetch IP
navigator.geolocation.getCurrentPosition(trackUserLocation, function(error) {
    console.error('Error getting location:', error);
});
fetchUserIP(); // Fetch user IP address when the page loads
