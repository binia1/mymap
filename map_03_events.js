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

    function closeModal(id) { document.getElementById(id).style.display = 'none'; tempMarkerData = null; tempClickLatLng = null; }