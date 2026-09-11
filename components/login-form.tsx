"use client"

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
import { loginAction } from "@/lib/backend_super_admin/auth/login"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type State = { errors?: Record<string, string[]>; error?: string }

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction, pending] = useActionState<State | undefined, FormData>(
    loginAction,
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
          <CardTitle className="text-xl">Admin login</CardTitle>
          <CardDescription className="mt-1">
            Enter your username and password to login
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  placeholder="admin"
                  required
                />
                {state?.errors?.username?.[0] && (
                  <p className="text-sm text-destructive">
                    {state.errors.username[0]}
                  </p>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
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
