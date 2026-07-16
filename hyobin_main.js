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
        "H1": { name: "빈효고속선", color: "#1D2352" },
        "T1": { name: "효빈대 A선 트램", color: "#a0fff9" },
    "M1": { name: "효빈대 B선 모노레일", color: "#74f466" }
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
            document.getElementById("map").style.cursor = "crosshair";
            radiusCenter = null;
            tempRadiusCircle = null;
        } else {
            btn.classList.remove("active-btn");
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
            const busNumMatch = bus.name.match(/\d+/);
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
            marker.stationName = item.name; // ★ [추가] 필터링 시 이름을 다시 그리기 위해 저장해둡니다!
        } else if (item.type === 'busStop') {
            // [NEW] 버스 정류장 전용 아이콘 (네모난 정류장 모양)
            var iconHtml = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${item.name.replace(' 정류장','')}</div>`;
            
            marker = L.marker([item.lat, item.lng], {
                icon: L.divIcon({ className: 'custom-bus-stop', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] })
            });
        } else {
            marker = L.marker([item.lat, item.lng], { icon: createCustomIcon(item.color, size) });
        }

if (item.type === 'subway') {
            marker.addTo(subwayStationLayer); 
        } else if (item.type === 'busStop') {
            marker.addTo(busStopLayer); // <-- [NEW] 버스 정류장은 전용 레이어로!
            
            // ★ [이 줄을 추가하세요!] 마커 객체에 경유 버스 정보 저장 (필터링용)
            marker.passingBuses = item.passingBuses; 
            
        } else {
            marker.addTo(normalMarkerLayer); 
        }        
        marker.myColor = item.color; 
        activeMarkers.push(marker);

        // 지하철/버스/기반 마커 툴팁 분기
        if (item.type === 'subway') {
            var lineNames = (item.lines || []).map(lid => subwayLines[lid] ? subwayLines[lid].name : "").filter(Boolean).join(", ");
            marker.bindTooltip(`<b>${item.name}</b><br><span style="font-size:11px; color:#555;">경유: ${lineNames}</span>`, { offset: [0, -10], direction: 'top' });
        } else if (item.type === 'busStop') {
            // [NEW] 버스 정류장 전용 툴팁 (경유 노선 리스트 표시)
            var busList = item.passingBuses && item.passingBuses.length > 0 ? item.passingBuses.join("<br>") : "<span style='color:#999;'>경유 노선 없음</span>";
            marker.bindTooltip(`<b>🚏 ${item.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busList}</div>`, { offset: [0, -10], direction: 'top' });
        } else {
            marker.bindTooltip(item.name, { offset: [0, -20], direction: 'top' });
        }

// [수정된 부분] 삭제 및 편집 이벤트 분기 (기존 삭제 기능 대체)
        if (item.type === 'busStop') {
            // 버스 정류장은 클릭 시 수정/무정차 설정 모달창 열기
            marker.on('click', function(e) {
                L.DomEvent.stopPropagation(e);
                openBusStopEditModal(item, marker);
            });
        } else {
            // 지하철/일반 마커는 기존처럼 더블클릭 시 삭제
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
    } // <-- addMarkerToMap 함수가 여기서 닫힙니다.

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
            // 🚌 ★ 검색에서 버스 노선 선택 시 완벽 하이라이트 연동
            var target = currentSearchResults.buses[index];
            var bColor = (typeof busColors !== 'undefined' && busColors[target.type]) ? busColors[target.type] : '#888888';
            
            // 1. 우리가 만든 무적의 하이라이트 함수 실행! (정류장 띄우기 & 숨기기)
            highlightBusRoute(target.name, bColor);
            
            // 2. 화면을 노선 전체가 보이게 스무스하게 이동
            var tempPoly = L.polyline(target.points);
            var polyBounds = tempPoly.getBounds();
            var center = polyBounds.getCenter();
            var fullAddr = getFullAddress(center.lat, center.lng);

            // 3. 기점/종점 정보 팝업 깔끔하게 표시
            var popupContent = `<div style="font-size:14px; text-align:center; padding:3px;">
                                <b style="font-size:16px; color:${bColor};">🚌 [${target.type}버스] ${target.name}</b><br>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                                <span style="font-size:12px; color:#333;"><b>기점:</b> ${target.startAddr || "미지정"}</span><br>
                                <span style="font-size:12px; color:#333;"><b>종점:</b> ${target.endAddr || "미지정"}</span><br>
                                <span style="font-size:11px; color:#777; display:block; margin-top:3px;">(중심: ${fullAddr})</span>
                                </div>`;
                                
            map.fitBounds(polyBounds, { maxZoom: -1 });
            
            // 검색용 임시 레이어 대신 지도 자체 팝업으로 띄우기
            L.popup().setLatLng(center).setContent(popupContent).openOn(map);
        }
    }

    function downloadMapImage() {
        var btn = document.getElementById('capture-btn');
        var originalText = btn.innerHTML;

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
            link.download = 'hyobin_map_capture.webp';
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
                link.download = 'hyobin_grid_' + num + '.webp';
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

        // 1. 노선(선) 필터링
        subwayLineLayer.eachLayer(function(layer) {
            if (checkedLines.includes(layer.lineCode)) {
                if (!map.hasLayer(layer)) map.addLayer(layer);
            } else {
                if (map.hasLayer(layer)) map.removeLayer(layer);
            }
        });

// 2. 지하철역(마커) 필터링 (환승역 동적 아이콘 업데이트 적용!)
        subwayStationLayer.eachLayer(function(marker) {
            var stationLines = marker.lineCodes || [];
            
            // ★ 현재 켜져 있는 노선들 중, 이 역이 포함하는 노선만 추려냅니다.
            var activeLines = stationLines.filter(code => checkedLines.includes(code));
            
            if (activeLines.length > 0) {
                // 역 보이기
                if (!map.hasLayer(marker)) map.addLayer(marker);
                
                // ★ 살아남은 노선(activeLines)만 가지고 아이콘(환승 마크)을 다시 그립니다!
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
                
                // 역 이름 붙이기 (방금 저장해둔 stationName 사용, 없으면 툴팁에서 빼옴)
                var sName = marker.stationName || (marker.getTooltip() ? marker.getTooltip().getContent().match(/<b>(.*?)<\/b>/)[1] : "역");
                iconHtml += `<div class="station-name-label">${sName}</div>`;
                
                // 마커 아이콘 실시간 교체!
                marker.setIcon(L.divIcon({ 
                    className: 'custom-station', 
                    html: iconHtml, 
                    iconSize: [width, 14], 
                    iconAnchor: [width/2, 7] 
                }));

            } else {
                // 포함된 노선이 하나도 안 켜져 있으면 역 완전히 숨기기
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });
        // ==========================================
        // ★ [NEW] 3. 종점 로고 필터링 완벽 연동!
        // ==========================================
        if (typeof terminalLogoLayer !== 'undefined') {
            terminalLogoLayer.eachLayer(function(marker) {
                // 방금 1단계에서 달아준 이름표(lineCode)가 체크된 목록에 있는지 확인
                if (checkedLines.includes(marker.lineCode)) {
                    if (!map.hasLayer(marker)) map.addLayer(marker);
                } else {
                    if (map.hasLayer(marker)) map.removeLayer(marker);
                }
            });
        }

        // 4. 역간 거리 라벨 필터링
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
    var savedIntersections = JSON.parse(localStorage.getItem('hyobin_intersections')) || [
        // 👇 여기에 변환기에서 복사한 코드들을 붙여넣으세요! 👇
    { lat: -24574, lng: 17881, name: "고송교차로" },
    { lat: -25423, lng: 19526, name: "청능역입구" },
    { lat: -26150, lng: 22008, name: "입희역교차로" },
    { lat: -26173, lng: 28185, name: "미원상사 효빈공장 사거리" },
    { lat: -26164, lng: 24566, name: "북부정류장사거리" },
    { lat: -26157, lng: 25636, name: "남중사거리" },
    { lat: -23592, lng: 16121, name: "건보사거리" },
    { lat: -23950, lng: 16761, name: "고송역교차로" },
    { lat: -26072, lng: 28592, name: "평전역 앞 교차로" },
    { lat: -25113, lng: 18837, name: "시청교차로" },
    { lat: -24258, lng: 17318, name: "군암교차로" },
    { lat: -26167, lng: 23768, name: "평안명대사거리" },
    { lat: -26026, lng: 29256, name: "삼성전자 제2 효빈캠퍼스 사거리" },
    { lat: -25837, lng: 20862, name: "입선초중학교 사거리" },
    { lat: -25574, lng: 20016, name: "철도사원2차 사거리" },
    { lat: -25711, lng: 20462, name: "산남고 사거리" },
    { lat: -25317, lng: 19186, name: "신시청 사거리" },
    { lat: -25958, lng: 21221, name: "삼선대병원 삼거리" },
    { lat: -26155, lng: 26640, name: "삼선대교차로" },
    { lat: -28800, lng: 17215, name: "소장재개발교차로" },
    { lat: -27519, lng: 16323, name: "서부소방서사거리" },
    { lat: -26397, lng: 16751, name: "과당교차로" },
    { lat: -24869, lng: 15796, name: "송천교차로" },
    { lat: -23591, lng: 15263, name: "송덕역 사거리" },
    { lat: -25265, lng: 16749, name: "사야병원교차로" },
    { lat: -25094, lng: 16355, name: "과진역교차로" },
    { lat: -29958, lng: 16157, name: "중부경찰서교차로" },
    { lat: -23168, lng: 15255, name: "고송나루역교차로" },
    { lat: -26048, lng: 16751, name: "서부경찰서사거리" },
    { lat: -25617, lng: 16750, name: "과진고교차로" },
    { lat: -24254, lng: 15275, name: "심평원사거리" },
    { lat: -23947, lng: 15270, name: "송덕사거리" },
    { lat: -26749, lng: 16323, name: "당선초삼거리" },
    { lat: -29148, lng: 16684, name: "소장삼거리" },
    { lat: -29619, lng: 16270, name: "개항지역교차로" },
    { lat: -31369, lng: 16383, name: "오주 사거리" },
    { lat: -30813, lng: 16400, name: "약설사거리" },
    { lat: -32158, lng: 16385, name: "입동초입구 교차로" },
    { lat: -24571, lng: 19530, name: "유로초 사거리" },
    { lat: -28026, lng: 24196, name: "북구초 사거리" },
    { lat: -25716, lng: 25085, name: "북구청교차로" },
    { lat: -25006, lng: 24569, name: "빌리브 중수 사거리" },
    { lat: -26465, lng: 24569, name: "중수역교차로" },
    { lat: -24572, lng: 15795, name: "과성사거리" },
    { lat: -24574, lng: 16752, name: "과송역사거리" },
    { lat: -24570, lng: 16314, name: "칠라사거리" },
    { lat: -24833, lng: 21783, name: "효빈종합고사거리" },
    { lat: -28691, lng: 24206, name: "서신고입구 교차로" },
    { lat: -27573, lng: 24191, name: "남전동사거리" },
    { lat: -24586, lng: 14701, name: "보훈병원사거리" },
    { lat: -24576, lng: 18881, name: "시청북부사거리" },
    { lat: -24577, lng: 17314, name: "효빈예고사거리" },
    { lat: -24577, lng: 18304, name: "현대백화점 사거리" },
    { lat: -24578, lng: 15285, name: "청덕교차로" },
    { lat: -27003, lng: 24211, name: "오내역교차로" },
    { lat: -26305, lng: 24829, name: "법원사거리" },
    { lat: -24853, lng: 23903, name: "포산역교차로" },
    { lat: -24565, lng: 20873, name: "서노초 사거리" },
    { lat: -24574, lng: 19187, name: "고송여고 사거리" },
    { lat: -24829, lng: 22287, name: "입희초 사거리" },
    { lat: -24811, lng: 21348, name: "진희동 교차로" },
    { lat: -27833, lng: 19995, name: "고속터미널교차로" },
    { lat: -23937, lng: 19530, name: "소금초중학교 사거리" },
    { lat: -26414, lng: 20000, name: "신북효빈 사거리" },
    { lat: -28390, lng: 19953, name: "요소사거리" },
    { lat: -28390, lng: 18883, name: "효빈대병원사거리" },
    { lat: -27322, lng: 20008, name: "신세계백화점 효빈점 사거리" },
    { lat: -25783, lng: 19522, name: "북효빈역교차로" },
    { lat: -25102, lng: 19528, name: "동고송역 사거리" },
    { lat: -26967, lng: 20009, name: "고속버스터미널역 앞 교차로" },
    { lat: -26174, lng: 19813, name: "북효빈 삼거리" },
    { lat: -27943, lng: 21106, name: "개포초사거리" },
    { lat: -28068, lng: 29868, name: "당가역 사거리" },
    { lat: -28020, lng: 25630, name: "옥선대교차로" },
    { lat: -27516, lng: 16922, name: "서구청교차로" },
    { lat: -27594, lng: 18048, name: "효빈대학사거리" },
    { lat: -28005, lng: 22106, name: "오내주공1차 사거리" },
    { lat: -27722, lng: 18884, name: "당소사거리" },
    { lat: -28025, lng: 23184, name: "오내사거리" },
    { lat: -28101, lng: 30332, name: "신당가 교차로" },
    { lat: -28042, lng: 28044, name: "현대로템 효빈공장 사거리" },
    { lat: -25713, lng: 24569, name: "이마트 중수점 사거리" },
    { lat: -26382, lng: 21712, name: "신백천 사거리" },
    { lat: -26322, lng: 28590, name: "평전역 사거리" },
    { lat: -27445, lng: 21182, name: "북부공고사거리" },
    { lat: -27731, lng: 29870, name: "당안역 앞 교차로" },
    { lat: -28265, lng: 21056, name: "전천역교차로" },
    { lat: -26963, lng: 21318, name: "천왕사교차로" },
    { lat: -26683, lng: 21406, name: "백천역 사거리" },
    { lat: -25734, lng: 23776, name: "서도 사거리" },
    { lat: -30108, lng: 29837, name: "상가역 앞 교차로" },
    { lat: -33005, lng: 29829, name: "은염초 사거리" },
    { lat: -31070, lng: 29809, name: "신흑택 교차로" },
    { lat: -28713, lng: 29857, name: "안천경찰서 사거리" },
    { lat: -29317, lng: 29846, name: "하가역 사거리" },
    { lat: -28945, lng: 29852, name: "안천소방서 사거리" },
    { lat: -26650, lng: 29256, name: "신평전 사거리" },
    { lat: -31891, lng: 29821, name: "흑택초 사거리" },
    { lat: -36045, lng: 31999, name: "탄성공원 삼거리" },
    { lat: -25726, lng: 26640, name: "등기역교차로" },
    { lat: -36049, lng: 31253, name: "탄성소방서 교차로" },
    { lat: -36045, lng: 33703, name: "공리중 앞 삼거리" },
    { lat: -29287, lng: 24580, name: "산인초 사거리" },
    { lat: -33840, lng: 24595, name: "창전고 사거리" },
    { lat: -34702, lng: 24595, name: "마시초 앞 삼거리" },
    { lat: -33543, lng: 24595, name: "칠심중고 사거리" },
    { lat: -24340, lng: 24283, name: "포산교차로" },
    { lat: -27084, lng: 24569, name: "남중사거리" },
    { lat: -30297, lng: 24598, name: "나공중 사거리" },
    { lat: -31069, lng: 24606, name: "청엽삼각공원 사거리" },
    { lat: -31895, lng: 24601, name: "신악초 사거리" },
    { lat: -34067, lng: 24595, name: "창전중 사거리" },
    { lat: -32782, lng: 24595, name: "유류역 교차로" },
    { lat: -29779, lng: 24589, name: "시건초 사거리" },
    { lat: -25856, lng: 25637, name: "효빈일보사거리" },
    { lat: -29310, lng: 25574, name: "하성천역교차로" },
    { lat: -34304, lng: 25577, name: "창전구청교차로" },
    { lat: -28702, lng: 25593, name: "북택사거리" },
    { lat: -27571, lng: 25632, name: "식품단지사거리" },
    { lat: -35429, lng: 25544, name: "창전아쿠아3단지 삼거리" },
    { lat: -33547, lng: 25555, name: "은내중 사거리" },
    { lat: -26713, lng: 25634, name: "남전역교차로" },
    { lat: -24621, lng: 25641, name: "중수여고교차로" },
    { lat: -30159, lng: 25570, name: "우택초 사거리" },
    { lat: -31368, lng: 25566, name: "남우택역 사거리" },
    { lat: -31071, lng: 25567, name: "동구대학교입구 교차로" },
    { lat: -31895, lng: 25564, name: "우택고 사거리" },
    { lat: -30683, lng: 25568, name: "코스트코 효빈점 사거리" },
    { lat: -34600, lng: 25549, name: "국토안전관리원 효빈본부 사거리" },
    { lat: -34075, lng: 25552, name: "창전보건소 사거리" },
    { lat: -33049, lng: 25557, name: "오양초 사거리" },
    { lat: -32743, lng: 25559, name: "칠심역 사거리" },
    { lat: -29780, lng: 25572, name: "우택역교차로" },
    { lat: -28218, lng: 17102, name: "내성고사거리" },
    { lat: -28213, lng: 17770, name: "효빈성북문 삼거리" },
    { lat: -23592, lng: 15793, name: "건강보험공단역 사거리" },
    { lat: -26397, lng: 15801, name: "은안초사거리" },
    { lat: -26053, lng: 15800, name: "운진중사거리" },
    { lat: -25617, lng: 15798, name: "과진사거리" },
    { lat: -24258, lng: 15794, name: "북고교사거리" },
    { lat: -23953, lng: 15794, name: "서효빈사거리" },
    { lat: -23593, lng: 16754, name: "신고송 사거리" },
    { lat: -23653, lng: 18883, name: "고송해안교차로" },
    { lat: -23590, lng: 17331, name: "효빈애니메이션본부 본사 사거리" },
    { lat: -23579, lng: 17881, name: "아논초입구 교차로" },
    { lat: -23979, lng: 20462, name: "한신더휴진희 삼거리" },
    { lat: -23728, lng: 22032, name: "만초중 앞 삼거리" },
    { lat: -23030, lng: 17343, name: "고송2동중앙 사거리" },
    { lat: -22266, lng: 16369, name: "토모리해수욕장역 사거리" },
    { lat: -24262, lng: 16752, name: "고송중사거리" },
    { lat: -22921, lng: 16755, name: "구고송1동 네거리" },
    { lat: -24262, lng: 16313, name: "청덕고사거리" },
    { lat: -23956, lng: 16311, name: "재당초사거리" },
    { lat: -26391, lng: 18021, name: "당선역사거리" },
    { lat: -26378, lng: 22124, name: "청남중고입구 교차로" },
    { lat: -26384, lng: 19100, name: "청능초 사거리" },
    { lat: -26285, lng: 14720, name: "청덕해안삼거리" },
    { lat: -25932, lng: 13680, name: "청덕기지삼거리" },
    { lat: -26386, lng: 18437, name: "사대부고삼거리" },
    { lat: -26397, lng: 15288, name: "노도교차로" },
    { lat: -26081, lng: 14098, name: "청덕주공교차로" },
    { lat: -26390, lng: 20857, name: "이남고입구 교차로" },
    { lat: -26390, lng: 19523, name: "효빈교육대학교 사거리" },
    { lat: -29284, lng: 23334, name: "신덕현교차로" },
    { lat: -29962, lng: 21565, name: "동구청사거리" },
    { lat: -31701, lng: 19161, name: "배선병원 사거리" },
    { lat: -31703, lng: 19693, name: "이사초사거리" },
    { lat: -31693, lng: 17386, name: "장원초 사거리" },
    { lat: -31693, lng: 16902, name: "입빈중고입구 교차로" },
    { lat: -30806, lng: 20865, name: "새곡초 사거리" },
    { lat: -29946, lng: 22003, name: "덕현사거리" },
    { lat: -31699, lng: 18753, name: "동리중고 사거리" },
    { lat: -31697, lng: 18268, name: "입빈초입구 교차로" },
    { lat: -30276, lng: 21186, name: "가동사거리" },
    { lat: -29259, lng: 23595, name: "부선초 사거리" },
    { lat: -28945, lng: 28020, name: "수포역 사거리" },
    { lat: -31355, lng: 20868, name: "사노역 사거리" },
    { lat: -31695, lng: 17805, name: "장애인고용공단 효빈본부 사거리" },
    { lat: -33016, lng: 16815, name: "청엽외고 사거리" },
    { lat: -33305, lng: 16810, name: "엽월대 교차로" },
    { lat: -29328, lng: 26328, name: "북택역교차로" },
    { lat: -31689, lng: 20859, name: "비마오거리" },
    { lat: -32632, lng: 16821, name: "등동역교차로" },
    { lat: -28727, lng: 28032, name: "효빈 삼성반도체공장 사거리" },
    { lat: -29519, lng: 20810, name: "효빈동초 사거리" },
    { lat: -29672, lng: 20473, name: "효빈역전교차로" },
    { lat: -29718, lng: 19856, name: "효빈역서부사거리" },
    { lat: -29651, lng: 21312, name: "효빈역동부사거리" },
    { lat: -29391, lng: 22392, name: "전덕 사거리" },
    { lat: -28842, lng: 19902, name: "사능오거리" },
    { lat: -28605, lng: 20642, name: "에이치스코사거리" },
    { lat: -28673, lng: 19180, name: "사능복지관 사거리" },
    { lat: -28580, lng: 18118, name: "사능삼거리" },
    { lat: -28668, lng: 18894, name: "사능1가삼거리" },
    { lat: -26065, lng: 18020, name: "갤러리아 백화점 효빈점 사거리" },
    { lat: -25617, lng: 18020, name: "사회복지협의회사거리" },
    { lat: -25264, lng: 18019, name: "사복1동교차로" },
    { lat: -28661, lng: 18525, name: "교육청교차로" },
    { lat: -30527, lng: 19165, name: "신덕역교차로" },
    { lat: -29938, lng: 20969, name: "동여고교차로" },
    { lat: -29988, lng: 20621, name: "효빈역후문교차로" },
    { lat: -29569, lng: 19172, name: "내조역 사거리" },
    { lat: -29148, lng: 19176, name: "내조초입구 교차로" },
    { lat: -30218, lng: 19167, name: "중부소방서사거리" },
    { lat: -32429, lng: 19165, name: "남부중 사거리" },
    { lat: -30820, lng: 19162, name: "신동리 사거리" },
    { lat: -33509, lng: 19175, name: "광해공업공단 효빈본부 사거리" },
    { lat: -31370, lng: 19160, name: "동리역 사거리" },
    { lat: -32987, lng: 19170, name: "모카중 앞 삼거리" },
    { lat: -34107, lng: 19174, name: "마잡차량기지 사거리" },
    { lat: -29990, lng: 16738, name: "중앙교차로" },
    { lat: -31222, lng: 12729, name: "월천역북부교차로" },
    { lat: -29480, lng: 17932, name: "중구청교차로" },
    { lat: -29371, lng: 17473, name: "조유교차로" },
    { lat: -29702, lng: 16968, name: "중앙로역삼거리" },
    { lat: -30784, lng: 15120, name: "약맥역교차로" },
    { lat: -31197, lng: 13424, name: "십덕입구 교차로" },
    { lat: -31434, lng: 12520, name: "월천역남부교차로" },
    { lat: -30811, lng: 14868, name: "약맥초입구 교차로" },
    { lat: -29551, lng: 18782, name: "효빈성앞교차로" },
    { lat: -31755, lng: 12181, name: "항동문화회관역 앞 교차로" },
    { lat: -30312, lng: 16274, name: "창선역교차로" },
    { lat: -32246, lng: 6966, name: "해안초 사거리" },
    { lat: -32243, lng: 9879, name: "신신거 사거리" },
    { lat: -32245, lng: 8962, name: "어간중 사거리" },
    { lat: -32240, lng: 11527, name: "신운촌 사거리" },
    { lat: -30972, lng: 13729, name: "십덕 사거리" },
    { lat: -30861, lng: 14438, name: "다판고입구 교차로" },
    { lat: -32429, lng: 19689, name: "비마중 사거리" },
    { lat: -30815, lng: 19699, name: "단남초 사거리" },
    { lat: -33501, lng: 19685, name: "마잡역 교차로" },
    { lat: -31365, lng: 19695, name: "비마리유적지구 사거리" },
    { lat: -32980, lng: 19687, name: "색수초 사거리" },
    { lat: -34455, lng: 19686, name: "동곡초 사거리" },
    { lat: -34099, lng: 19685, name: "마잡중 사거리" },
    { lat: -30357, lng: 17749, name: "경동역 사거리" },
    { lat: -30444, lng: 17394, name: "구시청교차로" },
    { lat: -29982, lng: 17467, name: "중보교차로" },
    { lat: -30396, lng: 15118, name: "우이사거리" },
    { lat: -30344, lng: 15435, name: "창선중삼거리" },
    { lat: -30400, lng: 14872, name: "삼각중사거리" },
    { lat: -30250, lng: 18772, name: "궁정교차로" },
    { lat: -30329, lng: 18280, name: "리사역 사거리" },
    { lat: -30067, lng: 15957, name: "창선사거리" },
    { lat: -30446, lng: 13329, name: "내항역교차로" },
    { lat: -30412, lng: 13727, name: "내항시장사거리" },
    { lat: -30407, lng: 14443, name: "고도역교차로" },
    { lat: -30044, lng: 17847, name: "중동교차로" },
    { lat: -32440, lng: 17382, name: "슈퍼스타 아파트 교차로" },
    { lat: -31233, lng: 17389, name: "관광공사교차로" },
    { lat: -30818, lng: 17392, name: "오석역교차로" },
    { lat: -33512, lng: 17594, name: "효빈산단 마잡지구 교차로" },
    { lat: -30583, lng: 17393, name: "구시청앞 사거리" },
    { lat: -33005, lng: 17596, name: "등동 오거리" },
    { lat: -33897, lng: 17594, name: "신헌이송 교차로" },
    { lat: -32451, lng: 22285, name: "청엽구민공원 사거리" },
    { lat: -32488, lng: 23326, name: "토포초 사거리" },
    { lat: -33539, lng: 24309, name: "창전역 사거리" },
    { lat: -32436, lng: 14853, name: "효빈공단역 앞 교차로" },
    { lat: -32427, lng: 18261, name: "남효빈세무서 삼거리" },
    { lat: -32484, lng: 12727, name: "박산중고등학교 삼거리" },
    { lat: -32482, lng: 13408, name: "신흥역 앞 교차로" },
    { lat: -32442, lng: 7307, name: "어간해수욕장로터리" },
    { lat: -32466, lng: 9879, name: "신거 사거리" },
    { lat: -32474, lng: 10691, name: "평운역 사거리" },
    { lat: -32440, lng: 15385, name: "등동중고등학교입구 교차로" },
    { lat: -34928, lng: 26338, name: "생덕초입구 교차로" },
    { lat: -34072, lng: 25143, name: "오아초 사거리" },
    { lat: -32438, lng: 20865, name: "비마역 사거리" },
    { lat: -32692, lng: 23755, name: "우전역 로터리" },
    { lat: -32458, lng: 8962, name: "배고 사거리" },
    { lat: -32483, lng: 11815, name: "운촌 사거리" },
    { lat: -32485, lng: 12251, name: "박산역교차로" },
    { lat: -32453, lng: 8537, name: "효빈세무서 사거리" },
    { lat: -32449, lng: 8106, name: "어간3동 교차로" },
    { lat: -36352, lng: 27926, name: "고무푸르지오 사거리" },
    { lat: -37180, lng: 32975, name: "미성사거리" },
    { lat: -35846, lng: 27939, name: "고무역 사거리" },
    { lat: -36657, lng: 28242, name: "고무초 사거리" },
    { lat: -37168, lng: 29735, name: "탄성경찰서 사거리" },
    { lat: -37160, lng: 31905, name: "미성초 사거리" },
    { lat: -37206, lng: 33662, name: "공리초입구 교차로" },
    { lat: -28712, lng: 22112, name: "전천중 사거리" },
    { lat: -27559, lng: 22103, name: "오내고등학교입구 교차로" },
    { lat: -25114, lng: 21953, name: "운동장사거리" },
    { lat: -24265, lng: 21243, name: "잠선초입구 교차로" },
    { lat: -28435, lng: 22110, name: "선자대학교 사거리" },
    { lat: -26960, lng: 22114, name: "오내고등학교입구 교차로" },
    { lat: -26683, lng: 22119, name: "입희 사거리" },
    { lat: -28637, lng: 21017, name: "보몽역사거리" },
    { lat: -28665, lng: 23333, name: "효빈정보고 사거리" },
    { lat: -27212, lng: 19105, name: "부설초삼거리" },
    { lat: -26970, lng: 19104, name: "소조역삼거리" },
    { lat: -27370, lng: 20513, name: "해서중사거리" },
    { lat: -27745, lng: 28088, name: "신영역 사거리" },
    { lat: -27580, lng: 23504, name: "소창고 사거리" },
    { lat: -28228, lng: 38202, name: "이자역 교차로" },
    { lat: -27731, lng: 31239, name: "당가고 사거리" },
    { lat: -28326, lng: 39285, name: "신정치 교차로" },
    { lat: -27734, lng: 31870, name: "안천우체국 사거리" },
    { lat: -27740, lng: 33218, name: "성택대 앞 삼거리" },
    { lat: -27949, lng: 35707, name: "원각교차로" },
    { lat: -28146, lng: 36433, name: "리의역 교차로" },
    { lat: -28342, lng: 39758, name: "영색무역 앞 교차로" },
    { lat: -28213, lng: 37066, name: "효빈지방국세청 사거리" },
    { lat: -28222, lng: 37744, name: "이자여중 삼거리" },
    { lat: -27573, lng: 26640, name: "정부청사교차로" },
    { lat: -29652, lng: 46422, name: "아환 교차로" },
    { lat: -25617, lng: 14713, name: "해총대사거리" },
    { lat: -24254, lng: 14698, name: "오선사거리" },
    { lat: -22511, lng: 15710, name: "토모리해수욕장사거리" },
    { lat: -25312, lng: 14709, name: "중촌대사거리" },
    { lat: -25904, lng: 14716, name: "화환사거리" },
    { lat: -24880, lng: 14704, name: "서여고사거리" },
    { lat: -26060, lng: 18872, name: "소조중 사거리" },
    { lat: -26067, lng: 18438, name: "당선 사거리" },
    { lat: -26056, lng: 17325, name: "사복 사거리" },
    { lat: -26057, lng: 15282, name: "히스트사거리" },
    { lat: -25619, lng: 13669, name: "청덕공원역교차로" },
    { lat: -25615, lng: 18875, name: "청능 사거리" },
    { lat: -25616, lng: 18439, name: "연금공단삼거리" },
    { lat: -25617, lng: 17322, name: "사복역사거리" },
    { lat: -25617, lng: 15291, name: "신북중사거리" },
    { lat: -25617, lng: 14103, name: "청덕중앙사거리" },
    { lat: -25649, lng: 19186, name: "청능역 사거리" },
    { lat: -25104, lng: 17872, name: "애니플러스사거리" },
    { lat: -25124, lng: 23787, name: "포산중삼거리" },
    { lat: -25115, lng: 20868, name: "진희역교차로" },
    { lat: -25105, lng: 20021, name: "효빈제일초중고등학교 사거리" },
    { lat: -25110, lng: 20462, name: "진희 사거리" },
    { lat: -25102, lng: 19187, name: "신동고송 사거리" },
    { lat: -23951, lng: 18882, name: "효빈광역시도시공사 사거리" },
    { lat: -25267, lng: 17319, name: "복지대사거리" },
    { lat: -24254, lng: 17877, name: "고송교차로역 앞 교차로" },
    { lat: -24848, lng: 14110, name: "효빈서중교차로" },
    { lat: -24251, lng: 20031, name: "효빈북여자중고등학교 사거리" },
    { lat: -24252, lng: 19188, name: "효빈덕북지방우정청 사거리" },
    { lat: -23945, lng: 19189, name: "고송고 사거리" },
    { lat: -22913, lng: 15730, name: "신고송나루 사거리" },
    { lat: -22912, lng: 16367, name: "이달사거리" },
    { lat: -25300, lng: 15293, name: "과진중앙역교차로" },
    { lat: -25304, lng: 14106, name: "다이버시티사거리" },
    { lat: -26748, lng: 15982, name: "당선중삼거리" },
    { lat: -29326, lng: 17239, name: "주수교차로" },
    { lat: -31369, lng: 16899, name: "효빈동신도시교차로" },
    { lat: -30816, lng: 16893, name: "효빈상고교차로" },
    { lat: -30510, lng: 16889, name: "한은교차로" },
    { lat: -30027, lng: 15310, name: "심동교차로" },
    { lat: -30048, lng: 12717, name: "내항삼거리" },
    { lat: -30051, lng: 14875, name: "효빈지방병무청 사거리" },
    { lat: -30044, lng: 13269, name: "내항기지사거리" },
    { lat: -30043, lng: 13726, name: "만마루교차로" },
    { lat: -30048, lng: 14446, name: "고도사거리" },
    { lat: -31198, lng: 15123, name: "내성학교입구 교차로" },
    { lat: -31763, lng: 15126, name: "내성학교사거리" },
    { lat: -30810, lng: 16181, name: "삼각 사거리" },
    { lat: -31061, lng: 18273, name: "장원역 사거리" },
    { lat: -31115, lng: 17807, name: "남전공원 사거리" },
    { lat: -31194, lng: 14181, name: "언어중 사거리" },
    { lat: -30794, lng: 22296, name: "청엽역 사거리" },
    { lat: -30823, lng: 18765, name: "동리입구교차로" },
    { lat: -30822, lng: 18276, name: "리사초입구 교차로" },
    { lat: -30820, lng: 17808, name: "경동 사거리" },
    { lat: -30802, lng: 21344, name: "홈플러스 사노점 사거리" },
    { lat: -34807, lng: 21326, name: "투자역 사거리" },
    { lat: -33466, lng: 21851, name: "신괴초 사거리" },
    { lat: -29790, lng: 21815, name: "덕현역교차로" },
    { lat: -30189, lng: 22231, name: "사강당역교차로" },
    { lat: -31495, lng: 22292, name: "청엽구청교차로" },
    { lat: -32962, lng: 22256, name: "남부시외버스터미널 사거리" },
    { lat: -34453, lng: 21326, name: "투자초중학교 사거리" },
    { lat: -34073, lng: 21322, name: "동곡 교차로" },
    { lat: -31025, lng: 22296, name: "청엽우체국 사거리" },
    { lat: -35553, lng: 21327, name: "신투자 교차로" },
    { lat: -34808, lng: 22985, name: "신팔교차로" },
    { lat: -33524, lng: 23323, name: "사곡초 사거리" },
    { lat: -30421, lng: 23332, name: "모산중 사거리" },
    { lat: -31022, lng: 23330, name: "청빈중고등학교 앞 삼거리" },
    { lat: -31779, lng: 23328, name: "아논타워 사거리" },
    { lat: -34307, lng: 23321, name: "쌍창사거리" },
    { lat: -31504, lng: 23329, name: "애포초 앞 삼거리" },
    { lat: -34055, lng: 23322, name: "월삼초 사거리" },
    { lat: -30098, lng: 23333, name: "산군초 사거리" },
    { lat: -33076, lng: 23324, name: "엽천역 사거리" },
    { lat: -35541, lng: 22993, name: "팔조공단 교차로" },
    { lat: -34808, lng: 20870, name: "월삼중고등학교 사거리" },
    { lat: -34803, lng: 22615, name: "팔조초 사거리" },
    { lat: -34810, lng: 20304, name: "토우사거리" },
    { lat: -34805, lng: 21962, name: "내산초 사거리" },
    { lat: -35009, lng: 24976, name: "창전아쿠아2단지 삼거리" },
    { lat: -36476, lng: 26592, name: "구고무리 네거리" },
    { lat: -37712, lng: 32685, name: "야진입구교차로" },
    { lat: -35859, lng: 26237, name: "광정동 교차로" },
    { lat: -37693, lng: 28266, name: "무성사거리" },
    { lat: -37684, lng: 29747, name: "명무사거리" },
    { lat: -37704, lng: 31929, name: "탄성상고삼거리" },
    { lat: -33489, lng: 22882, name: "신쌍엽 교차로" },
    { lat: -33512, lng: 17084, name: "석유관리원 삼거리" },
    { lat: -33539, lng: 26334, name: "회계초 사거리" },
    { lat: -33482, lng: 20868, name: "서증초 사거리" },
    { lat: -33531, lng: 27116, name: "가스기술공사 효빈본부 삼거리" },
    { lat: -33512, lng: 18855, name: "마잡1동 사거리" },
    { lat: -33512, lng: 18210, name: "헌이송역 교차로" },
    { lat: -32152, lng: 14503, name: "진월천역 앞 교차로" },
    { lat: -34118, lng: 13390, name: "HD현대중공업입구 교차로" },
    { lat: -37307, lng: 9869, name: "평당한진스카이뷰2차입구 교차로" },
    { lat: -36810, lng: 10691, name: "부한입구 교차로" },
    { lat: -38202, lng: 7422, name: "곽암초 사거리" },
    { lat: -37520, lng: 9519, name: "효빈기계공고 사거리" },
    { lat: -38190, lng: 8275, name: "한양아이클래스곽산 사거리" },
    { lat: -37862, lng: 8957, name: "효빈기계공고입구 교차로" },
    { lat: -36414, lng: 11348, name: "앵판초 사거리" },
    { lat: -33253, lng: 14506, name: "한국산업인력공단 교차로" },
    { lat: -34105, lng: 11827, name: "남구초 사거리" },
    { lat: -32999, lng: 14505, name: "소궁공원 사거리" },
    { lat: -32624, lng: 14504, name: "이마트 월천점 사거리" },
    { lat: -34111, lng: 12519, name: "이파공원교차로" },
    { lat: -28775, lng: 2626, name: "항동중 사거리" },
    { lat: -28370, lng: 1255, name: "효빈 출입국 외국인청 사거리" },
    { lat: -31283, lng: 9881, name: "효빈항역교차로" },
    { lat: -30607, lng: 8962, name: "항만해변 사거리" },
    { lat: -29398, lng: 6746, name: "희산공업 제2공장 교차로" },
    { lat: -28929, lng: 3404, name: "회주공업 효빈항 공업소입구 교차로" },
    { lat: -29265, lng: 5341, name: "항동해안아파트 삼거리" },
    { lat: -28414, lng: 2314, name: "효빈항국제여객터미널입구 교차로" },
    { lat: -29122, lng: 4599, name: "cj재일제당 효빈1공장 사거리" },
    { lat: -30079, lng: 7881, name: "항4동 교차로" },
    { lat: -31765, lng: 14859, name: "진월천 공단 사거리" },
    { lat: -32149, lng: 14200, name: "진월천 사거리" },
    { lat: -32125, lng: 12210, name: "신박산 교차로" },
    { lat: -31373, lng: 18757, name: "동리동사무소 사거리" },
    { lat: -31378, lng: 18271, name: "심녕초 사거리" },
    { lat: -29286, lng: 18517, name: "효빈박물관 사거리" },
    { lat: -28523, lng: 22923, name: "전천중앙역교차로" },
    { lat: -26964, lng: 20877, name: "천왕사중고 앞" },
    { lat: -26969, lng: 19529, name: "소조 사거리" },
    { lat: -26680, lng: 23758, name: "북부경찰서사거리" },
    { lat: -26550, lng: 25300, name: "남전고삼거리" },
    { lat: -26831, lng: 26640, name: "채산교차로" },
    { lat: -24416, lng: 24918, name: "카스미해안삼거리" },
    { lat: -24798, lng: 26640, name: "중수해안교차로" },
    { lat: -30335, lng: 24102, name: "매남초입구 교차로" },
    { lat: -30134, lng: 26329, name: "하구초중학교 앞" },
    { lat: -30102, lng: 28026, name: "효빈광역시 소방학교 사거리" },
    { lat: -31070, lng: 24966, name: "사온초 사거리" },
    { lat: -31124, lng: 37732, name: "신앵내 교차로" },
    { lat: -28849, lng: 38094, name: "이자공원역 교차로" },
    { lat: -32965, lng: 33548, name: "도변역교차로" },
    { lat: -29319, lng: 37915, name: "교신초 앞 삼거리" },
    { lat: -32618, lng: 35694, name: "잠재역 사거리" },
    { lat: -31902, lng: 26738, name: "진백역 교차로" },
    { lat: -30740, lng: 24320, name: "청엽국제학교역 사거리" },
    { lat: -31717, lng: 26331, name: "진백중고등학교 사거리" },
    { lat: -32934, lng: 29071, name: "흑택주공1차 사거리" },
    { lat: -32577, lng: 27727, name: "진백동 삼거리" },
    { lat: -32310, lng: 27327, name: "시로역 교차로" },
    { lat: -29784, lng: 23843, name: "동덕현교차로" },
    { lat: -32768, lng: 28037, name: "광정초중학교 사거리" },
    { lat: -32979, lng: 31181, name: "루비역 사거리" },
    { lat: -32996, lng: 30327, name: "루비역 앞 교차로" },
    { lat: -32815, lng: 35112, name: "도변초 사거리" },
    { lat: -32135, lng: 36573, name: "앵성교차로" },
    { lat: -27506, lng: 38746, name: "포성초 사거리" },
    { lat: -30305, lng: 37741, name: "신선초 사거리" },
    { lat: -27076, lng: 39051, name: "서수역 앞 교차로" },
    { lat: -27069, lng: 44075, name: "이와초 사거리" },
    { lat: -28590, lng: 38089, name: "이자중앙사거리" },
    { lat: -26196, lng: 42988, name: "천가역 사거리" },
    { lat: -27905, lng: 38433, name: "포성초 사거리" },
    { lat: -27901, lng: 44087, name: "이와리 교차로" },
    { lat: -25634, lng: 40468, name: "소원역 앞 교차로" },
    { lat: -25600, lng: 41576, name: "소원리 교차로" },
    { lat: -26494, lng: 44112, name: "천가리 삼거리" },
    { lat: -25905, lng: 42422, name: "천가초 앞 삼거리" },
    { lat: -31749, lng: 37653, name: "효빈가정법원 삼거리" },
    { lat: -31883, lng: 37147, name: "앵내역 삼거리" },
    { lat: -29840, lng: 37747, name: "탄자역 삼거리" },
    { lat: -31060, lng: 31883, name: "성천병원 사거리" },
    { lat: -31059, lng: 32716, name: "요우중입구 교차로" },
    { lat: -31067, lng: 23818, name: "안곡초 사거리" },
    { lat: -31073, lng: 26331, name: "동구대학교입구 교차로" },
    { lat: -31076, lng: 28030, name: "진백산단 사거리" },
    { lat: -31109, lng: 35102, name: "효빈예술대 사거리" },
    { lat: -31126, lng: 36697, name: "효빈인재개발원 사거리" },
    { lat: -31122, lng: 39294, name: "안천정보고 사거리" },
    { lat: -31121, lng: 40036, name: "전추리 교차로" },
    { lat: -28333, lng: 31221, name: "안천역 사거리" },
    { lat: -28884, lng: 31874, name: "안천구청사거리" },
    { lat: -29422, lng: 33216, name: "팔망성중 사거리" },
    { lat: -28949, lng: 35699, name: "이자출장소역 사거리" },
    { lat: -28833, lng: 35987, name: "신이자출장소 교차로" },
    { lat: -28765, lng: 30413, name: "당가초입구 교차로" },
    { lat: -28901, lng: 31010, name: "시택초입구 교차로" },
    { lat: -28274, lng: 31872, name: "안천고 사거리" },
    { lat: -28285, lng: 33217, name: "타천역 사거리" },
    { lat: -29395, lng: 31876, name: "성공초 앞 삼거리" },
    { lat: -30014, lng: 31879, name: "제택고 사거리" },
    { lat: -30350, lng: 32563, name: "팔망성고입구 교차로" },
    { lat: -33903, lng: 34658, name: "포성산역입구 삼거리" },
    { lat: -31913, lng: 32864, name: "요우역 사거리" },
    { lat: -33269, lng: 33893, name: "도변고입구 교차로" },
    { lat: -31620, lng: 32812, name: "요우역 앞 교차로" },
    { lat: -30145, lng: 33215, name: "악부동 사거리" },
    { lat: -29332, lng: 35839, name: "이십기동사거리" },
    { lat: -29560, lng: 35094, name: "추자역 삼거리" },
    { lat: -29384, lng: 36682, name: "안천과학고 앞 삼거리" },
    { lat: -33525, lng: 35116, name: "포성산 교차로" },
    { lat: -27506, lng: 35714, name: "리의초입구 교차로" },
    { lat: -33259, lng: 35697, name: "신잠재 교차로" },
    { lat: -30298, lng: 35811, name: "창건초 앞 삼거리" },
    { lat: -27081, lng: 35721, name: "이자여고 앞 삼거리" },
    { lat: -31620, lng: 9880, name: "신운양 사거리" },
    { lat: -31634, lng: 8542, name: "어두아파트 사거리" },
    { lat: -31602, lng: 8099, name: "어간2동 교차로" },
    { lat: -31312, lng: 6995, name: "어간수산시장입구 교차로" },
    { lat: -30649, lng: 5962, name: "어간중앙역 앞 교차로" },
    { lat: -29238, lng: 3397, name: "항동1가입구 교차로" },
    { lat: -29505, lng: 3711, name: "항동1가 사거리" },
    { lat: -30181, lng: 5197, name: "어간역 사거리" },
    { lat: -29993, lng: 4632, name: "항구초입구 교차로" },
    { lat: -31582, lng: 7797, name: "명주공원 사거리" },
    { lat: -30997, lng: 6487, name: "어간여고입구 교차로" },
    { lat: -31759, lng: 12731, name: "동신 사거리" },
    { lat: -31761, lng: 13416, name: "월천오거리" },
    { lat: -31763, lng: 14152, name: "박월고 사거리" },
    { lat: -31893, lng: 29052, name: "흑택중 사거리" },
    { lat: -31375, lng: 21564, name: "송엽상고입구 교차로" },
    { lat: -31916, lng: 28033, name: "시로중고등학교 사거리" },
    { lat: -31904, lng: 31170, name: "빙과호 사거리" },
    { lat: -31890, lng: 30310, name: "루비초입구 교차로" },
    { lat: -26172, lng: 20859, name: "입선 사거리" },
    { lat: -26172, lng: 20587, name: "청능도매시장 사거리" },
    { lat: -32981, lng: 13403, name: "한화솔루션 효빈공장 사거리" },
    { lat: -36795, lng: 7429, name: "곽산해안사거리" },
    { lat: -36123, lng: 7862, name: "평당4동 교차로" },
    { lat: -35449, lng: 7864, name: "해운산업지구 사거리" },
    { lat: -35760, lng: 7861, name: "평당기지입구 교차로" },
    { lat: -31674, lng: 6060, name: "엽월대병원 교차로" },
    { lat: -30334, lng: 3373, name: "종람초 교차로" },
    { lat: -29496, lng: 2852, name: "항2동 교차로" },
    { lat: -29110, lng: 2295, name: "서남지방해양경찰청 사거리" },
    { lat: -30513, lng: 4054, name: "토장병원입구 교차로" },
    { lat: -37977, lng: 9868, name: "기계산단교차로" },
    { lat: -33689, lng: 9876, name: "주오 사거리" },
    { lat: -36441, lng: 9871, name: "남부소방서 사거리" },
    { lat: -36129, lng: 9872, name: "평당7동 교차로" },
    { lat: -35113, lng: 9874, name: "간자초 사거리" },
    { lat: -35757, lng: 9872, name: "평당초 사거리" },
    { lat: -34869, lng: 9874, name: "남효빈우체국 사거리" },
    { lat: -34551, lng: 9875, name: "한국주택금융공사 사거리" },
    { lat: -34108, lng: 9875, name: "효빈남부경찰서 사거리" },
    { lat: -33238, lng: 9877, name: "남구보건소 사거리" },
    { lat: -33872, lng: 9876, name: "남구청 사거리" },
    { lat: -32762, lng: 9878, name: "효천고 사거리" },
    { lat: -31896, lng: 9880, name: "운양역교차로" },
    { lat: -33693, lng: 10691, name: "빙천역교차로" },
    { lat: -38711, lng: 8240, name: "곽산우리아파트 사거리" },
    { lat: -39201, lng: 8208, name: "곽산1동 교차로" },
    { lat: -39552, lng: 7627, name: "평언중입구 교차로" },
    { lat: -36437, lng: 10691, name: "부한 사거리" },
    { lat: -35446, lng: 10691, name: "평산초 사거리" },
    { lat: -35113, lng: 10691, name: "남구선관위 사거리" },
    { lat: -34863, lng: 10691, name: "대택아파트 사거리" },
    { lat: -34556, lng: 10691, name: "효빈과학대학교 사거리" },
    { lat: -34108, lng: 10691, name: "평당고 사거리" },
    { lat: -33240, lng: 10691, name: "애마초 사거리" },
    { lat: -33547, lng: 10691, name: "평당중 사거리" },
    { lat: -32766, lng: 10691, name: "신운양중앙 사거리" },
    { lat: -34457, lng: 22987, name: "쌍엽중앙로터리" },
    { lat: -33021, lng: 16433, name: "등동주공 교차로" },
    { lat: -32968, lng: 20867, name: "색수고 사거리" },
    { lat: -32630, lng: 15390, name: "입동입구 사거리" },
    { lat: -34458, lng: 18323, name: "헌이송초입구 교차로" },
    { lat: -34326, lng: 26335, name: "동자초 사거리" },
    { lat: -34453, lng: 20870, name: "마린시티 사거리" },
    { lat: -34358, lng: 26982, name: "광정동 교차로" },
    { lat: -34451, lng: 22617, name: "쌍엽중고등학교 사거리" },
    { lat: -34454, lng: 20311, name: "동곡아파트 삼거리" },
    { lat: -34452, lng: 21961, name: "쌍엽여중고 사거리" },
    { lat: -35199, lng: 28984, name: "전중공원 사거리" },
    { lat: -35876, lng: 22608, name: "팔조중 사거리" },
    { lat: -36468, lng: 21968, name: "팔조차량기지 교차로" },
    { lat: -32631, lng: 16012, name: "입동역교차로" },
    { lat: -33685, lng: 8961, name: "평당장애인복지관 사거리" },
    { lat: -33696, lng: 11345, name: "고당 사거리" },
    { lat: -33710, lng: 11824, name: "고당역교차로" },
    { lat: -32616, lng: 13687, name: "신흥역교차로" },
    { lat: -33279, lng: 12514, name: "사야 사거리" },
    { lat: -30684, lng: 26330, name: "진백초 사거리" },
    { lat: -30688, lng: 28028, name: "낭진사거리" },
    { lat: -34082, lng: 26335, name: "홈플러스 창전점 사거리" },
    { lat: -32721, lng: 26333, name: "회전초입구 교차로" },
    { lat: -29791, lng: 26329, name: "치구역 사거리" },
    { lat: -34080, lng: 20869, name: "산원초 사거리" },
    { lat: -34089, lng: 27128, name: "한국교통안전공단 효빈본부 사거리" },
    { lat: -31644, lng: 29047, name: "광연대교차로" },
    { lat: -34052, lng: 22620, name: "늑동교차로" },
    { lat: -33866, lng: 28041, name: "창전상고 앞 삼거리" },
    { lat: -34112, lng: 18852, name: "헌이송중고등학교 사거리" },
    { lat: -34123, lng: 18211, name: "신지초 사거리" },
    { lat: -31605, lng: 21413, name: "청엽병원 사거리" },
    { lat: -31934, lng: 21520, name: "어장고입구 교차로" },
    { lat: -32811, lng: 26950, name: "신시로 교차로" },
    { lat: -33635, lng: 22623, name: "쌍엽역 교차로" },
    { lat: -35219, lng: 22612, name: "오아중 사거리" },
    { lat: -35551, lng: 21965, name: "신팔조 교차로" },
    { lat: -35883, lng: 21966, name: "팔조역 사거리" },
    { lat: -29498, lng: 28024, name: "뇌전역 사거리" },
    { lat: -38724, lng: 7420, name: "곽암해수욕장역 사거리" },
    { lat: -39185, lng: 7417, name: "곽산초 사거리" },
    { lat: -37523, lng: 8274, name: "이베리안아파트 사거리" },
    { lat: -37521, lng: 8957, name: "곽산하브아파트 사거리" },
    { lat: -37524, lng: 7816, name: "곽산입구 교차로" },
    { lat: -36800, lng: 8272, name: "회산입구 교차로" },
    { lat: -36799, lng: 8958, name: "곽산중 사거리" },
    { lat: -36800, lng: 7841, name: "평당회산시장 사거리" },
    { lat: -36445, lng: 8958, name: "곽산고입구 교차로" },
    { lat: -35965, lng: 8958, name: "남당 사거리" },
    { lat: -35448, lng: 8959, name: "롯데백화점 평당점 사거리" },
    { lat: -36131, lng: 8958, name: "평당하브아파트 사거리" },
    { lat: -35113, lng: 8959, name: "어신중 사거리" },
    { lat: -35759, lng: 8959, name: "효빈예술문화회관 사거리" },
    { lat: -34875, lng: 8960, name: "어신중입구 교차로" },
    { lat: -34545, lng: 8960, name: "호르아파트 사거리" },
    { lat: -34108, lng: 8960, name: "북평단 사거리" },
    { lat: -32758, lng: 8962, name: "선찬초 사거리" },
    { lat: -31888, lng: 8963, name: "효빈의료원 사거리" },
    { lat: -31314, lng: 8963, name: "산홍입구 교차로" },
    { lat: -35445, lng: 11347, name: "평당6동주민센터 사거리" },
    { lat: -35448, lng: 8517, name: "삼선초 사거리" },
    { lat: -35113, lng: 11347, name: "소안고 사거리" },
    { lat: -35755, lng: 11347, name: "평남중 사거리" },
    { lat: -33242, lng: 11345, name: "효빈남초 사거리" },
    { lat: -36132, lng: 8513, name: "회산 사거리" },
    { lat: -35113, lng: 8519, name: "데시안아파트 사거리" },
    { lat: -35759, lng: 8515, name: "남당입구 교차로" },
    { lat: -34543, lng: 8523, name: "이부 사거리" },
    { lat: -34108, lng: 9294, name: "상원대초 사거리" },
    { lat: -33244, lng: 11821, name: "효빈남고 사거리" },
    { lat: -33233, lng: 8532, name: "주곡 사거리" },
    { lat: -33252, lng: 14155, name: "금호타이어효빈공장 사거리" },
    { lat: -32976, lng: 12512, name: "신사야 사거리" },
    { lat: -32608, lng: 12509, name: "박산 사거리" },
    { lat: -32756, lng: 8535, name: "세무지구 사거리" },
    { lat: -31885, lng: 8540, name: "어간항입구 교차로" },
    { lat: -31695, lng: 6970, name: "효빈해양대1캠퍼스 사거리" },
    { lat: -31701, lng: 6494, name: "어간항 사거리" },
    { lat: -31316, lng: 8544, name: "어간고 사거리" },
    { lat: -30611, lng: 8548, name: "항만해변역사거리" },
    { lat: -31327, lng: 6016, name: "효빈보건대 사거리" },
    { lat: -31330, lng: 5202, name: "한국폴리텍8대학 사거리" },
    { lat: -31324, lng: 6490, name: "어간여고 사거리" },
    { lat: -29886, lng: 6416, name: "항동남서 사거리" },
    { lat: -29640, lng: 4523, name: "하림 효빈1공장 사거리" },
    { lat: -30791, lng: 5200, name: "신어간 사거리" },
    { lat: -30492, lng: 5198, name: "어간역 앞 교차로" },
    { lat: -29696, lng: 6982, name: "항3동사무소 교차로" },
    { lat: -30753, lng: 6976, name: "어간초 사거리" },
    { lat: -30616, lng: 7802, name: "고관초 사거리" },
    { lat: -24433, lng: 22289, name: "진희초중학교입구 교차로" },
    { lat: -33277, lng: 31186, name: "신루비 교차로" },
    { lat: -33768, lng: 31649, name: "누상삼거리" },
    { lat: -39622, lng: 31717, name: "서목고 앞 삼거리" },
    { lat: -36370, lng: 29716, name: "탄성고 사거리" },
    { lat: -36692, lng: 32993, name: "탄성보건소 사거리" },
    { lat: -39271, lng: 31939, name: "서목주공2차 삼거리" },
    { lat: -38573, lng: 32380, name: "중신교차로" },
    { lat: -39858, lng: 31534, name: "서목역 사거리" },
    { lat: -40591, lng: 30675, name: "승남리 삼거리" },
    { lat: -40646, lng: 29908, name: "승남해수욕장역 삼거리" },
    { lat: -32121, lng: 35108, name: "잠재리중앙 교차로" },
    { lat: -31648, lng: 35105, name: "치고대 사거리" },
    { lat: -32136, lng: 39270, name: "요우앵내이자 사거리" },
    { lat: -32132, lng: 38077, name: "앵내초 사거리" },
    { lat: -32130, lng: 37462, name: "앵내고 사거리" },
    { lat: -30301, lng: 36707, name: "이자고 사거리" },
    { lat: -30311, lng: 39289, name: "군선초입구 교차로" },
    { lat: -27506, lng: 36407, name: "농산교차로" },
    { lat: -28565, lng: 39273, name: "정치역 사거리" },
    { lat: -27905, lng: 39063, name: "서수중 사거리" },
    { lat: -27506, lng: 37070, name: "안천교육지원청 사거리" },
    { lat: -27506, lng: 37758, name: "이자중 사거리" },
    { lat: -32654, lng: 38194, name: "앵내중 사거리" },
    { lat: -29836, lng: 39285, name: "탄자중 사거리" },
    { lat: -27080, lng: 36389, name: "개추사거리" },
    { lat: -27071, lng: 42992, name: "이와 교차로" },
    { lat: -27079, lng: 37072, name: "효빈대이자캠퍼스 삼거리" },
    { lat: -27078, lng: 37767, name: "대석교차로" },
    { lat: -27068, lng: 44921, name: "고해초 사거리" },
    { lat: -27066, lng: 46429, name: "은진원사거리" },
    { lat: -25620, lng: 36164, name: "소원IC 교차로" },
    { lat: -27904, lng: 40414, name: "영색무초 사거리" },
    { lat: -28612, lng: 37064, name: "과남역입구 삼거리" },
    { lat: -26747, lng: 42991, name: "이와주공 삼거리" },
    { lat: -25485, lng: 42986, name: "천가중 사거리" },
    { lat: -27906, lng: 37068, name: "을신교차로" },
    { lat: -27906, lng: 37750, name: "태택초 사거리" },
    { lat: -27904, lng: 39639, name: "영색무중 앞 삼거리" },
    { lat: -27901, lng: 44944, name: "고해역 사거리" },
    { lat: -27902, lng: 42996, name: "구이와리 네거리" },
    { lat: -27900, lng: 46429, name: "구은진원리 네거리" },
    { lat: -27598, lng: 49348, name: "익목리 사거리" },
    { lat: -26724, lng: 39962, name: "소원초 앞 삼거리" },
    { lat: -25993, lng: 44110, name: "고해주공 사거리" },
    { lat: -25492, lng: 44109, name: "정명초입구 교차로" },
    { lat: -25029, lng: 42195, name: "신천가리 나들목" },
    { lat: -34070, lng: 28989, name: "마시말목장 교차로" },
    { lat: -37086, lng: 28252, name: "고무통사거리" },
    { lat: -36701, lng: 31594, name: "탄성초삼거리" },
    { lat: -36554, lng: 33685, name: "공리 사거리" },
    { lat: -38471, lng: 31194, name: "성규리 삼거리" },
    { lat: -38979, lng: 31623, name: "성규초 삼거리" },
    { lat: -38546, lng: 32064, name: "성규리중앙 교차로" },
    { lat: -39410, lng: 33111, name: "서목초 사거리" },
    { lat: -40184, lng: 32648, name: "서목읍사무소 삼거리" },
    { lat: -40522, lng: 33431, name: "탄성과학고입구 교차로" },
    { lat: -41258, lng: 30845, name: "입리 사거리" },
    { lat: -41284, lng: 29913, name: "승남중 사거리" },
    { lat: -33368, lng: 36574, name: "효빈IC" },
    { lat: -30085, lng: 41656, name: "이자IC" },
    { lat: -25408, lng: 30637, name: "곡진IC" },
    { lat: -23944, lng: 43081, name: "고해IC" },
    { lat: -25774, lng: 46956, name: "도향IC" },
    { lat: -28724, lng: 57805, name: "누산교차로" },
    { lat: -28979, lng: 49624, name: "분음리 사거리" },
    { lat: -28735, lng: 50398, name: "도향역 삼거리" },
    { lat: -28738, lng: 51766, name: "춘일경사거리" },
    { lat: -28744, lng: 53889, name: "남약산능곡 삼거리" },
    { lat: -28745, lng: 54392, name: "산형역 삼거리" },
    { lat: -28747, lng: 55512, name: "박명사거리" },
    { lat: -28737, lng: 57195, name: "약산2동 교차로" },
    { lat: -28746, lng: 56767, name: "탄미역 사거리" },
    { lat: -28701, lng: 58915, name: "약산시청역 사거리" },
    { lat: -29467, lng: 57781, name: "약산 교차로" },
    { lat: -27701, lng: 57836, name: "약산역 삼거리" },
    { lat: -26610, lng: 57870, name: "약산역석 사거리" },
    { lat: -30361, lng: 57754, name: "약산채촌 사거리" },
    { lat: -25672, lng: 59560, name: "약산욱상 사거리" },
    { lat: -23881, lng: 66395, name: "화소역 사거리" },
    { lat: -26474, lng: 71570, name: "장곡역 사거리" },
    { lat: -24798, lng: 74587, name: "마현역 앞 교차로" },
    { lat: -24808, lng: 76293, name: "장곡중앙 교차로" },
    { lat: -24786, lng: 73752, name: "구마현리 네거리" },
    { lat: -25916, lng: 68109, name: "평야리 삼거리" },
    { lat: -25973, lng: 69387, name: "근강 교차로" },
    { lat: -23029, lng: 72480, name: "근강배홍 사거리" },
    { lat: -22974, lng: 74537, name: "근강장근 사거리" },
    { lat: -26341, lng: 73438, name: "신장곡리 나들목" },
    { lat: -19780, lng: 75324, name: "아이역 사거리" },
    { lat: -18354, lng: 75283, name: "서팔역 사거리" },
    { lat: -6395, lng: 74340, name: "관아동중앙 교차로" },
    { lat: -4556, lng: 74784, name: "천주역 앞 교차로" },
    { lat: -5539, lng: 75659, name: "천주시청역 사거리" },
    { lat: -2061, lng: 73913, name: "내동신호장교차로" },
    { lat: -214, lng: 73798, name: "번영 교차로" },
    { lat: -4049, lng: 75676, name: "천성동 사거리" },
    { lat: -5898, lng: 75654, name: "천주시청 사거리" },
    { lat: -6429, lng: 75687, name: "천주중앙역 사거리" },
    { lat: -10284, lng: 75696, name: "조향교차로" },
    { lat: -10270, lng: 74344, name: "산취역 앞 교차로" },
    { lat: -2131, lng: 69746, name: "낭원 교차로" },
    { lat: -19794, lng: 74296, name: "궁항아이 사거리" },
    { lat: -18734, lng: 74727, name: "신서팔 교차로" },
    { lat: -17361, lng: 75153, name: "궁항 교차로" },
    { lat: -18987, lng: 72829, name: "아이서란 사거리" },
    { lat: -26776, lng: 48323, name: "하공리 삼거리" },
    { lat: -30256, lng: 51122, name: "약산정 교차로" },
    { lat: -29865, lng: 54449, name: "해로리 사거리" },
    { lat: -29840, lng: 55508, name: "약산정우석 사거리" },
    { lat: -29516, lng: 57203, name: "신탄미 교차로" },
    { lat: -29539, lng: 59828, name: "삼미동 사거리" },
    { lat: -29487, lng: 58924, name: "약산정산석 사거리" },
    { lat: -25453, lng: 50852, name: "정근IC" },
    { lat: -26618, lng: 56092, name: "구역성동 네거리" },
    { lat: -29169, lng: 54390, name: "산탄와산 사거리" },
    { lat: -29172, lng: 55508, name: "산탄 교차로" },
    { lat: -26613, lng: 57172, name: "역성동 사거리" },
    { lat: -28124, lng: 58909, name: "신약산 교차로" },
    { lat: -22487, lng: 72289, name: "구건상리 네거리" },
    { lat: -21631, lng: 76233, name: "궁하구청 삼거리" },
    { lat: -21631, lng: 75610, name: "궁상 교차로" },
    { lat: -25340, lng: 77383, name: "무기역 사거리" },
    { lat: -23540, lng: 73385, name: "지전리 사거리" },
    { lat: -25312, lng: 78687, name: "무기리 교차로" },
    { lat: -16240, lng: 11942, name: "원청삼거리" },
    { lat: -16037, lng: 18029, name: "염곡교차로" },
    { lat: -16230, lng: 13172, name: "동금보교차로" },
    { lat: -16220, lng: 14393, name: "염곡중앙 교차로" },
    { lat: -16202, lng: 16512, name: "염곡역 사거리" },
    { lat: -17823, lng: 11952, name: "미기삼거리" },
    { lat: -14819, lng: 12282, name: "공항입구교차로" },
    { lat: -17944, lng: 12737, name: "남곡 교차로" },
    { lat: -18041, lng: 13820, name: "신시도 교차로" },
    { lat: -16469, lng: 18277, name: "어군청상 사거리" },
    { lat: -18595, lng: 17097, name: "어군 교차로" },
    { lat: -15254, lng: 17579, name: "문향 사거리" },
    { lat: -19586, lng: 15633, name: "신산역 앞 교차로" },
    { lat: -16959, lng: 18557, name: "풍야사거리" },
    { lat: -18066, lng: 16576, name: "주양역 앞 교차로" },
    { lat: -15264, lng: 16526, name: "주안사거리" },
    { lat: -13758, lng: 12857, name: "효빈국제공항 삼거리" },
    { lat: -13772, lng: 13816, name: "신주길리 나들목" },
    { lat: -11831, lng: 13438, name: "죽구 교차로" },
    { lat: -20374, lng: 15644, name: "신신산 교차로" },
    { lat: -12630, lng: 13588, name: "주길교차로" },
    { lat: -18635, lng: 14568, name: "개새교차로" }    ];

// 작업 중인 교차로 데이터를 임시로 담아두는 변수
// =========================================================
    // 🚦 교차로 전용 레이어 토글 기능
    // =========================================================
    var intersectionLayer = L.layerGroup(); // 교차로를 담을 빈 바구니(레이어) 생성

    // 1. 하드코딩된 교차로 데이터를 마커로 만들어서 레이어에 미리 장전해둠
    function initIntersections() {
        intersectionLayer.clearLayers();
        
        savedIntersections.forEach(function(data) {
            // 교차로 전용 예쁜 빨간색 동그라미 아이콘
            var icon = L.divIcon({
                className: 'intersect-icon',
                html: '<div style="background:#EE0022; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:1px 1px 4px rgba(0,0,0,0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            var marker = L.marker([data.lat, data.lng], { icon: icon });
            
            // 마우스 올리면(hover) 이름표(툴팁)가 뜨도록 설정
            marker.bindTooltip(data.name, { 
                permanent: false, 
                direction: 'top', 
                className: 'dist-tooltip',
                offset: [0, -5]
            });
            
            intersectionLayer.addLayer(marker);
        });
    }

    // 파일 로드 시 바로 교차로 마커 생성 (지도는 꺼진 상태로 대기)
    initIntersections();

    // 2. 툴바의 🚦 버튼을 눌렀을 때 실행되는 함수 (켜기/끄기)
    function toggleIntersectionLayer() {
        var btn = document.getElementById('intersect-btn');
        
        if (map.hasLayer(intersectionLayer)) {
            // 이미 켜져 있으면 끄기
            map.removeLayer(intersectionLayer);
            btn.classList.remove('active-btn');
        } else {
            // 꺼져 있으면 켜기
            map.addLayer(intersectionLayer);
            btn.classList.add('active-btn');
        }
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

    // 모달  제외 로직
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
// =========================================================
// 3. 편의점 자동 배치 시스템 V4 (정량 배급 & 중복/에러 방지)
// =========================================================
var TARGET_CVS_COUNT = 2500; // ★ 350만 광역시 기준 적정 편의점 총 개수 (원하시는 수치로 조절 가능!)

var cvsBrands = [
    { name: "GS25", color: "#0077c8", textColor: "#ffffff", weight: 35 },
    { name: "CU", color: "#652C91", textColor: "#a6d654", weight: 35 },
    { name: "세븐일레븐", color: "#00805E", textColor: "#ff6600", weight: 20 },
    { name: "이마트24", color: "#FFB81C", textColor: "#333333", weight: 10 },
    { name: "스토리웨이", color: "#009045", textColor: "#ffffff", weight: 0 } // 가중치 0 (일반 뽑기 제외)
];

function getRandomCVSBrand() {
    var sum = 0, r = Math.random() * 100;
    for (var i = 0; i < cvsBrands.length; i++) {
        sum += cvsBrands[i].weight;
        if (r <= sum) return cvsBrands[i];
    }
    return cvsBrands[0];
}

// ★ "역역앞" 대참사 방지용: 이름에서 역, 교차로 등을 완전히 뼈까지 발라냅니다.
function cleanBaseName(name) {
    if(!name) return "효빈";
    return name.replace(/(역|교차로|사거리|삼거리|네거리|오거리|앞|입구|로터리|IC|나들목|신도시|지구|타운|단지|마을)/g, '').trim();
}

// 상권별 맞춤 접미사 (역 글자를 뺐으므로 여기서 다시 붙여줌)
var stationSuffixes = ["역앞", "역광장", "역로데오", "역남부", "역북부", "역동부", "역서부", "역중앙"];
var normalSuffixes = ["중앙", "본점", "로데오", "타운", "사거리", "삼거리"];
var resSuffixes = ["단지내", "정문", "후문", "상가", "마을", "센트럴"];

var aptRegex = /(아파트|주공|우미린|아이파크|푸르지오|자이|래미안|더샵|힐스테이트|롯데캐슬|e편한세상|센트럴|빌리브|클래스|스카이뷰|더휴|데시안|호르)/;

function getRandomOffset(lat, lng, maxRadius) {
    var angle = Math.random() * Math.PI * 2;
    var radius = Math.random() * maxRadius;
    return { lat: lat + (Math.sin(angle) * radius), lng: lng + (Math.cos(angle) * radius) };
}

// 마커 생성 함수
function createCVSMarker(lat, lng, brandData, branchName, isManual = false, autoId = null) {
    var fullName = brandData.name + " " + branchName + "점";
    var iconHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
            <div style="background: ${brandData.color}; border: 1.5px solid #fff; border-radius: 8px; padding: 2px 6px; box-shadow: 1px 1px 3px rgba(0,0,0,0.4); display: inline-block;">
                <span style="color: ${brandData.textColor}; font-size: 10px; font-weight: 900; letter-spacing: -0.5px;">${brandData.name}</span>
            </div>
            <div class="station-name-label" style="color: #222; font-size: 11px; margin-top: 2px; font-weight: 800; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space: nowrap;">
                ${branchName}점
            </div>
        </div>
    `;
    
    var marker = L.marker([lat, lng], {
        icon: L.divIcon({ className: 'custom-cvs', html: iconHtml, iconSize: [80, 40], iconAnchor: [40, 15] })
    });
    
    marker.cvsData = { brand: brandData.name, branch: branchName, isManual: isManual };
    marker.bindTooltip(`<b>🏪 ${fullName}</b><br><span style="font-size:10px; color:#777;">(더블클릭하여 영구 철거)</span>`, { direction: 'top', offset: [0, -15] });

    marker.on('dblclick', function(e) {
        L.DomEvent.stopPropagation(e);
        if (confirm(`'${fullName}' 마커를 철거하시겠습니까?\n(영구 삭제되며 다신 이 자리에 자동 생성되지 않습니다)`)) {
            cvsLayer.removeLayer(marker);
            if (isManual) {
                if (typeof myLandmarks !== 'undefined') {
                    myLandmarks = myLandmarks.filter(m => !(m.lat === lat && m.lng === lng));
                    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
                }
                var deletedManualCVS = JSON.parse(localStorage.getItem('hyobin_deleted_manual_cvs')) || [];
                deletedManualCVS.push(lat + "_" + lng);
                localStorage.setItem('hyobin_deleted_manual_cvs', JSON.stringify(deletedManualCVS));
            } else if (autoId) {
                // V4 대장에서 영구 삭제
                var autoCVS = JSON.parse(localStorage.getItem('hyobin_auto_cvs_v4')) || [];
                autoCVS = autoCVS.filter(c => c.id !== autoId);
                localStorage.setItem('hyobin_auto_cvs_v4', JSON.stringify(autoCVS));
            }
        }
    });
    return marker;
}

