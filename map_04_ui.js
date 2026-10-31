// =========================================================
// 8. 검색, 파일관리, 노선도 모드 (map_04_ui.js - 미개통 노선/역 길찾기 100% 원천 차단 완벽판)
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
// - 미개통 노선(창전선 c, 청엽선 y 등) 및 미개통역(과복, 덕현중앙, 하미 등) 100% 원천 배제!
// - 작은 골목길 L자(직각) 자동 스냅 + 실제 도로망(roadData) 다익스트라 탐색
// - 지하철(subwayData) 직통/환승 & 시내버스(processedBusData) 실제 노선 추적
// =========================================================
(function() {
var navLayer = L.layerGroup().addTo(map);
    var navState = {
        start: null, 
        end: null,   
        waypoints: [], // 🎯 다중 경유지 배열 추가
        mode: 'transit', 
        pickTarget: null, 
        roadGraph: null,
        routes: []
    };

    // ★ [핵심 차단 필터 1] 현재 실제로 개통되어 열차가 다니는 노선인지 판별
    var openedValidLines = new Set(["1", "1B", "2", "2B", "3", "4", "5", "6", "7", "7B", "8", "B", "R1", "H1"]);
    var blockedLineCodes = new Set(["c", "y", "7c", "9", "G", "창전", "청엽"]);

    function isLineTrulyOpened(lineCode) {
        if (!lineCode) return false;
        var lc = String(lineCode).trim();
        if (blockedLineCodes.has(lc)) return false;
        if (typeof unOpenedLines !== 'undefined' && unOpenedLines[lc]) return false;
        if (typeof subwayLines !== 'undefined' && subwayLines[lc] && subwayLines[lc].name) {
            if (subwayLines[lc].name.match(/(창전|청엽|미개통|예정|폐선|전차)/)) return false;
        }
        return openedValidLines.has(lc) || !blockedLineCodes.has(lc);
    }

    // ★ [핵심 차단 필터 2] 역 자체가 현재 영업 중인 개통역인지 판별
    var fallbackUnopenedStations = [
        "원전", "남소", "야진", "하미", "선곡", "덕현중앙", "과복", 
        "청능", "시청(창전선)", "고송강변", "고송경찰서", "북고송",
        "신팔조", "쌍엽중앙", "신쌍엽", "창엽", "신창전", "칠심중앙", "진백중앙", "우택중앙", "효빈대병원"
    ];

    function isStationTrulyOpened(st) {
        if (!st || st.type !== 'subway' || !st.name) return false;
        var cleanName = st.name.replace(/역$/, "").trim();

        var unOpenedList = (typeof specificUnopenedStations !== 'undefined') ? specificUnopenedStations : fallbackUnopenedStations;
        if (cleanName !== "토모리해수욕장") {
            if (unOpenedList.includes(cleanName) || fallbackUnopenedStations.includes(cleanName)) {
                return false;
            }
        }
        if (!st.lines || !Array.isArray(st.lines) || st.lines.length === 0) return false;
        var validLines = st.lines.filter(isLineTrulyOpened);
        return validLines.length > 0;
    }

    function getStationOpenedLines(st) {
        if (!st || !st.lines || !Array.isArray(st.lines)) return [];
        return st.lines.filter(isLineTrulyOpened);
    }

    function calcRealMeters(lat1, lng1, lat2, lng2) {
        var d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
        return Math.round(d * 1.15); 
    }

    function formatDist(m) {
        return (m >= 1000) ? (m / 1000).toFixed(1) + "km" : m + "m";
    }

    function makeAlleyPath(p1, p2) {
        var dLat = Math.abs(p1[0] - p2[0]);
        var dLng = Math.abs(p1[1] - p2[1]);
        if (dLat < 15 || dLng < 15) return [p1, p2];
        var elbow = (dLat > dLng) ? [p2[0], p1[1]] : [p1[0], p2[1]];
        return [p1, elbow, p2];
    }

    // =========================================================
    // 3. 사이드바에 [🧭 길찾기] 탭 및 전용 UI 자동 주입 (경유지 UI 포함)
    // =========================================================
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
                    <button id="nav-mode-car" onclick="window.setNavMode('car')" style="flex:1; padding:7px 0; border:none; border-radius:5px; font-weight:bold; font-size:12.5px; cursor:pointer; background:rgba(255,255,255,0.2); color:#fff;">🚗 자동차/택시</button>
                    <button id="nav-mode-walk" onclick="window.setNavMode('walk')" style="flex:1; padding:7px 0; border:none; border-radius:5px; font-weight:bold; font-size:12.5px; cursor:pointer; background:rgba(255,255,255,0.2); color:#fff;">🚶 도보</button>
                </div>

                <div style="position:relative; margin-bottom:6px;">
                    <div style="display:flex; gap:4px;">
                        <input type="text" id="nav-start-input" placeholder="🟢 출발지 입력 또는 지도 클릭" oninput="window.searchNavPlace('start', this.value)" style="flex:1; padding:8px 10px; border:none; border-radius:4px; font-size:12.5px; font-weight:bold; color:#222; outline:none;">
                        <button onclick="window.enableNavMapPick('start')" title="지도에서 출발지 직접 찍기" style="background:#00c853; color:#fff; border:none; border-radius:4px; padding:0 9px; cursor:pointer; font-size:12px; font-weight:bold;">📍지도</button>
                    </div>
                    <div id="nav-start-suggest" style="display:none; position:absolute; top:36px; left:0; width:100%; background:#fff; color:#222; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.25); max-height:160px; overflow-y:auto; z-index:2000;"></div>
                </div>

                <!-- 🎯 경유지 컨테이너 및 추가 버튼 -->
                <div id="nav-waypoints-container"></div>
                <div style="text-align:center; margin-bottom:6px;">
                    <button onclick="window.addWaypointUI()" style="background:rgba(255,255,255,0.2); color:#fff; border:1px dashed #fff; border-radius:4px; padding:4px 10px; font-size:11.5px; font-weight:bold; cursor:pointer;">+ 경유지 추가 (최대 5개)</button>
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

    // 🎯 경유지 UI 제어 함수
    window.addWaypointUI = function() {
        if (!navState.waypoints) navState.waypoints = [];
        var activeCount = navState.waypoints.filter(wp => wp !== 'deleted').length;
        if (activeCount >= 5) {
            origAlert("경유지는 최대 5개까지만 추가할 수 있습니다.");
            return;
        }
        
        var idx = navState.waypoints.length;
        navState.waypoints.push(null); 

        var container = document.getElementById('nav-waypoints-container');
        var wpDiv = document.createElement('div');
        wpDiv.id = 'nav-waypoint-row-' + idx;
        wpDiv.style.position = 'relative';
        wpDiv.style.marginBottom = '6px';
        wpDiv.innerHTML = `
            <div style="display:flex; gap:4px;">
                <input type="text" id="nav-waypoint-input-${idx}" placeholder="🟡 경유지 입력 또는 지도 클릭" oninput="window.searchNavPlace('waypoint-${idx}', this.value)" style="flex:1; padding:8px 10px; border:none; border-radius:4px; font-size:12.5px; font-weight:bold; color:#222; outline:none; background:#fff3e0;">
                <button onclick="window.enableNavMapPick('waypoint-${idx}')" title="지도에서 직접 찍기" style="background:#ff9800; color:#fff; border:none; border-radius:4px; padding:0 9px; cursor:pointer; font-size:12px; font-weight:bold;">📍지도</button>
                <button onclick="window.removeWaypointUI(${idx})" style="background:rgba(255,255,255,0.3); color:#fff; border:none; border-radius:4px; padding:0 8px; cursor:pointer; font-size:12px; font-weight:bold;">X</button>
            </div>
            <div id="nav-waypoint-suggest-${idx}" style="display:none; position:absolute; top:36px; left:0; width:100%; background:#fff; color:#222; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.25); max-height:160px; overflow-y:auto; z-index:2000;"></div>
        `;
        container.appendChild(wpDiv);
    };

    window.removeWaypointUI = function(idx) {
        navState.waypoints[idx] = 'deleted'; 
        var row = document.getElementById('nav-waypoint-row-' + idx);
        if (row) row.remove();
    };

    // =========================================================
    // 4. 기존 마커 팝업 연동
    // =========================================================
    var origAlert = window.alert;
    window.alert = function(msg) {
        if (typeof msg === 'string') {
            var routeMatch = msg.match(/^(.+)\(으\)로 길찾기를 시작합니다\./);
            if (routeMatch) { window.openNavFromPopup(routeMatch[1].trim()); return; }
            var startMatch = msg.match(/^(.+)을\(를\) 출발지로 설정했습니다\./);
            if (startMatch) { window.setNavPointByName('start', startMatch[1].trim()); return; }
            var endMatch = msg.match(/^(.+)을\(를\) 도착지로 설정했습니다\./);
            if (endMatch) { window.setNavPointByName('end', endMatch[1].trim()); return; }
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
            if (asStart) { navState.end = pt; document.getElementById('nav-end-input').value = pt.name; window.enableNavMapPick('start'); } 
            else { navState.start = pt; document.getElementById('nav-start-input').value = pt.name; window.enableNavMapPick('end'); }
        } else {
            navState.end = pt; document.getElementById('nav-end-input').value = pt.name;
            map.closePopup(); window.executeNavigation();
        }
    };

    window.setNavPointByName = function(type, placeName) {
        initNavUI();
        var pt = window.findPlaceCoords(placeName);
        var sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) window.toggleSidebar();
        var navBtn = document.getElementById('tab-btn-nav');
        if (navBtn) window.switchTab('tab-nav', navBtn);

        if (type === 'start') { navState.start = pt; document.getElementById('nav-start-input').value = pt.name; } 
        else { navState.end = pt; document.getElementById('nav-end-input').value = pt.name; }
    };

    // =========================================================
    // 5. 검색창 자동완성 및 지도 클릭 지정 기능 (경유지 대응)
    // =========================================================
    window.searchNavPlace = function(type, keyword) {
        var boxId = type === 'start' ? 'nav-start-suggest' : type === 'end' ? 'nav-end-suggest' : 'nav-waypoint-suggest-' + type.split('-')[1];
        var box = document.getElementById(boxId);
        if (!box) return;
        var kw = (keyword || "").trim().toLowerCase();
        if (!kw || typeof allLandmarks === 'undefined') { box.style.display = 'none'; return; }

        var matches = allLandmarks.filter(function(m) {
            if (!m.name || !m.name.toLowerCase().includes(kw)) return false;
            if (m.type === 'subway' && !isStationTrulyOpened(m)) return false;
            return true;
        }).slice(0, 8);

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
            navState.start = pt; document.getElementById('nav-start-input').value = name; document.getElementById('nav-start-suggest').style.display = 'none';
        } else if (type === 'end') {
            navState.end = pt; document.getElementById('nav-end-input').value = name; document.getElementById('nav-end-suggest').style.display = 'none';
        } else if (type.startsWith('waypoint-')) {
            var idx = parseInt(type.split('-')[1]);
            navState.waypoints[idx] = pt; document.getElementById('nav-waypoint-input-' + idx).value = name; document.getElementById('nav-waypoint-suggest-' + idx).style.display = 'none';
        }
    };

    window.enableNavMapPick = function(target) {
        navState.pickTarget = target;
        var guide = document.getElementById('nav-pick-guide');
        if (guide) {
            guide.style.display = 'block';
            var txt = target === 'start' ? '🟢 <b>[출발지]</b>' : target === 'end' ? '🔴 <b>[도착지]</b>' : '🟡 <b>[경유지]</b>';
            guide.innerHTML = `👆 지도를 클릭하여 ${txt}를 찍어주세요!`;
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
            navState.start = pt; document.getElementById('nav-start-input').value = pt.name;
        } else if (navState.pickTarget === 'end') {
            navState.end = pt; document.getElementById('nav-end-input').value = pt.name;
        } else if (navState.pickTarget.startsWith('waypoint-')) {
            var idx = parseInt(navState.pickTarget.split('-')[1]);
            navState.waypoints[idx] = pt; document.getElementById('nav-waypoint-input-' + idx).value = pt.name;
        }

        navState.pickTarget = null;
        var guide = document.getElementById('nav-pick-guide');
        if (guide) guide.style.display = 'none';
        document.getElementById('map').style.cursor = 'default';
    });

