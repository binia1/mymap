// =========================================================
// 🚌 1. 카카오맵 스타일 버스 정류장 생성 및 실시간 팝업 시스템
// =========================================================

// 카카오맵 스타일 팝업 CSS 주입
var kakaoBusStyle = document.createElement('style');
kakaoBusStyle.innerHTML = `
    .kakao-bus-popup { font-family: 'Noto Sans KR', sans-serif; width: 280px; padding: 0; }
    .kakao-bus-popup-header { background: #fff; padding: 12px 15px; border-bottom: 1px solid #eee; border-radius: 8px 8px 0 0; }
    .kakao-bus-popup-title { font-size: 16px; font-weight: 900; color: #222; margin-bottom: 4px; }
    .kakao-bus-popup-meta { font-size: 11px; color: #888; }
    .kakao-bus-list { max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 5px 10px; border-radius: 0 0 8px 8px; }
    .kakao-bus-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid #eaeaea; }
    .kakao-bus-item:last-child { border-bottom: none; }
    .kakao-bus-badge { font-size: 10px; padding: 2px 4px; border-radius: 3px; color: #fff; font-weight: bold; margin-right: 6px; }
    .kakao-bus-name { font-size: 13px; font-weight: bold; color: #333; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kakao-bus-time { font-size: 12px; font-weight: bold; color: #ea4335; text-align: right; width: 60px; }
    .kakao-bus-time.no-info { color: #999; font-weight: normal; }
    .kakao-bus-btn-group { display: flex; gap: 5px; margin-top: 10px; }
    .kakao-bus-btn { flex: 1; padding: 6px; border: 1px solid #ddd; background: #fff; border-radius: 4px; font-size: 11px; cursor: pointer; color: #555; text-align: center; font-weight: bold; }
    .kakao-bus-btn.primary { background: #258fff; color: #fff; border-color: #258fff; }
`;
document.head.appendChild(kakaoBusStyle);

function renderKakaoBusStopPopup(marker, item) {
    var stopId = "ID: " + (31000 + (Math.abs(Math.round(item.lat)) % 1000));
    var direction = "양방향 경유지";
    var busListHtml = "";
    
    if (item.rawBuses && item.rawBuses.length > 0) {
        item.rawBuses.sort((a,b) => {
            var numA = parseInt((a.name.match(/\d+/) || [0])[0]);
            var numB = parseInt((b.name.match(/\d+/) || [0])[0]);
            return numA - numB;
        });

        busListHtml = item.rawBuses.map(b => {
            var randomTime = Math.floor(Math.random() * 20);
            var timeHtml = randomTime < 15 ? `${randomTime}분` : `<span class="no-info">정보없음</span>`;
            return `
                <div class="kakao-bus-item">
                    <span class="kakao-bus-badge" style="background:${b.color};">${b.type}</span>
                    <span class="kakao-bus-name">${b.name}</span>
                    <span class="kakao-bus-time">${timeHtml}</span>
                </div>
            `;
        }).join('');
    } else {
        busListHtml = `<div style="padding:15px; text-align:center; color:#999; font-size:12px;">경유하는 노선이 없습니다.</div>`;
    }

    var popupHtml = `
        <div class="kakao-bus-popup">
            <div class="kakao-bus-popup-header">
                <div class="kakao-bus-popup-title">${item.name.replace(' 정류장', '')}</div>
                <div class="kakao-bus-popup-meta">${stopId} | ${direction}</div>
                <div class="kakao-bus-btn-group">
                    <button class="kakao-bus-btn" onclick="alert('로드뷰를 실행합니다.')">💧 로드뷰</button>
                    <button class="kakao-bus-btn primary" onclick="alert('${item.name} 출발지로 길찾기를 시작합니다.')">↱ 길찾기</button>
                </div>
            </div>
            <div class="kakao-bus-list">
                <div style="font-size:11px; color:#555; padding:5px 0 8px 0; border-bottom:1px solid #ccc; margin-bottom:5px;">실시간 버스 정보 <span style="float:right; cursor:pointer;" onclick="this.innerHTML='↻ 업데이트됨'">↻ 새로고침</span></div>
                ${busListHtml}
            </div>
        </div>
    `;
    marker.bindPopup(popupHtml, { minWidth: 280, maxWidth: 280, className: 'kakao-popup-wrapper' });
}