function autoGenerateConvenienceStores() {
    cvsLayer.clearLayers();
    var cvsCount = 0;
    var deletedManualCVS = JSON.parse(localStorage.getItem('hyobin_deleted_manual_cvs')) || [];
    
    // ★ 브랜드 내 지점명 중복 검사용 사전 (Set)
    var usedNames = {};
    cvsBrands.forEach(b => usedNames[b.name] = new Set());

    // [1] 수동 마커 흡수
    if (typeof allLandmarks !== 'undefined') {
        allLandmarks.forEach(m => {
            if (deletedManualCVS.includes(m.lat + "_" + m.lng)) return;
            var nameStr = m.name.toUpperCase();
            if (/(GS25|CU|세븐일레븐|이마트24|스토리웨이)/.test(nameStr)) {
                var brand = cvsBrands.find(b => nameStr.includes(b.name.toUpperCase())) || cvsBrands[0];
                var branch = m.name.replace(/(GS25|CU|세븐일레븐|이마트24|스토리웨이|점|\s)/gi, '').trim() || "수동지점";
                
                // 수동 마커 지점명도 사전에 등록
                usedNames[brand.name].add(branch);
                
                createCVSMarker(m.lat, m.lng, brand, branch, true).addTo(cvsLayer);
                m._isConvertedCVS = true;
                cvsCount++;
            }
        });
    }

    // [2] 자동 생성 V4 (정량 배분 & 중복 방지 시스템)
    var autoCVS = JSON.parse(localStorage.getItem('hyobin_auto_cvs_v4')) || null;

    // 만약 V4 대장이 없으면 새로 목표 개수(TARGET_CVS_COUNT)만큼 찍어냅니다!
    if (!autoCVS) {
        autoCVS = [];
        var needed = TARGET_CVS_COUNT - cvsCount; 
        if (needed < 0) needed = 0;

        var basePool = [];

        // 기반지(상권 구역) 수집
        if (typeof allLandmarks !== 'undefined') {
            allLandmarks.filter(m => m.type === 'subway').forEach(st => {
                var lines = st.lines || st.lineCodes || [];
                basePool.push({ lat: st.lat, lng: st.lng, name: cleanBaseName(st.name), type: 'station', isRailway: lines.some(l => l.startsWith('R')), weight: lines.length >= 2 ? 3 : 1 });
            });
            allLandmarks.forEach(m => {
                if ((m.type === 'normal' || !m.type) && aptRegex.test(m.name)) {
                    basePool.push({ lat: m.lat, lng: m.lng, name: cleanBaseName(m.name), type: 'res', weight: 2 });
                }
            });
        }

        searchablePolygons.filter(p => p.type === 'dev').forEach(dev => {
            var center = L.polygon(dev.points).getBounds().getCenter();
            basePool.push({ lat: center.lat, lng: center.lng, name: cleanBaseName(dev.name), type: 'res', weight: 2 });
        });

        if (typeof savedIntersections !== 'undefined') {
            savedIntersections.forEach(i => {
                if (i.name && i.name !== "ㅜ") {
                    basePool.push({ lat: i.lat, lng: i.lng, name: cleanBaseName(i.name), type: aptRegex.test(i.name) ? 'res' : 'normal', weight: 1 });
                }
            });
        }

        // 상권별 편의점 데이터 생성기
        function createAutoCVSData(b) {
            var brand, branch = b.name, isStoryway = false;
            
            if (b.type === 'station' && b.isRailway && !b.hasStoryway) {
                brand = cvsBrands[4]; // 스토리웨이는 역마다 딱 1개
                b.hasStoryway = true;
                branch += "역사";
                isStoryway = true;
            } else {
                brand = getRandomCVSBrand();
                if (b.type === 'station') branch += stationSuffixes[Math.floor(Math.random() * stationSuffixes.length)];
                else if (b.type === 'res') branch += resSuffixes[Math.floor(Math.random() * resSuffixes.length)];
                else branch += normalSuffixes[Math.floor(Math.random() * normalSuffixes.length)];
            }
            
            // ★ 중복 방지 로직: "GS25 시청점"이 이미 있다면 "GS25 시청2호점"으로 변경!
            var finalBranch = branch;
            var suffixNum = 2;
            while (usedNames[brand.name].has(finalBranch)) {
                finalBranch = branch + suffixNum + "호";
                suffixNum++;
            }
            usedNames[brand.name].add(finalBranch); // 사전에 등록

            var radius = (b.type === 'res') ? 120 : (isStoryway ? 20 : 350);
            var offset = getRandomOffset(b.lat, b.lng, radius);
            
            return {
                id: Date.now() + Math.random(),
                lat: offset.lat, lng: offset.lng,
                brandData: brand, branchName: finalBranch
            };
        }

        // 1바퀴: 모든 상권에 일단 최소 1개씩은 공평하게 깔아주기
        var ticketBox = [];
        basePool.forEach((b, idx) => {
            if (needed > 0) {
                autoCVS.push(createAutoCVSData(b));
                needed--;
            }
            // 가중치만큼 추첨표(티켓) 넣기
            for (var w = 0; w < b.weight; w++) ticketBox.push(idx); 
        });

        // 2바퀴: 남은 목표 개수를 추첨(티켓)을 통해 유동인구 많은 곳에 무작위 배치
        while (needed > 0 && ticketBox.length > 0) {
            var pickIdx = ticketBox[Math.floor(Math.random() * ticketBox.length)];
            autoCVS.push(createAutoCVSData(basePool[pickIdx]));
            needed--;
        }

        // 생성 완료 후 대장 저장
        localStorage.setItem('hyobin_auto_cvs_v4', JSON.stringify(autoCVS));
    } else {
        // 이미 V4 대장이 있으면 사전에 이름만 추가 등록 (중복 방지용)
        autoCVS.forEach(c => usedNames[c.brandData.name].add(c.branchName));
    }

    // 지도에 출력
    autoCVS.forEach(cv => createCVSMarker(cv.lat, cv.lng, cv.brandData, cv.branchName, false, cv.id).addTo(cvsLayer));
    console.log(`[시스템] 편의점 V4 (정량 쿼터제) 배치 완료: 총 ${cvsCount + autoCVS.length}개`);
}

