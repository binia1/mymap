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
    // 검색 영역 하이라이트용 변수
var searchHighlightPoly = null; 
// 검색 하이라이트 레이어 및 결과 저장용 변수
    var searchHighlightLayer = null;
    var currentSearchResults = { markers: [], polys: [] };

    // 전체 주소 반환 함수
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
        return fullAddress;
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
        "8": { name: "8호선", color: "#9856FF" },
        "B": { name: "빈효선", color: "#6677CC" },
        // 일반철도 (모두 같은 코레일 블루색 적용)
        "R1": { name: "빈효선(일반)", color: "#3152A5" },
        "R2": { name: "효빈공단인입선", color: "#3152A5" },
        "R3": { name: "강빈선", color: "#3152A5" },
        "R4": { name: "수포현대선", color: "#3152A5" },
        "R5": { name: "청선인자선", color: "#3152A5" },
        "R6": { name: "효빈항선", color: "#3152A5" },
        "R7": { name: "포장공단선", color: "#3152A5" },
        // 고속철도
        "H1": { name: "빈효고속선", color: "#1D2352" }
    };

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

    // 노선 필터 목록 생성
    var filterContainer = document.getElementById('subway-filter-list');
    for (const [key, val] of Object.entries(subwayLines)) {
        var label = document.createElement('label'); label.className = 'line-checkbox-label';
        var checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = key; checkbox.name = 'stationLine';
        var colorBox = document.createElement('div'); colorBox.className = 'line-color-box'; colorBox.style.backgroundColor = val.color;
        label.appendChild(checkbox); label.appendChild(colorBox); label.appendChild(document.createTextNode(val.name));
        document.getElementById('station-lines-container').appendChild(label);

        var filterItem = document.createElement('label'); filterItem.className = 'filter-item';
        var fChk = document.createElement('input'); fChk.type = 'checkbox'; fChk.value = key; fChk.checked = true; fChk.name = 'subwayFilter';
        fChk.onchange = applySubwayFilter; 
        var fDot = document.createElement('div'); fDot.className = 'filter-color-dot'; fDot.style.backgroundColor = val.color;
        filterItem.appendChild(fChk); filterItem.appendChild(fDot); filterItem.appendChild(document.createTextNode(val.name));
        filterContainer.appendChild(filterItem);
    }

    function togglePaletteList() {
        var list = document.getElementById('palette-list');
        var icon = document.getElementById('toggle-icon');
        if (list.style.display === 'block') { list.style.display = 'none'; icon.innerText = '▼'; } 
        else { list.style.display = 'block'; icon.innerText = '▲'; }
    }

    function selectSubwayLine(val) {
        if (!val) return;
        var line = subwayLines[val];
        currentSelectedColor = line.color;
        updateHeaderPreview(line.color);
        
        isStationMode = false;
        isAreaMode = false;
        isRadiusMode = false;
        document.getElementById('station-btn').classList.remove('active-btn');
        document.getElementById('area-btn').classList.remove('active-btn');
        document.getElementById('radius-btn').classList.remove('active-btn');
        document.getElementById('map').style.cursor = "default";

        if (!isDrawingMode) toggleDrawMode();
        alert(`${line.name} 선택됨! 지도를 클릭해서 노선을 그리세요.`);
    }

    function toggleDrawMode() {
        isStationMode = false; isAreaMode = false; isRadiusMode = false;
        document.getElementById('station-btn').classList.remove('active-btn');
        document.getElementById('area-btn').classList.remove('active-btn');
        document.getElementById('radius-btn').classList.remove('active-btn');

        isDrawingMode = !isDrawingMode; 
        var btn = document.getElementById("draw-btn");
        if (isDrawingMode) {
            btn.classList.add("active-btn"); 
            btn.innerHTML = "✏️ 그리는 중... (우클릭 종료)";
            document.getElementById("map").style.cursor = "crosshair"; 
            drawPoints = [];
            currentDrawMarkers = [];
        } else { 
            resetDrawMode(); 
        }
    }

    function toggleAreaMode() {
        isDrawingMode = false; isStationMode = false; isRadiusMode = false;
        document.getElementById('draw-btn').classList.remove('active-btn');
        document.getElementById('station-btn').classList.remove('active-btn');
        document.getElementById('radius-btn').classList.remove('active-btn');
        resetDrawMode(); 

        isAreaMode = !isAreaMode;
        var btn = document.getElementById("area-btn");
        if (isAreaMode) {
            btn.classList.add("active-btn");
            btn.innerHTML = "📐 찍는 중... (우클릭 완료)";
            document.getElementById("map").style.cursor = "cell";
            areaPoints = [];
        } else {
            resetAreaMode();
        }
    }

    function toggleRadiusMode() {
        isDrawingMode = false; isStationMode = false; isAreaMode = false;
        document.getElementById('draw-btn').classList.remove('active-btn');
        document.getElementById('station-btn').classList.remove('active-btn');
        document.getElementById('area-btn').classList.remove('active-btn');
        resetDrawMode(); resetAreaMode();

        isRadiusMode = !isRadiusMode;
        var btn = document.getElementById("radius-btn");
        if (isRadiusMode) {
            btn.classList.add("active-btn");
            btn.innerHTML = "⭕ 중심점 클릭";
            document.getElementById("map").style.cursor = "crosshair";
            radiusCenter = null;
            tempRadiusCircle = null;
        } else {
            btn.classList.remove("active-btn");
            btn.innerHTML = "⭕ 반경 측정";
            document.getElementById("map").style.cursor = "default";
            if (tempRadiusCircle) map.removeLayer(tempRadiusCircle);
            tempRadiusCircle = null;
            radiusCenter = null;
        }
    }

    function toggleUnit() {
        useKmUnit = !useKmUnit;
        var btn = document.getElementById('unit-btn');
        btn.innerHTML = useKmUnit ? "🔄 단위: km²" : "🔄 단위: m²";
        if (isDistrictAreaMode) {
            updateDistrictAreaLabels();
        }
    }