function autoGenerateBusStops() {
    var sourceBuses = (typeof processedBusData !== 'undefined') ? processedBusData : (typeof busData !== 'undefined' ? busData : []);
    if (!sourceBuses || sourceBuses.length === 0) { alert("버스 노선 데이터가 없습니다!"); return; }

    var existingAutoStops = myLandmarks.filter(m => m.type === 'busStop' && m.isManual !== true);
    if (existingAutoStops.length > 0) {
        var overwrite = confirm(`이미 자동 생성된 정류장이 있습니다.\n기존 정류장을 지우고 카카오맵 UI로 다시 생성하시겠습니까?\n\n(※ 일반 마커는 절대 건드리지 않습니다.)`);
        if (!overwrite) return;
    }

    var btn = document.getElementById('auto-bus-stop-btn');
    if (btn) btn.innerHTML = "⏳ 카카오맵 UI 생성 중...";

    // 일반 시설 마커 완벽 보호, 버스 정류장만 초기화
    myLandmarks = myLandmarks.filter(m => m.type !== 'busStop' || m.isManual === true);
    if (typeof busStopLayer !== 'undefined') {
        busStopLayer.eachLayer(function(layer) {
            if (!layer.isManualMarker) busStopLayer.removeLayer(layer);
        });
    }

    var allBusPoints = [];
    var intervalMap = { "마을": 350, "지선": 600, "간선": 800 };
    
    // ★ 이중 보정 금지: 지도에 그려진 선로 레이어에서 100% 쌩좌표를 뜯어옴
    function getSafeLinePts(busName, fallbackPts) {
        let pts = [];
        if (window.busLineLayer) {
            window.busLineLayer.eachLayer(layer => {
                if (layer.rawBusName === busName) {
                    let ll = layer.getLatLngs();
                    if (ll.length > 0 && Array.isArray(ll[0])) ll = ll[0]; 
                    pts = ll.map(p => ({lat: p.lat, lng: p.lng}));
                }
            });
        }
        if (pts.length > 0) return pts;
        let adjY = (typeof adjustY !== 'undefined') ? adjustY : 0;
        return fallbackPts.map(p => ({ lat: (p.lat !== undefined ? p.lat : p[0]) + adjY, lng: (p.lng !== undefined ? p.lng : p[1]) }));
    }

    sourceBuses.forEach(bus => {
        if (["좌석", "급행", "광역", "공항", "투어", "순환", "시티투어"].includes(bus.type)) return; 
        
        var pts = getSafeLinePts(bus.name, bus.points);
        var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
        var interval = intervalMap[bus.type];
        
        if (interval) {
            var currentDist = 0;
            for (var i = 0; i < pts.length - 1; i++) {
                var p1 = pts[i]; var p2 = pts[i+1];
                allBusPoints.push({ lat: p1.lat, lng: p1.lng, busType: bus.type, busName: bus.name, color: bColor });
                
                var segDist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
                var distLeft = segDist; var currPt = p1;
                while (currentDist + distLeft >= interval) {
                    var walk = interval - currentDist;
                    var ratio = walk / segDist;
                    var newLat = currPt.lat + (p2.lat - currPt.lat) * ratio;
                    var newLng = currPt.lng + (p2.lng - currPt.lng) * ratio;
                    allBusPoints.push({ lat: newLat, lng: newLng, busType: bus.type, busName: bus.name, color: bColor });
                    currPt = { lat: newLat, lng: newLng }; distLeft -= walk; segDist -= walk; currentDist = 0;
                }
                currentDist += distLeft;
            }
            allBusPoints.push({ lat: pts[pts.length-1].lat, lng: pts[pts.length-1].lng, busType: bus.type, busName: bus.name, color: bColor });
        }
    });

    // 반경 250m 내에서 클러스터링 (일반 마커 침범 절대 안함)
    var clusters = [];
    allBusPoints.forEach(pt => {
        var joined = false;
        for (var i = 0; i < clusters.length; i++) {
            var c = clusters[i];
            var dist = Math.sqrt(Math.pow(pt.lat - c.lat, 2) + Math.pow(pt.lng - c.lng, 2));
            if (dist < 250) { 
                if (!c.buses.find(b => b.name === pt.busName)) {
                    c.buses.push({ type: pt.busType, name: pt.busName, color: pt.color });
                }
                joined = true; break; 
            }
        }
        if (!joined) clusters.push({ lat: pt.lat, lng: pt.lng, buses: [{ type: pt.busType, name: pt.busName, color: pt.color }] });
    });

    var addedCount = 0;

    clusters.forEach(c => {
        var nearby = window.allLandmarks.map(lm => {
            return { name: lm.name, dist: Math.sqrt(Math.pow(c.lat - lm.lat, 2) + Math.pow(c.lng - lm.lng, 2)), type: lm.type };
        }).filter(lm => lm.dist < 800 && lm.type !== 'busStop' && !lm.name.endsWith('점')).sort((a, b) => a.dist - b.dist);

        var stopName = "일반 정류장";
        if (nearby.length > 0) {
            stopName = nearby[0].name.replace(/역$/, '') + (nearby[0].type === 'subway' ? '역' : '');
        } else {
            var addr = (typeof getFullAddress === 'function') ? getFullAddress(c.lat, c.lng) : "";
            if (addr) stopName = addr.split(' ').pop().replace(/\(.*\)/, '');
        }
        var finalStopName = stopName + " 정류장";

        // ★ 동명이인 살인마(220m 병합) 폐지 -> 이름이 100% 일치하고 50m 이내일 때만 병합
        var existingStop = window.myLandmarks.find(m => m.type === 'busStop' && m.name === finalStopName && Math.sqrt(Math.pow(m.lat - c.lat, 2) + Math.pow(m.lng - c.lng, 2)) < 50);
        
        if (!existingStop) {
            var strBuses = c.buses.map(b => `<span style="color:${b.color}; font-weight:bold;">[${b.type}]</span> ${b.name}`);
            
            // ★ 마커 겹침 방지 (Jitter)
            let offset = 15; let angle = 0; let nLat = c.lat, nLng = c.lng;
            let isOverlapping = () => window.myLandmarks.find(m => Math.sqrt(Math.pow(m.lat - nLat, 2) + Math.pow(m.lng - nLng, 2)) < 15);
            while(isOverlapping() && angle < Math.PI * 2 * 2) {
                nLat = c.lat + Math.cos(angle) * offset; nLng = c.lng + Math.sin(angle) * offset;
                angle += Math.PI / 3; if (angle >= Math.PI * 2) { angle = 0; offset += 15; } 
            }

            var stopData = {
                name: finalStopName, lat: Math.round(nLat), lng: Math.round(nLng),
                type: 'busStop', color: '#333', isManual: false, 
                allPassingBuses: strBuses, passingBuses: strBuses,
                rawBuses: c.buses // 카카오맵 팝업용 데이터
            };
            
            // 지도에 마커 추가 및 팝업 연동
            var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${stopData.name.replace(' 정류장','')}</div>`;
            var marker = L.marker([stopData.lat, stopData.lng], { icon: L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] }) });
            renderKakaoBusStopPopup(marker, stopData);
            if (typeof busStopLayer !== 'undefined') marker.addTo(busStopLayer);

            window.myLandmarks.push(stopData); 
            addedCount++;
        }
    });

    localStorage.setItem('hyobin_markers', JSON.stringify(window.myLandmarks));
    if (btn) btn.innerHTML = "🚌 정류장 일괄 생성";
    
    alert(`🎉 카카오맵 스타일 버스 정류장 생성 완료!\n일반 마커는 100% 안전하게 보호되었습니다.\n(신규 ${addedCount}개)\n페이지를 새로고침합니다.`);
    location.reload(); 
}

// =========================================================
// 🔍 2. 다중 검색 함수
// =========================================================
function searchLocation(isAuto = false) {
    var input = document.getElementById('search-input').value.trim();
    var resultBox = document.getElementById('search-result-list');
    
    if (!input) { resultBox.style.display = 'none'; return; }

    if (!searchHighlightLayer) searchHighlightLayer = L.layerGroup().addTo(map);
    searchHighlightLayer.clearLayers();

    var targetMarkers = allLandmarks.filter(m => m.name && m.name.includes(input));
    var targetPolys = searchablePolygons.filter(p => p.name && p.name.includes(input));

    var allRoadsForSearch = [];
    if (typeof roadData !== 'undefined') {
        roadData.forEach(l => {
            allRoadsForSearch.push({
                name: l.name,
                points: l.points.map(p => [p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]])
            });
        });
    }
    allRoadsForSearch = allRoadsForSearch.concat(typeof myLines !== 'undefined' ? myLines : []);
    var targetRoads = allRoadsForSearch.filter(r => r.name && r.name.includes(input));
    var targetIntersects = allLandmarks.filter(m => m.type === 'intersect' && m.name && m.name.includes(input));

    var targetBuses = [];
    var sourceBuses = (typeof processedBusData !== 'undefined') ? processedBusData : (typeof busData !== 'undefined' ? busData : []);
    sourceBuses.forEach(b => {
        if (b.name && b.name.includes(input)) {
            targetBuses.push({
                name: b.name,
                type: b.type,
                startAddr: b.startAddr,
                endAddr: b.endAddr,
                points: b.points 
            });
        }
    });

    var totalResults = targetMarkers.length + targetPolys.length + targetRoads.length + targetIntersects.length + targetBuses.length;

    if (totalResults === 0) {
        if (!isAuto) alert("검색 결과를 찾을 수 없습니다."); 
        resultBox.style.display = 'none';
        return;
    }

    currentSearchResults = { markers: targetMarkers, polys: targetPolys, roads: targetRoads, intersects: targetIntersects, buses: targetBuses };

    if (totalResults === 1) {
        resultBox.style.display = 'none';
        if (targetPolys.length === 1) selectSearchResult('poly', 0);
        else if (targetMarkers.length === 1) selectSearchResult('marker', 0);
        else if (targetRoads.length === 1) selectSearchResult('road', 0);
        else if (targetIntersects.length === 1) selectSearchResult('intersect', 0);
        else if (targetBuses.length === 1) selectSearchResult('bus', 0);
        return;
    }

    var listHtml = "";
    targetPolys.forEach((p, index) => {
        var typeStr = p.type === 'gugun' ? "구/군" : p.type === 'admin' ? "행정동" : p.type === 'dev' ? "개발지구" : "법정동";
        var bgCode = p.type === 'gugun' ? "#EE0022" : p.type === 'admin' ? "#0077DD" : p.type === 'dev' ? "#881188" : "#00CCAA";
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('poly', ${index})"><span class="search-type-badge" style="background:${bgCode}">${typeStr}</span>${p.name}</div>`;
    });
    targetMarkers.forEach((m, index) => {
        var typeStr = m.type === 'subway' ? "지하철" : "마커";
        var bgCode = m.type === 'subway' ? "#FF5522" : "#333333";
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('marker', ${index})"><span class="search-type-badge" style="background:${bgCode}">${typeStr}</span>${m.name}</div>`;
    });
    targetRoads.forEach((r, index) => {
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('road', ${index})"><span class="search-type-badge" style="background:#ff9922">도로</span>${r.name}</div>`;
    });
    targetIntersects.forEach((i, index) => {
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('intersect', ${index})"><span class="search-type-badge" style="background:#0077DD">교차로</span>${i.name}</div>`;
    });
    targetBuses.forEach((b, index) => {
        var bColor = (typeof busColors !== 'undefined' && busColors[b.type]) ? busColors[b.type] : '#888888';
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('bus', ${index})"><span class="search-type-badge" style="background:${bColor}">${b.type}버스</span>${b.name}</div>`;
    });

    resultBox.innerHTML = listHtml;
    resultBox.style.display = 'block';
}

function selectSearchResult(type, index) {
    document.getElementById('search-result-list').style.display = 'none';
    if (!searchHighlightLayer) searchHighlightLayer = L.layerGroup().addTo(map);
    searchHighlightLayer.clearLayers();

    if (type === 'poly') {
        var poly = currentSearchResults.polys[index];
        var highlight = L.polygon(poly.points, { color: "#EE0022", weight: 4, fillColor: "#EE0022", fillOpacity: 0.25 });
        var polyBounds = highlight.getBounds();
        var center = polyBounds.getCenter();
        var fullAddr = getFullAddress(center.lat, center.lng);
        var popupContent = `<div style="font-size:15px; text-align:center; padding:3px;"><b style="color:#0077DD; font-size:16px;">${poly.name}</b><br><hr style="margin:5px 0; border:0; border-top:1px solid #ccc;"><span style="font-size:12px; color:#333;">${fullAddr}</span></div>`;
        highlight.bindPopup(popupContent);
        searchHighlightLayer.addLayer(highlight);
        map.fitBounds(polyBounds, { maxZoom: -1 });
        highlight.openPopup();
    } else if (type === 'marker') {
        var target = currentSearchResults.markers[index];
        if (target.type === 'subway' && typeof subwayStationLayer !== 'undefined' && !map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
        var fullAddr = getFullAddress(target.lat, target.lng);
        var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;"><b style="font-size:16px;">${target.name}</b><br><hr style="margin:5px 0; border:0; border-top:1px solid #ccc;"><span style="font-size:12px; color:#333;">${fullAddr}</span></div>`;
        map.flyTo([target.lat, target.lng], -1);
        L.popup().setLatLng([target.lat, target.lng]).setContent(popupContent).openOn(map);
    } else if (type === 'road') {
        var target = currentSearchResults.roads[index];
        var highlight = L.polyline(target.points, { color: "#ff9922", weight: 8, opacity: 0.8 });
        var polyBounds = highlight.getBounds();
        var center = polyBounds.getCenter();
        var fullAddr = getFullAddress(center.lat, center.lng);
        var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;"><b style="font-size:16px; color:#ff9922;">🛣️ ${target.name}</b><br><hr style="margin:5px 0; border:0; border-top:1px solid #ccc;"><span style="font-size:12px; color:#333;">중심 기준: ${fullAddr}</span></div>`;
        highlight.bindPopup(popupContent);
        searchHighlightLayer.addLayer(highlight);
        map.fitBounds(polyBounds, { maxZoom: -1 });
        highlight.openPopup();
    } else if (type === 'intersect') {
        var target = currentSearchResults.intersects[index];
        var fullAddr = getFullAddress(target.lat, target.lng);
        var highlight = L.circleMarker([target.lat, target.lng], { radius: 12, color: '#FFF', weight: 3, fillColor: '#0077DD', fillOpacity: 1 });
        var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;"><b style="font-size:16px; color:#0077DD;">🚦 ${target.name}</b><br><hr style="margin:5px 0; border:0; border-top:1px solid #ccc;"><span style="font-size:12px; color:#333;">${fullAddr}</span></div>`;
        highlight.bindPopup(popupContent);
        searchHighlightLayer.addLayer(highlight);
        map.flyTo([target.lat, target.lng], -1);
        highlight.openPopup();
    } else if (type === 'bus') {
        var target = currentSearchResults.buses[index];
        var bColor = (typeof busColors !== 'undefined' && busColors[target.type]) ? busColors[target.type] : '#888888';
        if (typeof highlightBusRoute === 'function') highlightBusRoute(target.name, bColor);
        var tempPoly = L.polyline(target.points);
        var polyBounds = tempPoly.getBounds();
        var center = polyBounds.getCenter();
        var fullAddr = getFullAddress(center.lat, center.lng);
        var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;"><b style="font-size:16px; color:${bColor};">🚌 [${target.type}버스] ${target.name}</b><br><hr style="margin:5px 0; border:0; border-top:1px solid #ccc;"><span style="font-size:12px; color:#333;"><b>기점:</b> ${target.startAddr || "미지정"}</span><br><span style="font-size:12px; color:#333;"><b>종점:</b> ${target.endAddr || "미지정"}</span><br><span style="font-size:11px; color:#777; display:block; margin-top:3px;">(중심: ${fullAddr})</span></div>`;
        map.fitBounds(polyBounds, { maxZoom: -1 });
        L.popup().setLatLng(center).setContent(popupContent).openOn(map);
    }
}

// =========================================================
// 3. 주소 및 폴리곤 유틸리티 
// =========================================================
function getFullAddress(lat, lng) {
    var foundGugun = null; var foundAdmin = null; var foundLegal = null;
    searchablePolygons.forEach(function(poly) {
        if (isPointInPolygon(lat, lng, poly.points)) {
            if (poly.type === 'gugun') foundGugun = poly.name;
            else if (poly.type === 'admin') foundAdmin = poly.name;
            else if (poly.type === 'legal') foundLegal = poly.name;
        }
    });

    var province = "효빈광역시";
    if (foundGugun === "선곡군" || foundGugun === "기도군" || foundGugun === "덕현군"|| foundGugun === "약산시"|| foundGugun === "낭원군"|| foundGugun === "치원군"|| foundGugun === "천주시") province = "덕빈북도";
    if (foundGugun && (foundGugun.includes("천주시") || foundGugun.includes("약산시"))) province = "덕빈북도";

    var fullAddress = province;
    if (foundGugun) fullAddress += " " + foundGugun;
    if (foundAdmin) fullAddress += " " + foundAdmin;
    if (foundLegal && foundLegal !== foundAdmin) {
        if (foundLegal.endsWith("리")) fullAddress += " " + foundLegal; 
        else fullAddress += "(" + foundLegal + ")";
    }

    if (fullAddress === "효빈광역시 장곡리" || fullAddress === "효빈광역시 (장곡리)") {
        return "덕빈북도 약산시 장곡읍 장곡리";
    }
    return fullAddress;
}

function getPathDistricts(points, isRaw = false) {
    let districts = new Set();
    points.forEach(p => {
        let checkLat = isRaw ? p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0) : p[0];
        let addr = getFullAddress(checkLat, p[1]);
        if (addr) districts.add(addr);
    });

    for (let i = 0; i < points.length - 1; i++) {
        let midLat = (points[i][0] + points[i+1][0]) / 2;
        let midLng = (points[i][1] + points[i+1][1]) / 2;
        let checkMidLat = isRaw ? midLat + (typeof adjustY !== 'undefined' ? adjustY : 0) : midLat;
        let midAddr = getFullAddress(checkMidLat, midLng);
        if (midAddr) districts.add(midAddr);
    }

    let filteredArray = Array.from(districts).filter(addr => {
        if (!addr || addr === "효빈광역시" || addr === "덕빈북도" || addr === "미지정") return false;
        let lastChar = addr.trim().slice(-1);
        if (['읍', '면', '시', '군', '구'].includes(lastChar)) return false; 
        return true;
    });

    return (filteredArray.length === 0 && districts.size > 0) ? Array.from(districts) : filteredArray;
}

function isPointInPolygon(lat, lng, polygon) {
    var x = lat, y = lng;
    var isInside = false;
    var isMulti = Array.isArray(polygon[0][0]);
    var rings = isMulti ? polygon : [polygon];

    for (var r = 0; r < rings.length; r++) {
        var pts = rings[r];
        var inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            var xi = pts[i][0], yi = pts[i][1];
            var xj = pts[j][0], yj = pts[j][1];
            var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        if (inside) isInside = true;
    }
    return isInside;
}

function getDistanceToPolygon(lat, lng, polygon) {
    var minDistance = Infinity;
    var x = lat, y = lng;
    var isMulti = Array.isArray(polygon[0][0]);
    var rings = isMulti ? polygon : [polygon];

    for (var r = 0; r < rings.length; r++) {
        var pts = rings[r];
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            var x1 = pts[i][0], y1 = pts[i][1];
            var x2 = pts[j][0], y2 = pts[j][1];
            var A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
            var dot = A * C + B * D;
            var len_sq = C * C + D * D;
            var param = (len_sq != 0) ? dot / len_sq : -1;
            var xx = (param < 0) ? x1 : (param > 1) ? x2 : x1 + param * C;
            var yy = (param < 0) ? y1 : (param > 1) ? y2 : y1 + param * D;
            var dx = x - xx, dy = y - yy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) minDistance = dist;
        }
    }
    return minDistance;
}

