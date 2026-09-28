export const EXAM_CATEGORY_TYPES = [
  { value: "state_government", label: "State Government" },
  { value: "central_government", label: "Central Government" },
  { value: "psc", label: "PSC" },
  { value: "private", label: "Private" },
  { value: "others", label: "Others" },
] as const;

export type ExamCategoryType = (typeof EXAM_CATEGORY_TYPES)[number]["value"];

export const EXAM_CATEGORY_TYPE_VALUES = EXAM_CATEGORY_TYPES.map((t) => t.value) as [
  ExamCategoryType,
  ...ExamCategoryType[],
];

export function examCategoryTypeLabel(value?: string | null) {
  return EXAM_CATEGORY_TYPES.find((t) => t.value === value)?.label ?? "Others";
}
