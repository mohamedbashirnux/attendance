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
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type State = { errors?: Record<string, string[]>; error?: string }

export function FacultyLoginForm({
  faculties,
  className,
  ...props
}: React.ComponentProps<"div"> & { faculties: FacultyRow[] }) {
  const [facultyId, setFacultyId] = React.useState<string | null>(null)
  const [state, formAction, pending] = useActionState<State | undefined, FormData>(
    facultyLoginAction,
    undefined
  )

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to account selection
      </Link>
      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl">Faculty login</CardTitle>
          <CardDescription className="mt-1">
            Select your faculty, then enter your username and password
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="faculty_id">Faculty</FieldLabel>
                <Select
                  value={facultyId}
                  onValueChange={(v) => setFacultyId(v ?? null)}
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
                <input type="hidden" name="faculty_id" value={facultyId ?? ""} />
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
