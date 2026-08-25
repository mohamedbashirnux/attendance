export const studyModeOptions = [
  { value: "Full_Time_Morning", label: "Full Time Morning" },
  { value: "Full_Time_Afternoon", label: "Full Time Afternoon" },
  { value: "Full_Time_Evening", label: "Full Time Evening" },
  { value: "Weekend", label: "Weekend" },
] as const

export const semesterOptions = [
  { value: "Semester_1", label: "Semester 1" },
  { value: "Semester_2", label: "Semester 2" },
  { value: "Semester_3", label: "Semester 3" },
  { value: "Semester_4", label: "Semester 4" },
  { value: "Semester_5", label: "Semester 5" },
  { value: "Semester_6", label: "Semester 6" },
  { value: "Semester_7", label: "Semester 7" },
  { value: "Semester_8", label: "Semester 8" },
  { value: "Semester_9", label: "Semester 9" },
  { value: "Semester_10", label: "Semester 10" },
  { value: "Semester_11", label: "Semester 11" },
  { value: "Semester_12", label: "Semester 12" },
  { value: "Semester_101", label: "Semester 101" },
  { value: "Semester_102", label: "Semester 102" },
] as const

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? value
}
