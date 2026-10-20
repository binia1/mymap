// =========================================================
// 4. 레이어 정의 (초기 화면에서는 일반 마커 OFF -> 선택 시 즉시 표시!)
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

// 편의점 클러스터 레이어 (체크 시 표시)
var cvsLayer = L.markerClusterGroup({
    disableClusteringAtZoom: 14, 
    maxClusterRadius: 80 
});

// 10개 주제별 일반 마커 레이어 그룹 (체크 시 표시)
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

// 100대 세부 카테고리 휠 선택박스 전용 레이어
var subCatFilterLayer = L.layerGroup().addTo(map);
var normalMarkerLayer = catLayers.normal;

// =========================================================
// ★ 100개급 세부 카테고리 컬러, 그룹 매핑, 한글명
// =========================================================
var markerColors = {
    "mountain": "#558B2F", "hill": "#689F38", "island": "#33691E",
    "water": "#1976D2", "lake": "#0288D1", "beach": "#0097A7", "bridge": "#455A64",
    "park": "#4CAF50", "botanic": "#2E7D32", "square": "#8BC34A", "farm": "#7CB342",
    "city_hall": "#1A237E", "gu_office": "#283593", "gun_office": "#303F9F", "gov_complex": "#1A237E",
    "community_center": "#3949AB", "tax_office": "#3F51B5", "customs": "#3F51B5",
    "court": "#263238", "military": "#4E342E", "public_corp": "#5C6BC0",
    "police_agency": "#0D47A1", "police_station": "#1565C0", "police_box": "#1976D2", "coast_guard": "#01579B",
    "fire_hq": "#B71C1C", "fire_station": "#D32F2F", "post_office": "#E65100",
    "welfare_center": "#00897B", "child_welfare": "#26A69A", "senior_welfare": "#00695C",
    "kindergarten": "#FDD835", "elementary_school": "#FFCA28", "middle_school": "#FFB300",
    "high_school": "#FFA000", "special_high": "#FF8F00", "special_school": "#FF6F00",
    "college": "#F57C00", "university": "#E65100", "univ_building": "#EF6C00",
    "grad_school": "#D84315", "dormitory": "#8D6E63", "research_inst": "#546E6A", "library": "#00838F",
    "apartment": "#795548", "public_apt": "#6D4C41", "villa": "#8D6E63", "officetel": "#5D4037",
    "bank_central": "#01579B", "bank": "#0288D1", "credit_union": "#039BE5", "finance_corp": "#0097A7",
    "department_store": "#C2185B", "outlet": "#AD1457", "shopping_mall": "#D81B60",
    "hypermarket": "#F57C00", "ssm": "#FB8C00", "warehouse_mart": "#E65100", "food_mart": "#FF9800",
    "variety_store": "#FF5252", "electronics_shop": "#0277BD", "bookstore": "#5D4037",
    "trad_market": "#8D6E63", "fish_market": "#0288D1", "wholesale_market": "#6D4C41", "cvs": "#00C853",
    "cafe": "#6D4C41", "bakery": "#F4A460", "fastfood": "#FF5252", "pizza": "#E53935",
    "korean_food": "#FFB300", "western_food": "#FB8C00", "japanese_food": "#F57C00",
    "buffet": "#FF8F00", "restaurant": "#FFA000", "pub": "#673AB7",
    "anime_shop": "#E040FB", "anime_stage": "#D500F9", "anime_museum": "#AA00FF",
    "cinema": "#E53935", "museum": "#C2185B", "art_museum": "#AD1457", "science_museum": "#1976D2",
    "art_center": "#8E24AA", "zoo": "#43A047", "tourist_spot": "#00ACC1",
    "hotel": "#AB47BC", "business_hotel": "#9C27B0", "resort": "#7B1FA2",
    "church": "#5D4037", "catholic": "#4E342E", "temple": "#6D4C41",
    "stadium": "#0277BD", "esports_arena": "#6200EA", "ice_rink": "#00B0FF", "golf": "#388E3C", "sports": "#039BE5",
    "univ_hospital": "#00838F", "general_hospital": "#0097A7", "hospital": "#00ACC1",
    "dental": "#26C6DA", "oriental_med": "#00897B", "vet": "#4DB6AC",
    "public_health": "#00695C", "pharmacy": "#43A047",
    "airport": "#006064", "airbase": "#37474F", "port": "#01579B", "pier": "#0277BD",
    "bus_terminal": "#C62828", "rail_depot": "#37474F", "ic_jc": "#2E7D32",
    "station": "#D32F2F", "parking": "#455A64", "gas_station": "#F57F17", "toilet": "#0097A7",
    "heavy_ind": "#37474F", "auto_ind": "#455A64", "semi_ind": "#1A237E", "chem_ind": "#546E7A",
    "food_ind": "#6D4C41", "ind_complex": "#616161", "it_rnd": "#283593", "logistics": "#4E342E",
    "factory": "#757575", "media": "#00838F", "normal": "#333333"
};

var groupMap = {
    "kindergarten": "education", "elementary_school": "education", "middle_school": "education", "high_school": "education", "special_high": "education", "special_school": "education", "college": "education", "university": "education", "univ_building": "education", "grad_school": "education", "dormitory": "education", "research_inst": "education", "library": "education", "school": "education",
    "apartment": "residence", "public_apt": "residence", "villa": "residence", "officetel": "residence",
    "city_hall": "public", "gu_office": "public", "gun_office": "public", "gov_complex": "public", "community_center": "public", "tax_office": "public", "customs": "public", "court": "public", "military": "public", "public_corp": "public", "police_agency": "public", "police_station": "public", "police_box": "public", "coast_guard": "public", "fire_hq": "public", "fire_station": "public", "post_office": "public", "welfare_center": "public", "child_welfare": "public", "senior_welfare": "public", "office_main": "public", "office_sub": "public", "office_etc": "public", "police": "public", "welfare": "public",
    "bank_central": "commercial", "bank": "commercial", "credit_union": "commercial", "finance_corp": "commercial", "department_store": "commercial", "outlet": "commercial", "shopping_mall": "commercial", "hypermarket": "commercial", "ssm": "commercial", "warehouse_mart": "commercial", "food_mart": "commercial", "variety_store": "commercial", "electronics_shop": "commercial", "bookstore": "commercial", "trad_market": "commercial", "fish_market": "commercial", "wholesale_market": "commercial", "cvs": "commercial", "commercial": "commercial", "market": "commercial",
    "cafe": "food", "bakery": "food", "fastfood": "food", "pizza": "food", "korean_food": "food", "western_food": "food", "japanese_food": "food", "buffet": "food", "restaurant": "food", "pub": "food",
    "anime_shop": "culture", "anime_stage": "culture", "anime_museum": "culture", "cinema": "culture", "museum": "culture", "art_museum": "culture", "science_museum": "culture", "art_center": "culture", "zoo": "culture", "tourist_spot": "culture", "hotel": "culture", "business_hotel": "culture", "resort": "culture", "church": "culture", "catholic": "culture", "temple": "culture", "stadium": "culture", "esports_arena": "culture", "ice_rink": "culture", "golf": "culture", "sports": "culture", "culture": "culture", "anime": "culture", "religion": "culture",
    "univ_hospital": "medical", "general_hospital": "medical", "hospital": "medical", "dental": "medical", "oriental_med": "medical", "vet": "medical", "public_health": "medical", "pharmacy": "medical",
    "airport": "infra", "airbase": "infra", "port": "infra", "pier": "infra", "bus_terminal": "infra", "rail_depot": "infra", "ic_jc": "infra", "station": "infra", "parking": "infra", "gas_station": "infra", "toilet": "infra", "heavy_ind": "infra", "auto_ind": "infra", "semi_ind": "infra", "chem_ind": "infra", "food_ind": "infra", "ind_complex": "infra", "it_rnd": "infra", "logistics": "infra", "factory": "infra", "media": "infra", "bridge": "infra",
    "mountain": "nature", "hill": "nature", "island": "nature", "water": "nature", "lake": "nature", "beach": "nature", "park": "nature", "botanic": "nature", "square": "nature", "farm": "nature",
    "normal": "normal"
};

var categoryNames100 = {
    "mountain": "명산·봉우리", "hill": "고개·령", "island": "섬·도서",
    "water": "하천·강", "lake": "호수·저수지", "beach": "해수욕장·해변", "bridge": "대교·교량",
    "park": "근린·테마공원", "botanic": "수목원·식물원", "square": "광장", "farm": "관광목장·농원",
    "city_hall": "광역시·시청", "gu_office": "구청", "gun_office": "군청", "gov_complex": "정부합동청사",
    "community_center": "행정복지센터(주민센터)", "tax_office": "세무서·국세청", "customs": "세관",
    "court": "법원·검찰·준법지원", "military": "병무청·군부대", "public_corp": "공기업·공단·진흥원",
    "police_agency": "지방경찰청", "police_station": "경찰서", "police_box": "파출소·지구대", "coast_guard": "해양경찰청·해경",
    "fire_hq": "소방본부·소방학교", "fire_station": "소방서·119안전센터", "post_office": "우체국·우정청",
    "welfare_center": "종합사회복지관", "child_welfare": "아동·가족복지시설", "senior_welfare": "노인·장애인복지시설",
    "kindergarten": "유치원·어린이집", "elementary_school": "초등학교", "middle_school": "중학교",
    "high_school": "고등학교", "special_high": "특목고·자사고·특성화고", "special_school": "특수학교",
    "college": "전문대학·폴리텍", "university": "대학교(종합대학)", "univ_building": "대학교 단과대·관",
    "grad_school": "대학원·전문대학원", "dormitory": "대학교 기숙사·생활관", "research_inst": "국책·기업연구소", "library": "공공·대학도서관",
    "apartment": "민영 아파트단지", "public_apt": "주공·휴먼시아·행복주택", "villa": "빌라·연립주택", "officetel": "오피스텔·주상복합",
    "bank_central": "중앙은행(한국은행)", "bank": "시중은행·제1금융권", "credit_union": "새마을금고·신협·단위농협", "finance_corp": "금융공기업·보증재단",
    "department_store": "백화점", "outlet": "아울렛·복합쇼핑몰", "shopping_mall": "대형쇼핑몰·센터",
    "hypermarket": "대형할인점(마트)", "ssm": "기업형슈퍼마켓(SSM)", "warehouse_mart": "창고형할인매장", "food_mart": "식자재전문마트",
    "variety_store": "생활용품점(다이소)", "electronics_shop": "가전양판점·전자상가", "bookstore": "대형·중고서점",
    "trad_market": "전통시장·재래시장", "fish_market": "수산시장·어시장", "wholesale_market": "농수산·종합도매시장", "cvs": "24시 편의점",
    "cafe": "카페·커피전문점", "bakery": "베이커리·제과점", "fastfood": "패스트푸드·버거", "pizza": "피자전문점",
    "korean_food": "한식·한정식·국밥", "western_food": "패밀리레스토랑·양식", "japanese_food": "일식·소바·돈카츠",
    "buffet": "프리미엄 뷔페", "restaurant": "일반음식점", "pub": "주점·호프·이자카야",
    "anime_shop": "서브컬처·애니굿즈샵", "anime_stage": "서브컬처 라이브스테이지", "anime_museum": "만화·애니메이션박물관",
    "cinema": "멀티플렉스 영화관", "museum": "국공립·테마박물관", "art_museum": "미술관·아트뮤지엄", "science_museum": "과학관·자연사박물관",
    "art_center": "예술의전당·문화회관·극장", "zoo": "동물원", "tourist_spot": "유적지·관광명소·전망대",
    "hotel": "특급·시티호텔", "business_hotel": "비즈니스호텔·스테이", "resort": "리조트·펜션·연수원",
    "church": "개신교 교회", "catholic": "천주교 성당", "temple": "불교 사찰·전통사찰",
    "stadium": "종합운동장·전용경기장", "esports_arena": "e스포츠 아레나", "ice_rink": "실내빙상장", "golf": "컨트리클럽(골프장)", "sports": "실내체육관·사격·양궁장",
    "univ_hospital": "대학병원·상급종합병원", "general_hospital": "종합병원·의료원", "hospital": "전문병원·의원",
    "dental": "치과병원·의원", "oriental_med": "한방병원·한의원", "vet": "동물메디컬센터",
    "public_health": "보건소·보건진료소", "pharmacy": "약국",
    "airport": "국제공항", "airbase": "공군기지·비행장", "port": "무역항·여객터미널", "pier": "유람선선착장·부두·방파제",
    "bus_terminal": "고속·시외버스터미널", "rail_depot": "철도차량사업소(기지)", "ic_jc": "고속도로 나들목(IC/JC)",
    "station": "교통·환승시설", "parking": "공영·환승주차장", "gas_station": "주유소·충전소", "toilet": "공중화장실",
    "heavy_ind": "중공업·조선소", "auto_ind": "자동차·모빌리티공장", "semi_ind": "반도체·디스플레이캠퍼스", "chem_ind": "석유화학·소재공장",
    "food_ind": "식품·제과제분공장", "ind_complex": "국가·일반산업단지", "it_rnd": "AI·반도체·로봇R&D센터", "logistics": "대형물류센터·기지",
    "factory": "제조공장·공업사", "media": "방송국·언론사", "normal": "일반시설·지명"
};

// ★ [핵심] 주민센터 / 행정복지센터 / 동·읍·면사무소 이미지 경로를 '이미지/OO1동.webp' 형태로 자동 변환!
function getSmartFacilityImage(name, customImg) {
    if (customImg && customImg.trim() !== "" && customImg !== `이미지/${name}.webp`) {
        return customImg.trim();
    }
    if (!name) return "이미지/default.webp";

    // 예: "항4동 행정복지센터" -> "이미지/항4동.webp" / "고송1동주민센터" -> "이미지/고송1동.webp" / "도변읍사무소" -> "이미지/도변읍.webp"
    if (name.match(/(주민센터|행정복지센터|동사무소|읍사무소|면사무소)/)) {
        var cleanDong = name
            .replace(/\s*(행정복지센터|주민센터|동사무소|읍사무소|면사무소).*$/g, '')
            .replace(/^.*\s+/g, '') // 앞에 구/군 이름이 띄어쓰기로 붙어있으면 뒤의 동/읍/면만 추출
            .trim();
        if (cleanDong) return `이미지/${cleanDong}.webp`;
    }
    return `이미지/${name}.webp`;
}

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
// ★ 5. 마커 데이터 통합 (수정한 정보가 원본 마커를 100% 덮어쓰도록 버그 완벽 해결!)
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
        return { name: mName, lat: m.lat + adjustY, lng: m.lng, color: m.color, type: m.type, phone: m.phone, desc: m.desc, image: m.image, hours: m.hours, isDefault: true };
    });
}

