
import re

def extract_legal_entities(text: str):
    acts = []
    sections = []
    courts = []
    dates = []
    parties = []

    try:
        # -------------------- PARTIES (ULTIMATE FIX) --------------------
        lines = text.split('\n')

        # ✅ 1. VERTICAL FORMAT (Plaintiff / Defendant)
        for i, line in enumerate(lines):
            line = line.strip()

            if "plaintiff" in line.lower():
                for j in range(i-1, max(i-6, -1), -1):
                    name = lines[j].strip()

                    if re.match(r'^(Mr\.|Ms\.|Mrs\.|Dr\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$', name):
                        if name not in parties:
                            parties.append(name)
                        break

            if "defendant" in line.lower():
                for j in range(i-1, max(i-6, -1), -1):
                    name = lines[j].strip()

                    if re.match(r'^(Mr\.|Ms\.|Mrs\.|Dr\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$', name):
                        if name not in parties:
                            parties.append(name)
                        break

        # ✅ 2. INLINE FORMAT (...Plaintiff)
        inline_patterns = [
            r"([A-Z][A-Za-z\s]+?)\s+\.{2,}\s*Plaintiff",
            r"([A-Z][A-Za-z\s]+?)\s+\.{2,}\s*Defendant",
        ]

        for pattern in inline_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            for match in matches:
                name = match.strip()
                name = re.sub(r'\band another\b', '', name, flags=re.IGNORECASE).strip()

                if len(name.split()) >= 2 and name not in parties:
                    parties.append(name)

        # ✅ 3. VERSUS FORMAT
        versus_match = re.search(
            r"([A-Z][A-Za-z\s]+?)\s+Versus\s+([A-Z][A-Za-z\s]+)",
            text,
            flags=re.IGNORECASE
        )

        if versus_match:
            p1 = re.sub(r'\band another\b', '', versus_match.group(1), flags=re.IGNORECASE).strip()
            p2 = versus_match.group(2).strip()

            for name in [p1, p2]:
                if len(name.split()) >= 2 and name not in parties:
                    parties.append(name)

        # ✅ 4. FINAL CLEANUP
        cleaned = []
        for p in parties:
            p = p.strip()

            if any(word in p.lower() for word in [
                "plaintiff", "defendant", "petitioners", "respondent", "versus"
            ]):
                continue

            if re.match(r'^(Mr\.|Ms\.|Mrs\.|Dr\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$', p):
                if p not in cleaned:
                    cleaned.append(p)

        parties = cleaned

        # -------------------- COURTS --------------------
        court_patterns = [
            r"\bIN THE (?:HIGH COURT|SUPREME COURT|DISTRICT COURT|SESSIONS COURT|COURT)\s+OF\s+[A-Z\s,]+(?:\s+AT\s+[A-Z\s,]+)?\b",
            r"\bDistrict Court\b",
            r"\bSessions Court\b",
            r"\bMagistrate\b",
            r"\bTribunal\b"
        ]

        for pattern in court_patterns:
            matches = re.findall(pattern, text[:1000], flags=re.IGNORECASE)
            for match in matches:
                match = match.strip()
                if match not in courts:
                    courts.append(match)

        # -------------------- DATES --------------------
        # date_patterns = [
        #     r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        #     r"\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
        #     r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{4}\b"
        # ]

        # for pattern in date_patterns:
        #     matches = re.findall(pattern, text, flags=re.IGNORECASE)
        #     for match in matches:
        #         if isinstance(match, tuple):
        #             match = " ".join(match)
        #         match = match.strip()
        #         if match not in dates:
        #             dates.append(match)
        date_patterns = [
            r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
            r"\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
            r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{4}\b"
        ]

        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                match = match.strip()
                if match not in dates:
                    dates.append(match)


        # -------------------- SECTIONS --------------------
        section_pattern = r"Section\s+(\d+[A-Za-z]?)"
        for match in re.findall(section_pattern, text, flags=re.IGNORECASE):
            sec = f"Section {match.strip()}"
            if sec not in sections:
                sections.append(sec)

        # -------------------- ACTS --------------------
        act_patterns = [
            r"([A-Z][A-Za-z ]+ Act,? ?\d{4})",
            r"\b(Indian Contract Act, 1872)\b",
            r"\b(Code of Civil Procedure, 1908)\b",
            r"\b(Indian Evidence Act, 1872)\b",
        ]

        for pattern in act_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            for match in matches:
                match = match.strip()
                if match not in acts:
                    acts.append(match)

        primary_act = acts[0] if acts else ""

    except Exception as e:
        print(f"Entity extraction error: {e}")

    return {
        "act": primary_act,
        "sections": sections,
        "courts": courts,
        "dates": dates,
        "parties": parties
    }