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
// 작업 중인 교차로 데이터를 임시로 담아두는 변수
// =========================================================
    // 🚦 교차로 전용 레이어 토글 기능
    // =========================================================
    var intersectionLayer = L.layerGroup(); // 교차로를 담을 빈 바구니(레이어) 생성

    // 1. 하드코딩된 교차로 데이터를 마커로 만들어서 레이어에 미리 장전해둠
// 1. 붕 떠 있던 반복문을 함수로 감싸서, 데이터가 준비된 후 실행되도록 보호
window.initSubwayFilters = function() {
    var filterContainer = document.getElementById('subway-filter-list');
    var linesContainer = document.getElementById('station-lines-container');
    
    // 데이터나 컨테이너가 없으면 오류 없이 중단
    if (!filterContainer || !linesContainer || !window.subwayLines) return; 

    for (const [key, val] of Object.entries(window.subwayLines)) {
        var label = document.createElement('label'); label.className = 'line-checkbox-label';
        var checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = key; checkbox.name = 'stationLine';
        var colorBox = document.createElement('div'); colorBox.className = 'line-color-box'; colorBox.style.backgroundColor = val.color;
        label.appendChild(checkbox); label.appendChild(colorBox); label.appendChild(document.createTextNode(val.name));
        linesContainer.appendChild(label);

        var filterItem = document.createElement('label'); filterItem.className = 'filter-item';
        var fChk = document.createElement('input'); fChk.type = 'checkbox'; fChk.value = key; fChk.checked = true; fChk.name = 'subwayFilter';
        
        // 다른 파일(또는 하단)에 있는 applySubwayFilter 함수도 window로 연결
        fChk.onchange = window.applySubwayFilter; 
        
        var fDot = document.createElement('div'); fDot.className = 'filter-color-dot'; fDot.style.backgroundColor = val.color;
        filterItem.appendChild(fChk); filterItem.appendChild(fDot); filterItem.appendChild(document.createTextNode(val.name));
        filterContainer.appendChild(filterItem);
    }
};

window.togglePaletteList = function() {
    var list = document.getElementById('palette-list');
    var icon = document.getElementById('toggle-icon');
    if (list.style.display === 'block') { list.style.display = 'none'; icon.innerText = '▼'; } 
    else { list.style.display = 'block'; icon.innerText = '▲'; }
};

window.selectSubwayLine = function(val) {
    if (!val || !window.subwayLines) return;
    var line = window.subwayLines[val];
    
    // 상태 변수와 함수들도 전부 window로 접근
    window.currentSelectedColor = line.color;
    if(window.updateHeaderPreview) window.updateHeaderPreview(line.color);
    
    window.isStationMode = false;
    window.isAreaMode = false;
    window.isRadiusMode = false;
    document.getElementById('station-btn').classList.remove('active-btn');
    document.getElementById('area-btn').classList.remove('active-btn');
    document.getElementById('radius-btn').classList.remove('active-btn');
    document.getElementById('map').style.cursor = "default";

    if (!window.isDrawingMode) window.toggleDrawMode();
    alert(`${line.name} 선택됨! 지도를 클릭해서 노선을 그리세요.`);
};

window.toggleDrawMode = function() {
    window.isStationMode = false; window.isAreaMode = false; window.isRadiusMode = false;
    document.getElementById('station-btn').classList.remove('active-btn');
    document.getElementById('area-btn').classList.remove('active-btn');
    document.getElementById('radius-btn').classList.remove('active-btn');

    window.isDrawingMode = !window.isDrawingMode; 
    var btn = document.getElementById("draw-btn");
    if (window.isDrawingMode) {
        btn.classList.add("active-btn"); 
        document.getElementById("map").style.cursor = "crosshair"; 
        window.drawPoints = [];
        window.currentDrawMarkers = [];
    } else { 
        if(window.resetDrawMode) window.resetDrawMode(); 
    }
};

window.toggleAreaMode = function() {
    window.isDrawingMode = false; window.isStationMode = false; window.isRadiusMode = false;
    document.getElementById('draw-btn').classList.remove('active-btn');
    document.getElementById('station-btn').classList.remove('active-btn');
    document.getElementById('radius-btn').classList.remove('active-btn');
    if(window.resetDrawMode) window.resetDrawMode(); 

    window.isAreaMode = !window.isAreaMode;
    var btn = document.getElementById("area-btn");
    if (window.isAreaMode) {
        btn.classList.add("active-btn");
        document.getElementById("map").style.cursor = "cell";
        window.areaPoints = [];
    } else {
        if(window.resetAreaMode) window.resetAreaMode();
    }
};

