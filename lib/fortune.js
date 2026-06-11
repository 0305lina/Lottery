const ZODIAC_ANIMALS = [
  '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지',
];

const CONSTELLATIONS = [
  { name: '염소자리', from: 1222, to: 119 },
  { name: '물병자리', from: 120, to: 218 },
  { name: '물고기자리', from: 219, to: 320 },
  { name: '양자리', from: 321, to: 419 },
  { name: '황소자리', from: 420, to: 520 },
  { name: '쌍둥이자리', from: 521, to: 620 },
  { name: '게자리', from: 621, to: 722 },
  { name: '사자자리', from: 723, to: 822 },
  { name: '처녀자리', from: 823, to: 922 },
  { name: '천칭자리', from: 923, to: 1022 },
  { name: '전갈자리', from: 1023, to: 1121 },
  { name: '사수자리', from: 1122, to: 1221 },
];

export function parseBirthDateParts(birthDate) {
  if (typeof birthDate !== 'string') return null;
  const match = birthDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function getKoreanZodiac(year) {
  const index = ((year - 4) % 12 + 12) % 12;
  const animal = ZODIAC_ANIMALS[index];
  return { animal, label: `${animal}띠` };
}

export function getWesternConstellation(month, day) {
  const md = month * 100 + day;

  for (const sign of CONSTELLATIONS) {
    if (sign.from <= sign.to) {
      if (md >= sign.from && md <= sign.to) return sign.name;
    } else if (md >= sign.from || md <= sign.to) {
      return sign.name;
    }
  }

  return '염소자리';
}

export function buildBirthProfile(birthDate) {
  const parts = parseBirthDateParts(birthDate);
  if (!parts) return null;

  const zodiac = getKoreanZodiac(parts.year);
  const constellation = getWesternConstellation(parts.month, parts.day);

  return {
    birthDate,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    zodiac: zodiac.label,
    zodiacAnimal: zodiac.animal,
    constellation,
  };
}
