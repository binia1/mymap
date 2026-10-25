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
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 47, null],
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