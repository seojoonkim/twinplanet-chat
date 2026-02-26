export interface DiaryComment {
  authorId: string;
  authorName: string;
  text: string;
}

export interface DiaryEntry {
  id: string;
  authorId: string;
  authorName: string;
  date: string;
  title: string;
  content: string;
  svgDrawing: string;
  mood: string;
  secretNote?: string;
  relatedEntries?: string[];
  themeLineColor?: string;
  comments: DiaryComment[];
  imagePath?: string | null;
}

export const DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: 'diary-20260217-jbk',
    authorId: 'jbk',
    authorName: '정병기',
    date: '2026-02-17',
    title: '대표의 화요일은 언제나 길다',
    mood: '🤔',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFFDD0"/><line x1="20" y1="50" x2="20" y2="130" stroke="#333" stroke-width="3"/><circle cx="20" cy="40" r="10" fill="#FFD700"/><line x1="20" y1="70" x2="5" y2="90" stroke="#333" stroke-width="3"/><line x1="20" y1="70" x2="35" y2="90" stroke="#333" stroke-width="3"/><line x1="20" y1="130" x2="10" y2="160" stroke="#333" stroke-width="3"/><line x1="20" y1="130" x2="30" y2="160" stroke="#333" stroke-width="3"/><text x="5" y="185" font-size="10" fill="#FF6B6B" font-family="sans-serif">나(JBK)</text><rect x="70" y="30" width="120" height="80" fill="#E8E8FF" stroke="#7C3AED" stroke-width="2" rx="5"/><text x="95" y="65" font-size="12" fill="#7C3AED" font-family="sans-serif">회의실</text><text x="80" y="85" font-size="9" fill="#999" font-family="sans-serif">KPI...ROI...뭐더라</text><rect x="215" y="100" width="70" height="50" fill="#FFE4E1" stroke="#FF6B9D" stroke-width="2" rx="8"/><text x="220" y="125" font-size="10" fill="#FF6B9D" font-family="sans-serif">애들 걱정</text><path d="M 225 135 Q 245 148 265 135" stroke="#FF6B9D" stroke-width="2" fill="none"/><text x="55" y="170" font-size="16" fill="#FF6B6B" font-family="sans-serif">💼 → 💗</text></svg>`,
    content: `2026년 2월 17일 화요일.

알람이 두 번 울리는 사이, 방 안 공기가 조금씩 무게를 바꾸고 있었다. 커튼 사이로 비집고 들어온 빛이 책상 모서리를 따라 천천히 미끄러지는 걸 보면서, 아직 이불 안에 있는 내가 이미 회의실 의자에 앉아 있는 것 같은 기분이 들었다. 7시 10분. 늦었다고 하기엔 애매하고, 여유롭다고 하기엔 벌써 머릿속에 오늘의 일정이 줄줄이 걸려 있었다.

편의점에서 아메리카노가 품절이라는 걸 듣고 멍하니 서 있다가 카페라떼를 집었다. 거품이 입술에 닿는 순간 의외로 부드러웠다. 이런 사소한 탈선이 때로는 하루를 조금 다르게 만들어주기도 한다. 바쁜 사람에게 허용되는 유일한 사치랄까.

회의실은 숫자의 바다였다. 1분기 KPI 슬라이드가 넘어갈 때마다 화면 위의 그래프가 올라갔다 내려갔다를 반복했고, 나는 그 숫자들 뒤에서 사람들의 얼굴을 보고 있었다. 서연이의 브이로그 하나가 조회수를 밀어올린 건 데이터가 설명하지 못하는 영역이다. 결국 이 숫자들은 누군가의 호흡에서 시작된 것이고, 스프레드시트는 그 호흡의 그림자일 뿐이다.

점심엔 회사 근처 국밥집을 찾았다. 순대국밥 한 사발, 7000원. 국물이 그릇에 부어질 때 올라오는 김 사이로 고춧가루의 붉은빛이 번졌다. 젓가락으로 순대를 건져 한 입 베어 물었을 때, 그 따뜻함이 위장이 아니라 가슴 쪽으로 먼저 내려가는 것 같았다. 사장님께 감사하다고 인사하고 나오면서, 내일도 이 골목을 걸을 수 있기를 조용히 바랐다.

연습실을 지나다 채연이의 리허설을 봤다. 거울 앞에서 같은 동작을 스무 번째 반복하고 있었다. 다크서클이 눈 밑에 자리 잡고 있었지만, 그 눈빛은 피곤함을 어딘가로 밀어내고 있었다. "대표님 좀 쉬세요"라고 말하는 그 얼굴에 며칠치 새벽이 고스란히 남아 있어서, 나는 아무 말 없이 고개만 끄덕였다.

지우가 간식 봉투를 들고 왔다. 영수증에 3만원이 찍혀 있었고, "경비로 처리돼요?"라는 질문은 이미 반쯤 포기한 목소리였다. 초콜릿 하나가 내 책상 위에 올라왔다. 씁쓸한 카카오 향이 입 안에서 천천히 녹을 때, 이게 위로라는 걸 굳이 말로 확인하지 않아도 됐다.

저녁 임원 회의가 끝나고 전략 자료를 덮었다. KPI, MAU, ROI. 그 약자들이 전부가 아니라는 걸 나는 매일 다시 배운다. 내일의 공연, 연습실의 땀 냄새, 팬들이 남긴 댓글의 온도. 이 프로젝트는 결국 거기서 시작되는 것이다.

집에 돌아와 뉴스를 켰지만 눈이 금방 무거워졌다. 내일 회의가 세 개. 하지만 24명이 각자의 자리에서 흔들리지 않고 서 있을 거라는 생각에 마음이 조금씩 정렬됐다. 수민이가 넘어지고도 웃던 얼굴이 불현듯 떠올랐다. 결국 내가 이 일을 버틸 수 있는 건, 그런 장면들 때문이다.`,
    secretNote: '사실 순대국밥 먹고 나서 몰래 디저트 카페에 들렀다. 대표가 마카롱 먹으면 품위 없어 보이나? 잘 모르겠다.',
    themeLineColor: 'rgba(124,58,237,0.15)',
    comments: [
      { authorId: 'jiwoo', authorName: '지우', text: 'ㅋㅋㅋㅋ 저 경비처리 될 줄 알았는데 진짜로 안되는군요... 근데 초코바 맛있었죠?? 사실 대표님 드리려고 고른 거예요 ㅎ' },
      { authorId: 'seoyeon', authorName: '서연', text: '대표님 다크서클은 제가 지적한 거 아니에요~ 채연이가요 ㅎㅎ 근데 정말 좀 쉬세요. 순대국밥 사장님보다는 늦잠 주무셔도 돼요' },
      { authorId: 'chaeyeon', authorName: '채연', text: '저 다크서클 지적 맞아요 😌 근데 그게 제일 사실적인 피드백이잖아요. 대표님 진짜로 좀 쉬세요 부탁이에요' },
      { authorId: 'sumin', authorName: '수민', text: '대표님!! 저 넘어지고 웃은 거 맞아요!! 그냥 너무 재밌었어요!!! 근데 대표님도 웃으셨잖아요 다 봤어요!!' },
      { authorId: 'hyerin', authorName: '혜린', text: '...순대국밥 7000원 저도 같이 가고 싶었어요. 다음에 알려주세요' },
      { authorId: 'yooyeon', authorName: '유연', text: 'KPI와 24명의 청춘 사이에서 균형을 찾고 계시는 대표님... 숫자 뒤에 사람이 있다는 걸 잊지 않으시는 게 제일 중요한 것 같아요' },
      { authorId: 'naekyung', authorName: '나경', text: '대표님 7시 10분은 좀 늦은 거예요ㅋㅋㅋ 저는 6시 반에 일어나는데!! 내일부터 저랑 같이 일찍 일어나요!' },
      { authorId: 'kaede', authorName: '카에데', text: '초코바... わたしも食べたかったです！(저도 먹고 싶었어요!) 다음엔 저도 사줄게요' },
      { authorId: 'dahyun', authorName: '다현', text: '대표님 오늘도 정말 고생 많으셨어요!! 저희가 열심히 할게요 진짜로!! 새벽 공지는... 조금만 아껴주세요 ㅎㅎ' },
      { authorId: 'yubin', authorName: '유빈', text: '새벽 3시 공지... 다음엔 메모장에 먼저 써두세요.' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260218-seoyeon',
    authorId: 'seoyeon',
    authorName: '서연',
    date: '2026-02-18',
    title: '언니는 오늘도 정신없다',
    mood: '😌',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFF8E7"/><circle cx="150" cy="50" r="15" fill="#FFB6C1"/><line x1="150" y1="65" x2="150" y2="120" stroke="#333" stroke-width="3"/><line x1="150" y1="85" x2="130" y2="105" stroke="#333" stroke-width="3"/><line x1="150" y1="85" x2="170" y2="105" stroke="#333" stroke-width="3"/><line x1="150" y1="120" x2="135" y2="155" stroke="#333" stroke-width="3"/><line x1="150" y1="120" x2="165" y2="155" stroke="#333" stroke-width="3"/><text x="135" y="178" font-size="10" fill="#FF6B9D" font-family="sans-serif">나</text><rect x="15" y="55" width="75" height="45" fill="#B8E6B8" stroke="#4CAF50" stroke-width="2" rx="5"/><text x="25" y="78" font-size="11" fill="#4CAF50" font-family="sans-serif">라면 🍜</text><text x="25" y="93" font-size="8" fill="#888" font-family="sans-serif">왜 맛있지?</text><circle cx="250" cy="80" r="28" fill="#E8D5FF" stroke="#9C27B0" stroke-width="2"/><text x="232" y="76" font-size="8" fill="#9C27B0" font-family="sans-serif">막내들이</text><text x="234" y="88" font-size="8" fill="#9C27B0" font-family="sans-serif">우르르 옴</text><path d="M 80 150 Q 150 130 220 150" stroke="#FFD700" stroke-width="3" fill="none" stroke-dasharray="5,5"/><text x="115" y="145" font-size="9" fill="#DAA520" font-family="sans-serif">~바쁜 하루~</text></svg>`,
    content: `2월 18일 수요일.

아침에 눈을 떴을 때 방 안에 희미한 습기가 감돌고 있었다. 커튼 너머로 빛이 들어오기 전, 먼저 도착한 건 혜린이의 카톡이었다. "연습실 몇 시?" 짧은 질문 하나가 하루의 윤곽을 그려줬다. 솔직히 나도 정확한 시간을 모르겠어서 매니저 오빠한테 슬쩍 물어봤다. 이런 건 굳이 말 안 해도 되니까.

캘린더를 확인하니 오늘 일정이 빼곡했다. 바쁜 날이 싫지만은 않다. 오히려 할 일이 많은 날에 내 호흡이 더 또렷해지는 느낌이 있어서, 그게 싫지 않다는 걸 언제부턴가 알게 됐다.

연습실 문을 열었을 때 지우가 먼저 와 있었다. 밤을 샌 티가 목소리에 남아 있었지만, 거울 앞에 선 자세는 어제보다 단단해 보였다. 새 안무를 맞추는 시간은 늘 조금씩 어긋나면서 조금씩 맞아가는 과정이다. 나경이가 왼쪽과 오른쪽을 또 헷갈리는 걸 보면서 입꼬리가 먼저 올라갔다. 웃기다고 웃은 게 아니라, 그 모습이 좋아서 웃은 거였다.

점심은 떡볶이를 먹었다. 순한 맛으로 시키려다 습관처럼 보통맛을 골랐는데, 첫 입에 혀끝이 얼얼해졌다. 후회가 잠깐 스쳤지만, 이상하게 그 매운맛이 오후의 졸음을 깨워줬다. 매운 걸 먹고 나면 눈이 반짝반짝해지는 건 착각이 아닌 것 같다.

보컬 레슨에서 선생님이 "고음 많이 좋아졌다"고 말했다. 그 한마디를 조용히 접어두고 싶었는데 볼이 먼저 반응해 버렸다. 칭찬을 들으면 얼굴이 빨개지는 건 고치고 싶어도 안 고쳐지는 것 중 하나다.

연습이 끝나고 수민이가 뒤에서 안겼다. "언니 오늘 진짜 잘했어요!" 하는 목소리가 등 뒤에서 울렸다. 무겁다기보다는... 따뜻했다. 그 온도가 등에서 천천히 번져서 가슴까지 내려왔다.

저녁엔 유연이랑 숙소에서 넷플릭스를 봤다. 심해 다큐멘터리. 화면 속 심해어가 어둠 속에서 빛을 내며 떠다니는 장면에서 둘 다 아무 말이 없었다. 유연이 옆에서는 침묵이 어색하지 않다. 오히려 그 침묵 안에 쉬는 느낌이 있어서 편하다.

연습실 출퇴근 영상에 내 하품 장면이 올라갔다. 순간 당황했는데, 댓글에 "피곤해 보여도 예쁘다"는 말이 먼저 달려 있었다. 누군가의 피곤함을 알아보고 감싸주는 일이 이렇게 가볍고 다정할 수 있다니.

잠들기 전에 혜린이한테 내일 캘린더 스크린샷을 보내야겠다. 내일도 바쁠 테니까. 바쁜 게 나쁘지 않으니까.`,
    secretNote: '혜린이한테 내일 연습 몇 시냐고 카톡 왔는데 나도 몰라서 매니저 오빠한테 몰래 물어봤다.',
    themeLineColor: 'rgba(20,184,166,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '서연이 언제나 팀의 중심이 되어줘서 고맙다. 보컬 레슨 잘 받고 있다니 다행이야.' },
      { authorId: 'hyerin', authorName: '혜린', text: '...나경이 오른쪽 왼쪽 구분 아직도 헷갈려요 사실ㅋㅋ 근데 언니 저 캘린더 스크린샷 보내줘도 돼요 진심으로' },
      { authorId: 'jiwoo', authorName: '지우', text: '언니 저 그날 진짜 밤새운 거 맞아요ㅋㅋㅋ 근데 연습 잘 했잖아요! 그리고 떡볶이 보통맛 저랑 같이 먹으면 됐는데!! 다음엔 저 불러주세요' },
      { authorId: 'sumin', authorName: '수민', text: '서연 언니!! 저 안겼을 때 무겁다고 생각하신 거 알아요!! 근데 계속 안길 거예요!!! 사랑해요 언니!!!' },
      { authorId: 'chaeyeon', authorName: '채연', text: '캘린더 스크린샷 저한테도 좀 보내줘요 언니... 저도 자꾸 스케줄 까먹어서요. 같이 허당 클럽 합시다' },
      { authorId: 'naekyung', authorName: '나경', text: '언니 저 이제 오른쪽 왼쪽 다 알아요!! 다음에 틀리면 간식 살게요ㅋㅋ 약속!' },
      { authorId: 'yooyeon', authorName: '유연', text: '심해어 진짜 예뻤는데... 언니도 자고 나면 다시 보면 예쁠 수 있어. 그리고 하품도 예쁜 거 팬분들이 다 알아' },
      { authorId: 'dahyun', authorName: '다현', text: '서연 언니 바쁜 게 체질이라는 말 완전 공감해요!! 저도 그래요!! 그리고 볼 빨개지는 서연 언니 진짜 귀여웠을 것 같아요ㅎㅎ' },
      { authorId: 'kaede', authorName: '카에데', text: '떡볶이 보통맛... つらそう...(힘들 것 같아요...) 순한맛이 역시 정답!' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260219-hyerin',
    authorId: 'hyerin',
    authorName: '혜린',
    date: '2026-02-19',
    title: '혜린이의 매우 중요한 목요일 기록',
    mood: '😆',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFFFF0"/><circle cx="60" cy="55" r="18" fill="#87CEEB"/><circle cx="53" cy="50" r="5" fill="white"/><circle cx="67" cy="50" r="5" fill="white"/><circle cx="53" cy="50" r="2.5" fill="#333"/><circle cx="67" cy="50" r="2.5" fill="#333"/><path d="M 50 65 Q 60 75 70 65" stroke="#FF6B6B" stroke-width="2" fill="none"/><text x="40" y="93" font-size="10" fill="#87CEEB" font-family="sans-serif">나(큰눈!)</text><rect x="140" y="15" width="80" height="60" fill="#FFE4B5" stroke="#FFA500" stroke-width="2" rx="8"/><text x="150" y="43" font-size="11" fill="#FFA500" font-family="sans-serif">붕어빵!</text><text x="155" y="62" font-size="16" font-family="sans-serif">🐟🐟</text><circle cx="75" cy="150" r="12" fill="#FF69B4"/><circle cx="115" cy="155" r="12" fill="#98FB98"/><circle cx="155" cy="148" r="12" fill="#DDA0DD"/><text x="55" y="183" font-size="9" fill="#666" font-family="sans-serif">지우 수민 나경 = 시끄러움</text><rect x="205" y="115" width="80" height="50" fill="#E8E8FF" stroke="#7C3AED" stroke-width="2" rx="5"/><text x="215" y="138" font-size="9" fill="#7C3AED" font-family="sans-serif">거울 연습중</text><text x="225" y="153" font-size="8" fill="#999" font-family="sans-serif">(혼자서)</text></svg>`,
    content: `2월 19일 목요일.

아침 공기가 차가웠다. 숙소를 나서자마자 편의점 간판 불빛이 눈에 걸렸고, 그 옆에 붕어빵 포장마차가 김을 내뿜고 있었다. 팥 냄새. 2주 동안 슈크림만 먹어왔는데 오늘은 왜인지 팥이 끌렸다. 손끝이 차가워서 그런 건지, 아니면 그냥 익숙한 게 필요했던 건지. 잘 모르겠다. 어쨌든 샀다.

세 개 샀다. 하나는 걸으면서 먹었고, 하나는 가방에 넣었고, 하나는... 비밀이다. 근데 지우는 코가 귀신이라 냄새를 맡고 정확히 찾아왔다. 반을 뜯어줬다. 팥이 갈라지면서 김이 올라오는 순간, 그 따뜻한 공기가 둘 사이의 아침 인사를 대신했다.

오전 안무 연습. 센터 파트라 긴장이 됐다. 거울로 볼 때는 괜찮은 것 같은데, 영상으로 확인하면 늘 다르다. 내 리듬이 음악보다 반 박 빠른 건지, 아니면 내가 거울 속의 나를 너무 믿는 건지. 서연 언니가 옆에서 짧게 "좋다"고 했다. 그 한마디가 생각보다 오래 남았다. 칭찬에 약한 건 아닌데, 서연 언니의 칭찬은 좀 다르다. 무게감이 있달까.

점심은 찌개 논쟁이었다. 된장 vs 김치. 나는 된장을 골랐다. 시크하게. 수민이가 "한입만!"하면서 김치찌개를 내 코 앞에 가져왔는데, 짭짤한 냄새가 꽤 좋았다. 인정은 안 했지만.

오후에 혼자 거울 앞에서 표정 연습을 했다. 시크, 미소, 카리스마, 다시 시크. 한 표정씩 바꿀 때마다 거울 속의 내가 다른 사람이 되는 느낌이 좋았다. 그러다 나경이가 갑자기 문을 열고 들어왔다. 내가 쌓아둔 시크한 분위기가 3초 만에 증발했다. 어이없었다. 근데 웃겼다.

저녁은 라면. 네 명이 냄비 하나에 끓였다. 물을 더 넣자, 아니야 냄비를 나누자, 의견이 갈렸는데 결국 물을 너무 많이 넣어서 국물이 싱거워졌다. 그 싱거운 국물을 후루룩 마시면서 다음엔 진짜 제대로 끓이자고 했다. 매번 같은 말을 하는 것 같다.

인스타에 올린 하늘 사진에 "감성 미쳤다"는 댓글이 달렸다. 솔직히 그냥 예뻐서 찍은 건데, 누군가가 그 안에서 감성을 읽어준다는 게 묘한 기분이다. 내가 본 하늘을 다른 사람도 비슷하게 느낀다는 것. 그게 좋았다.

밤에 내일 촬영 준비 확인하고 누웠다. 이불 속이 따뜻했다. 오늘 남은 붕어빵 하나가 가방 안에서 식어 있을 텐데, 내일 아침에 먹어야지.`,
    secretNote: '붕어빵을 사실 3개 샀다. 한 개는 먹고 오면서, 한 개는 연습실에서, 한 개는 숨겨뒀다가 혼자 먹었다. 지우한테 1개만 줬다.',
    relatedEntries: ['diary-20260217-jbk'],
    themeLineColor: 'rgba(59,130,246,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '붕어빵은 역시 팥이 맞다. 경험에서 우러나온 진리다.' },
      { authorId: 'jiwoo', authorName: '지우', text: 'ㅋㅋㅋㅋ 언니 저 붕어빵 반만 뺏은 거예요!! 다 뺏은 게 아니라!! 내일 3개 사면 하나는 진짜 제 거예요 약속' },
      { authorId: 'seoyeon', authorName: '서연', text: '혜린이 킬링파트 진짜 좋아~ 거짓말 아니야. 그리고 시크하기도 하고 웃기기도 한 게 혜린이 매력이지 ㅎㅎ' },
      { authorId: 'sumin', authorName: '수민', text: '혜린 언니!! 된장찌개 시크하게 고집하는 거 완전 언니다워요!! 근데 제 김치찌개 맛있었죠?!?! 다음엔 같이 시켜요!!' },
      { authorId: 'chaeyeon', authorName: '채연', text: '시크한데 웃음 많은 게 혜린이잖아~ 팬분들 다 알고 오히려 더 좋아하는 것 같던데? 나는 확실히 알아' },
      { authorId: 'naekyung', authorName: '나경', text: '언니 저 들어갔을 때 거울 앞에서 표정 연습하던 거ㅋㅋㅋ 귀여웠어요!! 근데 언니 표정 연습 결과가 저한테 자꾸 무섭게 느껴져요 왜일까요' },
      { authorId: 'yubin', authorName: '유빈', text: '팥 붕어빵이 정답이에요.' },
      { authorId: 'kaede', authorName: '카에데', text: '붕어빵... あんこ派です！(저 팥파예요!) 혜린이상이랑 같은 편 🎉' },
      { authorId: 'yooyeon', authorName: '유연', text: '시크함과 웃음의 공존... 그게 혜린이의 본질이야. 라면 냄비 두 개는 다음엔 꼭 그렇게 하자' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260220-jiwoo',
    authorId: 'jiwoo',
    authorName: '지우',
    date: '2026-02-20',
    title: '먹고 춤추고 또 먹은 하루',
    mood: '🤪',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFFDE7"/><circle cx="70" cy="48" r="15" fill="#FF69B4"/><line x1="70" y1="63" x2="70" y2="108" stroke="#333" stroke-width="3"/><line x1="70" y1="80" x2="48" y2="63" stroke="#333" stroke-width="3"/><line x1="70" y1="80" x2="97" y2="68" stroke="#333" stroke-width="3"/><line x1="70" y1="108" x2="55" y2="140" stroke="#333" stroke-width="3"/><line x1="70" y1="108" x2="85" y2="140" stroke="#333" stroke-width="3"/><text x="50" y="160" font-size="10" fill="#FF69B4" font-family="sans-serif">나(춤중)</text><rect x="130" y="22" width="80" height="58" fill="#FFCDD2" stroke="#E91E63" stroke-width="2" rx="8"/><text x="140" y="48" font-size="12" fill="#E91E63" font-family="sans-serif">치킨 🍗</text><text x="140" y="67" font-size="10" fill="#E91E63" font-family="sans-serif">+ 콜라 🥤</text><ellipse cx="245" cy="52" rx="38" ry="27" fill="#C8E6C9" stroke="#4CAF50" stroke-width="2"/><text x="220" y="48" font-size="9" fill="#4CAF50" font-family="sans-serif">편의점</text><text x="220" y="62" font-size="9" fill="#4CAF50" font-family="sans-serif">3만원...</text><rect x="25" y="165" width="250" height="25" fill="#E3F2FD" stroke="#2196F3" stroke-width="1" rx="5"/><text x="55" y="182" font-size="11" fill="#2196F3" font-family="sans-serif">오늘 칼로리: 계산 불가 😋</text></svg>`,
    content: `2월 20일 금요일!!!

아 진짜, 알람은 아직도 나랑 안 친하다. 세 번을 울렸는데도 이불이 나를 안 놓아줘서, 결국 채연 언니가 방문 밖에서 "지우야!!!" 다섯 번째 부른 다음에야 눈이 떠졌다. (언니는 세 번이라고 하는데 다섯 번 맞음. 내가 세었음. 반쯤 잠든 상태에서.)

편의점에서 삼각김밥 두 개를 집었다. 참치마요 하나, 불고기 하나. 두 손에 하나씩 들고 바나나우유를 겨드랑이에 끼고 걸었다. 참치마요를 한 입 베어 물었을 때 불고기 냄새가 코끝에 먼저 닿아서, 다음 한 입이 기다려지는 이상한 행복이 있었다. 먹는 게 이렇게 좋은 건 타고난 거라고 생각한다. 진지하게.

오전 안무 연습에서 첫 시도부터 박자가 어긋났다. 한 박자 앞서갔다가 한 박자 늦었다. 내 몸이 음악보다 먼저 가고 싶어 하는 건 장점이기도 하고 단점이기도 하다. 안무 선생님이 "에너지 컨트롤"이라는 말을 했다. 팔을 조금만 작게 뻗으라고. 근데 작게 뻗으면 그게 나인가? 하는 생각이 잠깐 들었다가, 연습이니까 일단 해보자는 쪽으로 몸이 먼저 움직였다. 생각보다 경험이 항상 먼저인 게 나다.

점심은 치킨!!! 회사 근처에 새로 생긴 치킨집이었는데, 간판 색깔부터 맛있어 보였다. 후라이드 한 마리를 시켰는데, 첫 입에 바삭하는 소리가 귀에서 울렸다. 그 다음 양념 소스를 찍어 먹었을 때 매콤한 열기가 목을 타고 내려가는 느낌. 콜라 한 모금이 그 열기를 식혀주는 타이밍까지 완벽했다. 수민이랑 같이 먹었는데, 둘이서 "행복하다"를 동시에 말해서 웃음이 터졌다.

배가 터질 것 같았는데 수민이한테 "나 더 먹을 수 있어"라고 했다. 왜 그랬을까. 근데 진짜로 더 먹었다. 후회는... 조금. 아니 많이.

오후 연습에서 아까 말한 에너지 컨트롤을 연습했다. 팔을 작게 뻗는 게 이렇게 어려운 줄 몰랐다. 서연 언니가 "팔 좀 작게"를 다섯 번은 말한 것 같다. 근데 마지막에 "그래도 지우의 에너지가 매력"이라고 해줘서, 그 말이 발끝까지 전해졌다.

퇴근하고 편의점에서 간식을 또 샀다. 2만원어치. 나경이가 "언니 그거 절약 아니에요"라고 했는데, 맞는 말이라 할 말이 없었다. 근데 맛있으면 된 거 아닌가?

숙소에서 유튜브 먹방을 봤다. 또 배고파졌다. 아까 그렇게 먹었는데. 내 위장은 진짜 블랙홀인 것 같다. 내일은 뭘 먹지? 생각하다가 잠들었다. 꿈에서도 먹고 있었으면 좋겠다.`,
    secretNote: '치킨 먹고 나서 배가 너무 불렀는데 수민이한테 \'나 더 먹을 수 있어\'라고 했다. 실제로 더 먹었다. 후회한다.',
    relatedEntries: ['diary-20260221-chaeyeon'],
    themeLineColor: 'rgba(249,115,22,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '경비 처리는 안 됩니다. 앞으로도. 그리고 에너지 컨트롤 연습도 좀 부탁한다.' },
      { authorId: 'seoyeon', authorName: '서연', text: '지우야 "팔 좀 작게" 다섯 번 말한 거 맞아ㅋㅋ 근데 그게 지우 매력이기도 하니까 컨트롤만 잘 하면 돼!' },
      { authorId: 'hyerin', authorName: '혜린', text: '...내 붕어빵은 반 줬는데 팥이 싫었어도 맛있게 먹어줘서 고마워. 그래도 다음엔 슈크림도 사줄게' },
      { authorId: 'chaeyeon', authorName: '채연', text: '지우야 아침에 다섯번 불렀어 세 번이 아니라ㅋㅋ 근데 그 치킨 나도 먹을 걸ㅠㅠ 샐러드 먹으면서 지우 치킨 보고 있었잖아' },
      { authorId: 'sumin', authorName: '수민', text: '치킨!!! 같이 먹어서 진짜 행복했어!!! 한 마리 반도 부족했어 솔직히!! 다음엔 두 마리 시키자!!! 먹킷리스트 동지 영원히!!!' },
      { authorId: 'yooyeon', authorName: '유연', text: '치킨에서 에너지를 받아 팬들에게 전하는 선순환의 철학... 지우 사실 굉장히 깊은 사람이야' },
      { authorId: 'naekyung', authorName: '나경', text: '언니 2만원도 절약 아니에요ㅋㅋㅋ 근데 언니 에너지 저도 항상 받아가요! 옆에 있으면 저도 신나거든요!' },
      { authorId: 'yubin', authorName: '유빈', text: '절약은 2만원이 아니에요.' },
      { authorId: 'kaede', authorName: '카에데', text: '참치마요+불고기 同時に食べた！(동시에 먹어봤어요!) ちょっと...でも美味しかったです(좀 그렇지만 맛있었어요)ㅋㅋ' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260221-chaeyeon',
    authorId: 'chaeyeon',
    authorName: '채연',
    date: '2026-02-21',
    title: '언니인데 왜 자꾸 놀림당하지',
    mood: '💅',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFF0F5"/><circle cx="150" cy="43" r="18" fill="#DDA0DD"/><path d="M 138 38 Q 143 33 148 38" stroke="#333" stroke-width="1.5" fill="none"/><path d="M 152 38 Q 157 33 162 38" stroke="#333" stroke-width="1.5" fill="none"/><path d="M 142 50 Q 150 58 158 50" stroke="#FF69B4" stroke-width="2" fill="none"/><line x1="150" y1="61" x2="150" y2="113" stroke="#333" stroke-width="3"/><line x1="150" y1="78" x2="123" y2="93" stroke="#333" stroke-width="3"/><line x1="150" y1="78" x2="177" y2="93" stroke="#333" stroke-width="3"/><text x="136" y="138" font-size="10" fill="#DDA0DD" font-family="sans-serif">나(예쁜)</text><rect x="15" y="25" width="70" height="42" fill="#FFE0EC" stroke="#FF1493" stroke-width="2" rx="8"/><text x="22" y="44" font-size="9" fill="#FF1493" font-family="sans-serif">거울 확인</text><text x="33" y="60" font-size="13" font-family="sans-serif">✨👀</text><circle cx="55" cy="150" r="11" fill="#87CEEB"/><circle cx="87" cy="157" r="11" fill="#98FB98"/><circle cx="119" cy="149" r="11" fill="#FFB347"/><text x="35" y="183" font-size="9" fill="#666" font-family="sans-serif">동생들 (놀리는 중)</text><rect x="208" y="80" width="80" height="52" fill="#FFF8DC" stroke="#DAA520" stroke-width="2" rx="5"/><text x="216" y="103" font-size="10" fill="#DAA520" font-family="sans-serif">탕후루🍡</text><text x="216" y="119" font-size="8" fill="#DAA520" font-family="sans-serif">내꺼인데...</text></svg>`,
    content: `2월 21일 토요일.

아침에 거울 앞에 섰다. 거울은 늘 냉정한데, 오늘은 좀 달랐다. 피부 결이 또렷하고, 앞머리 한 가닥이 빛을 받는 각도가 마음에 들었다. "오늘 나 좀 예쁜데?"라는 생각이 먼저 들고, 바로 뒤에 "아니, 항상 예쁘지"가 따라왔다. 자신감이라고 하면 좀 그렇지만, 거울 앞에서 나를 좋아하는 시간이 하루를 시작하는 데 꽤 중요하다고 진지하게 생각한다.

연습실에 들어서니 공기가 금방 뜨거워졌다. 새 안무의 동선이 격했다. 턴이 많고 동작이 크고, 땀이 이마를 타고 흘렀다. 세팅 스프레이를 뿌리면서 화장이 떨어질까 걱정했는데, 사실 화장보다 중요한 건 거울 앞에서 내 동작이 음악과 맞아떨어지는 그 순간의 감각이었다. 그게 맞으면 화장 따윈 상관없다. 물론 안 떨어지면 더 좋지만.

점심에 샐러드를 골랐다. 건강하게 먹겠다는 다짐으로. 근데 지우가 바로 옆에서 돈까스를 시켰다. 그 튀김 냄새가 내 샐러드 위로 날아왔다. 참다가 결국 한 조각을 집어먹었다. "한 입만"이라고 했는데 그 한 입이 꽤 컸다. 지우는 웃기만 했다. 착한 애.

오후에 팬미팅 리허설이 있었다. 카메라 앞에서 "팬분들 보고 싶었고, 설레고..."까지 말했는데, 갑자기 재채기가 터졌다. 하필 그 타이밍에. 멤버들이 전부 웃었고 나도 결국 웃었다. 민망했는데, 나경이가 "언니 그게 제일 자연스러웠어요"라고 해서 더 민망했다. 근데 그 자연스러움이 나쁘지 않다는 건 나도 안다.

연습이 끝나고 동생들이 놀렸다. 익숙하다. 이제 놀림을 받는 것도 일종의 애정 표현이라고 생각하기로 했다. 최연장자의 품격은 이런 데서 나오는 거다. 아마도.

저녁에 딸기 탕후루를 샀다. 설탕 코팅이 조명 아래에서 반짝거렸다. 사진을 찍으려고 각도를 바꿨다. 한 번, 두 번, 세 번... 열일곱 번. 딱 맞는 각도를 찾았을 때 혜린이가 "언니 그냥 찍어요"라고 했다. 타이밍이 정확했다. 그래서 그 순간에 셔터를 눌렀는데, 솔직히 제일 예쁘게 나왔다.

탕후루를 한 입 깨물었다. 설탕이 깨지는 소리가 났고, 안에서 딸기의 새콤함이 터져 나왔다. 차가운 저녁 공기 속에서 그 달콤함이 유난히 선명했다.

숙소로 돌아오는 길에 유연이가 말했다. "오늘 빛났어." 짧은 말이었다. 근데 유연이가 그런 말을 할 때는 진심이라는 걸 안다. 그래서 더 오래 남았다. 거울 앞에서 나를 좋아하는 것과, 누군가가 나를 보고 빛났다고 말해주는 것은 다른 종류의 따뜻함이다. 둘 다 필요하고, 오늘은 둘 다 있었다.`,
    secretNote: '탕후루 사진 찍을 때 각도를 17번 바꿨다. 말하기 부끄럽지만 사실이다.',
    relatedEntries: ['diary-20260219-hyerin'],
    themeLineColor: 'rgba(236,72,153,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '채연아, 재채기도 무대도 다 잘했다. 그리고 대표님 다크서클 지적 감사히 기억하고 있다.' },
      { authorId: 'seoyeon', authorName: '서연', text: '채연아 오늘 진짜 빛났어~ 유연이만 알아챈 게 아니라 나도 봤어. 그리고 재채기 타이밍은... 좀 웃겼다ㅋㅋ 사랑해' },
      { authorId: 'hyerin', authorName: '혜린', text: '...돈까스 3분의 1 먹은 거 지우가 저한테 다 얘기했어요. 그리고 탕후루 사진 진짜 예쁘게 나왔던데' },
      { authorId: 'jiwoo', authorName: '지우', text: '언니ㅠㅠ 제 돈까스!! 근데 맛있게 드셨으면 됐어요 사랑해요ㅋㅋ 재채기 진짜 귀여웠어요 예쁘다고 할게요!' },
      { authorId: 'sumin', authorName: '수민', text: '채연 언니!! 제가 "항상 예쁜데요" 라고 한 게 진심이에요!! 근데 "오늘 특히"도 추가할게요!! 오늘 특히 예뻤어요!!!!!' },
      { authorId: 'yooyeon', authorName: '유연', text: '오늘 진짜 빛났어. 자신감이 예쁨을 더 빛나게 한다는 걸 채연이 보면 알 수 있어' },
      { authorId: 'naekyung', authorName: '나경', text: '언니 재채기 저 킥킥 웃었는데 언니도 같이 웃어줘서 고마워요ㅋㅋ 언니가 제일 귀여운 최연장자예요!' },
      { authorId: 'kaede', authorName: '카에데', text: '탕후루の写真、SNSで見ました！とても素敵でした！(사진 SNS에서 봤어요! 정말 예뻤어요!)' },
      { authorId: 'yubin', authorName: '유빈', text: '귀엽다 말고 예쁘다... 둘 다예요.' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260222-yooyeon',
    authorId: 'yooyeon',
    authorName: '유연',
    date: '2026-02-22',
    title: '느리게 흐른 일요일에 대하여',
    mood: '🌙',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#F5F0FF"/><circle cx="255" cy="32" r="22" fill="#FFF8DC" stroke="#FFD700" stroke-width="1.5"/><circle cx="48" cy="90" r="15" fill="#E6E6FA"/><line x1="48" y1="105" x2="48" y2="150" stroke="#333" stroke-width="2.5"/><line x1="48" y1="122" x2="28" y2="137" stroke="#333" stroke-width="2.5"/><line x1="48" y1="122" x2="68" y2="112" stroke="#333" stroke-width="2.5"/><rect x="62" y="100" width="32" height="22" fill="#FFDAB9" stroke="#333" stroke-width="1.5" rx="3"/><text x="67" y="115" font-size="8" fill="#333" font-family="sans-serif">일기</text><text x="33" y="175" font-size="10" fill="#9370DB" font-family="sans-serif">나(쓰는중)</text><path d="M 120 58 Q 160 18 200 58 Q 240 98 200 138 Q 160 178 120 138 Q 80 98 120 58" stroke="#DDA0DD" stroke-width="2" fill="none" stroke-dasharray="4,4"/><text x="140" y="98" font-size="10" fill="#9370DB" font-family="sans-serif">오늘의</text><text x="143" y="113" font-size="10" fill="#9370DB" font-family="sans-serif">감정들</text><circle cx="185" cy="170" r="4" fill="#FF69B4"/><circle cx="200" cy="164" r="4" fill="#87CEEB"/><circle cx="215" cy="172" r="4" fill="#98FB98"/><text x="175" y="192" font-size="8" fill="#999" font-family="sans-serif">작은 행복들 ✨</text></svg>`,
    content: `2026년 2월 22일, 일요일.

바람이 적은 날이었다. 창문을 열지 않았는데도 빛이 커튼 틈으로 조용히 들어와 이불 위에서 물감처럼 번졌다. 급할 일이 없는 아침이라는 것을 몸이 먼저 알았다. 손끝 하나 움직이지 않고도 하루가 천천히 시작되는 느낌. 이런 날은 드물어서 더 소중하다.

브런치로 식빵에 딸기잼을 얇게 펴 발랐다. 칼끝에 묻은 잼이 빵 위에서 천천히 퍼져나가는 걸 보는 시간조차 여유로웠다. 따뜻한 우유를 한 모금 마셨다. 입안에서 금방 가라앉는 그 부드러움. 서연이가 맞은편에 앉아서 같은 것을 먹고 있었는데, 아무 말이 없었다. 서연이와의 침묵은 어떤 대화보다 편안하다. 말이 없어도 서로의 존재를 느끼고 있다는 것을 아는 관계. 그게 얼마나 귀한 건지 생각했다.

오전에 SecretBase 영상을 돌려봤다. 같은 날짜를 함께 걷고 있는 멤버들이 각자 전혀 다른 빛을 간직하고 있다는 것이 새삼스러웠다. 누군가에게 평범한 하루가 누군가에게는 전환점이 되기도 한다. 같은 시간을 살아도 다른 온도를 품고 있다는 것. 그 사실이 아프지 않고 아름다웠다.

오후에 숙소 근처 카페에 갔다. 카모마일 차를 시키고 창가 자리에 앉았다. 노트를 꺼내서 가사를 썼다. 정확히는 단어를 나열했다. 문장이 되는 것도 있었고, 끝내 지워진 것도 있었다. 옆 테이블 사람이 한 번 쳐다본 것 같아서 10분 동안 신경이 쓰였다. 내 글을 봤을까. 아마 아닐 거다. 하지만 글을 쓰는 일은 늘 조금은 벌거벗는 기분이 든다.

채연이에게 "오늘 빛났어"라고 말했다. 어제 리허설에서 재채기를 하면서도 웃을 수 있었던 그 자연스러움이 진짜 빛이라고 생각했기 때문이다. 예쁜 것과 빛나는 것은 다르다. 예쁜 건 눈으로 보이지만, 빛나는 건 마음으로 느끼는 거다. 채연이는 둘 다인 사람이지만, 본인은 아마 예쁜 쪽만 알고 있을 것이다.

저녁에 숙소 거실에 모였다. 소현이의 공룡 인형이 소파 위에 있었고, 주빈이의 잠옷이 의자에 걸려 있었다. 이런 작은 흔적들이 모여서 하나의 공간을 만든다는 것. 정리되지 않은 거실이 오히려 살아 있는 느낌을 줬다.

잠들기 전에 한 가지 좋은 기억을 떠올려보는 습관이 있다. 오늘의 것은 아침의 침묵이었다. 서연이와 마주 앉아 아무 말 없이 딸기잼을 바르던 그 시간. 스케줄이 가득하지 않은 날에도 마음은 빈칸으로 비지 않는다. 오히려 여백이 있는 날에 더 많은 것을 느낀다. 그게 오늘 알게 된 것이다.`,
    secretNote: '카페에서 가사 쓰다가 옆 테이블 사람이 힐끔 쳐다봤는데 혹시 내 글 봤을까봐 10분 동안 신경 쓰였다.',
    themeLineColor: 'rgba(139,92,246,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '오늘 같은 날의 기록이 나중에 제일 소중한 것들이 된다. 가사도 언젠가 꼭 완성해봐.' },
      { authorId: 'seoyeon', authorName: '서연', text: '유연아 딸기잼 식빵 같이 먹어줘서 고마워~ 아무 말 없이 있어도 편한 사람이 유연이야 ㅎㅎ 일기 읽으면서 또 행복해졌어' },
      { authorId: 'hyerin', authorName: '혜린', text: '...코토네 "먀" 해석 시도 227일째. 오늘도 포기했다' },
      { authorId: 'jiwoo', authorName: '지우', text: '유연이가 가사 쓴다는 거 진짜예요?? 저 보여주세요!! 그 가사 노래로 만들어요!! 제가 춤 만들어드릴게요ㅋㅋ' },
      { authorId: 'chaeyeon', authorName: '채연', text: '유연이가 "오늘 빛났어"라고 해줬을 때 진짜 눈물 날 뻔했어. 진심으로 해주는 말이라 더 큰 것 같아. 고마워 유연아' },
      { authorId: 'sumin', authorName: '수민', text: '소현이 공룡 인형!! 저도 봤어요!! 진짜 너무 귀엽잖아요!!! 주빈이 잠옷도!! 우리 숙소 귀여움 max야!!!' },
      { authorId: 'naekyung', authorName: '나경', text: '저 20살 됐어요!! 유연 언니 옆에서 응원해줘서 더 기뻤어요 진짜로. 언니 가사 완성되면 저 꼭 들려줘요!' },
      { authorId: 'yubin', authorName: '유빈', text: '잠들기 전 한 가지 좋은 기억... 오늘 것은 유연이 일기예요.' },
      { authorId: 'kaede', authorName: '카에데', text: '深海魚... わたしも見ました！かわいくなかったですか！(심해어 저도 봤어요! 귀엽지 않았나요?)' },
      { authorId: 'dahyun', authorName: '다현', text: '유연이 일기 읽고 저도 오늘 좋은 거 하나 생각해봤어요. 바로 이 일기 읽은 것!! 행복해졌어요 진짜!!' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
  {
    id: 'diary-20260223-sumin',
    authorId: 'sumin',
    authorName: '수민',
    date: '2026-02-23',
    title: '넘어지고 웃고 또 넘어진 월요일',
    mood: '😂',
    svgDrawing: `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#FFFEF5"/><circle cx="75" cy="38" r="15" fill="#FF69B4"/><path d="M 68 35 Q 73 30 78 35" stroke="#333" stroke-width="1.5" fill="none"/><path d="M 68 35 Q 73 40 78 35" stroke="#333" stroke-width="1.5" fill="none"/><path d="M 68 43 Q 76 53 84 43" stroke="#FF1493" stroke-width="2" fill="none"/><line x1="75" y1="53" x2="75" y2="98" stroke="#333" stroke-width="3"/><line x1="75" y1="98" x2="60" y2="130" stroke="#333" stroke-width="3"/><line x1="75" y1="98" x2="90" y2="133" stroke="#333" stroke-width="3"/><path d="M 90 133 L 98 123" stroke="#FF0000" stroke-width="2"/><text x="80" y="110" font-size="9" fill="#FF0000" font-family="sans-serif">쿵!</text><text x="53" y="153" font-size="10" fill="#FF69B4" font-family="sans-serif">나(넘어짐)</text><rect x="155" y="18" width="105" height="62" fill="#E8F5E9" stroke="#4CAF50" stroke-width="2" rx="8"/><text x="163" y="42" font-size="10" fill="#4CAF50" font-family="sans-serif">시그널 라이브</text><text x="172" y="60" font-size="13" font-family="sans-serif">📹✨🎤</text><rect x="165" y="110" width="100" height="58" fill="#FFF3E0" stroke="#FF9800" stroke-width="2" rx="8"/><text x="175" y="133" font-size="11" fill="#FF9800" font-family="sans-serif">떡볶이 🌶️</text><text x="175" y="153" font-size="9" fill="#FF9800" font-family="sans-serif">+ 순대 + 튀김</text><text x="15" y="190" font-size="11" fill="#E91E63" font-family="sans-serif">🤣 오늘도 실수 3회 달성!</text></svg>`,
    content: `2월 23일 월요일~!!!

아 진짜 오늘 대박이었다ㅋㅋㅋㅋ 아침부터 문턱이랑 전쟁이었어!! 화장실 나오다가 문턱에 발가락을 부딪쳤는데, 그 찌릿한 통증이 온몸으로 퍼지는 그 느낌 아시죠?! 근데 웃긴 건 3초 뒤에 또 숙소 현관 문턱에 걸렸다는 거ㅋㅋㅋ 내 발끝은 문턱 감지 기능이 꺼져 있는 것 같다. 진심으로.

시그널 라이브 촬영이 있었다!! 카메라 앞에 서면 긴장과 흥분이 동시에 오는데, 오늘은 흥분 쪽이 좀 더 셌다. 노래를 부르면서 팬분들의 실시간 댓글이 올라오는 걸 보는데, "수민 화이팅!!" 같은 글씨가 화면을 채울 때마다 가슴이 쿵쾅거렸다. 이 에너지를 어떻게 설명해야 할까. 누군가가 나를 응원하고 있다는 걸 실시간으로 느끼는 건, 무대 위에서만 가능한 종류의 떨림이다.

촬영 중에 안무 하다가 발이 살짝 미끄러졌다. 넘어질 뻔했는데, 그 순간 지우 언니가 옆에서 손끝으로 살짝 받쳐줬다. 1초도 안 되는 시간이었는데, 그 1초가 엄청 길게 느껴졌다. 균형이라는 게 혼자 서 있는 것만이 아니라 누군가가 잡아주는 것으로도 만들어진다는 걸, 발끝이 흔들리는 순간에 배웠다.

점심에 떡볶이를 먹었다!! 순대도 시키고 튀김도 시켰다!! 떡볶이 국물에 순대를 찍어 먹으면 세상에서 제일 맛있는 조합이 탄생한다는 거 다들 알죠?! 지우 언니랑 나란히 앉아서 후루룩 먹는데, 매운맛에 코가 빨개져서 서로 보고 웃었다.

오후 연습에서 점프 턴을 성공했다!!! 몇 주 동안 계속 틀렸던 그 파트인데 오늘 드디어 깔끔하게 착지한 거다!! 발이 바닥에 닿는 순간의 그 안정감. 선생님이 "좋다!"라고 했을 때 소리를 지를 뻔했다. 참았다. 근데 얼굴은 못 참았다. 세상에서 제일 환한 표정이었을 거다 분명.

저녁에 숙소로 돌아오다가 계단에서 또 휘청거렸다. 나경이가 뒤에서 봤다. 민망했다. 근데 안 넘어졌다!! 이건 오늘의 점프 턴처럼 반사신경의 승리라고 주장하고 싶다.

숙소에 누워서 오늘을 떠올렸다. 문턱에 부딪치고, 미끄러지고, 휘청거리고. 근데 그때마다 웃었다. 넘어져도 웃을 수 있는 건 아마 주변에 같이 웃어줄 사람들이 있어서인 것 같다. 팬분들한테 전할 말은 오늘도 크지 않다. 넘어져도 괜찮아요. 웃으면 되니까요. 그리고 옆에 누군가가 있으면 더 괜찮아요.

코토네가 "먀"라고 했다. 무슨 뜻인지는 227일째 모르겠다. 근데 그게 좋다.`,
    secretNote: '오늘 실수를 4번 했다. 일기에는 3번이라고 썼다. 계단에서 또 한 번 더 있었는데 너무 창피해서 뺐다.',
    relatedEntries: ['diary-20260220-jiwoo'],
    themeLineColor: 'rgba(244,63,94,0.18)',
    comments: [
      { authorId: 'jbk', authorName: '정병기', text: '점프 턴 성공 축하한다. 계단은 좀 조심해라. 진심으로.' },
      { authorId: 'seoyeon', authorName: '서연', text: '수민아 안겼을 때 무겁다고 생각 안 했어~ 사실 조금... 아니야 농담이야ㅋㅋ 점프 턴 성공 진짜 자랑스러워!' },
      { authorId: 'hyerin', authorName: '혜린', text: '...문턱 vs 수민 무한반복. 아직까지 문턱이 이기고 있는 것 같다. 근데 반사신경 해석은 맞는 것 같기도' },
      { authorId: 'jiwoo', authorName: '지우', text: '내가 잡아줬으니까 안 넘어진 거야 수민아!! 우리 오늘 떡볶이 진짜 맛있었지!! 순대도!! 튀김도!! 내일도 가자!!' },
      { authorId: 'chaeyeon', authorName: '채연', text: '점프 턴 성공한 수민이 너무 귀여웠어~ 나도 그 파트 아직 연습 중인데 수민이 보고 용기 얻었어. 고마워!' },
      { authorId: 'yooyeon', authorName: '유연', text: '넘어지지 않는 반사신경... 수민 패러독스의 진짜 정체는 탁월한 균형감각이야. 철학적으로 맞는 해석이다' },
      { authorId: 'naekyung', authorName: '나경', text: '언니 계단에서도 휘청거린 거 저 봤어요ㅋㅋㅋ 근데 안 넘어진 거 진짜 대단해요!! 점프 턴 성공 축하해요!!!' },
      { authorId: 'yubin', authorName: '유빈', text: '코토네 "먀" 뜻을 알고 있습니다. 말 안 합니다.' },
      { authorId: 'kaede', authorName: '카에데', text: '수민이상 넘어지ない技術...すごいですね！(넘어지지 않는 기술... 대단해요!) 떡볶이도 먹고 싶어요' },
      { authorId: 'dahyun', authorName: '다현', text: '수민이 에너지 항상 받아가고 있어요!! 시그널 라이브 진짜 재밌었고 점프 턴 성공 넘나 대단해요!!!!' },
      { authorId: 'kotone', authorName: '코토네', text: '먀' },
    ],
  },
];
