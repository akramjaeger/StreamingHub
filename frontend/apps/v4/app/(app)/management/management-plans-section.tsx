"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Label } from "@/registry/new-york-v4/ui/label"
import { Textarea } from "@/registry/new-york-v4/ui/textarea"

type ManagedPlan = {
  id: string
  slug: string
  name: string
  description: string
  price: string
  stripePriceId: string
  features: string[]
  active: boolean
  sortOrder: number
  createdAt: string
}

type PlansResponse = {
  message?: string
  plans?: ManagedPlan[]
  plan?: ManagedPlan
}

type DraftPlanState = {
  slug: string
  name: string
  description: string
  price: string
  stripePriceId: string
  features: string
  sortOrder: string
  active: boolean
}

const emptyDraftPlan = (): DraftPlanState => ({
  slug: "",
  name: "",
  description: "",
  price: "",
  stripePriceId: "",
  features: "",
  sortOrder: "0",
  active: true,
})

function parseApiResponse(response: Response) {
  return response.text().then((raw) => {
    try {
      return JSON.parse(raw) as PlansResponse
    } catch {
      throw new Error(response.ok ? "Unexpected server response" : "Server returned a non-JSON error response")
    }
  })
}

function featuresToText(features: string[]) {
  return features.join(", ")
}

export function ManagementPlansSection({ token }: { token: string }) {
  const [plans, setPlans] = useState<ManagedPlan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [plansMessage, setPlansMessage] = useState("")
  const [draftPlan, setDraftPlan] = useState<DraftPlanState>(emptyDraftPlan())
  const [editingPlanId, setEditingPlanId] = useState("")
  const [savingPlanId, setSavingPlanId] = useState("")
  const [deletingPlanId, setDeletingPlanId] = useState("")
  const [creatingPlan, setCreatingPlan] = useState(false)

  async function loadPlans(nextToken: string) {
    if (!nextToken) {
      return
    }

    setIsLoadingPlans(true)
    setPlansMessage("")

    try {
      const response = await fetch("/api/backend/admin/plans", {
        headers: {
          Authorization: `Bearer ${nextToken}`,
        },
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to load plans")
      }

      setPlans((data.plans || []).sort((left, right) => left.sortOrder - right.sortOrder))
    } catch (error) {
      setPlansMessage(error instanceof Error ? error.message : "Failed to load plans")
    } finally {
      setIsLoadingPlans(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadPlans(token)
    }
  }, [token])

  function beginEdit(plan: ManagedPlan) {
    setEditingPlanId(plan.id)
    setDraftPlan({
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      stripePriceId: plan.stripePriceId,
      features: featuresToText(plan.features),
      sortOrder: String(plan.sortOrder ?? 0),
      active: plan.active,
    })
    setPlansMessage("")
  }

  function cancelEdit() {
    setEditingPlanId("")
    setDraftPlan(emptyDraftPlan())
  }

  async function createPlan() {
    if (!token) {
      setPlansMessage("Sign in again to continue")
      return
    }

    setCreatingPlan(true)
    setPlansMessage("")

    try {
      const response = await fetch("/api/backend/admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draftPlan),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to create plan")
      }

      if (data.plan) {
        setPlans((current) => [data.plan as ManagedPlan, ...current].sort((left, right) => left.sortOrder - right.sortOrder))
      }

      setDraftPlan(emptyDraftPlan())
      setPlansMessage("Plan created successfully")
    } catch (error) {
      setPlansMessage(error instanceof Error ? error.message : "Failed to create plan")
    } finally {
      setCreatingPlan(false)
    }
  }

  async function savePlan(planId: string) {
    if (!token) {
      setPlansMessage("Sign in again to continue")
      return
    }

    setSavingPlanId(planId)
    setPlansMessage("")

    try {
      const response = await fetch(`/api/backend/admin/plans/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: draftPlan.slug,
          name: draftPlan.name,
          description: draftPlan.description,
          price: draftPlan.price,
          stripePriceId: draftPlan.stripePriceId,
          features: draftPlan.features,
          sortOrder: draftPlan.sortOrder,
          active: draftPlan.active,
        }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to update plan")
      }

      if (data.plan) {
        setPlans((current) =>
          current
            .map((plan) => (plan.id === planId ? (data.plan as ManagedPlan) : plan))
            .sort((left, right) => left.sortOrder - right.sortOrder)
        )
      }

      setPlansMessage("Plan updated successfully")
      cancelEdit()
    } catch (error) {
      setPlansMessage(error instanceof Error ? error.message : "Failed to update plan")
    } finally {
      setSavingPlanId("")
    }
  }

  async function deletePlan(plan: ManagedPlan) {
    if (!token) {
      setPlansMessage("Sign in again to continue")
      return
    }

    const confirmed = window.confirm(`Delete plan ${plan.name}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingPlanId(plan.id)
    setPlansMessage("")

    try {
      const response = await fetch(`/api/backend/admin/plans/${plan.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete plan")
      }

      setPlans((current) => current.filter((entry) => entry.id !== plan.id))
      if (editingPlanId === plan.id) {
        cancelEdit()
      }
      setPlansMessage("Plan deleted successfully")
    } catch (error) {
      setPlansMessage(error instanceof Error ? error.message : "Failed to delete plan")
    } finally {
      setDeletingPlanId("")
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Plan Management</h2>
          <p className="text-sm text-muted-foreground">Create, update, and remove subscription plans shown to users.</p>
        </div>
        <Button variant="outline" onClick={() => loadPlans(token)} disabled={isLoadingPlans || !token}>
          {isLoadingPlans ? "Refreshing..." : "Refresh Plans"}
        </Button>
      </div>

      {plansMessage ? <p className="text-sm text-muted-foreground">{plansMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Plan</CardTitle>
          <CardDescription>Fill in the fields below to add a new plan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new-plan-slug">Plan ID</Label>
            <Input
              id="new-plan-slug"
              value={draftPlan.slug}
              onChange={(event) => setDraftPlan((current) => ({ ...current, slug: event.target.value }))}
              placeholder="enterprise"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-plan-name">Name</Label>
            <Input
              id="new-plan-name"
              value={draftPlan.name}
              onChange={(event) => setDraftPlan((current) => ({ ...current, name: event.target.value }))}
              placeholder="Enterprise"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-plan-price">Price</Label>
            <Input
              id="new-plan-price"
              value={draftPlan.price}
              onChange={(event) => setDraftPlan((current) => ({ ...current, price: event.target.value }))}
              placeholder="$19.99/mo"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-plan-stripe">Stripe Price ID</Label>
            <Input
              id="new-plan-stripe"
              value={draftPlan.stripePriceId}
              onChange={(event) => setDraftPlan((current) => ({ ...current, stripePriceId: event.target.value }))}
              placeholder="price_123"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="new-plan-description">Description</Label>
            <Textarea
              id="new-plan-description"
              value={draftPlan.description}
              onChange={(event) => setDraftPlan((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe the plan benefits"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="new-plan-features">Features</Label>
            <Textarea
              id="new-plan-features"
              value={draftPlan.features}
              onChange={(event) => setDraftPlan((current) => ({ ...current, features: event.target.value }))}
              placeholder="Feature one, Feature two, Feature three"
              disabled={creatingPlan}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-plan-sort">Sort Order</Label>
            <Input
              id="new-plan-sort"
              type="number"
              value={draftPlan.sortOrder}
              onChange={(event) => setDraftPlan((current) => ({ ...current, sortOrder: event.target.value }))}
              disabled={creatingPlan}
            />
          </div>
          <div className="flex items-end gap-3 pt-2 md:justify-end">
            <Button onClick={createPlan} disabled={creatingPlan || !token}>
              {creatingPlan ? "Creating..." : "Add Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const isEditing = editingPlanId === plan.id
          const isBusy = savingPlanId === plan.id || deletingPlanId === plan.id

          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Hidden</Badge>}
                    </div>
                    <CardDescription>{plan.id}</CardDescription>
                  </div>
                  <p className="text-xl font-semibold tracking-tight">{plan.price}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`plan-slug-${plan.id}`}>Plan ID</Label>
                      <Input
                        id={`plan-slug-${plan.id}`}
                        value={draftPlan.slug}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, slug: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`plan-name-${plan.id}`}>Name</Label>
                      <Input
                        id={`plan-name-${plan.id}`}
                        value={draftPlan.name}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, name: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`plan-price-${plan.id}`}>Price</Label>
                      <Input
                        id={`plan-price-${plan.id}`}
                        value={draftPlan.price}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, price: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`plan-stripe-${plan.id}`}>Stripe Price ID</Label>
                      <Input
                        id={`plan-stripe-${plan.id}`}
                        value={draftPlan.stripePriceId}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, stripePriceId: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor={`plan-description-${plan.id}`}>Description</Label>
                      <Textarea
                        id={`plan-description-${plan.id}`}
                        value={draftPlan.description}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, description: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor={`plan-features-${plan.id}`}>Features</Label>
                      <Textarea
                        id={`plan-features-${plan.id}`}
                        value={draftPlan.features}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, features: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`plan-sort-${plan.id}`}>Sort Order</Label>
                      <Input
                        id={`plan-sort-${plan.id}`}
                        type="number"
                        value={draftPlan.sortOrder}
                        onChange={(event) => setDraftPlan((current) => ({ ...current, sortOrder: event.target.value }))}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="flex items-end gap-3 md:justify-end">
                      <Button size="sm" onClick={() => savePlan(plan.id)} disabled={isBusy || draftPlan.name.trim().length < 2}>
                        {savingPlanId === plan.id ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isBusy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Stripe Price ID:</span> {plan.stripePriceId}
                      </p>
                      <p>
                        <span className="font-medium">Features:</span> {featuresToText(plan.features) || "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => beginEdit(plan)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePlan(plan)} disabled={deletingPlanId === plan.id}>
                        {deletingPlanId === plan.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}

        {!plans.length && !isLoadingPlans ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No plans found.</CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
