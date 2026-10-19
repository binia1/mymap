// =========================================================
// 8. 검색, 파일관리, 노선도 모드 (map_04_ui.js - 초기 OFF & 선택 시 즉시 표시 완벽판)
// =========================================================
var searchHighlightLayer = null;
var isSubwayMode = false;
var savedLayerState = [];

map.on('overlayadd', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });
map.on('overlayremove', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });

// ★ map_02_layers.js에서 생성한 cvsLayer(편의점 마커들이 들어있는 레이어)를 덮어쓰지 않고 그대로 유지!
if (typeof cvsLayer === 'undefined') {
    window.cvsLayer = L.markerClusterGroup({
        disableClusteringAtZoom: 14, 
        maxClusterRadius: 80 
    });
}

// =========================================================
// 2. 우측 상단 레이어 컨트롤 메뉴 (처음엔 체크 해제 상태 -> 선택 시 즉시 마커 뜸!)
// =========================================================
var overlays = { 
    "🏙️ 구/군 (상위)": guGunLayer,
    "🏢 행정 읍/면/동": adminLayer,
    "촘촘 법정 동/리": legalLayer,
    "🏗️ 개발지구": devLayer,
    "🛣️ 주요 도로망": roadLayer,
    "📏 2000x1500 그리드": gridLayer,        
    "🚌 버스 노선": busLineLayer,
    "🚏 버스 정류장": busStopLayer,
    "🛤️ 도시/일반철도 노선": subwayLineLayer,
    "🚉 도시/일반철도 역": subwayStationLayer,
    "🏪 편의점 (전용로고)": cvsLayer,
    
    // ★ 10대 카테고리별 일반 마커 레이어 (클릭해서 체크할 때만 지도에 나타남)
    "🏫 교육/학교": catLayers.education,
    "🏢 주거/아파트": catLayers.residence,
    "🏛️ 공공/관공서": catLayers.public,
    "🛒 상업/마트/은행": catLayers.commercial,
    "🍽️ 식당/카페/패스트푸드": catLayers.food,
    "🍿 문화/서브컬처/숙박": catLayers.culture,
    "🏥 의료/병원/약국": catLayers.medical,
    "✈️ 교통/산업/공단": catLayers.infra,
    "🌲 자연/공원/해변": catLayers.nature,
    "📍 기타 일반 시설": catLayers.normal
};

var layerControl = L.control.layers(null, overlays, { collapsed: false }).addTo(map);
var container = layerControl.getContainer();

var toggleBtn = document.createElement('button');
toggleBtn.innerHTML = '접기 🔼'; 
toggleBtn.style.width = '100%';
toggleBtn.style.marginTop = '10px';
toggleBtn.style.padding = '6px 0';
toggleBtn.style.cursor = 'pointer';
toggleBtn.style.border = '1px solid #ccc';
toggleBtn.style.backgroundColor = '#f8f9fa';
toggleBtn.style.borderRadius = '4px';
toggleBtn.style.fontWeight = 'bold';

var isCollapsed = false;
toggleBtn.onclick = function(e) {
    e.stopPropagation(); 
    e.preventDefault();
    var listContainer = container.querySelector('.leaflet-control-layers-list'); 
    if (listContainer) { 
        if (isCollapsed) {
            listContainer.style.display = 'block';
            toggleBtn.innerHTML = '접기 🔼';
            isCollapsed = false;
        } else {
            listContainer.style.display = 'none';
            toggleBtn.innerHTML = '펼치기 🔽';
            isCollapsed = true;
        }
    }
};
container.appendChild(toggleBtn);

// =========================================================
// 🚇 지하철 종점(Terminal) 링형 로고
// =========================================================
var terminalLogoLayer = L.layerGroup(); 

