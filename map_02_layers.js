// =========================================================
// 4. 레이어 정의 (카테고리별 레이어 전면 분리 및 호환성 완벽 보장)
// =========================================================
var guGunLayer = L.layerGroup();    
var adminLayer = L.layerGroup();    
var legalLayer = L.layerGroup();    
var devLayer = L.layerGroup();      
var subwayLineLayer = L.layerGroup(); 
var subwayStationLayer = L.layerGroup(); 
var gridLayer = L.layerGroup();
var busLineLayer = L.layerGroup(); 
var busStopLayer = L.layerGroup();
var roadLayer = L.layerGroup(); 

// ★ 일반 마커를 10개 주제별로 쪼갠 레이어 그룹 (개별 On/Off)
var catLayers = {
    "education": L.layerGroup(),   // 학교/교육
    "residence": L.layerGroup(),   // 주거/아파트
    "public": L.layerGroup(),      // 공공/관공서
    "commercial": L.layerGroup(),  // 상업/마트/편의점
    "food": L.layerGroup(),        // 식당/카페
    "culture": L.layerGroup(),     // 문화/종교/숙박
    "medical": L.layerGroup(),     // 의료/병원
    "infra": L.layerGroup(),       // 교통/인프라/공장
    "nature": L.layerGroup(),      // 자연/공원
    "normal": L.layerGroup()       // 기타 일반
};

// ★ [에러 방지] map_04_ui.js 호환용 변수 선언 (ReferenceError 완벽 차단)
var normalMarkerLayer = catLayers.normal;

// 35종 세부 타입을 10대 레이어로 연결해주는 자동 분류기
var groupMap = {
    "school": "education", "apartment": "residence",
    "office_main": "public", "office_sub": "public", "office_etc": "public", "police": "public", "fire_station": "public", "post_office": "public", "welfare": "public",
    "commercial": "commercial", "market": "commercial", "cvs": "commercial", "bank": "commercial",
    "restaurant": "food", "fastfood": "food", "cafe": "food", "bakery": "food", "pub": "food",
    "hotel": "culture", "culture": "culture", "cinema": "culture", "anime": "culture", "religion": "culture", "sports": "culture",
    "hospital": "medical", "pharmacy": "medical",
    "station": "infra", "airport": "infra", "port": "infra", "parking": "infra", "toilet": "infra", "factory": "infra",
    "mountain": "nature", "water": "nature", "park": "nature",
    "normal": "normal"
};

// 구역(폴리곤) 데이터 병합 및 렌더링
if (typeof districtData !== 'undefined') {
    var mergedDict = {};
    districtData.forEach(function(d) {
        var key = d.name + "_" + (d.type || "none"); 
        var newPoints = Array.isArray(d.points[0][0]) ? d.points : [d.points];
        if (!mergedDict[key]) {
            mergedDict[key] = Object.assign({}, d);
            mergedDict[key].points = newPoints;
        } else {
            mergedDict[key].points = mergedDict[key].points.concat(newPoints);
        }
    });
    
    districtData = Object.values(mergedDict);

    districtData.forEach(function(d) {
        var color = d.color || getColorByName(d.name);
        var name = d.name;
        var targetLayer; var layerType = ""; 
        var isNewTown = name.includes("신도시") || name.includes("개발") || name.includes("지구") || name.includes("타운");
        
        if (d.type === "legal") { targetLayer = legalLayer; layerType = "legal"; } 
        else if (d.type === "admin") { targetLayer = adminLayer; layerType = "admin"; } 
        else if (isNewTown) { targetLayer = devLayer; layerType = "dev"; } 
        else if ((name.endsWith("구") || name.endsWith("군") || name.endsWith("시")) && !name.includes("읍") && !name.includes("면")) { targetLayer = guGunLayer; layerType = "gugun"; } 
        else if (name.includes("가") || name.endsWith("리") || name.includes("중앙로") || name === "훈동") { targetLayer = legalLayer; layerType = "legal"; } 
        else { targetLayer = adminLayer; layerType = "admin"; }
        
        var dashStyle = null; var weightStyle = 1; var opacity = 0.7;
        if (targetLayer === devLayer) { dashStyle = '10, 10'; weightStyle = 4; opacity = 0.9; }
        else if (targetLayer === guGunLayer) { weightStyle = 3; opacity = 1.0; }
        else if (targetLayer === adminLayer) { dashStyle = '5, 5'; weightStyle = 2; opacity = 0.5; }
        else if (targetLayer === legalLayer) { weightStyle = 1; opacity = 0.8; }

        var polyPoints = shiftPoints(d.points); 
        L.polygon(polyPoints, { color: color, fillColor: color, fillOpacity: 0.15, weight: weightStyle, dashArray: dashStyle, opacity: opacity, interactive: false }).addTo(targetLayer);
        searchablePolygons.push({ name: name, type: layerType, points: polyPoints });
        var center = L.polygon(polyPoints).getBounds().getCenter();
        L.marker(center, { icon: L.divIcon({ className: 'district-label', html: name.split('(')[0], iconSize: [120, 20], iconAnchor: [60, 10] }) }).addTo(targetLayer);
    });
}

// 그리드 레이어 생성
var gridWidth = 2000;  
var gridHeight = 1500; 
var gridCells = {}; 
var gridNum = 1;
for (var x = 0; x <= totalWidth; x += gridWidth) { L.polyline([[0, x], [-totalHeight, x]], { color: 'gray', weight: 1, opacity: 0.4, dashArray: '5, 5', interactive: false }).addTo(gridLayer); }
for (var y = 0; y >= -totalHeight; y -= gridHeight) { L.polyline([[y, 0], [y, totalWidth]], { color: 'gray', weight: 1, opacity: 0.4, dashArray: '5, 5', interactive: false }).addTo(gridLayer); }
for (var y = 0; y > -totalHeight; y -= gridHeight) {
    for (var x = 0; x < totalWidth; x += gridWidth) {
        var bounds = [[y - gridHeight, x], [y, x + gridWidth]]; 
        var center = [y - gridHeight / 2, x + gridWidth / 2];   
        L.marker(center, {
            icon: L.divIcon({ className: 'grid-number-label', html: `<div style="color:gray; font-size:30px; font-weight:bold; opacity:0.6; text-align:center;">${gridNum}</div>`, iconSize: [50, 50], iconAnchor: [25, 25] }),
            interactive: false 
        }).addTo(gridLayer);
        gridCells[gridNum] = bounds; 
        gridNum++;
    }
}

// =========================================================
// 5. 마커 데이터 통합 (파일에서 불러와서 좌표 보정)
// =========================================================
var myLandmarks = JSON.parse(localStorage.getItem('hyobin_markers')) || [];
myLandmarks.forEach(m => { 
    if(!m.type) m.type = 'normal'; 
    if(m.type === 'subway' && !m.name.endsWith('역')) m.name += '역'; 
});

var processedDefaultLandmarks = [];
if (typeof defaultLandmarksData !== 'undefined') {
    processedDefaultLandmarks = defaultLandmarksData.map(function(m) {
        var mName = m.name;
        if (m.type === 'subway' && !mName.endsWith('역')) mName += '역';
        return { name: mName, lat: m.lat + adjustY, lng: m.lng, color: m.color, type: m.type, phone: m.phone, desc: m.desc, image: m.image, hours: m.hours };
    });
}

var allLandmarks = processedDefaultLandmarks.concat(myLandmarks);
window.allLandmarks = allLandmarks; // 새 창 상세페이지에서 랭킹 계산할 때 참조하도록 전역 등록

if (typeof subwayData !== 'undefined') {
    if (subwayData.markers) {
        var mergedSubwayMarkers = Array.isArray(subwayData.markers) ? subwayData.markers : Object.values(subwayData.markers).flat();
        var processedSubwayMarkers = mergedSubwayMarkers.map(m => {
            var newName = m.name;
            if (!newName.endsWith('역')) newName += '역';
            return Object.assign({}, m, { name: newName, lat: m.lat + adjustY });
        });
        allLandmarks = allLandmarks.concat(processedSubwayMarkers);
        window.allLandmarks = allLandmarks;
    }
    if (subwayData.lines) {
        subwayData.lines.forEach(function(line) {
            var correctedPoints = line.points.map(p => [p[0] + adjustY, p[1]]);
            var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name) || "";
            if (!lineKey) lineKey = Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
            var poly = L.polyline(correctedPoints, { color: line.color, weight: 5, opacity: 0.8 });
            poly.bindTooltip(line.name, { sticky: true });
            poly.lineCode = lineKey; 
            poly.addTo(subwayLineLayer);
        });
    }
}