window.toggleRadiusMode = function() {
    window.isDrawingMode = false; window.isStationMode = false; window.isAreaMode = false;
    document.getElementById('draw-btn').classList.remove('active-btn');
    document.getElementById('station-btn').classList.remove('active-btn');
    document.getElementById('area-btn').classList.remove('active-btn');
    if(window.resetDrawMode) window.resetDrawMode(); 
    if(window.resetAreaMode) window.resetAreaMode();

    window.isRadiusMode = !window.isRadiusMode;
    var btn = document.getElementById("radius-btn");
    if (window.isRadiusMode) {
        btn.classList.add("active-btn");
        document.getElementById("map").style.cursor = "crosshair";
        window.radiusCenter = null;
        window.tempRadiusCircle = null;
    } else {
        btn.classList.remove("active-btn");
        document.getElementById("map").style.cursor = "default";
        if (window.tempRadiusCircle && window.map) window.map.removeLayer(window.tempRadiusCircle);
        window.tempRadiusCircle = null;
        window.radiusCenter = null;
    }
};

window.toggleUnit = function() {
    window.useKmUnit = !window.useKmUnit;
    var btn = document.getElementById('unit-btn');
    if(btn) btn.innerHTML = window.useKmUnit ? "🔄 단위: km²" : "🔄 단위: m²";
    if (window.isDistrictAreaMode && window.updateDistrictAreaLabels) {
        window.updateDistrictAreaLabels();
    }
};

window.getWeightedArea = function(points, name) {
    if(!window.calculatePolygonArea) return 0;
    var rawArea = window.calculatePolygonArea(points);
    
    if (name && name.indexOf("중구") !== -1) {
        return rawArea * 1.05; 
    }

    if(window.searchablePolygons) {
        var jungGuPoly = window.searchablePolygons.find(p => p.name === "중구" && p.type === 'gugun');
        
        if (jungGuPoly && window.isPointInPolygon) {
            var bounds = L.polygon(points).getBounds();
            var center = bounds.getCenter();

            if (window.isPointInPolygon(center.lat, center.lng, jungGuPoly.points)) {
                return rawArea * 1.05;
            }
        }
    }
    return rawArea * 1.395;
};

window.formatArea = function(area) {
    if (window.useKmUnit) {
        return (area / 1000000).toFixed(2) + "km²";
    } else {
        return Math.round(area).toLocaleString() + "m²";
    }
};

window.formatDistanceStr = function(dist) {
    if (dist >= 1000) {
        return (dist / 1000).toFixed(2) + "km";
    }
    return Math.round(dist) + "m";
};

