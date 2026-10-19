// =========================================================
// 8. 검색, 파일관리, 노선도 모드
// =========================================================
var searchHighlightLayer = null;

var isSubwayMode = false;
var savedLayerState = [];

map.on('overlayadd', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });
map.on('overlayremove', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });

// =========================================================
// 1. 편의점 레이어 선언 (클러스터링 적용)
// =========================================================
var cvsLayer = L.markerClusterGroup({
    disableClusteringAtZoom: 14, 
    maxClusterRadius: 80 
});

// =========================================================
// 2. 우측 상단 레이어 컨트롤 메뉴 (10대 카테고리 마커 그룹 완벽 통합)
// =========================================================
var overlays = { 
    "🏙️ 구/군 (상위)": guGunLayer,
    "🏢 행정 읍/면/동": adminLayer,
    "촘촘 법정 동/리": legalLayer,
    "🏗️ 개발지구": devLayer,
    "🛣️ 주요 도로망": roadLayer,
    "📏 2000x1500 그리드": gridLayer,        
    "🚌 버스 노선": busLineLayer,
    "🚏 버스 정류장": busStopLayer,
    "🛤️ 도시/일반철도 노선": subwayLineLayer,
    "🚉 도시/일반철도 역": subwayStationLayer,
    "🏪 편의점": cvsLayer,
    
    // ★ 누락되었던 10대 카테고리별 일반 마커 레이어 추가
    "🏫 교육/학교": catLayers.education,
    "🏢 주거/아파트": catLayers.residence,
    "🏛️ 공공/관공서": catLayers.public,
    "🛒 상업/마트/편의점": catLayers.commercial,
    "🍽️ 식당/카페": catLayers.food,
    "🍿 문화/숙박/종교": catLayers.culture,
    "🏥 의료/병원": catLayers.medical,
    "✈️ 교통/산업/인프라": catLayers.infra,
    "🌲 자연/공원/수변": catLayers.nature,
    "📍 기타 일반 시설": catLayers.normal
};

// 1. collapsed를 false로 두고 컨트롤 생성
var layerControl = L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// 2. 레이어 컨트롤의 HTML 컨테이너 가져오기
var container = layerControl.getContainer();

// 3. 접기/펼치기 버튼 요소 생성
var toggleBtn = document.createElement('button');
toggleBtn.innerHTML = '접기 🔼'; 
toggleBtn.style.width = '100%';
toggleBtn.style.marginTop = '10px';
toggleBtn.style.padding = '6px 0';
toggleBtn.style.cursor = 'pointer';
toggleBtn.style.border = '1px solid #ccc';
toggleBtn.style.backgroundColor = '#f8f9fa';
toggleBtn.style.borderRadius = '4px';
toggleBtn.style.fontWeight = 'bold';

// 4. ★ [완벽 해결] 버튼 클릭 시 내부 리스트(`.leaflet-control-layers-list`)를 정확히 타겟팅하여 숨기기/보이기
var isCollapsed = false;
toggleBtn.onclick = function(e) {
    e.stopPropagation(); 
    e.preventDefault();

    var listContainer = container.querySelector('.leaflet-control-layers-list'); 

    if (listContainer) { 
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
        console.error("레이어 목록을 찾을 수 없습니다.");
    }
};

// 5. 레이어 컨트롤 컨테이너 맨 아래에 버튼 추가
container.appendChild(toggleBtn);

// =========================================================
// 🚇 지하철 종점(Terminal) 링형 로고 (레이어 박스 완벽 연동판)
// =========================================================
var terminalLogoLayer = L.layerGroup(); 

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
    marker.lineCode = lineKey; 
    terminalLogoLayer.addLayer(marker);
}