setTimeout(autoGenerateConvenienceStores, 2000);

// =========================================================
// 📊 편의점 대장 CSV 다운로드 기능
// =========================================================
function downloadCVSDataCSV() {
    var csvContent = "\uFEFF"; 
    csvContent += "편의점 브랜드,지점명,생성구분,소재지(상세 행정구역),위도,경도\n";
    
    var count = 0;
    cvsLayer.eachLayer(function(marker) {
        var data = marker.cvsData;
        if (!data) return;
        
        var lat = Math.round(marker.getLatLng().lat);
        var lng = Math.round(marker.getLatLng().lng);
        var address = (typeof getFullAddress === 'function') ? (getFullAddress(lat, lng) || "미지정 구역") : "미지정 구역";
        var typeStr = data.isManual ? "수동 (기존마커 변환)" : "상권 자동배치";
        
        csvContent += `"${data.brand}","${data.branch}","${typeStr}","${address}","${lat}","${lng}"\n`;
        count++;
    });

    if(count === 0) {
        alert("추출할 편의점 데이터가 없습니다.");
        return;
    }

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `효빈광역시_편의점_대장_${new Date().toLocaleDateString()}.csv`;
    link.click();
}
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
// 선분과 점 사이의 거리 계산 (수학 공식)
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
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

