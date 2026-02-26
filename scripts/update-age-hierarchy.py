#!/usr/bin/env python3
"""Update 나이 위계 in all api-personality.json and group-chat.js files."""

import json
import os
import re

# ===== BIRTH YEAR DATA (verified from kprofiles.com + Reddit) =====
# Format: member_id -> (korean_name, birth_year, birth_date)
MEMBERS = {
    "seoyeon": ("서연", 2003, "2003.08.06"),    # S1 윤서연
    "hyerin":  ("혜린", 2007, "2007.04.12"),    # S2 정혜린
    "jiwoo":   ("지우", 2005, "2005.10.24"),    # S3 이지우
    "chaeyeon":("채연", 2004, "2004.12.04"),    # S4 김채연 (NOT 2000!)
    "yooyeon": ("유연", 2001, "2001.02.09"),    # S5 김유연
    "sumin":   ("수민", 2007, "2007.10.03"),    # S6 김수민
    "naekyung":("나경", 2002, "2002.10.13"),    # S7 김나경
    "yubin":   ("유빈", 2005, "2005.02.03"),    # S8 공유빈
    "kaede":   ("카에데",2005, "2005.12.20"),   # S9 카에데
    "dahyun":  ("다현", 2003, "2003.01.08"),    # S10 서다현
    "kotone":  ("코토네",2004, "2004.03.10"),   # S11 코토네
    "yeonji":  ("연지", 2008, "2008.01.08"),    # S12 곽연지
    "nien":    ("니엔", 2003, "2003.06.02"),    # S13 니엔
    "sohyun":  ("소현", 2002, "2002.10.13"),    # S14 박소현
    "shinwi":  ("신위", 2002, "2002.05.25"),    # S15 신위
    "mayu":    ("마유", 2002, "2002.05.12"),    # S16 마유
    "rin":     ("린",   2006, "2006.04.12"),    # S17 린
    "jubin":   ("주빈", 2009, "2009.01.16"),    # S18 주빈
    "hayeon":  ("하연", 2007, "2007.08.01"),    # S19 정하연
    "sion":    ("시온", 2006, "2006.04.03"),    # S20 박시온
    "chaewon": ("채원", 2007, "2007.05.02"),    # S21 김채원
    "seollin": ("설린", 2006, "2006.11.30"),    # S22 설린
    "seoa":    ("서아", 2010, "2010.06.11"),    # S23 서아
    "jiyeon":  ("지연", 2004, "2004.02.13"),    # S24 지연
}

# Build year-grouped dict
from collections import defaultdict
by_year = defaultdict(list)
for mid, (name, yr, _) in MEMBERS.items():
    by_year[yr].append((mid, name))

def get_hierarchy_note(member_id):
    """Generate 나이 위계 note for a given member."""
    my_name, my_year, _ = MEMBERS[member_id]
    
    # Who's older (언니)
    older = [(yr, [(mid, nm) for mid, nm in by_year[yr]]) 
             for yr in sorted(by_year.keys()) if yr < my_year]
    
    # Who's same age (동갑)
    same = [(mid, nm) for mid, nm in by_year[my_year] if mid != member_id]
    
    # Who's younger (후배)
    younger = [(yr, [(mid, nm) for mid, nm in by_year[yr]])
               for yr in sorted(by_year.keys()) if yr > my_year]
    
    # Special case: 막내 서아 (2010)
    if my_year == 2010:
        return "⚠️ 나이 위계: 01~09즈 언니들 전원한테 존댓말+언니 호칭. 동갑·후배 없음 — 그룹 내 막내!"
    
    # Special case: 유연 (2001) - 맏언니
    if my_year == 2001:
        all_juniors = []
        for yr in sorted(by_year.keys()):
            if yr > my_year:
                names = '·'.join(nm for _, nm in by_year[yr])
                all_juniors.append(f"{names}({str(yr)[-2:]})")
        return f"⚠️ 나이 위계: 그룹 맏언니(01년생) — 전원 후배. {', '.join(all_juniors)} 모두 반말 가능."
    
    # Build older note - group by year
    older_parts = []
    for yr, members in older:
        yr_short = str(yr)[-2:]
        if len(members) == 1:
            older_parts.append(f"{members[0][1]} 언니({yr_short})")
        else:
            names = '·'.join(nm for _, nm in members)
            older_parts.append(f"{names}({yr_short})")
    
    # Build same-age note
    same_note = ""
    if same:
        same_names = '·'.join(nm for _, nm in same)
        same_yr = str(my_year)[-2:]
        same_note = f" {same_names}({same_yr}동갑)와는 반말."
    
    # Build younger note - group into clusters
    if younger:
        younger_clusters = []
        for yr, members in younger:
            yr_short = str(yr)[-2:]
            names = '·'.join(nm for _, nm in members)
            younger_clusters.append(f"{names}({yr_short})")
        younger_note = f" {', '.join(younger_clusters)} 후배한테는 반말."
    else:
        younger_note = ""
    
    return f"⚠️ 나이 위계: {', '.join(older_parts)}한테는 존댓말+언니 호칭.{same_note}{younger_note}"


def update_api_personality(member_id):
    """Update api-personality.json for a member."""
    path = f"/Users/gimseojun/triples-chat/public/idols/{member_id}/api-personality.json"
    if not os.path.exists(path):
        print(f"[SKIP] {member_id}: no api-personality.json")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    old_style = data.get("speakingStyle", "")
    hierarchy_note = get_hierarchy_note(member_id)
    
    # Remove any existing 나이 위계 note
    new_style = re.sub(r'\s*⚠️ 나이 위계[^.]*\.?[^.]*\.?[^.]*\.?[^⚠️]*', '', old_style).strip()
    
    # Append the new note
    data["speakingStyle"] = new_style + " " + hierarchy_note
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] {member_id} ({MEMBERS[member_id][0]}, {MEMBERS[member_id][1]}년생): {hierarchy_note[:80]}...")


# Run updates for api-personality.json files
IDOLS_DIR = "/Users/gimseojun/triples-chat/public/idols"
api_json_members = []
for d in os.listdir(IDOLS_DIR):
    path = os.path.join(IDOLS_DIR, d, "api-personality.json")
    if os.path.exists(path) and d in MEMBERS:
        api_json_members.append(d)

print("=== Updating api-personality.json files ===")
for mid in sorted(api_json_members):
    update_api_personality(mid)

# Print all hierarchy notes for verification
print("\n=== All 24 Members' 나이 위계 Notes ===")
for mid in sorted(MEMBERS.keys(), key=lambda x: (MEMBERS[x][1], MEMBERS[x][2])):
    name, year, date = MEMBERS[mid]
    note = get_hierarchy_note(mid)
    print(f"S{list(MEMBERS.keys()).index(mid)+1:02d} {name}({date}): {note[:100]}")

print("\nDone.")