var processedSubwayMarkers = [];
if (typeof subwayData !== 'undefined') {
    if (subwayData.markers) {
        var mergedSubwayMarkers = Array.isArray(subwayData.markers) ? subwayData.markers : Object.values(subwayData.markers).flat();
        processedSubwayMarkers = mergedSubwayMarkers.map(m => {
            var newName = m.name;
            if (!newName.endsWith('역')) newName += '역';
            return Object.assign({}, m, { name: newName, lat: m.lat + adjustY, isDefaultSubway: true });
        });
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

// ★ 핵심: 기본 마커(defaultLandmarksData + subwayData)를 먼저 깔고, 사용자가 수정한 마커(myLandmarks)가 있으면 원본을 덮어써서 중복 생성을 원천 차단!
var combinedBase = processedDefaultLandmarks.concat(processedSubwayMarkers);
myLandmarks.forEach(function(userM) {
    var targetOrigName = userM.origName || userM.name;
    var matchIdx = combinedBase.findIndex(function(baseM) {
        return (Math.abs(baseM.lat - userM.lat) <= 5 && Math.abs(baseM.lng - userM.lng) <= 5) ||
               (baseM.name === targetOrigName && Math.abs(baseM.lat - userM.lat) <= 50);
    });
    if (matchIdx !== -1) {
        // 기존 원본 마커 위에 수정된 정보를 완벽히 덮어씌움!
        combinedBase[matchIdx] = Object.assign({}, combinedBase[matchIdx], userM);
    } else {
        // 새로 찍은 마커는 추가
        combinedBase.push(userM);
    }
});

var allLandmarks = combinedBase;
window.allLandmarks = allLandmarks;

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
// 🚌 버스 레이어 및 데이터 그리기 (+19822 보정 공식 완벽 적용)
// =========================================================
// =========================================================
// 🚌 버스 레이어 렌더링 최종 안정화 버전 (지도 타일과 Y축 좌표 오차 완벽 동기화)
// =========================================================
var allBusLines = []; 
var busColors = {
    "간선": "#01B7ED", "순환": "#E7D600", "지선": "#37B484",
    "광역": "#485EC6", "좌석": "#FF5800", "마을": "#A664A0",
    "공항": "#84C36E", "투어": "#7777AA", "급행": "#D81C2F"
};

if (typeof busData === 'undefined' && typeof rawBusJson !== 'undefined' && rawBusJson.lines) {
    window.busData = rawBusJson.lines;
}

if (typeof rawBusJson !== 'undefined' && rawBusJson.lines) {
    window.processedBusData = rawBusJson.lines.map(function(bus) {
        var inferredType = "간선";
        if (bus.name.includes("급행") || bus.color === "#d81c2f") inferredType = "급행";
        else if (bus.name.includes("순환") || bus.color === "#e7d600") inferredType = "순환";
        else if (bus.name.includes("마을") || bus.color === "#A664A0") inferredType = "마을";
        else if (bus.name.includes("광역") || bus.color === "#485EC6") inferredType = "광역";
        else if (bus.name.includes("지선") || bus.color === "#37B484") inferredType = "지선";
        else if (bus.name.includes("좌석") || bus.color === "#FF5800") inferredType = "좌석";
        else if (bus.name.includes("공항") || bus.color === "#84C36E") inferredType = "공항";
        else if (bus.name.includes("시티투어") || bus.color === "#7777AA") inferredType = "시티투어";

        // ★ 핵심: 버스 좌표를 지도 타일과 정확히 일치시키는 보정 적용
        var correctedPoints = bus.points.map(function(p) {
            return [p[0], p[1]]; 
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
        
        var poly = L.polyline(bus.points, { color: bColor, weight: 4, opacity: 0.85, dashArray: '7, 5' });
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
// =========================================================
// ★ 100대 세부 카테고리 분류, 읍/면 주소, 역마다 다른 시간표 엔진
// =========================================================
var activeMarkers = [];
var HYOBIN_WIKI_BASE = "https://binia1.github.io/hyobinwiki2/";

function classify100Category(name) {
    if (!name) return "normal";
    if (name.match(/(편의점|CU|GS25|세븐일레븐|이마트24|이마트 24|미니스톱)/)) return "cvs";
    if (name.match(/(애니메이트|애니플러스샵|코믹프라자|굿즈샵|러브라이브|뱅드리마|모르포니카|로젤리아|코코로)/) && !name.includes("아파트") && !name.includes("호텔")) return "anime_shop";
    if (name.match(/(애니플러스 스테이지|리에라 라이브|서클 효빈|씨어터 아쿠아)/)) return "anime_stage";
    if (name.match(/(애니메이션 박물관|만화애니메이션의전당|애니메이션 아카이브|철도 박물관)/)) return "anime_museum";
    if (name.match(/(e스포츠 아레나)/)) return "esports_arena";

    if (name.match(/(주공|휴먼시아|행복주택|시영|구영|청년주택|사원아파트|사원1단지|사원2단지)/)) return "public_apt";
    if (name.includes("오피스텔") || name.includes("주상복합")) return "officetel";
    if (name.includes("빌라")) return "villa";
    if (name.includes("아파트") || name.match(/(자이|푸르지오|더샵|래미안|아이파크|센트럴|스타힐스|대라수|리버시티|에일린의뜰|우미린|호반베르디움|이편한세상|데시앙|유보라|포레나|위브|스위첸|아너스빌|칸타빌|엘리움|헤링턴|아이유쉘|해모로|코아루|블렌하임|스카이뷰|마루힐|한신더휴|사랑으로|비발디|어울림|이지더원|루첸|펜테리움|베네스타|동국애버리지|아쿠아1단지|아쿠아2단지|고산1단지|고산2단지)/)) return "apartment";

    if (name.match(/(기숙사|생활관|니나관|아와관|희다관|소금하우스)/)) return "dormitory";
    if (name.match(/(도서관|중앙도서관|방도도서관)/)) return "library";
    if (name.match(/(어린이집|유치원)/)) return "kindergarten";
    if (name.match(/(특수학교|은화학교|내성학교|낭화학교|노개학교)/)) return "special_school";
    if (name.match(/(과학고|외고|예고|체육고|체고|공고|기계공고|상고|상업고|정보고|농생명고|해양산업고)/)) return "special_high";
    if (name.match(/(초중고등학교|초중고)/)) return "high_school";
    if (name.match(/(중고등학교|여중고|중고)$/)) return "high_school";
    if (name.match(/(초중학교|초중)$/)) return "middle_school";
    if (name.match(/(초등학교|부설초|초|초\(폐교\)|초\(예정\))$/)) return "elementary_school";
    if (name.match(/(중학교|여중|중)$/) && !name.includes("다중") && !name.includes("마중")) return "middle_school";
    if (name.match(/(고등학교|여고|고|고\(예정\))$/) && !name.includes("문고") && !name.includes("차고")) return "high_school";
    if (name.match(/(대학원|법학전문대학원|법전원)/)) return "grad_school";
    if (name.match(/(폴리텍|과학대학교|보건대학교)/)) return "college";
    if (name.match(/(단과대|호관|학관|공학관|인문관|사회관|과학관|예술관|예체관|기술관|본관|본부|충승당|베르데홀|학생복지타운|동아리관|정루관|교수회관|학군단|창상관|빛날관|성운관|학술문화회관|공대지구|사범대)/) && !name.includes("박물관")) return "univ_building";
    if (name.match(/(대학교|과기원|과학기술원|교대|외대|해양대|해천대|평천대|치고대|삽곡대|성택대|옥선대|고판대|캠퍼스)/) && !name.includes("병원") && !name.includes("박물관")) return "university";

    if (name.match(/(대학병원|대병원|어린이병원|암센터)/)) return "univ_hospital";
    if (name.match(/(치과|치과병원|치의학)/)) return "dental";
    if (name.match(/(한의원|한의학|한방)/)) return "oriental_med";
    if (name.match(/(동물병원|수의학)/)) return "vet";
    if (name.match(/(보건소|보건진료소)/)) return "public_health";
    if (name.match(/(의료원|보훈병원)/)) return "general_hospital";
    if (name.match(/(병원|의원)/)) return "hospital";
    if (name.match(/(약국|약학)/)) return "pharmacy";

    if (name.match(/(백화점|갤러리아|AK플라자|ak플라자|NC백화점|nc백화점)/)) return "department_store";
    if (name.match(/(아울렛|세이브존)/)) return "outlet";
    if (name.match(/(스타필드|롯데몰|타임스퀘어|시티몰|스퀘어몰|타워몰|파크몰|리에라몰|HJ몰|유니브스퀘어|아쿠아시티센터|마루웰|고송스퀘어)/)) return "shopping_mall";
    if (name.match(/(코스트코|트레이더스|맥스)/)) return "warehouse_mart";
    if (name.includes("식자재")) return "food_mart";
    if (name.match(/(SSM|에브리데이|더프레시|롯데슈퍼)/)) return "ssm";
    if (name.match(/(이마트|홈플러스|롯데마트|하나로마트|빈스마트|마루마트|천조마트|CY마트|즈라스토어|이케아)/)) return "hypermarket";
    if (name.includes("다이소")) return "variety_store";
    if (name.match(/(베스트샵|전자상가)/)) return "electronics_shop";
    if (name.match(/(교보문고|교보문교|영풍문고|종로서적|알라딘|아크앤북|서점)/)) return "bookstore";
    if (name.match(/(수산시장|어시장)/)) return "fish_market";
    if (name.match(/(도매시장|청과시장|농수산)/)) return "wholesale_market";
    if (name.match(/(시장|전통시장)/)) return "trad_market";

    if (name.includes("한국은행")) return "bank_central";
    if (name.match(/(새마을금고|신협|농협|수협|우체국금융)/) && !name.includes("농협은행")) return "credit_union";
    if (name.match(/(금융감독원|자산관리공사|주택금융공사|신용보증재단)/)) return "finance_corp";
    if (name.match(/(은행|국민은행|신한은행|우리은행|하나은행|기업은행|제일은행|SC제일은행|농협은행|효빈은행)/)) return "bank";

    if (name.match(/(스타벅스|조타뻑스|투썸|이디야|메가커피|컴포즈|빽다방|커피|카페)/)) return "cafe";
    if (name.match(/(베이커리|빵집|파리바게뜨|뚜레쥬르|성심당)/)) return "bakery";
    if (name.match(/(도미노피자|피자)/)) return "pizza";
    if (name.match(/(맥도날드|버거킹|KFC|kfc|롯데리아|맘스터치|스미버거|버거)/)) return "fastfood";
    if (name.match(/(아웃백|스테이크)/)) return "western_food";
    if (name.match(/(쿠우쿠우|뷔페)/)) return "buffet";
    if (name.match(/(소바|일식|스시|돈카츠)/)) return "japanese_food";
    if (name.match(/(한정식|한찬|국밥|갈비|고깃집|반점|식당)/)) return "korean_food";
    if (name.match(/(호프|포차|이자카야|주점|술집|펍)/)) return "pub";

    if (name.match(/(광역시청|시청|시의회)/)) return "city_hall";
    if (name.match(/(구청|구의회|출장소)/)) return "gu_office";
    if (name.match(/(군청)/)) return "gun_office";
    if (name.match(/(정부청사|합동청사)/)) return "gov_complex";
    if (name.match(/(주민센터|행정복지센터|읍사무소|면사무소|동사무소)/)) return "community_center";
    if (name.match(/(세무서|국세청)/)) return "tax_office";
    if (name.match(/(세관)/)) return "customs";
    if (name.match(/(법원|검찰|교정청|준법지원센터|중대범죄수사청|감사원|선관위)/)) return "court";
    if (name.match(/(병무청|민방위|군사기지|공군기지)/)) return "military";
    if (name.match(/(해양경찰)/)) return "coast_guard";
    if (name.match(/(경찰청)/)) return "police_agency";
    if (name.match(/(경찰서)/)) return "police_station";
    if (name.match(/(파출소|지구대|치안센터)/)) return "police_box";
    if (name.match(/(소방본부|소방학교)/)) return "fire_hq";
    if (name.match(/(소방서|119)/)) return "fire_station";
    if (name.match(/(우체국|우정청|우편)/)) return "post_office";
    if (name.match(/(아동|어린이회관|가족센터)/)) return "child_welfare";
    if (name.match(/(노인|장애인|보훈)/)) return "senior_welfare";
    if (name.match(/(복지관|모금회|적십자|사회복지|사회서비스원)/)) return "welfare_center";
    if (name.match(/(교육청|교육지원청|통계청|노동청|기상청|우정청|국토관리|인재개발원|공사|공단|진흥원|재단|회관|상수도|연구원|소비자원|공제회|마사회|수자원|감정원|부동산원|석유관리원|국가기록원|테크노파크|상공회의소|협회|본부)/)) return "public_corp";

    if (name.match(/(CGV|메가박스|롯데시네마|영화관)/)) return "cinema";
    if (name.match(/(미술관|아트뮤지엄|간송)/)) return "art_museum";
    if (name.match(/(과학관|해양관|해양과학관)/)) return "science_museum";
    if (name.match(/(박물관|역사관|기념관|뮤지엄|아카이브)/)) return "museum";
    if (name.match(/(예술문화회관|문화회관|아트센터|드림씨어터|아트홀|소극장)/)) return "art_center";
    if (name.includes("동물원")) return "zoo";
    if (name.match(/(유적지|문화촌|전망대|개항지|거리|복숭아밭)/)) return "tourist_spot";
    if (name.match(/(토요코인|스테이)/)) return "business_hotel";
    if (name.match(/(연수원|리조트|펜션)/)) return "resort";
    if (name.match(/(호텔|라마다)/)) return "hotel";
    if (name.includes("교회")) return "church";
    if (name.includes("성당")) return "catholic";
    if (name.match(/(천왕사|단산사|절|사찰)/)) return "temple";
    if (name.match(/(종합운동장| 대운동장|스틸야드|슈퍼 아레나|축구장|야구장)/)) return "stadium";
    if (name.includes("빙상")) return "ice_rink";
    if (name.match(/(cc|CC|골프)/)) return "golf";
    if (name.match(/(체육관|양궁장|사격장|운동장)/)) return "sports";

    if (name.match(/(공항|국제공항)/)) return "airport";
    if (name.match(/(여객터미널|국제터미널|어간항|효빈내항)/)) return "port";
    if (name.match(/(부두|선착장|방파제|보관지)/)) return "pier";
    if (name.match(/(버스터미널|고속버스터미널|시외버스터미널|환승장|정류장)/)) return "bus_terminal";
    if (name.match(/(차량사업소|차고지|정비센터)/)) return "rail_depot";
    if (name.match(/(IC|JC|톨게이트|사거리|삼거리|로터리|입구|종점)/)) return "ic_jc";
    if (name.includes("칼텍스") || name.includes("주유소")) return "gas_station";
    if (name.match(/(중공업|조선소|현대조선)/)) return "heavy_ind";
    if (name.match(/(기아자동차|현대로템|타이어|오토에버|모빌리티|드론)/)) return "auto_ind";
    if (name.match(/(삼성전자|삼성반도체|이노텍|세미콘|반도체|ASML|램리서치|KLA|칩스|파두|세미파이브)/)) return "semi_ind";
    if (name.match(/(케미칼|한화솔루션|실리콘|유한양행|제약|한약|탄소)/)) return "chem_ind";
    if (name.match(/(하림|제일제당|재일제당|농심|식품)/)) return "food_ind";
    if (name.match(/(로보틱스|로보티즈|뉴로메카|리벨리온|사피온|딥엑스|연구소|데이터랩|AI랩|R&D|융합연구원|기술원)/)) return "it_rnd";
    if (name.match(/(대한통운|물류)/)) return "logistics";
    if (name.match(/(산단|산업단지|공단|공업단지|중심단지|미디어단지|직물)/)) return "ind_complex";
    if (name.match(/(공장|공업|산전|상사)/)) return "factory";
    if (name.match(/(MBC|일보|방송)/)) return "media";
    if (name.match(/(대교|브릿지|등중교)/)) return "bridge";
    if (name.match(/(해수욕장|해변)/)) return "beach";
    if (name.match(/(수목원|식물원)/)) return "botanic";
    if (name.match(/(목장|농원)/)) return "farm";
    if (name.match(/(광장)/)) return "square";
    if (name.match(/(공원)/)) return "park";
    if (name.match(/(산|봉)$/)) return "mountain";
    if (name.match(/(호|저수지|세성제|북천)$/)) return "lake";
    if (name.match(/(개비도|휴소도|포상도|부리도)$/)) return "island";

    return "normal";
}

var riToEupMyeonMap = {
    "고무리": "탄성읍", "탄성리": "탄성읍", "공리": "탄성읍", "미성리": "탄성읍", "성규리": "탄성읍",
    "도변리": "도변읍", "요우리": "도변읍", "앵내리": "도변읍", "잠재리": "도변읍", "조일리": "도변읍", "표명리": "도변읍", "계층리": "도변읍", "수안리": "도변읍",
    "전추리": "고해읍", "정명리": "고해읍", "이식리": "고해읍", "장심리": "고해읍", "은진원리": "고해읍", "이와리": "고해읍", "고해리": "고해읍", "천가리": "고해읍",
    "서목리": "서목읍", "입리": "서목읍", "음일리": "서목읍", "마희리": "서목읍", "소춘리": "서목읍", "승남리": "서목읍",
    "야진리": "야진읍", "아득리": "야진읍", "미우리": "야진읍", "원심리": "야진읍", "신리": "야진읍",
    "흑택리": "흑택면", "루비리": "흑택면", "은염리": "흑택면", "보습리": "흑택면", "명현리": "흑택면",
    "윤부리": "소원면", "부우리": "소원면", "라면리": "소원면", "소원리": "소원면",
    "분음리": "도향면", "일일리": "도향면", "벽천리": "도향면", "미로리": "도향면", "춘일경리": "도향면", "초반리": "도향면", "반주리": "도향면", "시초리": "도향면", "영왕리": "도향면", "일하리": "도향면",
    "익목리": "정근면", "구생리": "정근면", "안경리": "정근면", "회층리": "정근면", "촌주리": "정근면", "층부리": "정근면", "처구리": "정근면",
    "화소리": "화소읍", "서판리": "화소읍", "청묘리": "화소읍", "상내리": "화소읍", "하내장리": "화소읍", "요곡리": "화소읍",
    "홍하리": "홍하면", "니지리": "홍하면", "황천리": "홍하면", "평야리": "홍하면",
    "당림리": "성가면", "성가리": "성가면", "건상리": "근강면", "근강리": "근강면", "광정리": "광정면",
    "염곡리": "염곡읍", "주양리": "염곡읍", "신산리": "염곡읍", "중만리": "염곡읍", "풍야리": "염곡읍", "시도리": "염곡읍",
    "주길리": "주길면", "원청리": "주길면", "동금보리": "주길면",
    "해로리": "해로면", "명전리": "해로면", "광야리": "해로면",
    "하천원리": "귀총면", "갑부리": "귀총면", "환내리": "귀총면", "우목리": "우목면"
};

function resolveFullAddress(lat, lng) {
    var foundGugun = "", foundAdmin = "", foundLegal = "", foundEupMyeon = "";
    if (typeof searchablePolygons !== 'undefined') {
        searchablePolygons.forEach(function(poly) {
            if (typeof isPointInPolygon === 'function' && isPointInPolygon(lat, lng, poly.points)) {
                var rawName = poly.name || "";
                var parenMatch = rawName.match(/\(([^)]+)\)/);
                var innerName = parenMatch ? parenMatch[1].trim() : "";
                var pName = rawName.replace(/\(.*\)/, '').trim();

                if (poly.type === 'gugun') {
                    foundGugun = pName;
                } else if (poly.type === 'admin') {
                    foundAdmin = pName;
                    if (pName.endsWith("읍") || pName.endsWith("면")) foundEupMyeon = pName;
                    if (innerName && (innerName.endsWith("읍") || innerName.endsWith("면"))) foundEupMyeon = innerName;
                    if (innerName && innerName.endsWith("리") && !foundLegal) foundLegal = innerName;
                } else if (poly.type === 'legal') {
                    foundLegal = pName;
                    if (pName.endsWith("읍") || pName.endsWith("면")) foundEupMyeon = pName;
                }
            }
        });
    }

    var province = (foundGugun && foundGugun.match(/(선곡군|기도군|덕현군|약산시|낭원군|치원군|천주시)/)) ? "덕빈북도" : "효빈광역시";
    var cleanGugun = foundGugun || "";
    var cleanAdmin = foundAdmin || "";
    var cleanLegal = foundLegal || (cleanAdmin || "바다");

    if (!foundEupMyeon && (cleanAdmin.endsWith("읍") || cleanAdmin.endsWith("면"))) foundEupMyeon = cleanAdmin;
    if (!foundEupMyeon && cleanLegal && riToEupMyeonMap[cleanLegal]) foundEupMyeon = riToEupMyeonMap[cleanLegal];
    if (!foundEupMyeon && cleanAdmin && riToEupMyeonMap[cleanAdmin]) foundEupMyeon = riToEupMyeonMap[cleanAdmin];

    var nearestRoadName = cleanAdmin ? cleanAdmin.replace(/(읍|면|동|리)$/, '') + "로" : "중앙대로";
    var minRoadDist = Infinity;
    if (typeof roadData !== 'undefined' && Array.isArray(roadData)) {
        roadData.forEach(function(road) {
            if (!road.points) return;
            road.points.forEach(function(pt) {
                var ptLat = Array.isArray(pt[0]) ? pt[0][0] : pt[0];
                var ptLng = Array.isArray(pt[0]) ? pt[0][1] : pt[1];
                var dist = Math.sqrt(Math.pow(lat - (ptLat + (typeof adjustY !== 'undefined' ? adjustY : 0)), 2) + Math.pow(lng - ptLng, 2));
                if (dist < minRoadDist) { minRoadDist = dist; nearestRoadName = road.name; }
            });
        });
    }

    var roadNum = (Math.abs(Math.round(lat)) % 90) + 1;
    var bunjiMain = (Math.abs(Math.round(lng)) % 800) + 100;
    var bunjiSub = (Math.abs(Math.round(lat)) % 20) + 1;
    var zipCode = "54" + String((Math.abs(Math.round(lat + lng)) % 899) + 100);

    var eupMyeonPart = foundEupMyeon ? ` ${foundEupMyeon}` : "";
    var roadAddress = `${province} ${cleanGugun}${eupMyeonPart} ${nearestRoadName}${roadNum}`.replace(/\s+/g, ' ').trim();
    
    var jibunSub = "";
    if (foundEupMyeon) {
        if (cleanLegal && cleanLegal !== foundEupMyeon) jibunSub = `${foundEupMyeon}${cleanLegal}`;
        else jibunSub = foundEupMyeon;
    } else {
        jibunSub = cleanLegal;
    }

    return {
        province: province, gugun: cleanGugun, eupMyeon: foundEupMyeon,
        admin: cleanAdmin, legal: cleanLegal, jibunSub: jibunSub,
        bunji: `${bunjiMain}-${bunjiSub}`, zip: zipCode, roadAddress: roadAddress
    };
}

function getSmartOperatingStatus(type, name, customHours) {
    // ★ [추가] 이름이나 커스텀 영업시간에 '폐점'이 포함된 경우 최우선 처리
    if ((name && name.includes("폐점")) || (customHours && customHours.includes("폐점"))) {
        return { 
            badge: '<span style="color:#888888; font-weight:900; text-decoration:line-through;">폐업/폐점</span>', 
            hours: "현재 영업을 종료(폐점)한 점포입니다.", 
            isOpen: false 
        };
    }

    var now = new Date();
    var day = now.getDay();
    var isWeekend = (day === 0 || day === 6);
    var curMin = now.getHours() * 60 + now.getMinutes();

    var openMin = 9 * 60, closeMin = 18 * 60;
    var hoursStr = customHours || "09:00 ~ 18:00";
    var is24h = false;
    var weekendClosed = false;

    switch (type) {
        case "cvs": case "police_agency": case "police_station": case "police_box": case "coast_guard":
        case "fire_hq": case "fire_station": case "airport": case "ic_jc": case "bridge":
        case "mountain": case "lake": case "island": case "park": case "square": case "beach":
            hoursStr = (type === "cvs") ? "24시간 영업 (연중무휴)" : "24시간 개방·운영";
            is24h = true; break;
        case "apartment": case "public_apt": case "villa": case "officetel": case "dormitory":
            hoursStr = "상시 거주시설 (관리실 09:00 ~ 18:00)";
            is24h = true; break;
        case "univ_hospital": case "general_hospital":
            hoursStr = "진료 08:30 ~ 17:30 (응급실 24시간)";
            openMin = 8 * 60 + 30; closeMin = 17 * 60 + 30; weekendClosed = (day === 0); break;
        case "hospital": case "dental": case "oriental_med": case "vet":
            hoursStr = isWeekend ? "주말 09:00 ~ 13:00 (일요일 휴진)" : "평일 09:00 ~ 19:00";
            openMin = 9 * 60; closeMin = isWeekend ? 13 * 60 : 19 * 60;
            if (day === 0) weekendClosed = true; break;
        case "pharmacy":
            hoursStr = "09:00 ~ 21:00"; openMin = 9 * 60; closeMin = 21 * 60; break;
        case "bank_central": case "bank": case "credit_union": case "finance_corp":
            hoursStr = "평일 09:00 ~ 16:00 (주말·공휴일 휴무)";
            openMin = 9 * 60; closeMin = 16 * 60; weekendClosed = true; break;
        case "city_hall": case "gu_office": case "gun_office": case "gov_complex":
        case "community_center": case "tax_office": case "customs": case "court":
        case "public_corp": case "post_office": case "public_health":
            hoursStr = "평일 09:00 ~ 18:00 (주말·공휴일 휴무)";
            openMin = 9 * 60; closeMin = 18 * 60; weekendClosed = true; break;
        case "elementary_school": case "middle_school": case "high_school": case "special_high": case "special_school": case "kindergarten":
            hoursStr = "학기중 08:30 ~ 16:30 (방과후 ~19:00)";
            openMin = 8 * 60 + 30; closeMin = 16 * 60 + 30; weekendClosed = true; break;
        case "university": case "college": case "univ_building": case "grad_school":
            hoursStr = "행정실 09:00 ~ 18:00 (캠퍼스 상시개방)";
            openMin = 9 * 60; closeMin = 22 * 60; break;
        case "library":
            hoursStr = "08:00 ~ 24:00"; openMin = 8 * 60; closeMin = 24 * 60; break;
        case "department_store": case "outlet": case "shopping_mall":
            hoursStr = isWeekend ? "주말 10:30 ~ 20:30" : "평일 10:30 ~ 20:00";
            openMin = 10 * 60 + 30; closeMin = isWeekend ? 20 * 60 + 30 : 20 * 60; break;
        case "hypermarket": case "warehouse_mart": case "ssm": case "food_mart": case "variety_store": case "bookstore":
            hoursStr = "10:00 ~ 23:00 (매월 2·4주 일요일 휴무)";
            openMin = 10 * 60; closeMin = 23 * 60; break;
        case "fish_market": case "wholesale_market": case "trad_market":
            hoursStr = "05:00 ~ 21:00"; openMin = 5 * 60; closeMin = 21 * 60; break;
        case "cafe": case "bakery":
            hoursStr = "07:30 ~ 22:30"; openMin = 7 * 60 + 30; closeMin = 22 * 60 + 30; break;
        case "fastfood":
            if (name && name.includes("DT")) { hoursStr = "24시간 영업 (드라이브스루)"; is24h = true; }
            else { hoursStr = "08:00 ~ 23:00"; openMin = 8 * 60; closeMin = 23 * 60; }
            break;
        case "korean_food": case "western_food": case "japanese_food": case "buffet": case "pizza": case "restaurant":
            hoursStr = "10:30 ~ 22:00"; openMin = 10 * 60 + 30; closeMin = 22 * 60; break;
        case "pub":
            hoursStr = "17:00 ~ 26:00 (익일 02:00)"; openMin = 17 * 60; closeMin = 26 * 60; break;
        case "anime_shop": case "anime_stage":
            hoursStr = "11:00 ~ 21:00 (연중무휴)"; openMin = 11 * 60; closeMin = 21 * 60; break;
        case "cinema":
            hoursStr = "08:00 ~ 26:00 (익일 02:00)"; openMin = 8 * 60; closeMin = 26 * 60; break;
        case "museum": case "art_museum": case "science_museum": case "anime_museum": case "zoo": case "botanic":
            hoursStr = "09:30 ~ 18:00 (월요일 휴관)";
            openMin = 9 * 60 + 30; closeMin = 18 * 60; if (day === 1) weekendClosed = true; break;
        case "hotel": case "business_hotel": case "resort":
            hoursStr = "24시간 운영 (체크인 15:00)"; is24h = true; break;
        case "bus_terminal": case "port":
            hoursStr = "04:30 ~ 25:30 (익일 01:30)"; openMin = 4 * 60 + 30; closeMin = 25 * 60 + 30; break;
    }

    if (customHours) {
        hoursStr = customHours;
        if (customHours.includes("24시간")) {
            is24h = true;
        } else {
            var m = customHours.match(/(\d{1,2})\s*:\s*(\d{2})\s*[~\-]\s*(\d{1,2})\s*:\s*(\d{2})/);
            if (m) {
                var oH = parseInt(m[1], 10), oM = parseInt(m[2], 10);
                var cH = parseInt(m[3], 10), cM = parseInt(m[4], 10);
                openMin = oH * 60 + oM;
                if (cH < oH) cH += 24;
                closeMin = cH * 60 + cM;
            }
        }
    }

    var isOpen = false;
    if (is24h) isOpen = true;
    else if (weekendClosed && isWeekend) isOpen = false;
    else if (closeMin > 24 * 60) {
        var pastMidnightClose = closeMin - 24 * 60;
        isOpen = (curMin >= openMin || curMin <= pastMidnightClose);
    } else {
        isOpen = (curMin >= openMin && curMin <= closeMin);
    }

    var badgeHtml = "";
    if (is24h) badgeHtml = '<span style="color:#009000; font-weight:700;">운영 중</span>';
    else if (weekendClosed && isWeekend) badgeHtml = '<span style="color:#e65100; font-weight:700;">휴무일</span>';
    else if (isOpen) badgeHtml = '<span style="color:#009000; font-weight:700;">영업 중</span>';
    else badgeHtml = '<span style="color:#ff5252; font-weight:700;">영업 종료</span>';

    return { badge: badgeHtml, hours: hoursStr, isOpen: isOpen };
}

var lineMascots = {
    "1": "고나미", "1B": "고나미", "2": "하루빈", "2B": "하루빈", "3": "박라미",
    "4": "다로나", "5": "미소하", "6": "라세나", "7": "임세정·임세하", "7B": "임세정·임세하",
    "8": "유리아", "B": "전노아", "c": "심세이", "R1": "전노아", "H1": "코레일"
};

var unOpenedLines = {
    "c": { status: "1구간: 2027.09.29 개통 예정 / 2·3구간: 개통 미정", badge: "🚧 미개통 (27.09 부분개통)" },
    "y": { status: "미개통 (계획·추진 중)", badge: "🚧 미개통 (건설 계획중)" },
    "7c": { status: "폐선 구간 (구 효빈전차)", badge: "🏛️ 폐선 (역사보존구간)" },
    "9": { status: "미개통 (예정 노선)", badge: "🚧 미개통 (예정 노선)" },
    "G": { status: "미개통 (예정 노선)", badge: "🚧 미개통 (예정 노선)" }
};

// ★ [수정] 정확한 역 이름만 입력 (포성산 제외, 원전·남소·야진·하미·선곡·덕현중앙·과복 추가)
var specificUnopenedStations = [
    "원전", "남소", "야진", "하미", "선곡", "덕현중앙", "과복", 
    "청능", "시청(창전선)", "고송강변", "고송경찰서", "북고송", "토모리해수욕장"
];

// ★ [업그레이드] 1호선 및 1호선 지선(1B)까지 모두 05시~24시 실제 분(Minute) 단위 전체 시각표 탑재!
var subwayTimetableDB = {
    "1": {
        refStation: "효빈역",
        upDir: "상행 (중구청·중앙로·월천·남구청·곽산·곽암해수욕장 방면)",
        dnDir: "하행 (전천·북구청·안천·이자공원·고해·약산시청·장선 방면)",
        firstTrain: "05:10", lastTrain: "24:38", lastMin: 24 * 60 + 38,
        intervalSummary: "출퇴근(RH): 본선 1분40초~3분 / 평시(NH): 4~5분 / 심야·첫막차: 7~15분 (완행·급행 병행)",
        wk: {
            5: [["10분(곽산행)","20분(승남행)","30분(곽암행)","38분(서목행)","46분(곽암급행)","54분(곽산행)"], ["12분(장선행)","22분(고해행)","31분(약산행)","40분(장선급행)","48분(안천행)","56분(장선행)"]],
            6: [["02분","08분(서목)","14분","20분(급행)","26분","32분(승남)","38분","44분(급행)","49분","54분","59분"], ["03분","09분(고해)","15분","21분(급행)","27분","33분(약산)","39분","45분(급행)","50분","55분"]],
            7: [["02분","05분(서목)","08분(급행)","11분","14분","17분(승남)","20분(급행)","23분","25분","28분","30분(급행)","33분","36분(서목)","39분","42분(급행)","45분","48분","51분(승남)","54분(급행)","57분"], ["00분","03분","06분(급행)","09분","12분(고해)","15분","18분(급행)","21분","24분","27분(약산)","30분(급행)","33분","36분","39분","42분(급행)","45분","48분(고해)","51분","54분(급행)","57분"]],
            8: [["00분","02분(급행)","05분","08분(서목)","11분","14분(급행)","17분","20분(승남)","23분","26분(급행)","29분","32분","35분(서목)","38분(급행)","41분","45분","49분(승남)","53분","57분"], ["00분","03분(급행)","06분","09분(약산)","12분","15분(급행)","18분","21분","24분(고해)","27분(급행)","30분","33분","36분","39분(급행)","43분","47분(약산)","51분","55분","59분"]],
            9: [["01분","05분(급행)","09분(서목)","13분","18분","23분(승남)","28분(급행)","33분","38분(서목)","43분","48분(급행)","53분","58분"], ["03분","07분(급행)","11분","16분(고해)","21분","26분(급행)","31분","36분(약산)","41분","46분(급행)","51분","56분"]],
            10: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            11: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            12: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            13: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            14: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            15: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","43분","48분(서목)","53분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","41분","46분","51분(고해)","56분"]],
            16: [["03분","08분(서목)","13분","18분(급행)","23분","28분(승남)","33분","38분(급행)","42분","46분(서목)","50분","54분","58분"], ["01분","06분","11분(고해)","16분(급행)","21분","26분","31분(약산)","36분(급행)","40분","44분","48분(고해)","52분","56분"]],
            17: [["01분","04분(급행)","07분(서목)","10분","13분","16분(승남)","19분(급행)","22분","25분","28분(서목)","31분(급행)","34분","37분","40분(승남)","43분(급행)","46분","49분","52분(서목)","55분","58분"], ["00분","03분(급행)","06분","09분(고해)","12분","15분(급행)","18분","21분(약산)","24분","27분(급행)","30분","33분","36분(고해)","39분(급행)","42분","45분","48분(약산)","51분(급행)","54분","57분"]],
            18: [["01분(급행)","04분","07분(서목)","10분","13분(급행)","16분(승남)","19분","22분","25분(급행)","28분(서목)","31분","34분","37분(급행)","40분(승남)","44분","48분","52분(서목)","56분"], ["00분(급행)","03분","06분(고해)","09분","12분(급행)","15분","18분(약산)","21분","24분(급행)","27분","30분(고해)","33분","36분(급행)","40분","44분(약산)","48분","52분","56분"]],
            19: [["00분","04분(급행)","08분(서목)","12분","17분","22분(승남)","27분(급행)","32분","37분(서목)","42분","47분","52분(승남)","57분"], ["00분","04분(급행)","08분","12분(고해)","17분","22분(급행)","27분","32분(약산)","37분","42분","47분(고해)","52분","57분"]],
            20: [["02분","07분(서목)","12분","17분(급행)","22분","27분(승남)","32분","37분","42분(서목)","47분","52분","57분"], ["02분","07분(고해)","12분","17분(급행)","22분","27분(약산)","32분","37분","42분(고해)","47분","52분","57분"]],
            21: [["02분","07분(서목)","12분","17분(급행)","22분","27분(승남)","32분","37분","42분(서목)","47분","52분","57분"], ["02분","07분(고해)","12분","17분(급행)","22분","27분(약산)","32분","37분","42분(고해)","47분","52분","57분"]],
            22: [["03분","09분(서목)","15분","21분","27분(승남)","33분","39분","46분(서목)","53분"], ["03분","09분(고해)","15분","21분(약산)","27분","33분","39분(고해)","46분","53분"]],
            23: [["00분","08분(서목)","16분","24분(승남)","32분","40분(서목)","48분(곽산행)","56분(남구청종료)"], ["00분","08분(약산행)","16분(고해행)","24분(장선행)","33분(고해행)","42분(안천종료)","51분(안천종료)"]],
            24: [["05분(곽산행)","15분(서목행)","26분(월천종료)","38분(중앙로종료 막차)"], ["00분(고해행)","12분(안천종료)","24분(북구청종료)","35분(전천종료 막차)"]]
        }
    },
    "1B": {
        refStation: "창전구청역",
        upDir: "상행 (우전·아논타워·청엽구청·창선·효빈역 방면)",
        dnDir: "하행 (보통·고무·탄성군청·야진입구·서목·승남해수욕장 방면)",
        firstTrain: "05:15", lastTrain: "24:25", lastMin: 24 * 60 + 25,
        intervalSummary: "출퇴근(RH): 3분30초~6분 (셔틀 포함) / 평시(NH): 8~10분 / 심야·첫막차: 12~20분",
        wk: {
            5: [["15분(창선행)","27분(장선행)","39분(고해행)","51분(창선셔틀)"], ["18분(서목행)","30분(승남행)","42분(서목행)","54분(승남행)"]],
            6: [["01분","10분","19분(급행)","28분","37분","45분(급행)","53분"], ["04분","13분","22분(급행)","31분","40분","48분","56분"]],
            7: [["00분","06분(급행)","11분","16분","21분(급행)","26분","31분","36분(급행)","41분","46분","51분(급행)","56분"], ["02분","08분(급행)","13분","18분(승남)","23분","28분(급행)","33분","38분(승남)","43분","48분(급행)","53분","58분"]],
            8: [["01분","06분(급행)","11분","16분","21분(급행)","26분","32분","38분(급행)","44분","50분","56분"], ["03분","08분(급행)","14분","20분(승남)","26분","32분(급행)","38분","44분(승남)","50분","56분"]],
            9: [["03분","11분(급행)","19분","27분","35분(급행)","43분","51분","59분"], ["04분","12분(승남)","20분","28분(급행)","36분","44분(승남)","52분"]],
            10: [["08분","17분","26분(급행)","35분","44분","53분(급행)"], ["00분","09분(승남)","18분","27분(급행)","36분","45분(승남)","54분"]],
            11: [["02분","11분","20분(급행)","29분","38분","47분(급행)","56분"], ["03분","12분(승남)","21분","30분(급행)","39분","48분(승남)","57분"]],
            12: [["05분","14분","23분(급행)","32분","41분","50분(급행)","59분"], ["06분","15분(승남)","24분","33분(급행)","42분","51분(승남)"]],
            13: [["08분","17분","26분(급행)","35분","44분","53분(급행)"], ["00분","09분(승남)","18분","27분(급행)","36분","45분(승남)","54분"]],
            14: [["02분","11분","20분(급행)","29분","38분","47분(급행)","56분"], ["03분","12분(승남)","21분","30분(급행)","39분","48분(승남)","57분"]],
            15: [["05분","14분","23분(급행)","32분","41분","50분(급행)","59분"], ["06분","15분(승남)","24분","33분(급행)","42분","51분(승남)"]],
            16: [["07분","15분(급행)","23분","31분","39분(급행)","47분","55분"], ["00분","08분(승남)","16분","24분(급행)","32분","40분(승남)","48분","56분"]],
            17: [["01분","07분(급행)","13분","19분","25분(급행)","31분","37분","43분(급행)","49분","55분"], ["02분","08분(승남)","14분(급행)","20분","26분(승남)","32분(급행)","38분","44분(승남)","50분","56분"]],
            18: [["01분(급행)","07분","13분","19분(급행)","25분","31분","37분(급행)","43분","49분","55분"], ["02분(급행)","08분(승남)","14분","20분(급행)","26분(승남)","32분","38분(급행)","44분(승남)","50분","56분"]],
            19: [["02분","10분(급행)","18분","26분","34분(급행)","42분","50분","58분"], ["03분","11분(승남)","19분","27분(급행)","35분","43분(승남)","51분","59분"]],
            20: [["07분","16분","25분(급행)","34분","43분","52분"], ["08분(승남)","17분","26분","35분(승남)","44분","53분"]],
            21: [["01분","10분","19분(급행)","28분","37분","46분","55분"], ["02분(승남)","11분","20분","29분(승남)","38분","47분","56분"]],
            22: [["05분","15분","25분","35분","45분","55분(창선행)"], ["06분(승남)","16분","26분","36분(승남)","46분","56분(서목행)"]],
            23: [["07분(창선행)","20분(창선행)","34분(창선행)","48분(아논타워종료)"], ["08분(서목행)","20분(승남행)","34분(서목행)","48분(서목행)"]],
            24: [["05분(창선행 막차)"], ["05분(서목행)","15분(탄성군청종료)","25분(고무종료 막차)"]]
        }
    },
    "2": {
        refStation: "중앙로역",
        upDir: "내선순환 (월천 → 박산 → 동곡 → 시청 → 중앙로)",
        dnDir: "외선순환 (내항 → 월천 → 시청 → 동곡 → 우전)",
        firstTrain: "05:11", lastTrain: "24:45", lastMin: 24 * 60 + 45,
        intervalSummary: "출퇴근(RH): 3~4분 / 평시(NH): 5~6분 / 심야(23~24시): 6~13분",
        wk: {
            5: [["11분(중앙로>월천)","22분","31분","46분","56분"], ["11분(고송>월천)","23분","32분","43분","56분"]],
            6: [["02분","09분","15분","21분","27분","33분","39분","45분","51분","56분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","57분"]],
            7: [["01분","05분","09분","13분","17분","21분","25분","28분","31분","34분","37분","40분","43분","46분","49분","52분","55분","58분"], ["02분","06분","10분","14분","18분","22분","25분","28분","31분","34분","37분","40분","43분","46분","49분","52분","55분","58분"]],
            8: [["00분","03분","06분","09분","12분","15분","18분","21분","24분","27분","30분","33분","36분","39분","42분","45분","49분","53분","57분"], ["02분","05분","08분","11분","14분","17분","20분","23분","26분","29분","32분","35분","38분","41분","44분","48분","52분","56분","59분"]],
            9: [["01분","05분","09분","14분","19분","24분","30분","36분","42분","48분","54분"], ["03분","07분","12분","17분","22분","28분","34분","40분","46분","52분","58분"]],
            10: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            11: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            12: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            13: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            14: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            15: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            16: [["00분","06분","12분","18분","24분","30분","35분","40분","45분","50분","55분"], ["04분","10분","16분","22분","28분","34분","39분","44분","49분","54분","59분"]],
            17: [["00분","04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"], ["03분","07분","11분","15분","19분","23분","27분","31분","35분","39분","43분","47분","51분","55분","59분"]],
            18: [["00분","03분","06분","09분","12분","15분","18분","21분","24분","27분","30분","33분","36분","39분","42분","46분","50분","54분","58분"], ["02분","05분","08분","11분","14분","17분","20분","23분","26분","29분","32분","35분","38분","41분","45분","49분","53분","57분"]],
            19: [["02분","06분","10분","14분","18분","22분","27분","32분","37분","42분","48분","54분"], ["01분","05분","09분","13분","17분","21분","26분","31분","36분","41분","47분","53분","59분"]],
            20: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["05분","11분","17분","23분","29분","35분","41분","47분","53분","59분"]],
            21: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["05분","11분","17분","23분","29분","35분","41분","47분","53분","59분"]],
            22: [["00분","06분","12분","18분","24분","30분","36분","42분","49분","56분"], ["05분","11분","17분","23분","29분","35분","42분","49분","56분"]],
            23: [["03분","10분","16분","22분","28분","34분","40분","47분","52분","59분"], ["03분","10분","16분","22분","28분","35분","41분","47분","53분","59분"]],
            24: [["02분","12분(월천종료)","21분(중앙로종료)","32분(월천종료)","45분(월천종료)"], ["04분","14분(월천종료)","22분(고송종료)","33분(월천종료)","44분(월천종료)"]]
        }
    },
    "2B": {
        refStation: "효빈항국제여객터미널역",
        upDir: "월천 방면 (어간중앙·어간항·운양 경유)",
        dnDir: "효빈항국제여객터미널 방면",
        firstTrain: "05:11", lastTrain: "23:55", lastMin: 23 * 60 + 55,
        intervalSummary: "출퇴근(07~09시, 17~19시): 6~10분 / 평시: 10~15분 / 새벽·심야: 15~16분",
        wk: {
            5: [["11분(월천행)","27분","43분","59분"], ["15분","31분","47분"]],
            6: [["15분","30분","40분","50분"], ["02분","18분","33분","45분","55분"]],
            7: [["00분","10분","20분","26분","32분","38분","44분","50분","56분"], ["05분","15분","23분","30분","36분","42분","48분","54분"]],
            8: [["02분","08분","14분","20분","26분","32분","38분","45분","52분"], ["00분","06분","12분","18분","24분","30분","37분","44분","52분"]],
            9: [["00분","10분","20분","30분","40분","50분"], ["00분","10분","20분","30분","40분","50분"]],
            10: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            11: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            12: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            13: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            14: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            15: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            16: [["02분","14분","26분","38분","50분"], ["02분","14분","26분","38분","50분"]],
            17: [["00분","10분","20분","28분","36분","44분","52분"], ["02분","12분","22분","30분","38분","46분","54분"]],
            18: [["00분","08분","16분","24분","32분","40분","48분","56분"], ["02분","10분","18분","26분","34분","42분","50분","58분"]],
            19: [["05분","15분","25분","35분","45분","55분"], ["06분","16분","26분","36분","46분","56분"]],
            20: [["07분","19분","31분","43분","55분"], ["08분","20분","32분","44분","56분"]],
            21: [["07분","19분","31분","43분","55분"], ["08분","20분","32분","44분","56분"]],
            22: [["10분","25분","40분","55분"], ["10분","25분","40분","55분"]],
            23: [["10분","25분","40분","55분(월천종료)"], ["12분","28분","45분(막차)"]]
        }
    },
    "3": {
        refStation: "효빈역",
        upDir: "상행 (시청·고송나루·토모리해수욕장·효빈국제공항 방면)",
        dnDir: "하행 (사가당·청엽구청·동곡·팔조 방면)",
        firstTrain: "05:26", lastTrain: "25:17 (익일 01:17)", lastMin: 25 * 60 + 17,
        intervalSummary: "출퇴근(RH): 4~5분 / 평시(NH): 6~7분 / 심야(23~25시): 9~12분",
        wk: {
            5: [["28분(공항행)","38분","50분"], ["26분(팔조행)","36분","48분"]],
            6: [["02분","08분","14분","20분","26분","32분","37분","42분","47분","52분","57분"], ["00분","07분","13분","19분","25분","31분","36분","41분","46분","51분","56분"]],
            7: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["00분","04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"]],
            8: [["01분","05분","09분","13분","17분","21분","26분","31분","36분","41분","46분","51분","56분"], ["00분","04분","08분","12분","16분","20분","25분","30분","35분","40분","45분","50분","55분"]],
            9: [["01분","06분","11분","16분","21분","26분","31분","37분","43분","49분","55분"], ["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"]],
            10: [["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"], ["03분","09분","15분","21분","27분","33분","39분","45분","51분","57분"]],
            11: [["05분","12분","19분","26분","33분","40분","47분","54분"], ["04분","11분","18분","25분","32분","39분","46분","53분"]],
            12: [["01분","08분","15분","22분","29분","36분","43분","50분","57분"], ["00분","07분","14분","21분","28분","35분","42분","49분","56분"]],
            13: [["04분","11분","18분","25분","32분","39분","46분","53분"], ["03분","10분","17분","24분","31분","38분","45분","52분","59분"]],
            14: [["00분","07분","14분","21분","28분","35분","42분","49분","56분"], ["06분","13분","20분","27분","34분","41분","48분","55분"]],
            15: [["04분","11분","18분","25분","32분","39분","46분","53분"], ["01분","08분","15분","22분","29분","36분","43분","50분","57분"]],
            16: [["00분","07분","14분","21분","28분","35분","41분","47분","53분","59분"], ["03분","10분","17분","24분","31분","37분","43분","49분","55분"]],
            17: [["01분","07분","13분","19분","25분","31분","36분","41분","46분","51분","56분"], ["00분","06분","12분","18분","24분","30분","35분","40분","45분","50분","55분"]],
            18: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"]],
            19: [["01분","06분","11분","16분","21분","26분","31분","37분","43분","49분","55분"], ["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"]],
            20: [["01분","07분","13분","19분","25분","31분","37분","43분","49분","55분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            21: [["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            22: [["03분","10분","17분","24분","31분","38분","45분","52분","59분"], ["01분","08분","15분","22분","29분","36분","43분","50분","57분"]],
            23: [["06분","13분","20분","27분","34분","41분","48분","55분"], ["03분","10분","17분","24분","31분","38분","45분","52분","59분"]],
            24: [["05분(공항행)","15분","25분","35분","45분","59분(효빈역종료)"], ["08분(팔조행)","17분","26분","35분","44분","53분"]],
            25: [[], ["08분(공항>팔조)","17분(공항>팔조 막차)"]]
        }
    },
    "4": {
        refStation: "이자역",
        upDir: "상행 (도변·우택·사가당·남구청·해운산업지구 방면)",
        dnDir: "하행 (서수·소원·천가 방면)",
        firstTrain: "05:26", lastTrain: "24:44", lastMin: 24 * 60 + 44,
        intervalSummary: "출퇴근(RH): 4~5분 / 평시(NH): 6~7분 / 심야(23~24시): 7~13분",
        wk: {
            5: [["28분(해운산단행)","38분","50분"], ["26분(천가행)","36분","48분"]],
            6: [["02분","08분","14분","20분","26분","32분","37분","42분","47분","52분","57분"], ["00분","07분","13분","19분","25분","31분","36분","41분","46분","51분","56분"]],
            7: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["00분","04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"]],
            8: [["01분","05분","09분","13분","17분","21분","26분","31분","36분","41분","46분","51분","56분"], ["00분","04분","08분","12분","16분","20분","25분","30분","35분","40분","45분","50분","55분"]],
            9: [["01분","06분","11분","16분","21분","26분","31분","37분","43분","49분","55분"], ["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"]],
            10: [["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"], ["03분","09분","15분","21분","27분","33분","39분","45분","51분","57분"]],
            11: [["05분","12분","19분","26분","33분","40분","47분","54분"], ["04분","11분","18분","25분","32분","39분","46분","53분"]],
            12: [["01분","08분","15분","22분","29분","36분","43분","50분","57분"], ["00분","07분","14분","21분","28분","35분","42분","49분","56분"]],
            13: [["04분","11분","18분","25분","32분","39분","46분","53분"], ["03분","10분","17분","24분","31분","38분","45분","52분","59분"]],
            14: [["00분","07분","14분","21분","28분","35분","42분","49분","56분"], ["06분","13분","20분","27분","34분","41분","48분","55분"]],
            15: [["04분","11분","18분","25분","32분","39분","46분","53분"], ["01분","08분","15분","22분","29분","36분","43분","50분","57분"]],
            16: [["00분","07분","14분","21분","28분","35분","41분","47분","53분","59분"], ["03분","10분","17분","24분","31분","37분","43분","49분","55분"]],
            17: [["01분","07분","13분","19분","25분","31분","36분","41분","46분","51분","56분"], ["00분","06분","12분","18분","24분","30분","35분","40분","45분","50분","55분"]],
            18: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"]],
            19: [["01분","06분","11분","16분","21분","26분","31분","37분","43분","49분","55분"], ["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"]],
            20: [["01분","07분","13분","19분","25분","31분","37분","43분","49분","55분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            21: [["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            22: [["03분","10분","17분","24분","31분","38분","45분","52분","59분"], ["01분","08분","15분","22분","29분","36분","43분","50분","57분"]],
            23: [["06분","13분","20분","27분","34분","41분","48분","55분"], ["03분","10분","17분","24분","31분","38분","45분","52분","59분"]],
            24: [["05분(해운산단행)","18분(남구청행)","31분(남구청행)","44분(남구청행 막차)"], ["02분(천가행)","15분(천가행)","28분(이자종료)","41분(이자종료)"]]
        }
    },
    "5": {
        refStation: "당선역",
        upDir: "하행 (전천·동덕현·시로·도변·포성산 방면)",
        dnDir: "상행 (과복·효빈과학기술원·화환·청덕공원 방면)",
        firstTrain: "05:28", lastTrain: "24:25", lastMin: 24 * 60 + 25,
        intervalSummary: "출퇴근(RH): 5~6분 / 평시(NH): 7분 / 심야(23~24시): 10~15분",
        wk: {
            5: [["28분(포성산행)","40분","52분"], ["46분(청덕공원행)","59분"]],
            6: [["02분","12분","21분","30분","39분","48분","57분"], ["12분","25분","36분","46분","56분"]],
            7: [["05분","12분","19분","25분","30분","35분","40분","45분","50분","55분"], ["06분","16분","25분","32분","39분","46분","53분"]],
            8: [["00분","05분","10분","15분","20분","25분","31분","37분","43분","49분","55분"], ["00분","07분","13분","19분","24분","29분","34분","39분","44분","49분","54분","59분"]],
            9: [["01분","07분","14분","21분","28분","35분","42분","49분","56분"], ["04분","09분","14분","19분","25분","31분","37분","43분","49분","55분"]],
            10: [["03분","10분","17분","24분","31분","38분","45분","52분","59분"], ["01분","08분","15분","22분","29분","36분","43분","50분","57분"]],
            11: [["06분","13분","20분","27분","34분","41분","48분","55분"], ["04분","11분","18분","25분","32분","39분","46분","53분"]],
            12: [["02분","09분","16분","23분","30분","37분","44분","51분","58분"], ["00분","07분","14분","21분","28분","35분","42분","49분","56분"]],
            13: [["05분","12분","19분","26분","33분","40분","47분","54분"], ["03분","10분","17분","24분","31분","38분","45분","52분","59분"]],
            14: [["01분","08분","15분","22분","29분","36분","43분","50분","57분"], ["06분","13분","20분","27분","34분","41분","48분","55분"]],
            15: [["04분","11분","18분","25분","32분","39분","46분","53분"], ["02분","09분","16분","23분","30분","37분","44분","51분","58분"]],
            16: [["00분","07분","14분","21분","28분","35분","42분","48분","54분"], ["05분","12분","19분","26분","33분","40분","47분","54분"]],
            17: [["00분","06분","12분","18분","24분","29분","34분","39분","44분","49분","54분","59분"], ["01분","08분","15분","22분","29분","36분","42분","48분","54분"]],
            18: [["04분","09분","14분","19분","24분","30분","36분","42분","48분","54분"], ["00분","06분","12분","18분","23분","28분","33분","38분","43분","48분","53분","58분"]],
            19: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["03분","08분","13분","18분","24분","30분","36분","42분","48분","54분"]],
            20: [["00분","06분","12분","18분","24분","30분","36분","42분","50분","58분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            21: [["06분","14분","22분","30분","38분","46분","54분"], ["00분","06분","12분","18분","24분","30분","36분","44분","52분"]],
            22: [["02분","10분","18분","26분","34분","44분","56분"], ["00분","08분","18분","28분","38분","50분"]],
            23: [["08분","20분","35분","52분"], ["02분","14분","26분","38분","50분"]],
            24: [["08분(포성산행 막차)"], ["02분(청덕공원행)","12분","25분(청덕공원행 막차)"]]
        }
    },
    "6": {
        refStation: "고송역",
        upDir: "하행 (시청·중수·전천중앙·덕현·마잡 방면)",
        dnDir: "상행 (건강보험공단·고송나루 방면)",
        firstTrain: "05:35", lastTrain: "24:58", lastMin: 24 * 60 + 58,
        intervalSummary: "출퇴근(RH): 2~3분 / 평시(NH): 5~6분 / 심야(23~24시): 7~19분",
        wk: {
            5: [["35분(마잡행)","51분"], ["48분(고송나루행)"]],
            6: [["02분","10분","19분","26분","33분","39분","45분","50분","55분"], ["00분","05분","11분","14분","20분","26분","32분","38분","44분","50분","55분"]],
            7: [["00분","04분","08분","12분","16분","20분","23분","26분","29분","32분","35분","38분","41분","44분","47분","50분","53분","56분","59분"], ["00분","04분","08분","12분","16분","20분","24분","27분","30분","33분","36분","39분","42분","45분","48분","51분","54분","57분"]],
            8: [["00분","02분","04분","06분","08분","10분","12분","14분","16분","18분","20분","22분","25분","28분","31분","35분","39분","41분","44분","48분","54분","57분"], ["01분","03분","05분","07분","09분","11분","13분","15분","17분","20분","22분","25분","28분","30분","33분","35분","38분","43분","47분","50분","54분","57분"]],
            9: [["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"], ["01분","06분","11분","16분","21분","26분","32분","38분","44분","50분","56분"]],
            10: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            11: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            12: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            13: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            14: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            15: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            16: [["00분","06분","12분","18분","24분","30분","35분","40분","45분","50분","55분"], ["02분","08분","14분","20분","26분","32분","37분","42분","47분","52분","57분"]],
            17: [["00분","04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"], ["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"]],
            18: [["00분","03분","06분","09분","12분","15분","18분","21분","24분","27분","30분","33분","36분","40분","44분","48분","52분","56분"], ["01분","04분","07분","10분","13분","16분","19분","22분","25분","28분","31분","34분","37분","41분","45분","49분","53분","57분"]],
            19: [["00분","05분","10분","15분","20분","25분","30분","36분","42분","48분","54분"], ["01분","06분","11분","16분","21분","26분","32분","38분","44분","50분","56분"]],
            20: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            21: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            22: [["00분","07분","14분","21분","28분","35분","42분","49분","56분"], ["02분","09분","16분","23분","30분","37분","44분","51분","58분"]],
            23: [["03분","11분","19분","25분","33분","46분","53분","59분"], ["05분","12분","20분","26분","33분","40분","50분"]],
            24: [["07분(마잡행)","17분","30분","49분(마잡행 막차)"], ["03분(고송나루행)","22분","44분","58분(고송나루행 막차)"]]
        }
    },
    "7": {
        refStation: "중보로역",
        upDir: "효빈대입구 방면 (본선: 효빈역 경유 / 지선: 조유·색수시장 경유)",
        dnDir: "어간중앙 방면 (개항지·우이·내항·효빈항·항만해변 경유)",
        firstTrain: "05:49", lastTrain: "23:44", lastMin: 23 * 60 + 44,
        intervalSummary: "출퇴근(RH): 2~3분 / 평시(NH): 4~6분 / 심야(22~23시): 5~13분 (본선·조유지선 1:1 교대 배차)",
        wk: {
            5: [["49분(조유지선)","55분(효빈역본선)"], ["49분(어간중앙행)","55분"]],
            6: [["05분(조유)","10분(본선)","14분(조유)","18분(본선)","22분(조유)","26분(본선)","30분(조유)","34분(본선)","38분(조유)","42분(본선)","46분(조유)","50분(본선)","54분(조유)","58분(본선)"], ["05분","11분","20분","32분","41분","46분","50분","56분"]],
            7: [["01분","04분","07분","10분","13분","16분","19분","22분","24분","26분","28분","30분","32분","34분","36분","38분","40분","42분","44분","46분","48분","50분","52분","54분","56분","58분"], ["01분","06분","11분","16분","21분","24분","27분","30분","33분","35분","37분","41분","45분","48분","53분","57분"]],
            8: [["00분","02분","04분","06분","08분","10분","12분","14분","16분","18분","20분","22분","24분","26분","28분","30분","32분","34분","37분","40분","43분","46분","49분","52분","55분","58분"], ["00분","03분","06분","10분","15분","20분","24분","27분","30분","33분","36분","39분","42분","45분","50분","56분"]],
            9: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            10: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            11: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            12: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            13: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            14: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            15: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            16: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["02분","07분","13분","16분","20분","26분","32분","39분","42분","45분","51분","57분"]],
            17: [["01분","04분","07분","10분","13분","16분","19분","22분","25분","28분","31분","34분","37분","40분","43분","46분","49분","52분","55분","58분"], ["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"]],
            18: [["00분","02분","05분","08분","11분","14분","17분","20분","23분","26분","29분","32분","35분","38분","41분","44분","47분","50분","54분","58분"], ["01분","04분","08분","12분","16분","20분","24분","28분","32분","36분","40분","44분","48분","52분","56분"]],
            19: [["00분","02분","05분","08분","11분","14분","17분","20분","23분","26분","29분","32분","35분","38분","42분","46분","50분","54분","58분"], ["02분","08분","14분","20분","26분","32분","38분","44분","50분","56분"]],
            20: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["03분","09분","15분","21분","27분","33분","39분","45분","51분","57분"]],
            21: [["02분","06분","10분","14분","18분","22분","26분","30분","34분","38분","42분","46분","50분","54분","58분"], ["03분","09분","15분","21분","27분","33분","39분","45분","51분","57분"]],
            22: [["02분","07분","12분","17분","22분","27분","32분","37분","42분","47분","52분","57분"], ["02분","10분","18분","26분","34분","42분","50분","58분"]],
            23: [["02분(본선)","09분(조유)","16분(본선)","23분(조유)","30분(본선)","37분(조유)","44분(본선 막차)"], ["02분(어간중앙행)","15분","28분","41분(어간중앙행 막차)"]]
        }
    },
    "8": {
        refStation: "남구청역",
        upDir: "상행 (평당고·능남·곽산고·곽산 방면)",
        dnDir: "하행 (주곡·신거·운양중앙·박산·신흥 방면)",
        firstTrain: "05:37", lastTrain: "24:00", lastMin: 24 * 60,
        intervalSummary: "출퇴근(RH): 4~5분 / 평시(NH): 6~7분 / 심야(22~24시): 10~15분",
        wk: {
            5: [["37분(곽산행)","46분","57분"], ["37분(신흥행)","53분"]],
            6: [["08분","19분","30분","41분","46분","51분","56분"], ["06분","19분","30분","40분","50분","55분"]],
            7: [["00분","09분","18분","25분","31분","36분","41분","46분","51분","55분"], ["07분","18분","27분","35분","41분","47분","53분","58분"]],
            8: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["03분","07분","12분","16분","21분","25분","30분","34분","39분","43분","48분","52분","57분"]],
            9: [["01분","05분","09분","14분","20분","26분","32분","38분","44분","51분","57분"], ["01분","06분","11분","16분","21분","26분","31분","36분","42분","48분","54분"]],
            10: [["04분","10분","17분","23분","30분","36분","43분","49분","56분"], ["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"]],
            11: [["02분","09분","15분","22분","28분","35분","41분","48분","54분"], ["00분","07분","13분","20분","26분","33분","39분","46분","52분","59분"]],
            12: [["01분","07분","14분","20분","27분","33분","40분","46분","53분","59분"], ["05분","12분","18분","25분","31분","38분","44분","51분","57분"]],
            13: [["06분","12분","19분","25분","32분","38분","45분","51분","58분"], ["04분","10분","17분","23분","30분","36분","43분","49분","56분"]],
            14: [["04분","11분","17분","24분","30분","37분","43분","50분","56분"], ["02분","09분","15분","22분","28분","35분","41분","48분","54분"]],
            15: [["03분","09분","16분","22분","29분","35분","42분","48분","55분"], ["01분","07분","14분","20분","27분","33분","40분","46분","53분","59분"]],
            16: [["01분","07분","13분","19분","25분","31분","37분","43분","48분","53분","58분"], ["06분","12분","19분","25분","31분","37분","43분","49분","55분"]],
            17: [["03분","08분","13분","18분","23분","28분","33분","38분","43분","48분","53분","57분"], ["00분","05분","10분","15분","20분","25분","30분","35분","39분","43분","47분","51분","55분","59분"]],
            18: [["01분","05분","09분","13분","17분","21분","25분","29분","33분","37분","41분","45분","49분","53분","57분"], ["03분","07분","11분","15분","19분","23분","27분","31분","35분","39분","43분","47분","51분","55분"]],
            19: [["01분","05분","09분","13분","17분","21분","25분","29분","34분","39분","44분","49분","56분"], ["00분","05분","10분","15분","20분","25분","30분","35분","40분","45분","50분","55분"]],
            20: [["04분","12분","20분","28분","36분","44분","52분"], ["00분","05분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            21: [["00분","08분","16분","24분","32분","40분","48분","57분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","59분"]],
            22: [["07분","17분","27분","37분","47분","58분"], ["07분","17분","27분","37분","47분","57분"]],
            23: [["09분","21분","33분","44분"], ["09분","21분","33분","44분","59분(신흥행 막차)"]],
            24: [["00분(곽산행 막차)"], []]
        }
    },
    "B": {
        refStation: "효빈역",
        upDir: "상행 (장원·효빈동신도시·진월천·효빈항 방면)",
        dnDir: "하행 (전덕·당가·안천·이자·고해·약산·천주·고남 방면)",
        firstTrain: "05:05", lastTrain: "24:30", lastMin: 24 * 60 + 30,
        intervalSummary: "출퇴근(RH) 시: 5~6분 / 평시(NH): 7~9분 / 심야 및 첫차·막차 시간대: 11~15분 간격 운행",
        wk: {
            5: [["05분(효빈항행)","18분","31분","44분","56분"], ["10분(고남행)","23분(약산행)","36분(천주행)","49분(고남행)"]],
            6: [["06분","16분","25분","34분","43분","52분"], ["00분","11분","21분","30분","39분","48분","57분"]],
            7: [["00분","06분","11분","17분","22분","28분","33분","39분","44분","50분","55분"], ["03분","09분","14분","20분","25분","31분","36분","42분","47분","53분","58분"]],
            8: [["00분","05분","11분","16분","22분","27분","33분","38분","44분","49분","55분"], ["04분","09분","15분","20분","26분","31분","37분","42분","48분","53분","59분"]],
            9: [["01분","07분","14분","21분","28분","36분","44분","52분"], ["05분","11분","18분","25분","33분","41분","49분","57분"]],
            10: [["00분","08분","16분","24분","32분","40분","48분","56분"], ["05분","13분","21분","29분","37분","45분","53분"]],
            11: [["04분","12분","20분","28분","36분","44분","52분"], ["01분","09분","17분","25분","33분","41분","49분","57분"]],
            12: [["00분","08분","16분","24분","32분","40분","48분","56분"], ["05분","13분","21분","29분","37분","45분","53분"]],
            13: [["04분","12분","20분","28분","36분","44분","52분"], ["01분","09분","17분","25분","33분","41분","49분","57분"]],
            14: [["00분","08분","16분","24분","32분","40분","48분","56분"], ["05분","13분","21분","29분","37분","45분","53분"]],
            15: [["04분","12분","20분","28분","36분","44분","52분"], ["01분","09분","17분","25분","33분","41분","49분","57분"]],
            16: [["00분","08분","16분","24분","32분","40분","47분","54분"], ["05분","13분","21분","29분","37분","44분","51분","58분"]],
            17: [["00분","06분","12분","18분","24분","30분","36분","42분","48분","54분"], ["04분","10분","16분","22분","28분","34분","40분","46분","52분","58분"]],
            18: [["00분","05분","11분","16분","22분","27분","33분","38분","44분","49분","55분"], ["03분","09분","14분","20분","25분","31분","36분","42분","47분","53분","58분"]],
            19: [["01분","07분","13분","19분","25분","32분","40분","48분","56분"], ["04분","10분","16분","22분","29분","37분","45분","53분"]],
            20: [["04분","12분","20분","28분","36분","44분","52분"], ["01분","09분","17분","25분","33분","41분","49분","57분"]],
            21: [["00분","08분","16분","24분","32분","40분","49분","58분"], ["05분","13분","21분","29분","38분","47분","56분"]],
            22: [["08분","19분","30분","41분","52분"], ["06분","17분","28분","39분","50분"]],
            23: [["04분","16분","28분","41분","55분(효빈항행)"], ["02분","14분","27분","40분(천주행)","54분(약산행)"]],
            24: [["10분(효빈동신도시종료)","25분(효빈항행 막차)"], ["08분(고해종료)","22분(안천종료)","30분(전덕종료 막차)"]]
        }
    }
};
subwayTimetableDB["7B"] = subwayTimetableDB["7"];
subwayTimetableDB["R1"] = subwayTimetableDB["B"];

// ★ [핵심] 노선에서 해당 역이 몇 번째 정거장인지 계산하여 기준역 대비 '역별 소요시간 차이(분)'를 정확히 반환!
function getOrderedUniqueStationsForLine(lineCode) {
    if (typeof allLandmarks === 'undefined') return [];
    var sameLineStations = allLandmarks.filter(function(m) {
        return m.type === 'subway' && m.lines && m.lines.includes(lineCode);
    });
    if (sameLineStations.length <= 1) return sameLineStations;

    var targetLineObj = null;
    if (typeof subwayData !== 'undefined' && subwayData.lines && typeof subwayLines !== 'undefined' && subwayLines[lineCode]) {
        var lName = subwayLines[lineCode].name;
        targetLineObj = subwayData.lines.find(l => l.name === lName || l.name.includes(lName));
    }

    if (targetLineObj && targetLineObj.points && targetLineObj.points.length > 1) {
        var adjY = (typeof adjustY !== 'undefined') ? adjustY : 0;
        var lPts = targetLineObj.points.map(p => [p[0] + adjY, p[1]]);
        sameLineStations.forEach(function(st) {
            var minDist = Infinity, bestIdx = 0;
            for (var i = 0; i < lPts.length; i++) {
                var d = Math.pow(st.lat - lPts[i][0], 2) + Math.pow(st.lng - lPts[i][1], 2);
                if (d < minDist) { minDist = d; bestIdx = i; }
            }
            st._lineOrder = bestIdx;
        });
        sameLineStations.sort(function(a, b) { return a._lineOrder - b._lineOrder; });
    } else {
        sameLineStations.sort(function(a, b) { return a.lng - b.lng; });
    }

    var uniqueStations = [];
    var seen = new Set();
    sameLineStations.forEach(function(s) {
        if (!seen.has(s.name)) { seen.add(s.name); uniqueStations.push(s); }
    });
    return uniqueStations;
}

function getStationTimeOffset(stationName, lineCode) {
    var list = getOrderedUniqueStationsForLine(lineCode);
    if (list.length === 0) return { upShift: 0, dnShift: 0, stopDiff: 0 };

    var data = subwayTimetableDB[lineCode] || subwayTimetableDB["B"];
    var refClean = (data.refStation || "").replace(/역.*$/, '').trim();

    var refIdx = list.findIndex(s => s.name.replace(/역$/, '') === refClean);
    if (refIdx === -1) refIdx = Math.floor(list.length / 2);

    var curIdx = list.findIndex(s => s.name === stationName || s.name.replace(/역$/, '') === stationName.replace(/역$/, ''));
    if (curIdx === -1) curIdx = 0;

    var stopDiff = curIdx - refIdx; // 기준역 대비 정거장 차이
    var minPerStop = (lineCode === "B" || lineCode === "R1" || lineCode === "H1") ? 3 : 2; // 일반도시철도 정거장당 2분, 광역 3분

    return {
        stopDiff: stopDiff,
        // 하행(정방향)은 정거장 진행할수록 +2분씩 늦게 도착, 상행(역방향)은 -2분씩 다르게 도착!
        dnShift: stopDiff * minPerStop,
        upShift: -stopDiff * minPerStop
    };
}

// 분 단위 시간표 데이터를 역별 오프셋(upShift, dnShift)만큼 정밀하게 밀어주는 함수
function buildStationShiftedSchedule(wkObj, upShift, dnShift) {
    var shifted = {};
    for (var h = 5; h <= 25; h++) {
        shifted[h] = [[], []];
    }

    Object.keys(wkObj).forEach(function(hStr) {
        var h = parseInt(hStr, 10);
        var upList = wkObj[h][0] || [];
        var dnList = wkObj[h][1] || [];

        // 상행 시프트
        upList.forEach(function(itemStr) {
            var mMatch = itemStr.match(/^(\d{1,2})분(.*)$/);
            if (mMatch) {
                var origMin = parseInt(mMatch[1], 10);
                var note = mMatch[2] || "";
                var totalMin = h * 60 + origMin + upShift;
                var newH = Math.floor(totalMin / 60);
                var newM = ((totalMin % 60) + 60) % 60;
                if (newH >= 5 && newH <= 25) {
                    if (!shifted[newH]) shifted[newH] = [[], []];
                    var mPad = (newM < 10 ? "0" : "") + newM + "분" + note;
                    shifted[newH][0].push({ m: newM, str: mPad });
                }
            }
        });

        // 하행 시프트
        dnList.forEach(function(itemStr) {
            var mMatch = itemStr.match(/^(\d{1,2})분(.*)$/);
            if (mMatch) {
                var origMin = parseInt(mMatch[1], 10);
                var note = mMatch[2] || "";
                var totalMin = h * 60 + origMin + dnShift;
                var newH = Math.floor(totalMin / 60);
                var newM = ((totalMin % 60) + 60) % 60;
                if (newH >= 5 && newH <= 25) {
                    if (!shifted[newH]) shifted[newH] = [[], []];
                    var mPad = (newM < 10 ? "0" : "") + newM + "분" + note;
                    shifted[newH][1].push({ m: newM, str: mPad });
                }
            }
        });
    });

    var finalWk = {};
    Object.keys(shifted).sort((a,b) => parseInt(a)-parseInt(b)).forEach(function(h) {
        var uArr = shifted[h][0].sort((a,b) => a.m - b.m).map(x => x.str);
        var dArr = shifted[h][1].sort((a,b) => a.m - b.m).map(x => x.str);
        if (uArr.length > 0 || dArr.length > 0 || (parseInt(h) >= 6 && parseInt(h) <= 23)) {
            finalWk[h] = [uArr, dArr];
        }
    });
    return finalWk;
}

function shiftTimeText(timeStr, shiftMin) {
    var m = (timeStr || "05:15").match(/(\d{1,2}):(\d{2})/);
    if (!m) return timeStr;
    var total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + shiftMin;
    var hh = Math.floor(total / 60);
    var mm = ((total % 60) + 60) % 60;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
}

// ★ [역마다 고유한 시간표가 열리는 새 창 뷰어]
window.openStationTimetableWindow = function(stationName, initialLineCode) {
    var stItem = (typeof allLandmarks !== 'undefined') ? allLandmarks.find(m => m.type === 'subway' && m.name === stationName) : null;
    var lines = (stItem && stItem.lines && stItem.lines.length > 0) ? stItem.lines : [initialLineCode || "1"];
    var curLine = initialLineCode || lines[0];

    // 이 역의 노선별 시프트된 맞춤 시간표 패키지를 생성
    var customStationDB = {};
    lines.forEach(function(lc) {
        var base = subwayTimetableDB[lc] || subwayTimetableDB["B"];
        var offsetObj = getStationTimeOffset(stationName, lc);
        customStationDB[lc] = {
            refStation: base.refStation,
            stopDiff: offsetObj.stopDiff,
            upShift: offsetObj.upShift,
            dnShift: offsetObj.dnShift,
            upDir: base.upDir,
            dnDir: base.dnDir,
            firstTrain: shiftTimeText(base.firstTrain, Math.min(offsetObj.upShift, offsetObj.dnShift)),
            lastTrain: shiftTimeText(base.lastTrain, Math.max(offsetObj.upShift, offsetObj.dnShift)),
            intervalSummary: base.intervalSummary,
            wk: base.wk ? buildStationShiftedSchedule(base.wk, offsetObj.upShift, offsetObj.dnShift) : null
        };
    });

    var newWin = window.open('', '_blank', 'width=880,height=800,scrollbars=yes');
    if (!newWin) { alert("팝업 차단이 설정되어 있습니다. 브라우저 팝업을 허용해주세요!"); return; }

    var lineMetaJson = JSON.stringify(typeof subwayLines !== 'undefined' ? subwayLines : {});
    var dbJson = JSON.stringify(customStationDB);
    var unOpenedJson = JSON.stringify(unOpenedLines);
    var stLinesJson = JSON.stringify(lines);

    var html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>🕒 ${stationName} 역별 맞춤 열차 시각표 | 효빈교통공사</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
    * { box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; margin: 0; background: #f0f2f5; color: #222; }
    .header { background: #1a237e; color: #fff; padding: 18px 26px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 900; display: flex; align-items: center; gap: 10px; }
    .line-tabs { display: flex; gap: 8px; padding: 14px 26px; background: #fff; border-bottom: 1px solid #ddd; flex-wrap: wrap; }
    .line-tab { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; border: 2px solid #ccc; background: #fff; color: #444; }
    .line-tab.active { color: #fff !important; }
    .container { max-width: 840px; margin: 20px auto 50px auto; padding: 0 16px; }
    .summary-card { background: #fff; border-radius: 10px; padding: 18px 22px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 6px solid #0077DD; }
    .summary-title { font-size: 17px; font-weight: 900; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .summary-meta { font-size: 13px; color: #444; line-height: 1.7; }
    .tt-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12.5px; }
    .tt-table th { background: #263238; color: #fff; padding: 12px 10px; font-size: 13px; font-weight: 700; text-align: center; }
    .tt-table td { border-bottom: 1px solid #eee; padding: 10px 12px; vertical-align: middle; line-height: 1.7; }
    .tt-table tr:nth-child(even) { background: #fafbfc; }
    .hour-col { width: 70px; text-align: center; font-weight: 900; font-size: 14px; background: #eef2f7 !important; color: #1a237e; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .min-chip { display: inline-block; margin: 2px 4px; padding: 2px 6px; border-radius: 4px; background: #f1f3f5; color: #222; font-weight: 500; }
    .min-chip.dest { background: #fff3cd; color: #b02a37; font-weight: 700; border: 1px solid #ffecb5; }
    .unopened-box { background: #fff8e1; border: 2px dashed #ffa000; border-radius: 10px; padding: 40px 20px; text-align: center; color: #e65100; font-weight: 700; font-size: 16px; }
</style>
</head>
<body>
    <div class="header">
        <h1>🚉 ${stationName} 실제 열차 도착·출발 시각표</h1>
        <div style="display:flex; gap:8px;">
            <a href="${HYOBIN_WIKI_BASE}${ encodeURIComponent(stationName) }.html" target="_blank" style="background:#0077DD; color:#fff; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold;">📖 효빈위키 역 문서</a>
            <button onclick="window.print()" style="background:#fff; color:#222; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">🖨️ 인쇄</button>
            <button onclick="window.close()" style="background:#e53935; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">닫기 ✕</button>
        </div>
    </div>
    <div class="line-tabs" id="line-tabs"></div>
    <div class="container">
        <div id="tt-content"></div>
    </div>
<script>
    var lineMeta = ${lineMetaJson};
    var ttDB = ${dbJson};
    var unOpened = ${unOpenedJson};
    var stLines = ${stLinesJson};
    var currentLine = "${curLine}";

    function renderTabs() {
        var tabsEl = document.getElementById('line-tabs');
        tabsEl.innerHTML = stLines.map(function(lc) {
            var info = lineMeta[lc] || { name: lc + "호선", color: "#0077DD" };
            var isAct = (lc === currentLine);
            var style = isAct ? "background:" + info.color + "; border-color:" + info.color + ";" : "border-color:" + info.color + "; color:" + info.color + ";";
            return '<button class="line-tab ' + (isAct ? 'active' : '') + '" style="' + style + '" onclick="selectLine(\\'' + lc + '\\')">' + info.name + '</button>';
        }).join('');
    }

    function formatMins(arr) {
        if (!arr || arr.length === 0) return '<span style="color:#bbb;">운행 없음</span>';
        return arr.map(function(m) {
            var isSpecial = m.includes("(");
            return '<span class="min-chip ' + (isSpecial ? 'dest' : '') + '">' + m + '</span>';
        }).join('');
    }

    function selectLine(lc) {
        currentLine = lc;
        renderTabs();
        var info = lineMeta[lc] || { name: lc + "호선", color: "#0077DD" };
        var contentEl = document.getElementById('tt-content');

        if (unOpened[lc]) {
            contentEl.innerHTML = '<div class="unopened-box">' + unOpened[lc].badge + '<br><br><span style="font-size:14px; color:#555; font-weight:normal;">해당 노선(' + info.name + ')은 현재 ' + unOpened[lc].status + '이므로 영업 열차 시각표가 제공되지 않습니다.</span></div>';
            return;
        }

        var data = ttDB[lc];
        var diffTxt = data.stopDiff === 0 ? "기준역 정시" : (Math.abs(data.stopDiff) + "개 역 거리 시차 반영 완료: 상행 " + (data.upShift>=0?"+":"") + data.upShift + "분 / 하행 " + (data.dnShift>=0?"+":"") + data.dnShift + "분");
        var html = '<div class="summary-card" style="border-left-color:' + info.color + ';">' +
            '<div class="summary-title"><span style="color:' + info.color + ';">● ' + info.name + ' — ${stationName} 맞춤 시각표</span><span style="font-size:12px; background:#eef6ff; color:#0077DD; padding:3px 8px; border-radius:4px;">⚡ ' + diffTxt + '</span></div>' +
            '<div class="summary-meta">' +
            '· <b>${stationName} 첫차 / 막차:</b> 첫차 <b>' + data.firstTrain + '</b> / 막차 <b>' + data.lastTrain + '</b><br>' +
            '· <b>노선 배차간격:</b> ' + data.intervalSummary +
            '</div></div>';

        if (data.wk) {
            html += '<table class="tt-table"><thead><tr><th style="width:45%; background:' + info.color + ';">' + data.upDir + '</th><th style="width:10%;">시(Hour)</th><th style="width:45%; background:' + info.color + ';">' + data.dnDir + '</th></tr></thead><tbody>';
            Object.keys(data.wk).sort(function(a,b){return parseInt(a)-parseInt(b);}).forEach(function(h) {
                var row = data.wk[h];
                var dispH = (parseInt(h) >= 24) ? h + "시<br><small>(익일0" + (parseInt(h)-24) + "시)</small>" : h + "시";
                html += '<tr><td>' + formatMins(row[0]) + '</td><td class="hour-col">' + dispH + '</td><td>' + formatMins(row[1]) + '</td></tr>';
            });
            html += '</tbody></table>';
        }
        contentEl.innerHTML = html;
    }

    selectLine(currentLine);
<\/script>
</body>
</html>`;

    newWin.document.write(html);
    newWin.document.close();
};

function getAdjacentStations(stationItem, lineCode) {
    var uniqueStations = getOrderedUniqueStationsForLine(lineCode);
    var curIdx = uniqueStations.findIndex(s => s.name === stationItem.name);
    if (curIdx === -1) return { prev: null, next: null };

    return {
        prev: (curIdx > 0) ? uniqueStations[curIdx - 1] : null,
        next: (curIdx < uniqueStations.length - 1) ? uniqueStations[curIdx + 1] : null
    };
}

window.jumpToStation = function(stationName) {
    if (!stationName || typeof activeMarkers === 'undefined') return;
    var targetMarker = activeMarkers.find(m => m.stationName === stationName);
    if (targetMarker) {
        map.setView(targetMarker.getLatLng(), Math.max(map.getZoom(), -1.5), { animate: true });
        setTimeout(function() { targetMarker.fire('click'); }, 300);
    }
};

window.switchStationPopupLine = function(stationName, newLineCode) {
    if (typeof activeMarkers === 'undefined') return;
    var targetMarker = activeMarkers.find(m => m.stationName === stationName);
    if (targetMarker) {
        targetMarker.selectedLineCode = newLineCode;
        targetMarker.fire('click');
    }
};

function calculateSize(zoom) { return Math.max(baseMarkerSize + (zoom * sizeMultiplier), minMarkerSize); }

// =========================================================
// SVG 아이콘 생성 함수 (편의점 전용 로고 포함)
// =========================================================
function createFacilityCustomIcon(type, color, size, itemName) {
    if (!color) color = "#333333";
    var actualSize = Math.max(size || 36, 32); 

    if (type === "cvs") {
        var bBg = "#00C853", bBorder = "#ffffff", bLabel = "24", bSub = "CVS";
        var n = itemName || "";
        if (n.includes("CU")) { bBg = "#652D90"; bBorder = "#8DC63F"; bLabel = "CU"; bSub = "24H"; }
        else if (n.includes("GS25") || n.includes("GS")) { bBg = "#0072BC"; bBorder = "#00AEEF"; bLabel = "GS"; bSub = "25"; }
        else if (n.includes("세븐일레븐")) { bBg = "#008061"; bBorder = "#F58220"; bLabel = "7"; bSub = "ELEVEN"; }
        else if (n.includes("이마트24") || n.includes("이마트 24")) { bBg = "#FFB81C"; bBorder = "#4D4D4F"; bLabel = "e24"; bSub = "24H"; }
        else if (n.includes("미니스톱")) { bBg = "#003DA5"; bBorder = "#FFD100"; bLabel = "MINI"; bSub = "24"; }

        var cvsSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.45));">
            <rect x="8" y="8" width="84" height="84" rx="22" fill="${bBg}" stroke="${bBorder}" stroke-width="7"/>
            <path d="M16 26 H84" stroke="#ffffff" stroke-width="3" opacity="0.35"/>
            <text x="50" y="54" font-family="'Arial Black', 'Noto Sans KR', sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">${bLabel}</text>
            <text x="50" y="77" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#ffee58" text-anchor="middle">${bSub}</text>
        </svg>`;
        return L.divIcon({
            className: 'custom-cvs-logo-pin',
            html: cvsSvg,
            iconSize: [actualSize, actualSize],
            iconAnchor: [actualSize / 2, actualSize / 2],
            popupAnchor: [0, -actualSize / 2]
        });
    }

    var iconPath = "";
    var baseGroup = groupMap[type] || "normal";

    if (type.includes("police") || type === "coast_guard") {
        iconPath = `M256 0L32 64v128c0 141.4 96 264.8 224 320 128-55.2 224-178.6 224-320V64L256 0zm0 128c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm0 288c-44.2 0-84.9-18.4-114-48 11.2-22.4 43.1-32 114-32s102.8 9.6 114 32c-29.1 29.6-69.8 48-114 48z`;
    } else if (type.includes("fire")) {
        iconPath = `M256 0C150 120 96 200 96 288c0 88.4 71.6 160 160 160s160-71.6 160-160c0-88-54-168-160-288zm0 384c-53 0-96-43-96-96 0-35 22-77 64-128 15 25 32 48 32 72 0 17.7 14.3 32 32 32s32-14.3 32-32c0-18-10-38-20-58 38 42 56 80 56 114 0 53-43 96-96 96z`;
    } else if (type === "post_office") {
        iconPath = `M464 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM48 112h416v38.8L256 281.1 48 150.8V112zm0 288V201.2l195.4 128.8c7 4.6 16.2 4.6 23.2 0L464 201.2V400H48z`;
    } else if (baseGroup === "education") {
        iconPath = `M319.4 178.2L288 163.9v53.2c0 14.8-18 22.4-28.4 11.8L192 160l-67.6 68.9c-10.4 10.6-28.4 3-28.4-11.8v-53.2L64.6 178.2C49.5 185.7 40 201.2 40 218.2V384c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V300l40-40 40 40v84c0 13.3 10.7 24 24 24h64c13.3 0 24-10.7 24-24V218.2c0-17-9.5-32.5-24.6-40zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z`;
    } else if (baseGroup === "residence") {
        iconPath = `M0 32V480H448V32H0zm64 64H128V160H64V96zm128 0H256V160H192V96zm128 0H384V160H320V96zM64 224H128V288H64V224zm128 0H256V288H192V224zm128 0H384V288H320V224zM64 352H128V416H64V352zm128 0H256V416H192V352zm128 0H384V416H320V352z`;
    } else if (baseGroup === "public") {
        iconPath = `M224 0C100.3 0 0 100.3 0 224s100.3 224 224 224s224-100.3 224-224S347.7 0 224 0zm0 384c-88.4 0-160-71.6-160-160s71.6-160 160-160s160 71.6 160 160s-71.6 160-160 160zm32-240c0 17.7-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32z`;
} else if (type.includes("bank") || type === "credit_union" || type === "finance_corp") {
        iconPath = `M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32H32zM96 256H64V448h32V256zm128 0H192V448h32V256zm160 0H352V448h32V256zM0 480H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`;
    } else if (baseGroup === "medical") {
        iconPath = `M272 96c0-8.8-7.2-16-16-16h-64c-8.8 0-16 7.2-16 16v112H64c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h112v112c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16V304h112c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16H272V96z`;
    } else if (type === "cafe" || type === "bakery") {
        iconPath = `M96 64c0-17.7 14.3-32 32-32H384c17.7 0 32 14.3 32 32v64H96V64zM0 192H448V352c0 53-43 96-96 96H96c-53 0-96-43-96-96V192zm448 64v64c35.3 0 64-28.7 64-64s-28.7-64-64-64z`;
    } else if (baseGroup === "food") {
        iconPath = `M224 48C100.3 48 0 148.3 0 272V304c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V272c0-123.7-100.3-224-224-224zM32 368h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z`;
    } else if (baseGroup === "commercial") {
        iconPath = `M160 64c0-35.3 28.7-64 64-64s64 28.7 64 64v32h64c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64V64zm64 0c-17.7 0-32 14.3-32 32v32h64V96c0-17.7-14.3-32-32-32z`;
    } else if (type.includes("anime")) {
        iconPath = `M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z`;
    } else if (type.includes("hotel") || type === "resort") {
        iconPath = `M32 384c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 128c0-35.3 28.7-64 64-64h192c35.3 0 64 28.7 64 64V256H64V128zM0 320H480V288H0v32z`;
    } else if (type === "airport" || type === "airbase") {
        iconPath = `M382.3 8.3L459.7 75l.1 .1c25 22.1 36.6 55.4 30.5 87.5L445.6 373.1l60.2 46.5c15.6 12 20.3 34.3 10.6 51.5c-7 12.3-20.9 19-35.1 17l-159.2-22.7L203 490c-9.3 12.1-26.3 15-39 6.8s-17.5-23.7-11.4-37l33-72.6-133-19-61.9 47.9c-15.6 12-38 8.6-49.3-7.5c-8.2-11.7-9.5-27-3.4-39.7l35-73.4L6 142.1c-14.2-2-22.9-15.7-19.6-29.6s15.7-22.9 29.6-19.6l239.5 34.2 96-211.2c7-15.3 22.9-24.2 39.8-22.3s30.8 14.4 33.2 31l2.4 29.1-44.5 54.3z`;
    } else if (type === "mountain" || type === "hill") {
        iconPath = `M256 32L0 448h512L256 32z`;
    } else {
        iconPath = `M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z`;
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
// ★ [핵심 엔진] 별점과 업종에 맞춰 자동으로 방문자 리뷰를 생성하는 함수
// (마커 클릭 시 및 상세페이지 열람 시 설명이 비어있으면 100% 자동 작동!)
// =========================================================
function generateAutoReview(ratingScore, type, name) {
    var score = parseFloat(ratingScore);
    if (isNaN(score)) score = 4.2;

    // 특정 카테고리별 맞춤형 고증 리뷰 (높은 별점일 때 우선 적용)
    if (score >= 4.0) {
        if (type === "cvs") return "매장이 쾌적하고 물건 종류가 다양해서 자주 이용하는 편의점입니다. 점원분도 친절해요!";
        if (type === "apartment" || type === "public_apt" || type === "officetel") return "단지 조경과 관리가 깔끔하게 잘 되어 있고, 대중교통 접근성이 뛰어나 살기 좋은 곳입니다.";
        if (type === "community_center" || type === "city_hall" || type === "gu_office" || type === "gun_office") return "직원분들이 민원 처리를 빠르고 친절하게 도와주셔서 기분 좋게 업무를 보고 왔습니다.";
        if (type && type.includes("school")) return "교정이 깔끔하고 면학 분위기가 잘 조성되어 있는 효빈의 자랑스러운 학교입니다.";
        if (type === "university" || type === "college" || type === "univ_building") return "캠퍼스 시설이 훌륭하고 산책하기에도 참 좋습니다. 학생들과 지역 주민 모두에게 사랑받는 공간이에요.";
        if (type && (type.includes("hospital") || type === "dental" || type === "oriental_med" || type === "pharmacy")) return "원장님과 간호사분들이 과잉진료 없이 꼼꼼하고 친절하게 설명해 주셔서 믿고 방문합니다.";
        if (type === "anime_shop" || type === "anime_stage" || type === "anime_museum") return "굿즈 라인업이 미쳤습니다! 효빈광역시 덕후들의 성지답게 볼거리가 정말 풍부해요. 최고! 👍";
        if (type === "cafe" || type === "bakery") return "커피 향도 너무 좋고 디저트가 진짜 맛있어요! 매장 인테리어가 예뻐서 자주 찾게 됩니다.";
    }

    // 점수대별 랜덤 리뷰 풀 (시설 이름 기반으로 고정된 문구가 나오도록 처리하여 깜빡임 방지)
    var reviews = [];
    if (score >= 4.5) {
        reviews = [
            "정말 훌륭합니다! 시설도 깔끔하고 무조건 다시 방문하고 싶어요. 👍",
            "효빈광역시 최고의 핫플! 서비스와 품질 모두 완벽하게 만족스럽습니다.",
            "기대 이상이었어요. 주변 지인들에게도 적극 추천하고 싶은 곳입니다!",
            "별 5개가 전혀 아깝지 않은 곳입니다. 아주 만족스러운 경험이었어요."
        ];
    } else if (score >= 3.5) {
        reviews = [
            "전반적으로 무난하고 깔끔한 곳입니다. 기본에 충실해서 자주 찾게 되네요.",
            "가성비가 좋고 위치도 찾기 쉬워서 방문하기 나쁘지 않습니다. 🙂",
            "평범하지만 딱히 흠잡을 데 없는 곳입니다. 나름 만족스럽게 이용했어요.",
            "크게 불편한 점 없이 무난하게 잘 이용하고 갑니다."
        ];
    } else if (score >= 2.0) {
        reviews = [
            "조금 아쉬운 부분이 있네요. 전반적인 시설이나 서비스 개선이 필요해 보입니다. 🤔",
            "기대했던 것보다는 평범했어요. 다음에는 더 좋아지길 바랍니다.",
            "한 번쯤은 가볼 만하지만 두 번 방문할지는 조금 고민되네요."
        ];
    } else {
        reviews = [
            "솔직히 많이 실망했습니다. 개인적으로는 추천하지 않아요. 👎",
            "서비스와 시설 모두 기대 이하입니다. 빠른 개선이 시급해 보입니다.",
            "최악의 경험이었어요. 귀한 시간과 돈이 아깝다는 생각이 듭니다."
        ];
    }

    var seed = name ? (name.length + name.charCodeAt(0)) : Math.floor(Math.random() * 10);
    return reviews[seed % reviews.length];
}

// =========================================================
// 새 창 상세페이지 (별점 및 자동 방문자 리뷰 UI 100% 무조건 출력)
// =========================================================
window.openDetailWindow = function(encodedData) {
    try {
        var data = JSON.parse(decodeURIComponent(encodedData));
        var opInfo = getSmartOperatingStatus(data.type || "normal", data.name, data.hours);

        var finalRating = data.rating || (4.1 + ((data.name ? data.name.length : 3) % 9) * 0.1).toFixed(1);
        var parsedRating = Math.round(parseFloat(finalRating));
        if (parsedRating > 5) parsedRating = 5;
        if (parsedRating < 0) parsedRating = 0;
        var starDisplay = "★".repeat(parsedRating) + "☆".repeat(5 - parsedRating);

        // ★ 핵심: 저장된 리뷰(desc)가 없으면 자동으로 생성해서 무조건 띄움!
        var finalReviewText = (data.desc && data.desc.trim() !== "") 
            ? data.desc 
            : generateAutoReview(finalRating, data.type, data.name);

        var newWin = window.open('', '_blank');
        if (!newWin) { alert("팝업 차단이 설정되어 있습니다. 브라우저에서 팝업을 허용해주세요!"); return; }

        var allList = window.allLandmarks || [];
        var currentLat = data.lat;
        var currentLng = data.lng;
        var gugunName = data.gugun ? data.gugun.split('(')[0] : "효빈광역시";

        var nearbyPlaces = allList.filter(function(m) {
            return m.name && m.type !== 'subway' && m.type !== 'busStop' && m.name !== data.name;
        }).map(function(m) {
            var dist = Math.sqrt(Math.pow(m.lat - currentLat, 2) + Math.pow(m.lng - currentLng, 2));
            var rScore = m.rating || (3.8 + ((m.name.length * 3) % 12) * 0.1).toFixed(1);
            var rCount = m.reviews || ((m.name.length * 43) + 12);
            var mType = classify100Category(m.name);
            return {
                name: m.name,
                type: mType,
                typeName: categoryNames100[mType] || "일반시설",
                dist: dist,
                rating: rScore,
                reviews: rCount,
                image: getSmartFacilityImage(m.name, m.image)
            };
        }).sort(function(a, b) { return a.dist - b.dist; });

        var foodRankList = nearbyPlaces.filter(m => groupMap[m.type] === 'food').slice(0, 6);
        var placeRankList = nearbyPlaces.filter(m => groupMap[m.type] !== 'food').slice(0, 6);

        function buildRankHtml(list) {
            if (list.length === 0) return `<div style="padding:30px; text-align:center; color:#888;">주변에 등록된 장소가 없습니다.</div>`;
            return list.map(function(item, idx) {
                var stars = "★".repeat(Math.round(parseFloat(item.rating))) + "☆".repeat(5 - Math.round(parseFloat(item.rating)));
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
                        <div class="rank-meta">${item.typeName} · 거리 ${Math.round(item.dist)}m<br>${data.province} ${gugunName} ${data.jibunSub || data.legal || ''}</div>
                    </div>
                </div>`;
            }).join('');
        }

        var foodRankHtml = buildRankHtml(foodRankList);
        var placeRankHtml = buildRankHtml(placeRankList);
        var wikiUrl = `${HYOBIN_WIKI_BASE}${encodeURIComponent(data.name)}.html`;

        var html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${data.name} | 효빈맵 상세페이지</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', sans-serif; margin: 0; background: #f4f5f7; color: #222; }
        .top-nav { background: #fff; border-bottom: 1px solid #e2e2e2; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 100; }
        .top-nav .logo { font-size: 18px; font-weight: 700; color: #0077DD; cursor: pointer; }
        .top-nav .center-title { font-size: 15px; font-weight: 700; color: #222; }
        .main-wrap { max-width: 640px; margin: 20px auto 60px auto; position: relative; }
        .card-box { background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 14px; }
        .place-header { padding: 28px 28px 20px 28px; }
        .place-title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: baseline; gap: 8px; }
        .place-cat { font-size: 13px; color: #0077DD; font-weight: 700; background: #eef6ff; padding: 2px 8px; border-radius: 4px; }
        .place-status { font-size: 13.5px; color: #222; margin: 10px 0 16px 0; }
        .pill-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .pill-btn { padding: 7px 14px; border-radius: 20px; border: 1px solid #e0e0e0; background: #fff; font-size: 13px; color: #333; cursor: pointer; font-weight: 500; text-decoration: none; }
        .pill-btn.blue { background: #258fff; color: #fff; border-color: #258fff; }
        .photo-wrap { position: relative; margin: 0 28px 20px 28px; border-radius: 8px; overflow: hidden; height: 220px; background: #e9ecef; border: 1px solid #eee; }
        .photo-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .tab-menu { display: flex; border-bottom: 1px solid #e5e5e5; padding: 0 28px; }
        .tab-item { flex: 1; text-align: center; padding: 14px 0; font-size: 15px; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-item.active { color: #222; font-weight: 700; border-bottom: 2px solid #222; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .info-list { padding: 20px 28px; }
        .info-row { display: flex; align-items: flex-start; padding: 11px 0; border-bottom: 1px solid #f4f4f4; font-size: 14px; line-height: 1.5; }
        .info-icon { width: 28px; color: #888; font-size: 15px; flex-shrink: 0; }
        .info-text { flex: 1; color: #333; }
        .rank-section { padding: 24px 28px; }
        .sub-toggle { display: flex; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
        .sub-btn { flex: 1; padding: 10px 0; text-align: center; font-size: 13px; background: #f9f9f9; color: #777; cursor: pointer; border: none; }
        .sub-btn.active { background: #fff; color: #222; font-weight: 700; border: 1px solid #222; }
        .rank-item { display: flex; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #f2f2f2; gap: 14px; }
        .rank-num { font-size: 15px; font-weight: 700; width: 18px; color: #222; }
        .rank-thumb { width: 68px; height: 68px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #eee; }
        .rank-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .rank-info { flex: 1; }
        .rank-name { font-size: 15px; font-weight: 500; margin-bottom: 3px; }
        .rank-rating .score { color: #ff5e00; font-weight: 700; }
        .rank-rating .stars { color: #ff5e00; }
        .rank-meta { font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="top-nav">
        <div class="logo" onclick="window.close()">HYOBIN<span>map</span></div>
        <div class="center-title">${data.name}</div>
        <div><button onclick="window.close()" style="padding:5px 12px; cursor:pointer;">닫기 ✕</button></div>
    </div>
    <div class="main-wrap">
        <div class="card-box">
            <div class="place-header">
                <h1 class="place-title">${data.name} <span class="place-cat">${data.typeName}</span></h1>
                <div class="place-status">${opInfo.badge} · ${opInfo.hours}</div>
                <div class="pill-actions">
                    <a href="${wikiUrl}" target="_blank" class="pill-btn blue">📖 효빈위키 문서 보기</a>
                    <button class="pill-btn" onclick="window.print()">🖨️ 인쇄</button>
                    <button class="pill-btn" onclick="window.close()">📍 지도로 돌아가기</button>
                </div>
            </div>
            <div class="photo-wrap">
                <img src="${data.image}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22220%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23dfe4ea%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 fill=%22%23747d8c%22 font-weight=%22bold%22 text-anchor=%22middle%22 dy=%22.3em%22>🏢 ${data.name} (${data.image})</text></svg>'">
            </div>
            <div class="tab-menu">
                <div id="tab-btn-home" class="tab-item active" onclick="switchDetailTab('home')">상세 홈</div>
                <div id="tab-btn-rank" class="tab-item" onclick="switchDetailTab('rank')">주변 랭킹</div>
            </div>
            <div id="tab-pane-home" class="tab-content active">
                <div class="info-list">
                    <div class="info-row"><div class="info-icon">🕒</div><div class="info-text"><b>영업시간:</b> ${opInfo.badge} · ${opInfo.hours}</div></div>
                    <div class="info-row"><div class="info-icon">📍</div><div class="info-text"><b>도로명주소:</b> ${data.address} ${data.zip ? `(우)${data.zip}` : ''}<br><span style="color:#888; font-size:13px;"><b>지번주소:</b> ${data.province} ${gugunName} ${data.jibunSub || data.legal} ${data.bunji || ''}</span></div></div>
                    <div class="info-row"><div class="info-icon">📞</div><div class="info-text"><b>대표전화:</b> ${data.phone}</div></div>
                    <div class="info-row"><div class="info-icon">📖</div><div class="info-text"><b>효빈위키:</b> <a href="${wikiUrl}" target="_blank" style="color:#0077DD; font-weight:bold;">${wikiUrl}</a></div></div>
                    
                    <div style="margin-top: 24px; border-top: 1px solid #f4f4f4; padding-top: 24px;">
                        <div style="font-size:15px; font-weight:700; margin-bottom:12px; color:#222;">💬 최근 방문자 베스트 리뷰</div>
                        <div style="background:#f8f9fa; border:1px solid #e5e5e5; border-radius:8px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <div style="width:30px; height:30px; background:#0077DD; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold;">효빈</div>
                                <div style="font-size:13px; font-weight:700; color:#333;">효빈광역시 시민</div>
                                <div style="font-size:13px; color:#ff5252; letter-spacing:-1px;">${starDisplay}</div>
                                <div style="font-size:12px; color:#888; margin-left:auto;">${finalRating}점</div>
                            </div>
                            <div style="font-size:14px; color:#222; line-height:1.6;">${finalReviewText}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="tab-pane-rank" class="tab-content">
                <div class="rank-section">
                    <div class="sub-toggle">
                        <button id="sub-btn-food" class="sub-btn active" onclick="switchRankSub('food')">주변 맛집 TOP 6</button>
                        <button id="sub-btn-place" class="sub-btn" onclick="switchRankSub('place')">주변 주요시설 TOP 6</button>
                    </div>
                    <div id="rank-list-food">${foodRankHtml}</div>
                    <div id="rank-list-place" style="display:none;">${placeRankHtml}</div>
                </div>
            </div>
        </div>
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
        console.error("상세페이지 오류:", e);
    }
};

// =========================================================
// 마커 추가 함수 (모든 시설 클릭 시 자동 리뷰 100% 표시되도록 개선!)
// =========================================================
function addMarkerToMap(item) {
    if (!item) return;

    if (item.name && item.type !== 'subway' && item.type !== 'busStop') {
        if (!item.type || item.type === 'normal' || !categoryNames100[item.type]) {
            item.type = classify100Category(item.name);
        }
        if (typeof markerColors !== 'undefined') {
            item.color = markerColors[item.type] || markerColors["normal"];
        }
    }

    var size = typeof calculateSize === 'function' ? calculateSize(map.getZoom()) : 36;
    var marker;

    // [1] 지하철역 마커
    if (item.type === 'subway') {
        var lines = item.lines || ["1"];
        var isTransfer = lines.length >= 2; 
        var isManualMajor = typeof myMajorStations !== 'undefined' && myMajorStations.includes(item.name);
        var isMajor = (isTransfer || isManualMajor) ? "major-station" : "normal-station";
        var markerClass = (isTransfer || isManualMajor) ? "major-marker" : "normal-marker";
        var lineClasses = lines.map(l => "line-" + l).join(" ");
        var width = (lines.length === 1) ? 14 : (lines.length * 10) + 6;
        var dotsHtml = lines.map(lid => `<div class="transfer-dot" style="background-color:${typeof subwayLines!=='undefined'&&subwayLines[lid]?subwayLines[lid].color:'#333'};"></div>`).join('');
        var iconHtml = lines.length === 1 
            ? `<div class="station-circle" style="width:14px; height:14px; border: 3px solid ${typeof subwayLines!=='undefined'&&subwayLines[lines[0]]?subwayLines[lines[0]].color:'#333'};"></div>` 
            : `<div class="station-transfer" style="width:${width}px; height:14px;">${dotsHtml}</div>`;
        iconHtml += `<div class="station-name-label ${isMajor}">${item.name}</div>`;

        marker = L.marker([item.lat, item.lng], { 
            icon: L.divIcon({ className: `custom-station ${lineClasses} ${markerClass}`, html: iconHtml, iconSize: [width, 14], iconAnchor: [width/2, 7] }) 
        });
        marker.lineCodes = lines;
        marker.stationName = item.name;
        
        if (typeof subwayStationLayer !== 'undefined') marker.addTo(subwayStationLayer); 
        var lineNames = lines.map(lid => subwayLines[lid] ? subwayLines[lid].name : "").filter(Boolean).join(", ");
        
        var cleanStationNameForCheck = item.name.replace(/역$/, "").trim();
        var isUnopenedSt = lines.every(l => unOpenedLines[l]) || specificUnopenedStations.includes(cleanStationNameForCheck);
        
        marker.bindTooltip(`<b>🚉 ${item.name}</b> ${isUnopenedSt ? '<span style="color:#e65100; font-size:10px; font-weight:bold;">(🚧 미개통/공사중)</span>' : ''}<br><span style="font-size:11px; color:#555;">경유: ${lineNames}</span>`, { offset: [0, -10], direction: 'top' });

        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);

            var activeLineCode = marker.selectedLineCode || lines[0];
            if (!lines.includes(activeLineCode)) activeLineCode = lines[0];

            var lineObj = (typeof subwayLines !== 'undefined' && subwayLines[activeLineCode]) 
                ? subwayLines[activeLineCode] 
                : { name: activeLineCode + "호선", color: "#0077DD" };
            var mainColor = lineObj.color;
            var shortBadgeTxt = activeLineCode.replace("1B", "1지").replace("2B", "2지").replace("7B", "7지").replace("B", "빈효").replace("R1", "일반").replace("H1", "고속").replace("c", "창전").replace("y", "청엽");

            var adj = getAdjacentStations(item, activeLineCode);
            var cleanCurName = item.name.replace(/역$/, '');
            var prevName = adj.prev ? adj.prev.name.replace(/역$/, '') : "시종착";
            var nextName = adj.next ? adj.next.name.replace(/역$/, '') : "시종착";

            var prevClickAttr = adj.prev ? `onclick="window.jumpToStation('${adj.prev.name}')" style="cursor:pointer;"` : `style="opacity:0.6; cursor:default;"`;
            var nextClickAttr = adj.next ? `onclick="window.jumpToStation('${adj.next.name}')" style="cursor:pointer;"` : `style="opacity:0.6; cursor:default;"`;

            var otherLines = lines.filter(l => l !== activeLineCode);
            var transferRowHtml = "";
            if (otherLines.length > 0) {
                var badges = otherLines.map(function(lid) {
                    var lInfo = (typeof subwayLines !== 'undefined' && subwayLines[lid]) ? subwayLines[lid] : { name: lid, color: "#666" };
                    var uTag = unOpenedLines[lid] ? " (미개통)" : "";
                    return `<span onclick="window.switchStationPopupLine('${item.name}', '${lid}')" title="클릭 시 ${lInfo.name} 기준으로 전환" style="background:${lInfo.color}; color:#fff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:bold; cursor:pointer; display:inline-block; margin-right:4px; box-shadow:0 1px 2px rgba(0,0,0,0.2);">${lInfo.name}${uTag}</span>`;
                }).join('');
                transferRowHtml = `
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: bold; color: #222; width: 48px; flex-shrink: 0;">환승역</span>
                    <div style="flex: 1;">${badges}</div>
                </div>`;
            }

            var addrObj = resolveFullAddress(item.lat, item.lng);
            var prefix = (addrObj.province === "덕빈북도") ? "078" : "079";
            var stCodeNum = 610 + (Math.abs(Math.round(item.lat)) % 89);
            var stTailNum = 1000 + (Math.abs(Math.round(item.lng)) % 8999);
            var stationPhone = item.phone || `${prefix}-${stCodeNum}-${stTailNum}`;
            var lostCenterPhone = `${prefix}-611-1122`;

            var ttInfo = subwayTimetableDB[activeLineCode] || subwayTimetableDB["B"];
            var offsetObj = getStationTimeOffset(item.name, activeLineCode);
            var stFirstTrain = shiftTimeText(ttInfo.firstTrain, Math.min(offsetObj.upShift, offsetObj.dnShift));
            var stLastTrain = shiftTimeText(ttInfo.lastTrain, Math.max(offsetObj.upShift, offsetObj.dnShift));

            var trainStatusHtml = "";
            if (isUnopenedSt) {
                trainStatusHtml = `<span style="color:#e65100; font-weight:bold;">🚧 미개통 (공사 및 계획중)</span> <span style="color:#666;">(여객 영업을 하지 않는 역입니다.)</span>`;
            } else if (unOpenedLines[activeLineCode]) {
                trainStatusHtml = `<span style="color:#e65100; font-weight:bold;">${unOpenedLines[activeLineCode].badge}</span> <span style="color:#666;">(${unOpenedLines[activeLineCode].status})</span>`;
            } else {
                var now = new Date();
                var curMin = now.getHours() * 60 + now.getMinutes();
                var fParts = (stFirstTrain || "05:15").split(":");
                var firstMin = parseInt(fParts[0], 10) * 60 + parseInt(fParts[1], 10);
                var lastMin = (ttInfo.lastMin || (24 * 60 + 25)) + Math.max(offsetObj.upShift, offsetObj.dnShift);
                var isTrainRunning = false;
                if (lastMin > 24 * 60) {
                    var pastMidnight = lastMin - 24 * 60;
                    isTrainRunning = (curMin >= firstMin || curMin <= pastMidnight);
                } else {
                    isTrainRunning = (curMin >= firstMin && curMin <= lastMin);
                }
                trainStatusHtml = isTrainRunning 
                    ? `<span style="color:#009000; font-weight:bold;">🟢 정상 운행 중</span> <span style="color:#555;">(첫차 ${stFirstTrain} · 막차 ${stLastTrain})</span><br><span style="font-size:11px; color:#0077DD;">⚡ ${ttInfo.intervalSummary}</span>`
                    : `<span style="color:#ff5252; font-weight:bold;">🔴 영업 종료 (심야 정차)</span> <span style="color:#555;">(첫차 ${stFirstTrain} · 막차 ${stLastTrain})</span><br><span style="font-size:11px; color:#666;">⚡ ${ttInfo.intervalSummary}</span>`;
            }

            var mascotName = lineMascots[activeLineCode] ? ` · 마스코트: <b>${lineMascots[activeLineCode]}</b>` : "";
            var wikiUrl = `${HYOBIN_WIKI_BASE}${encodeURIComponent(item.name)}.html`;

            var exportStData = encodeURIComponent(JSON.stringify({
                name: item.name, type: "station", typeName: `${lineObj.name} 철도역`, province: addrObj.province, gugun: addrObj.gugun, admin: addrObj.admin, legal: addrObj.legal, jibunSub: addrObj.jibunSub,
                bunji: addrObj.bunji, zip: addrObj.zip, address: addrObj.roadAddress, phone: stationPhone, hours: `${stFirstTrain} ~ ${stLastTrain}`,
                rating: "4.6", reviews: 85,
                image: `이미지/${item.name}.webp`, desc: `효빈도시철도 ${lineNames} 정차역입니다. 역사가 쾌적하고 환승 및 이동 동선이 편리합니다. (${ttInfo.intervalSummary})`, lat: item.lat, lng: item.lng
            }));

            var safeStName = item.name.replace(/'/g, "\\'");

            var popupHtml = `
                <div style="width: 345px; font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; text-align: left; padding: 4px 2px;">
                    <div style="position: relative; display: flex; align-items: center; justify-content: space-between; background: ${mainColor}; height: 34px; border-radius: 17px; padding: 0 12px; color: #fff; font-size: 11.5px; font-weight: bold; margin: 10px 0 16px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.18);">
                        <div ${prevClickAttr} title="이전역 이동" style="flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 45px;">
                            &lt; ${prevName}
                        </div>
                        <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: #fff; border: 3.5px solid ${mainColor}; border-radius: 24px; padding: 4px 14px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap; z-index: 2;">
                            <span style="background: ${mainColor}; color: #fff; border-radius: 50%; min-width: 20px; height: 20px; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 900;">${shortBadgeTxt}</span>
                            <span style="color: #111; font-size: 15px; font-weight: 900; letter-spacing: -0.5px;">${cleanCurName}</span>
                        </div>
                        <div ${nextClickAttr} title="다음역 이동" style="flex: 1; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 45px;">
                            ${nextName} &gt;
                        </div>
                    </div>

                    <div style="padding: 2px 6px; font-size: 12px; color: #333; line-height: 1.6;">
                        ${transferRowHtml}

                        <div style="font-size: 11.5px; background: #f8f9fa; padding: 6px 8px; border-radius: 5px; margin-bottom: 6px; border: 1px solid #eee;">
                            🕒 ${trainStatusHtml}<br>
                            📍 <span style="color:#444;">${addrObj.roadAddress} (${addrObj.jibunSub})${mascotName}</span>
                        </div>

                        <div style="font-size: 11.5px; color: #555; margin-bottom: 6px; white-space: nowrap;">
                            대표번호 <span style="color: #009000; font-weight: bold;">${stationPhone}</span>
                            <span style="color: #ddd; margin: 0 6px;">|</span>
                            유실물센터 <span style="color: #009000; font-weight: bold;">${lostCenterPhone}</span>
                        </div>

                        <div style="font-size: 12px; margin-bottom: 10px;">
                            <a href="javascript:void(0);" onclick="window.openStationTimetableWindow('${safeStName}', '${activeLineCode}')" style="color: #d32f2f; text-decoration: none; font-weight: bold;">🕒 역별시간표(새창)</a>
                            <span style="color: #ccc; margin: 0 4px;">·</span>
                            <a href="javascript:void(0);" onclick="window.openDetailWindow('${exportStData}')" style="color: #258fff; text-decoration: none; font-weight: 500;">상세보기</a>
                            <span style="color: #ccc; margin: 0 4px;">·</span>
                            <a href="${wikiUrl}" target="_blank" style="color: #0077DD; text-decoration: none; font-weight: bold;">📖 효빈위키</a>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 4px 2px 4px;">
                        <div style="display: flex; flex: 1; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; background: #fff; height: 34px;">
                            <button onclick="alert('${safeStName}이(가) 즐겨찾기에 등록되었습니다.')" title="즐겨찾기" style="flex: 1; border: none; border-right: 1px solid #eee; background: transparent; cursor: pointer; font-size: 14px; color: #555;">🔖</button>
                            <button onclick="window.openStationTimetableWindow('${safeStName}', '${activeLineCode}')" title="시간표 새창 열기" style="flex: 1.5; border: none; background: #fff8e1; cursor: pointer; font-size: 12px; font-weight: bold; color: #e65100;">🕒 시간표 보기</button>
                        </div>
                        <button onclick="alert('${safeStName}(으)로 길찾기를 시작합니다.')" style="background: #258fff; color: #fff; border: none; border-radius: 4px; height: 34px; padding: 0 16px; font-size: 12.5px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            ↱ 길찾기
                        </button>
                    </div>
                </div>
            `;
            L.popup({ maxWidth: 365, minWidth: 345 }).setLatLng(e.latlng).setContent(popupHtml).openOn(map);
        });

    // [2] 버스 정류장 마커
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

    // [3] 일반 시설 마커
    } else {
        marker = L.marker([item.lat, item.lng], { 
            icon: typeof createFacilityCustomIcon === 'function' ? createFacilityCustomIcon(item.type, item.color, size, item.name) : new L.Icon.Default() 
        });
        var targetGroupName = groupMap[item.type] || "normal";
        
        marker.subCategory = item.type;
        marker.parentGroupLayer = catLayers[targetGroupName] || catLayers.normal;
        marker.addTo(marker.parentGroupLayer);
        if (item.type === 'cvs' && typeof cvsLayer !== 'undefined') marker.addTo(cvsLayer);
        
        var typeName100 = categoryNames100[item.type] || "일반시설";
        marker.bindTooltip(`<b>${item.name || ""}</b> <span style="font-size:11px; color:#666;">(${typeName100})</span>`, { offset: [0, -20], direction: 'top' });

        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            
            var typeName = categoryNames100[item.type] || "일반시설";
            var addrObj = resolveFullAddress(item.lat, item.lng);

            var prefix = (addrObj.province === "덕빈북도") ? "078" : "079";
            var areaCodeNum = "2" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            if (addrObj.gugun.includes("탄성군")) areaCodeNum = "1" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.admin.includes("중수") || addrObj.legal.includes("중수")) areaCodeNum = "3" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.gugun.includes("남구")) areaCodeNum = "4" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.admin.includes("고송") || addrObj.legal.includes("고송")) areaCodeNum = "5" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.gugun.includes("서구")) areaCodeNum = "6" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.gugun.includes("청엽구")) areaCodeNum = "7" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.gugun.includes("창전구")) areaCodeNum = "8" + String(10 + (Math.abs(Math.round(item.lat)) % 88));
            else if (addrObj.gugun.includes("안천구")) areaCodeNum = "9" + String(10 + (Math.abs(Math.round(item.lat)) % 88));

            var tailNum = String(1000 + (Math.abs(Math.round(item.lng)) % 8999));
            var placePhone = item.phone ? item.phone : `${prefix}-${areaCodeNum}-${tailNum}`;
            var rating = item.rating || (4.1 + (item.name.length % 9) * 0.1).toFixed(1); 
            var ratingCount = (item.name.length * 3) + 2;
            var reviews = item.reviews || (item.name.length * 9 + 5);

            var parsedRating = Math.round(parseFloat(rating));
            if (parsedRating > 5) parsedRating = 5;
            if (parsedRating < 0) parsedRating = 0;
            var starDisplay = "★".repeat(parsedRating) + "☆".repeat(5 - parsedRating);

            var opStatus = getSmartOperatingStatus(item.type, item.name, item.hours);
            var placeImg = getSmartFacilityImage(item.name, item.image);
            
            // ★ [핵심 해결!] 사용자가 직접 입력한 리뷰(desc)가 없더라도 무조건 자동 리뷰 생성 엔진을 돌려서 띄움!
            var placeDesc = (item.desc && item.desc.trim() !== "") 
                ? item.desc 
                : generateAutoReview(rating, item.type, item.name);
                
            var wikiUrl = `${HYOBIN_WIKI_BASE}${encodeURIComponent(item.name)}.html`;

            var exportData = encodeURIComponent(JSON.stringify({
                name: item.name, type: item.type, typeName: typeName, province: addrObj.province, gugun: addrObj.gugun, admin: addrObj.admin, legal: addrObj.legal, jibunSub: addrObj.jibunSub, bunji: addrObj.bunji, zip: addrObj.zip, address: addrObj.roadAddress, phone: placePhone, hours: opStatus.hours, rating: rating, reviews: reviews, image: placeImg, desc: placeDesc, lat: item.lat, lng: item.lng
            }));

            var cardId = "place-card-" + Math.random().toString(36).substring(2, 9);
            var safeName = item.name.replace(/'/g, "\\'");

            var popupContent = `
                <div id="${cardId}" style="width: 325px; font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; text-align: left; padding: 2px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1; padding-right: 10px;">
                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; flex-wrap: wrap;">
                                <span style="font-size: 16px; font-weight: 700; color: #222; letter-spacing: -0.5px;">${item.name}</span>
                                <span style="font-size: 11px; color: #fff; background: ${item.color || '#333'}; padding: 1px 6px; border-radius: 4px; font-weight: bold;">${typeName}</span>
                            </div>
                            <div style="font-size: 12px; margin-bottom: 4px;">
                                <span style="color: #ff5252; font-weight: bold;">${rating}</span>
                                <span style="color: #ff5252; font-size: 11px; letter-spacing: -1px;">${starDisplay}</span>
                                <span style="color: #888;">(${ratingCount}건)</span>
                                <span style="color: #ddd; margin: 0 3px;">|</span>
                                <span style="color: #888;">리뷰 ${reviews}</span>
                            </div>
                            <div style="font-size: 12px; margin-bottom: 6px; background:#f4f8ff; padding:4px 6px; border-radius:4px;">🕒 ${opStatus.badge} · <span style="color:#444;">${opStatus.hours}</span></div>
                            <div style="font-size: 12.5px; color: #222; font-weight: 500; line-height: 1.4;">📍 ${addrObj.roadAddress}</div>
                            <div style="font-size: 11.5px; color: #666; margin-top: 2px;">(우) ${addrObj.zip} &nbsp;(지번) ${addrObj.jibunSub} ${addrObj.bunji}</div>
                            
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; background: #f8f9fa; padding: 4px 6px; border-radius: 4px; border: 1px solid #eee;">
                                <span style="font-size: 12.5px; color: #009000; font-weight: bold;">📞 ${placePhone}</span>
                                <button onclick="openPlaceEditModal('${safeName}', ${item.lat}, ${item.lng}, '${cardId}')" style="background: #333; color: #fff; border: none; padding: 3px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: bold;">✏️ 수정</button>
                            </div>

                            <div style="margin-top:6px; font-size:11.5px; background:#fff8e1; border:1px solid #ffe082; padding:5px 7px; border-radius:4px; color:#333; line-height:1.4;">
                                💬 <b>방문자 리뷰:</b> ${placeDesc}
                            </div>

                            <div style="margin-top: 6px; font-size: 12px; display:flex; gap:8px;">
                                <a href="javascript:void(0);" onclick="window.openDetailWindow('${exportData}')" style="color: #258fff; text-decoration: none; font-weight: bold;">상세페이지 &gt;</a>
                                <span style="color:#ccc;">|</span>
                                <a href="${wikiUrl}" target="_blank" style="color: #0077DD; text-decoration: none; font-weight: bold;">📖 효빈위키 &gt;</a>
                            </div>
                        </div>
                        <div style="width: 68px; height: 68px; flex-shrink: 0; border-radius: 4px; overflow: hidden; border: 1px solid #eee; background: #f8f9fa; margin-top: 4px;">
                            <img src="${placeImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2268%22 height=%2268%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23f1f3f5%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2211%22 fill=%22%23adb5bd%22 text-anchor=%22middle%22 dy=%22.3em%22>이미지</text></svg>'">
                        </div>
                    </div>
                    
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
            L.popup({ maxWidth: 350, minWidth: 325 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
        });
    }

    marker.myColor = item.color; 
    if (typeof activeMarkers !== 'undefined') activeMarkers.push(marker);
}

// =========================================================
// 100대 세부 카테고리 휠 선택박스 조작 시
// =========================================================
window.filterBy100SubCategory = function(selectedType) {
    if (typeof activeMarkers === 'undefined') return;
    subCatFilterLayer.clearLayers();

    if (selectedType === "NONE") {
        activeMarkers.forEach(function(m) {
            if (!m.subCategory || !m.parentGroupLayer) return;
            if (!m.parentGroupLayer.hasLayer(m)) m.parentGroupLayer.addLayer(m);
        });
        return;
    }

    if (selectedType === "ALL") {
        activeMarkers.forEach(function(m) {
            if (!m.subCategory) return;
            subCatFilterLayer.addLayer(m);
        });
        return;
    }

    activeMarkers.forEach(function(m) {
        if (!m.subCategory) return;
        if (m.subCategory === selectedType) {
            subCatFilterLayer.addLayer(m);
        } else if (m.parentGroupLayer && m.parentGroupLayer.hasLayer(m)) {
            m.parentGroupLayer.removeLayer(m);
        }
    });
};

setTimeout(function() {
    var counts = {};
    var totalNormal = 0;
    if (typeof activeMarkers !== 'undefined') {
        activeMarkers.forEach(function(m) {
            if (m.subCategory) {
                counts[m.subCategory] = (counts[m.subCategory] || 0) + 1;
                totalNormal++;
            }
        });
    }

    var sortedKeys = Object.keys(categoryNames100).sort(function(a, b) {
        return categoryNames100[a].localeCompare(categoryNames100[b], 'ko');
    });

    var optionsHtml = `
        <option value="NONE" selected style="font-weight:bold; color:#555; padding:4px;">🚫 세부 필터 끄기 (우측 체크박스 기준)</option>
        <option value="ALL" style="font-weight:bold; color:#0077DD; padding:4px;">🌐 전체 시설 마커 모두 켜기 (${totalNormal}개)</option>
    `;
    sortedKeys.forEach(function(k) {
        var cnt = counts[k] || 0;
        if (cnt > 0) {
            optionsHtml += `<option value="${k}" style="padding:4px; border-bottom:1px solid #f4f4f4; font-weight:500;">▪ ${categoryNames100[k]} (${cnt})</option>`;
        }
    });
    sortedKeys.forEach(function(k) {
        var cnt = counts[k] || 0;
        if (cnt === 0) {
            optionsHtml += `<option value="${k}" style="padding:4px; color:#aaa;">▫ ${categoryNames100[k]} (0)</option>`;
        }
    });

    var filterBoxHtml = `
        <div id="subcat-100-filter-wrap" style="background:#fff; border:2px solid #0077DD; border-radius:6px; padding:8px; margin-bottom:10px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
            <div style="font-size:12.5px; font-weight:900; color:#0077DD; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                <span>🔎 100대 세부 카테고리 필터</span>
                <button onclick="document.getElementById('subcat-100-wheel-select').value='NONE'; window.filterBy100SubCategory('NONE');" style="font-size:10px; padding:2px 6px; cursor:pointer; background:#eef6ff; border:1px solid #0077DD; color:#0077DD; border-radius:3px; font-weight:bold;">초기화</button>
            </div>
            <input type="text" id="subcat-100-search" placeholder="업종 키워드 빠른 검색 (예: 초등학교, 편의점)..." style="width:100%; padding:5px 7px; font-size:11.5px; border:1px solid #ccc; border-radius:4px; margin-bottom:6px; box-sizing:border-box;">
            <select id="subcat-100-wheel-select" size="8" onchange="window.filterBy100SubCategory(this.value)" style="width:100%; font-size:12px; border:1px solid #bbb; border-radius:4px; padding:2px; outline:none; overflow-y:scroll; cursor:pointer; background:#fafafa;">
                ${optionsHtml}
            </select>
        </div>
    `;

    var tabLayer = document.getElementById('tab-layer');
    if (tabLayer && !document.getElementById('subcat-100-filter-wrap')) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = filterBoxHtml;
        tabLayer.insertBefore(wrapper.firstElementChild, tabLayer.firstChild);

        var selEl = document.getElementById('subcat-100-wheel-select');
        if (selEl) {
            selEl.addEventListener('wheel', function(ev) { ev.stopPropagation(); }, { passive: true });
        }
        var searchEl = document.getElementById('subcat-100-search');
        if (searchEl && selEl) {
            searchEl.addEventListener('input', function() {
                var kw = this.value.trim().toLowerCase();
                Array.from(selEl.options).forEach(function(opt) {
                    if (opt.value === "NONE" || opt.value === "ALL") { opt.style.display = ""; return; }
                    opt.style.display = opt.text.toLowerCase().includes(kw) ? "" : "none";
                });
            });
        }
    }
}, 600);

// =========================================================
// 8. 데이터 영구 저장 및 정류장/장소 수정 모달 관리
// =========================================================
var searchHighlightLayer = null;
var isSubwayMode = false;
var savedLayerState = [];

map.on('overlayadd', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });
map.on('overlayremove', function() { if(typeof isDistrictAreaMode !== 'undefined' && isDistrictAreaMode) updateDistrictAreaLabels(); });

setTimeout(function() {
    var existingContainer = document.querySelector('.leaflet-control-layers');
    if (existingContainer && !document.getElementById('export-code-btn')) {
        var exportBtn = document.createElement('button');
        exportBtn.id = 'export-code-btn';
        exportBtn.innerHTML = '💾 코드로 영구 저장하기';
        exportBtn.style.cssText = 'width:100%; margin-top:8px; padding:8px 0; cursor:pointer; border:none; background:#0077DD; color:white; border-radius:4px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);';

        exportBtn.onclick = function(e) {
            e.stopPropagation(); e.preventDefault();
            var markers = JSON.parse(localStorage.getItem('hyobin_markers')) || [];
            var lines = JSON.parse(localStorage.getItem('hyobin_lines')) || [];
            if (markers.length === 0 && lines.length === 0) { alert("새로 추가하거나 수정한 데이터가 없습니다."); return; }
            
            var resultText = "/* 아래 코드를 복사해서 데이터 파일 가장 아래 빈 공간에 붙여넣으세요! */\n\n";
            if (markers.length > 0) resultText += "// 📍 수동 저장/수정된 마커 데이터\nvar myExportedMarkers = " + JSON.stringify(markers, null, 4) + ";\n\n";
            if (lines.length > 0) resultText += "// 🛤️ 수동 저장된 도로/선 데이터\nvar myExportedLines = " + JSON.stringify(lines, null, 4) + ";\n\n";
            
            var modal = document.createElement('div');
            modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; padding:20px; box-shadow:0 0 20px rgba(0,0,0,0.5); z-index:9999; width:600px; height:500px; display:flex; flex-direction:column; border-radius:8px;';
            modal.innerHTML = `
                <h3 style="margin-top:0; color:#0077DD; border-bottom:2px solid #0077DD; padding-bottom:10px;">💾 데이터 코드 추출기</h3>
                <textarea id="code-textarea" style="flex:1; width:100%; font-family:monospace; font-size:12px; padding:10px; border:1px solid #ccc; resize:none;" readonly></textarea>
                <div style="text-align:right; margin-top:15px;">
                    <button id="copy-export-btn" style="padding:10px 20px; background:#333; color:#fff; border:none; cursor:pointer; border-radius:4px; font-weight:bold; margin-right:5px;">전체 복사</button>
                    <button id="close-export-btn" style="padding:10px 20px; background:#ddd; border:none; cursor:pointer; border-radius:4px; font-weight:bold;">닫기</button>
                </div>`;
            document.body.appendChild(modal);
            document.getElementById('code-textarea').value = resultText;
            document.getElementById('copy-export-btn').onclick = function() { document.getElementById('code-textarea').select(); document.execCommand('copy'); alert("코드가 복사되었습니다!"); };
            document.getElementById('close-export-btn').onclick = function() { document.body.removeChild(modal); };
        };
        existingContainer.appendChild(exportBtn);
    }
}, 500);

var currentEditMarker = null; var currentEditItem = null;
function scanNearbyBuses(lat, lng, margin = 150) {
    var foundBuses = [];
    function safeGetDist(px, py, x1, y1, x2, y2) {
        var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1, dot = A * C + B * D, len_sq = C * C + D * D, param = (len_sq != 0) ? dot / len_sq : -1;
        var xx = (param < 0) ? x1 : (param > 1) ? x2 : x1 + param * C;
        var yy = (param < 0) ? y1 : (param > 1) ? y2 : y1 + param * D;
        return Math.sqrt(Math.pow(px - xx, 2) + Math.pow(py - yy, 2));
    }
    if (typeof processedBusData !== 'undefined') {
        processedBusData.forEach(bus => {
            if (!bus.points) return;
            for (var i = 0; i < bus.points.length - 1; i++) {
                if (safeGetDist(lat, lng, bus.points[i][0], bus.points[i][1], bus.points[i+1][0], bus.points[i+1][1]) <= margin) {
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
        var scannedBuses = scanNearbyBuses(item.lat, item.lng, 150);
        var mergedSet = new Set(item.allPassingBuses);
        scannedBuses.forEach(b => mergedSet.add(b)); item.allPassingBuses = Array.from(mergedSet);

        var routesHtml = item.allPassingBuses.map(busStr => {
            var isChecked = (item.passingBuses && item.passingBuses.includes(busStr)) ? "checked" : "";
            return `<label style="display:block; margin-bottom:5px; cursor:pointer; padding:3px;"><input type="checkbox" class="edit-bus-route-chk" value='${busStr}' ${isChecked}> ${busStr}</label>`;
        }).join('');
        var routesContainer = document.getElementById('edit-bus-stop-routes');
        if (routesContainer) routesContainer.innerHTML = routesHtml || "<span style='color:#999;'>지나가는 노선이 없습니다.</span>";
        document.getElementById('bus-stop-edit-modal').style.display = 'flex';
    } catch (error) { console.error(error); }
}

function saveBusStopEdit() {
    var newName = document.getElementById('edit-bus-stop-name').value.trim();
    if (!newName) return;
    if (!newName.endsWith('정류장')) newName += " 정류장";
    var checkedRoutes = [];
    document.querySelectorAll('.edit-bus-route-chk:checked').forEach(chk => checkedRoutes.push(chk.value));
    currentEditItem.name = newName; currentEditItem.passingBuses = checkedRoutes;
    currentEditItem.isManual = true; currentEditMarker.isManualMarker = true; 
    localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
    var busListHtml = checkedRoutes.length > 0 ? checkedRoutes.join("<br>") : "<span style='color:#EE0022; font-weight:bold;'>🚫 모든 노선 무정차 통과</span>";
    currentEditMarker.setTooltipContent(`<b>🚏 ${currentEditItem.name}</b><br><hr style="margin:3px 0; border-top:1px dashed #ccc;"><div style="font-size:11px; line-height:1.5;">${busListHtml}</div>`);
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

// ★ 전체 마커 단 1회 등록 실행
allLandmarks.forEach(function(item) {
    addMarkerToMap(item);
});

// ★ [수정] 별점을 먼저 받고, 그 점수를 바탕으로 리뷰를 자동 완성해주는 모달 함수
function openPlaceEditModal(name, lat, lng, cardId) {
    var existingItem = (typeof myLandmarks !== 'undefined' && myLandmarks.find(m => (m.name === name || m.origName === name) && Math.abs(m.lat - lat) <= 5)) ||
                       (typeof allLandmarks !== 'undefined' && allLandmarks.find(m => m.name === name && Math.abs(m.lat - lat) <= 5));
    
    var defaultName = existingItem ? existingItem.name : name;
    var defaultType = (existingItem && existingItem.type) ? existingItem.type : classify100Category(defaultName);
    var defaultHours = (existingItem && existingItem.hours) ? existingItem.hours : getSmartOperatingStatus(defaultType, defaultName).hours;
    var defaultPhone = (existingItem && existingItem.phone) ? existingItem.phone : "";
    var defaultImg = (existingItem && existingItem.image) ? existingItem.image : getSmartFacilityImage(defaultName);
    var defaultDesc = (existingItem && existingItem.desc) ? existingItem.desc : "";
    
    var defaultRating = (existingItem && existingItem.rating) ? existingItem.rating : (4.1 + (defaultName.length % 9) * 0.1).toFixed(1);
    var defaultReviews = (existingItem && existingItem.reviews) ? existingItem.reviews : (defaultName.length * 9 + 5);

    var newName = prompt("🏷️ [1/8] 시설 이름을 수정하세요:", defaultName); if (newName === null) return;
    var newType = prompt("📂 [2/8] 세부 카테고리 코드 (예: community_center, university, cvs 등):", defaultType); if (newType === null) return;
    var newHours = prompt("🕒 [3/8] 운영시간을 직접 지정하세요 (예: 09:00 ~ 24:20):", defaultHours); if (newHours === null) return;
    var newPhone = prompt("📞 [4/8] 전화번호를 입력하세요:", defaultPhone); if (newPhone === null) return;
    var newImg = prompt("🖼️ [5/8] 이미지 경로를 입력하세요:", defaultImg); if (newImg === null) return;
    
    var newRating = prompt("⭐ [6/8] 별점을 수정하세요 (예: 4.5):", defaultRating); if (newRating === null) return;
    var newReviews = prompt("💬 [7/8] 리뷰 개수를 수정하세요 (숫자만 입력, 예: 125):", defaultReviews); if (newReviews === null) return;

    // ★ 별점을 바꾸면 그 새로운 별점에 맞는 자동 리뷰를 추천해 줌!
    var autoReviewTxt = generateAutoReview(newRating, newType.trim(), newName.trim());
    var defaultDescPrompt = (defaultDesc && defaultRating === newRating.trim()) ? defaultDesc : autoReviewTxt;

    var newDesc = prompt("📝 [8/8] 상세 메모나 리뷰를 입력하세요:\n(비워두거나 그대로 확인을 누르면 별점에 맞춘 자동 리뷰가 적용됩니다.)", defaultDescPrompt); 
    if (newDesc === null) return;
    if (newDesc.trim() === "") newDesc = autoReviewTxt;

    if (typeof myLandmarks !== 'undefined') {
        var target = myLandmarks.find(m => (m.name === name || m.origName === name) && Math.abs(m.lat - lat) <= 5);
        if (target) {
            if (!target.origName) target.origName = name;
            target.name = newName.trim();
            target.type = newType.trim();
            target.hours = newHours.trim();
            target.phone = newPhone.trim();
            target.image = newImg.trim();
            target.desc = newDesc.trim();
            target.rating = newRating.trim();   
            target.reviews = newReviews.trim(); 
            target.color = markerColors[target.type] || '#333333';
        } else {
            myLandmarks.push({
                origName: name, 
                name: newName.trim(),
                lat: lat,
                lng: lng,
                type: newType.trim(),
                hours: newHours.trim(),
                phone: newPhone.trim(),
                desc: newDesc.trim(),
                rating: newRating.trim(),       
                reviews: newReviews.trim(),     
                color: markerColors[newType.trim()] || '#333333',
                image: newImg.trim() || getSmartFacilityImage(newName.trim())
            });
        }
        localStorage.setItem('hyobin_markers', JSON.stringify(myLandmarks));
        alert("✨ 자동 리뷰와 함께 수정 내용이 저장되었습니다! 새로고침 후 즉시 반영됩니다.");
        location.reload();
    }
}