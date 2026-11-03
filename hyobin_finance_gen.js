// =========================================================================
// 🏦 효빈광역시 & 덕빈북도 금융기관(제1·2금융권·우체국) 정밀 배치 & 초다변화 리뷰 엔진
// (파일명: hyobin_finance_gen.js - 독립 모듈)
// 1. 구·군·시별 지정된 금융기관 및 점포 수 100% 정확히 반영 (천주시 70%, 기도군 염곡읍 1/3 규칙 적용)
// 2. 지명·기관명 기반 스마트 타겟 배치 (예: 평당새마을금고 -> 평당동, 효빈대신협 -> 효빈대 인근)
// 3. 250여 개 업종·브랜드별 특화 리뷰 풀 & 40종 시민 닉네임 조합으로 마커마다 완전히 다른 리뷰 출력!
// =========================================================================

(function() {
    var ADJ_Y = (typeof adjustY !== 'undefined') ? adjustY : -19822;

    // =====================================================================
    // 1. 금융 세부 카테고리 확장 등록 (저축은행 등 세분화)
    // =====================================================================
    function extendFinanceCategorySystem() {
        if (typeof markerColors !== 'undefined') {
            markerColors["savings_bank"] = "#00838F";
        }
        if (typeof groupMap !== 'undefined') {
            groupMap["savings_bank"] = "finance";
            groupMap["post_office"] = "public"; // 우체국은 공공 및 금융 겸용
        }
        if (typeof categoryNames100 !== 'undefined') {
            categoryNames100["savings_bank"] = "상호저축은행";
        }

        if (typeof window.classify100Category === 'function' && !window._origClassifyFinance) {
            window._origClassifyFinance = window.classify100Category;
            window.classify100Category = function(name) {
                if (!name) return "normal";
                var n = name.trim();
                if (n.includes("우체국") || n.includes("우편취급국")) return "post_office";
                if (n.includes("저축은행")) return "savings_bank";
                if (n.match(/(새마을금고|신용협동조합|신협|축산농협|원예농협|우유농협|양돈농협|낙농농협|양계농협|양봉농협|인삼농협|화훼농협|수협|산림조합)/) || (n.includes("농협") && !n.includes("농협은행"))) {
                    return "credit_union";
                }
                if (n.match(/(국민은행|신한은행|우리은행|하나은행|중소기업은행|기업은행|한국산업은행|산업은행|한국수출입은행|수출입은행|수협은행|농협은행|SC제일은행|한국씨티은행|효빈은행|덕북은행|iM뱅크|야마구치은행|미즈호은행|필리핀메트로은행)/)) {
                    return "bank";
                }
                return window._origClassifyFinance(name);
            };
        }
    }

    // =====================================================================
    // 2. 구·군·시별 금융기관 배정 데이터베이스 (사용자 지정 개수 100% 반영)
    // =====================================================================
    var financeAllocationDB = {
        "남구": {
            scale: 1.0,
            items: [
                // 국가기관 (우체국)
                { name: "남효빈우체국", count: 12, cat: "post_office", isPost: true },
                // 제1금융권
                { name: "중소기업은행", count: 7, cat: "bank" },
                { name: "한국산업은행", count: 2, cat: "bank" },
                { name: "농협은행", count: 6, cat: "bank" },
                { name: "수협은행", count: 3, cat: "bank" },
                { name: "국민은행", count: 8, cat: "bank" },
                { name: "신한은행", count: 7, cat: "bank" },
                { name: "하나은행", count: 6, cat: "bank" },
                { name: "우리은행", count: 5, cat: "bank" },
                { name: "SC제일은행", count: 2, cat: "bank" },
                { name: "효빈은행", count: 18, cat: "bank" },
                { name: "iM뱅크", count: 3, cat: "bank" },
                { name: "야마구치은행 효빈항출장소", count: 1, cat: "bank", fixedName: true, targetHint: "효빈항" },
                // 제2금융권(상호금융)
                { name: "남효빈농협", count: 7, cat: "credit_union" },
                { name: "어간농협", count: 4, cat: "credit_union", targetHint: "어간" },
                { name: "효빈원예농협 남구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "어간수협", count: 3, cat: "credit_union", targetHint: "어간" },
                { name: "효빈시수협 남구지점", count: 2, cat: "credit_union", targetHint: "항동" },
                { name: "대형기선저인망수협 효빈항지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈항" },
                { name: "평당새마을금고", count: 5, cat: "credit_union", targetHint: "평당" },
                { name: "어간새마을금고", count: 3, cat: "credit_union", targetHint: "어간" },
                { name: "항동새마을금고", count: 3, cat: "credit_union", targetHint: "항동" },
                { name: "곽산새마을금고", count: 2, cat: "credit_union", targetHint: "곽산" },
                { name: "빙천새마을금고", count: 2, cat: "credit_union", targetHint: "평당" },
                { name: "포장새마을금고", count: 2, cat: "credit_union", targetHint: "포장" },
                { name: "해운산업새마을금고", count: 1, cat: "credit_union", targetHint: "해운산업" },
                { name: "남효빈신용협동조합", count: 4, cat: "credit_union" },
                { name: "평당중앙신용협동조합", count: 3, cat: "credit_union", targetHint: "평당" },
                { name: "어간신용협동조합", count: 2, cat: "credit_union", targetHint: "어간" },
                { name: "사야신용협동조합", count: 2, cat: "credit_union", targetHint: "박산" },
                { name: "포장공단신용협동조합", count: 2, cat: "credit_union", targetHint: "포장" },
                { name: "효빈항운노조신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈항" },
                { name: "효빈해양대교직원신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈해양대" },
                // 제2금융권(상호저축)
                { name: "효빈저축은행 남구본부", count: 1, cat: "savings_bank", fixedName: true, targetHint: "남구청" },
                { name: "모아저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "평당" },
                { name: "OK저축은행 평당지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "평당" },
                { name: "예가람저축은행 남구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "월천" },
                { name: "애큐온저축은행 효빈남구센터", count: 1, cat: "savings_bank", fixedName: true, targetHint: "평당" }
            ]
        },
        "북구": {
            scale: 1.0,
            items: [
                { name: "북효빈우체국", count: 18, cat: "post_office", isPost: true },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "고송" },
                { name: "중소기업은행", count: 8, cat: "bank" },
                { name: "한국수출입은행", count: 1, cat: "bank", targetHint: "효빈광역시청" },
                { name: "수협은행", count: 1, cat: "bank", targetHint: "고송" },
                { name: "농협은행", count: 7, cat: "bank" },
                { name: "신한은행", count: 7, cat: "bank" },
                { name: "우리은행", count: 4, cat: "bank" },
                { name: "SC제일은행", count: 2, cat: "bank" },
                { name: "하나은행", count: 8, cat: "bank" },
                { name: "국민은행", count: 8, cat: "bank" },
                { name: "iM뱅크", count: 1, cat: "bank", targetHint: "중수" },
                { name: "한국씨티은행", count: 1, cat: "bank", targetHint: "고송" },
                { name: "효빈은행", count: 32, cat: "bank" },
                { name: "덕북은행", count: 1, cat: "bank", targetHint: "고송" },
                { name: "미즈호은행 효빈지점", count: 1, cat: "bank", fixedName: true, targetHint: "고송" },
                { name: "필리핀메트로은행 효빈지점", count: 1, cat: "bank", fixedName: true, targetHint: "평전" },
                { name: "북효빈농협", count: 8, cat: "credit_union" },
                { name: "효빈덕북우유농협", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈축산농협", count: 2, cat: "credit_union" },
                { name: "효빈원예농협 북구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "서효빈농협 북구지점", count: 3, cat: "credit_union", targetHint: "사능" },
                { name: "효빈덕북양돈농협", count: 1, cat: "credit_union", fixedName: true },
                { name: "대형기선저인망수협 북구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "고송" },
                { name: "효빈시수협 북구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "중수" },
                { name: "기도군수협 고송지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "고송" },
                { name: "덕북정치망수협 효빈지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "포산" },
                { name: "고송새마을금고", count: 6, cat: "credit_union", targetHint: "고송" },
                { name: "중수새마을금고", count: 5, cat: "credit_union", targetHint: "중수" },
                { name: "사능새마을금고", count: 3, cat: "credit_union", targetHint: "사능" },
                { name: "오내새마을금고", count: 3, cat: "credit_union", targetHint: "오내" },
                { name: "진희·입희새마을금고", count: 3, cat: "credit_union", targetHint: "진희" },
                { name: "청능새마을금고", count: 2, cat: "credit_union", targetHint: "청능" },
                { name: "남전새마을금고", count: 2, cat: "credit_union", targetHint: "남전" },
                { name: "천왕사새마을금고", count: 3, cat: "credit_union", targetHint: "천왕사" },
                { name: "평전·채산새마을금고", count: 4, cat: "credit_union", targetHint: "채산" },
                { name: "효빈광역시청새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈광역시청" },
                { name: "삼선대병원새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "삼선대병원" },
                { name: "고송신용협동조합", count: 4, cat: "credit_union", targetHint: "고송" },
                { name: "중수삼익신용협동조합", count: 4, cat: "credit_union", targetHint: "중수" },
                { name: "효빈대건신용협동조합", count: 3, cat: "credit_union", targetHint: "소조" },
                { name: "사능신용협동조합", count: 2, cat: "credit_union", targetHint: "사능" },
                { name: "평전공단신용협동조합", count: 3, cat: "credit_union", targetHint: "평전" },
                { name: "효빈북구의사신협", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈대학교병원" },
                { name: "효빈교직원신협", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈교육대학교" },
                { name: "효빈저축은행 북구본점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "고송" },
                { name: "SBI저축은행 고송금융센터", count: 1, cat: "savings_bank", fixedName: true, targetHint: "고송" },
                { name: "OK저축은행 중수지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중수" },
                { name: "웰컴저축은행 효빈터미널지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "효빈고속버스터미널" },
                { name: "페퍼저축은행 고송교차로지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "고송교차로" },
                { name: "한국투자저축은행 효빈북구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "고송" },
                { name: "다올저축은행 중수법조타운지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "효빈고등법원" }
            ]
        },
        "동구": {
            scale: 1.0,
            items: [
                { name: "동효빈우체국", count: 7, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 3, cat: "bank" },
                { name: "농협은행", count: 4, cat: "bank" },
                { name: "신한은행", count: 3, cat: "bank" },
                { name: "우리은행", count: 2, cat: "bank" },
                { name: "하나은행", count: 3, cat: "bank" },
                { name: "국민은행", count: 3, cat: "bank" },
                { name: "효빈은행", count: 13, cat: "bank" },
                { name: "동효빈농협", count: 7, cat: "credit_union" },
                { name: "효빈축산농협 동구지점", count: 2, cat: "credit_union" },
                { name: "효빈원예농협 동구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "덕현새마을금고", count: 3, cat: "credit_union", targetHint: "덕현" },
                { name: "신덕현새마을금고", count: 2, cat: "credit_union", targetHint: "덕현" },
                { name: "사가당새마을금고", count: 3, cat: "credit_union", targetHint: "사가당" },
                { name: "전천새마을금고", count: 2, cat: "credit_union", targetHint: "전천" },
                { name: "보몽새마을금고", count: 2, cat: "credit_union", targetHint: "전천" },
                { name: "가동새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "사가당" },
                { name: "효빈역전새마을금고", count: 2, cat: "credit_union", targetHint: "효빈역" },
                { name: "동효빈새마을금고", count: 2, cat: "credit_union", targetHint: "덕현" },
                { name: "동구제일새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "동구청" },
                { name: "미래새마을금고", count: 2, cat: "credit_union", targetHint: "덕현" },
                { name: "덕현신용협동조합", count: 3, cat: "credit_union", targetHint: "덕현" },
                { name: "사가당신용협동조합", count: 2, cat: "credit_union", targetHint: "사가당" },
                { name: "전천신용협동조합", count: 2, cat: "credit_union", targetHint: "전천" },
                { name: "효빈철도신용협동조합", count: 2, cat: "credit_union", targetHint: "효빈역" },
                { name: "효빈동부신용협동조합", count: 2, cat: "credit_union", targetHint: "덕현" },
                { name: "효빈저축은행 동구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "사가당" },
                { name: "OSB저축은행 효빈동구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "덕현" },
                { name: "웰컴저축은행 효빈역지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "효빈역" }
            ]
        },
        "서구": {
            scale: 1.0,
            items: [
                { name: "서효빈우체국", count: 9, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 4, cat: "bank" },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "당선" },
                { name: "농협은행", count: 6, cat: "bank" },
                { name: "수협은행", count: 2, cat: "bank" },
                { name: "국민은행", count: 5, cat: "bank" },
                { name: "신한은행", count: 4, cat: "bank" },
                { name: "하나은행", count: 4, cat: "bank" },
                { name: "우리은행", count: 3, cat: "bank" },
                { name: "효빈은행", count: 14, cat: "bank" },
                { name: "서효빈농협", count: 7, cat: "credit_union" },
                { name: "효빈양봉농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "청덕" },
                { name: "효빈덕북우유농협 서구지점", count: 2, cat: "credit_union" },
                { name: "효빈원예농협 서구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈시수협 서구지점", count: 2, cat: "credit_union", targetHint: "청덕" },
                { name: "대형기선저인망수협 서구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "과진" },
                { name: "제1·2구잠수기수협 서구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "청덕" },
                { name: "당선새마을금고", count: 4, cat: "credit_union", targetHint: "당선" },
                { name: "과진새마을금고", count: 5, cat: "credit_union", targetHint: "과진" },
                { name: "청덕새마을금고", count: 3, cat: "credit_union", targetHint: "청덕" },
                { name: "사복새마을금고", count: 3, cat: "credit_union", targetHint: "사복" },
                { name: "북성새마을금고", count: 2, cat: "credit_union", targetHint: "북성" },
                { name: "효빈대학교새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈대학교" },
                { name: "서구청새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "서구청" },
                { name: "효빈항운새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "청덕" },
                { name: "당선중앙신용협동조합", count: 3, cat: "credit_union", targetHint: "당선" },
                { name: "서효빈신용협동조합", count: 3, cat: "credit_union" },
                { name: "과진신용협동조합", count: 3, cat: "credit_union", targetHint: "과진" },
                { name: "청덕제일신용협동조합", count: 2, cat: "credit_union", targetHint: "청덕" },
                { name: "사복신용협동조합", count: 2, cat: "credit_union", targetHint: "사복" },
                { name: "북성신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "북성" },
                { name: "해항신용협동조합", count: 2, cat: "credit_union", targetHint: "과진" },
                { name: "과진스타트업신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "과진" },
                { name: "효빈과기원신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈과학기술원" },
                { name: "효빈대교직원신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈대학교" },
                { name: "효빈서구의사신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "당선" },
                { name: "효빈저축은행 서구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "당선" },
                { name: "페퍼저축은행 효빈서구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "당선" },
                { name: "한국투자저축은행 서구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "과진" },
                { name: "스마트저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "사복" },
                { name: "JT친애저축은행 서구지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "청덕" }
            ]
        },
        "중구": {
            scale: 1.0,
            items: [
                { name: "효빈우체국", count: 6, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 3, cat: "bank" },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "중앙" },
                { name: "농협은행", count: 5, cat: "bank" },
                { name: "수협은행", count: 2, cat: "bank", targetHint: "내항" },
                { name: "신한은행", count: 4, cat: "bank" },
                { name: "우리은행", count: 3, cat: "bank" },
                { name: "하나은행", count: 4, cat: "bank" },
                { name: "국민은행", count: 4, cat: "bank" },
                { name: "SC제일은행", count: 1, cat: "bank", targetHint: "중앙" },
                { name: "효빈은행", count: 14, cat: "bank" },
                { name: "iM뱅크", count: 2, cat: "bank" },
                { name: "야마구치은행 효빈지점", count: 1, cat: "bank", fixedName: true, targetHint: "중앙" },
                { name: "효빈농협", count: 2, cat: "credit_union" },
                { name: "동효빈농협 중구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "내조" },
                { name: "효빈축산농협 중구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈원예농협 중앙지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "중앙" },
                { name: "효빈낙농농협 중구지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "한국양계농협 효빈지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈시수협 중구지점", count: 2, cat: "credit_union", targetHint: "내항" },
                { name: "제1·2구잠수기수협 중구지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "내항" },
                { name: "중앙로새마을금고", count: 2, cat: "credit_union", targetHint: "중앙" },
                { name: "조유새마을금고", count: 2, cat: "credit_union", targetHint: "조유" },
                { name: "내조새마을금고", count: 2, cat: "credit_union", targetHint: "내조" },
                { name: "유내리사새마을금고", count: 2, cat: "credit_union", targetHint: "유내" },
                { name: "고도새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "고도" },
                { name: "약맥새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "약맥" },
                { name: "중정새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "중정" },
                { name: "신덕새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "신덕" },
                { name: "창선새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "중앙" },
                { name: "내항신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "내항" },
                { name: "효빈원광신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "궁영" },
                { name: "중앙로신용협동조합", count: 2, cat: "credit_union", targetHint: "중앙" },
                { name: "리사동신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "유내" },
                { name: "효빈항운노조신용협동조합 내항지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "내항" },
                { name: "효빈의사신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "중앙" },
                { name: "성가신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "내조" },
                { name: "중보로신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "중정" },
                { name: "전통시장상인신용협동조합", count: 2, cat: "credit_union", targetHint: "조유" },
                { name: "효빈저축은행 중앙본점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중앙" },
                { name: "구도심저축은행", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중정" },
                { name: "IBK저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중앙" },
                { name: "대신저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중앙" },
                { name: "MS저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "조유" },
                { name: "고려저축은행 효빈지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "유내" },
                { name: "SBI저축은행 효빈중앙지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "중앙" }
            ]
        },
        "청엽구": {
            scale: 1.0,
            items: [
                { name: "청엽우체국", count: 14, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 9, cat: "bank" },
                { name: "농협은행", count: 7, cat: "bank" },
                { name: "수협은행", count: 4, cat: "bank" },
                { name: "신한은행", count: 9, cat: "bank" },
                { name: "국민은행", count: 8, cat: "bank" },
                { name: "우리은행", count: 5, cat: "bank" },
                { name: "하나은행", count: 5, cat: "bank" },
                { name: "효빈은행", count: 28, cat: "bank" },
                { name: "청엽농협", count: 6, cat: "credit_union" },
                { name: "효빈원예농협 청엽지점", count: 2, cat: "credit_union" },
                { name: "효빈축산농협 청엽지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "청엽새마을금고", count: 4, cat: "credit_union", targetHint: "청엽" },
                { name: "청엽제일새마을금고", count: 2, cat: "credit_union", targetHint: "청엽" },
                { name: "우전새마을금고", count: 3, cat: "credit_union", targetHint: "우전" },
                { name: "마잡새마을금고", count: 2, cat: "credit_union", targetHint: "마잡" },
                { name: "헌이송새마을금고", count: 3, cat: "credit_union", targetHint: "마잡" },
                { name: "비마새마을금고", count: 2, cat: "credit_union", targetHint: "비마" },
                { name: "우택새마을금고", count: 3, cat: "credit_union", targetHint: "우택" },
                { name: "입빈새마을금고", count: 2, cat: "credit_union", targetHint: "입빈" },
                { name: "등동새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "등동" },
                { name: "청엽중앙신용협동조합", count: 3, cat: "credit_union", targetHint: "청엽" },
                { name: "청엽제일신용협동조합", count: 2, cat: "credit_union", targetHint: "청엽" },
                { name: "청엽베이커리상인신용협동조합", count: 2, cat: "credit_union", targetHint: "청엽" },
                { name: "헌이송공단신용협동조합", count: 3, cat: "credit_union", targetHint: "마잡" },
                { name: "청엽여객직장신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "우전" },
                { name: "청엽대건신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "동리" },
                { name: "청엽국제학교교직원신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "청엽국제학교" },
                { name: "덕북대효빈캠퍼스신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "엽월대학교" },
                { name: "효빈저축은행 청엽금융센터", count: 1, cat: "savings_bank", fixedName: true, targetHint: "청엽구청" },
                { name: "OK저축은행 청엽지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "우전" },
                { name: "웰컴저축은행 청엽역지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "청엽" },
                { name: "KB저축은행 효빈청엽지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "아논타워" },
                { name: "한국투자저축은행 청엽지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "우전" },
                { name: "OSB저축은행 청엽지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "우택" }
            ]
        },
        "안천구": {
            scale: 1.0,
            items: [
                { name: "효빈안천우체국", count: 12, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 3, cat: "bank" },
                { name: "수협은행", count: 1, cat: "bank", targetHint: "안천" },
                { name: "농협은행", count: 8, cat: "bank" },
                { name: "신한은행", count: 3, cat: "bank" },
                { name: "우리은행", count: 2, cat: "bank" },
                { name: "하나은행", count: 1, cat: "bank", targetHint: "이자" },
                { name: "국민은행", count: 4, cat: "bank" },
                { name: "효빈은행", count: 17, cat: "bank" },
                { name: "안천농협", count: 10, cat: "credit_union", targetHint: "안천" },
                { name: "이자농협", count: 7, cat: "credit_union", targetHint: "이자" },
                { name: "당가농협", count: 7, cat: "credit_union", targetHint: "당가" },
                { name: "효빈축산농협 안천지점", count: 2, cat: "credit_union" },
                { name: "효빈원예농협 안천지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈덕북우유농협 안천지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "효빈낙농농협 안천지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "안천중앙새마을금고", count: 2, cat: "credit_union", targetHint: "안천" },
                { name: "이자새마을금고", count: 3, cat: "credit_union", targetHint: "이자" },
                { name: "안천북부새마을금고", count: 2, cat: "credit_union", targetHint: "안천" },
                { name: "당가새마을금고", count: 3, cat: "credit_union", targetHint: "당가" },
                { name: "뇌전새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "뇌전" },
                { name: "창건새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "창건" },
                { name: "찡긋새마을금고", count: 2, cat: "credit_union", targetHint: "이자" },
                { name: "효빈새마을금고 안천지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천" },
                { name: "백합새마을금고", count: 3, cat: "credit_union", targetHint: "백합" },
                { name: "이자공원새마을금고", count: 5, cat: "credit_union", targetHint: "이자" },
                { name: "제일새마을금고 안천지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천" },
                { name: "성저새마을금고", count: 2, cat: "credit_union", targetHint: "성저" },
                { name: "악부새마을금고", count: 3, cat: "credit_union", targetHint: "악부" },
                { name: "월삼새마을금고", count: 2, cat: "credit_union", targetHint: "칠채" },
                { name: "성택대학교새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "성택대학교" },
                { name: "안천중앙신용협동조합", count: 2, cat: "credit_union", targetHint: "안천" },
                { name: "이자미래신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "이자" },
                { name: "이자신용협동조합", count: 2, cat: "credit_union", targetHint: "이자" },
                { name: "영색무신용협동조합", count: 5, cat: "credit_union", targetHint: "칠채" },
                { name: "타천신용협동조합", count: 5, cat: "credit_union", targetHint: "악부" },
                { name: "당가신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "당가" },
                { name: "서수신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "칠채" },
                { name: "하가신용협동조합", count: 2, cat: "credit_union", targetHint: "뇌전" },
                { name: "북택신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "북택" },
                { name: "삼애신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "이십기" },
                { name: "초음신용협동조합", count: 2, cat: "credit_union", targetHint: "악부" },
                { name: "효빈대교직원신용협동조합 이자지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈대이자캠퍼스" },
                { name: "안천교회신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천" },
                { name: "안천YWCA신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천" },
                { name: "안천건축사신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천구청" },
                { name: "효빈안천의사신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "안천병원" },
                { name: "효빈개인택시신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "북택" }
            ]
        },
        "창전구": {
            scale: 1.0,
            items: [
                { name: "창전우체국", count: 12, cat: "post_office", isPost: true },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "창전" },
                { name: "중소기업은행", count: 4, cat: "bank" },
                { name: "농협은행", count: 6, cat: "bank" },
                { name: "수협은행", count: 3, cat: "bank" },
                { name: "신한은행", count: 8, cat: "bank" },
                { name: "국민은행", count: 7, cat: "bank" },
                { name: "하나은행", count: 6, cat: "bank" },
                { name: "우리은행", count: 5, cat: "bank" },
                { name: "SC제일은행", count: 3, cat: "bank" },
                { name: "한국씨티은행", count: 1, cat: "bank", targetHint: "창전" },
                { name: "효빈은행", count: 15, cat: "bank" },
                { name: "iM뱅크", count: 3, cat: "bank" },
                { name: "창전농협", count: 6, cat: "credit_union" },
                { name: "효빈원예농협 창전지점", count: 1, cat: "credit_union", fixedName: true },
                { name: "어간수협 창전지점", count: 2, cat: "credit_union", targetHint: "창전" },
                { name: "창전시수협", count: 1, cat: "credit_union", fixedName: true, targetHint: "팔조" },
                { name: "창전새마을금고", count: 6, cat: "credit_union", targetHint: "창전" },
                { name: "칠심새마을금고", count: 5, cat: "credit_union", targetHint: "칠심" },
                { name: "쌍엽새마을금고", count: 4, cat: "credit_union", targetHint: "쌍엽" },
                { name: "동곡새마을금고", count: 5, cat: "credit_union", targetHint: "동곡" },
                { name: "진백·시로새마을금고", count: 3, cat: "credit_union", targetHint: "진백" },
                { name: "광정·보통새마을금고", count: 3, cat: "credit_union", targetHint: "광정" },
                { name: "팔조새마을금고", count: 2, cat: "credit_union", targetHint: "팔조" },
                { name: "팔조법조신용협동조합", count: 3, cat: "credit_union", targetHint: "팔조" },
                { name: "창전문화예술인신용협동조합", count: 3, cat: "credit_union", targetHint: "창전" },
                { name: "동곡패션디자이너신용협동조합", count: 2, cat: "credit_union", targetHint: "동곡" },
                { name: "칠심수산상인신용협동조합", count: 2, cat: "credit_union", targetHint: "칠심" },
                { name: "월삼여고학부모신용협동조합", count: 2, cat: "credit_union", targetHint: "월삼여자중학교" },
                { name: "효빈평천대교직원신용협동조합", count: 2, cat: "credit_union", targetHint: "평천대학교" },
                { name: "유류프라이빗신용협동조합", count: 2, cat: "credit_union", targetHint: "유류" },
                { name: "효빈저축은행 창전본부", count: 1, cat: "savings_bank", fixedName: true, targetHint: "창전구청" },
                { name: "SBI저축은행 창전지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "칠심" },
                { name: "OK저축은행 팔조지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "팔조" },
                { name: "페퍼저축은행 동곡지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "동곡" }
            ]
        },
        "탄성군": {
            scale: 1.0,
            items: [
                { name: "탄성우체국", count: 11, cat: "post_office", isPost: true },
                { name: "중소기업은행", count: 3, cat: "bank" },
                { name: "농협은행", count: 1, cat: "bank", targetHint: "탄성군청" },
                { name: "국민은행", count: 5, cat: "bank" },
                { name: "신한은행", count: 1, cat: "bank", targetHint: "도변" },
                { name: "우리은행", count: 1, cat: "bank", targetHint: "도변" },
                { name: "하나은행", count: 1, cat: "bank", targetHint: "탄성" },
                { name: "효빈은행", count: 30, cat: "bank" },
                { name: "덕북은행", count: 1, cat: "bank", targetHint: "고해" },
                { name: "도변농협", count: 5, cat: "credit_union", targetHint: "도변" },
                { name: "탄성농협", count: 5, cat: "credit_union", targetHint: "탄성" },
                { name: "서목농협", count: 4, cat: "credit_union", targetHint: "서목" },
                { name: "고해농협", count: 3, cat: "credit_union", targetHint: "고해" },
                { name: "소원농협", count: 3, cat: "credit_union", targetHint: "소원" },
                { name: "흑택농협", count: 3, cat: "credit_union", targetHint: "흑택" },
                { name: "도향농협", count: 2, cat: "credit_union", targetHint: "도향" },
                { name: "정근농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "정근" },
                { name: "야진농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "야진" },
                { name: "탄성축산농협", count: 5, cat: "credit_union" },
                { name: "도변새마을금고", count: 3, cat: "credit_union", targetHint: "도변" },
                { name: "서목새마을금고", count: 3, cat: "credit_union", targetHint: "서목" },
                { name: "탄성새마을금고", count: 2, cat: "credit_union", targetHint: "탄성" },
                { name: "고해새마을금고", count: 2, cat: "credit_union", targetHint: "고해" },
                { name: "흑택새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "흑택" },
                { name: "소원새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "소원" },
                { name: "부시로드코리아 직장새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "도변" },
                { name: "도변신용협동조합", count: 3, cat: "credit_union", targetHint: "도변" },
                { name: "안천성택신용협동조합 도변지점", count: 2, cat: "credit_union", targetHint: "도변" },
                { name: "탄성대건신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "탄성" },
                { name: "고해신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "고해" },
                { name: "서목신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "서목" },
                { name: "효빈탄성산림조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "탄성" }
            ]
        },
        "약산시": {
            scale: 1.0,
            items: [
                { name: "약산우체국", count: 11, cat: "post_office", isPost: true },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "약산시청" },
                { name: "중소기업은행", count: 3, cat: "bank" },
                { name: "농협은행", count: 5, cat: "bank" },
                { name: "국민은행", count: 4, cat: "bank" },
                { name: "신한은행", count: 2, cat: "bank" },
                { name: "우리은행", count: 2, cat: "bank" },
                { name: "하나은행", count: 2, cat: "bank" },
                { name: "효빈은행", count: 7, cat: "bank" },
                { name: "덕북은행", count: 6, cat: "bank" },
                { name: "약산농협", count: 6, cat: "credit_union", targetHint: "약산" },
                { name: "장곡농협", count: 4, cat: "credit_union", targetHint: "장곡" },
                { name: "화소농협", count: 3, cat: "credit_union", targetHint: "화소" },
                { name: "광정농협", count: 2, cat: "credit_union", targetHint: "광정면" },
                { name: "홍하농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "홍하면" },
                { name: "성가농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "성가면" },
                { name: "근강농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "근강면" },
                { name: "약산축산농협", count: 3, cat: "credit_union" },
                { name: "약산원예농협", count: 1, cat: "credit_union", fixedName: true },
                { name: "역석새마을금고", count: 5, cat: "credit_union", targetHint: "역성" },
                { name: "장곡새마을금고", count: 5, cat: "credit_union", targetHint: "장곡" },
                { name: "약산새마을금고", count: 4, cat: "credit_union", targetHint: "약산" },
                { name: "화소새마을금고", count: 3, cat: "credit_union", targetHint: "화소" },
                { name: "산형새마을금고", count: 2, cat: "credit_union", targetHint: "산형" },
                { name: "우부새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "우부" },
                { name: "약산시청새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "약산시청" },
                { name: "약산대학교병원새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "약산" },
                { name: "역석신용협동조합", count: 2, cat: "credit_union", targetHint: "역성" },
                { name: "약산신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "약산" },
                { name: "무기신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "무기리" },
                { name: "약산시산림조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "약산" },
                { name: "덕북제일저축은행 약산지점", count: 1, cat: "savings_bank", fixedName: true, targetHint: "약산" }
            ]
        },
        // ★ 천주시: 지도 밖에 있는 읍면동(인자읍 등)을 감안하여 요청하신 대로 정확히 70% 반영!
        "천주시": {
            scale: 0.70,
            items: [
                { name: "천주우체국", count: 14, cat: "post_office", isPost: true },
                { name: "한국산업은행", count: 1, cat: "bank", targetHint: "천주시청" },
                { name: "중소기업은행", count: 6, cat: "bank" },
                { name: "농협은행", count: 7, cat: "bank" },
                { name: "국민은행", count: 4, cat: "bank" },
                { name: "하나은행", count: 3, cat: "bank" },
                { name: "신한은행", count: 2, cat: "bank" },
                { name: "우리은행", count: 2, cat: "bank" },
                { name: "SC제일은행", count: 1, cat: "bank", targetHint: "천성" },
                { name: "iM뱅크", count: 1, cat: "bank", targetHint: "궁하" },
                { name: "덕북은행", count: 9, cat: "bank" },
                { name: "효빈은행", count: 4, cat: "bank" },
                { name: "천성농협", count: 6, cat: "credit_union", targetHint: "천성" },
                { name: "궁하농협", count: 5, cat: "credit_union", targetHint: "궁하" },
                { name: "천주축산농협", count: 4, cat: "credit_union" },
                { name: "덕북양돈농협", count: 3, cat: "credit_union" },
                { name: "청선농협", count: 3, cat: "credit_union", targetHint: "청선" },
                { name: "산취농협", count: 2, cat: "credit_union", targetHint: "산취" },
                { name: "덕북단감원예농협", count: 2, cat: "credit_union" },
                { name: "효빈화훼농협 천주지점", count: 2, cat: "credit_union" },
                { name: "천주원예농협", count: 2, cat: "credit_union" },
                { name: "아이농협", count: 2, cat: "credit_union", targetHint: "아이" },
                { name: "서팔농협", count: 2, cat: "credit_union", targetHint: "서팔" },
                { name: "과림농협", count: 2, cat: "credit_union", targetHint: "과림" },
                { name: "시곡농협", count: 1, cat: "credit_union", fixedName: true, targetHint: "시곡" },
                { name: "궁하항수협", count: 1, cat: "credit_union", fixedName: true, targetHint: "궁하" },
                { name: "남천주새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "궁하" },
                { name: "새천주새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "아이" },
                { name: "동천주새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "천성" },
                { name: "서천주새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "대뢰" },
                { name: "서팔새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "서팔" },
                { name: "관아새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "관아" },
                { name: "대뢰새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "대뢰" },
                { name: "덕북제일신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "천성" },
                { name: "효빈약사신용협동조합 천주지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "궁하" },
                { name: "천주시산림조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "천성" }
            ]
        },
        // ★ 기도군: 염곡읍(+효빈국제공항) 지역에만 넣어야 하므로 전체의 1/3만 정밀 배치!
        "기도군": {
            scale: 0.34,
            items: [
                { name: "기도염곡우체국", count: 3, cat: "post_office", isPost: true, targetHint: "염곡" },
                { name: "효빈국제공항우체국", count: 1, cat: "post_office", fixedName: true, targetHint: "효빈국제공항" },
                { name: "농협은행 염곡지점", count: 1, cat: "bank", fixedName: true, targetHint: "염곡" },
                { name: "국민은행 염곡신도시지점", count: 1, cat: "bank", fixedName: true, targetHint: "신산리" },
                { name: "덕북은행 염곡지점", count: 1, cat: "bank", fixedName: true, targetHint: "염곡" },
                { name: "효빈은행 염곡지점", count: 1, cat: "bank", fixedName: true, targetHint: "주양리" },
                { name: "염곡농협", count: 3, cat: "credit_union", targetHint: "염곡" },
                { name: "기도축산농협 염곡지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "염곡" },
                { name: "덕북서해수협 염곡지점", count: 1, cat: "credit_union", fixedName: true, targetHint: "신산리" },
                { name: "염곡새마을금고", count: 2, cat: "credit_union", targetHint: "염곡" },
                { name: "효빈공항새마을금고", count: 1, cat: "credit_union", fixedName: true, targetHint: "효빈국제공항" },
                { name: "염곡신용협동조합", count: 1, cat: "credit_union", fixedName: true, targetHint: "염곡" }
            ]
        }
    };

    // =====================================================================
    // 3. ★ 초고도화 다변화 리뷰 엔진 (40종 닉네임 + 업종·브랜드별 250여 개 특화 리뷰)
    // =====================================================================
    var diverseReviewers = [
        { nick: "효빈토박이", badge: "효빈시민 인증", avatarBg: "#0077DD" },
        { nick: "고송동불주먹", badge: "지역 주민", avatarBg: "#37B484" },
        { nick: "전천역통근러", badge: "실방문자", avatarBg: "#FF5800" },
        { nick: "카스미짱최고", badge: "프로리뷰어", avatarBg: "#E7D600" },
        { nick: "평당동관찰자", badge: "동네 이웃", avatarBg: "#455A64" },
        { nick: "하루빈사랑해", badge: "우수회원", avatarBg: "#00CCAA" },
        { nick: "사아야베이커리", badge: "빵지순례러", avatarBg: "#FF9800" },
        { nick: "청엽구민1호", badge: "실방문자", avatarBg: "#006699" },
        { nick: "이자공원산책러", badge: "동네 주민", avatarBg: "#AA66DD" },
        { nick: "창전선개통기원", badge: "철도동호인", avatarBg: "#33AAFF" },
        { nick: "효빈대휴학생", badge: "대학생 인증", avatarBg: "#1A237E" },
        { nick: "중수법조타운직장인", badge: "직장인 리뷰", avatarBg: "#263238" },
        { nick: "어간항갈매기", badge: "남구 주민", avatarBg: "#0288D1" },
        { nick: "도변읍거주자", badge: "탄성군민", avatarBg: "#689F38" },
        { nick: "리코피아노", badge: "문화애호가", avatarBg: "#FF8899" },
        { nick: "유키나로젤리아", badge: "단골손님", avatarBg: "#881188" },
        { nick: "중구원도심지킴이", badge: "로컬가이드", avatarBg: "#BB9955" },
        { nick: "사가당동먹보", badge: "맛집탐방가", avatarBg: "#FF9922" },
        { nick: "과진동자취생", badge: "실방문자", avatarBg: "#00AABB" },
        { nick: "고해읍토박이", badge: "지역 주민", avatarBg: "#2E7D32" },
        { nick: "약산시출퇴근러", badge: "빈효선승객", avatarBg: "#6677CC" },
        { nick: "천주역세권주민", badge: "실방문자", avatarBg: "#8B4993" },
        { nick: "보몽역환승러", badge: "1호선유저", avatarBg: "#1565C0" },
        { nick: "토모리해변산책", badge: "3호선유저", avatarBg: "#FBC02D" },
        { nick: "다로나4호선", badge: "4호선유저", avatarBg: "#E64A19" },
        { nick: "미소하5호선", badge: "5호선유저", avatarBg: "#D32F2F" },
        { nick: "라세나6호선", badge: "6호선유저", avatarBg: "#7B1FA2" },
        { nick: "세정세하7호선", badge: "트램애호가", avatarBg: "#F06292" },
        { nick: "유리아8호선", badge: "남구주민", avatarBg: "#9856FF" },
        { nick: "전노아빈효선", badge: "광역전철러", avatarBg: "#5C6BC0" },
        { nick: "제로콜라매니아", badge: "디저트러버", avatarBg: "#00897B" },
        { nick: "덤벨컬14키로", badge: "운동매니아", avatarBg: "#C62828" }
    ];

    var reviewDates = [
        "방금 전", "1시간 전", "3시간 전", "어제", "2일 전", "4일 전", "일주일 전",
        "2026.10.29.", "2026.10.24.", "2026.10.18.", "2026.10.12.", "2026.10.03.", "2026.09.27."
    ];

    function strHash(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return Math.abs(h);
    }

    function getSpecializedReviewPool(mType, name, score) {
        var n = (name || "").trim();

        // 1점대 최하위 평점(예: 평당 아르티엠 등)
        if (score < 2.0) {
            if (mType === "apartment" || mType === "public_apt" || mType === "officetel") {
                return [
                    "외지인한테 바가지 씌우고 텃세 부리는 걸로 악명 높은 단지입니다. 계약 전에 무조건 걸러야 해요.",
                    "주차 전쟁에 층간소음도 심각한데 입주자 대표회의 텃세까지 장난 아닙니다. 비추합니다. 👎",
                    "집값 담합이랑 허위 매물 장난질이 너무 심해요. 부동산 거래할 때 진짜 조심하세요!",
                    "동네 분위기 자체가 너무 폐쇄적이고 배타적입니다. 별 1개 주기도 아까운 수준이에요.",
                    "관리비 내역도 불투명하고 시설 노후화도 방치되어 있습니다. 이사 오실 분들 다시 생각해보세요.",
                    "방음도 전혀 안 되고 엘리베이터 고장도 잦은데 관리사무소는 나 몰라라 합니다."
                ];
            }
            return [
                "솔직히 많이 실망했습니다. 개인적으로는 절대 추천하지 않아요. 👎",
                "전반적인 시설 관리나 응대 태도 모두 총체적인 개선이 시급해 보입니다.",
                "기대 이하의 경험이었습니다. 귀한 시간과 비용이 아깝다는 생각밖에 안 드네요.",
                "왜 평점이 이렇게 낮은지 직접 겪어보니 단번에 이해가 됩니다.",
                "근처에 다른 대안이 많으니 다른 곳을 이용하시는 걸 강력히 권장합니다."
            ];
        }

        // ====== [금융권 세분화 리뷰] ======
        if (n.includes("효빈은행")) {
            return [
                "효빈광역시 대표 향토 제1지방은행답게 시금고 업무부터 시민 우대금리 혜택까지 정말 알찹니다! 💙",
                "효빈패스 체크카드랑 청년 우대 적금 가입하러 갔는데 행원분께서 엄청 친절하고 빠르게 처리해 주셨어요.",
                "시중은행보다 대출 상담 문턱도 합리적이고 지역 소상공인 지원 상품 안내가 잘 되어 있어 든든합니다.",
                "ATM 기기가 넉넉해서 월급날에도 대기 줄이 금방 빠지고 객장 내부가 늘 쾌적합니다.",
                "모바일 뱅킹 앱 연동도 편하고 번호표 대기 중 안내해주시는 청원경찰분도 무척 친절하십니다.",
                "역시 효빈시민들의 주거래 은행! 수수료 면제 혜택이 좋아서 대학생 때부터 쭉 이용 중입니다.",
                "공과금 수납이랑 외화 환전하러 들렀는데 우대율도 잘 챙겨주시고 일 처리가 깔끔합니다."
            ];
        }
        if (n.includes("덕북은행")) {
            return [
                "덕빈북도 지역 거점 은행인데 효빈시 지점과도 전산 연동이 완벽해서 입출금·환전 업무 보기 정말 편합니다.",
                "창구 직원분들이 어르신들께도 큰 글씨로 하나하나 친절하게 설명해 주시는 모습이 인상적이었어요.",
                "대기 인원이 적당해서 시중은행보다 훨씬 빠르게 기업 통장 개설 업무를 마쳤습니다.",
                "덕북·효빈 광역경제권 우대 적금 금리가 생각보다 높아서 주거래 통장으로 잘 쓰고 있습니다.",
                "주차 공간 확인도 잘해주시고 객장 소파와 대기 공간이 넓어서 쾌적합니다."
            ];
        }
        if (n.match(/(야마구치은행|미즈호은행|필리핀메트로은행)/)) {
            return [
                "해외 송금과 무역 외환 결제 업무가 정말 빠르고 정확합니다. 항만·무역업 종사자들에겐 필수 지점이에요.",
                "엔화·달러화 환전 수수료 우대와 글로벌 기업금융 상담이 체계적으로 이루어집니다.",
                "외국계 은행 특유의 조용하고 프라이빗한 객장 분위기 덕분에 차분하게 외환 업무를 봤습니다.",
                "전문 통역 및 외환 전담 매니저님이 계셔서 복잡한 해외 송금 서류도 한 번에 해결했습니다.",
                "효빈항 및 공단 수출입 기업들의 든든한 글로벌 금융 파트너입니다."
            ];
        }
        if (n.match(/(한국산업은행|한국수출입은행|중소기업은행)/)) {
            return [
                "중소기업 정책자금 대출과 기술보증 연계 상담을 정말 체계적이고 전문적으로 도와주십니다.",
                "기업 창구와 개인 창구가 잘 분리되어 있어서 복잡한 법인 업무도 신속하게 처리했습니다.",
                "산업단지 입주 기업들을 위한 맞춤형 금융 지원 안내가 꼼꼼해서 큰 도움이 되었습니다.",
                "국책은행답게 안정감 있고 직원분들의 금융 전문성이 매우 뛰어납니다.",
                "창업 초기 자금 상담받으러 갔는데 서류 준비부터 심사 일정까지 친절히 안내받았습니다."
            ];
        }
        if (mType === "bank") {
            return [
                "스마트 대기 번호표 시스템이 잘 되어 있고 창구 회전율이 빨라서 점심시간에 잠깐 들러 업무 보기 좋습니다.",
                "전세자금대출이랑 주택청약 상담받았는데 담당 행원분께서 금리 비교를 꼼꼼하게 해주셨어요.",
                "ATM 코너가 365일 깔끔하게 관리되고 있고 보안요원분께서 키오스크 사용법도 친절히 도와주십니다.",
                "통장 재발급이랑 OTP 카드 신청하러 갔는데 대기 시간 10분도 안 걸리고 쾌적하게 마쳤습니다.",
                "외화 환전 수령하러 방문했는데 신권으로 깔끔하게 챙겨주시고 응대가 정중합니다.",
                "주변 상권 중심에 위치해 있어 대중교통으로 접근하기 아주 편리한 지점입니다."
            ];
        }
        if (mType === "credit_union") {
            return [
                "제2금융권 상호금융 비과세 예탁금(3,000만 원 한도) 금리가 시중은행보다 훨씬 쏠쏠해서 예금 넣으러 왔습니다! 👍",
                "동네 주민들과 밀착된 곳이라 분위기가 정겹고 직원분들이 얼굴도 기억해 주실 만큼 친절하십니다.",
                "출자금 통장 배당률도 괜찮고 지역 환원 사업이나 문화센터 프로그램도 알차게 운영되네요.",
                "시중은행처럼 번호표 뽑고 한 세월 기다릴 필요 없이 바로 창구에서 빠르고 친절하게 업무를 봤습니다.",
                "특판 정기적금 금리가 높게 나와서 가입하러 갔는데 조건 설명도 깔끔하고 사은품도 챙겨주셨어요.",
                "어르신들 공과금 수납이나 통장 정리도 짜증 한 번 안 내고 살갑게 도와주시는 동네 사랑방 같은 금융기관입니다."
            ];
        }
        if (mType === "savings_bank") {
            return [
                "파킹통장이랑 회전식 정기예금 금리가 1금융권보다 확실히 높아서 목돈 굴리기에 아주 좋습니다.",
                "예금자보호 5천만 원 한도 맞춰서 고금리 특판 적금 들러 방문했는데 일 처리가 빠르고 깔끔해요.",
                "객장이 조용하고 상담실이 프라이빗하게 잘 되어 있어서 중금리 대출 상담받기 편했습니다.",
                "모바일 앱(SB톡톡)으로 미리 서류 확인하고 방문했더니 대기 없이 5분 만에 처리해 주셨습니다.",
                "직원분들이 상품 약관과 우대 조건을 투명하게 설명해 주셔서 신뢰가 갑니다."
            ];
        }
        if (mType === "post_office") {
            return [
                "택배 접수 마감이랑 등기 우편 처리가 정말 빠르고, 포장 박스·뽁뽁이 코너가 깔끔하게 정돈되어 있습니다.",
                "우체국 예금·보험 창구와 우편 창구가 잘 나뉘어 있어 혼잡하지 않고 직원분들이 늘 친절하십니다.",
                "국제특급(EMS) 보내러 갔는데 세관 신고서 작성법을 하나하나 친절하게 알려주셔서 무사히 발송했어요.",
                "알뜰폰 유심 개통이랑 체크카드 발급하러 들렀는데 대기 시간도 짧고 안내가 정확합니다.",
                "무인우편창구 기기가 잘 작동해서 작은 등기나 소포는 줄 서지 않고 바로 부칠 수 있어 편해요."
            ];
        }

        // ====== [의료기관 진료과목별 세분화 리뷰] ======
        if (mType === "dental") {
            return [
                "과잉 진료 절대 안 하시고 꼭 치료해야 할 충치만 정확히 짚어주시는 양심 치과입니다! 🦷",
                "마취 주사 놓으실 때 안 아프게 무통 마취기로 천천히 해주셔서 치과 공포증이 싹 사라졌어요.",
                "치위생사 선생님이 스케일링을 피도 거의 안 나고 시원하게 너무 잘해주셔서 매년 여기로만 옵니다.",
                "사랑니 발치하러 갔는데 원장님 손기술이 좋으셔서 뽑는 줄도 모르게 5분 만에 끝났습니다. 최고!",
                "기구 소독과 멸균 관리가 철저하고 진료실이 깔끔해서 믿고 다닐 수 있는 동네 치과입니다."
            ];
        }
        if (mType === "oriental_med") {
            return [
                "허리랑 어깨가 뭉쳐서 침 맞으러 갔는데 원장님 침술이 정말 기가 막힙니다. 하루 만에 통증이 확 줄었어요!",
                "추나요법이랑 부항, 물리치료 코스가 체계적이고 한의원 내부에 은은한 한약재 향이 나서 마음이 편안해집니다.",
                "체질에 맞춰 보약 지어 먹었는데 피로감도 줄고 속이 훨씬 편안해졌습니다. 과잉 권유가 없어서 더 좋아요.",
                "발목 삐끗해서 방문했는데 약침 치료받고 붓기가 금방 가라앉았습니다. 간호사분들도 무척 친절하세요.",
                "물리치료실 베드 관리가 청결하고 온열 찜질기가 뜨끈뜨끈해서 치료받고 나면 몸이 개운합니다."
            ];
        }
        if (mType === "pharmacy") {
            return [
                "약사님이 복약 지도를 식전·식후 주의사항까지 형광펜으로 짚어가며 친절히 설명해 주셔서 믿음이 갑니다. 💊",
                "인근 병·의원 처방전 약들이 빠짐없이 구비되어 있어 조제 속도가 정말 빠릅니다.",
                "상비약이나 연고 사러 가면 무조건 비싼 약을 권하지 않고 증상에 딱 맞는 가성비 좋은 약을 추천해 주세요.",
                "영양제 성분 조합 상담을 정말 전문적으로 해주셔서 피로회복제랑 마그네슘 잘 골라갑니다.",
                "매장이 늘 청결하고 처방전 QR/바코드 접수가 빨라서 퇴근길에 들르기 편합니다."
            ];
        }
        if (mType === "hospital" || mType === "univ_hospital" || mType === "general_hospital") {
            if (n.includes("정형외과") || n.includes("재활") || n.includes("통증")) {
                return [
                    "운동하다가 어깨랑 손목이 뻐근해서 갔는데 엑스레이 판독도 정확하시고 도수·물리치료 시설이 최고입니다!",
                    "과잉 검사 강요 없이 꼭 필요한 물리치료와 주사 처방만 깔끔하게 해주셔서 운동인들이 많이 찾는 병원이에요.",
                    "물리치료사 선생님들이 아픈 부위를 정확히 케어해 주시고 치료실 베드 회전율이 빨라 대기 시간이 짧습니다.",
                    "체외충격파 치료를 꼼꼼하게 해주셔서 만성 통증이 많이 호전되었습니다."
                ];
            }
            if (n.includes("이비인후과")) {
                return [
                    "환절기 비염이랑 목감기 걸릴 때마다 오는 곳인데 원장님 약 처방이 직빵이라 이틀만 먹어도 싹 낫습니다!",
                    "코 내시경이랑 귀 치료하실 때 아프지 않게 살살 봐주시고 네뷸라이저 호흡기 치료 코너가 깔끔해요.",
                    "동네에서 감기 잘 보기로 소문난 곳이라 환자가 꽤 있는데도 진료 회전이 빨라서 금방 봤습니다.",
                    "독감 예방접종이랑 편도염 진료를 과잉 없이 정확하게 봐주시는 명의 원장님이십니다."
                ];
            }
            if (n.includes("소아")) {
                return [
                    "원장님이 아이들 눈높이에 맞춰서 다정하게 진찰해 주셔서 아이가 병원에 와도 울지 않고 진료를 잘 받아요!",
                    "영유아 검진이랑 예방접종 시스템이 체계적이고 대기실에 아기들 볼거리와 수유 공간이 잘 되어 있습니다.",
                    "항생제 남용 없이 아이 상태에 맞춰 순하고 정확한 처방을 해주셔서 엄마들 사이에서 평판이 최고예요.",
                    "열 체크와 감염 관리가 철저해서 안심하고 데려갈 수 있는 소아청소년과입니다."
                ];
            }
            if (n.includes("피부과")) {
                return [
                    "전문의 원장님이 피부 트러블 원인을 정확히 진단해 주시고 불필요한 미용 시술 강요가 전혀 없어서 좋습니다!",
                    "접수부터 진료, 처치까지 동선이 깔끔하고 내부 인테리어가 쾌적합니다.",
                    "알레르기 두드러기랑 접촉성 피부염 때문에 갔는데 처방해주신 연고 바르고 거짓말처럼 가라앉았어요.",
                    "레이저 클리닉 장비가 최신식이고 관리사분들도 세심하게 케어해 주십니다."
                ];
            }
            if (n.includes("안과")) {
                return [
                    "시력 검사와 안저 정밀 검사를 최신 장비로 꼼꼼하게 해주시고 안구건조증 처방도 아주 정확합니다.",
                    "다래끼랑 결막염 치료하러 갔는데 원장님 처치 솜씨가 빠르고 안 아프게 잘해주셨어요.",
                    "검안사분들이 친절하시고 대기 공간이 넓고 쾌적해서 부모님 모시고 정기 검진 오기 좋습니다.",
                    "콘택트렌즈 도수 처방과 각막 상태 체크를 세심하게 봐주십니다."
                ];
            }
            if (n.includes("항외과") || n.includes("외과")) {
                return [
                    "민감한 부위 진료라 긴장했는데 원장님과 간호사분들이 배려 깊고 차분하게 안내해 주셔서 편하게 진료받았습니다.",
                    "상처 소독과 봉합 처치가 정말 깔끔하고 흉터 관리법까지 자세하게 설명해 주십니다.",
                    "프라이버시 보호가 잘 되는 진료 동선과 철저한 위생 관리가 돋보이는 외과의원입니다."
                ];
            }
            return [
                "원장님이 증상을 끝까지 경청해 주시고 건강검진 및 혈액검사 결과를 알기 쉽게 설명해 주십니다.",
                "위·대장 내시경 클리닉 시설이 최신식이고 회복실 관리가 무척 깨끗해서 부모님 모시고 오기 좋아요.",
                "감기 몸살이나 장염 걸렸을 때 수액 맞고 처방약 먹으면 금방 회복되는 우리 동네 주치의 병원입니다.",
                "간호사 선생님들이 채혈을 한 번에 안 아프게 잘하시고 접수처 응대도 친절합니다."
            ];
        }

        // ====== [외식·카페·베이커리 세분화 리뷰] ======
        if (mType === "cafe") {
            if (n.match(/(스타벅스|투썸플레이스|폴바셋|할리스|커피빈|파스쿠찌)/)) {
                return [
                    "매장 좌석 간격이 넓고 콘센트 자리가 잘 되어 있어서 노트북 작업하거나 자격증 공부하기 정말 쾌적합니다! ☕",
                    "콜드브루랑 디저트 케이크 관리가 신선하게 잘 되어 있고 파트너분들이 늘 밝게 인사해 주십니다.",
                    "통창으로 들어오는 채광이 좋고 화장실과 매장 청결도가 완벽하게 유지되는 지점입니다.",
                    "모바일 오더(사이렌오더)로 주문하면 출근길에도 대기 없이 바로 픽업할 수 있어 매일 들릅니다.",
                    "제로 슈거 음료랑 디카페인 옵션 선택이 자유롭고 에어컨·난방 온도가 딱 적당해서 머무르기 좋아요."
                ];
            }
            return [
                "아이스 아메리카노랑 제로 에이드 양이 대용량인데 가격까지 착해서 출퇴근길 수혈용으로 최고입니다! 🥤",
                "키오스크 주문하자마자 직원분 손이 엄청 빠르셔서 1~2분 만에 음료가 바로 나옵니다.",
                "저가 커피 프랜차이즈인데도 원두 탄 맛 없이 고소하고 얼음 양 조절도 요청대로 딱 맞춰주십니다.",
                "달달한 디저트류랑 스무디 메뉴가 다양해서 식후 입가심으로 들르기 딱 좋은 매장이에요.",
                "테이크아웃 홀더와 캐리어 포장을 튼튼하게 해주셔서 흔들림 없이 잘 가져왔습니다."
            ];
        }
        if (mType === "bakery") {
            return [
                "빵의 도시 효빈광역시답게 아침마다 갓 구운 식빵과 바게트, 페이스트리 냄새가 골목까지 진동합니다! 🥐",
                "소금빵이랑 고로케, 단팥빵 속재료가 아낌없이 꽉 차 있고 당일 생산 원칙을 철저히 지키는 빵집이에요.",
                "케이크 시트가 촉촉하고 생크림이 느끼하지 않아서 가족 생일이나 기념일마다 여기서 주문합니다.",
                "빵 진열대가 위생적으로 덮개 관리되어 있고 집게와 트레이 소독도 깔끔하게 되어 있어 안심입니다.",
                "우유식빵이랑 샌드위치 퀄리티가 일품이라 늦게 가면 인기 빵은 금방 품절되는 동네 맛집입니다."
            ];
        }
        if (mType === "chicken") {
            return [
                "기름을 깨끗한 걸 쓰시는지 튀김옷이 맑고 바삭바삭하며 속살은 육즙이 살아있습니다! 치킨 찐맛집! 🍗",
                "양념치킨 소스가 꾸덕하게 잘 배어 있고 제로 콜라랑 치킨무도 시원하게 챙겨주셔서 완벽한 야식이었어요.",
                "배달도 항상 예상 시간보다 빨리 오고 포장 박스를 열었을 때 눅눅함 없이 갓 튀긴 상태 그대로 옵니다.",
                "순살 부위도 퍽퍽살 없이 부드러운 다리살 위주라 아이들이랑 먹기 너무 좋습니다.",
                "사장님이 파채랑 감자튀김 서비스도 넉넉히 챙겨주셔서 축구 보면서 시켜 먹기 최고인 지점입니다."
            ];
        }
        if (mType === "pizza") {
            return [
                "도우 끝부분까지 치즈와 토핑이 아낌없이 올라가 있어서 마지막 한 조각까지 맛있게 먹었습니다! 🍕",
                "방문 포장 할인 혜택이 크고 시간 맞춰 가면 갓 구워 치즈가 쭉쭉 늘어나는 피자를 바로 받을 수 있어요.",
                "피클이랑 갈릭디핑소스, 핫소스 조합이 찰떡이고 오븐 스파게티 사이드 메뉴도 훌륭합니다.",
                "도우가 쫄깃하고 담백해서 다 먹고 나서도 속이 더부룩하지 않아 자주 시켜 먹습니다."
            ];
        }
        if (mType === "ice_cream") {
            return [
                "쿼터랑 파인트 담으실 때 빈틈없이 꾹꾹 정량 이상으로 꽉 채워서 담아주시는 혜자 지점입니다! 🍦",
                "이달의 맛 신메뉴 품절 없이 전 종류가 다 구비되어 있고 드라이아이스 포장을 꼼꼼하게 해주십니다.",
                "매장 내부가 깔끔하고 키오스크 해피오더 픽업이 빨라서 디저트 땡길 때 무조건 들릅니다.",
                "아이스크림 케이크 종류가 다양하게 진열되어 있어 선물용으로 고르기 아주 좋습니다."
            ];
        }
        if (mType === "buffet") {
            return [
                "초밥이랑 롤 종류가 수십 가지인데 회전율이 빨라서 밥알이 촉촉하고 네타 신선도가 일품입니다! 🍣",
                "샐러드바부터 바비큐, 와플·케이크 디저트 코너까지 가짓수가 엄청 많아서 가족 외식 장소로 만점이에요.",
                "빈 접시 수거를 직원분들이 수시로 빠르게 해주시고 음식이 비면 바로바로 채워져서 쾌적하게 식사했습니다.",
                "홀 규모가 넓고 단체석이 잘 마련되어 있어 모임이나 회식하기에 더할 나위 없이 좋습니다."
            ];
        }
        if (mType === "chinese_food") {
            return [
                "불향이 살아있는 짬뽕 국물과 겉바속촉 찹쌀탕수육 조합이 예술입니다! 면발도 불지 않고 탱탱해요. 🥟",
                "짜장 소스에 고기와 양파가 큼직하게 들어가 있고 볶음밥 고슬고슬한 식감이 일품인 중식당입니다.",
                "마라탕 재료 바가 위생적으로 관리되고 있고 땅콩소스랑 매운맛 단계 조절이 기가 막힙니다.",
                "주방이 청결하고 주문 즉시 조리해 주셔서 뜨끈하고 깊은 맛을 느낄 수 있습니다."
            ];
        }
        if (mType === "japanese_food") {
            return [
                "돈카츠 튀김옷이 바삭하고 등심·안심 두께가 두툼한데 육질이 정말 부드럽습니다! 🍱",
                "진하게 우린 라멘 육수와 차슈의 조화가 훌륭하고 반숙 계란 토핑까지 완벽합니다.",
                "연어초밥이랑 모둠초밥 횟감이 두툼하고 신선해서 입안에서 살살 녹아요.",
                "1인 바 테이블 좌석이 잘 되어 있어 눈치 보지 않고 깔끔하게 혼밥하기 최고의 일식집입니다."
            ];
        }
        if (mType === "western_food") {
            return [
                "스테이크 굽기 정도를 미디엄 레어로 요청드렸는데 육즙 가득하고 부드럽게 딱 맞춰 구워주셨습니다! 🥩",
                "투움바 파스타랑 리조또 소스가 진하고 꾸덕해서 식전 빵을 찍어 먹어도 정말 맛있어요.",
                "매장 조명과 인테리어가 고급스러워서 데이트나 가족 기념일 식사 장소로 분위기 내기 최고입니다.",
                "가성비 좋은 파스타부터 화덕피자까지 메뉴 구성이 알차고 플레이팅이 예쁩니다."
            ];
        }
        if (mType === "bunsik") {
            return [
                "떡볶이 떡이 쫄깃쫄깃하고 매콤달콤한 국물에 모둠튀김이랑 순대 찍어 먹으면 스트레스가 확 풀립니다! 🍢",
                "김밥 속재료가 밥보다 훨씬 두툼하게 꽉 차 있어서 한 줄만 먹어도 든든해요.",
                "우동 국물이랑 어묵탕이 깊고 시원해서 퇴근길에 간단히 요기하기 딱 좋은 분식집입니다.",
                "주방이 오픈형인데 기름때 하나 없이 반짝반짝하게 관리되어 있어 믿고 먹습니다."
            ];
        }
        if (mType === "pub") {
            return [
                "살얼음 동동 띄운 생맥주 관리가 기가 막히고 안주 가성비가 좋아서 퇴근 후 한잔하기 딱입니다! 🍺",
                "꼬치구이랑 마른안주, 탕류 퀄리티가 일반 요리집 못지않게 훌륭하고 매장 분위기가 아늑해요.",
                "테이블 간격이 적당하고 환기가 잘 되어 있어서 친구들과 모임 하기 좋은 공간입니다."
            ];
        }

        // ====== [기존 함수를 통한 학교·관공서·공원·주유소·헬스장 등 처리] ======
        if (typeof window._baseRealisticPool === 'function') {
            return window._baseRealisticPool(mType, n, score);
        }

        return [
            "음식 맛도 깔끔하고 양도 푸짐해서 가성비가 정말 뛰어납니다. 재방문 의사 100%예요! 👍",
            "매장 내부가 청결하게 관리되고 있고 사장님과 직원분들이 친절하셔서 기분 좋게 이용했습니다.",
            "대중교통으로 찾아오기 편하고 동네 주민들이 꾸준히 찾는 알짜배기 매장입니다.",
            "가격이 합리적이고 서비스가 꼼꼼해서 주변 이웃들에게도 추천하고 싶은 곳입니다.",
            "전반적으로 시설이 깔끔하고 관리가 체계적으로 잘 이루어지고 있습니다."
        ];
    }

    function upgradeGlobalReviewGenerator() {
        var genericHotplaceRegex = /(효빈광역시 최고의 핫플|무조건 다시 방문하고 싶어요|별 5개가 전혀 아깝지 않은 곳입니다|주변 지인들에게도 적극 추천하고 싶은 곳입니다|대중교통으로 찾아오기도 편하고 내부 관리가 정말 잘 되어 있습니다\. 강추합니다|가성비가 괜찮고 위치도 찾기 쉬워서 방문하기 나쁘지 않습니다)/;

        var origGenMulti = window.generateMultipleReviews;

        window.generateMultipleReviews = function(ratingScore, type, name, customDesc) {
            var score = parseFloat(ratingScore);
            if (isNaN(score)) score = 4.3;
            var mType = type || (typeof classify100Category === 'function' ? classify100Category(name) : 'normal');

            // 금융·의료·외식 세부 풀이 있는지 먼저 확인하고, 학교·관공서·공원 등은 기존 v3.0 풀과 결합
            var pool = getSpecializedReviewPool(mType, name, score);

            // 학교, 관공서, 경찰, 복지, 공원, 아파트, 헬스장, 주유소 등은 기존 v3.0 리뷰 엔진의 풀을 그대로 활용하되 해시 시드를 다변화
            var grp = (typeof groupMap !== 'undefined' && groupMap[mType]) ? groupMap[mType] : 'normal';
            if (["education", "public", "safety", "welfare", "religion", "residence", "industry", "nature"].includes(grp) || ["gas_station", "fitness", "sports", "telecom", "butcher", "greengrocer", "laundry", "stationery", "drugstore"].includes(mType)) {
                if (typeof origGenMulti === 'function') {
                    var baseRes = origGenMulti(ratingScore, mType, name, customDesc);
                    // 닉네임과 날짜만 해시 기반으로 더 다채롭게 섞어줌
                    var h = strHash(name || "hyobin");
                    return baseRes.map(function(rv, idx) {
                        if (idx === 0 && customDesc && !genericHotplaceRegex.test(customDesc)) return rv;
                        var revObj = diverseReviewers[(h + idx * 7) % diverseReviewers.length];
                        return {
                            nick: revObj.nick,
                            badge: revObj.badge,
                            avatarBg: revObj.avatarBg,
                            star: rv.star,
                            scoreTxt: rv.scoreTxt,
                            date: reviewDates[(h + idx * 3) % reviewDates.length],
                            text: rv.text,
                            likes: ((h + idx * 11) % 32) + 3
                        };
                    });
                }
            }

            var resultList = [];
            var baseStar = Math.max(1, Math.min(5, Math.round(score)));
            var h = strHash(name || "hyobin_store");

            if (customDesc && customDesc.trim() !== "" && !genericHotplaceRegex.test(customDesc)) {
                resultList.push({
                    nick: "효빈광역시 시민",
                    badge: "👑 베스트 리뷰",
                    avatarBg: "#d32f2f",
                    star: baseStar,
                    scoreTxt: score.toFixed(1),
                    date: "최근 작성",
                    text: customDesc.trim(),
                    likes: (h % 40) + 18
                });
            }

            for (var i = 0; i < 5; i++) {
                var rIdx = (h + i * 5) % diverseReviewers.length;
                var pIdx = (h + i * 3) % pool.length;
                var indivStar = baseStar;
                if (score < 2.0) indivStar = (i % 4 === 0) ? 2 : 1;
                else if (score >= 4.3) indivStar = (i % 3 === 0) ? 4 : 5;

                resultList.push({
                    nick: diverseReviewers[rIdx].nick,
                    badge: diverseReviewers[rIdx].badge,
                    avatarBg: diverseReviewers[rIdx].avatarBg,
                    star: indivStar,
                    scoreTxt: indivStar.toFixed(1),
                    date: reviewDates[(h + i * 2) % reviewDates.length],
                    text: pool[pIdx],
                    likes: ((h + (i + 1) * 9) % 28) + 2
                });
            }

            return resultList;
        };

        window.generateAutoReview = function(ratingScore, type, name) {
            var list = window.generateMultipleReviews(ratingScore, type, name, "");
            var h = strHash(name || "hb");
            return list[h % list.length].text;
        };
    }

    // =====================================================================
    // 4. ★ 구·군·시 내부 타겟 폴리곤 및 랜드마크 스냅 좌표 탐색기
    // =====================================================================
    var rngSeed = 20261199;
    function seededRandom() {
        rngSeed = (rngSeed * 1664525 + 1013904223) % 4294967296;
        return rngSeed / 4294967296;
    }

    function isForbiddenIsland(lat, lng) {
        var rawLat = lat - ADJ_Y;
        // 포산동 북쪽 섬(포상도), 팔조동 남쪽 섬(개비도), 내항동 작은 섬 제외
        if (rawLat > -2500 && lng > 23500 && lng < 26000) return true;
        if (rawLat < -18000 && lng > 22000 && lng < 25000) return true;
        if (rawLat > -8000 && rawLat < -7000 && lng > 11500 && lng < 12200) return true;
        return false;
    }

    function getDistrictPolygons(gugunName) {
        if (typeof searchablePolygons === 'undefined') return [];
        var adminPolys = [];
        var gugunPolys = [];

        searchablePolygons.forEach(function(p) {
            if (!p || !p.points || p.points.length === 0) return;
            var pName = (p.name || "").trim();

            if (p.type === 'gugun') {
                if (gugunName === "천주시" && pName.includes("천주시")) gugunPolys.push(p);
                else if (pName === gugunName || pName.startsWith(gugunName)) gugunPolys.push(p);
            }
        });

        // 해당 구/군 내부에 중심점이 들어가는 하위 행정동/법정동 폴리곤 수집
        searchablePolygons.forEach(function(p) {
            if (!p || !p.points || p.type === 'gugun' || p.type === 'dev') return;
            var center = L.polygon(p.points).getBounds().getCenter();
            if (isForbiddenIsland(center.lat, center.lng)) return;

            var insideGugun = gugunPolys.some(function(gp) {
                return typeof isPointInPolygon === 'function' && isPointInPolygon(center.lat, center.lng, gp.points);
            });
            if (insideGugun) {
                adminPolys.push(p);
            }
        });

        return { gugunPolys: gugunPolys, subPolys: adminPolys };
    }

    function sampleFinancePoint(gugunName, targetHint, polyPack, gugunLandmarks, existingFinancePts) {
        // 1순위: targetHint(특정 대학교, 시청, 역, 동네 이름)가 있으면 해당 랜드마크나 폴리곤으로 정밀 스냅!
        if (targetHint) {
            var hintClean = targetHint.replace(/(동|읍|면|리|역)$/, '').trim();

            // 1-A. 특정 시설(대학교, 시청, 병원, 공항, 항만 등)과 매칭되는 랜드마크가 있는지 확인
            var matchedLm = gugunLandmarks.filter(function(lm) {
                return lm.name && (lm.name.includes(targetHint) || (hintClean.length >= 2 && lm.name.includes(hintClean)));
            });

            if (matchedLm.length > 0) {
                for (var t = 0; t < 15; t++) {
                    var pickLm = matchedLm[Math.floor(seededRandom() * matchedLm.length)];
                    var ang = seededRandom() * Math.PI * 2;
                    var rad = 35 + seededRandom() * 140;
                    var cLat = Math.round(pickLm.lat + Math.sin(ang) * rad);
                    var cLng = Math.round(pickLm.lng + Math.cos(ang) * rad);
                    if (isValidFinanceSpot(cLat, cLng, polyPack.gugunPolys, existingFinancePts)) {
                        return { lat: cLat, lng: cLng, nearLm: pickLm };
                    }
                }
            }

            // 1-B. 하위 동/읍/면/리 폴리곤 이름과 매칭되는 곳이 있는지 확인 (예: '평당', '어간', '고송', '도변')
            var matchedPolys = polyPack.subPolys.filter(function(sp) {
                return sp.name && (sp.name.includes(targetHint) || (hintClean.length >= 2 && sp.name.includes(hintClean)));
            });

            if (matchedPolys.length > 0) {
                for (var pTry = 0; pTry < 40; pTry++) {
                    var targetP = matchedPolys[Math.floor(seededRandom() * matchedPolys.length)];
                    var b = L.polygon(targetP.points).getBounds();
                    var rLat = Math.round(b.getSouth() + seededRandom() * (b.getNorth() - b.getSouth()));
                    var rLng = Math.round(b.getWest() + seededRandom() * (b.getEast() - b.getWest()));
                    if (isPointInPolygon(rLat, rLng, targetP.points) && isValidFinanceSpot(rLat, rLng, polyPack.gugunPolys, existingFinancePts)) {
                        return { lat: rLat, lng: rLng, nearLm: null };
                    }
                }
            }
        }

        // 2순위: 구/군 내 주요 상권 앵커(지하철역, 청사, 학교, 아파트, 마트) 반경 40~240m 이내 배치 (75% 확률)
        if (gugunLandmarks.length > 0 && seededRandom() < 0.75) {
            for (var aTry = 0; aTry < 25; aTry++) {
                var anchor = gugunLandmarks[Math.floor(seededRandom() * gugunLandmarks.length)];
                var angle = seededRandom() * Math.PI * 2;
                var radius = 40 + seededRandom() * 200;
                var candLat = Math.round(anchor.lat + Math.sin(angle) * radius);
                var candLng = Math.round(anchor.lng + Math.cos(angle) * radius);
                if (isValidFinanceSpot(candLat, candLng, polyPack.gugunPolys, existingFinancePts)) {
                    return { lat: candLat, lng: candLng, nearLm: anchor };
                }
            }
        }

        // 3순위: 하위 행정동/법정동 폴리곤 내부 랜덤 샘플링
        var candidatePolys = polyPack.subPolys.length > 0 ? polyPack.subPolys : polyPack.gugunPolys;
        for (var k = 0; k < 80; k++) {
            var poly = candidatePolys[Math.floor(seededRandom() * candidatePolys.length)];
            var bounds = L.polygon(poly.points).getBounds();
            var sLat = Math.round(bounds.getSouth() + seededRandom() * (bounds.getNorth() - bounds.getSouth()));
            var sLng = Math.round(bounds.getWest() + seededRandom() * (bounds.getEast() - bounds.getWest()));
            if (isPointInPolygon(sLat, sLng, poly.points) && isValidFinanceSpot(sLat, sLng, polyPack.gugunPolys, existingFinancePts)) {
                return { lat: sLat, lng: sLng, nearLm: null };
            }
        }

        return null;
    }

    function isValidFinanceSpot(lat, lng, gugunPolys, existingPts) {
        if (isForbiddenIsland(lat, lng)) return false;
        if (gugunPolys && gugunPolys.length > 0) {
            var inGu = gugunPolys.some(gp => isPointInPolygon(lat, lng, gp.points));
            if (!inGu) return false;
        }
        if (typeof resolveFullAddress === 'function') {
            var addr = resolveFullAddress(lat, lng);
            if (!addr || addr.legal === "바다" || (!addr.gugun && !addr.admin && !addr.legal)) return false;
        }
        // 은행 마커끼리 너무 완전히 겹치지 않도록 최소 22m 이격
        for (var i = 0; i < existingPts.length; i++) {
            if (Math.abs(existingPts[i].lat - lat) < 22 && Math.abs(existingPts[i].lng - lng) < 22) {
                return false;
            }
        }
        return true;
    }

    // =====================================================================
    // 5. ★ 금융기관 지점명 스마트 작명기 (본점 / 지점 / 출장소 / 우체국)
    // =====================================================================
    function buildFinanceBranchName(itemSpec, idxInGroup, totalInGroup, gugunName, lat, lng, nearLm, gugunLandmarks, usedNames) {
        var base = itemSpec.name.trim();
        var addr = (typeof resolveFullAddress === 'function') ? resolveFullAddress(lat, lng) : { admin: "", legal: "", eupMyeon: "" };
        var localDong = (addr.legal && addr.legal !== "바다") ? addr.legal.replace(/\(.*\)/g, "").trim() : (addr.admin || gugunName);
        var adminDong = (addr.admin || localDong).replace(/\(.*\)/g, "").trim();

        // 가까운 랜드마크(지하철역, 학교, 청사, 백화점 등) 탐색
        var bestLmName = "";
        if (nearLm && nearLm.cleanName) {
            bestLmName = nearLm.cleanName;
        } else {
            var closestDist = 650;
            for (var i = 0; i < gugunLandmarks.length; i++) {
                var lm = gugunLandmarks[i];
                var d = Math.sqrt(Math.pow(lm.lat - lat, 2) + Math.pow(lm.lng - lng, 2));
                if (d < closestDist && lm.cleanName) {
                    closestDist = d;
                    bestLmName = lm.cleanName;
                }
            }
        }

        // 1) 이미 지점명이 완성된 단일 특화 지점 (예: '야마구치은행 효빈항출장소', 'OK저축은행 평당지점', '효빈광역시청새마을금고')
        if (itemSpec.fixedName && totalInGroup === 1) {
            usedNames.add(base);
            return base;
        }

        // 2) 우체국 (예: 남효빈우체국 1호점 -> '남효빈우체국', 2호점~ -> '효빈평당동우체국', '효빈어간우체국' 등)
        if (itemSpec.isPost) {
            if (idxInGroup === 0 && !usedNames.has(base)) {
                usedNames.add(base);
                return base;
            }
            var postCandidates = [
                `효빈${localDong}우체국`,
                `효빈${adminDong}우체국`,
                bestLmName ? `효빈${bestLmName}우체국` : "",
                `${gugunName.replace(/(구|군|시)$/, '')}${localDong}우체국`,
                `효빈${localDong}우편취급국`,
                `효빈${adminDong}우편취급국`
            ].filter(Boolean);

            for (var p = 0; p < postCandidates.length; p++) {
                if (!usedNames.has(postCandidates[p])) {
                    usedNames.add(postCandidates[p]);
                    return postCandidates[p];
                }
            }
            var fallbackPost = `${base} ${localDong}분국(${idxInGroup + 1})`;
            usedNames.add(fallbackPost);
            return fallbackPost;
        }

        // 3) 새마을금고 / 신용협동조합 / 지역 농·축·수협
        if (itemSpec.cat === "credit_union") {
            var isSubBranchAlready = base.endsWith("지점");
            var cleanBase = base.replace(/\s*[^\s]+지점$/, "");

            var cuCandidates = [];
            if (idxInGroup === 0 && !isSubBranchAlready) {
                cuCandidates.push(`${base} 본점`);
            }
            if (isSubBranchAlready && idxInGroup === 0) {
                cuCandidates.push(base);
            }
            cuCandidates.push(`${cleanBase} ${localDong}지점`);
            if (adminDong !== localDong) cuCandidates.push(`${cleanBase} ${adminDong}지점`);
            if (bestLmName) cuCandidates.push(`${cleanBase} ${bestLmName}지점`);
            cuCandidates.push(`${cleanBase} 중앙지점`);
            cuCandidates.push(`${cleanBase} 역세권지점`);
            cuCandidates.push(`${cleanBase} 남부지점`);
            cuCandidates.push(`${cleanBase} 북부지점`);
            cuCandidates.push(`${cleanBase} 제${idxInGroup + 1}지점`);

            for (var c = 0; c < cuCandidates.length; c++) {
                if (cuCandidates[c] && !usedNames.has(cuCandidates[c])) {
                    usedNames.add(cuCandidates[c]);
                    return cuCandidates[c];
                }
            }
            var fbCu = `${cleanBase} ${localDong}${idxInGroup + 1}지점`;
            usedNames.add(fbCu);
            return fbCu;
        }

        // 4) 제1금융권 은행 (효빈은행, 국민은행, 신한은행, 하나은행, 우리은행, 농협은행, 기업은행 등)
        var bankCandidates = [];
        // 중구 첫 번째 효빈은행은 본점(또는 중앙지점) 우대
        if (base === "효빈은행" && gugunName === "중구" && idxInGroup === 0) {
            bankCandidates.push("효빈은행 본점영업부");
        }
        bankCandidates.push(`${base} ${localDong}지점`);
        if (adminDong !== localDong) bankCandidates.push(`${base} ${adminDong}지점`);
        if (bestLmName) {
            bankCandidates.push(`${base} ${bestLmName}지점`);
            if (bestLmName.endsWith("역") || bestLmName.match(/(대|시청|구청|군청|터미널|공항|항)$/)) {
                bankCandidates.push(`${base} ${bestLmName}출장소`);
            }
        }
        bankCandidates.push(`${base} ${gugunName}청지점`);
        bankCandidates.push(`${base} ${localDong}금융센터`);
        bankCandidates.push(`${base} ${localDong}중앙지점`);
        bankCandidates.push(`${base} ${localDong}역세권지점`);
        bankCandidates.push(`${base} 효빈${localDong}지점`);

        for (var b = 0; b < bankCandidates.length; b++) {
            if (bankCandidates[b] && !usedNames.has(bankCandidates[b])) {
                usedNames.add(bankCandidates[b]);
                return bankCandidates[b];
            }
        }

        var fbBank = `${base} ${localDong}${idxInGroup + 1}지점`;
        usedNames.add(fbBank);
        return fbBank;
    }

    // =====================================================================
    // 6. ★ 메인 금융기관 생성 및 지도 등록 함수
    // =====================================================================
    window.generateHyobinFinanceMarkers = function(isSilent) {
        extendFinanceCategorySystem();
        upgradeGlobalReviewGenerator();
        rngSeed = 20261199;

        if (typeof allLandmarks === 'undefined' || typeof searchablePolygons === 'undefined') {
            if (!isSilent) alert("지도 기본 데이터가 아직 로드되지 않았습니다.");
            return [];
        }

        window.clearGeneratedFinanceMarkers(true);

        var deletedSet = new Set();
        try {
            deletedSet = new Set(JSON.parse(localStorage.getItem('hyobin_deleted_markers') || '[]'));
        } catch (e) {}

        var usedNames = new Set();
        var existingFinancePts = [];

        allLandmarks.forEach(function(m) {
            if (!m || !m.name) return;
            usedNames.add(m.name);
            var mType = m.type || classify100Category(m.name);
            if (["bank", "bank_central", "credit_union", "finance_corp", "savings_bank", "post_office"].includes(mType)) {
                existingFinancePts.push({ name: m.name, lat: m.lat, lng: m.lng });
            }
        });

        var generatedFinanceList = [];

        Object.keys(financeAllocationDB).forEach(function(gugunName) {
            var cfg = financeAllocationDB[gugunName];
            var polyPack = getDistrictPolygons(gugunName);
            if (polyPack.gugunPolys.length === 0 && polyPack.subPolys.length === 0) return;

            // 해당 구/군 내부의 주요 랜드마크(역, 학교, 청사, 아파트, 백화점 등) 추출
            var gugunLandmarks = [];
            allLandmarks.forEach(function(m) {
                if (!m || !m.name || m.isAutoCommercial || m.isAutoFinance || m.type === 'busStop') return;
                if (isForbiddenIsland(m.lat, m.lng)) return;
                var inGu = polyPack.gugunPolys.some(gp => isPointInPolygon(m.lat, m.lng, gp.points));
                if (inGu) {
                    var cleanN = m.name.replace(/\(.*\)/g, "").replace(/(초등학교|중학교|고등학교|대학교)$/, function(s) {
                        return s === "초등학교" ? "초교" : s === "중학교" ? "중교" : s === "고등학교" ? "고교" : "대";
                    }).replace(/\s+/g, "").trim();
                    if (!cleanN.match(/(편의점|CU|GS25|세븐일레븐|이마트24|사거리|삼거리|교차로|IC|JC)/i)) {
                        gugunLandmarks.push({
                            name: m.name,
                            cleanName: cleanN,
                            lat: m.lat,
                            lng: m.lng,
                            type: m.type
                        });
                    }
                }
            });

            cfg.items.forEach(function(itemSpec) {
                var targetCount = itemSpec.count;

                // 이미 기존 hyobin_markers.js에 수동으로 등록된 동명 우체국(예: 남효빈우체국, 안천우체국 등)이 해당 구에 있으면 그 수만큼 차감하여 총 개수 유지!
                var alreadyExistCount = existingFinancePts.filter(function(ep) {
                    var inGu = polyPack.gugunPolys.some(gp => isPointInPolygon(ep.lat, ep.lng, gp.points));
                    return inGu && ep.name.includes(itemSpec.name.replace(/\s*본점$/, ''));
                }).length;

                var remainToCreate = Math.max(0, targetCount - alreadyExistCount);

                for (var idx = 0; idx < remainToCreate; idx++) {
                    var spot = sampleFinancePoint(gugunName, itemSpec.targetHint, polyPack, gugunLandmarks, existingFinancePts);
                    if (!spot) continue;

                    var storeName = buildFinanceBranchName(
                        itemSpec, idx, targetCount, gugunName,
                        spot.lat, spot.lng, spot.nearLm, gugunLandmarks, usedNames
                    );

                    var delKey = `${storeName}_${Math.round(spot.lat)}_${Math.round(spot.lng)}`;
                    if (deletedSet.has(delKey)) continue;

                    var catKey = itemSpec.cat;
                    var color = (typeof markerColors !== 'undefined' && markerColors[catKey]) ? markerColors[catKey] : "#0288D1";
                    var rating = (4.1 + Math.floor(seededRandom() * 8) * 0.1).toFixed(1);
                    var reviews = Math.floor(seededRandom() * 65) + 14;

                    var newMarkerItem = {
                        name: storeName,
                        lat: spot.lat,
                        lng: spot.lng,
                        type: catKey,
                        color: color,
                        rating: rating,
                        reviews: String(reviews),
                        isAutoFinance: true
                    };

                    existingFinancePts.push({ name: storeName, lat: spot.lat, lng: spot.lng });
                    generatedFinanceList.push(newMarkerItem);
                    allLandmarks.push(newMarkerItem);

                    if (typeof addMarkerToMap === 'function') {
                        addMarkerToMap(newMarkerItem);
                    }
                }
            });
        });

        window.generatedFinanceMarkers = generatedFinanceList;
        refreshFinanceWheelCounts();

        if (!isSilent) {
            var summary = summarizeFinanceByDistrict(generatedFinanceList);
            alert(
                `🏦 효빈광역시 & 덕빈북도 금융기관 정밀 배치 완료!\n\n` +
                `• 총 배치된 금융·우체국 점포: ${generatedFinanceList.length.toLocaleString()}개\n` +
                `• 천주시(지도 내부 70%), 기도군(염곡읍·공항 1/3) 비율 적용 완료\n\n` +
                `[지역별 생성 현황]\n${summary}`
            );
        }

        return generatedFinanceList;
    };

    function summarizeFinanceByDistrict(list) {
        var counts = { bank: 0, credit_union: 0, savings_bank: 0, post_office: 0 };
        list.forEach(m => { counts[m.type] = (counts[m.type] || 0) + 1; });
        return [
            `🏛️ 제1금융권(효빈·덕북·시중·국책·특수·외국은행): ${(counts.bank || 0).toLocaleString()}개`,
            `🤝 제2금융권 상호금융(농축수협·새마을금고·신협·산림조합): ${(counts.credit_union || 0).toLocaleString()}개`,
            `💰 제2금융권 상호저축은행: ${(counts.savings_bank || 0).toLocaleString()}개`,
            `📮 우체국·우편취급국(우체국금융): ${(counts.post_office || 0).toLocaleString()}개`
        ].join("\n");
    }

    // 7. 자동 생성된 금융 마커 초기화 함수
    window.clearGeneratedFinanceMarkers = function(isSilent) {
        if (typeof activeMarkers !== 'undefined' && window.generatedFinanceMarkers && window.generatedFinanceMarkers.length > 0) {
            var genNames = new Set(window.generatedFinanceMarkers.map(g => g.name));
            for (var i = activeMarkers.length - 1; i >= 0; i--) {
                var mk = activeMarkers[i];
                var tip = mk.getTooltip() ? mk.getTooltip().getContent() : "";
                var bMatch = tip.match(/<b>(.*?)<\/b>/);
                var mName = bMatch ? bMatch[1].trim() : "";
                if (mName && genNames.has(mName)) {
                    if (mk.parentGroupLayer) mk.parentGroupLayer.removeLayer(mk);
                    if (typeof subCatFilterLayer !== 'undefined') subCatFilterLayer.removeLayer(mk);
                    map.removeLayer(mk);
                    activeMarkers.splice(i, 1);
                }
            }
        }
        if (typeof allLandmarks !== 'undefined') {
            window.allLandmarks = allLandmarks.filter(m => !m.isAutoFinance);
            allLandmarks = window.allLandmarks;
        }
        window.generatedFinanceMarkers = [];
        refreshFinanceWheelCounts();
        if (!isSilent) alert("🗑️ 자동 생성된 금융기관 마커가 숨김 처리되었습니다.");
    };

    function refreshFinanceWheelCounts() {
        var selEl = document.getElementById('subcat-100-wheel-select');
        if (!selEl || typeof activeMarkers === 'undefined' || typeof categoryNames100 === 'undefined') return;

        var counts = {};
        var totalNormal = 0;
        activeMarkers.forEach(function(m) {
            if (m.subCategory) {
                counts[m.subCategory] = (counts[m.subCategory] || 0) + 1;
                totalNormal++;
            }
        });

        var sortedKeys = Object.keys(categoryNames100).sort(function(a, b) {
            return categoryNames100[a].localeCompare(categoryNames100[b], 'ko');
        });

        var currentVal = selEl.value || "NONE";
        var optionsHtml = `
            <option value="NONE" ${currentVal === "NONE" ? "selected" : ""} style="font-weight:bold; color:#555; padding:4px;">🚫 세부 필터 끄기 (우측 체크박스 기준)</option>
            <option value="ALL" ${currentVal === "ALL" ? "selected" : ""} style="font-weight:bold; color:#0077DD; padding:4px;">🌐 전체 시설 마커 모두 켜기 (${totalNormal.toLocaleString()}개)</option>
        `;
        sortedKeys.forEach(function(k) {
            var cnt = counts[k] || 0;
            if (cnt > 0) {
                var selAttr = (currentVal === k) ? "selected" : "";
                optionsHtml += `<option value="${k}" ${selAttr} style="padding:4px; border-bottom:1px solid #f4f4f4; font-weight:500;">▪ ${categoryNames100[k]} (${cnt.toLocaleString()})</option>`;
            }
        });
        sortedKeys.forEach(function(k) {
            var cnt = counts[k] || 0;
            if (cnt === 0) {
                optionsHtml += `<option value="${k}" style="padding:4px; color:#aaa;">▫ ${categoryNames100[k]} (0)</option>`;
            }
        });
        selEl.innerHTML = optionsHtml;
    }

    // 8. 금융기관 데이터 영구 JS 추출기
    window.downloadGeneratedFinanceJS = function() {
        var list = window.generatedFinanceMarkers || [];
        if (list.length === 0) {
            alert("먼저 금융기관 마커를 생성해주세요!");
            return;
        }
        var inverseAdjY = -ADJ_Y;
        var exportArr = list.map(function(m) {
            return {
                name: m.name,
                lat: Math.round(m.lat + inverseAdjY),
                lng: Math.round(m.lng),
                type: m.type,
                color: m.color,
                rating: m.rating,
                reviews: m.reviews
            };
        });

        var jsContent = `// 효빈광역시 & 덕빈북도 금융기관 정밀 배치 데이터 (총 ${exportArr.length}개, defaultLandmarksData 호환 좌표)\n` +
            `var generatedFinanceData = ${JSON.stringify(exportArr, null, 4)};\n`;

        var blob = new Blob([jsContent], { type: "application/javascript;charset=utf-8;" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "hyobin_finance_data.js";
        a.click();
    };

    // 9. 페이지 로드 시 자동 실행 및 사이드바 제어 UI 주입
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            extendFinanceCategorySystem();
            upgradeGlobalReviewGenerator();
            window.generateHyobinFinanceMarkers(true);

            var tabData = document.getElementById('tab-data');
            if (tabData && !document.getElementById('finance-gen-control-box')) {
                var box = document.createElement('div');
                box.id = 'finance-gen-control-box';
                box.style.cssText = 'margin-top:12px; padding-top:12px; border-top:2px dashed #0288D1;';
                box.innerHTML = `
                    <div style="font-size:11.5px; font-weight:bold; color:#01579B; margin-bottom:6px;">🏦 금융기관(제1·2금융권·우체국) 전용 관리</div>
                    <button class="sidebar-btn" style="background:#0288D1; color:#fff; margin-bottom:6px;" onclick="window.generateHyobinFinanceMarkers(false)">
                        🏦 금융기관 마커 재생성 (통계 보기)
                    </button>
                    <button class="sidebar-btn" style="margin-bottom:6px;" onclick="window.downloadGeneratedFinanceJS()">
                        💾 금융기관 데이터 (.js) 추출
                    </button>
                    <button class="sidebar-btn danger-btn" onclick="window.clearGeneratedFinanceMarkers(false)">
                        🗑️ 금융기관 자동 마커만 숨기기
                    </button>
                `;
                tabData.appendChild(box);
            }
        }, 900);
    });
})();