// 주요 도로망 그리기
if (typeof roadData !== 'undefined') {
    var roadOffsetY = adjustY; 
    roadData.forEach(function(road) {
        var shiftedPoints = road.points.map(function(pt) {
            if (Array.isArray(pt[0])) { return pt.map(function(innerPt) { return [innerPt[0] + roadOffsetY, innerPt[1]]; }); } 
            else { return [pt[0] + roadOffsetY, pt[1]]; }
        });
        var poly = L.polyline(shiftedPoints, { color: "#1A237E", weight: 6, opacity: 0.9 });
        poly.bindTooltip(`🛣️ ${road.name}`, { sticky: true });
        poly.addTo(roadLayer);

        var labelPt = shiftedPoints[0];
        if (Array.isArray(labelPt[0])) { labelPt = labelPt[0]; }
        var labelHtml = `<div class="station-name-label" style="position: absolute; color:#fff; font-size:12px; font-weight:bold; white-space: nowrap; text-shadow:-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; top: -20px; left: 50%; transform: translateX(-50%);">${road.name}</div>`;
        var labelMarker = L.marker(labelPt, { icon: L.divIcon({ className: 'custom-bus-stop', html: labelHtml, iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false });
        labelMarker.addTo(roadLayer);
    });
}


// =========================================================
// 🚌 버스 레이어 및 데이터 그리기 (좌표 보정 완벽 동기화 정석 버전)
// =========================================================
// =========================================================
// 🚌 버스 레이어 및 데이터 그리기 (원래 잘 되던 +19822 보정 공식 완벽 복구판)
// =========================================================
var busLineLayer = L.layerGroup(); 
var allBusLines = []; 
var busColors = {
    "간선": "#01B7ED", "순환": "#E7D600", "지선": "#37B484",
    "광역": "#485EC6", "좌석": "#FF5800", "마을": "#A664A0",
    "공항": "#84C36E", "투어": "#7777AA", "급행": "#D81C2F"
};

// rawBusJson 데이터가 있고 busData가 정의되지 않았을 경우 자동 연동
if (typeof busData === 'undefined' && typeof rawBusJson !== 'undefined' && rawBusJson.lines) {
    window.busData = rawBusJson.lines;
}

if (typeof busData !== 'undefined') {
    // ★ 핵심: 이전에 잘 되던 방식 그대로, Y좌표에 +19822 보정을 먼저 태우고 전역 adjustY를 적용합니다.
    var processedBusData = rawBusJson.lines.map(function(bus) {
        var inferredType = "간선";
        if (bus.name.includes("급행") || bus.color === "#d81c2f") inferredType = "급행";
        else if (bus.name.includes("순환") || bus.color === "#e7d600") inferredType = "순환";
        else if (bus.name.includes("마을") || bus.color === "#A664A0") inferredType = "마을";
        else if (bus.name.includes("광역") || bus.color === "#485EC6") inferredType = "광역";
        else if (bus.name.includes("지선") || bus.color === "#37B484") inferredType = "지선";
        else if (bus.name.includes("좌석") || bus.color === "#FF5800") inferredType = "좌석";
        else if (bus.name.includes("공항") || bus.color === "#84C36E") inferredType = "공항";
        else if (bus.name.includes("시티투어") || bus.color === "#7777AA") inferredType = "시티투어";

        // 1차로 원래 잘 되던 +19822 보정 후, 지도 전체 이동용 adjustY를 더해줍니다.
        var correctedPoints = bus.points.map(function(p) {
            var baseY = p[0] + 19822;
            return [baseY + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]];
        });

        return {
            name: bus.name,
            type: inferredType,
            points: correctedPoints
        };
    });

    processedBusData.forEach(function(bus) {
        var bColor = busColors[bus.type] || '#888888';
        
        let busSubGroup = bus.type;
        window.busNumMatch = bus.name.match(/\d+/);
        if (window.busNumMatch) {
            let num = parseInt(window.busNumMatch[0], 10);
            if (bus.type === "간선") busSubGroup = `간선 [${Math.floor(num / 10) * 10}번대]`;
            else if (bus.type === "지선") busSubGroup = `지선 [${Math.floor(num / 100) * 100}번대]`;
        }
        
        var poly = L.polyline(bus.points, { 
            color: bColor, weight: 4, opacity: 0.85, dashArray: '7, 5' 
        });
        
        var fullBusName = `[${bus.type}] ${bus.name}`;
        poly.bindTooltip(`🚌 ${fullBusName}`, { sticky: true });
        poly.busType = busSubGroup; 
        
        poly.rawBusName = bus.name; 
        poly.bColor = bColor;
        poly.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (typeof highlightBusRoute === 'function') highlightBusRoute(this.rawBusName, this.bColor); 
        });
        
        allBusLines.push(poly);
        poly.addTo(busLineLayer); 

        if (bus.points.length > 2) {
            var midIdx = Math.floor(bus.points.length / 2);
            var midPt = bus.points[midIdx];
            var labelHtml = `<div class="station-name-label" style="position: absolute; color:${bColor}; font-size:11px; font-weight:bold; white-space: nowrap; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; top: -15px; left: 50%; transform: translateX(-50%);">${fullBusName}</div>`;
            var labelMarker = L.marker(midPt, {
                icon: L.divIcon({ className: 'custom-bus-stop', html: labelHtml, iconSize: [16, 16], iconAnchor: [8, 8] }),
                interactive: false 
            });
            labelMarker.busType = busSubGroup; 
            allBusLines.push(labelMarker); 
            labelMarker.addTo(busLineLayer);
        }
    });
}

var activeMarkers = [];
var markerColors = {
    "mountain": "#558B2F", "water": "#1976D2", "park": "#4CAF50",
    "office_main": "#1A237E", "office_sub": "#3949AB", "office_etc": "#3F51B5", "police": "#0D47A1", "fire_station": "#D32F2F", "post_office": "#E65100", "welfare": "#00897B",
    "school": "#FFCA28", "apartment": "#795548",
    "bank": "#0288D1", "commercial": "#F57C00", "market": "#8D6E63", "cvs": "#8BC34A",
    "cafe": "#6D4C41", "bakery": "#F4A460", "fastfood": "#FF5252", "restaurant": "#FFB300", "pub": "#673AB7",
    "hotel": "#AB47BC", "culture": "#C2185B", "cinema": "#E53935", "anime": "#E040FB", "religion": "#5D4037", "sports": "#0277BD",
    "hospital": "#00ACC1", "pharmacy": "#43A047",
    "parking": "#455A64", "toilet": "#0097A7", "airport": "#006064", "port": "#01579B", "station": "#C62828", "factory": "#757575", "normal": "#333333"
};

function calculateSize(zoom) { return Math.max(baseMarkerSize + (zoom * sizeMultiplier), minMarkerSize); }

// =========================================================
// SVG 아이콘 생성 함수
// =========================================================
function createFacilityCustomIcon(type, color, size) {
    if (!color) color = "#333333";
    var actualSize = Math.max(size || 36, 32); 
    var iconPath = "";

    switch (type) {
        case 'police': 
            iconPath = `M256 0L32 64v128c0 141.4 96 264.8 224 320 128-55.2 224-178.6 224-320V64L256 0zm0 128c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm0 288c-44.2 0-84.9-18.4-114-48 11.2-22.4 43.1-32 114-32s102.8 9.6 114 32c-29.1 29.6-69.8 48-114 48z`; 
            if (color === "#333333") color = "#0D47A1";
            break;
        case 'fire_station': 
            iconPath = `M256 0C150 120 96 200 96 288c0 88.4 71.6 160 160 160s160-71.6 160-160c0-88-54-168-160-288zm0 384c-53 0-96-43-96-96 0-35 22-77 64-128 15 25 32 48 32 72 0 17.7 14.3 32 32 32s32-14.3 32-32c0-18-10-38-20-58 38 42 56 80 56 114 0 53-43 96-96 96z`; 
            if (color === "#333333") color = "#D32F2F";
            break;
        case 'post_office': 
            iconPath = `M464 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 112h416v38.8L256 281.1 48 150.8V112zm0 288V201.2l195.4 128.8c7 4.6 16.2 4.6 23.2 0L464 201.2V400H48z`; 
            if (color === "#333333") color = "#E65100";
            break;
        case 'school': 
            iconPath = `M319.4 178.2L288 163.9v53.2c0 14.8-18 22.4-28.4 11.8L192 160l-67.6 68.9c-10.4 10.6-28.4 3-28.4-11.8v-53.2L64.6 178.2C49.5 185.7 40 201.2 40 218.2V384c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V300l40-40 40 40v84c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V218.2c0-17-9.5-32.5-24.6-40zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z`; break;
        case 'apartment': 
            iconPath = `M0 32V480H448V32H0zm64 64H128V160H64V96zm128 0H256V160H192V96zm128 0H384V160H320V96zM64 224H128V288H64V224zm128 0H256V288H192V224zm128 0H384V288H320V224zM64 352H128V416H64V352zm128 0H256V416H192V352zm128 0H384V416H320V352z`; break;
        case 'office_main': 
        case 'office_sub':
        case 'office_etc': 
            iconPath = `M224 0C100.3 0 0 100.3 0 224s100.3 224 224 224s224-100.3 224-224S347.7 0 224 0zm0 384c-88.4 0-160-71.6-160-160s71.6-160 160-160s160 71.6 160 160s-71.6 160-160 160zm32-240c0 17.7-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32z`; break;
        case 'bank': 
            iconPath = `M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32H32zM96 256H64V448h32V256zm128 0H192V448h32V256zm160 0H352V448h32V256zM0 480H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`; break;
        case 'hospital': 
        case 'pharmacy': 
            iconPath = `M272 96c0-8.8-7.2-16-16-16h-64c-8.8 0-16 7.2-16 16v112H64c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h112v112c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16V304h112c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16H272V96z`; break;
        case 'cafe': 
            iconPath = `M96 64c0-17.7 14.3-32 32-32H384c17.7 0 32 14.3 32 32v64H96V64zM0 192H448V352c0 53-43 96-96 96H96c-53 0-96-43-96-96V192zm448 64v64c35.3 0 64-28.7 64-64s-28.7-64-64-64z`; break;
        case 'park': 
            iconPath = `M256 32C125 32 18 137 18 268c0 54.3 19.3 104.3 51.5 143.6L64 432c-6.6 6.6-6.6 17.4 0 24s17.4 6.6 24 0l42.6-42.6C163.6 427.5 208.3 436 256 436c131 0 238-105 238-236S387 32 256 32z`; break;
        case 'mountain': 
            iconPath = `M256 32L0 448h512L256 32z`; break;
        case 'water': 
            iconPath = `M256 512c141.4 0 256-114.6 256-256S256 0 256 0 0 114.6 0 256s114.6 256 256 256z`; break;
        case 'commercial': 
        case 'market': 
            iconPath = `M160 64c0-35.3 28.7-64 64-64s64 28.7 64 64v32h64c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64V64zm64 0c-17.7 0-32 14.3-32 32v32h64V96c0-17.7-14.3-32-32-32z`; break;
        case 'hotel': 
            iconPath = `M32 384c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 128c0-35.3 28.7-64 64-64h192c35.3 0 64 28.7 64 64V256H64V128zM0 320H480V288H0v32z`; break;
        case 'station': 
            iconPath = `M256 0c-97.2 0-176 78.8-176 176V320c0 97.2 78.8 176 176 176H336c53 0 96-43 96-96V176c0-97.2-78.8-176-176-176H256zM144 144H368V256H144V144zM208 368a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm128-32a32 32 0 1 1 -64 0 32 32 0 1 1 64 0z`; break;
        case 'airport': 
            iconPath = `M382.3 8.3L459.7 75l.1 .1c25 22.1 36.6 55.4 30.5 87.5L445.6 373.1l60.2 46.5c15.6 12 20.3 34.3 10.6 51.5c-7 12.3-20.9 19-35.1 17l-159.2-22.7L203 490c-9.3 12.1-26.3 15-39 6.8s-17.5-23.7-11.4-37l33-72.6-133-19-61.9 47.9c-15.6 12-38 8.6-49.3-7.5c-8.2-11.7-9.5-27-3.4-39.7l35-73.4L6 142.1c-14.2-2-22.9-15.7-19.6-29.6s15.7-22.9 29.6-19.6l239.5 34.2 96-211.2c7-15.3 22.9-24.2 39.8-22.3s30.8 14.4 33.2 31l2.4 29.1-44.5 54.3z`; break;
        case 'restaurant':
        case 'fastfood': 
            iconPath = `M224 48C100.3 48 0 148.3 0 272V304c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V272c0-123.7-100.3-224-224-224zM32 368h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`; break;
        default: 
            iconPath = `M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z`; break;
    }

    var fullSvg = `
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));">
        <circle cx="256" cy="256" r="240" fill="${color}" stroke="#ffffff" stroke-width="20"/>
        <g transform="translate(102, 102) scale(0.6)">
            <path fill="#ffffff" d="${iconPath}"/>
        </g>
    </svg>`;

    return L.divIcon({ 
        className: 'custom-premium-pin-svg', 
        html: fullSvg, 
        iconSize: [actualSize, actualSize], 
        iconAnchor: [actualSize / 2, actualSize / 2], 
        popupAnchor: [0, -actualSize / 2] 
    });
}

