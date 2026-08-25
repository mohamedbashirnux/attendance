"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"

export function DepartmentFilter({
  departments,
  current,
}: {
  departments: DepartmentRow[]
  current?: string
}) {
  const router = useRouter()
  const value = current && current !== "all" ? current : "all"

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        const params = new URLSearchParams()
        if (val && val !== "all") params.set("departmentId", val)
        const qs = params.toString()
        router.push(qs ? `/faculty_user?${qs}` : "/faculty_user")
      }}
    >
      <SelectTrigger className="w-60">
        <SelectValue>
          {(val) => {
            if (!val || val === "all") return "All Departments"
            const d = departments.find((x) => String(x.id) === String(val))
            return d ? d.department_name : "All Departments"
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {departments.map((d) => (
          <SelectItem key={d.id} value={String(d.id)}>
            {d.department_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
