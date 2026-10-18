    // =========================================================
    // ★ [좌표 자동 보정 로직]
    // =========================================================
    var addedRowsTop = 11;
    var cellHeightForAdj = 1802;
    var adjustY = -(addedRowsTop * cellHeightForAdj); 

    var migrationKey = 'hyobin_v3.0_migration_done';
    if (!localStorage.getItem(migrationKey)) {
        var savedMarkers = JSON.parse(localStorage.getItem('hyobin_markers')) || [];
        var savedLines = JSON.parse(localStorage.getItem('hyobin_lines')) || [];
        if (savedMarkers.length > 0 || savedLines.length > 0) {
            console.log(`[시스템] 좌표 자동 보정 실행 (Y축 ${adjustY})`);
            savedMarkers.forEach(m => { m.lat += adjustY; });
            savedLines.forEach(l => { l.points = l.points.map(p => [p[0] + adjustY, p[1]]); });
            localStorage.setItem('hyobin_markers', JSON.stringify(savedMarkers));
            localStorage.setItem('hyobin_lines', JSON.stringify(savedLines));
        }
        localStorage.setItem(migrationKey, 'true');
    }

    function shiftPoints(points) {
        if (Array.isArray(points[0][0])) { return points.map(ring => ring.map(p => [p[0] + adjustY, p[1]])); } 
        else { return points.map(p => [p[0] + adjustY, p[1]]); }
    }

    // =========================================================
    // 1. 전역 설정
    // =========================================================
    var isDrawingMode = false;      
    var isStationMode = false;
    var isAreaMode = false;
    var isRadiusMode = false; 
    var isAutoDistMode = false; 
    var isDistrictAreaMode = false; 
    var useKmUnit = true; 
    var isBusStopMode = false;
var tempBusStopData = null;
    // 검색 영역 하이라이트용 변수
var searchHighlightPoly = null; 
// 검색 하이라이트 레이어 및 결과 저장용 변수
    var searchHighlightLayer = null;
    var currentSearchResults = { markers: [], polys: [] };

    // 버스 정류장 모드 토글 함수
function toggleBusStopMode() {
    resetDrawMode(); resetAreaMode(); isRadiusMode = false; isStationMode = false;
    document.getElementById('radius-btn').classList.remove('active-btn');
    document.getElementById('station-btn').classList.remove('active-btn');
    
    isBusStopMode = !isBusStopMode;
    var btn = document.getElementById("bus-stop-btn");
    
    if (isBusStopMode) {
        btn.classList.add("active-btn");
        document.getElementById("map").style.cursor = "crosshair";
    } else {
        btn.classList.remove("active-btn");
        document.getElementById("map").style.cursor = "default";
    }
}
// 패널 숨기기/펼치기 함수
function toggleControlPanel() {
    var panel = document.getElementById('main-control-panel');
    var btn = document.querySelector('.panel-toggle-btn');
    panel.classList.toggle('collapsed');
    btn.innerHTML = panel.classList.contains('collapsed') ? "▶" : "◀";
}

// 사용자 지정 색상 적용 함수
function setCustomColor(color) {
    currentSelectedColor = color;
    updateHeaderPreview(color);
    var radios = document.getElementsByName('drawColor');
    for (var i = 0; i < radios.length; i++) radios[i].checked = false;
    document.getElementById('subway-select').value = "";
}

    // 면적 데이터 저장용 배열
    var measuredAreas = [];

    var tempRadiusCircle = null;
    var radiusCenter = null;

    var searchablePolygons = []; 
    var tempClickLatLng = null;      

    var regionColors = [
        { name: "효빈시(대표)", code: "#7777aa" },
        { name: "중구", code: "#BB9955" },
        { name: "동구", code: "#FF9922" },
        { name: "서구", code: "#00AABB" },
        { name: "남구", code: "#DDBBFF" },
        { name: "북구", code: "#7799CC" },
        { name: "청엽구", code: "#006699" },
        { name: "창전구", code: "#33AAFF" },
        { name: "안천구", code: "#AA66DD" },
        { name: "탄성군", code: "#BBFF64" },
        { name: "선곡군(덕빈)", code: "#D6D5CA" },
        { name: "기도군(덕빈)", code: "#01B7ED" },
        { name: "천주시(덕빈)", code: "#8B4993" },
        { name: "약산시(덕빈)", code: "#F8C8C4" },
        { name: "덕현군(덕빈)", code: "#FF5800" },
        { name: "치원군(덕빈)", code: "#aa7799" },
        { name: "낭원군(덕빈)", code: "#485EC6" }
    ];

    function getColorByName(name) {
        var found = regionColors.find(function(rc) { return rc.name === name; });
        if (found) return found.code;
        found = regionColors.find(function(rc) { return name.indexOf(rc.name.replace("청", "")) !== -1 && rc.name.length > 2; }); 
        if (found) return found.code;
        return "#999999";
    }

 var subwayLines = {
        "1": { name: "1호선", color: "#0077DD" },
        "1B": { name: "1호선(지선)", color: "#0077DD" },
        "2": { name: "2호선", color: "#00CCAA" },
        "2B": { name: "2호선(지선)", color: "#00CCAA" },
        "3": { name: "3호선", color: "#FFCC11" },
        "4": { name: "4호선", color: "#FF5522" },
        "5": { name: "5호선", color: "#EE0022" },
        "6": { name: "6호선", color: "#881188" },
        "7": { name: "7호선", color: "#FF8899" },
        "7B": { name: "7호선(지선)", color: "#FF8899" },
        "7c": { name: "7호선(폐선)", color: "#ffc1ca" },
        "c": { name: "창전선", color: "#33aaff" },
        "y": { name: "청엽선", color: "#D6D5CA" },
        "8": { name: "8호선", color: "#9856FF" },
        "9": { name: "9호선", color: "#999999" },
        "G": { name: "고송선", color: "#999999" },
        "HBA": { name: "HDTX-A", color: "#FB637E" },
        "HBB": { name: "HDTX-B", color: "#9d8de2" },
        "A": { name: "안천선", color: "#B2FFDD" },
        "B": { name: "빈효광역선", color: "#6677cc" },
        // 일반철도 (모두 같은 코레일 블루색 적용)
        "R1": { name: "빈효선(일반)", color: "#3152A5" },
        "R2": { name: "효빈공단인입선", color: "#3152A5" },
        "R3": { name: "강빈선", color: "#3152A5" },
        "R4": { name: "수포현대선", color: "#3152A5" },
        "R5": { name: "청선인자선", color: "#3152A5" },
        "R6": { name: "효빈항선", color: "#3152A5" },
        "R7": { name: "포장공단선", color: "#3152A5" },
        // 고속철도
        "H1": { name: "빈효고속선", color: "#1D2352" },
        "T1": { name: "효빈대 A선 트램", color: "#a0fff9" },
    "M1": { name: "효빈대 B선 모노레일", color: "#74f466" }
    };
// ★ 내가 직접 지정하는 주요역(급행 정차역, 거점역 등) 목록
var myMajorStations = [
    "평당역", "보몽역", "평전역", "창전구청역", "아논타워역", "탄성군청역", "장선역", "장곡역", "약산시청역", // 1호선
    "효빈공단역", // 2호선
    "효빈국제공항역", "사능역", "팔조역", // 3호선
    "천가역", "해운산업지구역", "앵내역", // 4호선
    "소조역", "루비역", "포성산역", "청덕공원역", // 5호선
    "고송역", "진희역", // 6호선
    "효빈은행역", "효빈성역", "리사역", "개항지역", "만마루역", "항만해변역", "색수시장역" // 7호선 및 지선
];
    var currentSelectedColor = regionColors[0].code;

    function updateHeaderPreview(color) { document.getElementById('current-color-preview').style.backgroundColor = color; }
    updateHeaderPreview(currentSelectedColor);

    // =========================================================
    // ★ [NEW] 사용자 지정 색상 처리
    // =========================================================
    function setCustomColor(color) {
        currentSelectedColor = color;
        updateHeaderPreview(color);
        // 라디오 버튼 선택 해제
        var radios = document.getElementsByName('drawColor');
        radios.forEach(r => r.checked = false);
        
        document.getElementById('subway-select').value = "";
    }

    // =========================================================
    // ★ [NEW] 컨트롤 패널 토글 로직
    // =========================================================
    function toggleControlPanel() {
        var panel = document.getElementById('main-control-panel');
        var btn = document.querySelector('.panel-toggle-btn');
        
        panel.classList.toggle('collapsed');
        
        if (panel.classList.contains('collapsed')) {
            btn.innerHTML = "▶"; // 펼치기 아이콘
        } else {
            btn.innerHTML = "◀"; // 숨기기 아이콘
        }
    }

    var paletteContainer = document.getElementById('palette-list');
    regionColors.forEach((rc, index) => {
        var label = document.createElement('label'); label.className = 'color-option';
        var radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'drawColor'; radio.value = rc.code;
        if (index === 0) radio.checked = true;
        radio.onclick = function() { 
            currentSelectedColor = rc.code; 
            updateHeaderPreview(rc.code);
            document.getElementById('subway-select').value = "";
            // 사용자 지정 색상 인풋 값은 굳이 안 바꿔도 됨
        };
        var box = document.createElement('div'); box.className = 'color-preview-small'; box.style.backgroundColor = rc.code;
        var text = document.createTextNode(rc.name);
        label.appendChild(radio); label.appendChild(box); label.appendChild(text); paletteContainer.appendChild(label);
    });


    // =========================================================
    // 구역별 면적 자동 계산 (레이어 연동)
    // =========================================================
    var districtAreaLabels = [];



    function toggleStationMode() {
        resetDrawMode(); resetAreaMode(); isRadiusMode = false;
        document.getElementById('radius-btn').classList.remove('active-btn');
        isStationMode = !isStationMode;
        var btn = document.getElementById("station-btn");
        if (isStationMode) {
            btn.classList.add("active-btn");
            document.getElementById("map").style.cursor = "pointer";
        } else {
            btn.classList.remove("active-btn");
            document.getElementById("map").style.cursor = "default";
        }
    }

    function resetDrawMode() {
        isDrawingMode = false;
        var btn = document.getElementById("draw-btn");
        btn.classList.remove("active-btn"); 
        document.getElementById("map").style.cursor = "default";
        
        if (drawPolyline) map.removeLayer(drawPolyline); 
        if (tempLine) map.removeLayer(tempLine); 
        
        if (currentDrawMarkers) {
            currentDrawMarkers.forEach(m => map.removeLayer(m));
            currentDrawMarkers = [];
        }
        drawPoints = [];
    }

    function resetAreaMode() {
        isAreaMode = false;
        var btn = document.getElementById("area-btn");
        btn.classList.remove("active-btn");
        document.getElementById("map").style.cursor = "default";

        if (areaPolygon) map.removeLayer(areaPolygon);
        if (tempAreaLine) map.removeLayer(tempAreaLine);
        areaPoints = [];
    }

    // =========================================================
    // 3. 지도 생성 및 데이터 로딩
    // =========================================================
    var baseMarkerSize = 40; var sizeMultiplier = 8; var minMarkerSize = 10;
    function createCustomIcon(color, size) {
        if (!color) color = "#333333"; if (!size) size = baseMarkerSize;
        var svgIcon = `<svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" stroke="white" stroke-width="20" d="M384 192c0 87.4-117 243-168.3 307.2c-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192C0 86 86 0 192 0s192 86 192 192z"/><circle cx="192" cy="192" r="60" fill="white" /></svg>`;
        return L.divIcon({ className: 'custom-pin', html: svgIcon, iconSize: [size, size * 1.3], iconAnchor: [size / 2, size * 1.3], popupAnchor: [0, -size] });
    }
 
    var cellWidth = 3829; var cellHeight = 1802;
    var gridLayout = [
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 48, 48, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 48, 48, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 47, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 47, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 47, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 46, null],
        [null, null, null, 37, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 46, null],
        [null, null, null, 37, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 46, null],
        [null, null, null, 36, 36, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 46, null],
        [null, null, null, 36, 36, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 45, null],
        [null, null, null, 36, 36, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 45, null],
        [null, null, null, 7, 7, 11, 15, 19, 23, 28, null, null, null, null, null, null, null, null, null, 45, null],
        [null, null, null, 7, 7, 11, 15, 19, 23, 28, 33, 33, null, null, null, 41, 42, 42, 43, 45, 52],
        [null, null, null, 8, 8, 11, 15, 19, 23, 28, 33, 33, 38, 39, 40, 41, 42, 42, 43, 44, 52],
        [null, null, null, 8, 8, 11, 15, 19, 23, 28, 33, 33, 38, 39, 40, 49, 42, 42, 43, 44, 52],
        [0, 1, 3, 5, 9, 12, 16, 20, 24, 29, 31, 35, 38, 39, 40, 49, null, null, null, null, null],
        [0, 1, 3, 5, 9, 12, 16, 20, 24, 29, 31, 35, 38, 39, 40, 49, null, null, null, null, null],
        [0, 1, 3, 5, 10, 13, 17, 21, 25, 30, 32, 35, null, null, null, null, null, null, null, null, null],
        [null, 2, 2, 6, 10, 13, 17, 21, 25, 30, 32, null, null, null, null, null, null, null, null, null, null],
        [null, 2, 2, 6, 10, 14, 22, 22, 26, 34, null, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, 6, 10, 14, 22, 22, 26, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, null, null, 14, 22, 22, 26, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, null, null, 14, 53, 27, 27, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, 53, 50, 50, null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, 53, 50, 50, null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
    ];

    var totalHeight = gridLayout.length * cellHeight;
    var totalWidth = gridLayout[0].length * cellWidth;
    var mapBounds = L.latLngBounds([[-totalHeight, 0], [0, totalWidth]]);

