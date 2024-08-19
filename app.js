// Initialize the map centered on Kenya
var map = L.map('map').setView([-1.286389, 36.817223], 6);  // Coordinates for Nairobi, Kenya, with a zoom level of 6

// Add the default OpenStreetMap tiles
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add an alternate basemap layer (e.g., satellite view)
var satellite = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

// Layers control to switch between basemaps
var baseLayers = {
    "Default Map": osm,
    "Satellite View": satellite
};

// Add layers control to the map
L.control.layers(baseLayers).addTo(map);

var geojsonLayer;
var labelsLayer = L.layerGroup().addTo(map); // Layer to hold the labels, only used during search

// Function to get color based on the Total value (using shades of blue and white for 0)
function getColor(d) {
    return d > 9 ? '#08306b' :
           d > 6 ? '#2171b5' :
           d > 3 ? '#4292c6' :
           d > 1 ? '#6baed6' :
           d > 0 ? '#deebf7' :
                   '#ffffff'; // White color for 0 partners
}

// Function to style each feature
function style(feature) {
    return {
        fillColor: getColor(feature.properties.Total),
        weight: 1, // Set the border lines to be thinner (not bold)
        opacity: 1,
        color: 'black', // Set solid black borders for the counties
        fillOpacity: 0.7
    };
}

// Load the GeoJSON data and add it to the map
fetch('counties.geojson')
    .then(response => response.json())
    .then(data => {
        geojsonLayer = L.geoJSON(data, {
            style: style,
            onEachFeature: function (feature, layer) {
                layer.bindPopup(
                    `<strong>County:</strong> ${feature.properties.County}<br>
                     <strong>Total Partners:</strong> ${feature.properties.Total}`
                );
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON:', error));

// Add a legend to the map
var legend = L.control({position: 'bottomleft'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'legend'),
        grades = [0, 1, 3, 6, 9],
        labels = [];

    div.style.padding = '10px';
    div.style.fontSize = '14px';
    div.style.lineHeight = '20px';
    div.style.width = '180px'; // Increase the width of the legend box

    div.innerHTML = '<h4>HPT Supply Number of Partners</h4>';

    // Add the "No Partners" label specifically
    div.innerHTML +=
        '<i style="background:' + getColor(0) + '; width: 24px; height: 24px; display: inline-block; margin-right: 10px; border: 1px solid #000;"></i> No Partners<br>';

    // Loop through the remaining intervals and generate a label with a colored square for each interval
    for (var i = 1; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '; width: 24px; height: 24px; display: inline-block; margin-right: 10px; border: 1px solid #000;"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '&ndash;12');
    }

    return div;
};

legend.addTo(map);

// Function to update the map based on the search query
function updateMap(searchQuery) {
    labelsLayer.clearLayers(); // Clear existing labels before adding new ones

    geojsonLayer.eachLayer(function (layer) {
        var feature = layer.feature;
        var entities = feature.properties && feature.properties.Entities ? feature.properties.Entities : ''; // Ensure 'Entities' exists

        if (entities) {
            // Split the entities string by commas and trim any extra spaces
            var companyList = entities.split(',').map(function(company) {
                return company.trim().toLowerCase();
            });

            // Check if the search query is in the list of companies
            if (companyList.includes(searchQuery)) {
                // Highlight the county in yellow if it contains the company
                layer.setStyle({
                    color: 'black',
                    fillColor: 'yellow',
                    fillOpacity: 0.7
                });

                // Add a label to the county
                var countyName = feature.properties && feature.properties.County ? feature.properties.County : 'Unknown County';
                var label = L.marker(layer.getBounds().getCenter(), {
                    icon: L.divIcon({
                        className: 'label', 
                        html: `<b>${countyName}</b>`, // Label showing the county name
                        iconSize: [100, 40]
                    })
                }).addTo(labelsLayer);
            } else {
                // Reset the style for counties that don't match the search
                layer.setStyle(style(feature));
            }
        } else {
            // Reset the style for counties that don't have the 'Entities' property
            layer.setStyle(style(feature));
        }
    });
}

// Add event listener for the search box
document.getElementById('search-box').addEventListener('input', function (e) {
    var searchQuery = e.target.value.trim().toLowerCase();
    if (searchQuery) {
        updateMap(searchQuery); // Only update the map if there's a search query
    } else {
        labelsLayer.clearLayers(); // Clear labels when search box is empty
        geojsonLayer.eachLayer(function (layer) {
            layer.setStyle(style(layer.feature)); // Reset to original style
        });
    }
});