function saveData() {
    if (myLandmarks.length === 0 && (typeof myLines !== 'undefined' ? myLines.length === 0 : true)) { alert("저장할 데이터가 없습니다."); return; }
    var data = { markers: myLandmarks, lines: (typeof myLines !== 'undefined' ? myLines : []) };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "hyobin_map_data.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadData(input) {
    var file = input.files[0];
    if(!file) return;
    if(!confirm("현재 지도의 데이터가 파일 내용으로 덮어씌워집니다.\n계속하시겠습니까?")) { input.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.markers && Array.isArray(data.markers)) {
                myLandmarks = data.markers;
                localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
            }
            if (data.lines && Array.isArray(data.lines) && typeof myLines !== 'undefined') {
                myLines = data.lines;
                localStorage.setItem('hyobin_lines', JSON.stringify(myLines));
            }
            alert("데이터 복원 완료! 페이지를 새로고침합니다.");
            location.reload();
        } catch (err) { alert("파일 형식이 올바르지 않습니다."); }
    };
    reader.readAsText(file);
}

function clearAllData() { 
    if(confirm("모든 사용자 데이터(마커, 선, 교차로 이름)를 삭제하고 초기화하시겠습니까?")) { 
        localStorage.removeItem('hyobin_markers'); 
        localStorage.removeItem('hyobin_lines'); 
        if (typeof migrationKey !== 'undefined') localStorage.removeItem(migrationKey); 
        location.reload(); 
    } 
}

