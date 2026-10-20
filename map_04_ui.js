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

// =========================================================
// ★ [무결점 길찾기 엔진] 카카오맵 스타일 (대중교통 / 자동차 / 도보)
// - 작은 골목길 L자(직각) 자동 스냅 + 실제 도로망(roadData) 다익스트라 탐색
// - 지하철(subwayData) 직통/환승 & 시내버스(processedBusData) 실제 노선 추적
// =========================================================
(function() {
    var navLayer = L.layerGroup().addTo(map);
    var navState = {
        start: null, // { name, lat, lng }
        end: null,   // { name, lat, lng }
        mode: 'transit', // 'transit' | 'car' | 'walk'
        pickTarget: null, // 'start' | 'end' | null
        roadGraph: null,
        routes: []
    };

    // 1. 픽셀 좌표 거리를 실제 미터(m) 단위로 변환 (효빈시 스케일 맞춤)
    function calcRealMeters(lat1, lng1, lat2, lng2) {
        var d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
        return Math.round(d * 1.15); // 1좌표당 약 1.15m 환산
    }

    function formatDist(m) {
        return (m >= 1000) ? (m / 1000).toFixed(1) + "km" : m + "m";
    }

    // 2. 작은 골목길 L자(직각) 스냅 생성기 (건물 뚫고 대각선으로 가는 현상 방지!)
    function makeAlleyPath(p1, p2) {
        var dLat = Math.abs(p1[0] - p2[0]);
        var dLng = Math.abs(p1[1] - p2[1]);
        if (dLat < 15 || dLng < 15) return [p1, p2];
        var elbow = (dLat > dLng) ? [p2[0], p1[1]] : [p1[0], p2[1]];
        return [p1, elbow, p2];
    }

    // 3. 사이드바에 [🧭 길찾기] 탭 및 전용 UI 자동 주입 (HTML 수정 불필요)
    function initNavUI() {
        var tabsBar = document.querySelector('.sidebar-tabs');
        var contentArea = document.querySelector('.sidebar-content');
        if (!tabsBar || !contentArea || document.getElementById('tab-nav')) return;

        var navTabBtn = document.createElement('button');
        navTabBtn.id = 'tab-btn-nav';
        navTabBtn.className = 'tab-btn';
        navTabBtn.innerHTML = '🧭 길찾기';
        navTabBtn.onclick = function() { window.switchTab('tab-nav', this); };
        tabsBar.appendChild(navTabBtn);

        var navPane = document.createElement('div');
        navPane.id = 'tab-nav';
        navPane.className = 'tab-pane';
        navPane.innerHTML = `
            <div style="background:#258fff; padding:14px; border-radius:8px; color:#fff; box-shadow:0 2px 8px rgba(37,143,255,0.25);">
                <div style="display:flex; gap:6px; margin-bottom:10px;">
                    <button id="nav-mode-transit" onclick="window.setNavMode('transit')" style="flex:1; padding:7px 0; border:none; border-radius:5px; font-weight:bold; font-size:12.5px; cursor:pointer; background:#fff; color:#258fff;">🚇 대중교통</button>
                    <button id="nav-mode-car" onclick="window.setNavMode('car')" style="flex:1; padding:7px 0; border:none; border-radius:5px; font-weight:bold; font-size:12.5px; cursor:pointer; background:rgba(255,255,255,0.2); color:#fff;">🚗 자동차</button>
                    <button id="nav-mode-walk" onclick="window.setNavMode('walk')" style="flex:1; padding:7px 0; border:none; border-radius:5px; font-weight:bold; font-size:12.5px; cursor:pointer; background:rgba(255,255,255,0.2); color:#fff;">🚶 도보</button>
                </div>

                <div style="position:relative; margin-bottom:6px;">
                    <div style="display:flex; gap:4px;">
                        <input type="text" id="nav-start-input" placeholder="🟢 출발지 입력 또는 지도 클릭" oninput="window.searchNavPlace('start', this.value)" style="flex:1; padding:8px 10px; border:none; border-radius:4px; font-size:12.5px; font-weight:bold; color:#222; outline:none;">
                        <button onclick="window.enableNavMapPick('start')" title="지도에서 출발지 직접 찍기" style="background:#00c853; color:#fff; border:none; border-radius:4px; padding:0 9px; cursor:pointer; font-size:12px; font-weight:bold;">📍지도</button>
                    </div>
                    <div id="nav-start-suggest" style="display:none; position:absolute; top:36px; left:0; width:100%; background:#fff; color:#222; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.25); max-height:160px; overflow-y:auto; z-index:2000;"></div>
                </div>

                <div style="position:relative; margin-bottom:10px;">
                    <div style="display:flex; gap:4px;">
                        <input type="text" id="nav-end-input" placeholder="🔴 도착지 입력 또는 지도 클릭" oninput="window.searchNavPlace('end', this.value)" style="flex:1; padding:8px 10px; border:none; border-radius:4px; font-size:12.5px; font-weight:bold; color:#222; outline:none;">
                        <button onclick="window.enableNavMapPick('end')" title="지도에서 도착지 직접 찍기" style="background:#ff5252; color:#fff; border:none; border-radius:4px; padding:0 9px; cursor:pointer; font-size:12px; font-weight:bold;">📍지도</button>
                    </div>
                    <div id="nav-end-suggest" style="display:none; position:absolute; top:36px; left:0; width:100%; background:#fff; color:#222; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.25); max-height:160px; overflow-y:auto; z-index:2000;"></div>
                </div>

                <div style="display:flex; gap:6px;">
                    <button onclick="window.swapNavPoints()" style="background:rgba(255,255,255,0.2); color:#fff; border:1px solid rgba(255,255,255,0.4); border-radius:4px; padding:7px 10px; font-size:11.5px; font-weight:bold; cursor:pointer;">⇅ 전환</button>
                    <button onclick="window.executeNavigation()" style="flex:1; background:#ffe600; color:#111; border:none; border-radius:4px; padding:7px 0; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.15);">🔍 길찾기 실행</button>
                    <button onclick="window.clearNavigation()" style="background:rgba(0,0,0,0.25); color:#fff; border:none; border-radius:4px; padding:7px 10px; font-size:11.5px; font-weight:bold; cursor:pointer;">초기화</button>
                </div>
            </div>

            <div id="nav-pick-guide" style="display:none; background:#fff8e1; border:1px dashed #ffa000; color:#e65100; padding:8px; border-radius:6px; font-size:12px; font-weight:bold; text-align:center;">
                👆 지도 위에서 원하는 위치를 클릭하세요!
            </div>

            <div id="nav-results-box" style="display:flex; flex-direction:column; gap:10px; margin-top:4px;">
                <div style="padding:30px 10px; text-align:center; color:#888; font-size:12.5px; line-height:1.6;">
                    출발지와 도착지를 설정하거나,<br>지도 위의 마커 팝업에서 <b>[↱ 길찾기]</b> 버튼을 누르세요!
                </div>
            </div>
        `;
        contentArea.appendChild(navPane);
    }

    setTimeout(initNavUI, 400);

    // 4. 기존 마커 팝업의 [↱ 길찾기] alert를 자동으로 가로채서 실제 길찾기로 연결!
    var origAlert = window.alert;
    window.alert = function(msg) {
        if (typeof msg === 'string') {
            var routeMatch = msg.match(/^(.+)\(으\)로 길찾기를 시작합니다\./);
            if (routeMatch) {
                var targetName = routeMatch[1].trim();
                window.openNavFromPopup(targetName);
                return;
            }
            var startMatch = msg.match(/^(.+)을\(를\) 출발지로 설정했습니다\./);
            if (startMatch) {
                window.setNavPointByName('start', startMatch[1].trim());
                return;
            }
            var endMatch = msg.match(/^(.+)을\(를\) 도착지로 설정했습니다\./);
            if (endMatch) {
                window.setNavPointByName('end', endMatch[1].trim());
                return;
            }
        }
        origAlert.apply(window, arguments);
    };

    window.findPlaceCoords = function(name) {
        if (typeof allLandmarks !== 'undefined') {
            var found = allLandmarks.find(m => m.name === name || m.name.replace(/역$/, '') === name.replace(/역$/, ''));
            if (found) return { name: found.name, lat: found.lat, lng: found.lng };
        }
        var center = map.getCenter();
        return { name: name, lat: Math.round(center.lat), lng: Math.round(center.lng) };
    };

    window.openNavFromPopup = function(placeName) {
        initNavUI();
        var pt = window.findPlaceCoords(placeName);
        var sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) window.toggleSidebar();
        var navBtn = document.getElementById('tab-btn-nav');
        if (navBtn) window.switchTab('tab-nav', navBtn);

        if (!navState.start) {
            var asStart = confirm(`📍 [${pt.name}]\n\n[확인]을 누르면 '도착지'로 설정하고,\n[취소]를 누르면 '출발지'로 설정합니다.`);
            if (asStart) {
                navState.end = pt;
                document.getElementById('nav-end-input').value = pt.name;
                // 출발지가 비어있으면 현재 지도 중심이나 효빈역을 기본 출발지로 추천하지 않고 사용자 선택 유도
                window.enableNavMapPick('start');
            } else {
                navState.start = pt;
                document.getElementById('nav-start-input').value = pt.name;
                window.enableNavMapPick('end');
            }
        } else {
            navState.end = pt;
            document.getElementById('nav-end-input').value = pt.name;
            map.closePopup();
            window.executeNavigation();
        }
    };

    window.setNavPointByName = function(type, placeName) {
        initNavUI();
        var pt = window.findPlaceCoords(placeName);
        var sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) window.toggleSidebar();
        var navBtn = document.getElementById('tab-btn-nav');
        if (navBtn) window.switchTab('tab-nav', navBtn);

        if (type === 'start') {
            navState.start = pt;
            document.getElementById('nav-start-input').value = pt.name;
        } else {
            navState.end = pt;
            document.getElementById('nav-end-input').value = pt.name;
        }
        if (navState.start && navState.end) window.executeNavigation();
    };

    // 5. 검색창 자동완성 및 지도 클릭 지정 기능
    window.searchNavPlace = function(type, keyword) {
        var box = document.getElementById(type === 'start' ? 'nav-start-suggest' : 'nav-end-suggest');
        if (!box) return;
        var kw = (keyword || "").trim().toLowerCase();
        if (!kw || typeof allLandmarks === 'undefined') { box.style.display = 'none'; return; }

        var matches = allLandmarks.filter(m => m.name && m.name.toLowerCase().includes(kw)).slice(0, 8);
        if (matches.length === 0) { box.style.display = 'none'; return; }

        box.innerHTML = matches.map(function(m) {
            var badge = m.type === 'subway' ? '🚉역' : '📍시설';
            var safeN = m.name.replace(/'/g, "\\'");
            return `<div onclick="window.selectNavSuggest('${type}', '${safeN}', ${m.lat}, ${m.lng})" style="padding:7px 10px; border-bottom:1px solid #eee; font-size:12px; cursor:pointer; display:flex; justify-content:space-between;">
                <b>${m.name}</b><span style="color:#888; font-size:11px;">${badge}</span>
            </div>`;
        }).join('');
        box.style.display = 'block';
    };

    window.selectNavSuggest = function(type, name, lat, lng) {
        var pt = { name: name, lat: lat, lng: lng };
        if (type === 'start') {
            navState.start = pt;
            document.getElementById('nav-start-input').value = name;
            document.getElementById('nav-start-suggest').style.display = 'none';
        } else {
            navState.end = pt;
            document.getElementById('nav-end-input').value = name;
            document.getElementById('nav-end-suggest').style.display = 'none';
        }
        if (navState.start && navState.end) window.executeNavigation();
    };

    window.enableNavMapPick = function(target) {
        navState.pickTarget = target;
        var guide = document.getElementById('nav-pick-guide');
        if (guide) {
            guide.style.display = 'block';
            guide.innerHTML = target === 'start' 
                ? '🟢 지도를 클릭하여 <b>[출발지]</b>를 찍어주세요!' 
                : '🔴 지도를 클릭하여 <b>[도착지]</b>를 찍어주세요!';
        }
        document.getElementById('map').style.cursor = 'crosshair';
    };

    map.on('click', function(e) {
        if (!navState.pickTarget) return;
        var lat = Math.round(e.latlng.lat);
        var lng = Math.round(e.latlng.lng);
        var addrName = "지정 위치";
        if (typeof resolveFullAddress === 'function') {
            var a = resolveFullAddress(lat, lng);
            addrName = `${a.gugun} ${a.jibunSub || a.legal}`.trim();
        }
        var pt = { name: addrName, lat: lat, lng: lng };

        if (navState.pickTarget === 'start') {
            navState.start = pt;
            document.getElementById('nav-start-input').value = pt.name;
        } else {
            navState.end = pt;
            document.getElementById('nav-end-input').value = pt.name;
        }

        navState.pickTarget = null;
        var guide = document.getElementById('nav-pick-guide');
        if (guide) guide.style.display = 'none';
        document.getElementById('map').style.cursor = 'default';

        if (navState.start && navState.end) window.executeNavigation();
    });

    window.setNavMode = function(mode) {
        navState.mode = mode;
        ['transit', 'car', 'walk'].forEach(function(m) {
            var btn = document.getElementById('nav-mode-' + m);
            if (!btn) return;
            if (m === mode) {
                btn.style.background = '#fff';
                btn.style.color = '#258fff';
            } else {
                btn.style.background = 'rgba(255,255,255,0.2)';
                btn.style.color = '#fff';
            }
        });
        if (navState.start && navState.end) window.executeNavigation();
    };

    window.swapNavPoints = function() {
        var temp = navState.start;
        navState.start = navState.end;
        navState.end = temp;
        document.getElementById('nav-start-input').value = navState.start ? navState.start.name : '';
        document.getElementById('nav-end-input').value = navState.end ? navState.end.name : '';
        if (navState.start && navState.end) window.executeNavigation();
    };

    window.clearNavigation = function() {
        navState.start = null;
        navState.end = null;
        navState.routes = [];
        navLayer.clearLayers();
        document.getElementById('nav-start-input').value = '';
        document.getElementById('nav-end-input').value = '';
        document.getElementById('nav-results-box').innerHTML = `
            <div style="padding:30px 10px; text-align:center; color:#888; font-size:12.5px;">
                출발지와 도착지를 설정해 주세요.
            </div>`;
    };

    // =========================================================
    // 6. 🚗 [자동차 다익스트라(Dijkstra) 도로망 그래프 빌더]
    // - roadData의 실제 도로 좌표들과 교차로를 연결하여 정밀 네비게이션 그래프 생성!
    // =========================================================
    function getRoadGraph() {
        if (navState.roadGraph) return navState.roadGraph;
        var nodes = [];
        var adj = [];
        var adjY = (typeof adjustY !== 'undefined') ? adjustY : 0;

        function addNode(lat, lng, roadName) {
            for (var i = 0; i < nodes.length; i++) {
                if (Math.abs(nodes[i].lat - lat) < 80 && Math.abs(nodes[i].lng - lng) < 80) {
                    return i;
                }
            }
            var idx = nodes.length;
            nodes.push({ lat: lat, lng: lng, roadName: roadName });
            adj.push([]);
            return idx;
        }

        function addEdge(u, v, rName, isExpress) {
            if (u === v) return;
            var dist = calcRealMeters(nodes[u].lat, nodes[u].lng, nodes[v].lat, nodes[v].lng);
            var weight = isExpress ? dist * 0.65 : dist; // 고속도로/대로 가중치 우대
            adj[u].push({ to: v, weight: weight, dist: dist, roadName: rName });
            adj[v].push({ to: u, weight: weight, dist: dist, roadName: rName });
        }

        if (typeof roadData !== 'undefined' && Array.isArray(roadData)) {
            roadData.forEach(function(road) {
                if (!road.points || road.points.length < 2) return;
                var rName = road.name || "일반도로";
                var isExp = rName.includes("고속") || rName.includes("대로") || rName.includes("순환");
                var rawPts = Array.isArray(road.points[0][0]) ? road.points[0] : road.points;

                var prevIdx = -1;
                rawPts.forEach(function(pt) {
                    var lat = pt[0] + adjY;
                    var lng = pt[1];
                    var curIdx = addNode(lat, lng, rName);
                    if (prevIdx !== -1) addEdge(prevIdx, curIdx, rName, isExp);
                    prevIdx = curIdx;
                });
            });
        }

        // 서로 교차하거나 맞닿아 있는 다른 도로 노드끼리 환승(교차로) 자동 연결 (반경 450 이내)
        for (var i = 0; i < nodes.length; i++) {
            for (var j = i + 1; j < nodes.length; j++) {
                var dLat = Math.abs(nodes[i].lat - nodes[j].lat);
                var dLng = Math.abs(nodes[i].lng - nodes[j].lng);
                if (dLat < 450 && dLng < 450) {
                    var d = calcRealMeters(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng);
                    if (d < 480) {
                        adj[i].push({ to: j, weight: d * 1.2, dist: d, roadName: nodes[j].roadName });
                        adj[j].push({ to: i, weight: d * 1.2, dist: d, roadName: nodes[i].roadName });
                    }
                }
            }
        }

        navState.roadGraph = { nodes: nodes, adj: adj };
        return navState.roadGraph;
    }

    function computeCarRoute(startPt, endPt) {
        var g = getRoadGraph();
        if (g.nodes.length === 0) return null;

        // 출발지 / 도착지에서 가장 가까운 실제 도로 진입점 찾기
        var sNode = 0, eNode = 0, minSD = Infinity, minED = Infinity;
        for (var i = 0; i < g.nodes.length; i++) {
            var ds = calcRealMeters(startPt.lat, startPt.lng, g.nodes[i].lat, g.nodes[i].lng);
            var de = calcRealMeters(endPt.lat, endPt.lng, g.nodes[i].lat, g.nodes[i].lng);
            if (ds < minSD) { minSD = ds; sNode = i; }
            if (de < minED) { minED = de; eNode = i; }
        }

        // 다익스트라 최단 경로 탐색
        var N = g.nodes.length;
        var distArr = new Array(N).fill(Infinity);
        var prevArr = new Array(N).fill(-1);
        var prevRoad = new Array(N).fill("");
        var visited = new Array(N).fill(false);

        distArr[sNode] = 0;
        for (var step = 0; step < N; step++) {
            var u = -1, bestD = Infinity;
            for (var i = 0; i < N; i++) {
                if (!visited[i] && distArr[i] < bestD) { bestD = distArr[i]; u = i; }
            }
            if (u === -1 || u === eNode || bestD === Infinity) break;
            visited[u] = true;

            var neighbors = g.adj[u];
            for (var k = 0; k < neighbors.length; k++) {
                var edge = neighbors[k];
                if (!visited[edge.to] && distArr[u] + edge.weight < distArr[edge.to]) {
                    distArr[edge.to] = distArr[u] + edge.weight;
                    prevArr[edge.to] = u;
                    prevRoad[edge.to] = edge.roadName;
                }
            }
        }

        var mainRoadCoords = [];
        var usedRoads = [];
        var curr = eNode;
        if (prevArr[curr] !== -1 || curr === sNode) {
            while (curr !== -1) {
                mainRoadCoords.unshift([g.nodes[curr].lat, g.nodes[curr].lng]);
                if (prevRoad[curr] && usedRoads[0] !== prevRoad[curr]) {
                    usedRoads.unshift(prevRoad[curr]);
                }
                curr = prevArr[curr];
            }
        } else {
            // 만약 섬(도서) 지역 등 도로망이 완전히 끊긴 곳이면 L자 보정 경로로 연결
            mainRoadCoords = makeAlleyPath([g.nodes[sNode].lat, g.nodes[sNode].lng], [g.nodes[eNode].lat, g.nodes[eNode].lng]);
            usedRoads = [g.nodes[sNode].roadName || "연결도로"];
        }

        // 출발지 ➔ 첫 도로 진입점 (ㄱ자 골목길 스냅)
        var startAlley = makeAlleyPath([startPt.lat, startPt.lng], mainRoadCoords[0]);
        // 마지막 도로 진출점 ➔ 도착지 (ㄱ자 골목길 스냅)
        var endAlley = makeAlleyPath(mainRoadCoords[mainRoadCoords.length - 1], [endPt.lat, endPt.lng]);

        var totalMeter = minSD + minED;
        for (var i = 0; i < mainRoadCoords.length - 1; i++) {
            totalMeter += calcRealMeters(mainRoadCoords[i][0], mainRoadCoords[i][1], mainRoadCoords[i+1][0], mainRoadCoords[i+1][1]);
        }

        var durationMin = Math.max(2, Math.round(totalMeter / 550)); // 시내 평균 33km/h(분당 550m)
        var taxiFare = 4800 + Math.max(0, Math.ceil((totalMeter - 1600) / 131) * 100);

        return {
            title: "추천 도로 주행 경로",
            badge: "🚗 자동차 최적",
            timeMin: durationMin,
            distMeter: totalMeter,
            costText: `택시비 약 ${taxiFare.toLocaleString()}원`,
            summary: usedRoads.length > 0 ? `경유: ${usedRoads.slice(0, 5).join(' ➔ ')}${usedRoads.length > 5 ? ' 외' : ''}` : "이면도로 직결 주행",
            steps: [
                `🟢 <b>${startPt.name}</b> 출발 (이면도로 ${formatDist(minSD)} 진입)`,
                ...usedRoads.slice(0, 6).map(r => `🛣️ <b>${r}</b> 따라 이동`),
                `🔴 <b>${endPt.name}</b> 도착 (골목 진입 ${formatDist(minED)})`
            ],
            drawLayers: [
                { pts: startAlley, color: "#555555", weight: 4, dash: "6, 6", label: "골목 진입" },
                { pts: mainRoadCoords, color: "#258fff", weight: 7, dash: null, label: "간선도로 주행" },
                { pts: endAlley, color: "#555555", weight: 4, dash: "6, 6", label: "목적지 진입" }
            ]
        };
    }

    // =========================================================
    // 7. 🚇🚌 [대중교통 길찾기 (지하철 직통 / 지하철 1회 환승 / 시내버스 직통)]
    // =========================================================
    function getSubwaySegmentCoords(lineCode, st1, st2) {
        var list = (typeof getOrderedUniqueStationsForLine === 'function') ? getOrderedUniqueStationsForLine(lineCode) : [];
        var idx1 = list.findIndex(s => s.name === st1.name);
        var idx2 = list.findIndex(s => s.name === st2.name);
        var stopCount = (idx1 !== -1 && idx2 !== -1) ? Math.abs(idx1 - idx2) : 3;

        var stationCoords = [];
        if (idx1 !== -1 && idx2 !== -1) {
            var s = Math.min(idx1, idx2), e = Math.max(idx1, idx2);
            for (var i = s; i <= e; i++) stationCoords.push([list[i].lat, list[i].lng]);
            if (idx1 > idx2) stationCoords.reverse();
        } else {
            stationCoords = [[st1.lat, st1.lng], [st2.lat, st2.lng]];
        }
        return { coords: stationCoords, stops: Math.max(1, stopCount) };
    }

    function computeTransitRoutes(startPt, endPt) {
        var results = [];
        var openedSubways = (typeof allLandmarks !== 'undefined') ? allLandmarks.filter(function(m) {
            if (m.type !== 'subway' || !m.lines) return false;
            return m.lines.some(l => typeof unOpenedLines === 'undefined' || !unOpenedLines[l]);
        }) : [];

        // [A] 지하철 탐색 (출발지/도착지에서 가장 가까운 개통 역 4개씩 추출)
        if (openedSubways.length > 0) {
            var startStations = openedSubways.map(s => ({ st: s, d: calcRealMeters(startPt.lat, startPt.lng, s.lat, s.lng) })).sort((a,b) => a.d - b.d).slice(0, 4);
            var endStations = openedSubways.map(s => ({ st: s, d: calcRealMeters(endPt.lat, endPt.lng, s.lat, s.lng) })).sort((a,b) => a.d - b.d).slice(0, 4);

            // 1) 직통 지하철 노선 확인
            for (var i = 0; i < startStations.length; i++) {
                for (var j = 0; j < endStations.length; j++) {
                    var sSt = startStations[i].st, eSt = endStations[j].st;
                    if (sSt.name === eSt.name) continue;
                    var commonLines = sSt.lines.filter(l => eSt.lines.includes(l) && (!unOpenedLines || !unOpenedLines[l]));
                    if (commonLines.length > 0) {
                        var lc = commonLines[0];
                        var lInfo = (typeof subwayLines !== 'undefined' && subwayLines[lc]) ? subwayLines[lc] : { name: lc + "호선", color: "#0077DD" };
                        var seg = getSubwaySegmentCoords(lc, sSt, eSt);
                        var walkS = startStations[i].d, walkE = endStations[j].d;
                        var totalMin = Math.round((walkS + walkE) / 65) + (seg.stops * 2) + 3;
                        var railMeter = calcRealMeters(sSt.lat, sSt.lng, eSt.lat, eSt.lng);

                        results.push({
                            title: `🚇 ${lInfo.name} 직통 (${sSt.name} ➔ ${eSt.name})`,
                            badge: "⚡ 지하철 직통",
                            timeMin: totalMin,
                            distMeter: walkS + walkE + railMeter,
                            costText: "교통카드 1,500원",
                            summary: `${sSt.name} 승차 ➔ ${seg.stops}개 역 이동 ➔ ${eSt.name} 하차`,
                            steps: [
                                `🚶 <b>${startPt.name}</b>에서 <b>${sSt.name}</b>까지 도보 이동 (${formatDist(walkS)})`,
                                `🚇 <span style="color:${lInfo.color}; font-weight:bold;">[${lInfo.name}]</span> <b>${sSt.name}</b> 승차 (${seg.stops}개 역 이동)`,
                                `🚉 <b>${eSt.name}</b> 하차 후 도보 이동 (${formatDist(walkE)})`,
                                `🔴 <b>${endPt.name}</b> 도착`
                            ],
                            drawLayers: [
                                { pts: makeAlleyPath([startPt.lat, startPt.lng], [sSt.lat, sSt.lng]), color: "#666666", weight: 4, dash: "5, 6" },
                                { pts: seg.coords, color: lInfo.color, weight: 8, dash: null },
                                { pts: makeAlleyPath([eSt.lat, eSt.lng], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }
                            ]
                        });
                        break;
                    }
                }
                if (results.length > 0) break;
            }

            // 2) 1회 환승 지하철 경로 확인
            if (results.length === 0) {
                var sSt = startStations[0].st, eSt = endStations[0].st;
                var bestTransfer = null, bestTotalStops = 999;

                sSt.lines.forEach(function(l1) {
                    if (unOpenedLines && unOpenedLines[l1]) return;
                    eSt.lines.forEach(function(l2) {
                        if (l1 === l2 || (unOpenedLines && unOpenedLines[l2])) return;
                        // l1과 l2를 모두 지나는 환승역 찾기
                        var tStations = openedSubways.filter(m => m.lines.includes(l1) && m.lines.includes(l2));
                        tStations.forEach(function(tSt) {
                            var seg1 = getSubwaySegmentCoords(l1, sSt, tSt);
                            var seg2 = getSubwaySegmentCoords(l2, tSt, eSt);
                            if (seg1.stops + seg2.stops < bestTotalStops) {
                                bestTotalStops = seg1.stops + seg2.stops;
                                bestTransfer = { l1: l1, l2: l2, tSt: tSt, seg1: seg1, seg2: seg2 };
                            }
                        });
                    });
                });

                if (bestTransfer) {
                    var info1 = subwayLines[bestTransfer.l1] || { name: bestTransfer.l1 + "호선", color: "#0077DD" };
                    var info2 = subwayLines[bestTransfer.l2] || { name: bestTransfer.l2 + "호선", color: "#00CCAA" };
                    var walkS = startStations[0].d, walkE = endStations[0].d;
                    var totalMin = Math.round((walkS + walkE) / 65) + (bestTotalStops * 2) + 7; // 환승 보행 4분 포함
                    var railMeter = calcRealMeters(sSt.lat, sSt.lng, bestTransfer.tSt.lat, bestTransfer.tSt.lng) + calcRealMeters(bestTransfer.tSt.lat, bestTransfer.tSt.lng, eSt.lat, eSt.lng);

                    results.push({
                        title: `🚇 ${info1.name} ➔ ${info2.name} (${bestTransfer.tSt.name} 환승)`,
                        badge: "🔄 지하철 1회 환승",
                        timeMin: totalMin,
                        distMeter: walkS + walkE + railMeter,
                        costText: "교통카드 1,500원 (환승무료)",
                        summary: `${sSt.name} 승차 ➔ ${bestTransfer.tSt.name} 환승 ➔ ${eSt.name} 하차`,
                        steps: [
                            `🚶 <b>${startPt.name}</b>에서 <b>${sSt.name}</b>까지 도보 (${formatDist(walkS)})`,
                            `🚇 <span style="color:${info1.color}; font-weight:bold;">[${info1.name}]</span> <b>${sSt.name}</b> 승차 (${bestTransfer.seg1.stops}개 역)`,
                            `🔄 <b>${bestTransfer.tSt.name}</b>에서 <span style="color:${info2.color}; font-weight:bold;">[${info2.name}]</span>으로 환승 (${bestTransfer.seg2.stops}개 역)`,
                            `🚉 <b>${eSt.name}</b> 하차 후 도보 (${formatDist(walkE)}) ➔ 🔴 <b>${endPt.name}</b> 도착`
                        ],
                        drawLayers: [
                            { pts: makeAlleyPath([startPt.lat, startPt.lng], [sSt.lat, sSt.lng]), color: "#666666", weight: 4, dash: "5, 6" },
                            { pts: bestTransfer.seg1.coords, color: info1.color, weight: 8, dash: null },
                            { pts: bestTransfer.seg2.coords, color: info2.color, weight: 8, dash: null },
                            { pts: makeAlleyPath([eSt.lat, eSt.lng], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }
                        ]
                    });
                }
            }
        }

        // [B] 🚌 시내버스 노선(`processedBusData`) 직통 탐색
        if (typeof processedBusData !== 'undefined' && Array.isArray(processedBusData)) {
            var bestBus = null, bestScore = Infinity;
            processedBusData.forEach(function(bus) {
                if (!bus.points || bus.points.length < 2) return;
                var sIdx = 0, eIdx = 0, minS = Infinity, minE = Infinity;
                for (var i = 0; i < bus.points.length; i++) {
                    var ds = calcRealMeters(startPt.lat, startPt.lng, bus.points[i][0], bus.points[i][1]);
                    var de = calcRealMeters(endPt.lat, endPt.lng, bus.points[i][0], bus.points[i][1]);
                    if (ds < minS) { minS = ds; sIdx = i; }
                    if (de < minE) { minE = de; eIdx = i; }
                }
                if (sIdx !== eIdx && (minS + minE) < bestScore && minS < 1800 && minE < 1800) {
                    bestScore = minS + minE;
                    bestBus = { bus: bus, sIdx: sIdx, eIdx: eIdx, walkS: minS, walkE: minE };
                }
            });

            if (bestBus) {
                var b = bestBus.bus;
                var bColor = (typeof busColors !== 'undefined' && busColors[b.type]) ? busColors[b.type] : "#01B7ED";
                var low = Math.min(bestBus.sIdx, bestBus.eIdx), high = Math.max(bestBus.sIdx, bestBus.eIdx);
                var busSegPts = b.points.slice(low, high + 1);
                if (bestBus.sIdx > bestBus.eIdx) busSegPts.reverse();

                var busMeter = 0;
                for (var k = 0; k < busSegPts.length - 1; k++) {
                    busMeter += calcRealMeters(busSegPts[k][0], busSegPts[k][1], busSegPts[k+1][0], busSegPts[k+1][1]);
                }
                var stopsCnt = Math.max(2, Math.round(busSegPts.length * 0.8));
                var totalMin = Math.round((bestBus.walkS + bestBus.walkE) / 65) + Math.max(4, Math.round(busMeter / 420)) + 5;
                var busFare = (b.type === "광역" || b.type === "공항") ? "2,800원" : (b.type === "좌석" || b.type === "급행") ? "1,950원" : "1,400원";

                results.push({
                    title: `🚌 [${b.type}] ${b.name} 직통`,
                    badge: "🚍 시내버스 추천",
                    timeMin: totalMin,
                    distMeter: bestBus.walkS + bestBus.walkE + busMeter,
                    costText: `교통카드 ${busFare}`,
                    summary: `인근 정류장 승차 ➔ 약 ${stopsCnt}개 정류장 이동 ➔ 하차`,
                    steps: [
                        `🚶 <b>${startPt.name}</b>에서 승차 정류장까지 도보 (${formatDist(bestBus.walkS)})`,
                        `🚌 <span style="color:${bColor}; font-weight:bold;">[${b.type}] ${b.name}</span> 승차 (약 ${stopsCnt}개 정류장 이동)`,
                        `🚏 하차 정류장에서 <b>${endPt.name}</b>까지 도보 (${formatDist(bestBus.walkE)})`
                    ],
                    drawLayers: [
                        { pts: makeAlleyPath([startPt.lat, startPt.lng], busSegPts[0]), color: "#666666", weight: 4, dash: "5, 6" },
                        { pts: busSegPts, color: bColor, weight: 7, dash: null },
                        { pts: makeAlleyPath(busSegPts[busSegPts.length - 1], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }
                    ]
                });
            }
        }

        // 만약 너무 가까워서 대중교통보다 도보가 빠르거나 노선이 안 잡히면 도보 결합 안내 추가
        if (results.length === 0) {
            results.push(computeWalkRoute(startPt, endPt));
        }
        return results;
    }

    // =========================================================
    // 8. 🚶 [도보 길찾기 (블록 단위 직각 골목길 + 보행도로 연결)]
    // =========================================================
    function computeWalkRoute(startPt, endPt) {
        var carBase = computeCarRoute(startPt, endPt);
        var directMeter = calcRealMeters(startPt.lat, startPt.lng, endPt.lat, endPt.lng);
        // 도보는 큰 도로 우회보다 직각 골목길(맨해튼 그리드)이 더 가까우면 골목 우선!
        var walkPts = [];
        var walkMeter = 0;

        if (carBase && carBase.distMeter < directMeter * 1.6) {
            walkPts = [...carBase.drawLayers[0].pts, ...carBase.drawLayers[1].pts, ...carBase.drawLayers[2].pts];
            walkMeter = carBase.distMeter;
        } else {
            var midLat = (startPt.lat + endPt.lat) / 2;
            var midLng = (startPt.lng + endPt.lng) / 2;
            walkPts = [
                [startPt.lat, startPt.lng],
                [midLat, startPt.lng],
                [midLat, midLng],
                [endPt.lat, midLng],
                [endPt.lat, endPt.lng]
            ];
            walkMeter = Math.round(directMeter * 1.28);
        }

        var walkMin = Math.max(1, Math.round(walkMeter / 67)); // 분속 67m (시속 4km)
        var kcal = Math.round(walkMin * 4.2);

        return {
            title: "🚶 도보 최단 보행자 경로",
            badge: "🚶 도보 추천",
            timeMin: walkMin,
            distMeter: walkMeter,
            costText: `소모 열량 약 ${kcal}kcal`,
            summary: `보행자 도로 및 골목길 따라 총 ${formatDist(walkMeter)} 이동`,
            steps: [
                `🟢 <b>${startPt.name}</b> 출발`,
                `🚶 보행자 길 및 횡단보도를 따라 ${formatDist(walkMeter)} 이동`,
                `🔴 <b>${endPt.name}</b> 도착`
            ],
            drawLayers: [
                { pts: walkPts, color: "#00c853", weight: 6, dash: "8, 8" }
            ]
        };
    }

    // =========================================================
    // 9. 길찾기 실행 및 지도 위에 경로(Polyline + 출발/도착 핀) 렌더링
    // =========================================================
    window.executeNavigation = function() {
        if (!navState.start || !navState.end) {
            origAlert("출발지와 도착지를 모두 지정해 주세요!");
            return;
        }

        var routes = [];
        if (navState.mode === 'transit') {
            routes = computeTransitRoutes(navState.start, navState.end);
        } else if (navState.mode === 'car') {
            var cRoute = computeCarRoute(navState.start, navState.end);
            if (cRoute) routes.push(cRoute);
        } else {
            routes.push(computeWalkRoute(navState.start, navState.end));
        }

        navState.routes = routes;
        window.renderNavRouteOnMap(0);
        window.renderNavCards();
    };

    window.renderNavRouteOnMap = function(routeIdx) {
        navLayer.clearLayers();
        var route = navState.routes[routeIdx];
        if (!route) return;

        var allPts = [];
        route.drawLayers.forEach(function(dl) {
            if (!dl.pts || dl.pts.length < 2) return;
            allPts = allPts.concat(dl.pts);

            // 외곽선(하얀 테두리) 먼저 그려서 가독성 극대화
            L.polyline(dl.pts, { color: "#ffffff", weight: dl.weight + 4, opacity: 0.9, interactive: false }).addTo(navLayer);
            L.polyline(dl.pts, { color: dl.color, weight: dl.weight, dashArray: dl.dash, opacity: 0.95, interactive: false }).addTo(navLayer);
        });

        // 출발지 / 도착지 카카오맵 스타일 배지 마커
        var startIcon = L.divIcon({
            className: '',
            html: `<div style="background:#00c853; color:#fff; font-weight:900; font-size:12px; padding:4px 10px; border-radius:16px; border:2.5px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:nowrap;">🟢 출발: ${navState.start.name}</div>`,
            iconSize: [100, 28], iconAnchor: [50, 14]
        });
        var endIcon = L.divIcon({
            className: '',
            html: `<div style="background:#ff5252; color:#fff; font-weight:900; font-size:12px; padding:4px 10px; border-radius:16px; border:2.5px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:nowrap;">🔴 도착: ${navState.end.name}</div>`,
            iconSize: [100, 28], iconAnchor: [50, 14]
        });

        L.marker([navState.start.lat, navState.start.lng], { icon: startIcon, zIndexOffset: 3000 }).addTo(navLayer);
        L.marker([navState.end.lat, navState.end.lng], { icon: endIcon, zIndexOffset: 3000 }).addTo(navLayer);

        if (allPts.length > 1) {
            map.fitBounds(L.latLngBounds(allPts), { padding: [70, 70] });
        }
    };

    window.renderNavCards = function() {
        var box = document.getElementById('nav-results-box');
        if (!box) return;

        box.innerHTML = navState.routes.map(function(r, idx) {
            var stepsHtml = r.steps.map(s => `<div style="padding:4px 0; border-bottom:1px dashed #eee; font-size:11.5px; color:#444;">${s}</div>`).join('');
            return `
                <div onclick="window.renderNavRouteOnMap(${idx})" style="background:#fff; border:2px solid ${idx === 0 ? '#258fff' : '#ddd'}; border-radius:8px; padding:12px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="background:#eef6ff; color:#258fff; font-size:11px; font-weight:bold; padding:2px 7px; border-radius:4px;">${r.badge}</span>
                        <span style="font-size:11.5px; color:#009000; font-weight:bold;">${r.costText}</span>
                    </div>
                    <div style="font-size:18px; font-weight:900; color:#111; margin-bottom:4px;">
                        약 ${r.timeMin}분 <span style="font-size:13px; font-weight:normal; color:#666;">(${formatDist(r.distMeter)})</span>
                    </div>
                    <div style="font-size:12.5px; font-weight:bold; color:#333; margin-bottom:8px;">${r.title}</div>
                    <div style="background:#f8f9fa; padding:8px; border-radius:6px;">${stepsHtml}</div>
                </div>
            `;
        }).join('');
    };
})();