var map = L.map('map', {
        crs: L.CRS.Simple, minZoom: -4.0, maxZoom: 1, zoomSnap: 0.1, zoomDelta: 0.5, attributionControl: false,
        maxBounds: mapBounds, maxBoundsViscosity: 0.8,
        preferCanvas: true  // ★ 이 옵션을 반드시 추가하세요! (선/면 렌더링 속도 폭발적 증가)
    });

    var imageLayerGroup = L.layerGroup().addTo(map);
    var placedImages = {};
    for (var row = 0; row < gridLayout.length; row++) {
        for (var col = 0; col < gridLayout[row].length; col++) {
            var imgId = gridLayout[row][col];
            if (imgId === null || placedImages[imgId]) continue;
            var endCol = col; while (endCol + 1 < gridLayout[row].length && gridLayout[row][endCol + 1] === imgId) endCol++;
            var endRow = row; while (endRow + 1 < gridLayout.length && gridLayout[endRow + 1][col] === imgId) endRow++;
            var bounds = [[-((endRow + 1) * cellHeight), col * cellWidth], [-(row * cellHeight), (endCol + 1) * cellWidth]];
            L.imageOverlay("big" + imgId + ".webp", bounds).addTo(imageLayerGroup);
            placedImages[imgId] = true;
        }
    }
    map.setView([-totalHeight / 2, totalWidth / 2], -3.5);

    // =========================================================
    // 4. 레이어 정의
    // =========================================================
    var guGunLayer = L.layerGroup();    
    var adminLayer = L.layerGroup();    
    var legalLayer = L.layerGroup();    
    var devLayer = L.layerGroup();      
    var subwayLineLayer = L.layerGroup(); 
    var subwayStationLayer = L.layerGroup(); 
    var normalMarkerLayer = L.layerGroup();
    var gridLayer = L.layerGroup();
    var busStopLayer = L.layerGroup();
if (typeof districtData !== 'undefined') {
        var mergedDict = {};
        districtData.forEach(function(d) {
            // 고유 식별키 생성 (예: "팔조동_legal", "팔조동_admin")
            // 이름이 같아도 행정동과 법정동은 따로 분리해서 합치도록 안전장치 마련
            var key = d.name + "_" + (d.type || "none"); 
            
            if (!mergedDict[key]) {
                mergedDict[key] = Object.assign({}, d); // 객체 복사
                // 배열의 깊이를 확인하여, 단일 폴리곤이면 멀티폴리곤 형태인 [ [좌표들] ] 로 강제 변환
                mergedDict[key].points = Array.isArray(d.points[0][0]) ? d.points : [d.points];
            } else {
                // 이미 존재하는 구역이면 기존 폴리곤 배열에 덩어리(points)만 쏙 추가
                var newPoints = Array.isArray(d.points[0][0]) ? d.points : [d.points];
                mergedDict[key].points = mergedDict[key].points.concat(newPoints);
            }
        });
        
        // 흩어져 있던 데이터를 완벽히 병합된 상태로 덮어쓰기
        districtData = Object.values(mergedDict); 
    }

    // ▼ 기존 레이어 그리기 로직 시작 ▼
if (typeof districtData !== 'undefined') {
        // ★ [1단계] 이름과 타입이 같은 쪼개진 구역들을 하나의 멀티폴리곤으로 자동 병합
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
        
        var mergedDistrictData = Object.values(mergedDict);

        // ★ [2단계] 지도에 깔끔하게 그리기
        mergedDistrictData.forEach(function(d) {
            var color = d.color || getColorByName(d.name);
            var name = d.name;
            var targetLayer; var layerType = ""; 
            var isNewTown = name.includes("신도시") || name.includes("개발") || name.includes("지구") || name.includes("타운");
            
            if (d.type === "legal") { targetLayer = legalLayer; layerType = "legal"; } 
            else if (d.type === "admin") { targetLayer = adminLayer; layerType = "admin"; } 
            else if (isNewTown) { targetLayer = devLayer; layerType = "dev"; } 
            else if ((name.endsWith("구") || name.endsWith("군")|| name.endsWith("시")) && !name.includes("읍") && !name.includes("면")) { targetLayer = guGunLayer; layerType = "gugun"; } 
            else if (name.includes("가") || name.endsWith("리") || name.includes("중앙로") || name === "훈동") { targetLayer = legalLayer; layerType = "legal"; } 
            else { targetLayer = adminLayer; layerType = "admin"; }
            
            var dashStyle = null; var weightStyle = 1; var opacity = 0.7;
            if (targetLayer === devLayer) { dashStyle = '10, 10'; weightStyle = 4; opacity = 0.9; }
            else if (targetLayer === guGunLayer) { weightStyle = 3; opacity = 1.0; }
            else if (targetLayer === adminLayer) { dashStyle = '5, 5'; weightStyle = 2; opacity = 0.5; }
            else if (targetLayer === legalLayer) { weightStyle = 1; opacity = 0.8; }

            var polyPoints = shiftPoints(d.points); 

            // 병합된 다중 구역을 통째로 렌더링
            L.polygon(polyPoints, { color: color, fillColor: color, fillOpacity: 0.15, weight: weightStyle, dashArray: dashStyle, opacity: opacity, interactive: false })
            .addTo(targetLayer);
            
            // 검색 및 계산을 위해 하나로 합쳐진 상태로 저장
            searchablePolygons.push({ name: name, type: layerType, points: polyPoints });
            
            // 라벨(이름표)은 합쳐진 전체 영역의 정중앙에 딱 1개만 표시
            var center = L.polygon(polyPoints).getBounds().getCenter();
            L.marker(center, { icon: L.divIcon({ className: 'district-label', html: name.split('(')[0], iconSize: [120, 20], iconAnchor: [60, 10] }) }).addTo(targetLayer);
        });
    }
    var gridLayer = L.layerGroup(); 
var gridWidth = 2000;  // 가로 크기를 2000으로 변경
var gridHeight = 1500; // 세로 크기를 1500으로 변경
var gridCells = {}; 
var gridNum = 1;

// 1. 세로 선 그리기 (X축으로 가로 크기만큼 이동)
for (var x = 0; x <= totalWidth; x += gridWidth) {
    L.polyline([[0, x], [-totalHeight, x]], { color: 'gray', weight: 1, opacity: 0.4, dashArray: '5, 5', interactive: false }).addTo(gridLayer);
}

// 2. 가로 선 그리기 (Y축으로 세로 크기만큼 이동)
for (var y = 0; y >= -totalHeight; y -= gridHeight) {
    L.polyline([[y, 0], [y, totalWidth]], { color: 'gray', weight: 1, opacity: 0.4, dashArray: '5, 5', interactive: false }).addTo(gridLayer);
}