window.setNavMode = function(mode) {
        navState.mode = mode;
        ['transit', 'car', 'walk'].forEach(function(m) {
            var btn = document.getElementById('nav-mode-' + m);
            if (!btn) return;
            if (m === mode) { btn.style.background = '#fff'; btn.style.color = '#258fff'; } 
            else { btn.style.background = 'rgba(255,255,255,0.2)'; btn.style.color = '#fff'; }
        });

        // ★ 모드 버튼을 누르는 순간 출발지나 도착지가 입력되어 있다면 즉시 길찾기 재실행
        if (navState.start && navState.end) {
            window.executeNavigation();
        }
    };

    window.swapNavPoints = function() {
        var temp = navState.start; navState.start = navState.end; navState.end = temp;
        document.getElementById('nav-start-input').value = navState.start ? navState.start.name : '';
        document.getElementById('nav-end-input').value = navState.end ? navState.end.name : '';
    };

    window.clearNavigation = function() {
        navState.start = null; navState.end = null; navState.waypoints = []; navState.routes = [];
        navLayer.clearLayers();
        document.getElementById('nav-start-input').value = '';
        document.getElementById('nav-end-input').value = '';
        document.getElementById('nav-waypoints-container').innerHTML = '';
        document.getElementById('nav-results-box').innerHTML = `<div style="padding:30px 10px; text-align:center; color:#888; font-size:12.5px;">출발지와 도착지를 설정해 주세요.</div>`;
    };