// 버스 정류장 클릭 시 처리 로직
// =========================================================
// 🚌 지도 클릭 시 정류장 추가 (무적 방어 & 에러 추적 팝업 탑재)
// =========================================================
function handleBusStopClick(e) {
    try {
        // 1. 수학 공식을 아예 함수 배때기 안에 내장 (절대 못 찾을 일 없음)
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

        var exactLat = e.latlng.lat;
        var exactLng = e.latlng.lng;
        var lat = Math.round(exactLat);
        var lng = Math.round(exactLng);
        var passingBuses = [];
        var margin = 120; 

        // adjustY 값이 혹시 없더라도 뻗지 않게 방어
        var currentAdjustY = (typeof adjustY !== 'undefined') ? adjustY : 0;

        if (typeof busData !== 'undefined') {
            busData.forEach(bus => {
                if (!bus.points) return; // 포인트 없으면 패스
                var pts = bus.points.map(p => [p[0] + currentAdjustY, p[1]]);
                for (var i = 0; i < pts.length - 1; i++) {
                    var dist = safeGetDist(exactLat, exactLng, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
                    if (dist <= margin) {
                        var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
                        passingBuses.push(`<span style="color:${bColor}; font-weight:bold;">[${bus.type || '일반'}]</span> ${bus.name}`);
                        break; 
                    }
                }
            });
        }

        // 랜드마크 데이터 없어도 안 뻗게 방어
        var safeLandmarks = (typeof allLandmarks !== 'undefined') ? allLandmarks : [];
        var nearby = safeLandmarks.map(lm => {
            return { name: lm.name, dist: Math.sqrt(Math.pow(lat - lm.lat, 2) + Math.pow(lng - lm.lng, 2)), type: lm.type };
        }).filter(lm => lm.dist < 1000).sort((a, b) => a.dist - b.dist).slice(0, 4);

        var suggestions = [];
        nearby.forEach(lm => {
            var cleanName = lm.name.replace(/역$/, '');
            if (lm.type === 'subway' || lm.name.endsWith('역')) { suggestions.push(`${cleanName}역`, `${cleanName}역입구`); } 
            else { suggestions.push(`${lm.name}`, `${lm.name}입구`); }
        });
        
        // 전역 변수(tempBusStopData)에 임시 저장 (이것도 없으면 강제 생성)
        window.tempBusStopData = { lat: lat, lng: lng, buses: passingBuses };
        
        var nameInput = document.getElementById('bus-stop-name-input');
        if(nameInput) nameInput.value = "";
        
        var suggestHtml = [...new Set(suggestions)].slice(0, 8).map(s => 
            `<span style="display:inline-block; background:#eef5ff; padding:4px 8px; margin:3px; border-radius:12px; cursor:pointer; font-size:12px; border:1px solid #0077DD; color:#0077DD; box-shadow:1px 1px 2px rgba(0,0,0,0.2);" onclick="document.getElementById('bus-stop-name-input').value='${s}'">${s}</span>`
        ).join("");
        
        var sugBox = document.getElementById('bus-stop-suggestions');
        if(sugBox) sugBox.innerHTML = suggestHtml || "추천 데이터 없음";
        
        var infoBox = document.getElementById('bus-stop-passing-info');
        if(infoBox) infoBox.innerHTML = `<b>🚌 정차 예정 노선:</b><br>${passingBuses.length > 0 ? passingBuses.join("<br>") : "<span style='color:#999;'>경유 노선 없음</span>"}`;
        
        var modal = document.getElementById('bus-stop-modal');
        if(modal) {
            modal.style.display = 'flex';
        } else {
            alert("⚠️ HTML에 'bus-stop-modal' 이라는 아이디를 가진 창이 없습니다!");
        }

    } catch (err) {
        // 어디서 뻗었는지 강제로 멱살 잡고 팝업으로 띄움!!!
        alert("🚨 지도 클릭 중 치명적 에러 발생!\n원인: " + err.message);
        console.error(err);
    }
}

function confirmAddBusStop() {
    var nameInput = document.getElementById('bus-stop-name-input');
    if(!nameInput || !nameInput.value.trim()) { alert("정류장 이름을 입력해주세요!"); return; }
    
    var stopData = { 
        name: nameInput.value.trim() + " 정류장", 
        lat: tempBusStopData.lat, 
        lng: tempBusStopData.lng, 
        type: 'busStop', 
        color: '#333',
        isManual: true, // ★ 중요: 수동으로 만든 정류장임을 표시 (삭제 방지용)
        allPassingBuses: tempBusStopData.buses, 
        passingBuses: [...tempBusStopData.buses] 
    };
    
    addMarkerToMap(stopData); 
    myLandmarks.push(stopData);
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    closeModal('bus-stop-modal'); 
    toggleBusStopMode();
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
// =========================================================
// 🚌 버스 정류장 일괄 생성 (이름 중복 방지 & 수동 정류장 완벽 보호 버전)
// =========================================================
function autoGenerateBusStops() {
    if (typeof busData === 'undefined' || busData.length === 0) {
        alert("버스 노선 데이터가 없습니다!"); return;
    }

    // 🛑 [추가됨] 1. 안전 장치: 완전히 갈아엎기 전에 사용자에게 물어보기
    var existingAutoStops = myLandmarks.filter(m => m.type === 'busStop' && m.isManual !== true);
    if (existingAutoStops.length > 0) {
        var overwrite = confirm(`이미 자동 생성된 정류장이 ${existingAutoStops.length}개 있습니다.\n기존의 자동 정류장들을 싹 지우고 처음부터 다시 생성하시겠습니까?\n\n(※ '확인'을 눌러도 시장님이 수동으로 만든 정류장들은 절대 지워지지 않고 유지됩니다.)`);
        if (!overwrite) {
            return; // 취소 누르면 생성 중단
        }
    }

    var btn = document.getElementById('auto-bus-stop-btn');
    if (btn) btn.innerHTML = "⏳ 생성 중...";

    // 수동 정류장만 남기고 초기화
    myLandmarks = myLandmarks.filter(m => m.type !== 'busStop' || m.isManual === true);
    
    if (typeof busStopLayer !== 'undefined') {
        busStopLayer.eachLayer(function(layer) {
            if (!layer.isManualMarker) {
                busStopLayer.removeLayer(layer);
            }
        });
    }
    activeMarkers = activeMarkers.filter(m => !(m.options && m.options.icon && m.options.icon.options.className === 'custom-bus-stop' && !m.isManualMarker));

    var allBusPoints = [];
var intervalMap = { "마을": 300, "순환": 500, "지선": 600, "간선": 800 };

    busData.forEach(bus => {
        // ★ 2. 여기서 특수 버스들을 완전히 쫓아냅니다! (else 구문으로 빠져서 무한 증식하는 걸 방지)
        if (["좌석", "급행", "광역", "공항", "투어"].includes(bus.type)) {
            return; // 이 버스들은 정류장 계산 안 하고 바로 다음 버스로 넘어감!
        }

        var pts = bus.points.map(p => [p[0] + adjustY, p[1]]);
        var bColor = busColors[bus.type] || '#333';
        var formattedName = `<span style="color:${bColor}; font-weight:bold;">[${bus.type}]</span> ${bus.name}`;
        var interval = intervalMap[bus.type];
        
        if (interval) {
            var currentDist = 0;
            for (var i = 0; i < pts.length - 1; i++) {
                var p1 = pts[i]; var p2 = pts[i+1];
                allBusPoints.push({ lat: p1[0], lng: p1[1], busName: formattedName });
                var segDist = map.distance(p1, p2);
                var distLeft = segDist; var currPt = p1;
                while (currentDist + distLeft >= interval) {
                    var walk = interval - currentDist;
                    var ratio = walk / segDist;
                    var newLat = currPt[0] + (p2[0] - currPt[0]) * ratio;
                    var newLng = currPt[1] + (p2[1] - currPt[1]) * ratio;
                    allBusPoints.push({ lat: newLat, lng: newLng, busName: formattedName });
                    currPt = [newLat, newLng]; distLeft -= walk; segDist -= walk; currentDist = 0;
                }
                currentDist += distLeft;
            }
            allBusPoints.push({ lat: pts[pts.length-1][0], lng: pts[pts.length-1][1], busName: formattedName });
        } else {
            pts.forEach(pt => allBusPoints.push({ lat: pt[0], lng: pt[1], busName: formattedName }));
        }
    });

    var clusters = [];
    allBusPoints.forEach(pt => {
        var joined = false;
        for (var i = 0; i < clusters.length; i++) {
            var c = clusters[i];
            var dist = Math.sqrt(Math.pow(pt.lat - c.lat, 2) + Math.pow(pt.lng - c.lng, 2));
            if (dist < 400) { c.buses.add(pt.busName); joined = true; break; }
        }
        if (!joined) {
            var newSet = new Set(); newSet.add(pt.busName);
            clusters.push({ lat: pt.lat, lng: pt.lng, buses: newSet });
        }
    });

    // 🛡️ [추가됨] 2. 정류장 출석부 생성 (수동 정류장 및 중복 이름 관리)
    var stationDictionary = {};
    
    // 이미 지도에 살아남아 있는 수동 정류장들을 출석부에 먼저 적어둡니다.
    myLandmarks.forEach(function(m) {
        if (m.type === 'busStop') {
            stationDictionary[m.name] = m;
        }
    });

    var addedCount = 0;
    var mergedCount = 0;

    clusters.forEach(c => {
        var nearby = allLandmarks.map(lm => {
            return { name: lm.name, dist: Math.sqrt(Math.pow(c.lat - lm.lat, 2) + Math.pow(c.lng - lm.lng, 2)), type: lm.type };
        }).filter(lm => lm.dist < 1200 && lm.type !== 'busStop').sort((a, b) => a.dist - b.dist);

        var stopName = "임시";
        if (nearby.length > 0) {
            var lm = nearby[0]; var cleanName = lm.name.replace(/역$/, '');
            if (lm.type === 'subway' || lm.name.endsWith('역')) stopName = cleanName + "역";
            else if (lm.name.endsWith('공원') || lm.name.endsWith('학교')) stopName = lm.name;
            else stopName = lm.name + "";
        } else {
            var addr = getFullAddress(c.lat, c.lng);
            if (addr && addr !== "미지정") {
                var dongName = addr.split(' ').pop().replace(/\(.*\)/, '');
                if(!['읍', '면', '시', '군', '구'].includes(dongName.slice(-1))) stopName = dongName;
            }
        }

        var finalStopName = stopName + " 정류장";

        // 🛡️ [추가됨] 3. 이름 중복 검사 및 병합 로직
        if (stationDictionary[finalStopName]) {
            // 이미 같은 이름의 정류장(수동이든 자동이든)이 존재하면 마커를 새로 만들지 않음!
            var existingStop = stationDictionary[finalStopName];
            
            // 기존 배열을 Set으로 만들어서 똑같은 버스가 여러 번 들어가는 것 방지
            var mergedBuses = new Set(existingStop.allPassingBuses || []);
            Array.from(c.buses).forEach(b => mergedBuses.add(b));
            
            existingStop.allPassingBuses = Array.from(mergedBuses);
            existingStop.passingBuses = Array.from(mergedBuses);
            mergedCount++;
        } else {
            // 출석부에 없는 완전 새로운 정류장이면 마커 생성
            var stopData = {
                name: finalStopName, lat: Math.round(c.lat), lng: Math.round(c.lng),
                type: 'busStop', color: '#333', isManual: false, 
                allPassingBuses: Array.from(c.buses), passingBuses: Array.from(c.buses)
            };
            addMarkerToMap(stopData); 
            myLandmarks.push(stopData); 
            
            // 방금 만든 정류장도 출석부에 추가
            stationDictionary[finalStopName] = stopData; 
            addedCount++;
        }
    });

    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    if (btn) btn.innerHTML = "🚌 정류장 일괄 생성";
    
    // 데이터 꼬임을 막고 병합된 데이터들을 화면에 완벽 반영하기 위해 새로고침 적용
    alert(`완료되었습니다!\n새로 생성된 정류장: ${addedCount}개\n기존 정류장에 통합된 노선: ${mergedCount}건\n(완벽한 화면 적용을 위해 페이지를 새로고침합니다.)`);
    location.reload(); 
}// 🚏 버스 정류장 대장 CSV 추출 기능
function downloadBusStopCSV() {
    var busStops = myLandmarks.filter(m => m.type === 'busStop');
    if (busStops.length === 0) { alert("추출할 정류장 데이터가 없습니다."); return; }

    let csvContent = "\uFEFF"; 
    csvContent += "정류장명,설치유형,소재지,경유 노선,위도,경도\n";

    busStops.forEach(stop => {
        var address = getFullAddress(stop.lat, stop.lng) || "미지정 구역";
        var routes = (stop.passingBuses || []).map(r => r.replace(/<[^>]*>?/gm, '')).join(" | ");
        var type = stop.isManual ? "수동" : "자동";
        csvContent += `"${stop.name}","${type}","${address}","${routes}","${Math.round(stop.lat)}","${Math.round(stop.lng)}"\n`;
    });

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `효빈광역시_버스정류장_대장_${new Date().toLocaleDateString()}.csv`;
    link.click();
}
// =========================================================
// 🚍 버스 종류별 필터링 기능 모음
// =========================================================

// 1. 페이지 로딩 시 버스 필터 체크박스 자동 생성 (데이터 기반 동적 생성)
window.addEventListener('DOMContentLoaded', function() {
    var busFilterContainer = document.getElementById('bus-filter-list');
    if (busFilterContainer && typeof busData !== 'undefined') {
        
        var uniqueGroups = new Map();

        // 버스 데이터를 싹 훑어서 실제로 있는 번호대만 수집합니다.
        busData.forEach(function(bus) {
            var busSubGroup = bus.type;
            var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#888888';

            var busNumMatch = bus.name.match(/\d+/);
            if (busNumMatch) {
                var num = parseInt(busNumMatch[0], 10);
                if (bus.type === "간선") {
                    busSubGroup = `간선 [${Math.floor(num / 10) * 10}번대]`;
                } else if (bus.type === "지선") {
                    busSubGroup = `지선 [${Math.floor(num / 100) * 100}번대]`;
                }
            }
            if (!uniqueGroups.has(busSubGroup)) {
                uniqueGroups.set(busSubGroup, { type: bus.type, color: bColor });
            }
        });

        // 이름순으로 예쁘게 정렬 (간선 10번대 -> 20번대 -> 지선 100번대 -> 200번대...)
        var sortedGroups = Array.from(uniqueGroups.keys()).sort();

        sortedGroups.forEach(function(groupName) {
            var info = uniqueGroups.get(groupName);

            var filterItem = document.createElement('label'); 
            filterItem.className = 'filter-item';
            
            var fChk = document.createElement('input'); 
            fChk.type = 'checkbox'; fChk.value = groupName; fChk.checked = true; fChk.name = 'busFilter';
            fChk.onchange = applyBusFilter; 
            
            var fDot = document.createElement('div'); 
            fDot.className = 'filter-color-dot'; fDot.style.backgroundColor = info.color;
            
            filterItem.appendChild(fChk); 
            filterItem.appendChild(fDot); 
            filterItem.appendChild(document.createTextNode(groupName));
            
            busFilterContainer.appendChild(filterItem);
        });
    }
});
// 2. 필터 박스 열기/닫기 토글
function toggleBusFilterBox() {
    var box = document.getElementById('bus-filter-box');
    var btn = document.getElementById('bus-filter-btn');
    if (box.style.display === 'block') {
        box.style.display = 'none';
        btn.classList.remove('active-btn');
    } else {
        box.style.display = 'block';
        btn.classList.add('active-btn');
        // 필터를 조작할 때 버스 레이어 자체가 꺼져있으면 강제로 켬
        if (!map.hasLayer(busLineLayer)) map.addLayer(busLineLayer);
    }
}

// 3. 모두 켜기 / 모두 끄기 버튼 동작
function toggleAllBusFilters(isChecked) {
    var checkboxes = document.querySelectorAll('input[name="busFilter"]');
    checkboxes.forEach(cb => cb.checked = isChecked);
    applyBusFilter();
}

// 4. [수정됨] 체크박스 연동 필터 (HTML 태그/색상코드 완벽 제거 버전)
function applyBusFilter() {
    var checkedTypes = [];
    document.querySelectorAll('input[name="busFilter"]:checked').forEach(cb => checkedTypes.push(cb.value));

    // ① 버스 노선(선) 필터링
    busLineLayer.clearLayers();
    allBusLines.forEach(function(layer) {
        var typeToCheck = layer.busType;
        if (checkedTypes.includes(typeToCheck)) {
            busLineLayer.addLayer(layer);
        }
    });

    // ② 버스 정류장(마커) 필터링 - ★어이없는 버그 해결 부분★
    activeMarkers.forEach(function(marker) {
        if (marker.passingBuses) {
            var isVisible = false;

            for (var i = 0; i < marker.passingBuses.length; i++) {
                var busStr = marker.passingBuses[i];

                // ★ 핵심: 색상코드(#01B7ED 등)가 섞인 HTML 태그를 싹 지우고 순수 텍스트만 남김
                var cleanStr = busStr.replace(/<[^>]*>?/gm, '');

                var typeMatch = cleanStr.match(/\[(.*?)\]/);
                var numMatch = cleanStr.match(/\d+/); // 이제 색상코드가 없으니 '진짜 버스 번호'만 찾음!

                if (typeMatch && numMatch) {
                    var bType = typeMatch[1];
                    var bNum = parseInt(numMatch[0], 10);
                    var busSubGroup = bType;

                    if (bType === "간선") {
                        busSubGroup = `간선 [${Math.floor(bNum / 10) * 10}번대]`;
                    } else if (bType === "지선") {
                        busSubGroup = `지선 [${Math.floor(bNum / 100) * 100}번대]`;
                    }

                    if (checkedTypes.includes(busSubGroup)) {
                        isVisible = true;
                        break;
                    }
                } else if (typeMatch) {
                    // 번호가 없는 버스 처리용 (예: 투어버스)
                    if (checkedTypes.includes(typeMatch[1])) {
                        isVisible = true;
                        break;
                    }
                }
            }

            // 지도에 정류장 표시/숨기기 적용
            if (isVisible || marker.passingBuses.length === 0) {
                if (!map.hasLayer(marker)) busStopLayer.addLayer(marker);
            } else {
                if (map.hasLayer(marker)) busStopLayer.removeLayer(marker);
            }
        }
    });
}
// =========================================================
// 🚇 지하철 종점(Terminal) 링형 로고 (레이어 박스 완벽 연동판)
// =========================================================

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
        if (e.name.includes('철도') || e.name.includes('지하철') || e.name.includes('노선')) {
            map.addLayer(terminalLogoLayer);
        }
    });

    map.on('overlayremove', function(e) {
        if (e.name.includes('철도') || e.name.includes('지하철') || e.name.includes('노선')) {
            map.removeLayer(terminalLogoLayer);
        }
    });

}, 1500);// =========================================================
// 🎯 가상 '내 위치' 기능 (카카오맵 스타일 파란 물결)
// =========================================================
var myLocationMarker = null;

