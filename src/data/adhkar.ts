export type AdhkarCategory =
  | "morning"
  | "evening"
  | "post_prayer"
  | "sleep"
  | "waking"
  | "home"
  | "travel"
  | "forgiveness"
  | "ruqyah"
  | "quranic";

export interface AdhkarItem {
  id: string;
  category: AdhkarCategory;
  arabicText: string;
  englishMeaning: string;
  repeatCount: number;
  sourceType: "quran" | "hadith";
  sourceTitle: string;
  sourceUrl?: string;
  reference: string;
  notes?: string;
}

// Curated starter dataset. Canonical text is read-only in the UI.
export const ADHKAR_LIST: AdhkarItem[] = [
  {
    id: "morning_radhitu",
    category: "morning",
    arabicText: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
    englishMeaning: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace and blessings of Allah be upon him) as my Prophet.",
    repeatCount: 3,
    sourceType: "hadith",
    sourceTitle: "Hisn al-Muslim 87",
    sourceUrl: "https://sunnah.com/hisn:87",
    reference: "Ahmad 4/337; An-Nasa'i; At-Tirmidhi 5/465",
    notes: "Recited three times in the morning and evening.",
  },
  {
    id: "evening_radhitu",
    category: "evening",
    arabicText: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
    englishMeaning: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace and blessings of Allah be upon him) as my Prophet.",
    repeatCount: 3,
    sourceType: "hadith",
    sourceTitle: "Hisn al-Muslim 87",
    sourceUrl: "https://sunnah.com/hisn:87",
    reference: "Ahmad 4/337; An-Nasa'i; At-Tirmidhi 5/465",
    notes: "Recited three times in the morning and evening.",
  },
  {
    id: "post_prayer_tasbih",
    category: "post_prayer",
    arabicText: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ",
    englishMeaning: "Glory is to Allah, praise is to Allah, Allah is the Greatest.",
    repeatCount: 33,
    sourceType: "hadith",
    sourceTitle: "Sahih Muslim 597a",
    sourceUrl: "https://sunnah.com/muslim:597a",
    reference: "Sahih Muslim 597a",
    notes: "The report mentions saying each phrase thirty-three times, then completing one hundred.",
  },
  {
    id: "sleep_bismika",
    category: "sleep",
    arabicText: "بِاسْمِكَ أَمُوتُ وَأَحْيَا",
    englishMeaning: "In Your name, I die and I live.",
    repeatCount: 1,
    sourceType: "hadith",
    sourceTitle: "Sahih al-Bukhari 6312",
    sourceUrl: "https://sunnah.com/bukhari:6312",
    reference: "Sahih al-Bukhari 6312",
  },
  {
    id: "waking_alhamdulillah",
    category: "waking",
    arabicText: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    englishMeaning: "All praise is due to Allah, Who has brought us back to life after causing us to die, and to Him is the return.",
    repeatCount: 1,
    sourceType: "hadith",
    sourceTitle: "Sahih al-Bukhari 6312",
    sourceUrl: "https://sunnah.com/bukhari:6312",
    reference: "Sahih al-Bukhari 6312",
  },
  {
    id: "home_entering",
    category: "home",
    arabicText: "إِذَا دَخَلَ الرَّجُلُ بَيْتَهُ فَذَكَرَ اللَّهَ عِنْدَ دُخُولِهِ وَعِنْدَ طَعَامِهِ",
    englishMeaning: "When a person enters his home and mentions Allah when entering and when eating.",
    repeatCount: 1,
    sourceType: "hadith",
    sourceTitle: "Sahih Muslim 2018a",
    sourceUrl: "https://sunnah.com/muslim:2018a",
    reference: "Sahih Muslim 2018a",
    notes: "This is the relevant narrated wording; it is not a user-authored supplication.",
  },
  {
    id: "travel_dua",
    category: "travel",
    arabicText: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ. اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ وَكَآبَةِ الْمَنْظَرِ وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ.",
    englishMeaning: "Glory be to Him Who has subjected this to us, and we could not have subdued it. Indeed, to our Lord we will return. O Allah, we ask You for righteousness and piety during this journey and for deeds that please You. Make this journey easy for us and shorten its distance. You are our Companion in travel and Guardian of our family. I seek refuge in You from the hardships of travel, distressing sights, and a bad return concerning wealth and family.",
    repeatCount: 1,
    sourceType: "hadith",
    sourceTitle: "Sahih Muslim 1342",
    sourceUrl: "https://sunnah.com/muslim:1342",
    reference: "Sahih Muslim 1342",
  },
  {
    id: "forgiveness_sayyid",
    category: "forgiveness",
    arabicText: "اللَّهُمَّ أَنْتَ رَبِّي، لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
    englishMeaning: "O Allah, You are my Lord; there is no deity except You. You created me and I am Your servant. I keep Your covenant and promise as much as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.",
    repeatCount: 1,
    sourceType: "hadith",
    sourceTitle: "Sahih al-Bukhari 6306",
    sourceUrl: "https://sunnah.com/bukhari:6306",
    reference: "Sahih al-Bukhari 6306",
  },
  {
    id: "ruqyah_fatihah",
    category: "ruqyah",
    arabicText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    englishMeaning: "In the name of Allah, the Most Compassionate, Most Merciful. All praise is for Allah, Lord of the worlds... Guide us along the Straight Path, the path of those You have blessed—not those You are displeased with, or those who are astray.",
    repeatCount: 1,
    sourceType: "quran",
    sourceTitle: "Surah Al-Fatihah 1:1–7",
    sourceUrl: "https://quran.com/1",
    reference: "Quran 1:1–7; the use of Al-Fatihah as ruqyah is narrated in Sahih al-Bukhari 5736",
    notes: "Ruqyah is a religious practice; it is not a substitute for professional medical care.",
  },
  {
    id: "quranic_rabbana_dunya",
    category: "quranic",
    arabicText: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    englishMeaning: "Our Lord! Grant us the good of this world and the Hereafter, and protect us from the torment of the Fire.",
    repeatCount: 1,
    sourceType: "quran",
    sourceTitle: "Surah Al-Baqarah 2:201",
    sourceUrl: "https://quran.com/2/201",
    reference: "Quran 2:201",
  },
];