// =========================================================
    // 6. 🚗 [자동차 다익스트라(Dijkstra) 도로망 그래프 빌더]
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
            var weight = isExpress ? dist * 0.65 : dist;
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

        var sNode = 0, eNode = 0, minSD = Infinity, minED = Infinity;
        for (var i = 0; i < g.nodes.length; i++) {
            var ds = calcRealMeters(startPt.lat, startPt.lng, g.nodes[i].lat, g.nodes[i].lng);
            var de = calcRealMeters(endPt.lat, endPt.lng, g.nodes[i].lat, g.nodes[i].lng);
            if (ds < minSD) { minSD = ds; sNode = i; }
            if (de < minED) { minED = de; eNode = i; }
        }

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
            mainRoadCoords = makeAlleyPath([g.nodes[sNode].lat, g.nodes[sNode].lng], [g.nodes[eNode].lat, g.nodes[eNode].lng]);
            usedRoads = [g.nodes[sNode].roadName || "연결도로"];
        }

        var startAlley = makeAlleyPath([startPt.lat, startPt.lng], mainRoadCoords[0]);
        var endAlley = makeAlleyPath(mainRoadCoords[mainRoadCoords.length - 1], [endPt.lat, endPt.lng]);

        var totalMeter = minSD + minED;
        for (var i = 0; i < mainRoadCoords.length - 1; i++) {
            totalMeter += calcRealMeters(mainRoadCoords[i][0], mainRoadCoords[i][1], mainRoadCoords[i+1][0], mainRoadCoords[i+1][1]);
        }

        var durationMin = Math.max(2, Math.round(totalMeter / 550));
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
    // 7. 🚇🚌 [대중교통 길찾기 - 철도/전차 요금 분리 및 실제 거리/속도 계산]
    // =========================================================
    function formatTime(min) {
        return min >= 60 ? Math.floor(min / 60) + "시간 " + (min % 60) + "분" : min + "분";
    }

    function calcPathDist(coords) {
        if (!coords || coords.length < 2) return 0;
        var d = 0;
        for (var i = 0; i < coords.length - 1; i++) {
            d += calcRealMeters(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1]);
        }
        return Math.round(d);
    }

    function getTrainInfo(lineName, stops, realDistMeter) {
        if (lineName.includes("고속")) return { time: Math.round(realDistMeter / 2500) + stops, badge: "🚄 고속철도", type: "train_high", name: "고속열차(KTX/SRT 등)" };
        if (lineName.includes("강빈") || lineName.includes("일반")) return { time: Math.round(realDistMeter / 1250) + stops, badge: "🚆 일반철도", type: "train_normal", name: "일반열차(무궁화/ITX 등)" };
        if (lineName.includes("7호선")) return { time: stops * 3, badge: "🚋 노면전차", type: "tram", name: lineName };
        return { time: stops * 2, badge: "⚡ 지하철", type: "subway", name: lineName };
    }

    function calculateIntegratedFare(modes, totalDistMeter) {
        var baseFare = 0, has123 = false, hasBinhyo = false, isNormalTrain = false, isHighTrain = false;
        modes.forEach(function(m) {
            var fare = 1500;
            if (m.type === 'bus') fare = (m.code === '광역' || m.code === '공항') ? 2800 : (m.code === '좌석' || m.code === '급행') ? 1950 : 1400;
            else if (m.type === 'tram') fare = (totalDistMeter <= 8000 && modes.length === 1) ? 1350 : 1500;
            else if (m.type === 'train_high') { fare = 8400; isHighTrain = true; }
            else if (m.type === 'train_normal') { fare = 4800; isNormalTrain = true; }
            
            if (fare > baseFare) baseFare = fare;
            if (['1','2','2B','3'].includes(m.code)) has123 = true;
            if (m.code && m.code.includes('빈효') && m.type === 'subway') hasBinhyo = true;
        });

        if (isHighTrain || isNormalTrain) {
            var extra = isHighTrain ? Math.floor(totalDistMeter / 10000) * 1500 : Math.floor(totalDistMeter / 10000) * 1000;
            var trainFare = (isHighTrain ? 8400 : 4800) + extra;
            var busFare = 0, busMode = modes.find(m => m.type === 'bus');
            if (busMode) busFare = (busMode.code === '광역' || busMode.code === '공항') ? 2800 : (busMode.code === '좌석' || busMode.code === '급행') ? 1950 : 1400;
            return { cost: trainFare + busFare, text: `승차권 ${trainFare.toLocaleString()}원` + (busFare > 0 ? ` + 버스 ${busFare.toLocaleString()}원` : ``) };
        }

        var distExtra = 0;
        if (totalDistMeter > 10000) {
            distExtra = totalDistMeter <= 50000 ? Math.ceil((totalDistMeter - 10000) / 5000) * 100 : 800 + Math.ceil((totalDistMeter - 50000) / 8000) * 100;
        }

        var totalFare = baseFare + distExtra, penaltyText = "";
        if (has123 && hasBinhyo && modes.length > 1) { totalFare += 200; penaltyText += " (소프트환승+200)"; }
        if (hasBinhyo && totalDistMeter > 15000) { totalFare += 150; penaltyText += " (시계외+150)"; }

        return { cost: totalFare, text: `교통카드 ${totalFare.toLocaleString()}원${penaltyText}` };
    }

    function getSubwaySegmentCoords(lineCode, st1, st2) {
        var rawList = (typeof getOrderedUniqueStationsForLine === 'function') ? getOrderedUniqueStationsForLine(lineCode) : [];
        var list = rawList.filter(isStationTrulyOpened);
        var idx1 = list.findIndex(s => s.name === st1.name), idx2 = list.findIndex(s => s.name === st2.name);
        var isCircularLine = (lineCode === "2" || lineCode === "2B" || (typeof subwayLines !== 'undefined' && subwayLines[lineCode] && subwayLines[lineCode].name && subwayLines[lineCode].name.includes("순환")));
        var stationCoords = [], stopCount = 3;

        if (idx1 !== -1 && idx2 !== -1 && list.length > 2) {
            if (isCircularLine) {
                var len = list.length, forwardStops = (idx2 >= idx1) ? (idx2 - idx1) : (len - idx1 + idx2);
                var backwardStops = (idx1 >= idx2) ? (idx1 - idx2) : (len - idx2 + idx1);
                if (forwardStops <= backwardStops) { stopCount = forwardStops; for (var k = 0; k <= forwardStops; k++) { var curIdx = (idx1 + k) % len; stationCoords.push([list[curIdx].lat, list[curIdx].lng]); } }
                else { stopCount = backwardStops; for (var k = 0; k <= backwardStops; k++) { var curIdx = (idx1 - k + len) % len; stationCoords.push([list[curIdx].lat, list[curIdx].lng]); } }
            } else {
                stopCount = Math.abs(idx1 - idx2); var s = Math.min(idx1, idx2), e = Math.max(idx1, idx2);
                for (var i = s; i <= e; i++) stationCoords.push([list[i].lat, list[i].lng]);
                if (idx1 > idx2) stationCoords.reverse();
            }
        } else stationCoords = [[st1.lat, st1.lng], [st2.lat, st2.lng]];
        return { coords: stationCoords, stops: Math.max(1, stopCount) };
    }

    function addMixedRoute(data, results, startPt, endPt) {
        var bColor = (typeof busColors !== 'undefined' && busColors[data.bus.type]) ? busColors[data.bus.type] : "#01B7ED";
        var lInfo = (typeof subwayLines !== 'undefined' && subwayLines[data.subLine]) ? subwayLines[data.subLine] : { name: data.subLine + "호선", color: "#0077DD" };
        var realSegDist = calcPathDist(data.subSeg.coords);
        var trainMeta = getTrainInfo(lInfo.name, data.subSeg.stops, realSegDist);
        
        var low = Math.min(data.sIdx||data.tIdx, data.eIdx||data.tIdx), high = Math.max(data.sIdx||data.tIdx, data.eIdx||data.tIdx);
        var busSeg = data.bus.points.slice(low, high + 1);
        if ((data.sIdx||data.tIdx) > (data.eIdx||data.tIdx)) busSeg.reverse();
        var busSegDist = calcPathDist(busSeg);
        
        var totalDist = data.walkS + data.walkT + data.walkE + realSegDist + busSegDist;
        var totalMin = Math.round((data.walkS + data.walkT + data.walkE) / 65) + trainMeta.time + Math.max(3, Math.round(busSegDist / 400)) + 6;
        var fareInfo = calculateIntegratedFare([{ type: trainMeta.type, code: data.subLine }, { type: 'bus', code: data.bus.type }], totalDist);

        if (data.type === 'sub_bus') {
            results.push({
                title: `🎟️ ${trainMeta.name} ➔ 🚌 ${data.bus.name} (${data.tSt.name} 환승)`, badge: `🔄 복합 이동 (${trainMeta.badge}➔버스)`,
                timeMin: totalMin, distMeter: totalDist, costText: fareInfo.text, summary: `${data.sSt.name} 승차 ➔ ${data.tSt.name} 하차 ➔ 버스 이용`,
                steps: [
                    `🚶 <b>${startPt.name}</b>에서 <b>${data.sSt.name}</b>까지 도보 (${formatDist(data.walkS)})`,
                    `🎟️ <span style="color:${lInfo.color}; font-weight:bold;">[${trainMeta.name}]</span> <b>${data.sSt.name}</b> 승차 (${data.subSeg.stops}개 역, 약 ${trainMeta.time}분)`,
                    `🔄 <b>${data.tSt.name}</b> 하차 후 버스정류장 도보 (${formatDist(data.walkT)})`,
                    `🚌 <span style="color:${bColor}; font-weight:bold;">[${data.bus.type}] ${data.bus.name}</span> 승차 ➔ 🔴 <b>${endPt.name}</b> 부근 하차`
                ],
                drawLayers: [{ pts: makeAlleyPath([startPt.lat, startPt.lng], [data.sSt.lat, data.sSt.lng]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: data.subSeg.coords, color: lInfo.color, weight: 8, dash: null }, { pts: makeAlleyPath([data.tSt.lat, data.tSt.lng], busSeg[0] || [data.tSt.lat, data.tSt.lng]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: busSeg, color: bColor, weight: 7, dash: null }, { pts: makeAlleyPath(busSeg[busSeg.length-1] || [endPt.lat, endPt.lng], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }]
            });
        } else {
            results.push({
                title: `🚌 ${data.bus.name} ➔ 🎟️ ${trainMeta.name} (${data.tSt.name} 환승)`, badge: `🔄 복합 이동 (버스➔${trainMeta.badge})`,
                timeMin: totalMin, distMeter: totalDist, costText: fareInfo.text, summary: `버스 승차 ➔ ${data.tSt.name} 하차 ➔ 철도 이용`,
                steps: [
                    `🚶 <b>${startPt.name}</b>에서 정류장까지 도보 (${formatDist(data.walkS)})`,
                    `🚌 <span style="color:${bColor}; font-weight:bold;">[${data.bus.type}] ${data.bus.name}</span> 승차 후 <b>${data.tSt.name}</b> 부근 하차`,
                    `🔄 <b>${data.tSt.name}</b>까지 도보 이동 (${formatDist(data.walkT)})`,
                    `🎟️ <span style="color:${lInfo.color}; font-weight:bold;">[${trainMeta.name}]</span> <b>${data.tSt.name}</b> 승차 (${data.subSeg.stops}개 역, 약 ${trainMeta.time}분) ➔ 🔴 <b>${endPt.name}</b> 도착`
                ],
                drawLayers: [{ pts: makeAlleyPath([startPt.lat, startPt.lng], busSeg[0] || [startPt.lat, startPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: busSeg, color: bColor, weight: 7, dash: null }, { pts: makeAlleyPath(busSeg[busSeg.length-1] || [data.tSt.lat, data.tSt.lng], [data.tSt.lat, data.tSt.lng]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: data.subSeg.coords, color: lInfo.color, weight: 8, dash: null }, { pts: makeAlleyPath([data.eSt.lat, data.eSt.lng], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }]
            });
        }
    }

    function computeTransitRoutes(startPt, endPt) {
        var results = [];
        var openedSubways = (typeof allLandmarks !== 'undefined') ? allLandmarks.filter(isStationTrulyOpened) : [];
        var sStations = [], eStations = [];

        if (openedSubways.length > 0) {
            sStations = openedSubways.map(s => ({ st: s, d: calcRealMeters(startPt.lat, startPt.lng, s.lat, s.lng) })).sort((a,b) => a.d - b.d).slice(0, 6);
            eStations = openedSubways.map(s => ({ st: s, d: calcRealMeters(endPt.lat, endPt.lng, s.lat, s.lng) })).sort((a,b) => a.d - b.d).slice(0, 6);

            var directSubways = [];
            for (var i = 0; i < sStations.length; i++) {
                for (var j = 0; j < eStations.length; j++) {
                    var sSt = sStations[i].st, eSt = eStations[j].st;
                    if (sSt.name === eSt.name) continue;
                    var commonLines = getStationOpenedLines(sSt).filter(l => getStationOpenedLines(eSt).includes(l));
                    commonLines.forEach(function(lc) {
                        var lInfo = (typeof subwayLines !== 'undefined' && subwayLines[lc]) ? subwayLines[lc] : { name: lc + "호선", color: "#0077DD" };
                        var seg = getSubwaySegmentCoords(lc, sSt, eSt);
                        var realSegDist = calcPathDist(seg.coords);
                        var distMeter = sStations[i].d + eStations[j].d + realSegDist;
                        var trainMeta = getTrainInfo(lInfo.name, seg.stops, realSegDist);
                        var fareInfo = calculateIntegratedFare([{ type: trainMeta.type, code: lc }], distMeter);
                        
                        directSubways.push({
                            title: `🎟️ ${trainMeta.name} 직통 (${sSt.name} ➔ ${eSt.name})`, badge: trainMeta.badge,
                            timeMin: Math.round((sStations[i].d + eStations[j].d) / 65) + trainMeta.time + 3, distMeter: distMeter, costText: fareInfo.text,
                            summary: `${sSt.name} 승차 ➔ ${seg.stops}개 역 이동 ➔ ${eSt.name} 하차`,
                            steps: [
                                `🚶 <b>${startPt.name}</b>에서 <b>${sSt.name}</b>까지 도보 이동 (${formatDist(sStations[i].d)})`,
                                `🎟️ <span style="color:${lInfo.color}; font-weight:bold;">[${trainMeta.name}]</span> <b>${sSt.name}</b> 승차 (${seg.stops}개 역, 약 ${trainMeta.time}분)`,
                                `🚉 <b>${eSt.name}</b> 하차 후 도보 이동 (${formatDist(eStations[j].d)})`, `🔴 <b>${endPt.name}</b> 도착`
                            ],
                            drawLayers: [{ pts: makeAlleyPath([startPt.lat, startPt.lng], [sSt.lat, sSt.lng]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: seg.coords, color: lInfo.color, weight: 8, dash: null }, { pts: makeAlleyPath([eSt.lat, eSt.lng], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }]
                        });
                    });
                }
            }
            var uniqueDirect = [];
            directSubways.sort((a,b) => a.timeMin - b.timeMin).forEach(r => { if (!uniqueDirect.find(u => u.title === r.title)) uniqueDirect.push(r); });
            results.push(...uniqueDirect.slice(0, 3));
        }

        if (typeof processedBusData !== 'undefined' && Array.isArray(processedBusData)) {
            var validBuses = [];
            processedBusData.forEach(function(bus) {
                if (!bus.points || bus.points.length < 2) return;
                var sIdx = 0, eIdx = 0, minS = Infinity, minE = Infinity;
                for (var i = 0; i < bus.points.length; i++) {
                    var ds = calcRealMeters(startPt.lat, startPt.lng, bus.points[i][0], bus.points[i][1]), de = calcRealMeters(endPt.lat, endPt.lng, bus.points[i][0], bus.points[i][1]);
                    if (ds < minS) { minS = ds; sIdx = i; }
                    if (de < minE) { minE = de; eIdx = i; }
                }
                if (sIdx !== eIdx && minS < 1500 && minE < 1500) validBuses.push({ bus: bus, sIdx: sIdx, eIdx: eIdx, walkS: minS, walkE: minE, score: minS + minE });
            });
            validBuses.sort((a,b) => a.score - b.score).slice(0,4).forEach(function(bestBus) {
                var b = bestBus.bus, bColor = (typeof busColors !== 'undefined' && busColors[b.type]) ? busColors[b.type] : "#01B7ED";
                var low = Math.min(bestBus.sIdx, bestBus.eIdx), high = Math.max(bestBus.sIdx, bestBus.eIdx);
                var busSegPts = b.points.slice(low, high + 1);
                if (bestBus.sIdx > bestBus.eIdx) busSegPts.reverse();
                var busSegDist = calcPathDist(busSegPts);
                var distMeter = bestBus.walkS + bestBus.walkE + busSegDist;
                var fareInfo = calculateIntegratedFare([{ type: 'bus', code: b.type }], distMeter);
                results.push({
                    title: `🚌 [${b.type}] ${b.name}`, badge: "🚍 시내버스",
                    timeMin: Math.round((bestBus.walkS + bestBus.walkE) / 65) + Math.max(4, Math.round(busSegDist / 400)) + 5, distMeter: distMeter, costText: fareInfo.text,
                    summary: `인근 정류장 승차 ➔ 약 ${Math.max(2, Math.round(busSegPts.length * 0.8))}개 정류장 이동 ➔ 하차`,
                    steps: [`🚶 <b>${startPt.name}</b>에서 승차 정류장까지 도보`, `🚌 <span style="color:${bColor}; font-weight:bold;">[${b.type}] ${b.name}</span> 승차`, `🚏 하차 정류장에서 <b>${endPt.name}</b>까지 도보`],
                    drawLayers: [{ pts: makeAlleyPath([startPt.lat, startPt.lng], busSegPts[0]), color: "#666666", weight: 4, dash: "5, 6" }, { pts: busSegPts, color: bColor, weight: 7, dash: null }, { pts: makeAlleyPath(busSegPts[busSegPts.length - 1], [endPt.lat, endPt.lng]), color: "#666666", weight: 4, dash: "5, 6" }]
                });
            });
        }

        if (typeof processedBusData !== 'undefined' && Array.isArray(processedBusData) && openedSubways.length > 0) {
            var subToBusList = [], busToSubList = [];
            sStations.forEach(function(sStObj) {
                processedBusData.forEach(function(b) {
                    if (!b.points || b.points.length < 2) return;
                    var minE = Infinity, eIdx = -1;
                    for(var i=0; i<b.points.length; i++) { var d = calcRealMeters(endPt.lat, endPt.lng, b.points[i][0], b.points[i][1]); if (d < minE) { minE = d; eIdx = i; } }
                    if (minE > 1200) return;
                    var sOpenLines = getStationOpenedLines(sStObj.st);
                    openedSubways.forEach(function(tSt) {
                        if (tSt.name === sStObj.st.name) return;
                        var commonLines = sOpenLines.filter(l => getStationOpenedLines(tSt).includes(l));
                        if (commonLines.length === 0) return;
                        var minT = Infinity, tIdx = -1;
                        for(var j=0; j<b.points.length; j++) { var d2 = calcRealMeters(tSt.lat, tSt.lng, b.points[j][0], b.points[j][1]); if (d2 < minT) { minT = d2; tIdx = j; } }
                        if (minT < 400 && tIdx !== eIdx) {
                            var subSeg = getSubwaySegmentCoords(commonLines[0], sStObj.st, tSt);
                            subToBusList.push({ type: 'sub_bus', subLine: commonLines[0], tSt: tSt, bus: b, tIdx: tIdx, eIdx: eIdx, subSeg: subSeg, walkS: sStObj.d, walkT: minT, walkE: minE, sSt: sStObj.st, score: (subSeg.stops * 2) + Math.abs(tIdx - eIdx) * 1.5 + (sStObj.d + minT + minE) / 65 });
                        }
                    });
                });
            });
            eStations.forEach(function(eStObj) {
                processedBusData.forEach(function(b) {
                    if (!b.points || b.points.length < 2) return;
                    var minS = Infinity, sIdx = -1;
                    for(var i=0; i<b.points.length; i++) { var d = calcRealMeters(startPt.lat, startPt.lng, b.points[i][0], b.points[i][1]); if (d < minS) { minS = d; sIdx = i; } }
                    if (minS > 1200) return;
                    var eOpenLines = getStationOpenedLines(eStObj.st);
                    openedSubways.forEach(function(tSt) {
                        if (tSt.name === eStObj.st.name) return;
                        var commonLines = eOpenLines.filter(l => getStationOpenedLines(tSt).includes(l));
                        if (commonLines.length === 0) return;
                        var minT = Infinity, tIdx = -1;
                        for(var j=0; j<b.points.length; j++) { var d2 = calcRealMeters(tSt.lat, tSt.lng, b.points[j][0], b.points[j][1]); if (d2 < minT) { minT = d2; tIdx = j; } }
                        if (minT < 400 && sIdx !== tIdx) {
                            var subSeg = getSubwaySegmentCoords(commonLines[0], tSt, eStObj.st);
                            busToSubList.push({ type: 'bus_sub', subLine: commonLines[0], tSt: tSt, bus: b, sIdx: sIdx, tIdx: tIdx, subSeg: subSeg, walkS: minS, walkT: minT, walkE: eStObj.d, eSt: eStObj.st, score: (subSeg.stops * 2) + Math.abs(tIdx - sIdx) * 1.5 + (minS + minT + eStObj.d) / 65 });
                        }
                    });
                });
            });
            subToBusList.sort((a,b) => a.score - b.score).slice(0,2).forEach(d => addMixedRoute(d, results, startPt, endPt));
            busToSubList.sort((a,b) => a.score - b.score).slice(0,2).forEach(d => addMixedRoute(d, results, startPt, endPt));
        }

        if (results.length === 0) results.push((typeof computeWalkRoute === 'function') ? computeWalkRoute(startPt, endPt) : { title: "도보", timeMin: 0, distMeter: 0, costText: "", steps: [], drawLayers: [] });
        
        var finalResults = [], seenTitles = new Set();
        results.sort((a, b) => a.timeMin - b.timeMin).forEach(r => { if (!seenTitles.has(r.title)) { seenTitles.add(r.title); finalResults.push(r); } });
        return finalResults;
    }

    // =========================================================
    // 8. 🚶 [도보 길찾기]
    // =========================================================
    function computeWalkRoute(startPt, endPt) {
        var directMeter = calcRealMeters(startPt.lat, startPt.lng, endPt.lat, endPt.lng);
        var midLat = (startPt.lat + endPt.lat) / 2;
        var midLng = (startPt.lng + endPt.lng) / 2;
        var walkPts = [
            [startPt.lat, startPt.lng],
            [midLat, startPt.lng],
            [midLat, midLng],
            [endPt.lat, midLng],
            [endPt.lat, endPt.lng]
        ];
        var walkMeter = Math.round(directMeter * 1.28);
        var walkMin = Math.max(1, Math.round(walkMeter / 67));
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
    // 9. 길찾기 실행 및 지도 위에 경로 렌더링 (대중교통/자동차/도보 공통 다중 경유 완벽 지원)
    // =========================================================
    window.executeNavigation = function() {
        if (!navState.start || !navState.end) { origAlert("출발지와 도착지를 모두 지정해 주세요!"); return; }

        var points = [navState.start];
        if (navState.waypoints && Array.isArray(navState.waypoints)) {
            points = points.concat(navState.waypoints.filter(w => w !== null && w !== 'deleted').slice(0, 5));
        }
        points.push(navState.end);

        // 경유지가 없을 때
        if (points.length <= 2) {
            if (navState.mode === 'transit') navState.routes = computeTransitRoutes(points[0], points[1]);
            else if (navState.mode === 'car') { var c = typeof computeCarRoute === 'function' ? computeCarRoute(points[0], points[1]) : null; navState.routes = c ? [c] : []; }
            else navState.routes = [computeWalkRoute(points[0], points[1])];
        } 
        // 경유지가 있을 때 (대중교통, 자동차, 도보 모두 구간별로 엮어서 통합 계산)
        else {
            var maxAlternatives = navState.mode === 'transit' ? 3 : 1;
            var finalCombinations = [];

            var firstSegRoutes = [];
            if (navState.mode === 'transit') firstSegRoutes = computeTransitRoutes(points[0], points[1]);
            else if (navState.mode === 'car') { var c1 = typeof computeCarRoute === 'function' ? computeCarRoute(points[0], points[1]) : null; if(c1) firstSegRoutes.push(c1); }
            else firstSegRoutes.push(computeWalkRoute(points[0], points[1]));
            firstSegRoutes = firstSegRoutes.filter(Boolean);

            if (firstSegRoutes.length === 0) {
                origAlert("설정한 경로에 대한 주행/보행 길을 찾을 수 없습니다.");
                return;
            }

            for (var alt = 0; alt < Math.min(firstSegRoutes.length, maxAlternatives); alt++) {
                var base = firstSegRoutes[alt];
                var baseCost = Number(String(base.costText).replace(/[^0-9]/g, "")) || 0;
                
                var combinedRoute = {
                    title: navState.mode === 'car' ? `자동차 다중 경유 (경로 ${alt + 1})` : (navState.mode === 'walk' ? `도보 다중 경유 (경로 ${alt + 1})` : `다중 경유 (대안 ${alt + 1})`),
                    badge: alt === 0 ? "🏁 최적 전체경로" : "🏁 대안 전체경로",
                    timeMin: base.timeMin,
                    distMeter: base.distMeter,
                    totalCostNum: baseCost,
                    summary: `첫 구간: ${base.title} 기반`,
                    steps: [`<div style="background:#eef6ff; color:#258fff; font-weight:bold; padding:4px 8px; margin:6px 0; border-radius:4px;">[구간 1] ${points[0].name} ➔ ${points[1].name}</div>`].concat(base.steps),
                    drawLayers: [...base.drawLayers]
                };

                var isFailed = false;
                for (var i = 1; i < points.length - 1; i++) {
                    var segStart = points[i], segEnd = points[i+1], nextRoutes = [];
                    if (navState.mode === 'transit') nextRoutes = computeTransitRoutes(segStart, segEnd);
                    else if (navState.mode === 'car') { var c2 = typeof computeCarRoute === 'function' ? computeCarRoute(segStart, segEnd) : null; if(c2) nextRoutes.push(c2); }
                    else nextRoutes.push(computeWalkRoute(segStart, segEnd));
                    nextRoutes = nextRoutes.filter(Boolean);

                    var nextBest = nextRoutes[0];
                    if (nextBest) {
                        combinedRoute.timeMin += nextBest.timeMin;
                        combinedRoute.distMeter += nextBest.distMeter;
                        var nextCost = Number(String(nextBest.costText).replace(/[^0-9]/g, "")) || 0;
                        combinedRoute.totalCostNum += nextCost;
                        
                        combinedRoute.steps.push(`<div style="background:#eef6ff; color:#258fff; font-weight:bold; padding:4px 8px; margin:6px 0; border-radius:4px;">[구간 ${i+1}] ${segStart.name} ➔ ${segEnd.name}</div>`);
                        combinedRoute.steps = combinedRoute.steps.concat(nextBest.steps);
                        combinedRoute.drawLayers = combinedRoute.drawLayers.concat(nextBest.drawLayers);
                    } else {
                        isFailed = true;
                        break;
                    }
                }
                
                if (!isFailed) {
                    if (navState.mode === 'car') {
                        var taxiTotal = 4800 + Math.max(0, Math.ceil((combinedRoute.distMeter - 1600) / 131) * 100);
                        combinedRoute.costText = `택시비 총액 약 ${taxiTotal.toLocaleString()}원`;
                    } else if (navState.mode === 'walk') {
                        combinedRoute.costText = `소모 열량 약 ${Math.round(combinedRoute.timeMin * 4.2)}kcal`;
                    } else {
                        combinedRoute.costText = combinedRoute.totalCostNum > 0 ? `총 운임 약 ${combinedRoute.totalCostNum.toLocaleString()}원` : "무료 이동";
                    }
                    finalCombinations.push(combinedRoute);
                }
            }
            navState.routes = finalCombinations;
        }

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
            L.polyline(dl.pts, { color: "#ffffff", weight: dl.weight + 4, opacity: 0.9, interactive: false }).addTo(navLayer);
            L.polyline(dl.pts, { color: dl.color, weight: dl.weight, dashArray: dl.dash, opacity: 0.95, interactive: false }).addTo(navLayer);
        });
        
        var pointsToMark = [navState.start];
        if (navState.waypoints) pointsToMark = pointsToMark.concat(navState.waypoints.filter(w => w !== null && w !== 'deleted').slice(0, 5));
        pointsToMark.push(navState.end);

        pointsToMark.forEach((pt, idx) => {
            var isStart = idx === 0, isEnd = idx === pointsToMark.length - 1;
            var label = isStart ? `🟢 출발: ${pt.name}` : (isEnd ? `🔴 도착: ${pt.name}` : `🟡 경유: ${pt.name}`);
            var bgColor = isStart ? "#00c853" : (isEnd ? "#ff5252" : "#ff9800");
            var icon = L.divIcon({
                className: '',
                html: `<div style="background:${bgColor}; color:#fff; font-weight:900; font-size:12px; padding:4px 10px; border-radius:16px; border:2.5px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:nowrap;">${label}</div>`,
                iconSize: [100, 28], iconAnchor: [50, 14]
            });
            L.marker([pt.lat, pt.lng], { icon: icon, zIndexOffset: 3000 }).addTo(navLayer);
        });

        if (allPts.length > 1) map.fitBounds(L.latLngBounds(allPts), { padding: [70, 70] });
    };

    window.renderNavCards = function() {
        var box = document.getElementById('nav-results-box');
        if (!box) return;
        box.innerHTML = navState.routes.map(function(r, idx) {
            var stepsHtml = r.steps.map(s => `<div style="padding:6px 0; border-bottom:1px dashed #eee; font-size:12px; color:#444;">${s}</div>`).join('');
            return `
                <div style="background:#fff; border:2px solid ${idx === 0 ? '#258fff' : '#ddd'}; border-radius:8px; padding:12px; margin-bottom:10px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                    <div onclick="window.renderNavRouteOnMap(${idx}); var detail = this.nextElementSibling; detail.style.display = detail.style.display === 'none' ? 'block' : 'none';" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="background:#eef6ff; color:#258fff; font-size:11px; font-weight:bold; padding:2px 7px; border-radius:4px;">${r.badge}</span>
                            <span style="font-size:11.5px; color:#009000; font-weight:bold;">${r.costText}</span>
                        </div>
                        <div style="font-size:18px; font-weight:900; color:#111; margin-bottom:4px;">
                            ${formatTime(r.timeMin)} <span style="font-size:13px; font-weight:normal; color:#666;">(${formatDist(r.distMeter)})</span>
                        </div>
                        <div style="font-size:12.5px; font-weight:bold; color:#333; margin-bottom:4px;">${r.title}</div>
                        <div style="font-size:11px; color:#888;">${r.summary} <span style="color:#258fff;">[상세보기 ▼]</span></div>
                    </div>
                    <div style="display:none; background:#f8f9fa; padding:10px; border-radius:6px; margin-top:10px; border:1px solid #eee;">
                        ${stepsHtml}
                    </div>
                </div>
            `;
        }).join('');
    };
})();

// =========================================================
// 🏪 편의점 브랜드 필터링 시스템 (클러스터 최적화)
// =========================================================
window.addEventListener('DOMContentLoaded', function() {
    var cvsFilterContainer = document.getElementById('cvs-filter-list');
    if (cvsFilterContainer) {
        // 브랜드와 고유 색상 정의
        var brands = [
            { name: "GS25", color: "#0072BC" },
            { name: "CU", color: "#652D90" },
            { name: "세븐일레븐", color: "#008061" },
            { name: "이마트24", color: "#FFB81C" },
            { name: "스토리웨이", color: "#009045" },
            { name: "미니스톱", color: "#003DA5" },
            { name: "기타", color: "#333333" }
        ];

        // 체크박스 동적 생성
        brands.forEach(function(brand) {
            var filterItem = document.createElement('label'); 
            filterItem.className = 'filter-item';
            
            var fChk = document.createElement('input'); 
            fChk.type = 'checkbox'; fChk.value = brand.name; fChk.checked = true; fChk.name = 'cvsFilter';
            fChk.onchange = window.applyCvsFilter; 
            
            var fDot = document.createElement('div'); 
            fDot.className = 'filter-color-dot'; fDot.style.backgroundColor = brand.color;
            
            filterItem.appendChild(fChk); 
            filterItem.appendChild(fDot); 
            filterItem.appendChild(document.createTextNode(brand.name));
            
            cvsFilterContainer.appendChild(filterItem);
        });
    }
});

// 패널 열기/닫기
window.toggleCvsFilterBox = function() {
    var box = document.getElementById('cvs-filter-box');
    var btn = document.getElementById('cvs-filter-btn');
    if (box.style.display === 'block') {
        box.style.display = 'none';
        btn.classList.remove('active-btn');
    } else {
        box.style.display = 'block';
        btn.classList.add('active-btn');
        if (!map.hasLayer(cvsLayer)) map.addLayer(cvsLayer);
    }
};

// 전체 선택 / 해제
window.toggleAllCvsFilters = function(isChecked) {
    document.querySelectorAll('input[name="cvsFilter"]').forEach(cb => cb.checked = isChecked);
    window.applyCvsFilter();
};

// 필터 적용 엔진 (렉 방지를 위해 배열에 모아서 한 번에 렌더링)
window.applyCvsFilter = function() {
    var checkedBrands = [];
    document.querySelectorAll('input[name="cvsFilter"]:checked').forEach(cb => checkedBrands.push(cb.value));

    // 기존 편의점 마커를 모두 지도에서 내림
    cvsLayer.clearLayers();
    var markersToAdd = [];

    // 메모리에 캐싱된 모든 마커를 순회하며 필터링
    activeMarkers.forEach(function(marker) {
        if (marker.subCategory === 'cvs') {
            // 말풍선 내용으로 브랜드를 역추적
            var tooltipText = marker.getTooltip() ? marker.getTooltip().getContent().replace(/<[^>]*>?/gm, '') : "";
            
            var brand = "기타";
            if (tooltipText.includes("GS25") || tooltipText.includes("GS")) brand = "GS25";
            else if (tooltipText.includes("CU")) brand = "CU";
            else if (tooltipText.includes("세븐일레븐")) brand = "세븐일레븐";
            else if (tooltipText.includes("이마트24") || tooltipText.includes("이마트 24")) brand = "이마트24";
            else if (tooltipText.includes("스토리웨이")) brand = "스토리웨이";
            else if (tooltipText.includes("미니스톱")) brand = "미니스톱";

            // 체크된 브랜드에 포함되면 렌더링 대기열에 추가
            if (checkedBrands.includes(brand)) {
                markersToAdd.push(marker);
            }
        }
    });
    
    // 모아둔 마커를 클러스터에 한 방에 던져서 렉 없이 렌더링
    cvsLayer.addLayers(markersToAdd);
};