function goToMyLocation() {
    // 💡 시장님의 가상 '내 위치' 좌표를 여기에 입력하세요! 
    // (지금은 임시로 효빈광역시 중심부 쯤으로 보이는 좌표를 넣었습니다)
    // 앞서 좌표 보정(adjustY)이 있었다면 그것까지 고려해서 넣으시면 좋습니다.
    var myLat = -26164; 
    var myLng = 24566;

    // 이미 마커가 있다면 지우기
    if (myLocationMarker) {
        map.removeLayer(myLocationMarker);
    }

    // HTML 구조를 조립해서 마커 아이콘 만들기
    var iconHtml = `
        <div class="my-location-container">
            <div class="my-location-pulse"></div>
            <div class="my-location-dot"></div>
        </div>
    `;

    var myLocIcon = L.divIcon({
        className: '', // 기본 테두리 제거
        html: iconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8] // 정중앙 맞춤
    });

    // 지도에 내 위치 마커 추가 (다른 마커들보다 항상 위에 보이도록 zIndex 높게 설정)
    myLocationMarker = L.marker([myLat, myLng], {
        icon: myLocIcon, 
        zIndexOffset: 5000,
        interactive: false // 클릭 방해 안 함
    }).addTo(map);

    // 카메라를 내 위치로 부드럽게 이동시키고 살짝 줌인!
    map.flyTo([myLat, myLng], 4, {
        animate: true,
        duration: 1.0 // 1초 동안 스르륵 이동
    });
}
// =========================================================
// 🗺️ 실시간 현재 행정구역 표시 (틈새/겹침 완벽 보정 자석 알고리즘!)
// =========================================================

