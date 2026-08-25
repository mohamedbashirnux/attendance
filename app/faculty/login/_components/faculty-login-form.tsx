"use client"

import * as React from "react"
import { useActionState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FacultyRow } from "@/lib/types"
import { facultyLoginAction } from "@/lib/backend_faculty_user/auth/login"

type State = { errors?: Record<string, string[]>; error?: string }

export function FacultyLoginForm({
  faculties,
  className,
  ...props
}: React.ComponentProps<"div"> & { faculties: FacultyRow[] }) {
  const [facultyId, setFacultyId] = React.useState("")
  const [state, formAction, pending] = useActionState<State | undefined, FormData>(
    facultyLoginAction,
    undefined
  )

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Faculty Login</CardTitle>
          <CardDescription>
            Select your faculty, then enter your username and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="faculty_id">Faculty</FieldLabel>
                <Select
                  value={facultyId || undefined}
                  onValueChange={(v) => setFacultyId(v ?? "")}
                >
                  <SelectTrigger id="faculty_id" className="w-full">
                    <SelectValue>
                      {(val) => {
                        const f = faculties.find((x) => String(x.id) === val)
                        return f ? f.faculty_name : "Select faculty"
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.faculty_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="faculty_id" value={facultyId} />
                {state?.errors?.faculty_id?.[0] && (
                  <p className="text-sm text-destructive">
                    {state.errors.faculty_id[0]}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  placeholder="faculty1"
                  required
                />
                {state?.errors?.username?.[0] && (
                  <p className="text-sm text-destructive">
                    {state.errors.username[0]}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required />
                {state?.errors?.password?.[0] && (
                  <p className="text-sm text-destructive">
                    {state.errors.password[0]}
                  </p>
                )}
              </Field>
              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Logging in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
