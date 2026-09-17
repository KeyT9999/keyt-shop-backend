import re
import fugashi
import unidic_lite
import jaconv

# Initialize global Tagger
_tagger = None

def get_tagger():
    global _tagger
    if _tagger is None:
        _tagger = fugashi.Tagger()
    return _tagger

# Kana to Romaji mapping table
KANA_ROMAJI_MAP = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
    'っ': 'q', 'ー': '-'
}

def clean_japanese_text(text: str) -> str:
    """Removes spaces, punctuation and symbols from Japanese text."""
    if not text:
        return ""
    # Remove whitespace, punctuation (both ASCII and Japanese full-width)
    return re.sub(r'[\s\n\r\t。、,.!?！？「」『』（）()【】\[\]・〜~…—\-]', '', text)

def split_into_moras(hiragana: str) -> list[str]:
    """
    Splits a hiragana string into its constituent moras.
    E.g. "がっこう" -> ["が", "っ", "こ", "う"]
         "きょう" -> ["きょう"]
    """
    moras = []
    i = 0
    small_kana = set('ゃゅょぁぃぅぇぉャュョァィゥェォ')
    while i < len(hiragana):
        char = hiragana[i]
        # Check if next character is small kana (digraph)
        if i + 1 < len(hiragana) and hiragana[i + 1] in small_kana:
            moras.append(char + hiragana[i + 1])
            i += 2
        else:
            moras.append(char)
            i += 1
    return moras

def kana_to_romaji(kana_str: str) -> str:
    """Converts Hiragana/Katakana string into readable Romaji."""
    hira = jaconv.kata2hira(kana_str)
    moras = split_into_moras(hira)
    romaji_parts = []
    for m in moras:
        if m in KANA_ROMAJI_MAP:
            romaji_parts.append(KANA_ROMAJI_MAP[m])
        else:
            romaji_parts.append(m)
    return "".join(romaji_parts)

def analyze_japanese_text(text: str) -> dict:
    """
    Parses a Japanese text into segmented words, readings, and mora breakdown.
    Returns:
      tokens: list of {
        surface: str,
        reading: str (hiragana),
        pronunciation: str (hiragana phonology),
        romaji: str,
        moras: list[str],
        pos: str
      }
      full_hiragana: str
      full_pronunciation: str
      total_moras: int
    """
    tagger = get_tagger()
    raw_tokens = tagger(text)
    
    tokens = []
    full_hira_parts = []
    full_pron_parts = []
    all_moras = []

    for w in raw_tokens:
        surface = w.surface
        # Skip pure punctuation
        clean_surface = clean_japanese_text(surface)
        if not clean_surface:
            continue

        feature = w.feature
        # Katakana reading & pronunciation
        kana = getattr(feature, 'kana', None) or surface
        pron = getattr(feature, 'pron', None) or kana

        # Convert to Hiragana
        hira_reading = jaconv.kata2hira(kana)
        hira_pron = jaconv.kata2hira(pron)

        moras = split_into_moras(hira_pron)
        romaji = kana_to_romaji(hira_pron)
        pos = getattr(feature, 'pos1', '')

        tokens.append({
            "surface": surface,
            "reading": hira_reading,
            "pronunciation": hira_pron,
            "romaji": romaji,
            "moras": moras,
            "pos": pos
        })

        full_hira_parts.append(hira_reading)
        full_pron_parts.append(hira_pron)
        all_moras.extend(moras)

    return {
        "tokens": tokens,
        "full_hiragana": "".join(full_hira_parts),
        "full_pronunciation": "".join(full_pron_parts),
        "all_moras": all_moras,
        "total_moras": len(all_moras)
    }