// 1. 점이 폴리곤 안에 있는지 확인하는 기본 함수
function isPointInPolygon(lat, lng, polygon) {
    var x = lat, y = lng;
    var inside = false;
    // 다중 배열(구멍 뚫린 폴리곤 등) 방어 로직
    var pts = Array.isArray(polygon[0][0]) ? polygon[0] : polygon;
    
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i][0], yi = pts[i][1];
        var xj = pts[j][0], yj = pts[j][1];
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 2. [핵심] 틈새(Gap)에 빠졌을 때, 가장 가까운 폴리곤 경계선까지의 거리를 구하는 수학 함수
function getDistanceToPolygon(lat, lng, polygon) {
    var minDistance = Infinity;
    var x = lat, y = lng;
    var pts = Array.isArray(polygon[0][0]) ? polygon[0] : polygon;

    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var x1 = pts[i][0], y1 = pts[i][1];
        var x2 = pts[j][0], y2 = pts[j][1];
        
        // 점과 선분 사이의 최단 거리 공식 (Point to Line Segment)
        var A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1;
        if (len_sq != 0) param = dot / len_sq;
        
        var xx, yy;
        if (param < 0) { xx = x1; yy = y1; } 
        else if (param > 1) { xx = x2; yy = y2; } 
        else { xx = x1 + param * C; yy = y1 + param * D; }
        
        var dx = x - xx, dy = y - yy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
}

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