// 3. 그리드 번호 달기 및 좌표 저장
for (var y = 0; y > -totalHeight; y -= gridHeight) {
    for (var x = 0; x < totalWidth; x += gridWidth) {
        // 사각형 영역 계산 (세로 높이, 가로 너비 각각 적용)
        var bounds = [[y - gridHeight, x], [y, x + gridWidth]]; 
        // 정중앙 좌표 계산
        var center = [y - gridHeight / 2, x + gridWidth / 2];   

        // 지도 중앙에 번호 표시
        L.marker(center, {
            icon: L.divIcon({
                className: 'grid-number-label',
                html: `<div style="color:gray; font-size:30px; font-weight:bold; opacity:0.6; text-align:center;">${gridNum}</div>`,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            }),
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
        // ★ 내가 만든 역 마커에 '역'이 없으면 붙이기
        if(m.type === 'subway' && !m.name.endsWith('역')) m.name += '역'; 
    });

    var processedDefaultLandmarks = [];
    if (typeof defaultLandmarksData !== 'undefined') {
        processedDefaultLandmarks = defaultLandmarksData.map(function(m) {
            var mName = m.name;
            // ★ 기본 데이터에 '역'이 없으면 붙이기
            if (m.type === 'subway' && !mName.endsWith('역')) mName += '역';
            return { name: mName, lat: m.lat + adjustY, lng: m.lng, color: m.color, type: m.type };
        });
    }

    var allLandmarks = processedDefaultLandmarks.concat(myLandmarks);

    if (typeof subwayData !== 'undefined') {
if (subwayData.markers) {
    // ★ 그룹별로 쪼개진 데이터를 Object.values().flat()을 이용해 하나의 배열로 다시 합쳐줍니다.
    var mergedSubwayMarkers = Array.isArray(subwayData.markers) 
        ? subwayData.markers 
        : Object.values(subwayData.markers).flat();

    var processedSubwayMarkers = mergedSubwayMarkers.map(m => {
        var newName = m.name;
        if (!newName.endsWith('역')) newName += '역';
        // 원본 m을 건드리지 않고 새로운 객체를 리턴합니다.
        return Object.assign({}, m, { name: newName, lat: m.lat + adjustY });
    });
    allLandmarks = allLandmarks.concat(processedSubwayMarkers);
}
if (typeof subwayData !== 'undefined' && subwayData.lines) {
        subwayData.lines.forEach(function(line) {
            // ★ 1. 좌표 보정 (Y축에 adjustY 더하기)
            var correctedPoints = line.points.map(p => [p[0] + adjustY, p[1]]);
            
            // 🕵️ 범인 색출 추적기! (키보드 F12 눌러서 Console 창을 보면 좌표가 어떻게 찍히는지 나옵니다)
            // console.log(line.name + " 보정된 첫 좌표:", correctedPoints[0]);
            
            // lineKey 찾아서 레이어에 심기 (필터링용)
            var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name) || "";
            if (!lineKey) lineKey = Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
            
            // ★ 2. 반드시 "correctedPoints"로 선을 그려야 합니다! (line.points 절대 금지)
            var poly = L.polyline(correctedPoints, { color: line.color, weight: 5, opacity: 0.8 });
            
            poly.bindTooltip(line.name, { sticky: true });
            poly.lineCode = lineKey; // ID 저장
            poly.addTo(subwayLineLayer);
        });
    }
    }
// =========================================================
    // ★ [수정됨] 🛣️ 주요 도로망 그리기 (도로 라벨 추가)
    // =========================================================
    var roadLayer = L.layerGroup(); 
// 2. 🛣️ 주요 도로망 그리기
if (typeof roadData !== 'undefined') {
    // ★ 도로를 아래로 내릴 값입니다. 
    // 기본적으로 다른 마커들과 똑같이 맞추기 위해 adjustY를 썼습니다.
    // 만약 더 내리거나 덜 내리고 싶으시면 adjustY 대신 -500, -1000 처럼 직접 숫자를 쓰셔도 됩니다.
    var roadOffsetY = adjustY; 

    roadData.forEach(function(road) {
        // [좌표 내리기] 모든 도로 좌표의 Y값에 오프셋을 더해 아래로 내립니다. (다중 선분 에러 방지 완벽 적용)
        var shiftedPoints = road.points.map(function(pt) {
            if (Array.isArray(pt[0])) {
                return pt.map(function(innerPt) { return [innerPt[0] + roadOffsetY, innerPt[1]]; });
            } else {
                return [pt[0] + roadOffsetY, pt[1]];
            }
        });

        // 내려간 좌표(shiftedPoints)를 기준으로 선을 그립니다.
        var poly = L.polyline(shiftedPoints, { 
            color: "#1A237E", weight: 6, opacity: 0.9 
        });
        poly.bindTooltip(`🛣️ ${road.name}`, { sticky: true });
        poly.addTo(roadLayer);

        // 내려간 좌표(shiftedPoints)를 기준으로 라벨(이름)을 답니다.
        var labelPt = shiftedPoints[0];
        if (Array.isArray(labelPt[0])) {
            labelPt = labelPt[0]; 
        }

        var labelHtml = `<div class="station-name-label" style="position: absolute; color:#fff; font-size:12px; font-weight:bold; white-space: nowrap; text-shadow:-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; top: -20px; left: 50%; transform: translateX(-50%);">${road.name}</div>`;
        var labelMarker = L.marker(labelPt, {
            icon: L.divIcon({ className: 'custom-bus-stop', html: labelHtml, iconSize: [16, 16], iconAnchor: [8, 8] }),
            interactive: false
        });
        labelMarker.addTo(roadLayer);
    });
}
// =========================================================
    // ★ 🚌 버스 레이어 및 데이터 그리기 (자동 분류 기능 탑재!)
    // =========================================================
    var busLineLayer = L.layerGroup(); 
    var allBusLines = []; 
    var busColors = {
        "간선": "#01B7ED", "순환": "#E7D600", "지선": "#37B484",
        "광역": "#485EC6", "좌석": "#FF5800", "마을": "#A664A0",
        "공항": "#84C36E", "투어": "#7777AA", "급행": "#D81C2F"
    };

    if (typeof busData !== 'undefined') {
        busData.forEach(function(bus) {
            // ★ [자동 분류 로직] 데이터에 type이 없으면 이름에서 알아서 빼옵니다!
            if (!bus.type) {
                if (bus.name.includes("급행")) bus.type = "급행";
                else if (bus.name.includes("간선")) bus.type = "간선";
                else if (bus.name.includes("지선")) bus.type = "지선";
                else if (bus.name.includes("순환")) bus.type = "순환";
                else if (bus.name.includes("광역")) bus.type = "광역";
                else if (bus.name.includes("좌석")) bus.type = "좌석";
                else if (bus.name.includes("마을")) bus.type = "마을";
                else if (bus.name.includes("공항")) bus.type = "공항";
                else if (bus.name.includes("투어")) bus.type = "투어";
                else bus.type = "일반"; // 아무것도 해당 안 되면 일반
            }

            var correctedPoints = bus.points.map(p => [p[0] + adjustY, p[1]]);
            var bColor = busColors[bus.type] || '#888888';
            
            // [핵심] 간선은 10번 단위로, 지선은 100번 단위로 쪼개기
            let busSubGroup = bus.type;
            window. busNumMatch = bus.name.match(/\d+/);
            if (busNumMatch) {
                let num = parseInt(busNumMatch[0], 10);
                if (bus.type === "간선") {
                    busSubGroup = `간선 [${Math.floor(num / 10) * 10}번대]`;
                } else if (bus.type === "지선") {
                    busSubGroup = `지선 [${Math.floor(num / 100) * 100}번대]`;
                }
            }
            
            var poly = L.polyline(correctedPoints, { 
                color: bColor, weight: 4, opacity: 0.85, dashArray: '7, 5' 
            });
            
            var fullBusName = `[${bus.type}] ${bus.name}`;
            poly.bindTooltip(`🚌 ${fullBusName}`, { sticky: true });
            poly.busType = busSubGroup; 
            
            // ★ 순수 이름 저장 & 하이라이트 클릭 이벤트 연결
            poly.rawBusName = bus.name; 
            poly.bColor = bColor;
            poly.on('click', function(e) {
                L.DomEvent.stopPropagation(e);
                highlightBusRoute(this.rawBusName, this.bColor); 
            });
            
            allBusLines.push(poly);
            poly.addTo(busLineLayer); 

            // 노선 이름 라벨 추가
            if (correctedPoints.length > 2) {
                var midIdx = Math.floor(correctedPoints.length / 2);
                var midPt = correctedPoints[midIdx];
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
    }    var activeMarkers = [];
    allLandmarks.forEach(item => addMarkerToMap(item));
    function calculateSize(zoom) { return Math.max(baseMarkerSize + (zoom * sizeMultiplier), minMarkerSize); }
// 카테고리별 마커 색상 지정 (추출 파일과 동일)
// =========================================================
// 1. [초정밀] 35종 세부 카테고리 마커 색상 정의
// =========================================================
var markerColors = {
    // 자연 / 지형
    "mountain": "#558B2F",      // 산 (짙은 녹색)
    "water": "#1976D2",         // 호수/바다/강 (푸른색)
    "park": "#4CAF50",          // 공원/유원지 (밝은 녹색)
    // 공공 / 관공서 (급 나누기)
    "office_main": "#1A237E",   // 시/구/군/도청 (위엄있는 남색)
    "office_sub": "#3949AB",    // 읍면동/주민센터 (약간 밝은 남색)
    "office_etc": "#3F51B5",    // 기타 공단/공사/법원
    "police": "#0D47A1",        // 경찰/파출소 (경찰 딥블루)
    "fire_station": "#D32F2F",  // 소방서 (소방 레드)
    "post_office": "#E65100",   // 우체국 (우체국 주황)
    "welfare": "#00897B",       // 복지시설/경로당/아동센터
    // 주거 / 교육
    "school": "#FFCA28",        // 학교/유치원 (노란색)
    "apartment": "#795548",     // 아파트/주거 (갈색)
    // 상업 / 금융
    "bank": "#0288D1",          // 은행/금융
    "commercial": "#F57C00",    // 백화점/마트/대형상업
    "market": "#8D6E63",        // 전통시장/수산시장
    "cvs": "#8BC34A",           // 편의점
    // F&B / 식음료
    "cafe": "#6D4C41",          // 카페/커피전문점
    "bakery": "#F4A460",        // 빵집/베이커리
    "fastfood": "#FF5252",      // 햄버거/패스트푸드
    "restaurant": "#FFB300",    // 일반 식당/음식점
    "pub": "#673AB7",           // 술집/호프/포차
    // 숙박 / 문화 / 체육
    "hotel": "#AB47BC",         // 숙박/호텔/모텔
    "culture": "#C2185B",       // 박물관/미술관/전시관
    "cinema": "#E53935",        // 영화관 (메가박스, CGV)
    "anime": "#E040FB",         // 서브컬처/애니플러스/굿즈샵 (포인트 마젠타)
    "religion": "#5D4037",      // 종교시설 (교회, 성당, 절)
    "sports": "#0277BD",        // 체육관/수영장/경기장
    // 의료
    "hospital": "#00ACC1",      // 병원/의원
    "pharmacy": "#43A047",      // 약국
    // 교통 / 인프라
    "parking": "#455A64",       // 주차장
    "toilet": "#0097A7",        // 공중화장실
    "airport": "#006064",       // 공항
    "port": "#01579B",          // 항구/여객터미널
    "station": "#C62828",       // 기차역/터미널
    "factory": "#757575",       // 공장/산업단지
    "normal": "#333333"         // 기타 일반
};

// =========================================================
// 2. 고품질 눈물방울 디자인 맵 핀 생성 함수 (SVG + 이모지 심볼)
// =========================================================
// =========================================================
// 2. [가독성 극대화] 핀 꼬리 완전 제거 + 큼직한 원형 꽉 찬 아이콘
// =========================================================
function createFacilityCustomIcon(type, color, size) {
    if (!color) color = "#333333";
    
    // ★ 핵심 포인트: 지도를 축소해도 아이콘이 깨알처럼 작아지지 않도록 
    // 무조건 '최소 32px' 이상의 크기를 억지로라도 보장합니다.
    var actualSize = Math.max(size || 36, 32); 

    var iconPath = "";

    // (아이콘 모양 패스는 그대로 유지)
    switch (type) {
        case 'school': iconPath = `M319.4 178.2L288 163.9v53.2c0 14.8-18 22.4-28.4 11.8L192 160l-67.6 68.9c-10.4 10.6-28.4 3-28.4-11.8v-53.2L64.6 178.2C49.5 185.7 40 201.2 40 218.2V384c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V300l40-40 40 40v84c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V218.2c0-17-9.5-32.5-24.6-40zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z`; break;
        case 'apartment': iconPath = `M0 32V480H448V32H0zm64 64H128V160H64V96zm128 0H256V160H192V96zm128 0H384V160H320V96zM64 224H128V288H64V224zm128 0H256V288H192V224zm128 0H384V288H320V224zM64 352H128V416H64V352zm128 0H256V416H192V352zm128 0H384V416H320V352z`; break;
        case 'office_main': 
        case 'office_sub':
        case 'office_etc': iconPath = `M224 0C100.3 0 0 100.3 0 224s100.3 224 224 224s224-100.3 224-224S347.7 0 224 0zm0 384c-88.4 0-160-71.6-160-160s71.6-160 160-160s160 71.6 160 160s-71.6 160-160 160zm32-240c0 17.7-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32z`; break;
        case 'police': iconPath = `M466.5 83.7l-192-80a48.2 48.2 0 0 0 -36.9 0l-192 80C27.7 91.1 16 108.6 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C381.5 463.7 496 326.5 496 128c0-19.4-11.7-36.9-29.5-44.3zM256 384c-70.7 0-128-57.3-128-128s57.3-128 128-128 128 57.3 128 128-57.3 128-128 128z`; break;
        case 'bank': iconPath = `M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32H32zM96 256H64V448h32V256zm128 0H192V448h32V256zm160 0H352V448h32V256zM0 480H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`; break;
        case 'hospital': 
        case 'pharmacy': iconPath = `M272 96c0-8.8-7.2-16-16-16h-64c-8.8 0-16 7.2-16 16v112H64c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h112v112c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16V304h112c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16H272V96z`; break;
        case 'cafe': iconPath = `M96 64c0-17.7 14.3-32 32-32H384c17.7 0 32 14.3 32 32v64H96V64zM0 192H448V352c0 53-43 96-96 96H96c-53 0-96-43-96-96V192zm448 64v64c35.3 0 64-28.7 64-64s-28.7-64-64-64z`; break;
        case 'park': iconPath = `M256 32C125 32 18 137 18 268c0 54.3 19.3 104.3 51.5 143.6L64 432c-6.6 6.6-6.6 17.4 0 24s17.4 6.6 24 0l42.6-42.6C163.6 427.5 208.3 436 256 436c131 0 238-105 238-236S387 32 256 32z`; break;
        case 'mountain': iconPath = `M256 32L0 448h512L256 32z`; break;
        case 'water': iconPath = `M256 512c141.4 0 256-114.6 256-256S256 0 256 0 0 114.6 0 256s114.6 256 256 256z`; break;
        case 'commercial': 
        case 'market': iconPath = `M160 64c0-35.3 28.7-64 64-64s64 28.7 64 64v32h64c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64V64zm64 0c-17.7 0-32 14.3-32 32v32h64V96c0-17.7-14.3-32-32-32z`; break;
        case 'hotel': iconPath = `M32 384c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 128c0-35.3 28.7-64 64-64h192c35.3 0 64 28.7 64 64V256H64V128zM0 320H480V288H0v32z`; break;
        case 'station': iconPath = `M256 0c-97.2 0-176 78.8-176 176V320c0 97.2 78.8 176 176 176H336c53 0 96-43 96-96V176c0-97.2-78.8-176-176-176H256zM144 144H368V256H144V144zM208 368a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm128-32a32 32 0 1 1 -64 0 32 32 0 1 1 64 0z`; break;
        case 'airport': iconPath = `M382.3 8.3L459.7 75l.1 .1c25 22.1 36.6 55.4 30.5 87.5L445.6 373.1l60.2 46.5c15.6 12 20.3 34.3 10.6 51.5c-7 12.3-20.9 19-35.1 17l-159.2-22.7L203 490c-9.3 12.1-26.3 15-39 6.8s-17.5-23.7-11.4-37l33-72.6-133-19-61.9 47.9c-15.6 12-38 8.6-49.3-7.5c-8.2-11.7-9.5-27-3.4-39.7l35-73.4L6 142.1c-14.2-2-22.9-15.7-19.6-29.6s15.7-22.9 29.6-19.6l239.5 34.2 96-211.2c7-15.3 22.9-24.2 39.8-22.3s30.8 14.4 33.2 31l2.4 29.1-44.5 54.3z`; break;
        case 'anime': iconPath = `M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z`; break;
        case 'restaurant':
        case 'fastfood': iconPath = `M224 48C100.3 48 0 148.3 0 272V304c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V272c0-123.7-100.3-224-224-224zM32 368h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`; break;
        default: iconPath = `M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z`; break;
    }

    // 핀 꼬리 완전히 없애고, 색깔이 칠해진 둥근 원판 위에 
    // 하얀색 아이콘이 시원하게 꽉 차게 들어가는 구조로 변경했습니다.
    var fullSvg = `
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));">
        <!-- 큼직한 원형 배경 (색상 적용, 테두리 두껍게) -->
        <circle cx="256" cy="256" r="240" fill="${color}" stroke="#ffffff" stroke-width="20"/>
        
        <!-- 하얀색 아이콘을 정중앙에 큼직하게 배치 -->
        <g transform="translate(102, 102) scale(0.6)">
            <path fill="#ffffff" d="${iconPath}"/>
        </g>
    </svg>`;

    return L.divIcon({ 
        className: 'custom-premium-pin-svg', 
        html: fullSvg, 
        iconSize: [actualSize, actualSize], // 원형이므로 정사각형 비율 유지
        iconAnchor: [actualSize / 2, actualSize / 2], // 중앙 정렬 
        popupAnchor: [0, -actualSize / 2] 
    });
}

// =========================================================
// 3. [최종 병기] 35개 키워드 초정밀 필터링 자동 분류 및 마커 생성
// =========================================================
function addMarkerToMap(item) {
    if (!item) return;
    
    var size = calculateSize ? calculateSize(map.getZoom()) : 36;
    var marker;

    if (item.name && item.type !== 'subway' && item.type !== 'busStop') {
var name = item.name;
        
        // 1. 아파트/주거시설 (최우선 검사)
        if (name.includes("아파트") || name.match(/(주공|자이|푸르지오|더샵|래미안|아이파크|휴먼시아|센트럴|스타힐스|대라수|리버시티|에일린의뜰|빌라|오피스텔|주상복합|단지)$/)) {
            item.type = "apartment";
        }
        
        // 2. 대형 상업시설 / 마트 (지점명 오작동 방지를 위해 최상단 배치)
        else if (name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|아울렛|상가|다이소|코스트코|빈스마트|마루마트|하나로마트)/)) {
            item.type = "commercial";
        }

        // 3. 학교/교육
        else if (name.match(/(초|중|고|초등학교|중학교|고등학교|대학교|대학원|과기원|유치원|어린이집|학원)$/) || name.includes("학교") || name.includes("사대부") || name.includes("캠퍼스")) {
            item.type = "school";
        }
        
        // 4. 금융 (은행)
        else if (name.match(/(은행|국민은행|신한은행|우리은행|하나은행|농협|기업은행|새마을금고|신협|수협|카카오뱅크|우체국금융)/)) {
            item.type = "bank";
        }

        // 5. 자연환경
        else if (name.match(/(산|봉|고개|령|오름)$/)) item.type = "mountain";
        else if (name.match(/(호|호수|저수지|못|강|천|계곡|폭포|해수욕장)$/)) item.type = "water";
        else if (name.match(/(공원|수목원|휴양림|생태공원|캠핑장|유원지|광장)/)) item.type = "park";

        // 6. 공공기관
        else if (name.match(/(시청|도청|구청|군청)/)) item.type = "office_main";
        else if (name.match(/(주민센터|행정복지센터|동사무소|읍사무소|면사무소|출장소)/)) item.type = "office_sub";
        else if (name.match(/(경찰서|지방경찰청|파출소|지구대|치안센터)/)) item.type = "police";
        else if (name.match(/(소방서|119안전센터|구조대)/)) item.type = "fire_station";
        else if (name.match(/(우체국|우편집중국|우편취급국)/)) item.type = "post_office";
        else if (name.match(/(법원|검찰청|교육청|세무서|건강보험|국민연금|공단|공사|본부|지사|보훈지청)/)) item.type = "office_etc";
        else if (name.match(/(복지관|노인복지관|장애인복지관|경로당|요양원|아동센터|보육원|실버타운)/)) item.type = "welfare";

        // 7. 교통 인프라 (단일 '역' 키워드 삭제 완벽 반영)
        else if (name.match(/(공항|국제공항)/)) item.type = "airport";
        else if (name.match(/(항|항구|여객터미널|선착장|부두|마리나)/) && !name.match(/(은행|마트)/)) item.type = "port";
        else if (name.match(/(기차역|KTX|SRT|버스터미널|종합터미널|환승센터|차량사업소|IC|JC|톨게이트)/)) item.type = "station";
        else if (name.match(/(주차장|공영주차장|환승주차장)/)) item.type = "parking";

        // 8. 기타 상업/생활
        else if (name.match(/(편의점|CU|GS25|세븐일레븐|이마트24|미니스톱)/)) item.type = "cvs";
        else if (name.match(/(전통시장|수산시장|청과시장|도매시장|오일장|시장)/)) item.type = "market";
        else if (name.match(/(약국|약|온누리약국|종로약국)$/)) item.type = "pharmacy";
        else if (name.match(/(화장실|공중화장실)/)) item.type = "toilet";

        // 9. 식음료 (F&B)
        else if (name.match(/(커피|카페|스타벅스|투썸플레이스|이디야|메가커피|컴포즈|빽다방|파스쿠찌|엔제리너스|폴바셋)/)) item.type = "cafe";
        else if (name.match(/(빵집|베이커리|파리바게뜨|뚜레쥬르|성심당|이성당)/)) item.type = "bakery";
        else if (name.match(/(맥도날드|버거킹|KFC|롯데리아|맘스터치|써브웨이|노브랜드버거|햄버거)/)) item.type = "fastfood";
        else if (name.match(/(술집|호프|포차|이자카야|투다리|역전할머니맥주|펍)/)) item.type = "pub";
        else if (name.match(/(식당|음식점|고깃집|국밥|쿠우쿠우|아웃백|가든|회관|반점|식육식당|DT)/)) item.type = "restaurant";

        // 10. 숙박
        else if (name.match(/(호텔|모텔|여관|펜션|리조트|스테이|토요코인|라마다|신신호텔|하얏트|신라호텔)/)) item.type = "hotel";

        // 11. 문화/여가/체육/종교
        else if (name.match(/(애니메이트|애니플러스|코믹프라자|굿즈샵|메이드카페|콜라보카페|서브컬처)/)) item.type = "anime"; 
        else if (name.match(/(영화관|극장|메가박스|CGV|롯데시네마|시네마)/)) item.type = "cinema";
        else if (name.match(/(박물관|미술관|도서관|과학관|전시관|기념관|예술의전당|문예회관)/)) item.type = "culture";
        else if (name.match(/(체육관|경기장|스타디움|야구장|축구장|수영장|헬스장|피트니스|골프장|빙상장)/)) item.type = "sports";
        else if (name.match(/(교회|성당|절|사찰|사원|기도원|성지)/)) item.type = "religion";

        // 12. 기타 시설
        else if (name.match(/(병원|의료원|치과|보건소|보건진료소|한의원|요양병원|대학병원)/)) item.type = "hospital";
        else if (name.match(/(공장|산단|공단|조선소|발전소|공업사|물류센터|제철소)/)) item.type = "factory";
        else item.type = "normal";
        
        if (typeof markerColors !== 'undefined') {
            item.color = markerColors[item.type] || markerColors["normal"];
        }
        }

    if (item.type === 'subway') {
        var lines = item.lines || []; 
        var iconHtml = "";
        var width = (lines.length === 1) ? 14 : (lines.length * 10) + 6;

        if (lines.length === 1) {
            var lineInfo = subwayLines[lines[0]];
            var lineColor = lineInfo ? lineInfo.color : "#333";
            iconHtml = `<div class="station-circle" style="width:14px; height:14px; border: 3px solid ${lineColor};"></div>`;
        } else {
            var dotsHtml = "";
            lines.forEach(lid => {
                var lInfo = subwayLines[lid];
                var c = lInfo ? lInfo.color : "#333";
                dotsHtml += `<div class="transfer-dot" style="background-color:${c};"></div>`;
            });
            iconHtml = `<div class="station-transfer" style="width:${width}px; height:14px;">${dotsHtml}</div>`;
        }

        var isTransfer = lines.length >= 2; 
        var isManualMajor = typeof myMajorStations !== 'undefined' && myMajorStations.includes(item.name);
        var isMajor = (isTransfer || isManualMajor) ? "major-station" : "normal-station";
        var markerClass = (isTransfer || isManualMajor) ? "major-marker" : "normal-marker";
        var lineClasses = lines.map(l => "line-" + l).join(" ");

        iconHtml += `<div class="station-name-label ${isMajor}">${item.name}</div>`;

        marker = L.marker([item.lat, item.lng], {
            icon: L.divIcon({ 
                className: `custom-station ${lineClasses} ${markerClass}`, 
                html: iconHtml, 
                iconSize: [width, 14], 
                iconAnchor: [width/2, 7] 
            })
        });

        marker.lineCodes = lines;
        marker.stationName = item.name;
    } else if (item.type === 'busStop') {
        var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${item.name ? item.name.replace(' 정류장','') : ''}</div>`;
        
        marker = L.marker([item.lat, item.lng], {
            icon: L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] })
        });
    } else {
        // ★ 프리미엄 아이콘 생성 함수 호출
        marker = L.marker([item.lat, item.lng], { icon: createFacilityCustomIcon(item.type, item.color, size) });
    }

    if (item.type === 'subway') {
        if (typeof subwayStationLayer !== 'undefined') marker.addTo(subwayStationLayer); 
    } else if (item.type === 'busStop') {
        if (typeof busStopLayer !== 'undefined') marker.addTo(busStopLayer);
        marker.passingBuses = item.passingBuses; 
    } else {
        if (typeof normalMarkerLayer !== 'undefined') marker.addTo(normalMarkerLayer); 
    }        

    marker.myColor = item.color; 
    if (typeof activeMarkers !== 'undefined') activeMarkers.push(marker);

    // =========================================================
    // 4. 클릭 팝업 시 35종 카테고리 이름 및 실제 행정구역 주소 매핑
    // =========================================================
    if (item.type === 'subway') {
        var lineNames = (item.lines || []).map(lid => subwayLines[lid] ? subwayLines[lid].name : "").filter(Boolean).join(", ");
        marker.bindTooltip(`<b>${item.name}</b><br><span style="font-size:11px; color:#555;">경유: ${lineNames}</span>`, { offset: [0, -10], direction: 'top' });
    } else if (item.type === 'busStop') {
        var busList = item.passingBuses && item.passingBuses.length > 0 ? item.passingBuses.join("<br>") : "<span style='color:#999;'>경유 노선 없음</span>";
        marker.bindTooltip(`<b>🚏 ${item.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busList}</div>`, { offset: [0, -10], direction: 'top' });
    } else {
// =========================================================
    // ★ [완전체] 카카오맵 스타일 플레이스 카드 + 정보 수정/저장 기능 탑재
    // =========================================================
    marker.bindTooltip(item.name || "", { offset: [0, -20], direction: 'top' });
    
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        
        var categoryNames = {
            "mountain": "자연 명소 (산/고개)", "water": "수변 명소 (호수/강/바다)", "park": "공원 및 유원지",
            "office_main": "행정기관 (시/구/군/도청)", "office_sub": "행정기관 (주민센터/읍면동)", "office_etc": "기타 공공기관",
            "police": "경찰 및 치안시설", "fire_station": "소방 및 구조시설", "post_office": "우체국 및 우편시설",
            "welfare": "사회복지시설", "school": "학교 및 교육시설", "apartment": "아파트 및 주거단지",
            "bank": "금융기관 (은행)", "commercial": "상업 및 쇼핑시설", "market": "전통 및 도매시장",
            "cvs": "편의점", "cafe": "카페 및 커피전문점", "bakery": "제과점 및 빵집",
            "fastfood": "패스트푸드", "restaurant": "식당 및 음식점", "pub": "주점 및 호프",
            "hotel": "숙박시설 (호텔/모텔)", "culture": "박물관 및 전시/문화시설", "cinema": "영화관 및 극장",
            "anime": "서브컬처 매장 (애니/굿즈)", "religion": "종교시설", "sports": "체육 및 스포츠 시설",
            "station": "육상 교통시설 (기차/터미널)", "port": "해상 교통시설 (항구/선착장)", "airport": "항공 교통시설 (공항)",
            "hospital": "병원 및 의료시설", "pharmacy": "약국", "factory": "산업 및 공장",
            "parking": "주차장", "toilet": "공중화장실", "normal": "일반 시설"
        };
        
        var typeName = categoryNames[item.type] || "기타 시설";
        
        // 행정구역 주소 자동 탐색
        var foundGugun = "", foundAdmin = "", foundLegal = "";
        if (typeof searchablePolygons !== 'undefined') {
            searchablePolygons.forEach(function(poly) {
                if (isPointInPolygon(item.lat, item.lng, poly.points)) {
                    if (poly.type === 'gugun') foundGugun = poly.name;
                    else if (poly.type === 'admin') foundAdmin = poly.name;
                    else if (poly.type === 'legal') foundLegal = poly.name;
                }
            });
        }
        
        var province = "효빈광역시";
        if (foundGugun && foundGugun.match(/(선곡군|기도군|덕현군|약산시|낭원군|치원군|천주시)/)) province = "덕빈북도"; 
        
        var fullAddress = province;
        if (foundGugun) fullAddress += " " + foundGugun;
        if (foundAdmin) fullAddress += " " + foundAdmin;
        if (foundLegal && foundLegal !== foundAdmin) {
            if (foundLegal.endsWith("리")) fullAddress += " " + foundLegal; 
            else fullAddress += "(" + foundLegal + ")"; 
        }
        if (!foundGugun && !foundAdmin && !foundLegal) fullAddress = "효빈광역시 (관할 외 지역)";

        var placeImg = item.image || `이미지/${item.name}.webp`; 
        var placePhone = item.phone || "등록된 연락처 없음";
        var placeDesc = item.desc || "상세 설명이 등록되지 않은 시설입니다.";

        var cardId = "place-card-" + Math.random().toString(36).substring(2, 9);
        var popupContent = `
            <div id="${cardId}" style="width: 300px; font-family:'Noto Sans KR', sans-serif; padding: 4px; background: #fff; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 11px; background: ${item.color || '#333'}; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${typeName}</span>
                    <span style="font-size: 11px; color: #666;">⭐ 5.0 (리뷰 1)</span>
                </div>

                <h3 style="margin: 4px 0 8px 0; font-size: 16px; font-weight: bold; color: #222;">${item.name}</h3>
                
                <hr style="margin: 6px 0; border:0; border-top: 1px solid #eee;">

                <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
                    ${placeImg ? `<img src="${placeImg}" style="width: 75px; height: 75px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; flex-shrink: 0;" onerror="this.style.display='none'">` : ''}
                    <div style="flex: 1; font-size: 11px; color: #555; line-height: 1.5;">
                        <p style="margin: 0 0 3px 0; word-break: break-all;">📍 <b>주소:</b> ${fullAddress}</p>
                        <p style="margin: 0 0 3px 0;">📞 <b>연락처:</b> <span id="span-phone-${cardId}">${placePhone}</span></p>
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 6px 8px; border-radius: 6px; font-size: 11px; color: #444; margin-bottom: 10px; border: 1px solid #e9ecef;">
                    💬 <span id="span-desc-${cardId}">${placeDesc}</span>
                </div>

                <!-- 정보 수정 및 저장 버튼 -->
                <div style="text-align: right;">
                    <button onclick="openRealPlaceEditModal('${item.name}', ${item.lat}, ${item.lng}, '${cardId}')" style="background: #0077DD; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;">✏️ 정보 수정 / 상세 입력</button>
                </div>
            </div>
        `;
        
        L.popup({ maxWidth: 320 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
    });
    }

    if (item.type === 'busStop') {
        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (typeof openBusStopEditModal === 'function') openBusStopEditModal(item, marker);
        });
    } else {
        marker.on('dblclick', function(e) {
            L.DomEvent.stopPropagation(e);
            var isUserMarker = typeof myLandmarks !== 'undefined' && myLandmarks.some(m => m.name === item.name && m.lat === item.lat);
            if (isUserMarker) {
                if (confirm(`'${item.name}' 마커를 삭제하시겠습니까?`)) {
                    if (item.type === 'subway') {
                        if (typeof subwayStationLayer !== 'undefined') subwayStationLayer.removeLayer(marker);
                    } else {
                        map.removeLayer(marker);
                    }
                    if (typeof activeMarkers !== 'undefined') activeMarkers = activeMarkers.filter(m => m !== marker);
                    if (typeof myLandmarks !== 'undefined') {
                        myLandmarks = myLandmarks.filter(m => m.name !== item.name || m.lat !== item.lat);
                        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
                    }
                }
            }
        });
    }
}
// =========================================================
// ★ 정류장 이름 수정 & 무정차 노선 설정 기능 (모달 제어)
// =========================================================
var currentEditMarker = null;
var currentEditItem = null;

// 1. [새로운 마법] 정류장 주변 반경 스캔 레이더 (수학 공식 내장 무적 버전!)
function scanNearbyBuses(lat, lng, margin = 150) {
    var foundBuses = [];

    // 🛡️ [해결책] 컴퓨터가 헤매지 않게, 에러 나던 거리 계산 공식을 아예 함수 안에 박아버립니다!
    function safeGetDist(px, py, x1, y1, x2, y2) {
        var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1;
        if (len_sq != 0) param = dot / len_sq;
        var xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        var dx = px - xx, dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    if (typeof busData !== 'undefined') {
        busData.forEach(bus => {
            if (!bus.points) return; // 혹시 버스 데이터가 살짝 꼬여있어도 에러 안 나게 방어
            
            var pts = bus.points.map(p => [p[0] + (typeof adjustY !== 'undefined' ? adjustY : 0), p[1]]);
            for (var i = 0; i < pts.length - 1; i++) {
                
                // 밖에서 찾지 않고, 방금 만든 안전한 내장 공식(safeGetDist)을 씁니다!
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
// 2. 모달 열기 (열리는 순간 주변을 스캔해서 누락된 버스를 잡아옵니다)
// =========================================================
// ★ 에러 추적용 안전장치 탑재 버전 (그대로 덮어씌워 주세요!)
// =========================================================
function openBusStopEditModal(item, marker) {
    try {
        currentEditItem = item;
        currentEditMarker = marker;

        var nameInput = document.getElementById('edit-bus-stop-name');
        if (!nameInput) {
            alert("⚠️ 에러: HTML에 'edit-bus-stop-name' 요소가 없어서 창을 못 띄웁니다!");
            return;
        }
        nameInput.value = (item.name || "").replace(' 정류장', '');

        if (!item.allPassingBuses) item.allPassingBuses = [...(item.passingBuses || [])];

        // 레이더 스캔 실행
        var scannedBuses = [];
        if (typeof scanNearbyBuses === 'function') {
            scannedBuses = scanNearbyBuses(item.lat, item.lng, 150);
        }

        // 기존 + 신규 노선 합치기
        var mergedSet = new Set(item.allPassingBuses);
        scannedBuses.forEach(b => mergedSet.add(b));
        item.allPassingBuses = Array.from(mergedSet);

        var routesHtml = "";
        item.allPassingBuses.forEach(busStr => {
            var isChecked = (item.passingBuses && item.passingBuses.includes(busStr)) ? "checked" : "";
            routesHtml += `<label style="display:block; margin-bottom:5px; cursor:pointer; padding:3px;">
                <input type="checkbox" class="edit-bus-route-chk" value='${busStr}' ${isChecked}> 
                ${busStr}
            </label>`;
        });

        var routesContainer = document.getElementById('edit-bus-stop-routes');
        if (!routesContainer) {
            alert("⚠️ 에러: HTML에 'edit-bus-stop-routes' 요소가 없습니다!");
            return;
        }
        routesContainer.innerHTML = routesHtml || "<span style='color:#999;'>지나가는 노선이 없습니다.</span>";

        document.getElementById('bus-stop-edit-modal').style.display = 'flex';

    } catch (error) {
        // 눈에 안 보이고 죽어버리는 에러를 팝업창으로 강제로 띄워버립니다!
        alert("🚨 정류장 클릭 중 치명적 에러 발생!\n원인: " + error.message);
        console.error(error);
    }
}

// 3. 수정 사항 저장 (저장하는 순간 영구 보존 락이 걸립니다)
function saveBusStopEdit() {
    var newName = document.getElementById('edit-bus-stop-name').value.trim();
    if (!newName) { alert("이름을 입력하세요!"); return; }
    if (!newName.endsWith('정류장')) newName += " 정류장";
    
    var checkedRoutes = [];
    document.querySelectorAll('.edit-bus-route-chk:checked').forEach(chk => {
        checkedRoutes.push(chk.value);
    });
    
    currentEditItem.name = newName;
    currentEditItem.passingBuses = checkedRoutes;
    
    // 🛡️ [절대 방어막] 사용자가 한 번이라도 수정한 정류장은 '수동 정류장'으로 영구 승격!
    // 이렇게 하면 추후 자동생성을 다시 돌려도 이 정류장은 절대 날아가지 않고 보존됩니다.
    currentEditItem.isManual = true; 
    currentEditMarker.isManualMarker = true; // 현재 떠있는 마커 객체에도 방어막 씌우기
    
    // 데이터 저장
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    
    // 화면 즉시 업데이트
    var busListHtml = checkedRoutes.length > 0 ? checkedRoutes.join("<br>") : "<span style='color:#EE0022; font-weight:bold;'>🚫 모든 노선 무정차 통과</span>";
    currentEditMarker.setTooltipContent(`<b>🚏 ${currentEditItem.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busListHtml}</div>`);
    
    var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${currentEditItem.name.replace(' 정류장','')}</div>`;
    currentEditMarker.setIcon(L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] }));
    
    closeModal('bus-stop-edit-modal');
}

