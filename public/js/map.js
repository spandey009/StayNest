const lat = coordinates[1];
const lng = coordinates[0];

const map = L.map("map", {
    scrollWheelZoom: false,
}).setView([lat, lng], 13);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap &copy; CARTO",
    }
).addTo(map);

const homeIcon = L.icon({
    iconUrl: "/images/home-marker.png",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30]
});

L.marker([lat, lng], { icon: homeIcon })
    .addTo(map)
    .bindPopup(`
        <div class="popup-content">
            <h5>${title}</h5>
            <p><strong>📍 ${listinglocation}, ${country}</strong></p>
            <small>Exact location will be provided after booking.</small>
        </div>
    `)
    .openPopup();