// [수정됨] 이름 확인 + 위치 자동 감지 로직 (중구 1.1배, 나머지 1.395배)
    function getWeightedArea(points, name) {
        var rawArea = calculatePolygonArea(points);
        
        // 1. 이름에 '중구'가 직접 들어간 경우 (예: "중구", "중구청") -> 1.1배
        if (name && name.indexOf("중구") !== -1) {
            return rawArea * 1.05; 
        }

        // 2. [핵심 기능] 이름에 중구가 없어도, 위치가 '중구' 땅 안이면 1.05배 적용
        // 전체 구역 목록에서 '중구'라는 구(gugun) 폴리곤을 찾음
        var jungGuPoly = searchablePolygons.find(p => p.name === "중구" && p.type === 'gugun');
        
        if (jungGuPoly) {
            // 현재 측정하려는 구역의 중심점(Center)을 구함
            var bounds = L.polygon(points).getBounds();
            var center = bounds.getCenter();

            // 중심점이 '중구' 폴리곤 안에 들어있다면 -> 중구 소속으로 판정
            if (isPointInPolygon(center.lat, center.lng, jungGuPoly.points)) {
                return rawArea * 1.05;
            }
        }

        // 3. 이름도 중구가 아니고, 위치도 중구 밖이면 -> 1.395배
        return rawArea * 1.395;
    }
    // 포맷팅 (보정된 area 값을 받아서 표시)
    function formatArea(area) {
        if (useKmUnit) {
            return (area / 1000000).toFixed(2) + "km²";
        } else {
            return Math.round(area).toLocaleString() + "m²";
        }
    }

    function formatDistanceStr(dist) {
        if (dist >= 1000) {
            return (dist / 1000).toFixed(2) + "km";
        }
        return Math.round(dist) + "m";
    }
    
    // =========================================================
    // ★ [NEW] 모든 데이터(행정구역 + 측정) CSV 다운로드
    // =========================================================
    function downloadAllDataCSV() {
        if (measuredAreas.length === 0 && searchablePolygons.length === 0) {
            alert("저장할 데이터가 없습니다.");
            return;
        }

        // BOM 추가 (엑셀 한글 깨짐 방지)
        var csvContent = "\uFEFF";
        csvContent += "구분,이름/ID,면적(m²),면적(km²),비고\n";

        // 1. 행정구역 데이터
        searchablePolygons.forEach(function(poly) {
            var area = getWeightedArea(poly.points, poly.name); // 1.395배 적용 확인
            var m2 = Math.round(area);
            var km2 = (area / 1000000).toFixed(4);
            var typeName = (poly.type === 'gugun') ? "구/군" : 
                           (poly.type === 'admin') ? "행정동" :
                           (poly.type === 'legal') ? "법정동" : "기타";
            
            csvContent += `${typeName},${poly.name},${m2},${km2},행정구역 데이터\n`;
        });

        // 2. 직접 측정한 데이터
        measuredAreas.forEach(function(item, index) {
            // 직접 측정도 1.395배 적용 (중구가 아니라고 가정)
            var area = item.area * 1.395; 
            var m2 = Math.round(area);
            var km2 = (area / 1000000).toFixed(4);
            var time = new Date(item.id).toLocaleTimeString();
            csvContent += `직접측정,측정영역 ${index + 1},${m2},${km2},${time}\n`;
        });

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "hyobin_area_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =========================================================
    // 구역별 면적 자동 계산 (레이어 연동)
    // =========================================================
    var districtAreaLabels = [];

    function toggleDistrictArea() {
        var btn = document.getElementById('auto-area-btn');
        isDistrictAreaMode = !isDistrictAreaMode;

        if (isDistrictAreaMode) {
            btn.classList.add('active-btn');
            updateDistrictAreaLabels();
            alert("켜진 레이어(행정동/법정동 등)의 면적만 표시합니다.");
        } else {
            btn.classList.remove('active-btn');
            clearDistrictAreaLabels();
        }
    }

    function clearDistrictAreaLabels() {
        districtAreaLabels.forEach(lbl => map.removeLayer(lbl));
        districtAreaLabels = [];
    }

    function updateDistrictAreaLabels() {
        clearDistrictAreaLabels();
        if (!isDistrictAreaMode) return;

        var showGugun = map.hasLayer(guGunLayer);
        var showAdmin = map.hasLayer(adminLayer);
        var showLegal = map.hasLayer(legalLayer);
        var showDev   = map.hasLayer(devLayer);

        if (!showGugun && !showAdmin && !showLegal && !showDev) return;

        searchablePolygons.forEach(function(poly) {
            var isVisible = false;
            if (poly.type === 'gugun' && showGugun) isVisible = true;
            else if (poly.type === 'admin' && showAdmin) isVisible = true;
            else if (poly.type === 'legal' && showLegal) isVisible = true;
            else if (poly.type === 'dev' && showDev) isVisible = true;

            if (isVisible) {
                // [NEW] 보정된 면적 함수 사용
                var area = getWeightedArea(poly.points, poly.name);
                var areaStr = formatArea(area);
                var center = L.polygon(poly.points).getBounds().getCenter();

                var label = L.marker(center, {
                    icon: L.divIcon({
                        className: 'area-info-wrap',
                        html: `<div class="area-info-badge">${areaStr}</div>`,
                        iconSize: null,
                        iconAnchor: [15, 0] 
                    }),
                    interactive: false
                }).addTo(map);

                districtAreaLabels.push(label);
            }
        });
    }

    // 기본 면적 계산 (신발끈 공식)
    function calculatePolygonArea(points) {
        var areaSum = 0;
        for (var i = 0; i < points.length; i++) {
            var p1 = points[i];
            var p2 = points[(i + 1) % points.length];
            var areaSum = areaSum + (p1[1] * p2[0] - p2[1] * p1[0]);
        }
        return Math.abs(areaSum) / 2.0;
    }


    // =========================================================
    // 역간 거리 자동 계산 및 표시
    // =========================================================
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
                alert("지하철 데이터가 없습니다.");
                isAutoDistMode = false;
                btn.classList.remove('active-btn');
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
            var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name);
            if (!lineKey) {
                lineKey = Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
            }
            if (!lineKey) return; 

            var lineStations = stations.filter(s => s.lines.includes(lineKey));
            if (lineStations.length < 2) return;

            var linePoints = line.points.map(p => [p[0] + adjustY, p[1]]);

            lineStations.forEach(st => {
                st._lineIndex = findClosestPointIndex([st.lat, st.lng], linePoints);
            });

            lineStations.sort((a, b) => a._lineIndex - b._lineIndex);

            for (var i = 0; i < lineStations.length - 1; i++) {
                var st1 = lineStations[i];
                var st2 = lineStations[i+1];
                
                var dist = calculatePathDistance(linePoints, st1._lineIndex, st2._lineIndex);
                
                if (dist > 0) {
                    var distStr = (dist >= 1000) ? (dist/1000).toFixed(1) + "km" : Math.round(dist) + "m";
                    var midIdx = Math.floor((st1._lineIndex + st2._lineIndex) / 2);
                    var midPoint = linePoints[midIdx];

                    var label = L.marker(midPoint, {
                        icon: L.divIcon({
                            className: 'auto-dist-wrap',
                            html: `<div class="auto-dist-badge" style="border-color:${line.color};">${distStr}</div>`,
                            iconSize: null,
                            iconAnchor: [15, 0]
                        }),
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
        var minDest = Infinity;
        var index = -1;
        for (var i = 0; i < points.length; i++) {
            var d = map.distance(latlng, points[i]);
            if (d < minDest) {
                minDest = d;
                index = i;
            }
        }
        return index;
    }

    function calculatePathDistance(points, idx1, idx2) {
        var dist = 0;
        var start = Math.min(idx1, idx2);
        var end = Math.max(idx1, idx2);
        for(var i=start; i<end; i++) {
            dist += map.distance(points[i], points[i+1]);
        }
        return dist;
    }


    function toggleStationMode() {
        resetDrawMode(); resetAreaMode(); isRadiusMode = false;
        document.getElementById('radius-btn').classList.remove('active-btn');
        isStationMode = !isStationMode;
        var btn = document.getElementById("station-btn");
        if (isStationMode) {
            btn.classList.add("active-btn");
            btn.innerHTML = "🚉 역 위치 클릭";
            document.getElementById("map").style.cursor = "pointer";
        } else {
            btn.classList.remove("active-btn");
            btn.innerHTML = "🚉 역 추가";
            document.getElementById("map").style.cursor = "default";
        }
    }

    function resetDrawMode() {
        isDrawingMode = false;
        var btn = document.getElementById("draw-btn");
        btn.classList.remove("active-btn"); 
        btn.innerHTML = "📏 선 그리기";
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
        btn.innerHTML = "📐 면적 측정";
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
        [null, null, null, 7, 7, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 45, null],
        [null, null, null, 7, 7, null, null, null, null, null, 33, 33, null, null, null, 41, 42, 42, 43, 45, 52],
        [null, null, null, 8, 8, 11, 15, 19, 23, 28, 33, 33, 38, 39, 40, 41, 42, 42, 43, 44, 52],
        [null, null, null, 8, 8, 11, 15, 19, 23, 28, 33, 33, 38, 39, 40, 49, 42, 42, 43, 44, 52],
        [0, 1, null, null, 9, 12, 16, 20, 24, 29, 31, 35, 38, 39, 40, 49, null, null, null, null, null],
        [0, 1, 3, 5, 9, 12, 16, 20, 24, 29, 31, 35, 38, 39, 40, 49, null, null, null, null, null],
        [0, 1, 3, 5, 10, 13, 17, 21, 25, 30, 32, 35, null, null, null, null, null, null, null, null, null],
        [null, 2, 2, 6, 10, 13, 17, 21, 25, 30, 32, null, null, null, null, null, null, null, null, null, null],
        [null, 2, 2, 6, 10, 14, 22, 22, 26, 34, null, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, 6, null, 14, 22, 22, 26, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, null, null, null, 22, 22, 26, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, 4, 4, null, null, null, null, 27, 27, 34, 51, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, 50, 50, null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, 53, 50, 50, null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
    ];

    var totalHeight = gridLayout.length * cellHeight;
    var totalWidth = gridLayout[0].length * cellWidth;
    var mapBounds = L.latLngBounds([[-totalHeight, 0], [0, totalWidth]]);

    var map = L.map('map', {
        crs: L.CRS.Simple, minZoom: -4.0, maxZoom: 1, zoomSnap: 0.1, zoomDelta: 0.5, attributionControl: false,
        maxBounds: mapBounds, maxBoundsViscosity: 0.8
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
            L.imageOverlay("big" + imgId + ".png", bounds).addTo(imageLayerGroup);
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
    var normalMarkerLayer = L.layerGroup().addTo(map);
    var gridLayer = L.layerGroup();
    if (typeof districtData !== 'undefined') {
        districtData.forEach(function(d) {
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

            var rawPoints = Array.isArray(d.points[0][0]) ? d.points : [d.points];
            var polyPoints = shiftPoints(rawPoints); 

            polyPoints.forEach(function(polygonPoints) {
                L.polygon(polygonPoints, { color: color, fillColor: color, fillOpacity: 0.15, weight: weightStyle, dashArray: dashStyle, opacity: opacity, interactive: false })
                .addTo(targetLayer);
                searchablePolygons.push({ name: name, type: layerType, points: polygonPoints });
            });
            
            var center = L.polygon(polyPoints[0]).getBounds().getCenter();
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
    var processedSubwayMarkers = subwayData.markers.map(m => {
        var newName = m.name;
        if (!newName.endsWith('역')) newName += '역';
        // 원본 m을 건드리지 않고 새로운 객체를 리턴합니다.
        return Object.assign({}, m, { name: newName, lat: m.lat + adjustY });
    });
    allLandmarks = allLandmarks.concat(processedSubwayMarkers);
}
        if (subwayData.lines) {
            subwayData.lines.forEach(function(line) {
                var correctedPoints = line.points.map(p => [p[0] + adjustY, p[1]]);
                // [NEW] lineKey 찾아서 레이어에 심기 (필터링용)
                var lineKey = Object.keys(subwayLines).find(key => subwayLines[key].name === line.name) || "";
                if (!lineKey) lineKey = Object.keys(subwayLines).find(key => line.name.includes(subwayLines[key].name) || subwayLines[key].name.includes(line.name));
                
                var poly = L.polyline(correctedPoints, { color: line.color, weight: 5, opacity: 0.8 });
                poly.bindTooltip(line.name, { sticky: true });
                poly.lineCode = lineKey; // ID 저장
                poly.addTo(subwayLineLayer);
            });
        }
    }
var roadLayer = L.layerGroup(); 

if (typeof roadData !== 'undefined') {
        roadData.forEach(function(road) {
            // 기존 마커/노선처럼 좌표 자동 보정 적용 (Y축)
            var correctedPoints = road.points.map(p => [p[0] + adjustY, p[1]]);
            
            var poly = L.polyline(correctedPoints, { 
                color: road.color || '#777777', 
                weight: road.weight || 4,       
                opacity: 0.8 
            });
            
            poly.bindTooltip("🛣️ " + road.name, { sticky: true });
            poly.addTo(roadLayer);
        });
    }

    // =========================================================
    // ★ [NEW] 🚌 버스 레이어 및 데이터 그리기 (효빈광역시 도색 반영)
    // =========================================================
    var busLineLayer = L.layerGroup(); 
    
    var busColors = {
        "간선": "#01B7ED",
        "순환": "#E7D600",
        "지선": "#37B484",
        "광역": "#485EC6",
        "좌석": "#FF5800",
        "마을": "#A664A0",
        "공항": "#84C36E",
        "시티투어": "#7777AA",
        "급행": "#D81C2F"
    };

    if (typeof busData !== 'undefined') {
        busData.forEach(function(bus) {
            var correctedPoints = bus.points.map(p => [p[0] + adjustY, p[1]]);
            var bColor = busColors[bus.type] || '#888888';
            
            var poly = L.polyline(correctedPoints, { 
                color: bColor, 
                weight: 4, 
                opacity: 0.85,
                dashArray: '7, 5' // 버스는 도로/지하철과 구분되게 점선으로 표시
            });
            
            poly.bindTooltip(`🚌 [${bus.type}버스] ${bus.name}`, { sticky: true });
            poly.addTo(busLineLayer);
        });
    }
    // =========================================================

    var activeMarkers = [];
    allLandmarks.forEach(item => addMarkerToMap(item));
    function calculateSize(zoom) { return Math.max(baseMarkerSize + (zoom * sizeMultiplier), minMarkerSize); }
    
    function addMarkerToMap(item) {
        var size = calculateSize(map.getZoom());
        var marker;

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
            iconHtml += `<div class="station-name-label">${item.name}</div>`;
            
            marker = L.marker([item.lat, item.lng], {
                icon: L.divIcon({ className: 'custom-station', html: iconHtml, iconSize: [width, 14], iconAnchor: [width/2, 7] })
            });

            // [NEW] Marker 객체에 노선 정보 심기 (필터링용)
            marker.lineCodes = lines;

        } else {
            marker = L.marker([item.lat, item.lng], { icon: createCustomIcon(item.color, size) });
        }

        if (item.type === 'subway') {
            marker.addTo(subwayStationLayer); 
        } else {
            marker.addTo(normalMarkerLayer); 
        }
        
        marker.myColor = item.color; 
        activeMarkers.push(marker);

// 지하철/기차역인 경우 경유 노선들을 모아서 보여줌
        if (item.type === 'subway') {
            var lineNames = (item.lines || []).map(lid => subwayLines[lid] ? subwayLines[lid].name : "").filter(Boolean).join(", ");
            marker.bindTooltip(`<b>${item.name}</b><br><span style="font-size:11px; color:#555;">경유: ${lineNames}</span>`, { offset: [0, -10], direction: 'top' });
        } else {
            marker.bindTooltip(item.name, { offset: [0, -20], direction: 'top' });
        }
        marker.on('dblclick', function(e) {
            L.DomEvent.stopPropagation(e);
            var isUserMarker = myLandmarks.some(m => m.name === item.name && m.lat === item.lat);
            if (isUserMarker) {
                if (confirm(`'${item.name}' 마커를 삭제하시겠습니까?`)) {
                    if (item.type === 'subway') {
                        subwayStationLayer.removeLayer(marker);
                    } else {
                        map.removeLayer(marker);
                    }
                    activeMarkers = activeMarkers.filter(m => m !== marker);
                    myLandmarks = myLandmarks.filter(m => m.name !== item.name || m.lat !== item.lat);
                    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
                }
            }
        });
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

    function isPointInPolygon(lat, lng, polygonPoints) {
        var x = lat, y = lng;
        var inside = false;
        for (var i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
            var xi = polygonPoints[i][0], yi = polygonPoints[i][1];
            var xj = polygonPoints[j][0], yj = polygonPoints[j][1];
            var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    map.on('click', function(e) {
        if (typeof searchHighlightLayer !== 'undefined' && searchHighlightLayer) searchHighlightLayer.clearLayers();
        var resultBox = document.getElementById('search-result-list');
        if(resultBox) resultBox.style.display = 'none';
        
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
        return fullAddress;
    }

// 완전히 새로 짠 다중 검색 함수 (버스 검색 기능 추가 버전!)
    function searchLocation(isAuto = false) {
        var input = document.getElementById('search-input').value.trim();
        var resultBox = document.getElementById('search-result-list');
        
        if (!input) {
            resultBox.style.display = 'none';
            return;
        }

        if (!searchHighlightLayer) searchHighlightLayer = L.layerGroup().addTo(map);
        searchHighlightLayer.clearLayers();

        // 1. 기존 마커 및 구역 검색
        var targetMarkers = allLandmarks.filter(m => m.name && m.name.includes(input));
        var targetPolys = searchablePolygons.filter(p => p.name && p.name.includes(input));

        // 2. 도로 검색 (기본 도로 데이터 + 직접 그린 도로 통합)
        var allRoadsForSearch = [];
        if (typeof roadData !== 'undefined') {
            roadData.forEach(l => {
                allRoadsForSearch.push({
                    name: l.name,
                    points: l.points.map(p => [p[0] + adjustY, p[1]]) // 기존 데이터 좌표 보정
                });
            });
        }
        allRoadsForSearch = allRoadsForSearch.concat(myLines);
        var targetRoads = allRoadsForSearch.filter(r => r.name && r.name.includes(input));

        // 3. 교차로 검색 (저장된 교차로 중 이름이 지정된 것만)
        var targetIntersects = savedIntersections.filter(i => i.name && i.name !== "ㅜ" && i.name.includes(input));

// 4. ★ 버스 노선 검색 (수정됨: 하이라이트 선 좌표도 보정 적용!)
        var targetBuses = [];
        if (typeof busData !== 'undefined') {
            busData.forEach(b => {
                if (b.name && b.name.includes(input)) {
                    targetBuses.push({
                        name: b.name,
                        type: b.type,
                        startAddr: b.startAddr,
                        endAddr: b.endAddr,
                        // ★ 여기서 adjustY를 더해줘야 검색 하이라이트가 허공에 뜨지 않습니다!
                        points: b.points.map(p => [p[0] + adjustY, p[1]]) 
                    });
                }
            });
        }
        // 전체 검색 결과 개수
        var totalResults = targetMarkers.length + targetPolys.length + targetRoads.length + targetIntersects.length + targetBuses.length;

        if (totalResults === 0) {
            if (!isAuto) alert("검색 결과를 찾을 수 없습니다."); 
            resultBox.style.display = 'none';
            return;
        }

        // 검색 결과 저장 (버스 포함)
        currentSearchResults = { markers: targetMarkers, polys: targetPolys, roads: targetRoads, intersects: targetIntersects, buses: targetBuses };

        // 결과가 딱 1개일 땐 리스트 안 띄우고 바로 이동
        if (totalResults === 1) {
            resultBox.style.display = 'none';
            if (targetPolys.length === 1) selectSearchResult('poly', 0);
            else if (targetMarkers.length === 1) selectSearchResult('marker', 0);
            else if (targetRoads.length === 1) selectSearchResult('road', 0);
            else if (targetIntersects.length === 1) selectSearchResult('intersect', 0);
            else if (targetBuses.length === 1) selectSearchResult('bus', 0);
            return;
        }

        // 결과가 여러 개면 목록 HTML 생성
        var listHtml = "";
        
        targetPolys.forEach((p, index) => {
            var typeStr = p.type === 'gugun' ? "구/군" : p.type === 'admin' ? "행정동" : p.type === 'dev' ? "개발지구" : "법정동";
            var bgCode = p.type === 'gugun' ? "#EE0022" : p.type === 'admin' ? "#0077DD" : p.type === 'dev' ? "#881188" : "#00CCAA";
            listHtml += `<div class="search-result-item" onclick="selectSearchResult('poly', ${index})">
                            <span class="search-type-badge" style="background:${bgCode}">${typeStr}</span>${p.name}
                         </div>`;
        });
        
        targetMarkers.forEach((m, index) => {
            var typeStr = m.type === 'subway' ? "지하철" : "마커";
            var bgCode = m.type === 'subway' ? "#FF5522" : "#333333";
            listHtml += `<div class="search-result-item" onclick="selectSearchResult('marker', ${index})">
                            <span class="search-type-badge" style="background:${bgCode}">${typeStr}</span>${m.name}
                         </div>`;
        });

        // 🚗 도로 검색 결과 추가
        targetRoads.forEach((r, index) => {
            listHtml += `<div class="search-result-item" onclick="selectSearchResult('road', ${index})">
                            <span class="search-type-badge" style="background:#ff9922">도로</span>${r.name}
                         </div>`;
        });

        // 🚦 교차로 검색 결과 추가
        targetIntersects.forEach((i, index) => {
            listHtml += `<div class="search-result-item" onclick="selectSearchResult('intersect', ${index})">
                            <span class="search-type-badge" style="background:#0077DD">교차로</span>${i.name}
                         </div>`;
        });

        // 🚌 ★ 버스 검색 결과 추가
        targetBuses.forEach((b, index) => {
            // 버스 공식 도색 가져오기 (만약 없으면 기본 회색)
            var bColor = (typeof busColors !== 'undefined' && busColors[b.type]) ? busColors[b.type] : '#888888';
            listHtml += `<div class="search-result-item" onclick="selectSearchResult('bus', ${index})">
                            <span class="search-type-badge" style="background:${bColor}">${b.type}버스</span>${b.name}
                         </div>`;
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

            var popupContent = `<div style="font-size:15px; text-align:center; padding:3px;">
                                <b style="color:#0077DD; font-size:16px;">${poly.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;">${fullAddr}</span>
                                </div>`;
            highlight.bindPopup(popupContent);
            searchHighlightLayer.addLayer(highlight);
            
            map.fitBounds(polyBounds, { maxZoom: -1 });
            highlight.openPopup();
            
        } else if (type === 'marker') {
            var target = currentSearchResults.markers[index];
            if (target.type === 'subway' && !map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
            
            var fullAddr = getFullAddress(target.lat, target.lng);
            
            var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;">
                                <b style="font-size:16px;">${target.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;">${fullAddr}</span>
                                </div>`;
            
            map.flyTo([target.lat, target.lng], -1);
            L.popup().setLatLng([target.lat, target.lng]).setContent(popupContent).openOn(map);
            
        } else if (type === 'road') {
            var target = currentSearchResults.roads[index];
            var highlight = L.polyline(target.points, { color: "#ff9922", weight: 8, opacity: 0.8 });
            
            var polyBounds = highlight.getBounds();
            var center = polyBounds.getCenter();
            var fullAddr = getFullAddress(center.lat, center.lng);

            var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;">
                                <b style="font-size:16px; color:#ff9922;">🛣️ ${target.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;">중심 기준: ${fullAddr}</span>
                                </div>`;
            highlight.bindPopup(popupContent);
            searchHighlightLayer.addLayer(highlight);
            
            map.fitBounds(polyBounds, { maxZoom: -1 });
            highlight.openPopup();
            
        } else if (type === 'intersect') {
            var target = currentSearchResults.intersects[index];
            var fullAddr = getFullAddress(target.lat, target.lng);
            
            var highlight = L.circleMarker([target.lat, target.lng], {
                radius: 12, color: '#FFF', weight: 3, fillColor: '#0077DD', fillOpacity: 1
            });

            var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;">
                                <b style="font-size:16px; color:#0077DD;">🚦 ${target.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;">${fullAddr}</span>
                                </div>`;
                                
            highlight.bindPopup(popupContent);
            searchHighlightLayer.addLayer(highlight);
            
            map.flyTo([target.lat, target.lng], -1);
            highlight.openPopup();

        } else if (type === 'bus') {
            // 🚌 ★ 버스 노선 선택 시 시각적 강조 및 중심 이동 (추가됨)
            var target = currentSearchResults.buses[index];
            var bColor = (typeof busColors !== 'undefined' && busColors[target.type]) ? busColors[target.type] : '#888888';
            
            // 검색된 버스는 점선이 아닌 '굵고 뚜렷한 실선'으로 강조해서 잘 보이게!
            var highlight = L.polyline(target.points, { color: bColor, weight: 8, opacity: 0.9 });
            
            var polyBounds = highlight.getBounds();
            var center = polyBounds.getCenter();
            var fullAddr = getFullAddress(center.lat, center.lng);

            // 팝업창에 기점/종점 정보까지 깔끔하게 표시
            var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;">
                                <b style="font-size:16px; color:${bColor};">🚌 [${target.type}버스] ${target.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;"><b>기점:</b> ${target.startAddr || "미지정"}</span><br>
                                <span style="font-size:12px; color:#333;"><b>종점:</b> ${target.endAddr || "미지정"}</span><br>
                                <span style="font-size:11px; color:#777; display:block; margin-top:3px;">(중심: ${fullAddr})</span>
                                </div>`;
                                
            highlight.bindPopup(popupContent);
            searchHighlightLayer.addLayer(highlight);
            
            map.fitBounds(polyBounds, { maxZoom: -1 });
            highlight.openPopup();
        }
    }

    function downloadMapImage() {
        var btn = document.getElementById('capture-btn');
        var originalText = btn.innerHTML;
        btn.innerHTML = "📸 찰칵!...";

        var controls = document.querySelector('.leaflet-control-container');
        if(controls) controls.style.display = 'none';

        html2canvas(document.getElementById('map'), {
            allowTaint: true,
            useCORS: true,
            logging: true,
            scale: 2,
            ignoreElements: (element) => {
                return false;
            }
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.download = 'hyobin_map_capture.png';
            link.href = canvas.toDataURL("image/png");
            link.click();

            if(controls) controls.style.display = 'block';
            btn.innerHTML = originalText;
            alert("지도 이미지가 다운로드되었습니다!");
        }).catch(function(err) {
            console.error(err);
            alert("캡처 실패! (서버 환경에서 실행했는지 확인하세요)\n에러: " + err);
            
            if(controls) controls.style.display = 'block';
            btn.innerHTML = originalText;
        });
    }

    function saveData() {
        if (myLandmarks.length === 0 && myLines.length === 0) { alert("저장할 데이터가 없습니다."); return; }
        
        var data = { markers: myLandmarks, lines: myLines };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "hyobin_map_data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadData(input) {
        var file = input.files[0];
        if(!file) return;

        if(!confirm("현재 지도의 데이터가 파일 내용으로 덮어씌워집니다.\n계속하시겠습니까?")) {
            input.value = ""; return;
        }

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
            } catch (err) {
                alert("파일 형식이 올바르지 않습니다.");
            }
        };
        reader.readAsText(file);
    }

    function captureSpecificGrid() {
        var numStr = prompt("캡처할 그리드 번호를 입력하세요 (1 ~ " + (gridNum - 1) + "):");
        if (!numStr) return;
        
        var num = parseInt(numStr);
        if (!gridCells[num]) {
            alert("존재하지 않는 그리드 번호입니다.");
            return;
        }

        var btn = document.getElementById('grid-capture-btn');
        var originalText = btn.innerHTML;
        btn.innerHTML = "📸 화면 고정 중...";

        var controls = document.querySelector('.leaflet-control-container');
        if (controls) controls.style.display = 'none';
        var numberLabels = document.querySelectorAll('.grid-number-label');
        numberLabels.forEach(function(l) { l.style.display = 'none'; });

        var mapDiv = document.getElementById('map');

        var originalCssText = mapDiv.style.cssText; 
        var originalCenter = map.getCenter();
        var originalZoom = map.getZoom();

        mapDiv.style.position = 'fixed';
        mapDiv.style.top = '0px';
        mapDiv.style.left = '0px';
        mapDiv.style.width = gridWidth + 'px';
        mapDiv.style.height = gridHeight + 'px';
        mapDiv.style.zIndex = '9999';
        mapDiv.style.margin = '0';
        mapDiv.style.padding = '0';

        map.invalidateSize(false);

        var bounds = gridCells[num];
        var centerY = (bounds[0][0] + bounds[1][0]) / 2;
        var centerX = (bounds[0][1] + bounds[1][1]) / 2;
        
        map.setView([centerY, centerX], 0, { animate: false });

        btn.innerHTML = "📸 찰칵!...";

        setTimeout(function() {
            html2canvas(mapDiv, {
                allowTaint: true,
                useCORS: true,
                scale: 1, 
                width: gridWidth,
                height: gridHeight,
                backgroundColor: "#aaddff" 
            }).then(function(canvas) {
                var link = document.createElement('a');
                link.download = 'hyobin_grid_' + num + '.png';
                link.href = canvas.toDataURL("image/png");
                link.click();

                restoreMap();
                alert(num + "번 그리드 캡처 완료!");

            }).catch(function(err) {
                console.error(err);
                alert("캡처 실패: " + err);
                restoreMap();
            });
        }, 1500); 

        function restoreMap() {
            mapDiv.style.cssText = originalCssText || 'width: 100vw; height: 100vh;';
            map.invalidateSize(false);
            map.setView(originalCenter, originalZoom, { animate: false });

            if (controls) controls.style.display = 'block';
            numberLabels.forEach(function(l) { l.style.display = 'block'; });
            btn.innerHTML = originalText;
        }
    }
    
function clearAllData() { 
        if(confirm("모든 사용자 데이터(마커, 선, 교차로 이름)를 삭제하고 초기화하시겠습니까?")) { 
            localStorage.removeItem('hyobin_markers'); 
            localStorage.removeItem('hyobin_lines'); 
            localStorage.removeItem(migrationKey); 
            location.reload(); 
        } 
    }
    var isSubwayMode = false;
    var savedLayerState = [];

    function toggleSubwayMode() {
        isSubwayMode = !isSubwayMode;
        var btn = document.getElementById('mode-btn');
        var mapDiv = document.getElementById('map');
        var backgroundLayers = [imageLayerGroup, guGunLayer, adminLayer, legalLayer, devLayer];
        var filterBox = document.getElementById('subway-filter-box');

        if (isSubwayMode) {
            btn.innerHTML = "🗺️ 지도 모드"; 
            btn.classList.add('active-btn');
            mapDiv.style.backgroundColor = '#ffffff'; 
            filterBox.style.display = 'block'; 

            savedLayerState = [];
            backgroundLayers.forEach(layer => {
                if (map.hasLayer(layer)) {
                    savedLayerState.push(layer);
                    map.removeLayer(layer);
                }
            });

            if (!map.hasLayer(subwayLineLayer)) map.addLayer(subwayLineLayer);
            if (!map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
            alert("노선도만 깔끔하게 보여줍니다. (좌측 하단에서 노선별 필터링 가능)");
            applySubwayFilter(); 

        } else {
            btn.innerHTML = "🚇 노선도 모드";
            btn.classList.remove('active-btn');
            mapDiv.style.backgroundColor = '#aaddff'; 
            filterBox.style.display = 'none'; 

            savedLayerState.forEach(layer => {
                if (!map.hasLayer(layer)) map.addLayer(layer);
            });
            if (!map.hasLayer(imageLayerGroup)) map.addLayer(imageLayerGroup);
            
            subwayLineLayer.eachLayer(layer => map.addLayer(layer));
            subwayStationLayer.eachLayer(layer => map.addLayer(layer));
        }
    }

    function toggleAllSubwayFilters(isChecked) {
        var checkboxes = document.querySelectorAll('input[name="subwayFilter"]');
        checkboxes.forEach(cb => cb.checked = isChecked);
        applySubwayFilter();
    }

    function applySubwayFilter() {
        if (!isSubwayMode) return;

        var checkedLines = [];
        document.querySelectorAll('input[name="subwayFilter"]:checked').forEach(cb => checkedLines.push(cb.value));

        subwayLineLayer.eachLayer(function(layer) {
            if (checkedLines.includes(layer.lineCode)) {
                if (!map.hasLayer(layer)) map.addLayer(layer);
            } else {
                if (map.hasLayer(layer)) map.removeLayer(layer);
            }
        });

        subwayStationLayer.eachLayer(function(marker) {
            var stationLines = marker.lineCodes || [];
            var isVisible = stationLines.some(code => checkedLines.includes(code));
            
            if (isVisible) {
                if (!map.hasLayer(marker)) map.addLayer(marker);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });

        if (isAutoDistMode) {
            autoDistanceLabels.forEach(function(lbl) {
                if (checkedLines.includes(lbl.relatedLineId)) {
                    if (!map.hasLayer(lbl)) map.addLayer(lbl);
                } else {
                    if (map.hasLayer(lbl)) map.removeLayer(lbl);
                }
            });
        }
    }

    map.on('overlayadd', function() { if(isDistrictAreaMode) updateDistrictAreaLabels(); });
    map.on('overlayremove', function() { if(isDistrictAreaMode) updateDistrictAreaLabels(); });

// =========================================================
    // ★ [NEW] 꼬리표(?name=) 확인 및 부모 창 제목 읽어서 자동 포커스
    // =========================================================
    window.addEventListener('DOMContentLoaded', function() {
        try {
            var targetName = null;

            // 1. URL 꼬리표 파라미터가 있는지 먼저 확인 (예: ?name=효빈대학교)
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('name')) {
                targetName = urlParams.get('name');
            } 
            // 2. 꼬리표가 없고, 지도가 위키 문서(iframe) 안에 쏙 들어가 있을 때만 제목 읽기
            else if (window !== window.parent) {
                var parentTitle = window.parent.document.title; 
                targetName = parentTitle.split(' -')[0].replace(' 문서', '').trim();
            }

            // 3. 찾을 이름이 발견되었다면 조용히 자동 검색 실행!
            if (targetName) {
                var searchInput = document.getElementById('search-input');
                if(searchInput) searchInput.value = targetName;

                setTimeout(function() {
                    // searchLocation에 true를 넣어서 '자동 검색'임을 알려줌 (경고창 안 띄움)
                    searchLocation(true); 
                    
                    setTimeout(function() {
                        var firstResult = document.querySelector('.search-result-item');
                        if (firstResult) {
                            firstResult.click();
                        }
                    }, 300);
                }, 500);
            }
        } catch (error) {
            console.log("부모 창 접근 차단됨 (URL 파라미터 방식을 사용하세요).");
        }
    });
// 1. [유연한 판정] 선을 살짝 늘려서 교차 여부를 판단하는 함수
    function getIntersection(p1, p2, p3, p4, pixelMargin = 60) {
        var x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
        var x3 = p3[0], y3 = p3[1], x4 = p4[0], y4 = p4[1];

        var denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return null; // 평행한 경우

        var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        var u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        // 각 선분의 길이를 계산하여 픽셀 마진을 비율(t, u)로 변환
        var len1 = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        var len2 = Math.sqrt(Math.pow(x3 - x4, 2) + Math.pow(y3 - y4, 2));
        
        var marginT = pixelMargin / (len1 || 1);
        var marginU = pixelMargin / (len2 || 1);

        // 연장선 마진 범위 내에서 교차하면 좌표 반환
        if (t >= -marginT && t <= 1 + marginT && u >= -marginU && u <= 1 + marginU) {
            return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
        }
        return null;
    }

    var intersectionMarkers = [];
    var savedIntersections = JSON.parse(localStorage.getItem('hyobin_intersections')) || [];

// 작업 중인 교차로 데이터를 임시로 담아두는 변수
    var currentIntersectMarker = null;
    var currentIntersectData = null;

    function findIntersections() {
        if (intersectionMarkers.length > 0) {
            intersectionMarkers.forEach(m => map.removeLayer(m));
            intersectionMarkers = [];
            document.getElementById('intersect-btn').classList.remove('active-btn');
            return;
        }

        document.getElementById('intersect-btn').classList.add('active-btn');
        let allFoundPoints = []; 
        var all = (typeof roadData !== 'undefined' ? roadData : []).concat(myLines);

        const searchMargin = 60;  
        const clusterLimit = 100; 

        all.forEach((l1, i) => {
            all.slice(i+1).forEach(l2 => {
                for(let a=0; a<l1.points.length-1; a++) {
                    for(let b=0; b<l2.points.length-1; b++) {
                        let isL1Raw = (typeof roadData !== 'undefined' && roadData.includes(l1));
                        let isL2Raw = (typeof roadData !== 'undefined' && roadData.includes(l2));
                        let p1 = isL1Raw ? [l1.points[a][0] + adjustY, l1.points[a][1]] : l1.points[a];
                        let p2 = isL1Raw ? [l1.points[a+1][0] + adjustY, l1.points[a+1][1]] : l1.points[a+1];
                        let p3 = isL2Raw ? [l2.points[b][0] + adjustY, l2.points[b][1]] : l2.points[b];
                        let p4 = isL2Raw ? [l2.points[b+1][0] + adjustY, l2.points[b+1][1]] : l2.points[b+1];

                        let res = getIntersection(p1, p2, p3, p4, searchMargin);
                        if(res) {
                            allFoundPoints.push({ lat: res[0], lng: res[1], roads: [l1.name, l2.name] });
                        }
                    }
                }
            });
        });

        let clusters = [];
        allFoundPoints.forEach(pt => {
            let joined = false;
            for (let cluster of clusters) {
                let dist = Math.sqrt(Math.pow(pt.lat - cluster.lat, 2) + Math.pow(pt.lng - cluster.lng, 2));
                if (dist < clusterLimit) {
                    cluster.points.push(pt);
                    cluster.lat = cluster.points.reduce((s, p) => s + p.lat, 0) / cluster.points.length;
                    cluster.lng = cluster.points.reduce((s, p) => s + p.lng, 0) / cluster.points.length;
                    pt.roads.forEach(r => cluster.roadNames.add(r));
                    joined = true;
                    break;
                }
            }
            if (!joined) {
                clusters.push({ lat: pt.lat, lng: pt.lng, points: [pt], roadNames: new Set(pt.roads) });
            }
        });

        clusters.forEach(cluster => {
            let lat = Math.round(cluster.lat);
            let lng = Math.round(cluster.lng);
            let savedInfo = savedIntersections.find(si => Math.abs(si.lat - lat) < 40 && Math.abs(si.lng - lng) < 40);
            if (savedInfo && savedInfo.name === "ㅜ") return;

            let markerColor = savedInfo ? '#0077DD' : '#EE0022';
            let defaultName = Array.from(cluster.roadNames).join(" X ");
            let displayName = savedInfo ? savedInfo.name : defaultName;

            let m = L.circleMarker([cluster.lat, cluster.lng], { 
                radius: 8, color: 'white', fillColor: markerColor, fillOpacity: 1, weight: 2, interactive: true 
            }).addTo(map);

            m.bindTooltip(`<b>${displayName}</b><br><span style="font-size:10px; color:#ccc;">클릭: 이름 지정/추천 리스트</span>`);

            m.on('click', function(e) {
                L.DomEvent.stopPropagation(e);
                // ★ prompt 대신 커스텀 모달을 엽니다!
                openIntersectNameModal(this, cluster, displayName);
            });
            intersectionMarkers.push(m);
        });

        if (clusters.length > 0) alert(`교차로 탐색 완료!`);
    }

// [콤보 박스 모달 제어 함수 - 추천 알고리즘 대폭 강화 (삼거리, 오거리, 로터리 등)]
    function openIntersectNameModal(marker, cluster, currentName) {
        currentIntersectMarker = marker;
        currentIntersectData = { lat: Math.round(cluster.lat), lng: Math.round(cluster.lng) };

        let roadArray = Array.from(cluster.roadNames);
        let defaultRoads = roadArray.join(" X ");
        let defaultInfo = document.getElementById('intersect-default-info');
        
        let input = document.getElementById('intersect-name-input');
        // 기존 이름이 지정되지 않았다면(A X B) 빈칸으로 두어 새로 입력/선택하기 편하게 함
        input.value = (currentName === defaultRoads) ? "" : currentName;

        // 마커 최신화
        let latestLandmarks = [...allLandmarks];
        myLandmarks.forEach(m => {
            if (!latestLandmarks.some(lm => lm.name === m.name && lm.lat === m.lat)) {
                latestLandmarks.push(m);
            }
        });

        let suggestions = [];
        
        // 0. 겹치는 도로 개수에 따른 자동 판별 (도로가 3개 이상 겹치면 오거리/육거리/로터리 우선 추천)
        let isComplex = roadArray.length >= 3;

        // 1. 랜드마크 기반 맞춤형 추천 (반경 1200px)
        let nearby = latestLandmarks.map(lm => {
            let d = Math.sqrt(Math.pow(cluster.lat - lm.lat, 2) + Math.pow(cluster.lng - lm.lng, 2));
            return { name: lm.name, dist: d, type: lm.type || 'normal' };
        }).filter(lm => lm.dist < 1200).sort((a, b) => a.dist - b.dist).slice(0, 4);

        nearby.forEach(lm => {
            let isStation = lm.name.endsWith('역') || lm.type === 'subway';
            let cleanName = lm.name.replace(/역$/, ''); // 끝에 붙은 '역'만 깔끔하게 제거

            if (isStation) {
                // 🚇 역(Station) 전용 추천
                suggestions.push(`${cleanName}역 사거리`);
                suggestions.push(`${cleanName}역 삼거리`);
                if (isComplex) suggestions.push(`${cleanName}역 오거리`, `${cleanName}역 로터리`);
                suggestions.push(`${cleanName}역 앞 교차로`);
                suggestions.push(`${cleanName}역입구 삼거리`);
                suggestions.push(`신${cleanName} 교차로`); 
            } else if (lm.name.match(/(학교|초|중|고|대)$/)) {
                // 🏫 학교 전용 추천
                suggestions.push(`${lm.name} 앞 삼거리`);
                suggestions.push(`${lm.name} 사거리`);
                suggestions.push(`${lm.name}입구 교차로`);
            } else if (lm.name.endsWith('공원')) {
                // 🌳 공원 전용 추천
                suggestions.push(`${lm.name} 삼거리`);
                suggestions.push(`${lm.name} 사거리`);
                if (isComplex) suggestions.push(`${lm.name} 로터리`);
            } else {
                // 🏢 일반 시설 추천
                suggestions.push(`${lm.name} 사거리`);
                suggestions.push(`${lm.name} 삼거리`);
                suggestions.push(`${lm.name} 교차로`);
                if (isComplex) suggestions.push(`${lm.name} 오거리`);
            }
        });

        // 2. 행정구역(동/리) 기반 추천
        let addr = getFullAddress(cluster.lat, cluster.lng);
        if (addr && addr !== "미지정") {
            let dongName = addr.split(' ').pop().replace(/\(.*\)/, ''); // 법정동 추출
            if(!['읍', '면', '시', '군', '구'].includes(dongName.slice(-1))) {
                suggestions.push(`${dongName} 삼거리`);
                suggestions.push(`${dongName} 사거리`);
                suggestions.push(`${dongName} 교차로`);
                if (isComplex) suggestions.push(`${dongName} 육거리`, `${dongName} 로터리`);
                suggestions.push(`${dongName}중앙 교차로`);
                suggestions.push(`구${dongName} 네거리`); 
                suggestions.push(`신${dongName} 나들목`);
            }
        }

        // 3. 만나는 도로 이름들을 합친 추천 (예: 고송로 + 채산길 = 고송채산 사거리)
        if (roadArray.length >= 2) {
            let r1 = roadArray[0].replace(/(로|길|대로|거리)$/, '');
            let r2 = roadArray[1].replace(/(로|길|대로|거리)$/, '');
            suggestions.push(`${r1}${r2} 사거리`);
            suggestions.push(`${r1}${r2} 삼거리`);
            suggestions.push(`${r1} 교차로`);
        }

        // 중복 제거 및 최대 15개까지 표시 (다양한 옵션을 위해 한도 증가)
        let uniqueSuggestions = [...new Set(suggestions)].slice(0, 15); 

        // Datalist에 추가 (타이핑 시 자동완성용)
        let datalist = document.getElementById('intersect-suggestions');
        datalist.innerHTML = "";
        uniqueSuggestions.forEach(s => {
            let opt = document.createElement('option');
            opt.value = s;
            datalist.appendChild(opt);
        });

        // 화면에 직접 클릭 가능한 '추천 배지' 생성
        let suggestHtml = `<br><br><span style="color:#0077DD; font-weight:bold;">💡 맞춤 추천 명칭 (클릭 시 입력):</span><br><div style="margin-top:5px; line-height:1.8;">`;
        uniqueSuggestions.forEach(s => {
            suggestHtml += `<span style="display:inline-block; background:#eef5ff; padding:4px 8px; margin-right:5px; margin-bottom:5px; border-radius:15px; cursor:pointer; border:1px solid #0077DD; color:#0077DD; font-weight:bold; box-shadow:1px 1px 3px rgba(0,0,0,0.2);" onclick="document.getElementById('intersect-name-input').value='${s}'">${s}</span>`;
        });
        suggestHtml += `</div>`;

        // 모달 텍스트 최종 업데이트
        defaultInfo.innerHTML = `경유 도로: <b>${defaultRoads}</b>` + (uniqueSuggestions.length > 0 ? suggestHtml : "");

        document.getElementById('intersect-name-modal').style.display = 'flex';
    }

    // 모달 저장 로직
    function saveIntersectName() {
        let newName = document.getElementById('intersect-name-input').value.trim();
        if (!newName) return;

        let lat = currentIntersectData.lat;
        let lng = currentIntersectData.lng;

        savedIntersections = savedIntersections.filter(si => !(Math.abs(si.lat - lat) < 40 && Math.abs(si.lng - lng) < 40));
        savedIntersections.push({ lat: lat, lng: lng, name: newName });
        localStorage.setItem('hyobin_intersections', JSON.stringify(savedIntersections));

        currentIntersectMarker.setTooltipContent(`<b>${newName}</b><br><span style="font-size:10px; color:#ccc;">기록된 교차로</span>`);
        currentIntersectMarker.setStyle({ fillColor: '#0077DD' });

        closeModal('intersect-name-modal');
    }

    // 모달 ㅜ 제외 로직
    function ignoreIntersect() {
        let lat = currentIntersectData.lat;
        let lng = currentIntersectData.lng;
        savedIntersections = savedIntersections.filter(si => !(Math.abs(si.lat - lat) < 40 && Math.abs(si.lng - lng) < 40));
        savedIntersections.push({ lat: lat, lng: lng, name: "ㅜ" });
        localStorage.setItem('hyobin_intersections', JSON.stringify(savedIntersections));
        map.removeLayer(currentIntersectMarker);
        closeModal('intersect-name-modal');
    }

    // 3. 도로가 지나는 모든 행정구역 추출 (보정 로직 포함)
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
        return Array.from(districts);
    }
            var overlays = { 
        "🏙️ 구/군 (상위)": guGunLayer,
        "🏢 행정 읍/면/동": adminLayer,
        "촘촘 법정 동/리": legalLayer,
        "🏗️ 개발지구": devLayer,
        "🚌 버스 노선": busLineLayer,
        "🛤️ 도시/일반철도 노선": subwayLineLayer,
        "🚉 도시/일반철도 역": subwayStationLayer,
        "📍 일반 마커": normalMarkerLayer,
"📏 2000x1500 그리드": gridLayer,        
"🛣️ 주요 도로망": roadLayer

    };
    L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// =========================================================
// 1. 전체 주소 반환 함수 (돌연변이 장곡리 치료 버전)
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

    // ★ "효빈광역시 장곡리" 강제 교정 빔!
    if (fullAddress === "효빈광역시 장곡리" || fullAddress === "효빈광역시 (장곡리)") {
        return "덕빈북도 약산시 장곡읍 장곡리";
    }

    return fullAddress;
}

// =========================================================
// 2. 도로가 지나는 모든 행정구역 추출 (필터링 업그레이드 버전)
// =========================================================
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

    // ★ 수집된 주소들을 탈탈 털어서 읍/면/시/군/구 광역 주소는 날려버립니다.
    let filteredArray = Array.from(districts).filter(addr => {
        if (!addr) return false;
        if (addr === "효빈광역시" || addr === "덕빈북도" || addr === "미지정") return false;
        let lastChar = addr.trim().slice(-1);
        if (['읍', '면', '시', '군', '구'].includes(lastChar)) return false; 
        return true;
    });

    // 만약 필터링했더니 남는 주소가 아예 없다면 원본 반환 (안전장치)
    if (filteredArray.length === 0 && districts.size > 0) {
        return Array.from(districts);
    }

    return filteredArray;
}

// =========================================================
// 3. 도로 데이터 전용 CSV 다운로드 (시종점 추적 + 다운로드 버그 픽스)
// =========================================================
function downloadRoadDataCSV() {
    let allLines = [];

    // 파일 도로 데이터 보정 후 추가 (Raw -> Map)
    if (typeof roadData !== 'undefined') {
        roadData.forEach(l => {
            allLines.push({
                name: l.name,
                color: l.color,
                startAddr: l.startAddr || '',
                endAddr: l.endAddr || '',
                points: l.points.map(p => [p[0] + adjustY, p[1]])
            });
        });
    }

    // 내가 그린 도로는 보정 없이 그대로 합침
    allLines = allLines.concat(myLines);

    if (allLines.length === 0) {
        alert("저장된 도로 데이터가 없습니다.");
        return;
    }

    let csvContent = "\uFEFF"; // 엑셀 한글 깨짐 방지
    csvContent += "도로명,색상,도로 길이,시작지점,종착지점,경유 행정구역,좌표데이터\n";

    // 유효한 상세 주소(동/리)를 찾는 내부 탐지기
    function getSpecificAddress(points, isStart) {
        let startIdx = isStart ? 0 : points.length - 1;
        let endIdx = isStart ? points.length : -1;
        let step = isStart ? 1 : -1;

        for (let i = startIdx; i !== endIdx; i += step) {
            let pt = points[i];
            let addr = getFullAddress(pt[0], pt[1]);
            
            if (addr && addr !== "미지정") {
                if (addr === "효빈광역시" || addr === "덕빈북도") continue;
                let lastChar = addr.trim().slice(-1);
                if (['읍', '면', '시', '군', '구'].includes(lastChar)) continue;
                return addr;
            }
        }
        
        let fallbackPt = points[isStart ? 0 : points.length - 1];
        return getFullAddress(fallbackPt[0], fallbackPt[1]) || "미지정";
    }

    allLines.forEach(line => {
        let totalDist = 0;
        for(let i = 0; i < line.points.length - 1; i++) {
            totalDist += map.distance(line.points[i], line.points[i+1]);
        }
        let lengthStr = Math.round(totalDist) + "m";

        let calculatedStart = getSpecificAddress(line.points, true);
        let calculatedEnd = getSpecificAddress(line.points, false);
        
        let finalStart = line.startAddr || calculatedStart;
        let finalEnd = line.endAddr || calculatedEnd;

        let passing = getPathDistricts(line.points).join(" | ");
        let coords = line.points.map(p => `[${p[0]},${p[1]}]`).join("; ");

        csvContent += `"${line.name}","${line.color}","${lengthStr}","${finalStart}","${finalEnd}","${passing}","${coords}"\n`;
    });

    // ★ 브라우저 다운로드 차단 버그 해결 (DOM에 잠깐 추가했다가 클릭 후 삭제)
    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "hyobin_road_analysis.csv";
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link); // 바디에 넣고
    link.click();                    // 누르고
    document.body.removeChild(link); // 뺀다!
}
// [신규] 교차로 데이터를 CSV로 추출하는 함수
    function downloadIntersectionCSV() {
        // 교차점 찾기가 먼저 실행되어야 데이터가 생성되므로 확인
        if (intersectionMarkers.length === 0) {
            alert("먼저 [❌ 교차점 찾기] 버튼을 눌러 교차점을 생성해 주세요.");
            return;
        }

        let csvContent = "\uFEFF"; // 엑셀 한글 깨짐 방지용 BOM
        csvContent += "교차로명,교차 도로 구성,소재지(상세 행정구역),위도,경도\n";

        // intersectionMarkers는 현재 지도에 떠 있는 빨간 점들입니다.
        intersectionMarkers.forEach(marker => {
            let latlng = marker.getLatLng();
            let lat = Math.round(latlng.lat);
            let lng = Math.round(latlng.lng);

            // 1. 시장님이 저장한 이름 찾기 (없으면 기본 툴팁 내용 사용)
            let savedInfo = savedIntersections.find(si => Math.abs(si.lat - lat) < 40 && Math.abs(si.lng - lng) < 40);
            
            // 툴팁에서 도로 구성 정보 추출 (A X B 형식)
            let tooltipContent = marker.getTooltip().getContent();
            let rawName = tooltipContent.replace(/<[^>]*>?/gm, '').replace('클릭하여 이름 저장', '').trim();
            
            let finalName = savedInfo ? savedInfo.name : "이름 미정";
            let roadsComposition = savedInfo ? rawName : rawName; // 기본적으로 툴팁에 도로 구성이 들어있음

            // 2. 소재지(행정구역) 분석
            let address = getFullAddress(latlng.lat, latlng.lng) || "미지정 구역";

            // 3. CSV 행 작성 (쉼표 오작동 방지를 위해 큰따옴표 처리)
            csvContent += `"${finalName}","${roadsComposition}","${address}","${lat}","${lng}"\n`;
        });

        // 파일 다운로드 로직
        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_교차로_대장_${new Date().toLocaleDateString()}.csv`;
        link.click();
        
        alert("교차로 데이터 대장이 생성되었습니다!");
    }
    // [신규] 모든 마커 데이터를 CSV로 추출하는 함수
    function downloadMarkerDataCSV() {
        // 추출할 데이터 소스 취합 (allLandmarks는 이미 지하철역 + 일반 마커가 합쳐진 상태입니다)
        if (allLandmarks.length === 0) {
            alert("추출할 마커 데이터가 없습니다.");
            return;
        }

        let csvContent = "\uFEFF"; // 엑셀 한글 깨짐 방지용 BOM
        csvContent += "마커 이름,마커 종류,소재지(상세 행정구역),위도,경도\n";

        allLandmarks.forEach(m => {
            // 1. 종류 판별
            let typeName = (m.type === 'subway') ? "지하철역" : "일반 시설/마커";
            
            // 2. 주소 분석 (이미 구현된 getFullAddress 활용)
            let address = getFullAddress(m.lat, m.lng) || "미지정 구역";
            
            // 3. 좌표 정수화
            let lat = Math.round(m.lat);
            let lng = Math.round(m.lng);

            // 4. CSV 행 작성 (쉼표 오작동 방지를 위해 큰따옴표 처리)
            csvContent += `"${m.name}","${typeName}","${address}","${lat}","${lng}"\n`;
        });

        // 파일 다운로드 로직
        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_시설물_대장_${new Date().toLocaleDateString()}.csv`;
        link.click();
        
        alert("효빈광역시 시설물 대장이 생성되었습니다!");
    }