function toggleSubwayMode() {
    isSubwayMode = !isSubwayMode;
    var btn = document.getElementById('mode-btn');
    var mapDiv = document.getElementById('map');
    var backgroundLayers = [];
    if (typeof imageLayerGroup !== 'undefined') backgroundLayers.push(imageLayerGroup);
    if (typeof guGunLayer !== 'undefined') backgroundLayers.push(guGunLayer);
    if (typeof adminLayer !== 'undefined') backgroundLayers.push(adminLayer);
    if (typeof legalLayer !== 'undefined') backgroundLayers.push(legalLayer);
    if (typeof devLayer !== 'undefined') backgroundLayers.push(devLayer);

    if (isSubwayMode) {
        btn.innerHTML = "🗺️ 지도 모드"; 
        btn.classList.add('active-btn');
        mapDiv.style.backgroundColor = '#ffffff'; 
        savedLayerState = [];
        backgroundLayers.forEach(layer => {
            if (map.hasLayer(layer)) { savedLayerState.push(layer); map.removeLayer(layer); }
        });
        if (typeof subwayLineLayer !== 'undefined' && !map.hasLayer(subwayLineLayer)) map.addLayer(subwayLineLayer);
        if (typeof subwayStationLayer !== 'undefined' && !map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
        alert("노선도만 깔끔하게 보여줍니다.");
        if (typeof applySubwayFilter === 'function') applySubwayFilter(); 
    } else {
        btn.innerHTML = "🚇 노선도 모드";
        btn.classList.remove('active-btn');
        mapDiv.style.backgroundColor = '#aaddff'; 
        savedLayerState.forEach(layer => { if (!map.hasLayer(layer)) map.addLayer(layer); });
        if (typeof imageLayerGroup !== 'undefined' && !map.hasLayer(imageLayerGroup)) map.addLayer(imageLayerGroup);
        if (typeof applySubwayFilter === 'function') applySubwayFilter(); 
    }
}

function calculateAndShowDistances() {
    if (typeof allLandmarks === 'undefined' || typeof subwayData === 'undefined') return;
    var stations = allLandmarks.filter(m => m.type === 'subway');
    var linesData = subwayData.lines;
    linesData.forEach(line => {
        var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name) || Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
        if (!lineKey) return; 
        var lineStations = stations.filter(s => s.lines && s.lines.includes(lineKey));
        if (lineStations.length < 2) return;
        var linePoints = line.points.map(p => [p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]]);
        lineStations.forEach(st => { st._lineIndex = findClosestPointIndex([st.lat, st.lng], linePoints); });
        lineStations.sort((a, b) => a._lineIndex - b._lineIndex);

        for (var i = 0; i < lineStations.length - 1; i++) {
            var st1 = lineStations[i], st2 = lineStations[i+1];
            var dist = calculatePathDistance(linePoints, st1._lineIndex, st2._lineIndex);
            if (dist > 0) {
                var distStr = (dist >= 1000) ? (dist/1000).toFixed(1) + "km" : Math.round(dist) + "m";
                var midIdx = Math.floor((st1._lineIndex + st2._lineIndex) / 2);
                var label = L.marker(linePoints[midIdx], {
                    icon: L.divIcon({ className: 'auto-dist-wrap', html: `<div class="auto-dist-badge" style="border-color:${line.color};">${distStr}</div>`, iconSize: null, iconAnchor: [15, 0] }),
                    interactive: false 
                }).addTo(map);
                label.relatedLineId = lineKey;
                if (typeof autoDistanceLabels !== 'undefined') autoDistanceLabels.push(label);
            }
        }
    });
    alert("모든 노선의 역간 거리를 계산하여 표시했습니다.");
}

