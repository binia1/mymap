// =========================================================
    // 📸 1. 지도 이미지 캡처 기능 모음
    // =========================================================
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
            ignoreElements: (element) => { return false; }
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
                allowTaint: true, useCORS: true, scale: 1, 
                width: gridWidth, height: gridHeight, backgroundColor: "#aaddff" 
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

        var ratio = totalHeight / totalWidth;
        var captureWidth = 5000; 
        var captureHeight = Math.round(captureWidth * ratio);

        window.scrollTo(0, 0);
        mapDiv.style.position = 'absolute'; 
        mapDiv.style.top = '0px'; mapDiv.style.left = '0px';
        mapDiv.style.width = captureWidth + 'px'; mapDiv.style.height = captureHeight + 'px';
        mapDiv.style.zIndex = '9999'; 

        map.invalidateSize(false);
        map.fitBounds(mapBounds, { animate: false });

        setTimeout(function() {
            html2canvas(mapDiv, {
                allowTaint: true, useCORS: true, scale: 1, 
                width: captureWidth, height: captureHeight,
                windowWidth: captureWidth, windowHeight: captureHeight,
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
    // 🧮 2. 수학 공식 및 공통 유틸리티 함수
    // =========================================================
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


    // =========================================================
    // 🚌 3. 버스 정류장 수동 클릭 및 생성 함수
    // =========================================================
    function handleBusStopClick(e) {
        try {
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
                        var dist = pointToSegmentDist(exactLat, exactLng, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
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
            if(modal) {
                modal.style.display = 'flex';
            } else {
                alert("⚠️ HTML에 'bus-stop-modal' 이라는 아이디를 가진 창이 없습니다!");
            }
        } catch (err) {
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
            isManual: true, 
            allPassingBuses: tempBusStopData.buses, 
            passingBuses: [...tempBusStopData.buses] 
        };
        
        addMarkerToMap(stopData); 
        myLandmarks.push(stopData);
        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        closeModal('bus-stop-modal'); 
        toggleBusStopMode();
    }


    // =========================================================
    // 📊 4. [완벽 파라미터 적용판] 각종 CSV(엑셀) 추출 함수 모음
    // =========================================================

    // ① [도로 대장 추출] (파손되었던 구조 완벽 복구)
    function downloadRoadDataCSV() {
        let allLines = [];
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
        allLines = allLines.concat(myLines);

        if (allLines.length === 0) { alert("저장된 도로 데이터가 없습니다."); return; }

        let csvContent = "\uFEFF"; 
        csvContent += "도로명,색상,도로 길이,시작지점,종착지점,경유 행정구역,좌표데이터\n";

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

        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "hyobin_road_analysis.csv";
        link.style.visibility = 'hidden';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // ② [시설물 대장 추출] (행정동/법정동 분리 및 모든 파라미터 적용)
    function downloadMarkerDataCSV() {
        var combinedList = [];
        if (typeof allLandmarks !== 'undefined') {
            allLandmarks.forEach(m => { if (m.type !== 'subway') combinedList.push(m); });
        }
        if (typeof cvsLayer !== 'undefined') {
            cvsLayer.eachLayer(function(marker) {
                var data = marker.cvsData;
                if (!data) return;
                combinedList.push({
                    name: data.brand + " " + data.branch + "점", type: "cvs",
                    lat: Math.round(marker.getLatLng().lat), lng: Math.round(marker.getLatLng().lng),
                    hours: "24시간 영업 (연중무휴)", phone: "", rating: "4.2", reviews: "25", desc: "24시 편의점"
                });
            });
        }
        if (typeof busStopLayer !== 'undefined') {
            busStopLayer.eachLayer(function(marker) {
                var nameMatch = marker.options.icon && marker.options.icon.options.html ? marker.options.icon.options.html.match(/<\/div><div class="station-name-label"[^>]*>(.*?)<\/div>/) : null;
                var stopName = nameMatch ? nameMatch[1] + " 정류장" : "정류장";
                combinedList.push({
                    name: stopName, type: "busStop",
                    lat: Math.round(marker.getLatLng().lat), lng: Math.round(marker.getLatLng().lng),
                    hours: "상시 운행", phone: "", rating: "", reviews: "", desc: "시내버스 정류장"
                });
            });
        }

        if (combinedList.length === 0) { alert("추출할 시설물 데이터가 없습니다."); return; }

        let csvContent = "\uFEFF"; 
        csvContent += "시설이름,카테고리(타입),시/도,시/군/구,행정동,법정동,도로명주소,전화번호,영업시간,평점,리뷰수,위도,경도,상세설명\n";

        combinedList.forEach(m => {
            var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(m.lat, m.lng) : { province: "효빈광역시", gugun: "", admin: "", legal: "", roadAddress: "" };
            
            var name = `"${(m.name || "").replace(/"/g, '""')}"`;
            var type = `"${m.type || 'normal'}"`;
            var province = `"${addr.province || ''}"`;
            var gugun = `"${addr.gugun || ''}"`;
            var adminDong = `"${addr.admin || ''}"`;
            var legalDong = `"${addr.legal || ''}"`;
            var roadAddr = `"${addr.roadAddress || ''}"`;
            var phone = `"${m.phone || ''}"`;
            var hours = `"${(m.hours || '').replace(/"/g, '""')}"`;
            var rating = `"${m.rating !== undefined ? m.rating : ''}"`;
            var reviews = `"${m.reviews !== undefined ? m.reviews : ''}"`;
            var desc = `"${(m.desc || '').replace(/"/g, '""')}"`;

            csvContent += `${name},${type},${province},${gugun},${adminDong},${legalDong},${roadAddr},${phone},${hours},${rating},${reviews},${m.lat},${m.lng},${desc}\n`;
        });

        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_통합_시설물대장_${new Date().toLocaleDateString()}.csv`; link.click();
        alert("✨ 시설물 대장이 모든 파라미터와 함께 다운로드되었습니다!");
    }

    // ③ [주변 대중교통 분석 추출] (정류장 알고리즘 적용 및 행정동/법정동 분리)
    function exportNearbyTransitData() { 
        var inputRadius = prompt("검색할 반경(거리)을 미터(m) 단위로 입력하세요.\n(예: 500, 1000)", "500");
        if (inputRadius === null || inputRadius.trim() === "") return;

        var radius = parseInt(inputRadius, 10);
        if (isNaN(radius) || radius <= 0) { alert("유효한 숫자(0보다 큰 정수)를 입력해주세요."); return; }

        var subwayStations = allLandmarks.filter(m => m.type === 'subway');
        var targetMarkers = allLandmarks.filter(m => m.type !== 'subway' && m.type !== 'busStop');

        if (targetMarkers.length === 0) { alert("분석할 일반 마커 데이터가 없습니다."); return; }

        var allBusRoutes = [];
        var currentAdjustY = (typeof adjustY !== 'undefined') ? adjustY : 0;
        var sourceBusData = [];
        if (typeof rawBusJson !== 'undefined' && rawBusJson.lines) sourceBusData = rawBusJson.lines;
        else if (typeof busData !== 'undefined') sourceBusData = busData;

        sourceBusData.forEach(bus => {
            if (!bus.points || bus.points.length < 2) return;
            var correctedPts = bus.points.map(p => [p[0] + currentAdjustY, p[1]]);
            allBusRoutes.push({ name: `[${bus.type || '일반'}] ${bus.name}`, points: correctedPts });
        });

        var savedLinesStr = localStorage.getItem('hyobin_lines');
        if (savedLinesStr) {
            JSON.parse(savedLinesStr).forEach(line => {
                if(line.points && line.points.length > 0) {
                    var correctedPts = line.points.map(p => [p[0] + currentAdjustY, p[1]]);
                    if (!allBusRoutes.find(b => b.name === line.name)) allBusRoutes.push({ name: line.name, points: correctedPts });
                }
            });
        }

        let csvContent = "\uFEFF"; 
        csvContent += `시설이름,카테고리,시/도,시/군/구,행정동,법정동,도로명주소,전화번호,영업시간,평점,리뷰수,주변 지하철역(${radius}m 이내),주변 버스노선(${radius}m 이내),위도,경도\n`;

        targetMarkers.forEach(marker => {
            var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(marker.lat, marker.lng) : { province: "효빈광역시", gugun: "", admin: "", legal: "", roadAddress: "" };

            var nearbySubways = [];
            subwayStations.forEach(station => {
                var dist = Math.sqrt(Math.pow(marker.lat - station.lat, 2) + Math.pow(marker.lng - station.lng, 2));
                if (dist <= radius) {
                    var lineNames = [];
                    var sLines = station.lines || station.lineCodes || [];
                    sLines.forEach(lid => { if (typeof subwayLines !== 'undefined' && subwayLines[lid]) lineNames.push(subwayLines[lid].name); });
                    var linePrefix = lineNames.length > 0 ? `[${lineNames.join("/")}] ` : "";
                    nearbySubways.push(`${linePrefix}${station.name}(${Math.round(dist)}m)`);
                }
            });

            var nearbyBuses = [];
            allBusRoutes.forEach(bus => {
                var isMatched = false;
                for (var i = 0; i < bus.points.length - 1; i++) {
                    if (pointToSegmentDist(marker.lat, marker.lng, bus.points[i][0], bus.points[i][1], bus.points[i+1][0], bus.points[i+1][1]) <= radius) {
                        isMatched = true; break;
                    }
                }
                if (isMatched && !nearbyBuses.includes(bus.name)) nearbyBuses.push(bus.name);
            });

            var name = `"${(marker.name || "").replace(/"/g, '""')}"`;
            var type = `"${marker.type || 'normal'}"`;
            var province = `"${addr.province || ''}"`;
            var gugun = `"${addr.gugun || ''}"`;
            var adminDong = `"${addr.admin || ''}"`; 
            var legalDong = `"${addr.legal || ''}"`; 
            var roadAddr = `"${addr.roadAddress || ''}"`;
            var phone = `"${marker.phone || ''}"`;
            var hours = `"${(marker.hours || '').replace(/"/g, '""')}"`;
            var rating = `"${marker.rating !== undefined ? marker.rating : ''}"`;
            var reviews = `"${marker.reviews !== undefined ? marker.reviews : ''}"`;
            var subwayStr = nearbySubways.length > 0 ? `"${nearbySubways.join(", ")}"` : '"없음"';
            var busStr = nearbyBuses.length > 0 ? `"${nearbyBuses.join(", ")}"` : '"없음"';

            csvContent += `${name},${type},${province},${gugun},${adminDong},${legalDong},${roadAddr},${phone},${hours},${rating},${reviews},${subwayStr},${busStr},${Math.round(marker.lat)},${Math.round(marker.lng)}\n`;
        });

        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_대중교통_분석결과(${radius}m)_최종본.csv`; link.click();
        alert(`🎉 분석 완료! 행정동/법정동 분리 및 버스 노선 100% 검출이 반영된 대중교통 분석 CSV 파일이 다운로드되었습니다.`);
    }

    // ④ [편의점 대장 추출] (행정동/법정동 분리 및 도로명 주소 추가)
    function downloadCVSDataCSV() {
        var count = 0;
        let csvContent = "\uFEFF"; 
        csvContent += "편의점 브랜드,지점명,생성구분,시/도,시/군/구,행정동,법정동,도로명주소,위도,경도\n";
        
        cvsLayer.eachLayer(function(marker) {
            var data = marker.cvsData;
            if (!data) return;
            
            var lat = Math.round(marker.getLatLng().lat);
            var lng = Math.round(marker.getLatLng().lng);
            var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(lat, lng) : { province: "효빈광역시", gugun: "", admin: "", legal: "", roadAddress: "" };
            var typeStr = data.isManual ? "수동 (기존마커 변환)" : "상권 자동배치";
            
            csvContent += `"${data.brand}","${data.branch}","${typeStr}","${addr.province}","${addr.gugun}","${addr.admin}","${addr.legal}","${addr.roadAddress}","${lat}","${lng}"\n`;
            count++;
        });

        if(count === 0) { alert("추출할 편의점 데이터가 없습니다."); return; }

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_편의점_대장_${new Date().toLocaleDateString()}.csv`; link.click();
    }

    // ⑤ [교차로 대장 추출] (행정동/법정동 분리 및 도로명 주소 추가)
    function downloadIntersectionCSV() {
        var intersects = allLandmarks.filter(m => m.type === 'intersect' || m.type === 'ic_jc');
        if (intersects.length === 0) { alert("추출할 교차로 데이터가 없습니다."); return; }

        let csvContent = "\uFEFF"; 
        csvContent += "교차로명,종류,시/도,시/군/구,행정동,법정동,도로명주소,위도,경도\n";

        intersects.forEach(marker => {
            var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(marker.lat, marker.lng) : { province: "효빈광역시", gugun: "", admin: "", legal: "", roadAddress: "" };
            var typeName = marker.type === 'ic_jc' ? "나들목(IC/JC)" : "교차로/사거리";
            csvContent += `"${marker.name}","${typeName}","${addr.province}","${addr.gugun}","${addr.admin}","${addr.legal}","${addr.roadAddress}","${Math.round(marker.lat)}","${Math.round(marker.lng)}"\n`;
        });

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_교차로_대장_${new Date().toLocaleDateString()}.csv`; link.click();
    }

    // ⑥ [버스 정류장 대장 추출] (행정동/법정동 분리 및 도로명 주소 추가)
    function downloadBusStopCSV() {
        var busStops = allLandmarks.filter(m => m.type === 'busStop');
        if (busStops.length === 0) { alert("추출할 정류장 데이터가 없습니다."); return; }

        let csvContent = "\uFEFF"; 
        csvContent += "정류장명,설치유형,시/도,시/군/구,행정동,법정동,도로명주소,경유 노선,위도,경도\n";

        busStops.forEach(stop => {
            var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(stop.lat, stop.lng) : { province: "효빈광역시", gugun: "", admin: "", legal: "", roadAddress: "" };
            var routes = (stop.passingBuses || []).map(r => r.replace(/<[^>]*>?/gm, '')).join(" | ");
            var type = stop.isManual ? "수동" : "자동";
            csvContent += `"${stop.name}","${type}","${addr.province}","${addr.gugun}","${addr.admin}","${addr.legal}","${addr.roadAddress}","${routes}","${Math.round(stop.lat)}","${Math.round(stop.lng)}"\n`;
        });

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `효빈광역시_버스정류장_대장_${new Date().toLocaleDateString()}.csv`; link.click();
    }