function deleteEditBusStop() {
    if(confirm(`'${currentEditItem.name}'을(를) 삭제하시겠습니까?`)) {
        if (typeof busStopLayer !== 'undefined') busStopLayer.removeLayer(currentEditMarker);
        else map.removeLayer(currentEditMarker);
        
        activeMarkers = activeMarkers.filter(m => m !== currentEditMarker);
        myLandmarks = myLandmarks.filter(m => m.name !== currentEditItem.name || m.lat !== currentEditItem.lat);
        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        closeModal('bus-stop-edit-modal');
    }
}
// =========================================================
    // 6. 클릭 이벤트 및 그리기 로직 (거리 꼬리표 + 클릭시 상세 + 면적)
    // =========================================================
    var isDrawing = false; var drawPoints = []; var drawPolyline = null; var tempLine = null;
    var currentDrawMarkers = []; 
    var areaPoints = []; var areaPolygon = null; var tempAreaLine = null;
    
    var myLines = JSON.parse(localStorage.getItem('hyobin_lines')) || [];
    myLines.forEach(lineData => { addLineToMap(lineData); });

    function addLineToMap(lineData) {
        var lineColor = lineData.color || "red"; 
        var polyline = L.polyline(lineData.points, { color: lineColor, weight: 5, opacity: 0.8 }).addTo(map);
        
        var totalDist = 0;
        for(var i=0; i<lineData.points.length-1; i++) {
            totalDist += map.distance(lineData.points[i], lineData.points[i+1]);
        }
        polyline.bindTooltip(`${lineData.name} (총 ${Math.round(totalDist)}m)`, { sticky: true });

        polyline.distanceMarkers = [];
        polyline.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (polyline.distanceMarkers.length > 0) {
                polyline.distanceMarkers.forEach(m => map.removeLayer(m));
                polyline.distanceMarkers = [];
            } else {
                var currentTotal = 0;
                lineData.points.forEach((pt, idx) => {
                    if (idx > 0) {
                        currentTotal += map.distance(lineData.points[idx-1], pt);
                    }
                    var labelText = (idx === 0) ? "출발" : Math.round(currentTotal) + "m";
                    if (idx === lineData.points.length - 1) {
                        labelText = "🏁 " + Math.round(currentTotal) + "m";
                    }
                    var badgeIcon = L.divIcon({
                        className: 'distance-badge-wrap',
                        html: `<div class="dist-badge" style="border-color:${lineColor}; color:${lineColor}">${labelText}</div>`,
                        iconSize: null,
                        iconAnchor: [0, -5]
                    });
                    var marker = L.marker(pt, { icon: badgeIcon, interactive: false }).addTo(map);
                    polyline.distanceMarkers.push(marker);
                });
            }
        });

        polyline.on('contextmenu', function(e) {
            L.DomEvent.stopPropagation(e);
            if (confirm(`'${lineData.name}' 선을 삭제하시겠습니까?`)) {
                if (polyline.distanceMarkers.length > 0) {
                    polyline.distanceMarkers.forEach(m => map.removeLayer(m));
                }
                map.removeLayer(polyline);
                myLines = myLines.filter(l => l.name !== lineData.name);
                localStorage.setItem('hyobin_lines', JSON.stringify(myLines));
            }
        });
    }



    map.on('click', function(e) {
        if (typeof searchHighlightLayer !== 'undefined' && searchHighlightLayer) searchHighlightLayer.clearLayers();
        var resultBox = document.getElementById('search-result-list');
        if(resultBox) resultBox.style.display = 'none';
        // [NEW] 버스 정류장 추가 모드
        if (isBusStopMode) {
            handleBusStopClick(e);
            return;
        }
        // [선 그리기 모드]
        if (isDrawingMode) {
            var lat = Math.round(e.latlng.lat); 
            var lng = Math.round(e.latlng.lng);
            drawPoints.push([lat, lng]); 
            redrawLine();
            if (drawPoints.length > 0) {
                var totalDist = 0;
                for(var i=0; i<drawPoints.length-1; i++) totalDist += map.distance(drawPoints[i], drawPoints[i+1]);
                var labelText = (drawPoints.length === 1) ? "시작" : Math.round(totalDist) + "m";
                var distBadge = L.marker([lat, lng], {
                    icon: L.divIcon({ className: 'distance-label', html: `<div class="dist-badge">${labelText}</div>`, iconSize: null, iconAnchor: [0, -10] })
                }).addTo(map);
                currentDrawMarkers.push(distBadge);
            }
            return;
        }

        // [면적 측정 모드]
        if (isAreaMode) {
            var lat = Math.round(e.latlng.lat);
            var lng = Math.round(e.latlng.lng);
            areaPoints.push([lat, lng]);
            
            if (areaPolygon) map.removeLayer(areaPolygon);
            if (areaPoints.length > 0) {
                areaPolygon = L.polygon(areaPoints, { color: "#009900", fillColor: "#00FF00", fillOpacity: 0.3 }).addTo(map);
            }
            return;
        }

        // [NEW] 반경 측정 모드
        if (isRadiusMode) {
            if (!radiusCenter) {
                radiusCenter = e.latlng;
                tempRadiusCircle = L.circle(radiusCenter, { 
                    radius: 0, 
                    color: "#FF007F", 
                    fillColor: "#FF007F", 
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(map);
            } else {
                var dist = map.distance(radiusCenter, e.latlng);
                tempRadiusCircle.setRadius(dist);
                tempRadiusCircle.bindTooltip("반경: " + formatDistanceStr(dist), { 
                    permanent: true, 
                    direction: 'center', 
                    className: 'dist-tooltip' 
                }).openTooltip();

                tempRadiusCircle.on('dblclick', function(ev) {
                    L.DomEvent.stopPropagation(ev);
                    map.removeLayer(this);
                });

                radiusCenter = null; 
                tempRadiusCircle = null;
            }
            return;
        }

        if (isStationMode) {
            tempClickLatLng = { lat: Math.round(e.latlng.lat), lng: Math.round(e.latlng.lng) };
            openStationModal();
            return;
        }

        var lat = e.latlng.lat; var lng = e.latlng.lng;
        var foundGugun = null; var foundAdmin = null; var foundLegal = null;

        searchablePolygons.forEach(function(poly) {
            if (isPointInPolygon(lat, lng, poly.points)) {
                if (poly.type === 'gugun') foundGugun = poly.name;
                else if (poly.type === 'admin') foundAdmin = poly.name;
                else if (poly.type === 'legal') foundLegal = poly.name;
            }
        });

        if (!foundGugun && !foundAdmin && !foundLegal) { return; }

        var province = "효빈광역시";
        if (foundGugun === "선곡군" || foundGugun === "기도군" || foundGugun === "덕현군"|| foundGugun === "약산시"|| foundGugun === "낭원군"|| foundGugun === "치원군"|| foundGugun === "천주시") { province = "덕빈북도"; }
        if (foundGugun && (foundGugun.includes("천주시") || foundGugun.includes("약산시"))) { province = "덕빈북도"; }

        var fullAddress = province;
        if (foundGugun) fullAddress += " " + foundGugun;
        if (foundAdmin) fullAddress += " " + foundAdmin;
        if (foundLegal && foundLegal !== foundAdmin) {
            if (foundLegal.endsWith("리")) { fullAddress += " " + foundLegal; } 
            else { fullAddress += "(" + foundLegal + ")"; }
        }

        L.popup().setLatLng(e.latlng).setContent(`<div style="font-size:14px; text-align:center; padding:5px;">📍 <b>위치 정보</b><br><hr style="margin:6px 0; border:0; border-top:1px solid #ccc;">${fullAddress}</div>`).openOn(map);
    });

    map.on('mousemove', function(e) {
        if (isDrawingMode && drawPoints.length > 0) {
            var lastPoint = drawPoints[drawPoints.length - 1];
            if (tempLine) map.removeLayer(tempLine);
            var currentDist = map.distance(lastPoint, e.latlng);
            var totalDist = 0;
            for(var i=0; i<drawPoints.length-1; i++) totalDist += map.distance(drawPoints[i], drawPoints[i+1]);
            totalDist += currentDist;
            tempLine = L.polyline([lastPoint, e.latlng], { color: currentSelectedColor, dashArray: '5, 10', weight: 2 }).addTo(map);
            tempLine.bindTooltip("총 " + Math.round(totalDist) + "m", { permanent: true, direction: 'right', className: 'dist-tooltip' }).openTooltip(e.latlng);
        }
        
        if (isAreaMode && areaPoints.length > 0) {
            var lastPoint = areaPoints[areaPoints.length - 1];
            if (tempAreaLine) map.removeLayer(tempAreaLine);
            tempAreaLine = L.polyline([lastPoint, e.latlng], { color: "#009900", dashArray: '5, 5', weight: 2 }).addTo(map);
        }

        if (isRadiusMode && radiusCenter && tempRadiusCircle) {
            var dist = map.distance(radiusCenter, e.latlng);
            tempRadiusCircle.setRadius(dist);
            tempRadiusCircle.bindTooltip("반경: " + formatDistanceStr(dist), {direction: 'center', className:'dist-tooltip'}).openTooltip();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (isDrawingMode && drawPoints.length > 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
            drawPoints.pop(); redrawLine(); 
            if (tempLine) map.removeLayer(tempLine);
            if (currentDrawMarkers.length > 0) map.removeLayer(currentDrawMarkers.pop());
        }
        if (isAreaMode && areaPoints.length > 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
            areaPoints.pop(); 
            if (areaPolygon) map.removeLayer(areaPolygon);
            if (areaPoints.length > 0) {
                areaPolygon = L.polygon(areaPoints, { color: "#009900", fillColor: "#00FF00", fillOpacity: 0.3 }).addTo(map);
            }
        }
    });

    function redrawLine() {
        if (drawPolyline) map.removeLayer(drawPolyline);
        if (drawPoints.length > 0) {
            drawPolyline = L.polyline(drawPoints, { color: currentSelectedColor, weight: 5 }).addTo(map);
        } else { drawPolyline = null; }
    }

// =========================================================
    // 7. 마커 및 모달 처리 (+ 도로 시종점 행정구역, 자동 색상 지정 추가)
    // =========================================================
    var tempMarkerData = null;
    map.on('contextmenu', function(e) {
        
        // [수정됨] 도로 시종점 행정구역 표시 기능
        if (isDrawingMode) {
            if (drawPoints.length > 1) {
                var totalDistance = 0; 
                for(var i=0; i<drawPoints.length-1; i++) totalDistance += map.distance(drawPoints[i], drawPoints[i+1]);
                
                // ★ 경유하는 모든 행정구역 리스트 가져오기
                var passingDistricts = getPathDistricts(drawPoints);
                var startAddress = passingDistricts[0] || "미지정";
                var endAddress = passingDistricts[passingDistricts.length - 1] || "미지정";

                var promptMsg = `📏 총 거리: ${Math.round(totalDistance)}m\n`;
                promptMsg += `🚩 경유지: ${passingDistricts.join(" → ")}\n\n`;
                promptMsg += `이 도로를 저장하려면 이름을 입력하세요.`;

                var lineName = prompt(promptMsg, "");
                if (lineName) {
                    var newLine = { 
                        name: lineName, 
                        points: drawPoints, 
                        color: currentSelectedColor,
                        startAddr: startAddress,
                        endAddr: endAddress,
                        passing: passingDistricts // 경유지 정보도 데이터에 포함
                    };
                    myLines.push(newLine); 
                    localStorage.setItem('hyobin_lines', JSON.stringify(myLines));
                    addLineToMap(newLine); 
                    alert("도로 데이터가 저장되었습니다!");
                }
            }
            resetDrawMode(); 
            return;
        }

        if (isAreaMode) {
            if (areaPoints.length < 3) { alert("면적을 측정하려면 최소 3개의 점이 필요합니다."); return; }
            
            var areaSum = 0;
            for (var i = 0; i < areaPoints.length; i++) {
                var p1 = areaPoints[i];
                var p2 = areaPoints[(i + 1) % areaPoints.length];
                areaSum += (p1[1] * p2[0] - p2[1] * p1[0]); 
            }
            var finalArea = Math.abs(areaSum) / 2.0;
            var adjustedArea = finalArea * 1.395;
            var areaStr = formatArea(adjustedArea); 

            var areaId = Date.now();
            var areaObj = { id: areaId, points: areaPoints, area: finalArea }; 
            measuredAreas.push(areaObj);

            var center = L.polygon(areaPoints).getBounds().getCenter();
            var resultMarker = L.marker(center, {
                icon: L.divIcon({
                    className: 'area-result-wrap',
                    html: `<div class="area-result-badge">면적: ${areaStr}</div>`,
                    iconSize: null,
                    iconAnchor: [40, 15]
                })
            }).addTo(map);

            resultMarker.areaId = areaId; 

            resultMarker.on('dblclick', function() {
                map.removeLayer(resultMarker);
                map.removeLayer(areaPolygon);
                measuredAreas = measuredAreas.filter(a => a.id !== this.areaId); 
            });

            resultMarker.linkedPolygon = areaPolygon;
            resultMarker.on('dblclick', function(e) {
                map.removeLayer(this);
                if (this.linkedPolygon) map.removeLayer(this.linkedPolygon);
                measuredAreas = measuredAreas.filter(a => a.id !== this.areaId); 
            });

            areaPolygon = null; 
            resetAreaMode(); 
            return;
        }

        if (isRadiusMode) {
            if (tempRadiusCircle) map.removeLayer(tempRadiusCircle);
            tempRadiusCircle = null;
            radiusCenter = null;
            return;
        }
        // =========================================================
        // ★ [NEW] 일반 마커 생성 (행정구역 자동 탐색 & 색상 칠하기)
        // =========================================================
        var name = prompt("마커 이름:"); if (!name) return;
        
        var lat = Math.round(e.latlng.lat);
        var lng = Math.round(e.latlng.lng);

        // 1. 클릭한 위치의 행정구역(구/군) 찾기
        var foundGugun = null;
        searchablePolygons.forEach(function(poly) {
            if (isPointInPolygon(lat, lng, poly.points)) {
                if (poly.type === 'gugun') foundGugun = poly.name;
            }
        });

        // 2. 구/군 이름에 맞는 색상 찾기 (regionColors 배열 활용)
        var autoColor = null;
        if (foundGugun) {
            // 예: "선곡군" -> "선곡군(덕빈)" 도 유연하게 찾아냄
            var foundRc = regionColors.find(rc => rc.name.includes(foundGugun));
            if (foundRc) autoColor = foundRc.code;
        }

        // 3. 색상을 찾았으면 모달 없이 즉시 마커 생성!
        if (autoColor) {
            var item = { name: name, lat: lat, lng: lng, color: autoColor, type: 'normal' };
            addMarkerToMap(item); 
            myLandmarks.push(item); 
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
            
            // 팝업으로 자동 지정되었다고 1.5초간 살짝 알려주기
            L.popup({ autoClose: true, closeButton: false })
             .setLatLng([lat, lng])
             .setContent(`<div style="font-size:12px; font-weight:bold; color:${autoColor};">✨ ${foundGugun} 색상 자동 적용!</div>`)
             .openOn(map);
             
            setTimeout(() => map.closePopup(), 1500); 
            
        } else {
            // 허허벌판(바다 등)을 클릭해서 구역을 못 찾았을 때만 예전처럼 수동 모달 띄우기
            tempMarkerData = { name: name, lat: lat, lng: lng };
            openColorModal();
        }
    });

    function openColorModal() {
        var modal = document.getElementById('color-modal'); var container = document.getElementById('modal-color-buttons'); container.innerHTML = "";
        regionColors.forEach(function(rc) {
            var btn = document.createElement('div'); btn.className = 'color-btn'; btn.style.backgroundColor = rc.code; btn.innerHTML = rc.name; 
            btn.onclick = function() { selectMarkerColor(rc.code); }; container.appendChild(btn);
        });
        modal.style.display = 'flex';
    }
    
    function selectMarkerColor(color) {
        if (tempMarkerData) {
            var item = { name: tempMarkerData.name, lat: tempMarkerData.lat, lng: tempMarkerData.lng, color: color, type: 'normal' };
            addMarkerToMap(item); myLandmarks.push(item); localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        } closeModal('color-modal');
    }

    function openStationModal() {
        document.getElementById('station-name-input').value = "";
        var checkboxes = document.querySelectorAll('input[name="stationLine"]');
        checkboxes.forEach(cb => cb.checked = false);
        document.getElementById('station-modal').style.display = 'flex';
    }

    function confirmAddStation() {
        var name = document.getElementById('station-name-input').value.trim();
        if (!name) { alert("역 이름을 입력하세요."); return; }

        if (!name.endsWith('역')) name += '역';

        var checkedBoxes = document.querySelectorAll('input[name="stationLine"]:checked');
        if (checkedBoxes.length === 0) { alert("최소 1개 이상의 노선을 선택하세요."); return; }
        var selectedLines = [];
        checkedBoxes.forEach(function(cb) { selectedLines.push(cb.value); });
        var stationData = { name: name, lat: tempClickLatLng.lat, lng: tempClickLatLng.lng, type: 'subway', lines: selectedLines };
        addMarkerToMap(stationData); myLandmarks.push(stationData); localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        closeModal('station-modal'); toggleStationMode(); 
    }

    function closeModal(id) { document.getElementById(id).style.display = 'none'; tempMarkerData = null; tempClickLatLng = null; }    // =========================================================
    // 8. 검색, 파일관리, 노선도 모드
    // =========================================================
    var searchHighlightLayer = null;



    var isSubwayMode = false;
    var savedLayerState = [];

    map.on('overlayadd', function() { if(isDistrictAreaMode) updateDistrictAreaLabels(); });
    map.on('overlayremove', function() { if(isDistrictAreaMode) updateDistrictAreaLabels(); });

// =========================================================
// 1. 편의점 레이어 선언
// =========================================================
// 1. 편의점 레이어 선언 (클러스터링 적용!)
var cvsLayer = L.markerClusterGroup({
    // 지도를 일정 수준(예: 14) 이상 확대하면 뭉쳐있던 마커들이 개별로 쫙 펼쳐집니다.
    disableClusteringAtZoom: 14, 
    maxClusterRadius: 80 // 마커들이 뭉치는 반경 (픽셀 단위, 조절 가능)
});
// =========================================================
// 2. 우측 상단 레이어 컨트롤 메뉴
// =========================================================
var overlays = { 
    "🏙️ 구/군 (상위)": guGunLayer,
    "🏢 행정 읍/면/동": adminLayer,
    "촘촘 법정 동/리": legalLayer,
    "🏗️ 개발지구": devLayer,
    "🚌 버스 노선": busLineLayer,
    "🚏 버스 정류장": busStopLayer,
    "🛤️ 도시/일반철도 노선": subwayLineLayer,
    "🚉 도시/일반철도 역": subwayStationLayer,
    "📍 일반 마커": normalMarkerLayer,
    "🏪 편의점": cvsLayer,
    "📏 2000x1500 그리드": gridLayer,        
    "🛣️ 주요 도로망": roadLayer
};

// 1. collapsed를 false로 두고 컨트롤을 생성한 뒤 변수에 저장합니다.
var layerControl = L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// 2. 레이어 컨트롤의 HTML 컨테이너를 가져옵니다.
var container = layerControl.getContainer();

// 3. 접기/펼치기 버튼 요소를 직접 생성합니다.
var toggleBtn = document.createElement('button');
toggleBtn.innerHTML = '접기 🔼'; // 초기 텍스트
toggleBtn.style.width = '100%';
toggleBtn.style.marginTop = '10px';
toggleBtn.style.padding = '5px 0';
toggleBtn.style.cursor = 'pointer';
toggleBtn.style.border = '1px solid #ccc';
toggleBtn.style.backgroundColor = '#f8f9fa';
toggleBtn.style.borderRadius = '4px';
toggleBtn.style.fontWeight = 'bold';

// 4. 버튼 클릭 시 목록을 숨기거나 보여주는 로직 (수정됨)
var isCollapsed = false;
toggleBtn.onclick = function(e) {
    e.stopPropagation(); // 버튼 클릭 시 지도가 클릭되는 것을 방지
    e.preventDefault();

    // 🚨 수정된 부분: form 대신 Leaflet 공식 클래스명을 찾습니다.
    var listContainer = container.querySelector('.leaflet-control-layers-list'); 

    if (listContainer) { // 요소를 무사히 찾았다면 실행
        if (isCollapsed) {
            listContainer.style.display = 'block'; // 펼치기
            toggleBtn.innerHTML = '접기 🔼';
            isCollapsed = false;
        } else {
            listContainer.style.display = 'none'; // 접기
            toggleBtn.innerHTML = '펼치기 🔽';
            isCollapsed = true;
        }
    } else {
        console.error("레이어 목록을 찾을 수 없습니다. HTML 구조를 확인해주세요.");
    }
};

// 5. 레이어 컨트롤 컨테이너 맨 아래에 만든 버튼을 추가합니다.
container.appendChild(toggleBtn);


// 1. 로고들을 담아둘 전용 바구니(레이어) 생성
// =========================================================
// 🚇 지하철 종점(Terminal) 링형 로고 (레이어 박스 완벽 연동판)
// =========================================================

// 1. 로고들을 담아둘 전용 바구니(레이어) 생성
var terminalLogoLayer = L.layerGroup(); 

// ★ 파라미터에 lineKey 추가!
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
    
    // ★ 핵심: 마커 객체에 이 로고가 무슨 노선인지 이름표(ID)를 딱 붙여줍니다!
    marker.lineCode = lineKey; 
    
    terminalLogoLayer.addLayer(marker);
}

// 지도 로딩 및 선 그리기가 완전히 끝난 후 안전하게 실행 (1.5초 대기)
setTimeout(function() {
    terminalLogoLayer.clearLayers(); 

    // [헬퍼 함수] 다중 선분 데이터 껍질 벗기기
    function getFlatPoints(arr) {
        if (arr.length > 0 && Array.isArray(arr[0])) return getFlatPoints(arr[0]);
        return arr;
    }

    subwayLineLayer.eachLayer(function(poly) {
        var latlngs = poly.getLatLngs();
        var flatPoints = getFlatPoints(latlngs);
        
        // 점이 2개 이상이어야 노선의 '방향'을 계산할 수 있음
        if (!flatPoints || flatPoints.length < 2) return;

        var p0 = flatPoints[0]; // 시작 역
        var p1 = flatPoints[1]; // 시작 역 다음 역
        var pN = flatPoints[flatPoints.length - 1]; // 종착 역
        var pN_1 = flatPoints[flatPoints.length - 2]; // 종착 역 이전 역

        // =========================================================
        // ★ 핵심: 선이 뻗어나가는 방향을 계산해서 로고를 바깥으로 밀어냅니다!
        // =========================================================
        var offsetDist = 40; // 📏 밀어낼 거리 (로고가 너무 멀면 30으로, 글자랑 여전히 겹치면 50으로 조절하세요!)

        // 1. 시작점 벡터 (p1 -> p0 방향으로 선 밖으로 밀어내기)
        var dxStart = p0.lng - p1.lng;
        var dyStart = p0.lat - p1.lat;
        var lenStart = Math.sqrt(dxStart*dxStart + dyStart*dyStart) || 1;
        var offsetStartLat = p0.lat + (dyStart / lenStart) * offsetDist;
        var offsetStartLng = p0.lng + (dxStart / lenStart) * offsetDist;

        // 2. 종착점 벡터 (pN_1 -> pN 방향으로 선 밖으로 밀어내기)
        var dxEnd = pN.lng - pN_1.lng;
        var dyEnd = pN.lat - pN_1.lat;
        var lenEnd = Math.sqrt(dxEnd*dxEnd + dyEnd*dyEnd) || 1;
        var offsetEndLat = pN.lat + (dyEnd / lenEnd) * offsetDist;
        var offsetEndLng = pN.lng + (dxEnd / lenEnd) * offsetDist;

        // 노선 정보 추출
        var lineName = poly.getTooltip() ? poly.getTooltip().getContent() : "";
        var lineKey = poly.lineCode; 
        var color = poly.options.color || "#333";

        var text = "";
        if (lineName.includes("효빈대A선")) text = "A"; 
        else if (lineName.includes("효빈대 B선")) text = "B"; 
        else if (lineName.includes("빈효선")) text = "빈"; 
        else if (lineName.includes("호선")) text = lineName.replace(/[^0-9]/g, ""); 
        else text = lineName.charAt(0) || "역"; 

        // 원래 좌표(p0, pN) 대신 '밀어낸 새 좌표'로 로고 그리기
        drawTerminalLogo(offsetStartLat, offsetStartLng, text, color, lineKey);
        drawTerminalLogo(offsetEndLat, offsetEndLng, text, color, lineKey);
    });
    
    console.log("✅ 지하철 종점 로고 방향 벡터 보정 완료 (역 마커와 겹침 완벽 해결)!");

    // 2. 사이드바의 '노선도 모드 전환' 버튼 클릭 시 연동
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
        // 켜져 있으면 바로 표시
        if (modeBtn.classList.contains('active-btn')) map.addLayer(terminalLogoLayer);
    }

// 3. 우측 상단 '레이어 선택 박스' 조작 시 연동
    map.on('overlayadd', function(e) {
        // '노선' 조건을 빼고 '철도'나 '지하철'일 때만 작동하도록 수정
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
// =========================================================
// 🎯 가상 '내 위치' 기능 (카카오맵 스타일 파란 물결)
// =========================================================
var myLocationMarker = null;

// =========================================================
// 🗺️ 실시간 현재 행정구역 표시 (틈새/겹침 완벽 보정 자석 알고리즘!)
// =========================================================

// 3. 주소창 업데이트 메인 함수
function updateCurrentAddressPanel() {
    var center = map.getCenter();
    var lat = center.lat;
    var lng = center.lng;

    var matchedGugun = [], matchedAdmin = [], matchedLegal = [];

    if (typeof searchablePolygons !== 'undefined') {
        // 1단계: 정확히 일치하는 폴리곤 모두 찾기 (겹침 Overlap 허용)
        searchablePolygons.forEach(function(poly) {
            if (isPointInPolygon(lat, lng, poly.points)) {
                if (poly.type === 'gugun') matchedGugun.push(poly);
                else if (poly.type === 'admin') matchedAdmin.push(poly);
                else if (poly.type === 'legal') matchedLegal.push(poly);
            }
        });

        // 겹침 해결: 여러 개가 겹쳐있으면 가장 마지막에 그려진(가장 상단) 구역을 선택!
        var foundGugun = matchedGugun.length > 0 ? matchedGugun[matchedGugun.length - 1].name : "";
        var foundAdmin = matchedAdmin.length > 0 ? matchedAdmin[matchedAdmin.length - 1].name : "";
        var foundLegal = matchedLegal.length > 0 ? matchedLegal[matchedLegal.length - 1].name : "";

        // ==========================================
        // ★ [핵심] 2단계: 빈 공간(Gap) 자석 보정 로직 ★
        // ==========================================
        var GAP_TOLERANCE = 800; // 자석의 힘! (단위: 픽셀/좌표값). 틈새가 너무 넓으면 수치를 더 키우세요.

        function findNearest(type) {
            var minDist = Infinity;
            var nearestName = "";
            searchablePolygons.forEach(function(poly) {
                if (poly.type === type) {
                    var dist = getDistanceToPolygon(lat, lng, poly.points);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestName = poly.name;
                    }
                }
            });
            // 틈새가 허용 오차(GAP_TOLERANCE) 안쪽이면 자석처럼 이름을 찰싹 붙여줌!
            return (minDist < GAP_TOLERANCE) ? nearestName : "";
        }

        // 만약 해당 계층의 주소를 못 찾았다면 근처에서 가장 가까운 구역을 땡겨옴
        if (!foundGugun) foundGugun = findNearest('gugun');
        if (!foundAdmin) foundAdmin = findNearest('admin');
        if (!foundLegal) foundLegal = findNearest('legal');

        // ==========================================

        // 3개 다 못 찾았으면(진짜 바다 한가운데 등) 관할 외 지역
        if (!foundGugun && !foundAdmin && !foundLegal) { 
            var addrText = document.getElementById('current-address-text');
            if (addrText) addrText.innerText = "효빈광역시 (관할 외 지역)";
            return; 
        }

        // 도/광역시 판별 로직
        var province = "효빈광역시";
        if (foundGugun && foundGugun.match(/(선곡군|기도군|덕현군|약산시|낭원군|치원군|천주시)/)) { 
            province = "덕빈북도"; 
        }

        // 풀네임 조립 (카카오맵 스타일 꺾쇠)
        var fullAddress = province;
        var arrow = " <span style='color:#999; margin:0 4px; font-weight:normal;'>></span> ";

        if (foundGugun) fullAddress += arrow + foundGugun;
        if (foundAdmin) fullAddress += arrow + foundAdmin;
        
        if (foundLegal && foundLegal !== foundAdmin) {
            if (foundLegal.endsWith("리")) { 
                fullAddress += arrow + foundLegal; 
            } else { 
                fullAddress += " <span style='color:#666; font-size:0.9em;'>(" + foundLegal + ")</span>"; 
            }
        }

        var addrText = document.getElementById('current-address-text');
        if (addrText) addrText.innerHTML = fullAddress;
    }
}

// 지도를 드래그해서 움직임이 끝날 때마다 주소창 업데이트!
map.on('moveend', updateCurrentAddressPanel);
setTimeout(updateCurrentAddressPanel, 1000);
// =========================================================
// ★ 버스 노선 & 정류장 클릭 하이라이트 기능
// =========================================================
var currentHighlightedBus = null; // 현재 강조된 버스 기억용

// 1. 지도 빈 곳을 클릭하면 하이라이트 해제
map.on('click', function() {
    if (currentHighlightedBus) resetBusHighlight();
});

// 시설 이름(name)의 키워드를 분석하여 type을 자동 할당하는 함수
// =========================================================
// ★ [안전 방어형] 시설 이름 자동 분류 로직
// =========================================================
if (typeof defaultLandmarksData !== 'undefined' && Array.isArray(defaultLandmarksData)) {
    defaultLandmarksData.forEach(function(marker) {
        if (!marker || !marker.name) return; // 데이터가 비어있으면 안전하게 스킵
        var name = marker.name;

        // 1. 학교 및 교육기관
        if (name.match(/(초|중|고|대학교|대학원|과기원|학교|유치원)$/) || name.includes("사대부") || name.includes("캠퍼스")) {
            marker.type = "school";
        }
        // 2. 아파트 및 주거시설
        else if (name.match(/(아파트|주공|자이|푸르지오|더샵|래미안|아이파크|휴먼시아|센트럴|스타힐스|대라수|리버시티)/)) {
            marker.type = "apartment";
        }
        // 3. 공공기관 및 관공서
        else if (name.match(/(시청|구청|군청|주민센터|동사무소|읍사무소|면사무소|출장소|경찰서|소방서|우체국|법원|보건소|교육청|세무서|공단|공사|본부|지사|센터)/)) {
            marker.type = "office";
        }
        // 4. 상업 및 쇼핑 시설
        else if (name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|아울렛|시장|상가|애니메이트|애니플러스샵|다이소|코스트코|빈스마트|마루마트|하나로마트)/)) {
            marker.type = "commercial";
        }
        // 5. 교통 시설
        else if (name.match(/(역|버스터미널|정류장|공항|항|여객터미널|차량사업소|IC|선착장)$/)) {
            marker.type = "station";
        }
        // 6. 식당, 카페, 프랜차이즈
        else if (name.match(/(맥도날드|버거킹|KFC|스타벅스|뚜레쥬르|파리바게뜨|쿠우쿠우|아웃백|DT)/)) {
            marker.type = "restaurant";
        }
        // 7. 문화 및 여가 시설
        else if (name.match(/(도서관|미술관|박물관|메가박스|CGV|롯데시네마|회관|예술의전당|호텔|스테이)/)) {
            marker.type = "culture";
        }
        // 8. 병원 및 의료시설
        else if (name.match(/(병원|의료원|치과|보건진료소)/)) {
            marker.type = "hospital";
        }
        // 9. 산업 및 공장
        else if (name.match(/(공장|산단|공단|조선소|발전소|공업사)/)) {
            marker.type = "factory";
        }
        // 10. 공원 및 자연
        else if (name.match(/(공원|해수욕장|저수지|유적지|목장)/) || name.endsWith("산") || name.endsWith("호")) {
            marker.type = "park";
        }
    });
}

// 플레이스 정보 수정 모달을 동적으로 띄우는 함수
function openPlaceEditModal(name, lat, lng, cardId) {
    var newImg = prompt("📸 등록할 이미지의 웹 주소(URL)를 입력하세요:\n(예: 인터넷 이미지 주소 복사 붙여넣기)", "");
    if (newImg === null) return; // 취소 누르면 중단
    
    var newPhone = prompt("📞 전화번호를 입력하세요:", "");
    if (newPhone === null) return;
    
    var newDesc = prompt("📝 상세 설명이나 메모를 입력하세요:", "");
    if (newDesc === null) return;

    // 1. myLandmarks(사용자 마커) 배열에서 해당 마커 찾아서 데이터 업데이트
    if (typeof myLandmarks !== 'undefined') {
        var target = myLandmarks.find(m => m.name === name && m.lat === lat);
        if (target) {
            if (newImg) target.image = newImg;
            if (newPhone) target.phone = newPhone;
            if (newDesc) target.desc = newDesc;
            
            // localStorage 영구 저장
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
            alert("✨ 정보가 성공적으로 반영되었습니다! 마커를 다시 클릭해 확인해보세요.");
            map.closePopup();
            return;
        }
    }
    
    // 만약 기본 데이터(defaultLandmarksData)에 있는 마커라면 사용자 커스텀 저장소로 복사해서 저장
    var baseItem = (typeof defaultLandmarksData !== 'undefined') ? defaultLandmarksData.find(m => m.name === name) : null;
    var newItem = {
        name: name,
        lat: lat,
        lng: baseItem ? baseItem.lng : lng,
        type: baseItem ? baseItem.type : 'normal',
        color: baseItem ? baseItem.color : '#333333',
        image: newImg,
        phone: newPhone,
        desc: newDesc
    };
    
    if (typeof myLandmarks !== 'undefined') {
        myLandmarks.push(newItem);
        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        alert("✨ 새로운 정보가 저장되었습니다! 마커를 다시 클릭해 확인해보세요.");
        map.closePopup();
    }
}
// =========================================================
// ★ 실제 플레이스 정보 수정 모달 핸들러 함수
// =========================================================
function openRealPlaceEditModal(name, lat, lng, cardId) {
    var newPhone = prompt("📞 수정할 연락처를 입력하세요:", "");
    if (newPhone === null) return; // 취소 누르면 중단

    var newDesc = prompt("💬 수정할 상세 설명을 입력하세요:", "");
    if (newDesc === null) return;

    var newImage = prompt("🖼️ 이미지 파일명을 입력하세요 (예: 이미지/단어이름.webp):", "이미지/");
    if (newImage === null) return;

    // 마커 데이터 찾아서 업데이트 (myLandmarks 또는 기본 데이터 배열 연동)
    var target = myLandmarks.find(m => m.name === name && m.lat === lat && m.lng === lng);
    if (!target) {
        // 기본 데이터에 있는 거라면 myLandmarks에 새로 복사해서 추가
        target = { name: name, lat: lat, lng: lng, type: 'normal' };
        myLandmarks.push(target);
    }

    if (newPhone.trim() !== "") target.phone = newPhone.trim();
    if (newDesc.trim() !== "") target.desc = newDesc.trim();
    if (newImage.trim() !== "이미지/" && newImage.trim() !== "") target.image = newImage.trim();

    // 로컬스토리지 영구 저장
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));

    // 화면(팝업 카드) 즉시 반영
    if (newPhone.trim() !== "") {
        var pElem = document.getElementById(`span-phone-${cardId}`);
        if (pElem) pElem.innerText = target.phone;
    }
    if (newDesc.trim() !== "") {
        var dElem = document.getElementById(`span-desc-${cardId}`);
        if (dElem) dElem.innerText = target.desc;
    }

    alert("✨ 정보가 성공적으로 수정 및 저장되었습니다!");
}