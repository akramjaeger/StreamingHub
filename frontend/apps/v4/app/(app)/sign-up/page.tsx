import Link from "next/link"

import { SignUpForm } from "./sign-up-form"

export default function SignUpPage() {
  return (
    <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Join now and start building your streaming experience.
          </p>
        </div>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