// =========================================================
// ★ [카카오맵 완벽 복제] 새 창 상세페이지 (홈 탭 & 실시간 지역 랭킹 탭)
// =========================================================
window.openDetailWindow = function(encodedData) {
    try {
        var data = JSON.parse(decodeURIComponent(encodedData));
        
        // ▼ 바로 이 변수 선언 코드를 추가해 줍니다!
        var now = new Date();
        var curMin = now.getHours() * 60 + now.getMinutes();
        var openMin = 9 * 60, closeMin = 18 * 60;
        var dynamicHours = "09:00 ~ 18:00";

        if (data.name.match(/(병원|의료원|대학병원|응급|보건소)/)) { dynamicHours = "09:00 ~ 18:00"; }
        else if (data.name.match(/(약국)/)) { dynamicHours = "09:00 ~ 20:00"; openMin = 9*60; closeMin = 20*60; }
        else if (data.name.match(/(은행|농협|우체국|국민은행|신한은행|우리은행|하나은행)/)) { dynamicHours = "평일 09:00 ~ 16:00"; openMin = 9*60; closeMin = 16*60; }
        else if (data.name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|코스트코|마트)/)) { dynamicHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
        else if (data.name.match(/(카페|스타벅스|투썸|이디야|메가커피)/)) { dynamicHours = "08:00 ~ 22:00"; openMin = 8*60; closeMin = 22*60; }
        else if (data.name.match(/(식당|음식점|고깃집|국밥|맥도날드|버거킹|KFC)/)) { dynamicHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
        else if (data.name.match(/(구청|시청|주민센터|행정복지센터|관공서|경찰서|소방서)/)) { dynamicHours = "평일 09:00 ~ 18:00"; }
        else if (data.name.match(/(학교|초|중|고|대학교|대학원)/)) { dynamicHours = "08:30 ~ 16:30"; openMin = 8*30; closeMin = 16*30; }

        var isDetailOpen = (curMin >= openMin && curMin <= closeMin);
        var statusBadge = isDetailOpen 
            ? '<span class="open" style="color: #009000; font-weight: 500;">운영 중</span>' 
            : '<span style="color: #ff5252; font-weight: 500;">영업 종료</span>';
        // ▲ 여기까지 추가!

        var newWin = window.open('', '_blank');
        if (!newWin) { alert("팝업 차단이 설정되어 있습니다. 브라우저에서 팝업을 허용해주세요!"); return; }

        // 현재 지역의 맛집 & 가볼만한 곳 실시간 랭킹 추출
        var allList = window.allLandmarks || [];
        var currentLat = data.lat;
        var currentLng = data.lng;
        var gugunName = data.gugun ? data.gugun.split('(')[0] : "효빈광역시";
        var todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

        // 거리순 주변 장소 정렬
        var nearbyPlaces = allList.filter(function(m) {
            return m.name && m.type !== 'subway' && m.type !== 'busStop' && m.name !== data.name;
        }).map(function(m) {
            var dist = Math.sqrt(Math.pow(m.lat - currentLat, 2) + Math.pow(m.lng - currentLng, 2));
            var rScore = (3.5 + ((m.name.length * 3) % 15) * 0.1).toFixed(1);
            var rCount = (m.name.length * 43) + 12;
            return {
                name: m.name,
                type: m.type || 'normal',
                dist: dist,
                rating: rScore,
                reviews: rCount,
                image: m.image || `이미지/${m.name}.webp`
            };
        }).sort(function(a, b) { return a.dist - b.dist; });

        var foodTypes = ['restaurant', 'fastfood', 'cafe', 'bakery', 'pub'];
        var foodRankList = nearbyPlaces.filter(m => foodTypes.includes(m.type) || m.name.match(/(맥도날드|버거킹|KFC|스타벅스|베이커리|식당|호텔|한정식|소바|버거|쿠우쿠우|아웃백|피자)/)).slice(0, 6);
        var placeRankList = nearbyPlaces.filter(m => !foodTypes.includes(m.type)).slice(0, 6);

        function buildRankHtml(list, defaultCat) {
            if (list.length === 0) return `<div style="padding:30px; text-align:center; color:#888;">주변에 등록된 장소가 없습니다.</div>`;
            return list.map(function(item, idx) {
                var stars = "★".repeat(Math.round(parseFloat(item.rating))) + "☆".repeat(5 - Math.round(parseFloat(item.rating)));
                var catLabel = item.type === 'fastfood' ? '패스트푸드' : item.type === 'cafe' ? '카페' : item.type === 'bakery' ? '제과,베이커리' : item.type === 'park' ? '공원' : item.type === 'commercial' ? '쇼핑,마트' : defaultCat;
                return `
                <div class="rank-item">
                    <div class="rank-num">${idx + 1}</div>
                    <div class="rank-thumb">
                        <img src="${item.image}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2270%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23eee%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2212%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22>사진</text></svg>'">
                    </div>
                    <div class="rank-info">
                        <div class="rank-name">${item.name}</div>
                        <div class="rank-rating">
                            <span class="score">${item.rating}</span>
                            <span class="stars">${stars}</span>
                            <span class="reviews">후기 ${item.reviews}</span>
                        </div>
                        <div class="rank-meta">${catLabel}<br>${data.province} ${gugunName} ${data.admin || ''}</div>
                    </div>
                </div>`;
            }).join('');
        }

        var foodRankHtml = buildRankHtml(foodRankList, '한식');
        var placeRankHtml = buildRankHtml(placeRankList, '명소/시설');
        var cleanEngName = data.name.replace(/\s+/g, '').toLowerCase();

        var html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${data.name} | 카카오맵 스타일 상세</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', sans-serif; margin: 0; background: #f4f5f7; color: #222; }
        
        /* 상단 고정 네비게이션 바 */
        .top-nav { background: #fff; border-bottom: 1px solid #e2e2e2; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 100; }
        .top-nav .logo { font-size: 18px; font-weight: 700; color: #222; letter-spacing: -0.5px; cursor: pointer; }
        .top-nav .logo span { font-weight: 300; }
        .top-nav .center-title { font-size: 15px; font-weight: 500; color: #222; }
        .top-nav .right-box { display: flex; align-items: center; gap: 10px; }
        .search-bar { border: 1px solid #ddd; border-radius: 18px; padding: 5px 14px; font-size: 13px; width: 200px; color: #888; background: #fafafa; }
        .login-btn { border: 1px solid #ddd; background: #fff; padding: 5px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }

        /* 메인 카드 컨테이너 */
        .main-wrap { max-width: 640px; margin: 20px auto 60px auto; position: relative; }
        .card-box { background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 14px; }
        
        /* 우측 상단 인쇄/신고 플로팅 버튼 */
        .floating-tools { position: absolute; right: -48px; top: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .floating-tools button { width: 38px; height: 38px; border: none; background: #fff; cursor: pointer; font-size: 15px; color: #555; border-bottom: 1px solid #eee; }
        .floating-tools button:last-child { border-bottom: none; }
        .floating-tools button:hover { background: #f8f9fa; }

        /* 헤더 섹션 */
        .place-header { padding: 28px 28px 20px 28px; }
        .place-title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: baseline; gap: 8px; letter-spacing: -0.5px; }
        .place-cat { font-size: 13px; color: #888; font-weight: 400; }
        .place-status { font-size: 13px; color: #222; margin-bottom: 16px; }
        .place-status .open { color: #009000; font-weight: 500; }
        
        /* 알약형 액션 버튼 바 */
        .pill-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
        .pill-btn { padding: 7px 14px; border-radius: 20px; border: 1px solid #e0e0e0; background: #fff; font-size: 13px; color: #333; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 500; }
        .pill-btn:hover { background: #f5f5f5; }
        .pill-btn.blue { background: #258fff; color: #fff; border-color: #258fff; }
        .pill-btn.blue:hover { background: #197ce6; }

        /* 대표 사진 영역 */
        .photo-wrap { position: relative; margin: 0 28px 20px 28px; border-radius: 8px; overflow: hidden; height: 220px; background: #e9ecef; border: 1px solid #eee; }
        .photo-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .roadview-badge { position: absolute; right: 12px; bottom: 12px; background: rgba(0,0,0,0.65); color: #fff; font-size: 12px; padding: 5px 10px; border-radius: 14px; cursor: pointer; }

        /* 홈 / 랭킹 탭 메뉴 */
        .tab-menu { display: flex; border-bottom: 1px solid #e5e5e5; padding: 0 28px; }
        .tab-item { flex: 1; text-align: center; padding: 14px 0; font-size: 15px; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-item.active { color: #222; font-weight: 700; border-bottom: 2px solid #222; }

        /* 탭 컨텐츠 영역 */
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* [홈 탭] 상세 정보 리스트 */
        .info-list { padding: 20px 28px; }
        .info-row { display: flex; align-items: flex-start; padding: 11px 0; border-bottom: 1px solid #f4f4f4; font-size: 14px; line-height: 1.5; }
        .info-row:last-child { border-bottom: none; }
        .info-icon { width: 28px; color: #888; font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .info-text { flex: 1; color: #333; }
        .info-text a { color: #258fff; text-decoration: none; }
        .copy-link { color: #888; font-size: 12px; text-decoration: underline; margin-left: 6px; cursor: pointer; }

        /* 매장 정보 & 배너 */
        .store-section { padding: 24px 28px; }
        .store-title { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; display: flex; justify-content: space-between; }
        .facility-icons { display: flex; gap: 20px; margin-bottom: 18px; }
        .fac-item { display: flex; flex-direction: column; align-items: center; font-size: 12px; color: #555; gap: 6px; }
        .fac-circle { width: 44px; height: 44px; border-radius: 50%; background: #f8f9fa; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .tag-row { font-size: 13px; color: #666; padding-top: 14px; border-top: 1px solid #f4f4f4; }
        .tag-row span { color: #258fff; margin-left: 6px; cursor: pointer; }

        .kakao-banner { background: #edf4ff; padding: 22px; text-align: center; border-top: 1px solid #e2ecff; }
        .kakao-banner p { margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #222; }
        .kakao-btn { background: #fee500; color: #191919; border: none; padding: 9px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; }

        /* [랭킹 탭] 스타일 */
        .rank-section { padding: 24px 28px; }
        .rank-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .rank-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
        .rank-header span { font-size: 12px; color: #999; }
        
        .sub-toggle { display: flex; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
        .sub-btn { flex: 1; padding: 10px 0; text-align: center; font-size: 13px; font-weight: 500; background: #f9f9f9; color: #777; cursor: pointer; border: none; }
        .sub-btn.active { background: #fff; color: #222; font-weight: 700; border: 1px solid #222; border-radius: 5px; }

        .cat-chips { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
        .chip { padding: 5px 12px; border-radius: 16px; border: 1px solid #ddd; font-size: 12px; color: #555; background: #fff; cursor: pointer; white-space: nowrap; }
        .chip.active { border-color: #222; color: #222; font-weight: 700; }

        .rank-item { display: flex; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #f2f2f2; gap: 14px; }
        .rank-num { font-size: 15px; font-weight: 700; width: 18px; color: #222; padding-top: 2px; }
        .rank-thumb { width: 68px; height: 68px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #eee; }
        .rank-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .rank-info { flex: 1; }
        .rank-name { font-size: 15px; font-weight: 500; color: #222; margin-bottom: 3px; }
        .rank-rating { font-size: 12px; margin-bottom: 4px; }
        .rank-rating .score { color: #ff5e00; font-weight: 700; margin-right: 3px; }
        .rank-rating .stars { color: #ff5e00; letter-spacing: -1px; margin-right: 4px; }
        .rank-rating .reviews { color: #888; }
        .rank-meta { font-size: 12px; color: #888; line-height: 1.4; }

        .more-btn-wrap { text-align: center; margin-top: 20px; }
        .more-btn { padding: 9px 24px; border-radius: 20px; border: 1px solid #ddd; background: #fff; font-size: 13px; color: #444; cursor: pointer; }

        .footer { text-align: center; padding: 30px; font-size: 12px; color: #999; border-top: 1px solid #e5e5e5; background: #fff; }
    </style>
</head>
<body>
    <div class="top-nav">
        <div class="logo" onclick="window.close()">kakao<span>map</span></div>
        <div class="center-title">${data.name}</div>
        <div class="right-box">
            <input type="text" class="search-bar" placeholder="지도 검색" readonly onclick="window.close()">
            <button class="login-btn">로그인</button>
        </div>
    </div>

    <div class="main-wrap">
        <div class="floating-tools">
            <button title="인쇄" onclick="window.print()">🖨️</button>
            <button title="오류 신고" onclick="alert('정보 수정 제안은 지도 화면에서 가능합니다.')">🚩</button>
        </div>

<div class="card-box">
            <div class="place-header">
                <h1 class="place-title">${data.name} <span class="place-cat">${data.typeName}</span></h1>
                
                ${
                    (function() {
                        var now = new Date();
                        var curMin = now.getHours() * 60 + now.getMinutes();
                        var openMin = 9 * 60, closeMin = 18 * 60;
                        window.dynamicHours = "09:00 ~ 18:00";

                        if (data.name.match(/(병원|의료원|대학병원|응급|보건소)/)) { window.dynamicHours = "09:00 ~ 18:00"; }
                        else if (data.name.match(/(약국)/)) { window.dynamicHours = "09:00 ~ 20:00"; openMin = 9*60; closeMin = 20*60; }
                        else if (data.name.match(/(은행|농협|우체국|국민은행|신한은행|우리은행|하나은행)/)) { window.dynamicHours = "평일 09:00 ~ 16:00"; openMin = 9*60; closeMin = 16*60; }
                        else if (data.name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|코스트코|마트)/)) { window.dynamicHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
                        else if (data.name.match(/(카페|스타벅스|투썸|이디야|메가커피)/)) { window.dynamicHours = "08:00 ~ 22:00"; openMin = 8*60; closeMin = 22*60; }
                        else if (data.name.match(/(식당|음식점|고깃집|국밥|맥도날드|버거킹|KFC)/)) { window.dynamicHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
                        else if (data.name.match(/(구청|시청|주민센터|행정복지센터|관공서|경찰서|소방서)/)) { window.dynamicHours = "평일 09:00 ~ 18:00"; }
                        else if (data.name.match(/(학교|초|중|고|대학교|대학원)/)) { window.dynamicHours = "08:30 ~ 16:30"; openMin = 8*30; closeMin = 16*30; }

                        var isOpen = (curMin >= openMin && curMin <= closeMin);
                        window.statusBadge = isOpen ? '<span class="open" style="color: #009000; font-weight: 500;">운영 중</span>' : '<span style="color: #ff5252; font-weight: 500;">영업 종료</span>';
                        
                        return '<div class="place-status">' + window.statusBadge + ' · ' + window.dynamicHours + '</div>';
                    })()
                }
    </div>            
                <div class="pill-actions">
                    <button class="pill-btn" onclick="alert('로드뷰 화면으로 전환합니다.')">💧 로드뷰</button>
                    <button class="pill-btn" onclick="alert('주소가 클립보드에 복사되었습니다.')">📤 공유</button>
                    <button class="pill-btn" onclick="window.close()">📍 지도</button>
                    <button class="pill-btn" onclick="alert('즐겨찾기에 추가되었습니다.')">🔖 즐겨찾기</button>
                    <button class="pill-btn blue" onclick="alert('${data.name}을(를) 출발지로 설정했습니다.')">출발</button>
                    <button class="pill-btn blue" onclick="alert('${data.name}을(를) 도착지로 설정했습니다.')">도착</button>
                </div>
            </div>

            <div class="photo-wrap">
                <img src="${data.image}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22220%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23dfe4ea%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 fill=%22%23747d8c%22 font-weight=%22bold%22 text-anchor=%22middle%22 dy=%22.3em%22>🏢 ${data.name} 전경 이미지 (${data.image})</text></svg>'">
                <div class="roadview-badge" onclick="alert('로드뷰를 실행합니다.')">💧 로드뷰</div>
            </div>

            <div class="tab-menu">
                <div id="tab-btn-home" class="tab-item active" onclick="switchDetailTab('home')">홈</div>
                <div id="tab-btn-rank" class="tab-item" onclick="switchDetailTab('rank')">랭킹</div>
            </div>

<!-- [1] 홈 탭 내용 -->
            <div id="tab-pane-home" class="tab-content active">
                <div class="info-list">
                    <div class="info-row">
                        <div class="info-icon">🕒</div>
                        <div class="info-text">${statusBadge} · ${dynamicHours}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-icon">🌐</div>
                        <div class="info-text"><a href="javascript:void(0);">http://www.hyobin.go.kr/${cleanEngName}</a></div>
                    </div>
                    <div class="info-row">
                        <div class="info-icon">📍</div>
                        <div class="info-text">
                            ${data.address} ${data.zip ? `(우)${data.zip}` : ''}
                            <span class="copy-link" onclick="navigator.clipboard.writeText('${data.address}'); alert('주소가 복사되었습니다.');">복사</span>
                            ${data.legal ? `<br><span style="color:#888; font-size:13px;">(지번) ${data.legal}${data.bunji || ''}</span>` : ''}
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-icon">📞</div>
                        <div class="info-text">
                            ${data.phone}
                            <span class="copy-link" onclick="navigator.clipboard.writeText('${data.phone}'); alert('전화번호가 복사되었습니다.');">복사</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-icon">✏️</div>
                        <div class="info-text"><a href="javascript:void(0);" onclick="alert('지도 화면의 팝업에서 수정할 수 있습니다.')">정보 수정 제안하기 <b>최대 5점</b> &gt;</a></div>
                    </div>
                    ${data.desc ? `
                    <div class="info-row">
                        <div class="info-icon">💬</div>
                        <div class="info-text" style="background:#f8f9fa; padding:10px; border-radius:6px;">${data.desc}</div>
                    </div>` : ''}
                </div>

                <div style="border-top: 8px solid #f4f5f7;"></div>

                <div class="store-section">
                    <h3 class="store-title">매장 정보 <span>^</span></h3>
                    <div class="facility-icons">
                        <div class="fac-item"><div class="fac-circle">♿</div><span>장애인시설</span></div>
                        <div class="fac-item"><div class="fac-circle">🅿️</div><span>주차가능</span></div>
                        <div class="fac-item"><div class="fac-circle">🛜</div><span>와이파이</span></div>
                    </div>
                    <div class="tag-row">태그 <span>#효빈광역시</span> <span>#${gugunName}</span> <span>#${data.typeName.split(',')[0]}</span> <span>#수유실</span></div>
                </div>

                <div class="kakao-banner">
                    <p>주민등록등본 발급, 주민센터 갈 필요 없어요!</p>
                    <button class="kakao-btn" onclick="alert('효빈광역시 전자민원 창구로 연결됩니다.')">💬 지금 카톡으로 발급하기</button>
                </div>
            </div>

            <!-- [2] 랭킹 탭 내용 -->
            <div id="tab-pane-rank" class="tab-content">
                <div class="rank-section">
                    <div class="rank-header">
                        <h3>${data.province} ${gugunName} 즐겨찾기 랭킹</h3>
                        <span>업데이트 ${todayStr}</span>
                    </div>

                    <div class="sub-toggle">
                        <button id="sub-btn-food" class="sub-btn active" onclick="switchRankSub('food')">맛집</button>
                        <button id="sub-btn-place" class="sub-btn" onclick="switchRankSub('place')">가볼만한 곳</button>
                    </div>

                    <div class="cat-chips">
                        <div class="chip active">전체</div>
                        <div class="chip">한식</div>
                        <div class="chip">양식</div>
                        <div class="chip">일식</div>
                        <div class="chip">중식</div>
                        <div class="chip">카페</div>
                        <div class="chip">패스트푸드</div>
                    </div>

                    <div id="rank-list-food">${foodRankHtml}</div>
                    <div id="rank-list-place" style="display:none;">${placeRankHtml}</div>

                    <div class="more-btn-wrap">
                        <button class="more-btn" onclick="window.close()">장소 더보기 &gt;</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        약관 및 정책 · 공지사항 · <b>개인정보처리방침</b> · 고객센터 · 권리침해신고<br><br>
        © Hyobin Metropolitan City & Kakao Corp.
    </div>

    <script>
        function switchDetailTab(tab) {
            document.getElementById('tab-btn-home').classList.toggle('active', tab === 'home');
            document.getElementById('tab-btn-rank').classList.toggle('active', tab === 'rank');
            document.getElementById('tab-pane-home').classList.toggle('active', tab === 'home');
            document.getElementById('tab-pane-rank').classList.toggle('active', tab === 'rank');
        }
        function switchRankSub(sub) {
            document.getElementById('sub-btn-food').classList.toggle('active', sub === 'food');
            document.getElementById('sub-btn-place').classList.toggle('active', sub === 'place');
            document.getElementById('rank-list-food').style.display = (sub === 'food') ? 'block' : 'none';
            document.getElementById('rank-list-place').style.display = (sub === 'place') ? 'block' : 'none';
        }
    <\/script>
</body>
</html>`;
        newWin.document.write(html);
        newWin.document.close();
    } catch (e) {
        console.error("상세페이지 생성 오류:", e);
        alert("상세페이지를 여는 중 오류가 발생했습니다: " + e.message);
    }
};

// =========================================================
// 마커 추가 함수 (단일 통합 & 카카오맵 팝업 100% 구현 & 렉/오류 완벽 제거)
// =========================================================
function addMarkerToMap(item) {
    if (!item) return;

    if (item.name && item.type !== 'subway' && item.type !== 'busStop') {
        var name = item.name;
        if (name.includes("아파트") || name.match(/(주공|자이|푸르지오|더샵|래미안|아이파크|휴먼시아|센트럴|스타힐스|대라수|리버시티|에일린의뜰|빌라|오피스텔|주상복합|단지)$/)) item.type = "apartment";
        else if (name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|아울렛|상가|다이소|코스트코|빈스마트|마루마트|하나로마트|천조마트|CY마트|롯데몰|스타필드|이케아)/)) item.type = "commercial";
        else if (name.match(/(초|중|고|초등학교|중학교|고등학교|대학교|대학원|과기원|유치원|어린이집|학원)$/) || name.includes("학교") || name.includes("사대부") || name.includes("캠퍼스")) item.type = "school";
        else if (name.match(/(은행|국민은행|신한은행|우리은행|하나은행|농협|기업은행|새마을금고|신협|수협|카카오뱅크|우체국금융)/)) item.type = "bank";
        else if (name.match(/(산|봉|고개|령|오름)$/)) item.type = "mountain";
        else if (name.match(/(호|호수|저수지|못|강|천|계곡|폭포|해수욕장)$/)) item.type = "water";
        else if (name.match(/(공원|수목원|휴양림|생태공원|캠핑장|유원지|광장)/)) item.type = "park";
        else if (name.match(/(시청|도청|구청|군청)/)) item.type = "office_main";
        else if (name.match(/(주민센터|행정복지센터|동사무소|읍사무소|면사무소|출장소)/)) item.type = "office_sub";
        else if (name.match(/(경찰서|지방경찰청|파출소|지구대|치안센터)/)) item.type = "police";
        else if (name.match(/(소방서|119안전센터|구조대|소방본부)/)) item.type = "fire_station";
        else if (name.match(/(우체국|우편집중국|우편취급국|우정청)/)) item.type = "post_office";
        else if (name.match(/(법원|검찰청|교육청|세무서|건강보험|국민연금|공단|공사|본부|지사|보훈지청|청사)/)) item.type = "office_etc";
        else if (name.match(/(복지관|노인복지관|장애인복지관|경로당|요양원|아동센터|보육원|실버타운)/)) item.type = "welfare";
        else if (name.match(/(공항|국제공항)/)) item.type = "airport";
        else if (name.match(/(항|항구|여객터미널|선착장|부두|마리나)/) && !name.match(/(은행|마트)/)) item.type = "port";
        else if (name.match(/(기차역|KTX|SRT|버스터미널|종합터미널|환승센터|차량사업소|IC|JC|톨게이트)/)) item.type = "station";
        else if (name.match(/(주차장|공영주차장|환승주차장)/)) item.type = "parking";
        else if (name.match(/(편의점|CU|GS25|세븐일레븐|이마트24|미니스톱)/)) item.type = "cvs";
        else if (name.match(/(전통시장|수산시장|청과시장|도매시장|오일장|시장)/)) item.type = "market";
        else if (name.match(/(약국|약|온누리약국|종로약국)$/)) item.type = "pharmacy";
        else if (name.match(/(화장실|공중화장실)/)) item.type = "toilet";
        else if (name.match(/(커피|카페|스타벅스|투썸플레이스|이디야|메가커피|컴포즈|빽다방|파스쿠찌|엔제리너스|폴바셋)/)) item.type = "cafe";
        else if (name.match(/(빵집|베이커리|파리바게뜨|뚜레쥬르|성심당|이성당)/)) item.type = "bakery";
        else if (name.match(/(맥도날드|버거킹|KFC|롯데리아|맘스터치|써브웨이|노브랜드버거|햄버거|도미노피자)/)) item.type = "fastfood";
        else if (name.match(/(술집|호프|포차|이자카야|투다리|역전할머니맥주|펍)/)) item.type = "pub";
        else if (name.match(/(식당|음식점|고깃집|국밥|쿠우쿠우|아웃백|가든|회관|반점|식육식당|한정식|소바|DT)/)) item.type = "restaurant";
        else if (name.match(/(호텔|모텔|여관|펜션|리조트|스테이|토요코인|라마다|신신호텔|하얏트|신라호텔)/)) item.type = "hotel";
        else if (name.match(/(애니메이트|애니플러스|코믹프라자|굿즈샵|메이드카페|콜라보카페|서브컬처)/)) item.type = "anime"; 
        else if (name.match(/(영화관|극장|메가박스|CGV|롯데시네마|시네마)/)) item.type = "cinema";
        else if (name.match(/(박물관|미술관|도서관|과학관|전시관|기념관|예술의전당|문예회관|아카이브|뮤지엄)/)) item.type = "culture";
        else if (name.match(/(체육관|경기장|스타디움|야구장|축구장|수영장|헬스장|피트니스|골프장|빙상장|아레나|양궁장|사격장)/)) item.type = "sports";
        else if (name.match(/(교회|성당|절|사찰|사원|기도원|성지)/)) item.type = "religion";
        else if (name.match(/(병원|의료원|치과|보건소|보건진료소|한의원|요양병원|대학병원)/)) item.type = "hospital";
        else if (name.match(/(공장|산단|공단|조선소|발전소|공업사|물류센터|제철소)/)) item.type = "factory";
        else item.type = "normal";

        if (typeof markerColors !== 'undefined') { item.color = markerColors[item.type] || markerColors["normal"]; }
    }

// =========================================================
// 마커 추가 함수 (진짜 도로명 주소 연동 완벽 수정 버전)
// =========================================================
var size = typeof calculateSize === 'function' ? calculateSize(map.getZoom()) : 36;
var marker;

if (item.type === 'subway') {
    var lines = item.lines || []; 
    var isTransfer = lines.length >= 2; 
    var isManualMajor = typeof myMajorStations !== 'undefined' && myMajorStations.includes(item.name);
    var isMajor = (isTransfer || isManualMajor) ? "major-station" : "normal-station";
    var markerClass = (isTransfer || isManualMajor) ? "major-marker" : "normal-marker";
    var lineClasses = lines.map(l => "line-" + l).join(" ");
    var width = (lines.length === 1) ? 14 : (lines.length * 10) + 6;
    var dotsHtml = lines.map(lid => `<div class="transfer-dot" style="background-color:${typeof subwayLines!=='undefined'&&subwayLines[lid]?subwayLines[lid].color:'#333'};"></div>`).join('');
    var iconHtml = lines.length === 1 ? `<div class="station-circle" style="width:14px; height:14px; border: 3px solid ${typeof subwayLines!=='undefined'&&subwayLines[lines[0]]?subwayLines[lines[0]].color:'#333'};"></div>` : `<div class="station-transfer" style="width:${width}px; height:14px;">${dotsHtml}</div>`;
    iconHtml += `<div class="station-name-label ${isMajor}">${item.name}</div>`;
    marker = L.marker([item.lat, item.lng], { icon: L.divIcon({ className: `custom-station ${lineClasses} ${markerClass}`, html: iconHtml, iconSize: [width, 14], iconAnchor: [width/2, 7] }) });
    marker.lineCodes = lines;
    marker.stationName = item.name;
    
    if (typeof subwayStationLayer !== 'undefined') marker.addTo(subwayStationLayer); 
    var lineNames = (item.lines || []).map(lid => subwayLines[lid] ? subwayLines[lid].name : "").filter(Boolean).join(", ");
    marker.bindTooltip(`<b>${item.name}</b><br><span style="font-size:11px; color:#555;">경유: ${lineNames}</span>`, { offset: [0, -10], direction: 'top' });

} else if (item.type === 'busStop') {
    var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${item.name ? item.name.replace(' 정류장','') : ''}</div>`;
    marker = L.marker([item.lat, item.lng], { icon: L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] }) });
    marker.passingBuses = item.passingBuses;

    if (typeof busStopLayer !== 'undefined') marker.addTo(busStopLayer);
    var busList = item.passingBuses && item.passingBuses.length > 0 ? item.passingBuses.join("<br>") : "<span style='color:#999;'>경유 노선 없음</span>";
    marker.bindTooltip(`<b>🚏 ${item.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busList}</div>`, { offset: [0, -10], direction: 'top' });
    
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        if (typeof openBusStopEditModal === 'function') openBusStopEditModal(item, marker);
    });

} else {
    marker = L.marker([item.lat, item.lng], { icon: typeof createFacilityCustomIcon === 'function' ? createFacilityCustomIcon(item.type, item.color, size) : new L.Icon.Default() });
    var targetGroupName = typeof groupMap !== 'undefined' ? groupMap[item.type] || "normal" : "normal";
    
    if (typeof catLayers !== 'undefined' && catLayers[targetGroupName]) marker.addTo(catLayers[targetGroupName]);
    
    marker.bindTooltip(item.name || "", { offset: [0, -20], direction: 'top' });

    // ★ 마커 클릭 시 실제 roadData 도로명을 찾아 카카오맵 팝업 출력
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        
        var categoryNames = { "mountain": "산,고개", "water": "호수,강", "park": "공원,유원지", "office_main": "관공서", "office_sub": "행정복지센터", "office_etc": "공공기관", "police": "경찰서", "fire_station": "소방서", "post_office": "우체국", "welfare": "복지시설", "school": "학교,교육", "apartment": "아파트,주거", "bank": "은행", "commercial": "쇼핑,마트", "market": "전통시장", "cvs": "편의점", "cafe": "카페", "bakery": "제과,베이커리", "fastfood": "패스트푸드", "restaurant": "음식점", "pub": "주점", "hotel": "숙박", "culture": "문화,전시", "cinema": "영화관", "anime": "서브컬처", "religion": "종교시설", "sports": "스포츠시설", "station": "교통시설", "port": "항구,선착장", "airport": "공항", "hospital": "병원,의료", "pharmacy": "약국", "factory": "산업,공장", "parking": "주차장", "toilet": "화장실", "normal": "일반시설" };
        var typeName = categoryNames[item.type] || "시설";
        
        var foundGugun = "", foundAdmin = "", foundLegal = "";
        if (typeof searchablePolygons !== 'undefined') {
            searchablePolygons.forEach(function(poly) {
                if (typeof isPointInPolygon === 'function' && isPointInPolygon(item.lat, item.lng, poly.points)) {
                    if (poly.type === 'gugun') foundGugun = poly.name;
                    else if (poly.type === 'admin') foundAdmin = poly.name;
                    else if (poly.type === 'legal') foundLegal = poly.name;
                }
            });
        }
        
        var province = (foundGugun && foundGugun.match(/(선곡군|기도군|덕현군|약산시|낭원군|치원군|천주시)/)) ? "덕빈북도" : "효빈광역시";
        var cleanGugun = foundGugun ? foundGugun.replace(/\(.*\)/, '') : "";
        var cleanAdmin = foundAdmin ? foundAdmin.replace(/\(.*\)/, '') : "";
        var cleanLegal = foundLegal ? foundLegal.replace(/\(.*\)/, '') : (cleanAdmin || "중앙동");

        // ★ [진짜 도로명 데이터 연동 알고리즘 추가 완료]
        var nearestRoadName = cleanAdmin ? cleanAdmin + "로" : "중앙대로";
        var minRoadDist = Infinity;
        
        if (typeof roadData !== 'undefined' && Array.isArray(roadData)) {
            roadData.forEach(function(road) {
                if (!road.points) return;
                road.points.forEach(function(pt) {
                    var ptLat = Array.isArray(pt[0]) ? pt[0][0] : pt[0];
                    var ptLng = Array.isArray(pt[0]) ? pt[0][1] : pt[1];
                    var dist = Math.sqrt(Math.pow(item.lat - (ptLat + (typeof adjustY !== 'undefined' ? adjustY : 0)), 2) + Math.pow(item.lng - ptLng, 2));
                    if (dist < minRoadDist) {
                        minRoadDist = dist;
                        nearestRoadName = road.name; // 실제 도로망 데이터 이름 획득!
                    }
                });
            });
        }

        var roadNum = (Math.abs(Math.round(item.lat)) % 90) + 1;
        var bunjiMain = (Math.abs(Math.round(item.lng)) % 800) + 100;
        var bunjiSub = (Math.abs(Math.round(item.lat)) % 20) + 1;
        var zipCode = "54" + String((Math.abs(Math.round(item.lat + item.lng)) % 899) + 100);

        var fullAddress = `${province} ${cleanGugun} ${nearestRoadName} ${roadNum}`.trim();

        var midTel = 200 + (Math.abs(Math.round(item.lat)) % 700);
        var endTel = 1000 + (Math.abs(Math.round(item.lng)) % 8999);
// ★ [덕빈권 구역별 맞춤 국번 자동 적용 알고리즘]
        var prefix = "079"; // 기본 효빈광역시
        var areaCodeNum = "000";
        var tailNum = String(1000 + (Math.abs(Math.round(item.lng)) % 8999));

        if (province === "덕빈북도") {
            prefix = "078";
            // 덕빈북도 세부 지역 국번 판별
            if (foundGugun.includes("빈주")) areaCodeNum = "1" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.match(/(천주시|낭원군)/)) areaCodeNum = "2" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.match(/(약산시|선곡군|치원군)/)) areaCodeNum = "3" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.match(/(반양|계성|덕현)/)) areaCodeNum = "4" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.match(/(저천|기도|강주)/)) areaCodeNum = "5" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else areaCodeNum = "9" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
        } else {
            // 효빈광역시 세부 구별 국번 판별
            if (foundGugun.includes("탄성군")) areaCodeNum = "1" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundAdmin.match(/(중구|동구)/) || foundGugun.match(/(중구|동구)/)) areaCodeNum = "2" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundAdmin.includes("중수") || foundLegal.includes("중수")) areaCodeNum = "3" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.includes("남구")) areaCodeNum = "4" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundAdmin.includes("고송") || foundLegal.includes("고송")) areaCodeNum = "5" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.includes("서구")) areaCodeNum = "6" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.includes("청엽구")) areaCodeNum = "7" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.includes("창전구")) areaCodeNum = "8" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (foundGugun.includes("안천구")) areaCodeNum = "9" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else areaCodeNum = "2" + String(10 + (Math.abs(Math.round(item.lat)) % 88)); // 기본 중/동구 라인
        }

        var generatedPhone = `${prefix}-${areaCodeNum}-${tailNum}`;

        // ★ [핵심] 사용자가 데이터 파일이나 수동으로 이미 번호를 지정해 둔 경우(item.phone)가 있으면 그 번호 우선 사용!
        var placePhone = item.phone ? item.phone : generatedPhone;
        var rating = item.rating || (4.1 + (item.name.length % 9) * 0.1).toFixed(1); 
        var ratingCount = (item.name.length * 3) + 2;
        var reviews = item.reviews || (item.name.length * 9 + 5);
// ★ [시설 맞춤형 진짜 운영시간 자동 부여 알고리즘]
// [시설별 맞춤 영업시간 및 실시간 판별 코드]
// ★ [편의점 및 24시간 시설 예외 처리 추가]
var defaultHours = "09:00 ~ 18:00";
var openMin = 9 * 60, closeMin = 18 * 60;
var isAlwaysOpen = false; // 24시간 여부 플래그

if (item.name.match(/(편의점|CU|GS25|세븐일레븐|이마트24|미니스톱)/)) {
    defaultHours = "24시간 영업";
    isAlwaysOpen = true;
}
else if (item.name.match(/(병원|의료원|대학병원|응급|보건소)/)) { defaultHours = "09:00 ~ 18:00"; }
else if (item.name.match(/(약국)/)) { defaultHours = "09:00 ~ 20:00"; openMin = 9*60; closeMin = 20*60; }
else if (item.name.match(/(은행|농협|우체국|국민은행|신한은행|우리은행|하나은행)/)) { defaultHours = "평일 09:00 ~ 16:00"; openMin = 9*60; closeMin = 16*60; }
else if (item.name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|코스트코|마트)/)) { defaultHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
else if (item.name.match(/(카페|스타벅스|투썸|이디야|메가커피)/)) { defaultHours = "08:00 ~ 22:00"; openMin = 8*60; closeMin = 22*60; }
else if (item.name.match(/(식당|음식점|고깃집|국밥|맥도날드|버거킹|KFC)/)) { defaultHours = "10:00 ~ 22:00"; openMin = 10*60; closeMin = 22*60; }
else if (item.name.match(/(구청|시청|주민센터|행정복지센터|관공서|경찰서|소방서)/)) { defaultHours = "평일 09:00 ~ 18:00"; }
else if (item.name.match(/(학교|초|중|고|대학교|대학원)/)) { defaultHours = "08:30 ~ 16:30"; openMin = 8*30; closeMin = 16*30; }

var placeHours = item.hours || defaultHours;

// 실시간 시각 비교 (편의점은 isAlwaysOpen이 true이므로 무조건 '운영 중' 처리)
var now = new Date();
var curMin = now.getHours() * 60 + now.getMinutes();
var isOpen = isAlwaysOpen ? true : (curMin >= openMin && curMin <= closeMin);
var statusText = isOpen ? '<span style="color: #009000; font-weight: bold;">운영 중</span>' : '<span style="color: #ff5252; font-weight: bold;">영업 종료</span>';            var placeHours = item.hours || defaultHours;
            var placeImg = item.image || `이미지/${item.name}.webp`; 
        var placeDesc = item.desc || "";

        var exportData = encodeURIComponent(JSON.stringify({
            name: item.name, typeName: typeName, province: province, gugun: cleanGugun, admin: cleanAdmin, legal: cleanLegal, bunji: `${bunjiMain}-${bunjiSub}`, zip: zipCode, address: fullAddress, phone: placePhone, hours: placeHours, rating: rating, reviews: reviews, image: placeImg, desc: placeDesc, lat: item.lat, lng: item.lng
        }));

        var cardId = "place-card-" + Math.random().toString(36).substring(2, 9);
        var safeName = item.name.replace(/'/g, "\\'");

// ★ 마커 팝업 하단에 '정보 직접 수정/입력' 버튼이 눈에 띄게 보이도록 수정된 레이아웃
            var popupContent = `
                <div id="${cardId}" style="width: 310px; font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; text-align: left; padding: 2px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1; padding-right: 12px;">
                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
                                <span style="font-size: 16px; font-weight: 700; color: #222; letter-spacing: -0.5px;">${item.name}</span>
                                <span style="font-size: 12px; color: #888;">${typeName.split(',')[0]}</span>
                                <span style="background: #258fff; color: #fff; border-radius: 50%; width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold;">➔</span>
                            </div>
                            <div style="font-size: 12px; margin-bottom: 4px;">
                                <span style="color: #ff5252; font-weight: bold;">${rating}</span>
                                <span style="color: #ff5252; font-size: 11px; letter-spacing: -1px;">★★★★★</span>
                                <span style="color: #888;">(${ratingCount}건)</span>
                                <span style="color: #ddd; margin: 0 3px;">|</span>
                                <span style="color: #888;">리뷰 ${reviews}</span>
                            </div>
                            <div style="font-size: 12px; margin-bottom: 6px;">${statusText} · ${placeHours}</div>
                            <div style="font-size: 12.5px; color: #333; line-height: 1.4; word-break: keep-all;">${fullAddress}</div>
                            <div style="font-size: 11.5px; color: #888; margin-top: 2px;">(우) ${zipCode} &nbsp;(지번) ${cleanLegal} ${bunjiMain}-${bunjiSub}</div>
                            
                            <!-- 눈에 띄는 전화번호 및 직접 입력 버튼 -->
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; background: #f8f9fa; padding: 4px 6px; border-radius: 4px; border: 1px solid #eee;">
                                <span style="font-size: 12.5px; color: #009000; font-weight: bold;">📞 ${placePhone}</span>
                                <button onclick="openPlaceEditModal('${safeName}', ${item.lat}, ${item.lng}, '${cardId}')" style="background: #333; color: #fff; border: none; padding: 3px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: bold;">✏️ 정보 입력/수정</button>
                            </div>

                            <div style="margin-top: 6px; font-size: 12px;">
                                <a href="javascript:void(0);" onclick="window.openDetailWindow('${exportData}')" style="color: #258fff; text-decoration: none; font-weight: 500;">상세보기 페이지 열기 &gt;</a>
                            </div>
                        </div>
                        <div style="width: 68px; height: 68px; flex-shrink: 0; border-radius: 4px; overflow: hidden; border: 1px solid #eee; background: #f8f9fa; margin-top: 4px;">
                            <img src="${placeImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2268%22 height=%2268%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23f1f3f5%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2211%22 fill=%22%23adb5bd%22 text-anchor=%22middle%22 dy=%22.3em%22>이미지</text></svg>'">
                        </div>
                    </div>
                    
                    <!-- 하단 버튼 바 -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                        <div style="display: flex; flex: 1; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; background: #fff; height: 32px;">
                            <button onclick="alert('즐겨찾기에 저장되었습니다.')" title="즐겨찾기" style="flex: 1; border: none; border-right: 1px solid #eee; background: transparent; cursor: pointer; font-size: 13px; color: #555;">🔖</button>
                            <button onclick="alert('로드뷰를 실행합니다.')" title="로드뷰" style="flex: 1; border: none; border-right: 1px solid #eee; background: transparent; cursor: pointer; font-size: 13px; color: #555;">💧</button>
                            <button onclick="alert('주소가 공유되었습니다.')" title="공유" style="flex: 1; border: none; background: transparent; cursor: pointer; font-size: 13px; color: #555;">📤</button>
                        </div>
                        <button onclick="alert('${safeName}(으)로 길찾기를 시작합니다.')" style="background: #258fff; color: #fff; border: none; border-radius: 4px; height: 32px; padding: 0 14px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            ↱ 길찾기
                        </button>
                    </div>
                </div>
            `;
        L.popup({ maxWidth: 340, minWidth: 310 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
    });

    marker.on('dblclick', function(e) {
        L.DomEvent.stopPropagation(e);
        var isUserMarker = typeof myLandmarks !== 'undefined' && myLandmarks.some(m => m.name === item.name && m.lat === item.lat);
        if (isUserMarker && confirm(`'${item.name}' 마커를 삭제하시겠습니까?`)) {
            var tGroup = typeof groupMap !== 'undefined' ? groupMap[item.type] || "normal" : "normal";
            if (typeof catLayers !== 'undefined' && catLayers[tGroup]) catLayers[tGroup].removeLayer(marker);
            else map.removeLayer(marker);
            if (typeof activeMarkers !== 'undefined') activeMarkers = activeMarkers.filter(m => m !== marker);
            if (typeof myLandmarks !== 'undefined') {
                myLandmarks = myLandmarks.filter(m => m.name !== item.name || m.lat !== item.lat);
                localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
            }
        }
    });
}

marker.myColor = item.color; 
if (typeof activeMarkers !== 'undefined') activeMarkers.push(marker);
}

// =========================================================
// ★ 8. 데이터 영구 저장 및 모달 관리 (레이어 메뉴는 map_04_ui.js에 위임)
// =========================================================
var searchHighlightLayer = null;
var isSubwayMode = false;
var savedLayerState = [];

map.on('overlayadd', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });
map.on('overlayremove', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });

// 데이터 소스코드 추출 버튼을 map_04_ui.js의 컨트롤에 안전하게 얹어주기
setTimeout(function() {
    var existingContainer = document.querySelector('.leaflet-control-layers');
    if (existingContainer && !document.getElementById('export-code-btn')) {
        var exportBtn = document.createElement('button');
        exportBtn.id = 'export-code-btn';
        exportBtn.innerHTML = '💾 코드로 영구 저장하기';
        exportBtn.style.width = '100%';
        exportBtn.style.marginTop = '8px';
        exportBtn.style.padding = '8px 0';
        exportBtn.style.cursor = 'pointer';
        exportBtn.style.border = 'none';
        exportBtn.style.backgroundColor = '#0077DD';
        exportBtn.style.color = 'white';
        exportBtn.style.borderRadius = '4px';
        exportBtn.style.fontWeight = 'bold';
        exportBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

        exportBtn.onclick = function(e) {
            e.stopPropagation(); e.preventDefault();
            var markers = JSON.parse(localStorage.getItem('hyobin_markers')) || [];
            var lines = JSON.parse(localStorage.getItem('hyobin_lines')) || [];
            
            if (markers.length === 0 && lines.length === 0) {
                alert("새로 추가하거나 수정한 데이터가 없습니다."); return;
            }
            
            var resultText = "/* 아래 코드를 복사해서 데이터 파일 가장 아래 빈 공간에 붙여넣으세요! */\n\n";
            if (markers.length > 0) resultText += "// 📍 수동 저장된 마커 데이터\nvar myExportedMarkers = " + JSON.stringify(markers, null, 4) + ";\n\n";
            if (lines.length > 0) resultText += "// 🛤️ 수동 저장된 도로/선 데이터\nvar myExportedLines = " + JSON.stringify(lines, null, 4) + ";\n\n";
            
            var modal = document.createElement('div');
            modal.style.position = 'fixed'; modal.style.top = '50%'; modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)'; modal.style.backgroundColor = '#fff';
            modal.style.padding = '20px'; modal.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
            modal.style.zIndex = '9999'; modal.style.width = '600px'; modal.style.height = '500px';
            modal.style.display = 'flex'; modal.style.flexDirection = 'column'; modal.style.borderRadius = '8px';
            
            modal.innerHTML = `
                <h3 style="margin-top:0; color:#0077DD; border-bottom:2px solid #0077DD; padding-bottom:10px;">💾 데이터 코드 추출기</h3>
                <p style="font-size:13px; color:#444; margin-bottom:10px; line-height:1.5;">LocalStorage 용량이 차기 전에 아래 코드를 복사하여 JS 파일에 붙여넣어 영구 저장하세요.</p>
                <textarea id="code-textarea" style="flex:1; width:100%; font-family:monospace; font-size:12px; padding:10px; border:1px solid #ccc; resize:none; box-sizing:border-box;" readonly></textarea>
                <div style="text-align:right; margin-top:15px;">
                    <button id="copy-export-btn" style="padding:10px 20px; background:#333; color:#fff; border:none; cursor:pointer; border-radius:4px; font-weight:bold; margin-right:5px;">전체 복사</button>
                    <button id="close-export-btn" style="padding:10px 20px; background:#ddd; border:none; cursor:pointer; border-radius:4px; font-weight:bold;">닫기</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('code-textarea').value = resultText;
            
            document.getElementById('copy-export-btn').onclick = function() {
                var textarea = document.getElementById('code-textarea');
                textarea.select(); document.execCommand('copy');
                alert("코드가 복사되었습니다!");
            };
            document.getElementById('close-export-btn').onclick = function() { document.body.removeChild(modal); };
        };
        existingContainer.appendChild(exportBtn);
    }
}, 500);

// 정보 수정 제안 모달 함수
// =========================================================
// 정보 수정 및 직접 입력 모달 함수 (이미지, 전화번호, 메모 통합 입력판)
// =========================================================
// =========================================================
// 정보 수정 및 직접 입력 모달 최종판 (이름, 카테고리, 이미지, 전화번호, 메모 전면 수정 가능)
// =========================================================
function openPlaceEditModal(name, lat, lng, cardId) {
    var existingItem = null;
    if (typeof myLandmarks !== 'undefined') {
        existingItem = myLandmarks.find(m => m.name === name && m.lat === lat);
    }
    if (!existingItem && typeof allLandmarks !== 'undefined') {
        existingItem = allLandmarks.find(m => m.name === name);
    }

    var defaultName = name;
    var defaultType = (existingItem && existingItem.type) ? existingItem.type : "normal";
    var defaultImg = (existingItem && existingItem.image) ? existingItem.image : `이미지/${name}.webp`;
    var defaultPhone = (existingItem && existingItem.phone) ? existingItem.phone : "";
    var defaultDesc = (existingItem && existingItem.desc) ? existingItem.desc : "";

    // 1. 이름 수정 창
    var newName = prompt("🏷️ [1/5단계] 시설 이름을 수정하세요:", defaultName);
    if (newName === null) return;
    
    // 2. 카테고리(타입) 코드 직접 입력 창
    var typeGuide = "현재 타입: " + defaultType + "\n\n[입력 가능한 주요 카테고리 코드]\n- restaurant (식당)\n- cafe (카페)\n- school (학교)\n- bank (은행)\n- hospital (병원)\n- office_main / office_sub (관공서/주민센터)\n- culture (문화/회관/도서관)\n- commercial (마트/상가)\n- park (공원)\n- normal (일반)";
    var newType = prompt("📂 [2/5단계] 올바른 카테고리 코드를 입력하세요:\n\n" + typeGuide, defaultType);
    if (newType === null) return;

    // 3. 이미지 주소 입력창
    var newImg = prompt("📸 [3/5단계] 이미지 경로 또는 웹 주소(URL)를 입력하세요:", defaultImg);
    if (newImg === null) return;
    
    // 4. 전화번호 입력창
    var newPhone = prompt("📞 [4/5단계] 전화번호를 입력하세요:", defaultPhone);
    if (newPhone === null) return;
    
    // 5. 상세 설명 메모 입력창
    var newDesc = prompt("📝 [5/5단계] 상세 설명이나 메모를 입력하세요:", defaultDesc);
    if (newDesc === null) return;

    // 데이터 저장 및 영구 반영 (기존 마커 덮어쓰기 또는 새로 등록)
    if (typeof myLandmarks !== 'undefined') {
        // 기존에 수동 저장된 적이 있거나 기본 데이터인 경우 처리
        var target = myLandmarks.find(m => m.name === name && m.lat === lat);
        if (target) {
            target.name = newName;
            target.type = newType;
            target.image = newImg;
            target.phone = newPhone;
            target.desc = newDesc;
        } else {
            var baseItem = (typeof allLandmarks !== 'undefined') ? allLandmarks.find(m => m.name === name) : null;
            myLandmarks.push({
                name: newName,
                lat: lat,
                lng: baseItem ? baseItem.lng : lng,
                type: newType,
                color: (typeof markerColors !== 'undefined' ? markerColors[newType] : '#333333'),
                image: newImg,
                phone: newPhone,
                desc: newDesc
            });
        }
        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        alert("✨ 수정 내용이 성공적으로 반영되었습니다!");
        map.closePopup();
        location.reload(); // 새로고침하여 즉시 적용
    }
}// 정류장 모달 제어 관련 함수들
var currentEditMarker = null; var currentEditItem = null;

function scanNearbyBuses(lat, lng, margin = 150) {
    var foundBuses = [];
    function safeGetDist(px, py, x1, y1, x2, y2) {
        var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1, dot = A * C + B * D, len_sq = C * C + D * D, param = -1;
        if (len_sq != 0) param = dot / len_sq;
        var xx, yy;
        if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; }
        var dx = px - xx, dy = py - yy; return Math.sqrt(dx * dx + dy * dy);
    }
    if (typeof busData !== 'undefined') {
        busData.forEach(bus => {
            if (!bus.points) return; 
            var isAlreadyShifted = bus.points.length > 0 && bus.points[0][0] < -20000;
            var pts = isAlreadyShifted ? bus.points : bus.points.map(p => [p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]]);
            for (var i = 0; i < pts.length - 1; i++) {
                var dist = safeGetDist(lat, lng, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
                if (dist <= margin) {
                    var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
                    foundBuses.push(`<span style="color:${bColor}; font-weight:bold;">[${bus.type}]</span> ${bus.name}`);
                    break; 
                }
            }
        });
    }
    return foundBuses;
}

function openBusStopEditModal(item, marker) {
    try {
        currentEditItem = item; currentEditMarker = marker;
        var nameInput = document.getElementById('edit-bus-stop-name');
        if (!nameInput) return;
        nameInput.value = (item.name || "").replace(' 정류장', '');
        if (!item.allPassingBuses) item.allPassingBuses = [...(item.passingBuses || [])];

        var scannedBuses = [];
        if (typeof scanNearbyBuses === 'function') scannedBuses = scanNearbyBuses(item.lat, item.lng, 150);
        var mergedSet = new Set(item.allPassingBuses);
        scannedBuses.forEach(b => mergedSet.add(b)); item.allPassingBuses = Array.from(mergedSet);

        var routesHtml = "";
        item.allPassingBuses.forEach(busStr => {
            var isChecked = (item.passingBuses && item.passingBuses.includes(busStr)) ? "checked" : "";
            routesHtml += `<label style="display:block; margin-bottom:5px; cursor:pointer; padding:3px;"><input type="checkbox" class="edit-bus-route-chk" value='${busStr}' ${isChecked}> ${busStr}</label>`;
        });

        var routesContainer = document.getElementById('edit-bus-stop-routes');
        if (routesContainer) routesContainer.innerHTML = routesHtml;
        document.getElementById('bus-stop-edit-modal').style.display = 'flex';
    } catch (error) { console.error(error); }
}

function saveBusStopEdit() {
    var newName = document.getElementById('edit-bus-stop-name').value.trim();
    if (!newName) { alert("이름을 입력하세요!"); return; }
    if (!newName.endsWith('정류장')) newName += " 정류장";
    var checkedRoutes = [];
    document.querySelectorAll('.edit-bus-route-chk:checked').forEach(chk => { checkedRoutes.push(chk.value); });
    
    currentEditItem.name = newName; currentEditItem.passingBuses = checkedRoutes;
    currentEditItem.isManual = true; currentEditMarker.isManualMarker = true; 
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    
    var busListHtml = checkedRoutes.length > 0 ? checkedRoutes.join("<br>") : "<span style='color:#EE0022; font-weight:bold;'>🚫 모든 노선 무정차 통과</span>";
    currentEditMarker.setTooltipContent(`<b>🚏 ${currentEditItem.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busListHtml}</div>`);
    var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${currentEditItem.name.replace(' 정류장','')}</div>`;
    currentEditMarker.setIcon(L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] }));
    if(typeof closeModal === 'function') closeModal('bus-stop-edit-modal'); else document.getElementById('bus-stop-edit-modal').style.display='none';
}

function deleteEditBusStop() {
    if(confirm(`'${currentEditItem.name}'을(를) 삭제하시겠습니까?`)) {
        if (typeof busStopLayer !== 'undefined') busStopLayer.removeLayer(currentEditMarker); else map.removeLayer(currentEditMarker);
        if (typeof activeMarkers !== 'undefined') activeMarkers = activeMarkers.filter(m => m !== currentEditMarker);
        if (typeof myLandmarks !== 'undefined') {
            myLandmarks = myLandmarks.filter(m => m.name !== currentEditItem.name || m.lat !== currentEditItem.lat);
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        }
        if(typeof closeModal === 'function') closeModal('bus-stop-edit-modal'); else document.getElementById('bus-stop-edit-modal').style.display='none';
    }
}

// 전체 마커 지도에 등록 실행
allLandmarks.forEach(function(item) {
    addMarkerToMap(item);
});
// =========================================================
// 정류장 모달 제어 함수
// =========================================================
var currentEditMarker = null; var currentEditItem = null;

function scanNearbyBuses(lat, lng, margin = 150) {
    var foundBuses = [];
    function safeGetDist(px, py, x1, y1, x2, y2) {
        var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1, dot = A * C + B * D, len_sq = C * C + D * D, param = -1;
        if (len_sq != 0) param = dot / len_sq;
        var xx, yy;
        if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; }
        var dx = px - xx, dy = py - yy; return Math.sqrt(dx * dx + dy * dy);
    }
    if (typeof busData !== 'undefined') {
        busData.forEach(bus => {
            if (!bus.points) return; 
            var isAlreadyShifted = bus.points.length > 0 && bus.points[0][0] < -20000;
            var pts = isAlreadyShifted ? bus.points : bus.points.map(p => [p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]]);
            for (var i = 0; i < pts.length - 1; i++) {
                var dist = safeGetDist(lat, lng, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
                if (dist <= margin) {
                    var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
                    foundBuses.push(`<span style="color:${bColor}; font-weight:bold;">[${bus.type}]</span> ${bus.name}`);
                    break; 
                }
            }
        });
    }
    return foundBuses;
}

function openBusStopEditModal(item, marker) {
    try {
        currentEditItem = item; currentEditMarker = marker;
        var nameInput = document.getElementById('edit-bus-stop-name');
        if (!nameInput) { alert("⚠️ 에러: HTML에 'edit-bus-stop-name' 요소가 없습니다!"); return; }
        nameInput.value = (item.name || "").replace(' 정류장', '');
        if (!item.allPassingBuses) item.allPassingBuses = [...(item.passingBuses || [])];

        var scannedBuses = [];
        if (typeof scanNearbyBuses === 'function') scannedBuses = scanNearbyBuses(item.lat, item.lng, 150);
        var mergedSet = new Set(item.allPassingBuses);
        scannedBuses.forEach(b => mergedSet.add(b)); item.allPassingBuses = Array.from(mergedSet);

        var routesHtml = "";
        item.allPassingBuses.forEach(busStr => {
            var isChecked = (item.passingBuses && item.passingBuses.includes(busStr)) ? "checked" : "";
            routesHtml += `<label style="display:block; margin-bottom:5px; cursor:pointer; padding:3px;"><input type="checkbox" class="edit-bus-route-chk" value='${busStr}' ${isChecked}> ${busStr}</label>`;
        });

        var routesContainer = document.getElementById('edit-bus-stop-routes');
        if (!routesContainer) { alert("⚠️ 에러: HTML에 'edit-bus-stop-routes' 요소가 없습니다!"); return; }
        routesContainer.innerHTML = routesHtml || "<span style='color:#999;'>지나가는 노선이 없습니다.</span>";
        document.getElementById('bus-stop-edit-modal').style.display = 'flex';
    } catch (error) { alert("🚨 정류장 클릭 중 에러 발생!\n원인: " + error.message); console.error(error); }
}

function saveBusStopEdit() {
    var newName = document.getElementById('edit-bus-stop-name').value.trim();
    if (!newName) { alert("이름을 입력하세요!"); return; }
    if (!newName.endsWith('정류장')) newName += " 정류장";
    var checkedRoutes = [];
    document.querySelectorAll('.edit-bus-route-chk:checked').forEach(chk => { checkedRoutes.push(chk.value); });
    
    currentEditItem.name = newName; currentEditItem.passingBuses = checkedRoutes;
    currentEditItem.isManual = true; currentEditMarker.isManualMarker = true; 
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    
    var busListHtml = checkedRoutes.length > 0 ? checkedRoutes.join("<br>") : "<span style='color:#EE0022; font-weight:bold;'>🚫 모든 노선 무정차 통과</span>";
    currentEditMarker.setTooltipContent(`<b>🚏 ${currentEditItem.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busListHtml}</div>`);
    var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${currentEditItem.name.replace(' 정류장','')}</div>`;
    currentEditMarker.setIcon(L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] }));
    if(typeof closeModal === 'function') closeModal('bus-stop-edit-modal'); else document.getElementById('bus-stop-edit-modal').style.display='none';
}

function deleteEditBusStop() {
    if(confirm(`'${currentEditItem.name}'을(를) 삭제하시겠습니까?`)) {
        if (typeof busStopLayer !== 'undefined') busStopLayer.removeLayer(currentEditMarker); else map.removeLayer(currentEditMarker);
        if (typeof activeMarkers !== 'undefined') activeMarkers = activeMarkers.filter(m => m !== currentEditMarker);
        if (typeof myLandmarks !== 'undefined') {
            myLandmarks = myLandmarks.filter(m => m.name !== currentEditItem.name || m.lat !== currentEditItem.lat);
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        }
        if(typeof closeModal === 'function') closeModal('bus-stop-edit-modal'); else document.getElementById('bus-stop-edit-modal').style.display='none';
    }
}

// 전체 마커 지도에 등록 실행
allLandmarks.forEach(function(item) {
    addMarkerToMap(item);
});