function findClosestPointIndex(latlng, points) {
    var minDest = Infinity, index = -1;
    for (var i = 0; i < points.length; i++) {
        var d = map.distance(latlng, points[i]);
        if (d < minDest) { minDest = d; index = i; }
    }
    return index;
}

function calculatePathDistance(points, idx1, idx2) {
    var dist = 0, start = Math.min(idx1, idx2), end = Math.max(idx1, idx2);
    for(var i=start; i<end; i++) dist += map.distance(points[i], points[i+1]);
    return dist;
}

function highlightBusRoute(targetBusName, originalColor) {
    if (typeof currentHighlightedBus !== 'undefined' && currentHighlightedBus === targetBusName) { 
        if (typeof resetBusHighlight === 'function') resetBusHighlight(); 
        return; 
    }
    window.currentHighlightedBus = targetBusName;

    if (typeof busLineLayer !== 'undefined') {
        busLineLayer.eachLayer(function(layer) {
            if (layer.setStyle) { 
                if (layer.rawBusName === targetBusName) { layer.setStyle({ weight: 8, opacity: 1 }); layer.bringToFront(); }
                else { layer.setStyle({ weight: 2, opacity: 0.1 }); }
            }
        });
    }

    if (typeof busStopLayer !== 'undefined') {
        busStopLayer.eachLayer(function(marker) {
            var hasBus = false;
            
            // 일반 툴팁에서 찾는 대신 item.rawBuses를 직접 탐색
            var item = window.myLandmarks.find(m => Math.abs(m.lat - marker.getLatLng().lat) < 5 && m.type === 'busStop');
            if (item && item.rawBuses) {
                hasBus = item.rawBuses.some(b => b.name === targetBusName);
            }

            var nameMatch = marker.options.icon.options.html.match(/<\/div><div class="station-name-label"[^>]*>(.*?)<\/div>/);
            var stopName = nameMatch ? nameMatch[1] : "정류장";

            if (hasBus) {
                if (!map.hasLayer(marker)) map.addLayer(marker);
                var highlightIcon = `<div style="background:white; border:3px solid ${originalColor}; border-radius:6px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 8px ${originalColor};"><span style="font-size:11px;">🚏</span></div><div class="station-name-label" style="color:${originalColor}; font-size:12px; margin-top:3px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${stopName}</div>`;
                marker.setIcon(L.divIcon({ className: 'custom-bus-stop highlighted', html: highlightIcon, iconSize: [20, 20], iconAnchor: [10, 10] }));
                marker.setZIndexOffset(1000); 
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });
    }
}

// =========================================================
// 🚌 [카카오맵 100% 구현] 정류장 실시간 도착정보 & 노선도 2단 플로팅 UI
// =========================================================
(function() {
    if (document.getElementById('kmap-bus-ui-style')) return;

    var style = document.createElement('style');
    style.id = 'kmap-bus-ui-style';
    style.innerHTML = `
        #kmap-bus-container {
            position: fixed; top: 70px; left: 390px; z-index: 9500;
            display: flex; gap: 12px; align-items: flex-start;
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            pointer-events: none;
        }
        .kmap-panel {
            background: #fff; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.22);
            border: 1px solid #d0d0d0; overflow: hidden;
            pointer-events: auto; display: none; flex-direction: column;
        }
        #kmap-route-panel { width: 320px; max-height: 78vh; }
        #kmap-stop-panel { width: 340px; max-height: 78vh; }
        .kmap-header { padding: 16px 18px 12px 18px; border-bottom: 1px solid #eee; position: relative; background: #fff; }
        .kmap-close-btn { position: absolute; top: 14px; right: 14px; background: none; border: none; font-size: 18px; color: #888; cursor: pointer; }
        .kmap-close-btn:hover { color: #111; }
        .kmap-stop-title { font-size: 17px; font-weight: 900; color: #111; margin: 0 24px 4px 0; letter-spacing: -0.5px; }
        .kmap-stop-sub { font-size: 12px; color: #777; margin-bottom: 10px; }
        .kmap-action-bar { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
        .kmap-icon-btn { width: 34px; height: 32px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; display:flex; align-items:center; justify-content:center; }
        .kmap-icon-btn:hover { background: #f5f5f5; }
        .kmap-nav-btn { margin-left: auto; background: #258fff; color: #fff; border: none; border-radius: 4px; padding: 0 14px; height: 32px; font-size: 12.5px; font-weight: bold; cursor: pointer; }
        .kmap-sub-bar { background: #f8f9fa; padding: 8px 16px; font-size: 11.5px; color: #666; border-bottom: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center; }
        .kmap-list-body { overflow-y: auto; flex: 1; divide-y: 1px solid #f0f0f0; max-height: 52vh; }
        .kmap-bus-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; border-bottom: 1px solid #f2f2f2; cursor: pointer; transition: background 0.12s; }
        .kmap-bus-row:hover { background: #f1f7ff; }
        .kmap-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; color: #fff; font-size: 10.5px; font-weight: 800; margin-right: 6px; }
        .kmap-bus-num { font-size: 14.5px; font-weight: 800; color: #222; }
        .kmap-bus-dir { font-size: 11.5px; color: #888; margin-top: 2px; }
        .kmap-arr-info { text-align: right; font-size: 12.5px; white-space: nowrap; }
        .kmap-arr-soon { color: #e53935; font-weight: 800; }
        .kmap-arr-next { color: #666; font-size: 11.5px; margin-left: 6px; }
        /* 좌측 노선 타임라인 스타일 */
        .kmap-timeline { padding: 14px 18px; overflow-y: auto; max-height: 54vh; position: relative; }
        .kmap-tl-item { display: flex; align-items: flex-start; position: relative; padding-bottom: 16px; cursor: pointer; }
        .kmap-tl-item:hover .kmap-tl-name { color: #258fff; font-weight: 800; }
        .kmap-tl-line { position: absolute; left: 7px; top: 14px; bottom: -4px; width: 4px; background: #2ecc71; }
        .kmap-tl-item:last-child .kmap-tl-line { display: none; }
        .kmap-tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 3px solid #2ecc71; z-index: 2; margin-top: 3px; margin-right: 12px; flex-shrink: 0; }
        .kmap-tl-name { font-size: 13px; color: #222; font-weight: 500; line-height: 1.3; }
        .kmap-tl-id { font-size: 11px; color: #999; margin-top: 2px; }
        .kmap-bus-icon-float { position: absolute; left: -3px; top: 0px; background: #258fff; color: #fff; font-size: 9px; padding: 1px 3px; border-radius: 3px; z-index: 3; font-weight: bold; }
    `;
    document.head.appendChild(style);

    var container = document.createElement('div');
    container.id = 'kmap-bus-container';
    container.innerHTML = `
        <div id="kmap-route-panel" class="kmap-panel"></div>
        <div id="kmap-stop-panel" class="kmap-panel"></div>
    `;
    document.body.appendChild(container);

    // 정류장 고유번호 생성기
    function getStopId(lat, lng) {
        return "31" + String((Math.abs(Math.round(lat * 3 + lng * 7)) % 899) + 100);
    }

    // 결정론적 실시간 도착 시간 생성기 (분/초 실시간 변동)
    function getRealtimeArrival(busName, stopName) {
        var now = new Date();
        var sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        var seed = 0;
        var str = busName + "_" + stopName;
        for (var i = 0; i < str.length; i++) seed += str.charCodeAt(i) * (i + 1);

        var isSpecial = busName.match(/(광역|좌석|공항|급행)/);
        var headway = isSpecial ? 22 : (busName.includes("마을") ? 14 : 11); // 배차간격(분)
        var periodSec = headway * 60;
        var remainSec1 = periodSec - ((sec + seed * 37) % periodSec);
        var remainMin1 = Math.floor(remainSec1 / 60);
        var remainMin2 = remainMin1 + headway;

        if (remainMin1 === 0) return { first: "곧 도착", second: `${remainMin2}분`, isSoon: true };
        if (remainMin1 <= 2) return { first: `${remainMin1}분 후 (전전)`, second: `${remainMin2}분`, isSoon: true };
        return { first: `${remainMin1}분`, second: `${remainMin2}분`, isSoon: true };
    }

    // 1. 우측 [정류장 실시간 버스 정보] 창 열기
    window.openKakaoBusStopPanel = function(item, marker) {
        var stopPanel = document.getElementById('kmap-stop-panel');
        if (!stopPanel) return;

        var cleanStopName = (item.name || "정류장").replace(/ 정류장$/, '');
        var stopId = getStopId(item.lat, item.lng);
        var addrObj = (typeof resolveFullAddress === 'function') ? resolveFullAddress(item.lat, item.lng) : { legal: "방면" };
        var nowStr = new Date().toTimeString().slice(0, 5);

        // 반경 스캔이 안 되어 있으면 일반 버스만 추가 스캔
        var rawBusStrings = item.passingBuses || [];
        var parsedBuses = rawBusStrings.map(function(bStr) {
            var clean = bStr.replace(/<[^>]*>?/gm, '').trim();
            var m = clean.match(/^\[(.*?)\]\s*(.+)$/);
            var bType = m ? m[1] : "간선";
            var bName = m ? m[2] : clean;
            var color = (typeof busColors !== 'undefined' && busColors[bType]) ? busColors[bType] : "#01B7ED";
            
            var busObj = (typeof processedBusData !== 'undefined') ? processedBusData.find(x => x.name.replace(/\s+/g,'') === bName.replace(/\s+/g,'')) : null;
            var endDir = (busObj && busObj.endAddr) ? busObj.endAddr.split(' ').pop() + " 방면" : (addrObj.legal + " 방면");
            return { type: bType, name: bName, color: color, dir: endDir };
        });

        var listHtml = "";
        if (parsedBuses.length === 0) {
            listHtml = `<div style="padding:30px; text-align:center; color:#999; font-size:13px;">정차하는 노선이 없습니다.</div>`;
        } else {
            listHtml = parsedBuses.map(function(b) {
                var arr = getRealtimeArrival(b.name, cleanStopName);
                var safeBName = b.name.replace(/'/g, "\\'");
                return `
                    <div class="kmap-bus-row" onclick="window.openKakaoBusRoutePanel('${safeBName}', '${b.color}', '${b.type}', '${cleanStopName.replace(/'/g,"\\'")}')">
                        <div style="flex:1; padding-right:8px;">
                            <div>
                                <span class="kmap-badge" style="background:${b.color};">${b.type}</span>
                                <span class="kmap-bus-num">${b.name.replace(/^(간선|지선|광역|좌석|급행|순환|공항|마을)버스\s*/, '')}</span>
                                <span style="font-size:11.5px; color:#666; font-weight:normal;">(${b.name})</span>
                            </div>
                            <div class="kmap-bus-dir">${b.dir}</div>
                        </div>
                        <div class="kmap-arr-info">
                            <span class="kmap-arr-soon">${arr.first}</span>
                            <span class="kmap-arr-next">${arr.second}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        window._lastClickedStopItem = item;
        window._lastClickedStopMarker = marker;

        stopPanel.innerHTML = `
            <div class="kmap-header">
                <button class="kmap-close-btn" onclick="document.getElementById('kmap-stop-panel').style.display='none'; document.getElementById('kmap-route-panel').style.display='none';">✕</button>
                <div class="kmap-stop-title">${cleanStopName}</div>
                <div class="kmap-stop-sub">${stopId} · ${addrObj.gugun || '효빈시'} ${addrObj.legal || ''} 방면</div>
                <div class="kmap-action-bar">
                    <button class="kmap-icon-btn" title="정류장 노선/이름 편집" onclick="window.openLegacyBusEdit()">✏️</button>
                    <button class="kmap-icon-btn" title="즐겨찾기" onclick="alert('즐겨찾기에 추가되었습니다.')">🔖</button>
                    <button class="kmap-nav-btn" onclick="alert('${cleanStopName}(으)로 길찾기를 시작합니다.')">↱ 길찾기</button>
                </div>
            </div>
            <div class="kmap-sub-bar">
                <span>실시간 버스정보</span>
                <span style="cursor:pointer; font-weight:bold; color:#258fff;" onclick="window.openKakaoBusStopPanel(window._lastClickedStopItem, window._lastClickedStopMarker)">${nowStr} ↻</span>
            </div>
            <div class="kmap-list-body">${listHtml}</div>
        `;
        stopPanel.style.display = 'flex';
    };

    // 2. 좌측 [노선 전체 정류장 타임라인] 창 열기 + 지도 노선 하이라이트
    window.openKakaoBusRoutePanel = function(busName, bColor, bType, currentStopName) {
        var routePanel = document.getElementById('kmap-route-panel');
        if (!routePanel) return;

        if (typeof highlightBusRoute === 'function') {
            currentHighlightedBus = null; // 무조건 켜지도록 리셋 후 호출
            highlightBusRoute(busName, bColor);
        }

        // 이 버스가 서는 모든 정류장을 찾아 노선 순서대로 정렬
        var allStops = (window.myLandmarks || []).filter(function(m) {
            if (m.type !== 'busStop' || !m.passingBuses) return false;
            return m.passingBuses.some(function(str) {
                var plain = str.replace(/<[^>]*>?/gm, '').replace(/\s+/g, '');
                var targetPlain = `[${bType}]${busName}`.replace(/\s+/g, '');
                return plain === targetPlain || plain.endsWith(busName.replace(/\s+/g, ''));
            });
        });

        var busObj = (typeof processedBusData !== 'undefined') ? processedBusData.find(x => x.name.replace(/\s+/g,'') === busName.replace(/\s+/g,'')) : null;
        if (busObj && busObj.points && busObj.points.length > 1) {
            allStops.forEach(function(st) {
                var minD = Infinity, bestI = 0;
                for (var i = 0; i < busObj.points.length; i++) {
                    var d = Math.pow(st.lat - busObj.points[i][0], 2) + Math.pow(st.lng - busObj.points[i][1], 2);
                    if (d < minD) { minD = d; bestI = i; }
                }
                st._order = bestI;
            });
            allStops.sort((a, b) => a._order - b._order);
        }

        var startName = allStops.length > 0 ? allStops[0].name.replace(/ 정류장$/, '') : "기점";
        var endName = allStops.length > 0 ? allStops[allStops.length - 1].name.replace(/ 정류장$/, '') : "종점";

        var timelineHtml = allStops.map(function(st, idx) {
            var stClean = st.name.replace(/ 정류장$/, '');
            var isCur = (stClean === currentStopName);
            var hasBusHere = (idx % 6 === (new Date().getMinutes() % 6)); // 실시간 버스 위치 아이콘 표시
            return `
                <div class="kmap-tl-item" onclick="map.flyTo([${st.lat}, ${st.lng}], 0)">
                    <div class="kmap-tl-line" style="background:${bColor};"></div>
                    ${hasBusHere ? `<div class="kmap-bus-icon-float">🚌</div>` : ''}
                    <div class="kmap-tl-dot" style="border-color:${bColor}; ${isCur ? 'background:'+bColor+'; transform:scale(1.25);' : ''}"></div>
                    <div>
                        <div class="kmap-tl-name" style="${isCur ? 'color:#258fff; font-weight:900;' : ''}">${stClean} ${isCur ? '<span style="font-size:10px; background:#eef6ff; color:#258fff; padding:1px 5px; border-radius:3px;">선택정류장</span>' : ''}</div>
                        <div class="kmap-tl-id">${getStopId(st.lat, st.lng)}</div>
                    </div>
                </div>
            `;
        }).join('');

        routePanel.innerHTML = `
            <div class="kmap-header">
                <button class="kmap-close-btn" onclick="document.getElementById('kmap-route-panel').style.display='none'; if(typeof resetBusHighlight==='function') resetBusHighlight();">✕</button>
                <div class="kmap-stop-title">
                    <span class="kmap-badge" style="background:${bColor}; font-size:12px; vertical-align:middle;">${bType}</span>
                    <span style="vertical-align:middle;">${busName}</span>
                </div>
                <div class="kmap-stop-sub">${startName} ↔ ${endName}</div>
                <div style="font-size:11.5px; color:#555; line-height:1.5;">
                    첫차 05:30 | 막차 23:40 · 배차간격 10~18분<br>
                    <span style="color:#009000; font-weight:bold;">🟢 현재 ${Math.max(2, Math.ceil(allStops.length / 5))}대 운행중</span>
                </div>
            </div>
            <div class="kmap-sub-bar">
                <span>효빈광역시 버스정보시스템 제공</span>
                <span>경유 정류장 <b>${allStops.length}</b>개</span>
            </div>
            <div class="kmap-timeline">${timelineHtml || '<div style="padding:20px; text-align:center; color:#999;">등록된 경유 정류장이 없습니다.</div>'}</div>
        `;
        routePanel.style.display = 'flex';
    };

    // 연필(✏️) 아이콘 누르면 기존의 정류장 편집 모달을 띄워줌
    window.openLegacyBusEdit = function() {
        if (window._lastClickedStopItem && window._lastClickedStopMarker && typeof window._origOpenBusStopEditModal === 'function') {
            window._origOpenBusStopEditModal(window._lastClickedStopItem, window._lastClickedStopMarker);
        }
    };

    // ★ 기존 정류장 클릭 이벤트를 가로채서 카카오맵 UI가 먼저 뜨도록 연결!
    if (typeof window.openBusStopEditModal === 'function' && !window._origOpenBusStopEditModal) {
        window._origOpenBusStopEditModal = window.openBusStopEditModal;
        window.openBusStopEditModal = function(item, marker) {
            window.openKakaoBusStopPanel(item, marker);
        };
    }
})();