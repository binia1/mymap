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
// 1. 점이 폴리곤 안에 있는지 확인하는 기본 함수
// 1. 점이 폴리곤(다중 구역 포함) 안에 있는지 확인하는 기본 함수
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
// 2. [핵심] 틈새(Gap)에 빠졌을 때, 가장 가까운 폴리곤 경계선까지의 거리를 구하는 수학 함수
// 2. 틈새(Gap)에 빠졌을 때, 가장 가까운 폴리곤 경계선까지의 거리를 구하는 수학 함수
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
    }
    return minDistance;
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

        savedLayerState.forEach(layer => {
            if (!map.hasLayer(layer)) map.addLayer(layer);
        });
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

                // ▼ 여기서부터 교체 ▼
                var isTransfer = activeLines.length >= 2;
                var isManualMajor = typeof myMajorStations !== 'undefined' && myMajorStations.includes(sName);
                var isMajor = (isTransfer || isManualMajor) ? "major-station" : "normal-station";
                var markerClass = (isTransfer || isManualMajor) ? "major-marker" : "normal-marker";
                var lineClasses = activeLines.map(l => "line-" + l).join(" ");

                iconHtml += `<div class="station-name-label ${isMajor}">${sName}</div>`;
                
                // 마커 아이콘 실시간 교체!
                marker.setIcon(L.divIcon({ 
                    className: `custom-station ${lineClasses} ${markerClass}`, // ★여기에 꼬리표가 들어갑니다
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
// =========================================================
// ★ [최종 수정판] 전체 지도 기준! 브라우저 한계 우회 초고화질 캡처
// =========================================================
function toggleSubwayFilterBox() {
    var box = document.getElementById('subway-filter-box');
    var btn = document.getElementById('subway-filter-btn');
    if (box.style.display === 'block') {
        box.style.display = 'none';
        btn.classList.remove('active-btn');
    } else {
        box.style.display = 'block';
        btn.classList.add('active-btn');
        // 필터 조작 시 지하철 레이어가 꺼져있다면 지도에 강제로 켜기
        if (!map.hasLayer(subwayLineLayer)) map.addLayer(subwayLineLayer);
        if (!map.hasLayer(subwayStationLayer)) map.addLayer(subwayStationLayer);
    }
}

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
// 3. 면적 계산 (다중 구역 합산 지원)
function calculatePolygonArea(points) {
    var totalArea = 0;
    var isMulti = Array.isArray(points[0][0]);
    var rings = isMulti ? points : [points];

    for (var r = 0; r < rings.length; r++) {
        var pts = rings[r];
        var areaSum = 0;
        for (var i = 0; i < pts.length; i++) {
            var p1 = pts[i];
            var p2 = pts[(i + 1) % pts.length];
            areaSum += (p1[1] * p2[0] - p2[1] * p1[0]);
        }
        totalArea += Math.abs(areaSum) / 2.0;
    }
    return totalArea;
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