function drawTerminalLogo(lat, lng, text, color, lineKey) {
    var iconHtml = `
        <div style="background: white; border: 3px solid ${color}; color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; box-shadow: 1px 1px 4px rgba(0,0,0,0.5); box-sizing: border-box; text-shadow: none;">
            ${text}
        </div>
    `;
    var logoIcon = L.divIcon({
        className: '', 
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    var marker = L.marker([lat, lng], {icon: logoIcon, zIndexOffset: 2000, interactive: false});
    marker.lineCode = lineKey; 
    terminalLogoLayer.addLayer(marker);
}

setTimeout(function() {
    terminalLogoLayer.clearLayers(); 
    function getFlatPoints(arr) {
        if (arr.length > 0 && Array.isArray(arr[0])) return getFlatPoints(arr[0]);
        return arr;
    }

    subwayLineLayer.eachLayer(function(poly) {
        var latlngs = poly.getLatLngs();
        var flatPoints = getFlatPoints(latlngs);
        if (!flatPoints || flatPoints.length < 2) return;

        var p0 = flatPoints[0]; 
        var p1 = flatPoints[1]; 
        var pN = flatPoints[flatPoints.length - 1]; 
        var pN_1 = flatPoints[flatPoints.length - 2]; 

        var offsetDist = 40; 
        var dxStart = p0.lng - p1.lng;
        var dyStart = p0.lat - p1.lat;
        var lenStart = Math.sqrt(dxStart*dxStart + dyStart*dyStart) || 1;
        var offsetStartLat = p0.lat + (dyStart / lenStart) * offsetDist;
        var offsetStartLng = p0.lng + (dxStart / lenStart) * offsetDist;

        var dxEnd = pN.lng - pN_1.lng;
        var dyEnd = pN.lat - pN_1.lat;
        var lenEnd = Math.sqrt(dxEnd*dxEnd + dyEnd*dyEnd) || 1;
        var offsetEndLat = pN.lat + (dyEnd / lenEnd) * offsetDist;
        var offsetEndLng = pN.lng + (dxEnd / lenEnd) * offsetDist;

        var lineName = poly.getTooltip() ? poly.getTooltip().getContent() : "";
        var lineKey = poly.lineCode; 
        var color = poly.options.color || "#333";

        var text = "";
        if (lineName.includes("효빈대A선")) text = "A"; 
        else if (lineName.includes("효빈대 B선")) text = "B"; 
        else if (lineName.includes("빈효선")) text = "빈"; 
        else if (lineName.includes("호선")) text = lineName.replace(/[^0-9]/g, ""); 
        else text = lineName.charAt(0) || "역"; 

        drawTerminalLogo(offsetStartLat, offsetStartLng, text, color, lineKey);
        drawTerminalLogo(offsetEndLat, offsetEndLng, text, color, lineKey);
    });
    
    var modeBtn = document.getElementById('mode-btn');
    if (modeBtn) {
        modeBtn.addEventListener('click', function() {
            setTimeout(function() {
                if (modeBtn.classList.contains('active-btn')) {
                    map.addLayer(terminalLogoLayer);
                } else {
                    map.removeLayer(terminalLogoLayer);
                }
            }, 100);
        });
        if (modeBtn.classList.contains('active-btn')) map.addLayer(terminalLogoLayer);
    }

    map.on('overlayadd', function(e) {
        if (e.name.includes('철도 노선') || e.name.includes('지하철')) {
            map.addLayer(terminalLogoLayer);
        }
    });

    map.on('overlayremove', function(e) {
        if (e.name.includes('철도 노선') || e.name.includes('지하철')) {
            map.removeLayer(terminalLogoLayer);
        }
    });
}, 1500);

var myLocationMarker = null;

// =========================================================
// 🗺️ 실시간 현재 행정구역 표시
// =========================================================
function updateCurrentAddressPanel() {
    var center = map.getCenter();
    var lat = center.lat;
    var lng = center.lng;

    if (typeof resolveFullAddress === 'function') {
        var addr = resolveFullAddress(lat, lng);
        var arrow = " <span style='color:#999; margin:0 4px; font-weight:normal;'>></span> ";
        var fullAddress = addr.province;
        if (addr.gugun) fullAddress += arrow + addr.gugun;
        if (addr.eupMyeon) {
            fullAddress += arrow + addr.eupMyeon;
            if (addr.legal && addr.legal !== addr.eupMyeon) {
                fullAddress += arrow + addr.legal;
            }
        } else {
            if (addr.admin) fullAddress += arrow + addr.admin;
            if (addr.legal && addr.legal !== addr.admin) {
                if (addr.legal.endsWith("리")) fullAddress += arrow + addr.legal;
                else fullAddress += " <span style='color:#666; font-size:0.9em;'>(" + addr.legal + ")</span>";
            }
        }
        var addrText = document.getElementById('current-address-text');
        if (addrText) addrText.innerHTML = fullAddress;
    }
}

map.on('moveend', updateCurrentAddressPanel);
setTimeout(updateCurrentAddressPanel, 1000);

var currentHighlightedBus = null; 
map.on('click', function() {
    if (currentHighlightedBus && typeof resetBusHighlight === 'function') resetBusHighlight();
});