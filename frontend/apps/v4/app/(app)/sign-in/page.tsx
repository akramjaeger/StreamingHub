import Link from "next/link"

import { SignInForm } from "./sign-in-form"

export default function SignInPage() {
  return (
    <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue watching and manage your list.
          </p>
        </div>
        <SignInForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Do not have an account? <Link href="/sign-up" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