setTimeout(function() {
    terminalLogoLayer.clearLayers(); 

    function getFlatPoints(arr) {
        if (arr.length > 0 && Array.isArray(arr[0])) return getFlatPoints(arr[0]);
        return arr;
    }

    subwayLineLayer.eachLayer(function(poly) {
        var latlngs = poly.getLatLngs();
        var flatPoints = getFlatPoints(latlngs);
        if (!flatPoints || flatPoints.length < 2) return;

        var p0 = flatPoints[0]; 
        var p1 = flatPoints[1]; 
        var pN = flatPoints[flatPoints.length - 1]; 
        var pN_1 = flatPoints[flatPoints.length - 2]; 

        var offsetDist = 40; 
        var dxStart = p0.lng - p1.lng;
        var dyStart = p0.lat - p1.lat;
        var lenStart = Math.sqrt(dxStart*dxStart + dyStart*dyStart) || 1;
        var offsetStartLat = p0.lat + (dyStart / lenStart) * offsetDist;
        var offsetStartLng = p0.lng + (dxStart / lenStart) * offsetDist;

        var dxEnd = pN.lng - pN_1.lng;
        var dyEnd = pN.lat - pN_1.lat;
        var lenEnd = Math.sqrt(dxEnd*dxEnd + dyEnd*dyEnd) || 1;
        var offsetEndLat = pN.lat + (dyEnd / lenEnd) * offsetDist;
        var offsetEndLng = pN.lng + (dxEnd / lenEnd) * offsetDist;

        var lineName = poly.getTooltip() ? poly.getTooltip().getContent() : "";
        var lineKey = poly.lineCode; 
        var color = poly.options.color || "#333";

        var text = "";
        if (lineName.includes("효빈대A선")) text = "A"; 
        else if (lineName.includes("효빈대 B선")) text = "B"; 
        else if (lineName.includes("빈효선")) text = "빈"; 
        else if (lineName.includes("호선")) text = lineName.replace(/[^0-9]/g, ""); 
        else text = lineName.charAt(0) || "역"; 

        drawTerminalLogo(offsetStartLat, offsetStartLng, text, color, lineKey);
        drawTerminalLogo(offsetEndLat, offsetEndLng, text, color, lineKey);
    });
    
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
        if (modeBtn.classList.contains('active-btn')) map.addLayer(terminalLogoLayer);
    }

    map.on('overlayadd', function(e) {
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

var myLocationMarker = null;

// =========================================================
// 🗺️ 실시간 현재 행정구역 표시
// =========================================================
function updateCurrentAddressPanel() {
    var center = map.getCenter();
    var lat = center.lat;
    var lng = center.lng;

    var matchedGugun = [], matchedAdmin = [], matchedLegal = [];

    if (typeof searchablePolygons !== 'undefined') {
        searchablePolygons.forEach(function(poly) {
            if (isPointInPolygon(lat, lng, poly.points)) {
                if (poly.type === 'gugun') matchedGugun.push(poly);
                else if (poly.type === 'admin') matchedAdmin.push(poly);
                else if (poly.type === 'legal') matchedLegal.push(poly);
            }
        });

        var foundGugun = matchedGugun.length > 0 ? matchedGugun[matchedGugun.length - 1].name : "";
        var foundAdmin = matchedAdmin.length > 0 ? matchedAdmin[matchedAdmin.length - 1].name : "";
        var foundLegal = matchedLegal.length > 0 ? matchedLegal[matchedLegal.length - 1].name : "";

        var GAP_TOLERANCE = 800; 

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
            return (minDist < GAP_TOLERANCE) ? nearestName : "";
        }

        if (!foundGugun) foundGugun = findNearest('gugun');
        if (!foundAdmin) foundAdmin = findNearest('admin');
        if (!foundLegal) foundLegal = findNearest('legal');

        if (!foundGugun && !foundAdmin && !foundLegal) { 
            var addrText = document.getElementById('current-address-text');
            if (addrText) addrText.innerText = "효빈광역시 (관할 외 지역)";
            return; 
        }

        var province = "효빈광역시";
        if (foundGugun && foundGugun.match(/(선곡군|기도군|덕현군|약산시|낭원군|치원군|천주시)/)) { 
            province = "덕빈북도"; 
        }

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

map.on('moveend', updateCurrentAddressPanel);
setTimeout(updateCurrentAddressPanel, 1000);

var currentHighlightedBus = null; 

map.on('click', function() {
    if (currentHighlightedBus) resetBusHighlight();
});

if (typeof defaultLandmarksData !== 'undefined' && Array.isArray(defaultLandmarksData)) {
    defaultLandmarksData.forEach(function(marker) {
        if (!marker || !marker.name) return; 
        var name = marker.name;

        if (name.match(/(초|중|고|대학교|대학원|과기원|학교|유치원)$/) || name.includes("사대부") || name.includes("캠퍼스")) {
            marker.type = "school";
        }
        if (name.match(/(아파트|주공|자이|푸르지오|더샵|래미안|아이파크|휴먼시아|센트럴|스타힐스|대라수|리버시티)/)) {
            marker.type = "apartment";
        }
        if (name.match(/(시청|구청|군청|주민센터|동사무소|읍사무소|면사무소|출장소|경찰서|소방서|우체국|법원|보건소|교육청|세무서|공단|공사|본부|지사|센터)/)) {
            marker.type = "office";
        }
        if (name.match(/(백화점|이마트|홈플러스|롯데마트|트레이더스|아울렛|시장|상가|애니메이트|애니플러스샵|다이소|코스트코|빈스마트|마루마트|하나로마트)/)) {
            marker.type = "commercial";
        }
        if (name.match(/(역|버스터미널|정류장|공항|항|여객터미널|차량사업소|IC|선착장)$/)) {
            marker.type = "station";
        }
        if (name.match(/(맥도날드|버거킹|KFC|스타벅스|뚜레쥬르|파리바게뜨|쿠우쿠우|아웃백|DT)/)) {
            marker.type = "restaurant";
        }
        if (name.match(/(도서관|미술관|박물관|메가박스|CGV|롯데시네마|회관|예술의전당|호텔|스테이)/)) {
            marker.type = "culture";
        }
        if (name.match(/(병원|의료원|치과|보건진료소)/)) {
            marker.type = "hospital";
        }
        if (name.match(/(공장|산단|공단|조선소|발전소|공업사)/)) {
            marker.type = "factory";
        }
        if (name.match(/(공원|해수욕장|저수지|유적지|목장)/) || name.endsWith("산") || name.endsWith("호")) {
            marker.type = "park";
        }
    });
}

function openPlaceEditModal(name, lat, lng, cardId) {
    var newImg = prompt("📸 등록할 이미지의 웹 주소(URL)를 입력하세요:\n(예: 인터넷 이미지 주소 복사 붙여넣기)", "");
    if (newImg === null) return; 
    
    var newPhone = prompt("📞 전화번호를 입력하세요:", "");
    if (newPhone === null) return;
    
    var newDesc = prompt("📝 상세 설명이나 메모를 입력하세요:", "");
    if (newDesc === null) return;

    if (typeof myLandmarks !== 'undefined') {
        var target = myLandmarks.find(m => m.name === name && m.lat === lat);
        if (target) {
            if (newImg) target.image = newImg;
            if (newPhone) target.phone = newPhone;
            if (newDesc) target.desc = newDesc;
            
            localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
            alert("✨ 정보가 성공적으로 반영되었습니다! 마커를 다시 클릭해 확인해보세요.");
            map.closePopup();
            return;
        }
    }
    
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