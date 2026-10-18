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
// =========================================================
// ★ [완전 무결점판] 마커 주변 대중교통 엑셀 추출 기능 (사용자 거리 지정 + 주소/노선명 포함)
// =========================================================
function exportNearbyTransitData() { 
    // ★ [추가됨] 사용자에게 검색 반경을 입력받습니다. (기본값: 500)
    var inputRadius = prompt("검색할 반경(거리)을 미터(m) 단위로 입력하세요.\n(예: 500, 1000)", "500");
    
    // 취소를 누르거나 입력값이 없으면 종료
    if (inputRadius === null || inputRadius.trim() === "") {
        return;
    }

    var radius = parseInt(inputRadius, 10);
    
    // 숫자가 아니거나 0 이하의 값이면 경고 후 종료
    if (isNaN(radius) || radius <= 0) {
        alert("유효한 숫자(0보다 큰 정수)를 입력해주세요.");
        return;
    }

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

    // [1] hyobin_bus.js에 있는 모든 버스 노선
    if (typeof rawBusJson !== 'undefined' && rawBusJson.lines) {
        rawBusJson.lines.forEach(line => {
            var rings = Array.isArray(line.points[0][0]) ? line.points : [line.points];
            allBusLines.push({ name: line.name, rings: rings });
        });
    }

    // [2] 로컬 스토리지에 남아있을 수 있는 미저장 버스 노선 병합
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
    // CSV 헤더에 입력받은 radius 값 동적 적용
    csvContent += `마커 이름,분류,소재지(행정구역),주변 지하철역(${radius}m 이내),주변 버스노선(${radius}m 이내)\n`;

    targetMarkers.forEach(marker => {
        var mLat = marker.lat;
        var mLng = marker.lng;

        // [주소 추출]
        var currentAddress = (typeof getFullAddress === 'function') ? getFullAddress(mLat, mLng) : "미지정 구역";
        if (!currentAddress) currentAddress = "미지정 구역";

        // [지하철 스캔] 
        var nearbySubways = [];
        subwayStations.forEach(station => {
            var dx = mLat - station.lat;
            var dy = mLng - station.lng;
            var dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= radius) {
                var lineNames = [];
                var sLines = station.lines || station.lineCodes || [];
                sLines.forEach(lid => {
                    if (typeof subwayLines !== 'undefined' && subwayLines[lid]) {
                        lineNames.push(subwayLines[lid].name);
                    }
                });
                
                var linePrefix = lineNames.length > 0 ? `[${lineNames.join("/")}] ` : "";
                nearbySubways.push(`${linePrefix}${station.name}(${Math.round(dist)}m)`);
            }
        });

        // [버스 스캔] 
        var nearbyBuses = [];
        allBusLines.forEach(bus => {
            var isNearby = false;
            for (var r = 0; r < bus.rings.length; r++) {
                var ring = bus.rings[r];
                for (var i = 0; i < ring.length - 1; i++) {
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
        
        csvContent += `"${marker.name}","${marker.type}","${currentAddress}",${subwayStr},${busStr}\n`;
    });

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `효빈광역시_대중교통_분석결과(${radius}m)_주소및노선포함.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`🎉 분석 완료! 반경 ${radius}m 내의 대중교통 데이터가 추출되었습니다.`);
}
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
// 🚏 버스 정류장 대장 CSV 추출 기능
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
