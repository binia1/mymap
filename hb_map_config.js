// =========================================================
// 🚌 1. 버스 정류장 일괄 생성 (간격 최적화 + 동서남북/입구 접미사 자동 분기 + 중복 리포트 버전)
// =========================================================
function autoGenerateBusStops() {
    var sourceBuses = (typeof processedBusData !== 'undefined' && processedBusData.length > 0) ? processedBusData : (typeof busData !== 'undefined' ? busData : []);
    if (!sourceBuses || sourceBuses.length === 0) {
        alert("버스 노선 데이터가 없습니다!"); return;
    }

    var existingAutoStops = myLandmarks.filter(m => m.type === 'busStop' && m.isManual !== true);
    if (existingAutoStops.length > 0) {
        var overwrite = confirm(`이미 자동 생성된 정류장이 ${existingAutoStops.length}개 있습니다.\n기존의 자동 정류장들을 지우고 최적 간격 및 방위 접미사를 적용해 다시 생성하시겠습니까?\n\n(※ '확인'을 눌러도 수동/특수노선 정류장들과 일반 시설 마커들은 100% 유지됩니다.)`);
        if (!overwrite) return;
    }

    var btn = document.getElementById('auto-bus-stop-btn');
    if (btn) btn.innerHTML = "⏳ 생성 중...";

    // 수동 정류장 및 일반 시설 마커는 100% 보존하고 기존 자동 정류장만 초기화
    myLandmarks = myLandmarks.filter(m => m.type !== 'busStop' || m.isManual === true);
    window.myLandmarks = myLandmarks;
    
    if (typeof busStopLayer !== 'undefined') {
        busStopLayer.eachLayer(function(layer) {
            if (!layer.isManualMarker) busStopLayer.removeLayer(layer);
        });
    }
    activeMarkers = activeMarkers.filter(m => !(m.options && m.options.icon && m.options.icon.options.className === 'custom-bus-stop' && !m.isManualMarker));

    var allBusPoints = [];
    // ★ 서버 부담 완화 및 현실 도시 밸런스 적용 (기존보다 여유 있게 간격 상향!)
    var intervalMap = { "마을": 115, "지선": 265, "간선": 360 };

    sourceBuses.forEach(bus => {
        if (["좌석", "급행", "광역", "공항", "투어", "순환", "시티투어"].includes(bus.type)) return; 

        var pts = bus.points;
        if (!pts || pts.length < 2) return;
        var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
        var formattedName = `<span style="color:${bColor}; font-weight:bold;">[${bus.type}]</span> ${bus.name}`;
        var interval = intervalMap[bus.type];
        var isVillage = (bus.type === "마을");
        
        if (interval) {
            var currentDist = 0;
            for (var i = 0; i < pts.length - 1; i++) {
                var p1 = pts[i]; var p2 = pts[i+1];
                if (i === 0) allBusPoints.push({ lat: p1[0], lng: p1[1], busName: formattedName, isVillage: isVillage });
                var segDist = map.distance(p1, p2);
                var distLeft = segDist; var currPt = p1;
                while (distLeft > 0 && currentDist + distLeft >= interval) {
                    var walk = interval - currentDist;
                    var ratio = walk / segDist;
                    var newLat = currPt[0] + (p2[0] - currPt[0]) * ratio;
                    var newLng = currPt[1] + (p2[1] - currPt[1]) * ratio;
                    allBusPoints.push({ lat: newLat, lng: newLng, busName: formattedName, isVillage: isVillage });
                    currPt = [newLat, newLng]; distLeft -= walk; segDist -= walk; currentDist = 0;
                }
                currentDist += distLeft;
            }
            allBusPoints.push({ lat: pts[pts.length-1][0], lng: pts[pts.length-1][1], busName: formattedName, isVillage: isVillage });
        }
    });

    // ★ 클러스터 병합 반경 상향 (마을 75m, 간선/지선 165m) -> 6000개 과밀 현상 방지!
    var clusters = [];
    allBusPoints.forEach(pt => {
        var joined = false;
        var mergeRadius = pt.isVillage ? 75 : 165;
        for (var i = 0; i < clusters.length; i++) {
            var c = clusters[i];
            var dist = Math.sqrt(Math.pow(pt.lat - c.lat, 2) + Math.pow(pt.lng - c.lng, 2));
            if (dist < mergeRadius) { 
                c.buses.add(pt.busName); 
                if (pt.isVillage) c.hasVillage = true;
                joined = true; 
                break; 
            }
        }
        if (!joined) {
            var newSet = new Set(); newSet.add(pt.busName);
            clusters.push({ lat: pt.lat, lng: pt.lng, buses: newSet, hasVillage: pt.isVillage });
        }
    });

    var addedCount = 0;
    var mergedCount = 0;
    var duplicateReportList = []; // 중복 감지 및 방위 분기 리포트 배열
    var usedNameTracker = {};     // 정류장 이름 사용 횟수 및 위치 추적기

    // 기존 수동 정류장 이름들을 먼저 등록해 둠
    myLandmarks.forEach(function(m) {
        if (m.type === 'busStop') {
            var clean = m.name.replace(/ 정류장$/, '').trim();
            usedNameTracker[clean] = (usedNameTracker[clean] || 0) + 1;
        }
    });

    var ignoreTypes = ['cvs', 'fastfood', 'cafe', 'bakery', 'restaurant', 'pub', 'bunsik', 'pizza', 'western_food', 'japanese_food', 'korean_food', 'anime_shop', 'electronics_shop', 'variety_store'];
    var baseList = (typeof processedDefaultLandmarks !== 'undefined' ? processedDefaultLandmarks : []).concat(typeof processedSubwayMarkers !== 'undefined' ? processedSubwayMarkers : []);

    // 기준 시설(lm) 대비 정류장(c)의 실제 방위(북부/남부/동부/서부) 및 접미사 생성 함수
    function getDirectionalStopName(baseName, stopLat, stopLng, refLat, refLng, dupCount, isAptOrSchool) {
        var dLat = stopLat - refLat; // 양수면 북쪽, 음수면 남쪽
        var dLng = stopLng - refLng; // 양수면 동쪽, 음수면 서쪽
        var dirSuffix = "";
        if (Math.abs(dLat) > Math.abs(dLng)) {
            dirSuffix = (dLat >= 0) ? (isAptOrSchool ? "북문" : "북부") : (isAptOrSchool ? "남문" : "남부");
        } else {
            dirSuffix = (dLng >= 0) ? (isAptOrSchool ? "동문" : "동부") : (isAptOrSchool ? "서문" : "서부");
        }

        var suffixCandidates = [
            `${baseName}(${dirSuffix})`,
            `${baseName}입구`,
            `${baseName}앞`,
            `${baseName}사거리`,
            `${baseName}(중앙)`,
            `${baseName}후문`,
            `${baseName}건너편`,
            `${baseName}(${dirSuffix}${dupCount})`
        ];

        for (var i = 0; i < suffixCandidates.length; i++) {
            if (!usedNameTracker[suffixCandidates[i]]) {
                return suffixCandidates[i];
            }
        }
        return `${baseName}(${dirSuffix}${dupCount + 1})`;
    }

    clusters.forEach(c => {
        // 1. 먼저 실제 거리상 가까운 기존 정류장(수동/자동)이 있으면 노선만 합침 (마을 75m, 일반 150m)
        var existRadius = c.hasVillage ? 75 : 150;
        var nearbyExistingStop = myLandmarks.find(m => 
            m.type === 'busStop' && Math.sqrt(Math.pow(m.lat - c.lat, 2) + Math.pow(m.lng - c.lng, 2)) < existRadius
        );

        if (nearbyExistingStop) {
            var mergedBuses = new Set(nearbyExistingStop.allPassingBuses || []);
            Array.from(c.buses).forEach(b => mergedBuses.add(b));
            nearbyExistingStop.allPassingBuses = Array.from(mergedBuses);
            nearbyExistingStop.passingBuses = Array.from(mergedBuses);
            mergedCount++;
            return;
        }

        // 2. 주변 시설 탐색 (반경 650m 이내)
        var nearby = allLandmarks.map(lm => {
            return { name: lm.name, lat: lm.lat, lng: lm.lng, dist: Math.sqrt(Math.pow(c.lat - lm.lat, 2) + Math.pow(c.lng - lm.lng, 2)), type: lm.type };
        }).filter(lm => {
            if (lm.dist >= 650 || lm.type === 'busStop') return false;
            if (ignoreTypes.includes(lm.type)) return false; 
            if (lm.name.endsWith('점')) return false; 
            return true;
        }).sort((a, b) => a.dist - b.dist);

        var chosenBaseName = "";
        var refLat = c.lat, refLng = c.lng;
        var isAptOrSchool = false;

        if (nearby.length > 0) {
            // 1순위 시설의 이름이 이미 사용 중이라면, 가까이 있는(350m 이내) 2순위·3순위 다른 시설 이름을 먼저 탐색!
            var pickedLm = nearby[0];
            for (var k = 0; k < Math.min(nearby.length, 4); k++) {
                var cand = nearby[k];
                var candClean = (cand.type === 'subway' || cand.name.endsWith('역')) ? cand.name.replace(/역$/, '') + "역" : cand.name;
                if (!usedNameTracker[candClean] && (k === 0 || cand.dist < 350)) {
                    pickedLm = cand;
                    break;
                }
            }
            chosenBaseName = (pickedLm.type === 'subway' || pickedLm.name.endsWith('역')) ? pickedLm.name.replace(/역$/, '') + "역" : pickedLm.name;
            refLat = pickedLm.lat;
            refLng = pickedLm.lng;
            isAptOrSchool = pickedLm.name.match(/(아파트|학교|초|중|고|대|단지)/) !== null;
        } else {
            var addr = getFullAddress(c.lat, c.lng);
            if (addr && addr !== "미지정") {
                var dongName = addr.split(' ').pop().replace(/\(.*\)/, '');
                if (!['읍', '면', '시', '군', '구'].includes(dongName.slice(-1))) chosenBaseName = dongName;
            }
            if (!chosenBaseName) chosenBaseName = "효빈";
        }

        // ★ 3. 중복 이름 검사 및 방위/접미사 자동 분기 처리! (청덕세라스아파트 중복 원천 차단!)
        var finalCleanName = chosenBaseName;
        if (usedNameTracker[chosenBaseName]) {
            var dupCnt = usedNameTracker[chosenBaseName];
            finalCleanName = getDirectionalStopName(chosenBaseName, c.lat, c.lng, refLat, refLng, dupCnt, isAptOrSchool);
            duplicateReportList.push(`[중복 분기] '${chosenBaseName}' ➔ '${finalCleanName}'`);
        }

        usedNameTracker[chosenBaseName] = (usedNameTracker[chosenBaseName] || 0) + 1;
        usedNameTracker[finalCleanName] = 1;

        var finalStopName = finalCleanName + " 정류장";

        var sLat = Math.round(c.lat), sLng = Math.round(c.lng);
        // 일반 시설 마커와 8m 이내로 겹치면 14m 띄워서 일반 마커 변이 차단
        if (baseList.find(b => Math.abs(b.lat - sLat) <= 8 && Math.abs(b.lng - sLng) <= 8)) {
            sLat += 14; sLng += 14;
        }

        var stopData = {
            name: finalStopName, lat: sLat, lng: sLng,
            type: 'busStop', color: '#333', isManual: false, 
            allPassingBuses: Array.from(c.buses), passingBuses: Array.from(c.buses)
        };
        addMarkerToMap(stopData); 
        myLandmarks.push(stopData); 
        addedCount++;
    });

    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    if (btn) btn.innerHTML = "🚌 정류장 일괄 생성";
    
    var totalStopsNow = myLandmarks.filter(m => m.type === 'busStop').length;
    var dupPreview = duplicateReportList.slice(0, 8).join("\n") + (duplicateReportList.length > 8 ? `\n...외 ${duplicateReportList.length - 8}건 자동 분기 완료` : "");
    
    console.log("📋 [중복 정류장 이름 자동 분기 전체 목록]", duplicateReportList);
    alert(
        `🎉 정류장 최적 간격 생성 및 중복 이름 분기 완료!\n\n` +
        `• 새로 생성된 정류장: ${addedCount}개 (전체 총 ${totalStopsNow}개)\n` +
        `• 기존 정류장에 노선 통합: ${mergedCount}건\n` +
        `• 이름 중복 감지 및 방위/접미사 자동 분기: ${duplicateReportList.length}건\n\n` +
        (duplicateReportList.length > 0 ? `[주요 중복 분기 내역]\n${dupPreview}\n\n` : "") +
        `(화면을 새로고침합니다.)`
    );
    location.reload(); 
}
// =========================================================
// 🔍 2. 다중 검색 함수 (정류장/역방향 버스/도로/시설 통합 검색)
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
                points: l.points.map(p => [p[0] + adjustY, p[1]])
            });
        });
    }
    allRoadsForSearch = allRoadsForSearch.concat(myLines);
    var targetRoads = allRoadsForSearch.filter(r => r.name && r.name.includes(input));
    var targetIntersects = allLandmarks.filter(m => m.type === 'intersect' && m.name && m.name.includes(input));

    var targetBuses = [];
    var sourceBuses = (typeof processedBusData !== 'undefined') ? processedBusData : (typeof busData !== 'undefined' ? busData : []);
    sourceBuses.forEach(b => {
        var meta = window.getHyobinBusMeta ? window.getHyobinBusMeta(b.name) : null;
        var matchFwd = b.name && b.name.includes(input);
        var matchRev = meta && (meta.revNum.includes(input) || `${meta.type}버스${meta.revNum}`.includes(input));
        if (matchFwd || matchRev) {
            targetBuses.push({
                name: b.name,
                type: b.type,
                isRevSearch: (!matchFwd && matchRev),
                revNum: meta ? meta.revNum : "",
                startAddr: meta ? meta.start : b.startAddr,
                endAddr: meta ? meta.end : b.endAddr,
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
        var typeStr = m.type === 'subway' ? "지하철" : (m.type === 'busStop' ? "정류장" : "마커");
        var bgCode = m.type === 'subway' ? "#FF5522" : (m.type === 'busStop' ? "#009000" : "#333333");
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
        var labelTitle = b.isRevSearch ? `${b.type}버스 ${b.revNum} (역방향 / 원노선: ${b.name})` : b.name;
        listHtml += `<div class="search-result-item" onclick="selectSearchResult('bus', ${index})"><span class="search-type-badge" style="background:${bColor}">${b.type}버스</span>${labelTitle}</div>`;
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
        if (target.type === 'subway' && !map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
        if (target.type === 'busStop') {
            if (!map.hasLayer(busStopLayer)) map.addLayer(busStopLayer);
            map.flyTo([target.lat, target.lng], 0);
            if (typeof window.openKakaoBusStopPanel === 'function') window.openKakaoBusStopPanel(target, null);
            return;
        }
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
        var tempPoly = L.polyline(target.points);
        map.fitBounds(tempPoly.getBounds(), { maxZoom: -1 });
        if (typeof window.openKakaoBusRoutePanel === 'function') {
            window.openKakaoBusRoutePanel(target.name, bColor, target.type, "", target.isRevSearch);
        } else {
            highlightBusRoute(target.name, bColor);
        }
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
        let checkLat = isRaw ? p[0] + adjustY : p[0];
        let addr = getFullAddress(checkLat, p[1]);
        if (addr) districts.add(addr);
    });

    for (let i = 0; i < points.length - 1; i++) {
        let midLat = (points[i][0] + points[i+1][0]) / 2;
        let midLng = (points[i][1] + points[i+1][1]) / 2;
        let checkMidLat = isRaw ? midLat + adjustY : midLat;
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
    if (myLandmarks.length === 0 && myLines.length === 0) { alert("저장할 데이터가 없습니다."); return; }
    var data = { markers: myLandmarks, lines: myLines };
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
            if (data.lines && Array.isArray(data.lines)) {
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
        localStorage.removeItem(migrationKey); 
        location.reload(); 
    } 
}

function toggleSubwayMode() {
    isSubwayMode = !isSubwayMode;
    var btn = document.getElementById('mode-btn');
    var mapDiv = document.getElementById('map');
    var backgroundLayers = [imageLayerGroup, guGunLayer, adminLayer, legalLayer, devLayer];

    if (isSubwayMode) {
        btn.innerHTML = "🗺️ 지도 모드"; 
        btn.classList.add('active-btn');
        mapDiv.style.backgroundColor = '#ffffff'; 
        savedLayerState = [];
        backgroundLayers.forEach(layer => {
            if (map.hasLayer(layer)) { savedLayerState.push(layer); map.removeLayer(layer); }
        });
        if (!map.hasLayer(subwayLineLayer)) map.addLayer(subwayLineLayer);
        if (!map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
        alert("노선도만 깔끔하게 보여줍니다.");
        applySubwayFilter(); 
    } else {
        btn.innerHTML = "🚇 노선도 모드";
        btn.classList.remove('active-btn');
        mapDiv.style.backgroundColor = '#aaddff'; 
        savedLayerState.forEach(layer => { if (!map.hasLayer(layer)) map.addLayer(layer); });
        if (!map.hasLayer(imageLayerGroup)) map.addLayer(imageLayerGroup);
        applySubwayFilter(); 
    }
}

function toggleAllSubwayFilters(isChecked) {
    var checkboxes = document.querySelectorAll('input[name="subwayFilter"]');
    checkboxes.forEach(cb => cb.checked = isChecked);
    applySubwayFilter();
}

function applySubwayFilter() {
    var checkedLines = [];
    document.querySelectorAll('input[name="subwayFilter"]:checked').forEach(cb => checkedLines.push(cb.value));

    subwayLineLayer.eachLayer(function(layer) {
        if (checkedLines.includes(layer.lineCode)) { if (!map.hasLayer(layer)) map.addLayer(layer); }
        else { if (map.hasLayer(layer)) map.removeLayer(layer); }
    });

    subwayStationLayer.eachLayer(function(marker) {
        var stationLines = marker.lineCodes || [];
        var activeLines = stationLines.filter(code => checkedLines.includes(code));
        if (activeLines.length > 0) {
            if (!map.hasLayer(marker)) map.addLayer(marker);
            var width = (activeLines.length === 1) ? 14 : (activeLines.length * 10) + 6;
            var iconHtml = "";
            if (activeLines.length === 1) {
                var lineInfo = subwayLines[activeLines[0]];
                var lineColor = lineInfo ? lineInfo.color : "#333";
                iconHtml = `<div class="station-circle" style="width:14px; height:14px; border: 3px solid ${lineColor};"></div>`;
            } else {
                var dotsHtml = "";
                activeLines.forEach(lid => {
                    var lInfo = subwayLines[lid];
                    var c = lInfo ? lInfo.color : "#333";
                    dotsHtml += `<div class="transfer-dot" style="background-color:${c};"></div>`;
                });
                iconHtml = `<div class="station-transfer" style="width:${width}px; height:14px;">${dotsHtml}</div>`;
            }
            var sName = marker.stationName || (marker.getTooltip() ? marker.getTooltip().getContent().match(/<b>(.*?)<\/b>/)[1] : "역");
            var isTransfer = activeLines.length >= 2;
            var isManualMajor = typeof myMajorStations !== 'undefined' && myMajorStations.includes(sName);
            var isMajor = (isTransfer || isManualMajor) ? "major-station" : "normal-station";
            var markerClass = (isTransfer || isManualMajor) ? "major-marker" : "normal-marker";
            var lineClasses = activeLines.map(l => "line-" + l).join(" ");
            iconHtml += `<div class="station-name-label ${isMajor}">${sName}</div>`;
            marker.setIcon(L.divIcon({ className: `custom-station ${lineClasses} ${markerClass}`, html: iconHtml, iconSize: [width, 14], iconAnchor: [width/2, 7] }));
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    });

    if (typeof terminalLogoLayer !== 'undefined') {
        terminalLogoLayer.eachLayer(function(marker) {
            if (checkedLines.includes(marker.lineCode)) { if (!map.hasLayer(marker)) map.addLayer(marker); }
            else { if (map.hasLayer(marker)) map.removeLayer(marker); }
        });
    }

    if (isAutoDistMode) {
        autoDistanceLabels.forEach(function(lbl) {
            if (checkedLines.includes(lbl.relatedLineId)) { if (!map.hasLayer(lbl)) map.addLayer(lbl); }
            else { if (map.hasLayer(lbl)) map.removeLayer(lbl); }
        });
    }
}

function toggleSubwayFilterBox() {
    var box = document.getElementById('subway-filter-box');
    var btn = document.getElementById('subway-filter-btn');
    if (box.style.display === 'block') {
        box.style.display = 'none'; btn.classList.remove('active-btn');
    } else {
        box.style.display = 'block'; btn.classList.add('active-btn');
        if (!map.hasLayer(subwayLineLayer)) map.addLayer(subwayLineLayer);
        if (!map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
    }
}

function toggleDistrictArea() {
    var btn = document.getElementById('auto-area-btn');
    isDistrictAreaMode = !isDistrictAreaMode;
    if (isDistrictAreaMode) {
        btn.classList.add('active-btn'); updateDistrictAreaLabels();
        alert("켜진 레이어(행정동/법정동 등)의 면적만 표시합니다.");
    } else {
        btn.classList.remove('active-btn'); clearDistrictAreaLabels();
    }
}

function clearDistrictAreaLabels() {
    districtAreaLabels.forEach(lbl => map.removeLayer(lbl));
    districtAreaLabels = [];
}

function updateDistrictAreaLabels() {
    clearDistrictAreaLabels();
    if (!isDistrictAreaMode) return;
    var showGugun = map.hasLayer(guGunLayer), showAdmin = map.hasLayer(adminLayer), showLegal = map.hasLayer(legalLayer), showDev = map.hasLayer(devLayer);
    if (!showGugun && !showAdmin && !showLegal && !showDev) return;

    searchablePolygons.forEach(function(poly) {
        var isVisible = (poly.type === 'gugun' && showGugun) || (poly.type === 'admin' && showAdmin) || (poly.type === 'legal' && showLegal) || (poly.type === 'dev' && showDev);
        if (isVisible) {
            var area = getWeightedArea(poly.points, poly.name);
            var areaStr = formatArea(area);
            var center = L.polygon(poly.points).getBounds().getCenter();
            var label = L.marker(center, {
                icon: L.divIcon({ className: 'area-info-wrap', html: `<div class="area-info-badge">${areaStr}</div>`, iconSize: null, iconAnchor: [15, 0] }),
                interactive: false
            }).addTo(map);
            districtAreaLabels.push(label);
        }
    });
}

function calculatePolygonArea(points) {
    var totalArea = 0;
    var isMulti = Array.isArray(points[0][0]);
    var rings = isMulti ? points : [points];
    for (var r = 0; r < rings.length; r++) {
        var pts = rings[r], areaSum = 0;
        for (var i = 0; i < pts.length; i++) {
            var p1 = pts[i], p2 = pts[(i + 1) % pts.length];
            areaSum += (p1[1] * p2[0] - p2[1] * p1[0]);
        }
        totalArea += Math.abs(areaSum) / 2.0;
    }
    return totalArea;
}

var autoDistanceLabels = [];
function toggleAutoDistance() {
    var btn = document.getElementById('auto-dist-btn');
    isAutoDistMode = !isAutoDistMode;
    if (isAutoDistMode) {
        btn.classList.add('active-btn');
        if (typeof subwayData !== 'undefined' && subwayData.lines) {
            calculateAndShowDistances();
            if(isSubwayMode) applySubwayFilter();
        } else {
            alert("지하철 데이터가 없습니다."); isAutoDistMode = false; btn.classList.remove('active-btn');
        }
    } else {
        btn.classList.remove('active-btn');
        autoDistanceLabels.forEach(lbl => map.removeLayer(lbl));
        autoDistanceLabels = [];
    }
}

function calculateAndShowDistances() {
    var stations = allLandmarks.filter(m => m.type === 'subway');
    var linesData = subwayData.lines;
    linesData.forEach(line => {
        var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name) || Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
        if (!lineKey) return; 
        var lineStations = stations.filter(s => s.lines.includes(lineKey));
        if (lineStations.length < 2) return;
        var linePoints = line.points.map(p => [p[0] + adjustY, p[1]]);
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
                autoDistanceLabels.push(label);
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

function goToMyLocation() {
    var myLat = -26164, myLng = 24566;
    if (myLocationMarker) map.removeLayer(myLocationMarker);
    var myLocIcon = L.divIcon({
        className: '',
        html: `<div class="my-location-container"><div class="my-location-pulse"></div><div class="my-location-dot"></div></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8] 
    });
    myLocationMarker = L.marker([myLat, myLng], { icon: myLocIcon, zIndexOffset: 5000, interactive: false }).addTo(map);
    map.flyTo([myLat, myLng], 4, { animate: true, duration: 1.0 });
}

function highlightBusRoute(targetBusName, originalColor) {
    if (currentHighlightedBus === targetBusName) { resetBusHighlight(); return; }
    currentHighlightedBus = targetBusName;

    busLineLayer.eachLayer(function(layer) {
        if (layer.setStyle) { 
            if (layer.rawBusName === targetBusName) { layer.setStyle({ weight: 8, opacity: 1 }); layer.bringToFront(); }
            else { layer.setStyle({ weight: 2, opacity: 0.1 }); }
        }
    });

    busStopLayer.eachLayer(function(marker) {
        var hasBus = false;
        if (marker.getTooltip()) {
            var tooltipText = marker.getTooltip().getContent().replace(/<[^>]*>?/gm, '').replace(/\s+/g, '');
            if (tooltipText.includes(targetBusName.replace(/\s+/g, ''))) hasBus = true;
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

// =========================================================
// 🚌 [카카오맵 완전체 v2] 좌우 패널 완벽 연동 + 자동 스크롤 + JS 하드코딩 추출기
// =========================================================
(function() {
    var rawScheduleTSV = `급행	17	01	팔조역	내항역	01-1	내항역	팔조역	입포여객	12~14	14~15
급행	17	02	소원면사무소	고송동	02-1	고송동	소원면사무소	소진여객	13~15	14~16
급행	19	03	앵내종점	중수여고	03-1	중수여고	앵내종점	효빈여객	9~10	11~12
급행	14	04	곽산역	천본동	04-1	천본동	곽산역	칠양여객	16~18	18~20
급행	17	05	곽암종점	정근면사무소	05-1	정근면사무소	곽암종점	입포여객	14~16	16~18
급행	15	06	고송나루역	탄성과학고	06-1	탄성과학고	고송나루역	칠양여객	13~14	17~19
급행	15	07	하미종점	팔조역	07-1	팔조역	하미종점	송포여객	13~15	14~17
급행	17	08	휴소도	엽월대	08-1	엽월대	휴소도	청엽여객	11~13	12~14
급행	16	09	토모리해수욕장	효빈해양경찰서	09-1	효빈해양경찰서	토모리해수욕장	청엽여객	10~11	12~13
간선	9	11	내항관광지	당선선착장	11-1	당선선착장	내항관광지	효빈여객	11	14
간선	10	12	장원역	청덕세라스	21	청덕세라스	장원역	청선여객	15	17
간선	11	13	신덕동	현대조선소	31	현대조선소	신덕동	효빈여객	17~22	27~32
간선	14	14	중앙로역	앵내종점	41	앵내종점	중앙로역	효빈여객	19~23	25~28
간선	8	15	개항지역	정근면	51	정근면	개항지역	월주여객	20~29	32~36
간선	11	16	장원역	선곡군청	61	선곡군청	장원역	덕빈고속	19~22	26~29
간선	12	17	내항역	창전상고	71	창전상고	내항역	임천여객	11~15	16~19
간선	13	18	효빈대	우택역	81	우택역	효빈대	송포여객	10~15	15~20
간선	12	19	효빈대	곽암종점	91	곽암종점	효빈대	입포여객	12~18	20~25
간선	7	22	휴소도	모리초	22-1	모리초	청덕공원	소진여객	12~15	18~20
간선	12	23	휴소도	현대조선소	32	현대조선소	청덕공원	내삼여객	14~20	24~30
간선	13	24	휴소도	천본동	42	천본동	청덕공원	내삼여객	13~18	20~25
간선	13	25	청덕역	정근면	52	정근면	청덕역	이자여객	25~30	35~40
간선	11	26	고송나루	하미종점	62	하미종점	고송나루	소진여객	18~25	30~35
간선	20	27	고송나루	창전상고	72	창전상고	고송나루	임천여객	6~14	10~17
간선	12	28	휴소도	엽월대	82	엽월대	청덕공원	임천여객	17~22	20~26
간선	12	29	고송나루	곽암종점	92	곽암종점	고송나루	소진여객	15~20	20~25
간선	16	33	효빈유람선 중수포산 선착장	청덕공원	33-1	청덕공원	효빈유람선 중수포산 선착장	대교여객	12~15	18~20
간선	20	34	중수포산	도변역	43	도변역	중수포산	칠양여객	10	14
간선	11	35	포산역	면허시험장	53	면허시험장	포산역	월주여객	19~24	23~30
간선	9	36	포산역	선곡군청	63	선곡군청	포산역	중성여객	27~32	35~40
간선	15	37	포산역	평천대	73	평천대	포산역	청선여객	8~19	14~21
간선	6	38	현대조선소	비마역	83	비마역	현대조선소	청선여객	15~40	40
간선	12	39	현대조선소	항동종점	93	항동종점	현대조선소	청선여객	20~25	23~30
간선	8	45	도변역	정근면	54	정근면	도변역	임천여객	23~30	27~35
간선	7	46	앵내종점	탄성군청	64	탄성군청	앵내종점	덕빈고속	20~25	28~32
간선	7	47	천본동	동곡종점	74	동곡종점	천본동	임천여객	15~20	25~30
간선	7	48	천본동	엽월대	84	엽월대	천본동	남주여객	18~24	25~30
간선	9	49	도변역	항동종점	94	항동종점	도변역	이자여객	18~24	23~30
간선	5	56	이자공원	선곡군청	65	선곡군청	이자공원	이자여객	25~30	35~40
간선	6	57	면허시험장	동곡역	75	동곡역	면허시험장	효안교통	18~23	21~26
간선	7	58	면허시험장	엽월대	85	엽월대	면허시험장	남주여객	15~20	25~30
간선	8	59	면허시험장	항동종점	95	항동종점	면허시험장	중성여객	22~28	35~40
간선	4	66	하미종점	탄성군청	66-1	탄성군청	하미종점	탄성여객	40~50	60
간선	8	67	하미종점	동곡역	76	동곡역	하미종점	중성여객	20	24
간선	14	68	귀총면	효빈동신도시	86	효빈동신도시	귀총면	월주여객	20~25	25~30
간선	10	69	귀총면	항동종점	96	항동종점	귀총면	월주여객	30~35	40~45
간선	22	77	팔조역	창전상고	77-1	창전상고	팔조역	창전여객,월주여객	5~8	8~12
간선	17	78	창전상고	엽월대	87	엽월대	창전상고	남주여객	12~16	18~22
간선	15	79	창전상고	항동종점	97	항동종점	창전상고	판주여객	20~25	25~30
간선	24	88	엽월대	우택역	88-1	우택역	엽월대	청엽여객,창전여객,효안교통	4~7	8~12
간선	8	89	우택역	곽암종점	98	곽암종점	우택역	판주여객	17~22	20~24
순환	9	10	중앙로효빈은행	중앙로효빈은행	10-1	중앙로효빈은행	중앙로효빈은행	효빈여객	11	14
순환	9	20	고송교차로역	고송교차로역	20-1	고송교차로역	고송교차로역	소진여객	10~12	15~18
순환	10	30	중수역	중수역	30-1	중수역	중수역	덕빈고속	11	14
순환	11	40	안천역	안천역	40-1	안천역	안천역	안천고속	12	15
순환	11	50	이자역	이자역	50-1	이자역	이자역	이자여객	10~13	15~18
순환	10	60	도변역	도변역	60-1	도변역	도변역	탄성여객	18~22	22~26
순환	11	70	창전구청역	창전구청역	70-1	창전구청역	창전구청역	창전여객	10~12	15~18
순환	13	80	청엽구청역	청엽구청역	80-1	청엽구청역	청엽구청역	청엽여객	9~11	13~16
순환	12	90	월천역	월천역	90-1	월천역	월천역	판주여객	10~12	13~16
지선	9	111	장원역	당선역	111-1	당선역	장원역	입포여객	16	20
지선	6	112	효빈성북문	약맥동	112-1	약맥동	효빈성북문	칠양여객	25	30
지선	9	121	신덕역	고송나루	211	고송나루	신덕역	입포여객	18	25
지선	8	123	장원역	모리초	213	모리초	장원역	판주여객	20	28
지선	7	131	신덕역	현대연수원	311	현대연수원	신덕역	효안교통	22	30
지선	7	132	장원역	아진아파트	312	아진아파트	장원역	소진여객	18	25
지선	7	141	내항해변	귀총면	411	귀총면	내항해변	입포여객	25	35
지선	7	143	효빈대	귀총면	413	귀총면	효빈대	입포여객	25	35
지선	5	151	내항해변	융문차고지	511	융문차고지	내항해변	효안교통	35	45
지선	8	154	내항해변	정근면	514	정근면	내항해변	입포여객	20	28
지선	2	161	중앙로역	선곡군청	611	선곡군청	중앙로역	입포여객	70	90
지선	13	171	중앙로역	창전상고	711	창전상고	중앙로역	칠양여객	15	20
지선	14	172	당선역	평천대	712	평천대	당선역	효안교통	13	18
지선	9	173	내항해변	창전상고	713	창전상고	내항해변	입포여객	20	26
지선	12	181	개항지	우택역	811	우택역	개항지	중성여객	14	19
지선	8	191	효빈대	곽암종점	911	곽암종점	효빈대	대교여객	20	28
지선	10	192	효빈역	항동종점	912	항동종점	효빈역	대교여객	16	22
지선	6	193	효빈역	효빈공단	913	효빈공단	효빈역	남주여객	15~50	50
지선	6	194	장원역	항동종점	914	항동종점	장원역	남주여객	10~30	35
지선	6	219	휴소도	장원역	129	장원역	청덕공원	남주여객	23	30
지선	20	221	휴소도	효빈종합고	221-1	효빈종합고	청덕공원	안천고속	13	18
지선	22	222	과기원	진희동	222-1	진희동	과기원	송포여객,효안교통	10	15
지선	20	231	휴소도	중수포산	321	중수포산	청덕공원	중성여객	18	25
지선	10	232	과기원	현대연수원	322	현대연수원	과기원	임천여객	15~45	50
지선	10	241	휴소도	천문동	421	천문동	청덕공원	효빈여객	22	30
지선	4	242	토모리	귀총면	422	귀총면	토모리	탄성여객	40	50
지선	7	251	토모리	이자공원	521	이자공원	토모리	이자여객	25	35
지선	5	258	청덕공원	고해역	528	고해역	청덕공원	효빈여객	32	40
지선	4	261	토모리	남소면	621	남소면	토모리	탄성여객	42	55
지선	5	262	진희동	남소면	622	남소면	진희동	판주여객	39	50
지선	15	271	토모리	창전상고	721	창전상고	토모리	창전여객	22	30
지선	16	281	청덕공원	엽월대	821	엽월대	청덕공원	송포여객	21	30
지선	20	291	고송나루	곽암종점	921	곽암종점	고송나루	대교여객	22	30
지선	9	292	휴소도	곽암종점	922	곽암종점	청덕공원	판주여객	42	55
지선	6	331	고속터미널	등기산	331-1	등기산	고속터미널	소진여객	28	35
지선	3	334	고속터미널	아진아파트	334-1	아진아파트	고속터미널	월주여객	58	75
지선	11	341	고속터미널	천문동	431	천문동	고속터미널	내삼여객	18	21
지선	10	351	중수포산	이자공원	531	이자공원	중수포산	효안교통	20	26
지선	3	361	고속터미널	파래리	631	파래리	고속터미널	오진여객	54	70
지선	5	371	고속터미널	창전상고	731	창전상고	고속터미널	중성여객	32	40
지선	3	381	중수포산	비마역	831	비마역	중수포산	덕빈고속	68	85
지선	3	391	현대조선소	항동종점	931	항동종점	현대조선소	안천고속	40	55
지선	2	441	루비역	천문동	441-1	천문동	루비역	안천고속	108	120
지선	9	451	흑택역	정근면	541	정근면	흑택역	이자여객	30	40
지선	3	461	흑택역	파래리	641	파래리	흑택역	오진여객	58	70
지선	3	471	천본동	동곡역	741	동곡역	천본동	안천고속	48	60
지선	4	472	천본동	시로역	742	시로역	천본동	창전여객	38	50
지선	4	481	도변역	엽월대	841	엽월대	도변역	청선여객	28	38
지선	4	491	도변역	항동종점	941	항동종점	도변역	대교여객	38	50
지선	6	492	천본동	항동종점	942	항동종점	천본동	남주여객	36	45
지선	4	522	도향면	청덕공원	252	청덕공원	도향면	오진여객	42	55
지선	5	551	이자공원	정근면	551-1	정근면	이자공원	이자여객	37	50
지선	3	552	융문차고지	면허시험장	552-1	면허시험장	융문차고지	안천고속	50	65
지선	3	561	이자역	선곡군청	651	선곡군청	이자역	이자여객	62	80
지선	10	571	이자역	동곡역	751	동곡역	이자역	이자여객	32	42
지선	3	581	이자역	엽월대	851	엽월대	이자역	월주여객	44	60
지선	3	582	융문차고지	효빈동	852	효빈동	융문차고지	내삼여객	72	90
지선	3	591	융문차고지	항동종점	951	항동종점	융문차고지	송포여객	47	54
지선	4	592	정근면	항동종점	952	항동종점	정근면	탄성여객	42	51
지선	3	612	선곡군청	당선역	162	당선역	선곡군청	오진여객	62	80
지선	2	632	선곡군청	북구청	362	북구청	선곡군청	남주여객	120	150
지선	2	661	탄성역	남소면	661-1	남소면	탄성역	탄성여객	180	180
지선	4	671	파래리	동곡역	761	동곡역	파래리	탄성여객	32	42
지선	2	672	남소면	시로역	762	시로역	남소면	이자여객	92	120
지선	4	681	파래리	엽월대	861	엽월대	파래리	덕빈고속	42	52
지선	2	682	남소면	효빈동	862	효빈동	남소면	청엽여객	95	120
지선	1	691	파래리	항동종점	961	항동종점	파래리	오진여객	360	360
지선	4	692	남소면	항동종점	962	항동종점	남소면	오진여객	45	60
지선	3	752	동곡역	면허시험장	572	면허시험장	동곡역	칠양여객	55	70
지선	4	753	팔조역	면허시험장	573	면허시험장	팔조역	오진여객	30	40
지선	29	771	팔조역	진백역	771-1	진백역	팔조역	창전여객	4~7	9~10
지선	14	781	동곡역	우택역	871	우택역	동곡역	청엽여객	23	30
지선	9	791	창전상고	곽암종점	971	곽암종점	창전상고	대교여객	15~75	75
지선	8	792	창전상고	항동종점	972	항동종점	창전상고	내삼여객	15~80	80
지선	8	793	시로역	곽암종점	973	곽암종점	시로역	내삼여객	15~80	80
지선	8	842	엽월대	천본동	482	천본동	엽월대	안천고속	40	48
지선	33	881	엽월대	우택역	881-1	우택역	엽월대	8개회사 공동배차	3~5	7
지선	9	891	우택역	곽암종점	981	곽암종점	우택역	오진여객	33	41
지선	8	892	우택역	항동종점	982	항동종점	우택역	내삼여객	30	40
지선	18	991	월천역	곽암종점	991-1	곽암종점	월천역	판주여객	10	15
좌석	15	1111	선곡군청	효빈역	1111R	효빈역	선곡군청	송포여객	15~18	22~25
좌석	12	2222	염곡신도시	중앙로역	2222R	중앙로역	염곡신도시	칠양여객	16~18	21~22
좌석	11	3333	염곡신도시	중수역	3333R	중수역	염곡신도시	칠양여객	17~20	22~25
좌석	12	4004	원강읍	안천역	4004R	안천역	원강읍	청엽여객	18~22	25~35
좌석	8	5555	홍하면	이자공원	5555R	이자공원	홍하면	청엽여객	25~35	40~50
좌석	12	6666	선곡군청	고송나루	6666R	고송나루	선곡군청	송포여객	18~22	25~30
좌석	10	7777	치원군청	시로역	7777R	시로역	치원군청	임천여객	23~28	26~35
좌석	11	8888	원강읍	청엽구청	8888R	청엽구청	원강읍	효빈여객	18~22	25~30
좌석	12	9999	염곡신도시	월천역	9999R	월천역	염곡신도시	효빈여객	18~23	25~30
광역	12	1000	하미종점	효빈역	1000R	효빈역	하미종점	청엽여객	15	21
광역	9	2000	치원군청	효빈역	2000R	효빈역	치원군청	소진여객	20	24
광역	9	3000	고관종점	효빈역	3000R	효빈역	고관종점	칠양여객	17	22
광역	14	4000	북천동	안천역	4000R	안천역	북천동	소진여객	10	14
광역	7	5000	성가면	창전역	5000R	창전역	성가면	청엽여객	25~35	40~50
광역	9	6000	귀총면	고송나루	6000R	고송나루	귀총면	송포여객	18~22	25~30
광역	8	7000	치원군청	안천역	7000R	안천역	치원군청	임천여객	23~28	26~35
광역	9	8000	원강읍	이자공원	8000R	이자공원	원강읍	송포여객	18~22	25~30
광역	7	9000	치원군청	월천동	9000R	월천동	치원군청	효빈여객	30	38
마을	2	도향01	도향면사무소	도향면사무소	도향01-1	도향면사무소	도향면사무소	효안교통	60~90	60~90
마을	1	도향02	도향면사무소	벽천종점	도향02-1	벽천종점	도향면사무소	효안교통	90~120	90~120
마을	1	도향03	도향면사무소	하공리	도향03-1	하공리	도향면사무소	효안교통	80~100	80~100
마을	2	정근01	정근면사무소	정근면사무소	정근01-1	정근면사무소	정근면사무소	탄성여객	60~90	60~90
마을	1	정근02	정근면사무소	정근면사무소	정근02-1	정근면사무소	정근면사무소	탄성여객	70~100	70~100
마을	2	소원01	소원면사무소	소원면사무소	소원01-1	소원면사무소	소원면사무소	탄성여객	60~80	60~80
마을	2	소원02	소원면사무소	소원면사무소	소원02-1	소원면사무소	소원면사무소	탄성여객	60~80	60~80
마을	4	흑택01	흑택면사무소	흑택면사무소	흑택01-1	흑택면사무소	흑택면사무소	오진여객	35~50	35~50
마을	2	야진01	야진읍사무소	야진읍사무소	야진01-1	야진읍사무소	야진읍사무소	오진여객	75~80	75~80
마을	1	야진02	야진읍사무소	야진읍사무소	야진02-1	야진읍사무소	야진읍사무소	오진여객	90~120	90~120
마을	7	탄성01	탄성군청역	탄성군청역	탄성01-1	탄성군청역	탄성군청역	오진여객	15~25	15~25
마을	2	탄성02	탄성읍사무소	탄성읍사무소	탄성02-1	탄성읍사무소	탄성읍사무소	오진여객	35~50	35~50
마을	6	서목01	서목읍사무소	서목읍사무소	서목01-1	서목읍사무소	서목읍사무소	오진여객	25~35	25~35
마을	4	서목02	서목역	서목역	서목02-1	서목역	서목역	오진여객	35~45	35~45
마을	5	고해01	고해역	고해역	고해01-1	고해역	고해역	탄성여객	25~30	25~30
마을	2	고해02	고해읍사무소	고해읍사무소	고해02-1	고해읍사무소	고해읍사무소	탄성여객	40~45	40~45
마을	9	도변01	도변역	도변역	도변01-1	도변역	도변역	탄성여객	8~12	8~12
마을	3	채산01	채산역	채산역	채산01-1	채산역	채산역	청선여객	25~30	25~30
마을	3	채산02	평전역	평전역	채산02-1	평전역	평전역	청선여객	20~25	20~25
마을	3	내항01	내항역	내항역	내항01-1	내항역	내항역	청선여객	30~40	30~40
마을	4	악부01	팔망성역	팔망성역	악부01-1	팔망성역	팔망성역	안천고속	20~25	20~25
마을	3	뇌전01	뇌전동사무소	뇌전동사무소	뇌전01-1	뇌전동사무소	뇌전동사무소	월주여객	30~40	30~40
마을	3	칠채01	칠채동사무소	칠채동사무소	칠채01-1	칠채동사무소	칠채동사무소	임천여객	35~50	35~50
마을	5	광정01	보통역	보통역	광정01-1	보통역	보통역	창전여객	25~30	25~30
마을	4	곽산01	곽산역	곽산역	곽산01-1	곽산역	곽산역	판주여객	15~20	15~20
공항	12	A01	이자역	효빈국제공항	A01R	효빈국제공항	이자역	이자여객	30~45	30~40
공항	12	A02	곽산역	효빈국제공항	A02R	효빈국제공항	곽산역	소진여객	30~45	30~40
공항	12	A03	도변역	효빈국제공항	A03R	효빈국제공항	도변역	덕빈고속	30~45	30~40`;

    var busMetaDB = {};
    rawScheduleTSV.split('\n').forEach(function(line) {
        var cols = line.split('\t').map(s => s.trim());
        if (cols.length < 11) return;
        var item = {
            type: cols[0], fleet: parseInt(cols[1], 10) || 5,
            fwdNum: cols[2], start: cols[3], end: cols[4],
            revNum: cols[5], revStart: cols[6], revEnd: cols[7],
            company: cols[8], wkInterval: cols[9], weInterval: cols[10]
        };
        busMetaDB[item.type + "_" + item.fwdNum] = item;
        busMetaDB[item.fwdNum] = item;
        busMetaDB[item.revNum] = item;
    });

    window.getHyobinBusMeta = function(rawName) {
        if (!rawName) return null;
        var clean = rawName.replace(/\s+/g, '');
        var m = clean.match(/^(급행|간선|순환|지선|좌석|광역|마을|공항|투어)(?:버스)?(.+)$/);
        if (m) {
            return busMetaDB[m[1] + "_" + m[2]] || busMetaDB[m[2]] || null;
        }
        return busMetaDB[clean] || null;
    };

    var oldStyle = document.getElementById('kmap-bus-ui-style');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'kmap-bus-ui-style';
    style.innerHTML = `
        #kmap-bus-container {
            position: fixed; top: 68px; left: 385px; z-index: 9500;
            display: flex; gap: 12px; align-items: flex-start;
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            pointer-events: none;
        }
        .kmap-panel {
            background: #fff; border-radius: 8px;
            box-shadow: 0 4px 22px rgba(0,0,0,0.24);
            border: 1px solid #cfcfcf; overflow: hidden;
            pointer-events: auto; display: none; flex-direction: column;
        }
        #kmap-route-panel { width: 335px; max-height: 80vh; }
        #kmap-stop-panel { width: 355px; max-height: 80vh; }
        .kmap-header { padding: 16px 18px 12px 18px; border-bottom: 1px solid #eee; position: relative; background: #fff; }
        .kmap-close-btn { position: absolute; top: 14px; right: 14px; background: none; border: none; font-size: 18px; color: #888; cursor: pointer; }
        .kmap-close-btn:hover { color: #111; }
        .kmap-stop-title { font-size: 17px; font-weight: 900; color: #111; margin: 0 24px 4px 0; letter-spacing: -0.5px; }
        .kmap-stop-sub { font-size: 12px; color: #777; margin-bottom: 8px; }
        .kmap-action-bar { display: flex; gap: 5px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
        .kmap-icon-btn { height: 32px; padding: 0 8px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; display:flex; align-items:center; justify-content:center; gap:3px; }
        .kmap-icon-btn:hover { background: #f5f5f5; }
        .kmap-nav-btn { margin-left: auto; background: #258fff; color: #fff; border: none; border-radius: 4px; padding: 0 14px; height: 32px; font-size: 12.5px; font-weight: bold; cursor: pointer; }
        .kmap-sub-bar { background: #f8f9fa; padding: 8px 16px; font-size: 11.5px; color: #666; border-bottom: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center; }
        .kmap-dir-tabs { display: flex; border-bottom: 1px solid #e0e0e0; background: #fafafa; }
        .kmap-dir-tab { flex: 1; text-align: center; padding: 9px 4px; font-size: 12px; font-weight: bold; color: #777; cursor: pointer; border-bottom: 2.5px solid transparent; }
        .kmap-dir-tab.active { color: #258fff; background: #fff; border-bottom-color: #258fff; }
        .kmap-list-body { overflow-y: auto; flex: 1; max-height: 54vh; }
        .kmap-bus-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f2f2f2; cursor: pointer; transition: background 0.12s; }
        .kmap-bus-row:hover { background: #f1f7ff; }
        .kmap-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; color: #fff; font-size: 10.5px; font-weight: 800; margin-right: 6px; }
        .kmap-bus-num { font-size: 14.5px; font-weight: 900; color: #222; }
        .kmap-bus-dir { font-size: 11.5px; color: #777; margin-top: 2px; }
        .kmap-arr-info { text-align: right; font-size: 12.5px; white-space: nowrap; }
        .kmap-arr-soon { color: #e53935; font-weight: 800; }
        .kmap-arr-next { color: #666; font-size: 11.5px; margin-left: 6px; }
        .kmap-timeline { padding: 14px 18px; overflow-y: auto; max-height: 50vh; position: relative; scroll-behavior: smooth; }
        .kmap-tl-item { display: flex; align-items: flex-start; position: relative; padding: 4px 6px 14px 4px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
        .kmap-tl-item:hover { background: #f1f7ff; }
        .kmap-tl-item:hover .kmap-tl-name { color: #258fff; font-weight: 800; }
        .kmap-tl-item.active-stop { background: #eef6ff; }
        .kmap-tl-line { position: absolute; left: 11px; top: 18px; bottom: -4px; width: 4px; background: #2ecc71; }
        .kmap-tl-item:last-child .kmap-tl-line { display: none; }
        .kmap-tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 3px solid #2ecc71; z-index: 2; margin-top: 3px; margin-right: 12px; flex-shrink: 0; }
        .kmap-tl-name { font-size: 13px; color: #222; font-weight: 500; line-height: 1.3; }
        .kmap-tl-id { font-size: 11px; color: #999; margin-top: 2px; }
        .kmap-bus-icon-float { position: absolute; left: 1px; top: 2px; background: #258fff; color: #fff; font-size: 9px; padding: 1px 3px; border-radius: 3px; z-index: 3; font-weight: bold; }
    `;
    document.head.appendChild(style);

    function ensureContainer() {
        if (!document.getElementById('kmap-bus-container')) {
            var container = document.createElement('div');
            container.id = 'kmap-bus-container';
            container.innerHTML = `<div id="kmap-route-panel" class="kmap-panel"></div><div id="kmap-stop-panel" class="kmap-panel"></div>`;
            document.body.appendChild(container);
        }
    }

    function getStopId(lat, lng) {
        return "31" + String((Math.abs(Math.round(lat * 3 + lng * 7)) % 899) + 100);
    }

    function parseHeadwayMin(intervalStr) {
        if (!intervalStr) return 15;
        var nums = String(intervalStr).match(/\d+/g);
        if (!nums || nums.length === 0) return 15;
        if (nums.length >= 2) return Math.round((parseInt(nums[0], 10) + parseInt(nums[1], 10)) / 2);
        return parseInt(nums[0], 10);
    }

    function getRealtimeArrival(busKey, stopName, meta) {
        var now = new Date();
        var isWeekend = (now.getDay() === 0 || now.getDay() === 6);
        var intervalStr = meta ? (isWeekend ? meta.weInterval : meta.wkInterval) : "12~15";
        var headway = Math.max(4, parseHeadwayMin(intervalStr));

        var sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        var seed = 0;
        var str = busKey + "_" + stopName;
        for (var i = 0; i < str.length; i++) seed += str.charCodeAt(i) * (i + 3);

        var periodSec = headway * 60;
        var remainSec1 = periodSec - ((sec + seed * 41) % periodSec);
        var remainMin1 = Math.floor(remainSec1 / 60);
        var remainMin2 = remainMin1 + headway;

        if (headway >= 60 && remainMin1 > 35) return { first: `약 ${remainMin1}분`, second: "정보없음" };
        if (remainMin1 === 0) return { first: "곧 도착", second: `${remainMin2}분` };
        if (remainMin1 <= 2) return { first: `${remainMin1}분 (전전)`, second: `${remainMin2}분` };
        return { first: `${remainMin1}분`, second: `${remainMin2}분` };
    }

    // ★ 좌측 노선도 타임라인에서 정류장을 클릭했을 때 우측 패널도 해당 정류장으로 즉시 전환!
    window.selectStopFromTimeline = function(stopName, lat, lng) {
        map.flyTo([lat, lng], 0, { animate: true, duration: 0.6 });

        var targetItem = (window.myLandmarks || []).find(m => m.type === 'busStop' && (m.name === stopName || (Math.abs(m.lat - lat) <= 5 && Math.abs(m.lng - lng) <= 5)));
        if (!targetItem && typeof allLandmarks !== 'undefined') {
            targetItem = allLandmarks.find(m => m.type === 'busStop' && (m.name === stopName || (Math.abs(m.lat - lat) <= 5 && Math.abs(m.lng - lng) <= 5)));
        }

        var targetMarker = null;
        if (typeof busStopLayer !== 'undefined') {
            busStopLayer.eachLayer(function(mk) {
                var ll = mk.getLatLng();
                if (Math.abs(ll.lat - lat) <= 5 && Math.abs(ll.lng - lng) <= 5) targetMarker = mk;
            });
        }

        if (targetItem) {
            window.openKakaoBusStopPanel(targetItem, targetMarker);
        }
    };

    // 1. 우측 [정류장 실시간 버스 도착정보] 패널
    window.openKakaoBusStopPanel = function(item, marker) {
        ensureContainer();
        var stopPanel = document.getElementById('kmap-stop-panel');
        if (!stopPanel) return;

        var cleanStopName = (item.name || "정류장").replace(/ 정류장$/, '');
        var stopId = getStopId(item.lat, item.lng);
        var addrObj = (typeof resolveFullAddress === 'function') ? resolveFullAddress(item.lat, item.lng) : { legal: "" };
        var nowStr = new Date().toTimeString().slice(0, 5);

        var rawBusStrings = item.passingBuses || [];
        var displayRows = [];

        rawBusStrings.forEach(function(bStr) {
            var clean = bStr.replace(/<[^>]*>?/gm, '').trim();
            var m = clean.match(/^\[(.*?)\]\s*(.+)$/);
            var bType = m ? m[1] : "간선";
            var bName = m ? m[2] : clean;
            var color = (typeof busColors !== 'undefined' && busColors[bType]) ? busColors[bType] : "#01B7ED";
            var meta = window.getHyobinBusMeta(bName);

            var fwdNum = meta ? meta.fwdNum : bName.replace(/^(간선|지선|광역|좌석|급행|순환|공항|마을)버스\s*/, '');
            var fwdStart = meta ? meta.start : "기점";
            var fwdEnd = meta ? meta.end : (addrObj.legal || "종점");

            displayRows.push({
                rawName: bName, type: bType, color: color, isReverse: false,
                dispNum: fwdNum, routeSub: `(${fwdStart} ↔ ${fwdEnd})`,
                dirText: `${fwdEnd} 방면`, meta: meta
            });

            if (meta && meta.revNum) {
                displayRows.push({
                    rawName: bName, type: bType, color: color, isReverse: true,
                    dispNum: meta.revNum, routeSub: `(${meta.revStart} ↔ ${meta.revEnd})`,
                    dirText: `${meta.revEnd} 방면 (역방향)`, meta: meta
                });
            }
        });

        var listHtml = "";
        if (displayRows.length === 0) {
            listHtml = `<div style="padding:30px; text-align:center; color:#999; font-size:13px;">정차하는 노선이 없습니다.</div>`;
        } else {
            listHtml = displayRows.map(function(r) {
                var arr = getRealtimeArrival(r.dispNum, cleanStopName, r.meta);
                var safeBName = r.rawName.replace(/'/g, "\\'");
                var safeStop = cleanStopName.replace(/'/g, "\\'");
                return `
                    <div class="kmap-bus-row" onclick="window.openKakaoBusRoutePanel('${safeBName}', '${r.color}', '${r.type}', '${safeStop}', ${r.isReverse})">
                        <div style="flex:1; padding-right:8px;">
                            <div>
                                <span class="kmap-badge" style="background:${r.color};">${r.type}</span>
                                <span class="kmap-bus-num">${r.dispNum}</span>
                                <span style="font-size:11.5px; color:#555; margin-left:3px;">${r.routeSub}</span>
                            </div>
                            <div class="kmap-bus-dir">${r.dirText}${r.meta ? ' · ' + r.meta.company : ''}</div>
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
                <div class="kmap-stop-sub">${stopId} · ${addrObj.gugun || '효빈시'} ${addrObj.legal || ''}</div>
                <div class="kmap-action-bar">
                    <button class="kmap-icon-btn" title="정류장 노선/이름 편집" onclick="window.openLegacyBusEdit()">✏️ 편집</button>
                    <button class="kmap-icon-btn" title="전체 정류장 데이터를 영구 JS 코드로 추출" onclick="window.exportHardcodedBusStopsJS()" style="color:#0077DD; border-color:#0077DD; background:#eef6ff;">💾 JS추출</button>
                    <button class="kmap-nav-btn" onclick="alert('${cleanStopName}(으)로 길찾기를 시작합니다.')">↱ 길찾기</button>
                </div>
            </div>
            <div class="kmap-sub-bar">
                <span>실시간 버스정보 (순방향·역방향)</span>
                <span style="cursor:pointer; font-weight:bold; color:#258fff;" onclick="window.openKakaoBusStopPanel(window._lastClickedStopItem, window._lastClickedStopMarker)">${nowStr} ↻</span>
            </div>
            <div class="kmap-list-body">${listHtml}</div>
        `;
        stopPanel.style.display = 'flex';

        // 만약 좌측 노선도 패널이 이미 열려 있다면, 현재 클릭한 정류장에 파란불이 들어오도록 동기화!
        var routePanel = document.getElementById('kmap-route-panel');
        if (routePanel && routePanel.style.display === 'flex' && window._currentRouteArgs) {
            var a = window._currentRouteArgs;
            window.openKakaoBusRoutePanel(a.busName, a.bColor, a.bType, cleanStopName, a.isReverse);
        }
    };

    // 2. 좌측 [노선 상세 & 정방향/역방향 정류장 타임라인] 패널
    window.openKakaoBusRoutePanel = function(busName, bColor, bType, currentStopName, isReverse) {
        ensureContainer();
        var routePanel = document.getElementById('kmap-route-panel');
        if (!routePanel) return;

        window._currentRouteArgs = { busName: busName, bColor: bColor, bType: bType, isReverse: !!isReverse };

        if (typeof highlightBusRoute === 'function') {
            currentHighlightedBus = null;
            highlightBusRoute(busName, bColor);
        }

        var meta = window.getHyobinBusMeta(busName);
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

        if (isReverse) {
            allStops = allStops.slice().reverse();
        }

        var dispNum = meta ? (isReverse ? meta.revNum : meta.fwdNum) : busName;
        var startName = meta ? (isReverse ? meta.revStart : meta.start) : (allStops[0] ? allStops[0].name.replace(/ 정류장$/,'') : "기점");
        var endName = meta ? (isReverse ? meta.revEnd : meta.end) : (allStops.length > 0 ? allStops[allStops.length-1].name.replace(/ 정류장$/,'') : "종점");
        var companyTxt = meta ? meta.company : "효빈시내버스운송조합";
        var wkTxt = meta ? meta.wkInterval : "10~15";
        var weTxt = meta ? meta.weInterval : "15~20";
        var fleetCnt = meta ? meta.fleet : Math.max(4, Math.ceil(allStops.length / 4));

        var timelineHtml = allStops.map(function(st, idx) {
            var stClean = st.name.replace(/ 정류장$/, '');
            var isCur = currentStopName && (stClean === currentStopName);
            var busStep = Math.max(3, Math.floor(allStops.length / Math.max(2, Math.min(6, Math.floor(fleetCnt / 2)))));
            var hasBusHere = (idx % busStep === (new Date().getMinutes() % busStep));
            var safeFullStopName = st.name.replace(/'/g, "\\'");
            return `
                <div class="kmap-tl-item ${isCur ? 'active-stop' : ''}" id="${isCur ? 'kmap-active-tl-stop' : ''}" onclick="window.selectStopFromTimeline('${safeFullStopName}', ${st.lat}, ${st.lng})">
                    <div class="kmap-tl-line" style="background:${bColor};"></div>
                    ${hasBusHere ? `<div class="kmap-bus-icon-float">🚌</div>` : ''}
                    <div class="kmap-tl-dot" style="border-color:${bColor}; ${isCur ? 'background:'+bColor+'; transform:scale(1.25);' : ''}"></div>
                    <div>
                        <div class="kmap-tl-name" style="${isCur ? 'color:#258fff; font-weight:900;' : ''}">${stClean} ${isCur ? '<span style="font-size:10px; background:#258fff; color:#fff; padding:1px 5px; border-radius:3px; margin-left:4px;">선택정류장</span>' : ''}</div>
                        <div class="kmap-tl-id">${getStopId(st.lat, st.lng)}</div>
                    </div>
                </div>
            `;
        }).join('');

        var safeBName = busName.replace(/'/g, "\\'");
        var safeCurStop = (currentStopName || "").replace(/'/g, "\\'");

        routePanel.innerHTML = `
            <div class="kmap-header">
                <button class="kmap-close-btn" onclick="document.getElementById('kmap-route-panel').style.display='none'; if(typeof resetBusHighlight==='function') resetBusHighlight();">✕</button>
                <div class="kmap-stop-title">
                    <span class="kmap-badge" style="background:${bColor}; font-size:12px; vertical-align:middle;">${bType}</span>
                    <span style="vertical-align:middle;">${dispNum} (${startName} ➔ ${endName})</span>
                </div>
                <div class="kmap-stop-sub">운수사: <b>${companyTxt}</b> · 인가 <b>${fleetCnt}대</b></div>
                <div style="font-size:11.5px; color:#555; line-height:1.5;">
                    평일 배차 <b>${wkTxt}분</b> / 주말 <b>${weTxt}분</b><br>
                    <span style="color:#009000; font-weight:bold;">🟢 현재 ${Math.max(1, Math.round(fleetCnt * 0.75))}대 실시간 운행중</span>
                </div>
            </div>
            <div class="kmap-dir-tabs">
                <div class="kmap-dir-tab ${!isReverse ? 'active' : ''}" onclick="window.openKakaoBusRoutePanel('${safeBName}', '${bColor}', '${bType}', '${safeCurStop}', false)">
                    순방향 (${meta ? meta.fwdNum : '정방향'})
                </div>
                <div class="kmap-dir-tab ${isReverse ? 'active' : ''}" onclick="window.openKakaoBusRoutePanel('${safeBName}', '${bColor}', '${bType}', '${safeCurStop}', true)">
                    역방향 (${meta ? meta.revNum : '역방향'})
                </div>
            </div>
            <div class="kmap-sub-bar">
                <span>효빈광역시 BIS 실시간 제공</span>
                <span>경유 정류장 <b>${allStops.length}</b>개</span>
            </div>
            <div class="kmap-timeline" id="kmap-timeline-box">${timelineHtml || '<div style="padding:20px; text-align:center; color:#999;">등록된 경유 정류장이 없습니다.</div>'}</div>
        `;
        routePanel.style.display = 'flex';

        // 선택된 정류장이 타임라인 가운데에 오도록 자동 스크롤
        setTimeout(function() {
            var activeEl = document.getElementById('kmap-active-tl-stop');
            var boxEl = document.getElementById('kmap-timeline-box');
            if (activeEl && boxEl) {
                boxEl.scrollTop = activeEl.offsetTop - boxEl.clientHeight / 2 + 24;
            }
        }, 60);
    };

    window.openLegacyBusEdit = function() {
        if (window._lastClickedStopItem && window._lastClickedStopMarker && typeof window._origOpenBusStopEditModal === 'function') {
            window._origOpenBusStopEditModal(window._lastClickedStopItem, window._lastClickedStopMarker);
        }
    };

    // =========================================================
    // 💾 3. 버스 정류장 영구 하드코딩용 JS 파일/코드 원클릭 추출기
    // =========================================================
    window.exportHardcodedBusStopsJS = function() {
        var stops = (window.myLandmarks || []).filter(m => m.type === 'busStop');
        if (stops.length === 0) {
            alert("추출할 버스 정류장 데이터가 없습니다."); return;
        }

        // 방법 A: 독립된 JS 파일용 (보정된 현재 지도 좌표 그대로 저장 -> localStorage가 비어있어도 자동 로드됨)
        var cleanStopsDirect = stops.map(function(s) {
            return {
                name: s.name,
                lat: Math.round(s.lat),
                lng: Math.round(s.lng),
                type: "busStop",
                color: "#333",
                isManual: true,
                allPassingBuses: s.allPassingBuses || s.passingBuses || [],
                passingBuses: s.passingBuses || []
            };
        });

        // 방법 B: hyobin_markers_2.js(defaultLandmarksData) 내부에 직접 붙여넣기용 (lat에 +19822 역보정 적용)
        var cleanStopsShifted = stops.map(function(s) {
            return {
                name: s.name,
                lat: Math.round(s.lat + 19822),
                lng: Math.round(s.lng),
                type: "busStop",
                color: "#333",
                isManual: true,
                allPassingBuses: s.allPassingBuses || s.passingBuses || [],
                passingBuses: s.passingBuses || []
            };
        });

        var standaloneJsCode = `// =========================================================\n` +
            `// 🚏 효빈광역시 버스 정류장 영구 하드코딩 데이터 (총 ${stops.length}개)\n` +
            `// - 사용법: 이 코드를 hb_map_config_2.js 맨 위나 별도 js 파일로 연결하면,\n` +
            `//   브라우저 캐시(localStorage)를 지워도 정류장이 100% 영구 유지됩니다!\n` +
            `// =========================================================\n` +
            `var hardcodedBusStops = ${JSON.stringify(cleanStopsDirect, null, 4)};\n\n` +
            `(function() {\n` +
            `    if (typeof window.myLandmarks !== 'undefined') {\n` +
            `        var existingStops = window.myLandmarks.filter(m => m.type === 'busStop');\n` +
            `        if (existingStops.length === 0) {\n` +
            `            window.myLandmarks = window.myLandmarks.concat(hardcodedBusStops);\n` +
            `            localStorage.setItem('hyobin_markers', JSON.stringify(window.myLandmarks));\n` +
            `            if (typeof addMarkerToMap === 'function') hardcodedBusStops.forEach(s => addMarkerToMap(s));\n` +
            `        }\n` +
            `    }\n` +
            `})();\n`;

        var defaultDataCode = `// [defaultLandmarksData 배열 맨 아래에 추가할 경우 사용 (lat +19822 적용본)]\n` +
            JSON.stringify(cleanStopsShifted, null, 4);

        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; padding:22px; box-shadow:0 10px 40px rgba(0,0,0,0.6); z-index:99999; width:680px; height:560px; display:flex; flex-direction:column; border-radius:10px; font-family:"Noto Sans KR", sans-serif;';
        modal.innerHTML = `
            <h3 style="margin:0 0 8px 0; color:#0077DD; border-bottom:2px solid #0077DD; padding-bottom:10px;">💾 버스 정류장 영구 하드코딩 추출기 (총 ${stops.length}개)</h3>
            <div style="font-size:12.5px; color:#333; margin-bottom:10px; line-height:1.5; background:#f1f7ff; padding:8px 12px; border-radius:6px;">
                <b>💡 가장 쉬운 영구 박제 방법:</b><br>
                아래 <b>[📥 hyobin_bus_stops.js 파일 다운로드]</b>를 누르거나 <b>[전체 복사]</b>를 눌러서 <code>hb_map_config_2.js</code> 맨 아래에 붙여넣으시면, 앞으로 로컬스토리지를 초기화해도 정류장이 영구적으로 남아있습니다!
            </div>
            <textarea id="bus-hardcode-textarea" style="flex:1; width:100%; font-family:monospace; font-size:11.5px; padding:10px; border:1px solid #ccc; border-radius:4px; resize:none;" readonly></textarea>
            <div style="display:flex; justify-content:space-between; margin-top:12px; gap:8px;">
                <div>
                    <button id="mode-standalone-btn" style="padding:8px 12px; background:#0077DD; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">방식1: 독립 스크립트 코드(추천)</button>
                    <button id="mode-shifted-btn" style="padding:8px 12px; background:#eee; color:#333; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">방식2: defaultLandmarksData 합치기용(+19822)</button>
                </div>
                <div>
                    <button id="dl-js-file-btn" style="padding:8px 14px; background:#00c853; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">📥 .js 파일 다운로드</button>
                    <button id="copy-js-code-btn" style="padding:8px 14px; background:#333; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">📋 복사</button>
                    <button id="close-js-modal-btn" style="padding:8px 14px; background:#ddd; color:#222; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">닫기</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        var ta = document.getElementById('bus-hardcode-textarea');
        ta.value = standaloneJsCode;

        document.getElementById('mode-standalone-btn').onclick = function() {
            ta.value = standaloneJsCode;
            this.style.background = '#0077DD'; this.style.color = '#fff';
            document.getElementById('mode-shifted-btn').style.background = '#eee'; document.getElementById('mode-shifted-btn').style.color = '#333';
        };
        document.getElementById('mode-shifted-btn').onclick = function() {
            ta.value = defaultDataCode;
            this.style.background = '#0077DD'; this.style.color = '#fff';
            document.getElementById('mode-standalone-btn').style.background = '#eee'; document.getElementById('mode-standalone-btn').style.color = '#333';
        };
        document.getElementById('copy-js-code-btn').onclick = function() {
            ta.select(); document.execCommand('copy'); alert("코드가 클립보드에 복사되었습니다!");
        };
        document.getElementById('dl-js-file-btn').onclick = function() {
            var blob = new Blob([ta.value], { type: "application/javascript;charset=utf-8;" });
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "hyobin_bus_stops.js";
            link.click();
        };
        document.getElementById('close-js-modal-btn').onclick = function() {
            document.body.removeChild(modal);
        };
    };

    if (typeof window.openBusStopEditModal === 'function' && !window._origOpenBusStopEditModal) {
        window._origOpenBusStopEditModal = window.openBusStopEditModal;
    }
    window.openBusStopEditModal = function(item, marker) {
        window.openKakaoBusStopPanel(item, marker);
    };
})();

// =========================================================
// 🚏 효빈광역시 버스 정류장 영구 하드코딩 데이터 (총 1865개)
// - 사용법: 이 코드를 hb_map_config_2.js 맨 위나 별도 js 파일로 연결하면,
//   브라우저 캐시(localStorage)를 지워도 정류장이 100% 영구 유지됩니다!
// =========================================================
var hardcodedBusStops = [
];

(function() {
    if (typeof window.myLandmarks !== 'undefined') {
        var existingStops = window.myLandmarks.filter(m => m.type === 'busStop');
        if (existingStops.length === 0) {
            window.myLandmarks = window.myLandmarks.concat(hardcodedBusStops);
            localStorage.setItem('hyobin_markers', JSON.stringify(window.myLandmarks));
            if (typeof addMarkerToMap === 'function') hardcodedBusStops.forEach(s => addMarkerToMap(s));
        }
    }
})();
