export type SbuSchoolAcronym =
  | "CAS"
  | "COB"
  | "CEAS"
  | "SoCJ"
  | "SHP"
  | "SoMAS"
  | "SON"
  | "SSW";

export const SBU_SCHOOL_NAMES: Record<SbuSchoolAcronym, string> = {
  CAS: "College of Arts and Sciences",
  COB: "College of Business",
  CEAS: "College of Engineering and Applied Sciences",
  SoCJ: "School of Communication and Journalism",
  SHP: "School of Health Professions",
  SoMAS: "School of Marine and Atmospheric Sciences",
  SON: "School of Nursing",
  SSW: "School of Social Welfare",
};

export const SBU_MAJOR_TO_SCHOOL: Record<string, SbuSchoolAcronym> = {
  // CAS
  "Africana Studies, BA": "CAS",
  "Anthropology, BA": "CAS",
  "Art History and Criticism, BA": "CAS",
  "Art, Studio, BA": "CAS",
  "Asian and Asian American Studies, BA": "CAS",
  "Astronomy/Planetary Sciences, BS": "CAS",
  "Biochemistry, BS": "CAS",
  "Biology, BA": "CAS",
  "Biology, BS": "CAS",
  "Chemistry, BA": "CAS",
  "Chemistry, BS": "CAS",
  "Creative Writing, BFA": "CAS",
  "Earth and Space Sciences, BA": "CAS",
  "Economics, BA": "CAS",
  "English, BA": "CAS",
  "French, BA": "CAS",
  "Geology, BS": "CAS",
  "Globalization Studies and International Relations, BA": "CAS",
  "History, BA": "CAS",
  "Human Evolutionary Biology, BS": "CAS",
  "Italian Studies, BA": "CAS",
  "Linguistics, BA": "CAS",
  "Mathematics, BS": "CAS",
  "Media/Art/Culture, BA": "CAS",
  "Multidisciplinary Studies, BA": "CAS",
  "Music, BA": "CAS",
  "Philosophy, BA": "CAS",
  "Physics, BS": "CAS",
  "Political Science, BA": "CAS",
  "Psychology, BA": "CAS",
  "Psychology, BS": "CAS",
  "Rhetoric and Writing, BA": "CAS",
  "Sociology, BA": "CAS",
  "Spanish Language and Literature, BA": "CAS",
  "Women’s and Gender Studies, BA": "CAS",

  // COB
  "Accounting, BS": "COB",
  "Business Management, BS": "COB",

  // CEAS
  "Applied Mathematics and Statistics, BS": "CEAS",
  "Biomedical Engineering, BE": "CEAS",
  "Chemical and Molecular Engineering, BE": "CEAS",
  "Civil Engineering, BE": "CEAS",
  "Computer Engineering, BE": "CEAS",
  "Computer Science, BS": "CEAS",
  "Data Science, BS": "CEAS",
  "Electrical Engineering Online, BS": "CEAS",
  "Electrical Engineering, BE": "CEAS",
  "Engineering Chemistry, BS": "CEAS",
  "Engineering Science, BE": "CEAS",
  "Information Systems, BS": "CEAS",
  "Mechanical Engineering, BE": "CEAS",
  "Technological Systems Management, BS": "CEAS",

  // SoCJ
  "Communication, BA": "SoCJ",
  "Journalism, BA": "SoCJ",
  "Mass Communication, BS": "SoCJ",

  // SHP
  "Clinical Laboratory Sciences, BS": "SHP",
  "Health Science, BS": "SHP",
  "Respiratory Care, BS": "SHP",

  // SoMAS
  "Atmospheric and Oceanic Sciences, BS": "SoMAS",
  "Climate Science, BS": "SoMAS",
  "Coastal Environmental Studies, BS": "SoMAS",
  "Ecosystems and Human Impact, BA": "SoMAS",
  "Environmental Design, Policy, and Planning, BA": "SoMAS",
  "Environmental Humanities, BA": "SoMAS",
  "Environmental Studies, BA": "SoMAS",
  "Marine Sciences, BS": "SoMAS",
  "Marine Vertebrate Biology, BS": "SoMAS",
  "Sustainability Studies, BA": "SoMAS",

  // SON
  "Nursing, BS": "SON",

  // SSW
  "Social Work, BS": "SSW",
};

/** Helper to get the acronym for a major */
export function getSchoolAcronym(major: string): SbuSchoolAcronym | undefined {
  return SBU_MAJOR_TO_SCHOOL[major.trim()];
}

/** Helper to get the full school name for a major */
export function getFullSchoolName(major: string): string | undefined {
  const acronym = getSchoolAcronym(major);
  return acronym ? SBU_SCHOOL_NAMES[acronym] : undefined;
}