window.downloadAllDataCSV = function() {
    var pData = window.searchablePolygons || [];
    var mData = window.measuredAreas || [];

    if (mData.length === 0 && pData.length === 0) {
        alert("저장할 데이터가 없습니다.");
        return;
    }

    var csvContent = "\uFEFF";
    csvContent += "구분,이름/ID,면적(m²),면적(km²),비고\n";

    pData.forEach(function(poly) {
        var area = window.getWeightedArea(poly.points, poly.name); 
        var m2 = Math.round(area);
        var km2 = (area / 1000000).toFixed(4);
        var typeName = (poly.type === 'gugun') ? "구/군" : 
                       (poly.type === 'admin') ? "행정동" :
                       (poly.type === 'legal') ? "법정동" : "기타";
        
        csvContent += `${typeName},${poly.name},${m2},${km2},행정구역 데이터\n`;
    });

    mData.forEach(function(item, index) {
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
};

// 스크립트가 로드된 후 필터 공장 가동 (시간차를 두어 데이터 로드 대기)
setTimeout(window.initSubwayFilters, 1000);


// =========================================================
// ★ [NEW] 모든 노선별 일반 마커 & 역명 개별 제어 시스템
// =========================================================
// 1. 함수도 window에 확실히 등록
window.initSubwayDetailControls = function() {
    var container = document.getElementById('subway-detail-box');
    
    // 데이터 파일이 미처 로드되지 않았거나 패널이 없으면 에러 없이 중단
    if(!container || !window.subwayLines) return; 
    
    var dynamicCss = "";
    
    // 2. 다른 파일에 있는 subwayLines를 가져올 때 명시적으로 window.subwayLines 사용
    for (const [key, val] of Object.entries(window.subwayLines)) {
        
        dynamicCss += `
            .hide-marker-${key} .line-${key}.normal-marker { display: none !important; }
            .hide-label-${key} .line-${key}.normal-marker .station-name-label { display: none !important; }
        `;
        
        var div = document.createElement('div');
        div.style.borderBottom = "1px solid #ddd";
        div.style.padding = "6px 0";
        div.style.fontSize = "12px";
        
        div.innerHTML = `
            <div style="font-weight:bold; color:${val.color}; margin-bottom:4px;">${val.name}</div>
            <label style="margin-right:8px; cursor:pointer; color:#555;">
                <input type="checkbox" onchange="window.toggleSpecificLine('${key}', 'marker', this.checked)"> 마커 숨김
            </label>
            <label style="cursor:pointer; color:#555;">
                <input type="checkbox" onchange="window.toggleSpecificLine('${key}', 'label', this.checked)"> 역명 숨김
            </label>
        `;
        container.appendChild(div);
    }
    
    var styleSheet = document.createElement('style');
    styleSheet.innerHTML = dynamicCss;
    document.head.appendChild(styleSheet);
}

window.toggleSubwayDetailBox = function() {
    var box = document.getElementById('subway-detail-box');
    if(box) box.style.display = (box.style.display === 'block') ? 'none' : 'block';
};

window.toggleSpecificLine = function(lineKey, type, isHidden) {
    // 3. 다른 파일에서 생성된 지도를 조작할 때도 window.map 사용
    if(!window.map) return; 
    
    var mapContainer = window.map.getContainer();
    var className = (type === 'marker') ? 'hide-marker-' + lineKey : 'hide-label-' + lineKey;
    
    if (isHidden) {
        mapContainer.classList.add(className);
    } else {
        mapContainer.classList.remove(className);
    }
};

// 4. 실행할 때도 window에 등록된 함수를 호출
setTimeout(window.initSubwayDetailControls, 1000);

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
// ★ 지도 줌 레벨 및 노선별 역명/마커 표시 완벽 제어
// =========================================================
var labelStyle = document.createElement('style');
labelStyle.innerHTML = `
    /* 1. 버스 정류장 제어 */
    .hide-map-labels .custom-bus-stop .station-name-label { display: none !important; }
    .custom-bus-stop:hover .station-name-label { 
        display: block !important; position: absolute; z-index: 9999 !important; 
        background: rgba(255,255,255,0.9); padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc; 
    }

    /* 2. 7호선 일반역(비환승, 주요역 아님) 줌 아웃 시 마커 자체를 숨김! */
    .hide-line7-markers .line-7.normal-marker,
    .hide-line7-markers .line-7B.normal-marker { display: none !important; }

    /* 3. 지하철 역명 제어 */
    .hide-normal-stations .custom-station .normal-station { display: none !important; }
    .hide-all-stations .custom-station .station-name-label { display: none !important; }
    
/* 4. [NEW] 노선별 특정 역명 끄기 (주요역/환승역은 절대 건드리지 않음!) */
    .hide-label-7 .line-7.normal-marker .station-name-label, 
    .hide-label-7 .line-7B.normal-marker .station-name-label { display: none !important; }

    .custom-station:hover .station-name-label {
        display: block !important; position: absolute; z-index: 9999 !important;
        background: rgba(255,255,255,0.9); padding: 2px 4px; border-radius: 4px; border: 1px solid #333;
    }
`;
document.head.appendChild(labelStyle);

var labelMode = 0; // 0: 자동, 1: 전체, 2: 주요역, 3: 숨김

window.toggleStationLabels = function() {
    labelMode = (labelMode + 1) % 4;
    var btn = document.getElementById('station-label-btn');
    var mapContainer = map.getContainer();
    
    mapContainer.classList.remove('hide-normal-stations', 'hide-all-stations');

    if (labelMode === 0) {
        btn.innerHTML = "🔠 역명 표시: 자동 (줌 연동)";
        updateLabelVisibility(); 
    } else if (labelMode === 1) {
        btn.innerHTML = "🔠 역명 표시: 전체 보기";
    } else if (labelMode === 2) {
        btn.innerHTML = "🔠 역명 표시: 주요역만 보기";
        mapContainer.classList.add('hide-normal-stations');
    } else if (labelMode === 3) {
        btn.innerHTML = "🔠 역명 표시: 모두 숨김";
        mapContainer.classList.add('hide-all-stations');
    }
};

// [NEW] 노선별 역명 강제 숨김/표시 스위치
window.toggleLineLabel = function(lineNum, isHidden) {
    var mapContainer = map.getContainer();
    if (isHidden) {
        mapContainer.classList.add('hide-label-' + lineNum);
    } else {
        mapContainer.classList.remove('hide-label-' + lineNum);
    }
};

function updateLabelVisibility() {
    var currentZoom = map.getZoom();
    var mapContainer = map.getContainer(); 

    // 초기화
    mapContainer.classList.remove('hide-map-labels', 'hide-normal-stations', 'hide-all-stations', 'hide-line7-markers');

    if (currentZoom < -0.5) mapContainer.classList.add('hide-map-labels'); // 버스

    // ★ 지도를 -1.5 이하로 축소하면 7호선 일반역은 "마커 자체"가 아예 사라집니다 (주요역만 남음)
    if (currentZoom <= -1.5) {
        mapContainer.classList.add('hide-line7-markers');
    }

    if (labelMode === 0) {
        if (currentZoom <= -2.5) {
            mapContainer.classList.add('hide-all-stations');
        } else if (currentZoom <= -1.0) {
            mapContainer.classList.add('hide-normal-stations'); // 주요역만 남음
        }
    } else if (labelMode === 2) {
        mapContainer.classList.add('hide-normal-stations');
    } else if (labelMode === 3) {
        mapContainer.classList.add('hide-all-stations');
    }
}

map.on('zoomend', updateLabelVisibility);
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