// 2. 하이라이트 실행 함수 (순수 이름 매칭 무적 버전!)
function highlightBusRoute(targetBusName, originalColor) {
    if (currentHighlightedBus === targetBusName) {
        resetBusHighlight();
        return;
    }
    currentHighlightedBus = targetBusName;

    // ① 버스 노선(선) 처리
    busLineLayer.eachLayer(function(layer) {
        if (layer.setStyle) { 
            // ★ fullBusName 대신 rawBusName(순수 이름)으로 찰떡같이 비교
            if (layer.rawBusName === targetBusName) {
                layer.setStyle({ weight: 8, opacity: 1 }); 
                layer.bringToFront();
            } else {
                layer.setStyle({ weight: 2, opacity: 0.1 }); 
            }
        }
    });

    // ② 버스 정류장(마커) 처리
    busStopLayer.eachLayer(function(marker) {
        var hasBus = false;

        // 마커 말풍선 텍스트를 읽어와서 순수 이름(예: 급행버스01)이 있는지 무식하게 확인
        if (marker.getTooltip()) {
            var tooltipText = marker.getTooltip().getContent().replace(/<[^>]*>?/gm, '');
            if (tooltipText.includes(targetBusName)) {
                hasBus = true;
            }
        }

        var nameMatch = marker.options.icon.options.html.match(/<\/div><div class="station-name-label"[^>]*>(.*?)<\/div>/);
        var stopName = nameMatch ? nameMatch[1] : "정류장";

        if (hasBus) {
            // ✨ 서는 정류장: 띄우기
            if (!map.hasLayer(marker)) map.addLayer(marker);
            var highlightIcon = `<div style="background:white; border:3px solid ${originalColor}; border-radius:6px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 8px ${originalColor};"><span style="font-size:11px;">🚏</span></div><div class="station-name-label" style="color:${originalColor}; font-size:12px; margin-top:3px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${stopName}</div>`;
            marker.setIcon(L.divIcon({ className: 'custom-bus-stop highlighted', html: highlightIcon, iconSize: [20, 20], iconAnchor: [10, 10] }));
            marker.setZIndexOffset(1000); 
        } else {
            // 🚫 안 서는 정류장: 숨기기
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    });
}
// =========================================================
// ★ 지도 줌 레벨에 따라 정류장 이름 숨기기/보이기 (글자 겹침 방지)
// =========================================================

// 1. 라벨을 제어할 CSS 스타일 (전철역은 살리고 버스만 제어!)
var labelStyle = document.createElement('style');
labelStyle.innerHTML = `
    /* ★ [수정됨] .custom-bus-stop 안에 있는 이름표만 숨기도록 타겟을 좁혔습니다! */
    .hide-map-labels .custom-bus-stop .station-name-label {
        display: none !important;
    }
    
    /* [보너스] 숨겨진 상태라도 정류장에 마우스를 올리면 이름이 맨 위로 팝업됨! */
    .custom-bus-stop:hover .station-name-label {
        display: block !important;
        position: absolute;
        z-index: 9999 !important;
        background: rgba(255, 255, 255, 0.9);
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid #ccc;
    }
`;
document.head.appendChild(labelStyle);

// 2. 지도를 확대/축소할 때마다 검사하는 감시자 함수
function updateLabelVisibility() {
    var currentZoom = map.getZoom();
    
    // 지도가 담긴 컨테이너 가져오기 (보통 id가 'map' 또는 지도 변수에서 직접 컨테이너 추출)
    var mapContainer = map.getContainer(); 

    // ★ 핵심: 줌 레벨 기준점 (숫자가 클수록 더 가까이 확대해야 글자가 보입니다)
    // 효빈광역시 크기를 고려할 때 보통 14~15 정도가 적당합니다.
    if (currentZoom < 14) {
        mapContainer.classList.add('hide-map-labels'); // 축소됨: 글자 숨겨!
    } else {
        mapContainer.classList.remove('hide-map-labels'); // 확대됨: 글자 보여!
    }
}

// 3. 지도 줌(확대/축소) 이벤트가 끝날 때마다 감시자 함수 실행
map.on('zoomend', updateLabelVisibility);

// 4. 처음 지도를 딱 켰을 때도 현재 줌 레벨에 맞춰서 한 번 정리해주기
updateLabelVisibility();
// =========================================================
// ★ [필수 코어 함수] 점과 선분 사이의 거리 계산 (절대 삭제 금지!)
// =========================================================
window.pointToSegmentDist = function(px, py, x1, y1, x2, y2) {
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
};
// =========================================================
// 🚑 [긴급 복구] 사라진 핵심 함수들 전역(window)으로 강제 부활!
// =========================================================

// 1. 사라졌던 '하이라이트 해제(원상복구)' 함수 부활!
window.resetBusHighlight = function() {
    currentHighlightedBus = null;
    
    // 필터 체크박스 상태대로 원상복구
    if (typeof applyBusFilter === 'function') {
        applyBusFilter(); 
    }
    
    // 정류장 아이콘 디자인 원래대로 복구
    if (typeof busStopLayer !== 'undefined') {
        busStopLayer.eachLayer(function(marker) {
            var htmlMatch = marker.options.icon.options.html.match(/<\/div><div class="station-name-label"[^>]*>(.*?)<\/div>/);
            var stopName = htmlMatch ? htmlMatch[1] : "정류장";
            var normalIcon = `<div style="background:white; border:2px solid #555; border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"><span style="font-size:10px;">🚏</span></div><div class="station-name-label" style="color:#222; font-size:11px; margin-top:2px; font-weight:bold; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${stopName}</div>`;
            marker.setIcon(L.divIcon({ className: 'custom-bus-stop', html: normalIcon, iconSize: [16, 16], iconAnchor: [8, 8] }));
            marker.setZIndexOffset(0);
        });
    }
};

// 2. 사라졌던 '빈 공간 클릭 시 정류장 추가' 함수 부활!
window.handleBusStopClick = function(e) {
    try {
        // 거리 계산 수학 공식 내장
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

        var exactLat = e.latlng.lat;
        var exactLng = e.latlng.lng;
        var lat = Math.round(exactLat);
        var lng = Math.round(exactLng);
        var passingBuses = [];
        var margin = 120; 
        var currentAdjustY = (typeof adjustY !== 'undefined') ? adjustY : 0;

        if (typeof busData !== 'undefined') {
            busData.forEach(bus => {
                if (!bus.points) return; 
                var pts = bus.points.map(p => [p[0] + currentAdjustY, p[1]]);
                for (var i = 0; i < pts.length - 1; i++) {
                    var dist = safeGetDist(exactLat, exactLng, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
                    if (dist <= margin) {
                        var bColor = (typeof busColors !== 'undefined' && busColors[bus.type]) ? busColors[bus.type] : '#333';
                        passingBuses.push(`<span style="color:${bColor}; font-weight:bold;">[${bus.type || '일반'}]</span> ${bus.name}`);
                        break; 
                    }
                }
            });
        }

        var safeLandmarks = (typeof allLandmarks !== 'undefined') ? allLandmarks : [];
        var nearby = safeLandmarks.map(lm => {
            return { name: lm.name, dist: Math.sqrt(Math.pow(lat - lm.lat, 2) + Math.pow(lng - lm.lng, 2)), type: lm.type };
        }).filter(lm => lm.dist < 1000).sort((a, b) => a.dist - b.dist).slice(0, 4);

        var suggestions = [];
        nearby.forEach(lm => {
            var cleanName = lm.name.replace(/역$/, '');
            if (lm.type === 'subway' || lm.name.endsWith('역')) { suggestions.push(`${cleanName}역`, `${cleanName}역입구`); } 
            else { suggestions.push(`${lm.name}`, `${lm.name}입구`); }
        });
        
        window.tempBusStopData = { lat: lat, lng: lng, buses: passingBuses };
        
        var nameInput = document.getElementById('bus-stop-name-input');
        if(nameInput) nameInput.value = "";
        
        var suggestHtml = [...new Set(suggestions)].slice(0, 8).map(s => 
            `<span style="display:inline-block; background:#eef5ff; padding:4px 8px; margin:3px; border-radius:12px; cursor:pointer; font-size:12px; border:1px solid #0077DD; color:#0077DD; box-shadow:1px 1px 2px rgba(0,0,0,0.2);" onclick="document.getElementById('bus-stop-name-input').value='${s}'">${s}</span>`
        ).join("");
        
        var sugBox = document.getElementById('bus-stop-suggestions');
        if(sugBox) sugBox.innerHTML = suggestHtml || "추천 데이터 없음";
        
        var infoBox = document.getElementById('bus-stop-passing-info');
        if(infoBox) infoBox.innerHTML = `<b>🚌 정차 예정 노선:</b><br>${passingBuses.length > 0 ? passingBuses.join("<br>") : "<span style='color:#999;'>경유 노선 없음</span>"}`;
        
        var modal = document.getElementById('bus-stop-modal');
        if(modal) modal.style.display = 'flex';

    } catch (err) {
        alert("🚨 정류장 추가 중 에러 발생!\n원인: " + err.message);
        console.error(err);
    }
};
// 3. 사라졌던 '모달창의 추가 버튼(저장)' 함수 부활!
window.confirmAddBusStop = function() {
    try {
        var nameInput = document.getElementById('bus-stop-name-input');
        if(!nameInput || !nameInput.value.trim()) { 
            alert("정류장 이름을 입력해주세요!"); 
            return; 
        }
        
        // 지도 클릭 시 저장해둔 좌표 데이터가 날아가지 않았는지 확인
        if (!window.tempBusStopData) {
            alert("⚠️ 좌표 정보가 유실되었습니다. 창을 닫고 지도를 다시 클릭해주세요.");
            return;
        }

        // 🛡️ 출석부(stationDictionary) 확인 로직 (중복 방지)
        var finalName = nameInput.value.trim() + " 정류장";
        
        // (주의: stationDictionary가 전역 변수로 선언되어 있어야 정상 작동합니다.
        // 만약 없으면 그냥 덮어쓰거나 새로 추가하도록 에러를 방지했습니다.)
        if (typeof stationDictionary !== 'undefined' && stationDictionary[finalName]) {
            alert("이미 지도에 같은 이름의 정류장이 있습니다!\n기존 정류장에 노선이 통합됩니다.");
            var existingStop = stationDictionary[finalName];
            
            var mergedBuses = new Set(existingStop.allPassingBuses || []);
            (window.tempBusStopData.buses || []).forEach(b => mergedBuses.add(b));
            
            existingStop.allPassingBuses = Array.from(mergedBuses);
            existingStop.passingBuses = Array.from(mergedBuses);
            existingStop.isManual = true; // 수동으로 합쳤으니 영구 보존 락 걸기!
        } else {
            // 완전 새로운 정류장 만들기
            var stopData = { 
                name: finalName, 
                lat: window.tempBusStopData.lat, 
                lng: window.tempBusStopData.lng, 
                type: 'busStop', 
                color: '#333',
                allPassingBuses: window.tempBusStopData.buses || [], 
                passingBuses: [...(window.tempBusStopData.buses || [])],
                isManual: true // 수동 생성 영구 보존 락!
            };
            
            // 지도에 마커 찍고, 내 랜드마크 데이터에 밀어넣기
            if (typeof addMarkerToMap === 'function') addMarkerToMap(stopData); 
            if (typeof myLandmarks !== 'undefined') myLandmarks.push(stopData);
            if (typeof stationDictionary !== 'undefined') stationDictionary[finalName] = stopData;
        }

        // 로컬 스토리지에 최종 저장
        if (typeof myLandmarks !== 'undefined') {
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        }

        // 모달창 강제로 닫기
        var modal = document.getElementById('bus-stop-modal');
        if (modal) modal.style.display = 'none'; 
        
        // 정류장 추가 모드 끄기 (해당 함수가 있다면 실행)
        if (typeof toggleBusStopMode === 'function') toggleBusStopMode();
        
        // 새로 추가된 정류장에 툴팁(말풍선)이 바로 뜨게 하려면 새로고침이 제일 깔끔합니다.
        // (선택 사항: 원치 않으시면 아래 줄을 지워주세요)
        location.reload();

    } catch(err) {
        alert("🚨 정류장 저장 중 에러 발생!\n원인: " + err.message);
        console.error(err);
    }
};
// =========================================================
// ★ [최종 수정판] 전체 지도 기준! 브라우저 한계 우회 초고화질 캡처
// =========================================================
function downloadUltraHighResMap() {
    var btn = document.getElementById('full-capture-btn') || document.getElementById('capture-btn'); 
    var originalText = btn ? btn.innerHTML : "다운로드";
    if (btn) btn.innerHTML = "⏳ 극한 렌더링 중... (잠시 멈출 수 있습니다)";

    var controls = document.querySelector('.leaflet-control-container');
    if (controls) controls.style.display = 'none';

    var mapDiv = document.getElementById('map');
    var originalCssText = mapDiv.style.cssText;
    var originalCenter = map.getCenter();
    var originalZoom = map.getZoom();

    // 1. 전체 지도 비율 계산
    var ratio = totalHeight / totalWidth;
    
    // 2. 가로 5000px 고정 (scale 1로 찍어서 메모리 폭발로 인한 '잘림 현상' 원천 차단)
    var captureWidth = 5000; 
    var captureHeight = Math.round(captureWidth * ratio);

    // ★ 해결 핵심 1: 스크롤 꼬임 방지를 위해 화면을 맨 위로 올리고 지도를 최상단에 고정
    window.scrollTo(0, 0);
    mapDiv.style.position = 'absolute'; 
    mapDiv.style.top = '0px';
    mapDiv.style.left = '0px';
    mapDiv.style.width = captureWidth + 'px';
    mapDiv.style.height = captureHeight + 'px';
    mapDiv.style.zIndex = '9999'; 

    map.invalidateSize(false);
    map.fitBounds(mapBounds, { animate: false });

    // ★ 해결 핵심 2: 선(SVG)과 배경이 5000px 영역 끝까지 완벽하게 퍼질 때까지 3초 넉넉하게 대기
    setTimeout(function() {
        html2canvas(mapDiv, {
            allowTaint: true,
            useCORS: true,
            scale: 1, // ★ 브라우저 한계(8000px 이상 잘림)를 피하기 위해 스케일은 1로 고정!
            width: captureWidth,
            height: captureHeight,
            windowWidth: captureWidth, // ★ html2canvas가 화면 밖 영역도 강제로 인식하도록 지정
            windowHeight: captureHeight,
            backgroundColor: (typeof isSubwayMode !== 'undefined' && isSubwayMode) ? "#ffffff" : "#aaddff" 
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.download = '효빈광역시_전체지도_초고화질.webp';
            link.href = canvas.toDataURL("image/png");
            link.click();

            restoreMap();
            alert("🎉 드디어 안 잘린 전체 지도 캡처 성공!");
        }).catch(function(err) {
            console.error(err);
            alert("🚨 캡처 실패! 에러: " + err);
            restoreMap();
        });
    }, 3000);

    function restoreMap() {
        mapDiv.style.cssText = originalCssText || 'width: 100vw; height: 100vh;';
        map.invalidateSize(false);
        map.setView(originalCenter, originalZoom, { animate: false });
        if (controls) controls.style.display = 'block';
        if (btn) btn.innerHTML = originalText;
        window.scrollTo(0, 0);
    }
}
// =========================================================
// ★ [완전 무결점판] 마커 주변 대중교통 엑셀 추출 기능
// (쓸데없는 좌표 변형을 완전히 제거한 순수 스캔)
// =========================================================
function exportNearbyTransitData(radius = 1000) { 
    var subwayStations = allLandmarks.filter(m => m.type === 'subway');
    var targetMarkers = allLandmarks.filter(m => m.type !== 'subway');

    if (targetMarkers.length === 0) {
        alert("분석할 일반 마커 데이터가 없습니다.");
        return;
    }

    // 🛡️ 효빈광역시 좌표계 맞춤형 순수 수학 공식
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

    var allBusLines = [];

    // [1] hyobin_bus.js에 있는 모든 버스 노선 (간선, 지선, 급행, 순환, 마을, 광역 전체)
    // 🚨 여기서 절대 adjustY를 더하지 않고, 원본 좌표 그대로 가져옵니다.
    if (typeof rawBusJson !== 'undefined' && rawBusJson.lines) {
        rawBusJson.lines.forEach(line => {
            var rings = Array.isArray(line.points[0][0]) ? line.points : [line.points];
            allBusLines.push({ name: line.name, rings: rings });
        });
    }

    // [2] 로컬 스토리지에 혹시 남아있을 수 있는 미저장 버스 노선 병합 (중복 방지)
    var savedLinesStr = localStorage.getItem('hyobin_lines');
    if (savedLinesStr) {
        var savedLines = JSON.parse(savedLinesStr);
        savedLines.forEach(line => {
            if(line.points && line.points.length > 0) {
                var rings = Array.isArray(line.points[0][0]) ? line.points : [line.points];
                if (!allBusLines.find(b => b.name === line.name)) {
                    allBusLines.push({ name: line.name, rings: rings });
                }
            }
        });
    }

    var csvContent = "\uFEFF"; 
    csvContent += `마커 이름,분류,주변 지하철역(${radius}m 이내),주변 버스노선(${radius}m 이내)\n`;

    targetMarkers.forEach(marker => {
        var mLat = marker.lat;
        var mLng = marker.lng;

        // [지하철 스캔] 
        var nearbySubways = [];
        subwayStations.forEach(station => {
            var dx = mLat - station.lat;
            var dy = mLng - station.lng;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) nearbySubways.push(`${station.name}(${Math.round(dist)}m)`);
        });

        // [버스 스캔] 
        var nearbyBuses = [];
        allBusLines.forEach(bus => {
            var isNearby = false;
            
            for (var r = 0; r < bus.rings.length; r++) {
                var ring = bus.rings[r];
                for (var i = 0; i < ring.length - 1; i++) {
                    // 순수 좌표 그대로 직선거리를 계산합니다.
                    var dist = safeGetDist(mLat, mLng, ring[i][0], ring[i][1], ring[i+1][0], ring[i+1][1]);
                    
                    if (dist <= radius) {
                        isNearby = true;
                        break; 
                    }
                }
                if (isNearby) break; 
            }
            
            if (isNearby) nearbyBuses.push(bus.name);
        });

        var subwayStr = nearbySubways.length > 0 ? `"${nearbySubways.join(", ")}"` : '"없음"';
        var busStr = nearbyBuses.length > 0 ? `"${nearbyBuses.join(", ")}"` : '"없음"';
        
        csvContent += `"${marker.name}","${marker.type}",${subwayStr},${busStr}\n`;
    });

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `효빈광역시_대중교통_분석결과(${radius}m)_에러해결.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`🎉 좌표 튕김 현상 완벽 제거! 총 ${allBusLines.length}개의 전체 버스 노선 정상 스캔 완료.`);
}