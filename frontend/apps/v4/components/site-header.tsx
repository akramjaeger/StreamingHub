import { Suspense } from "react"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { source } from "@/lib/source"
import { Icons } from "@/components/icons"
import { MainNav } from "@/components/main-nav"
import { MobileNav } from "@/components/mobile-nav"
import { ModeSwitcher } from "@/components/mode-switcher"
import { NavbarMediaSearch } from "@/components/navbar-media-search"
import { NavbarAuthActions } from "@/components/navbar-auth-actions"
import { SiteConfig } from "@/components/site-config"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import { Button } from "@/styles/radix-nova/ui/button"
import { ProjectForm } from "@/app/(app)/create/components/project-form"
import { V0Button } from "@/app/(app)/create/components/v0-button"

export function SiteHeader() {
  const pageTree = source.pageTree

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none 3xl:fixed:px-0">
        <div className="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container">
          <MobileNav
            tree={pageTree}
            items={siteConfig.navItems}
            className="flex lg:hidden"
          />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden size-8 lg:flex"
          >
            <Link href="/">
              <Icons.logo className="size-5" />
              <span className="sr-only">{siteConfig.name}</span>
            </Link>
          </Button>
          <MainNav items={siteConfig.navItems} className="hidden lg:flex" />
          <div className="hidden flex-1 justify-center px-6 lg:flex">
            <NavbarMediaSearch />
          </div>
          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            <Separator
              orientation="vertical"
              className="hidden group-has-data-[slot=designer]/layout:hidden 3xl:flex"
            />
            <SiteConfig className="hidden 3xl:flex 3xl:group-has-data-[slot=designer]/layout:hidden" />
            <Separator orientation="vertical" />
            <ModeSwitcher />
            <div className="hidden items-center gap-2 group-has-data-[slot=designer]/layout:md:flex">
              <Separator orientation="vertical" />
              <Suspense fallback={null}>
                <V0Button />
              </Suspense>
              <Suspense fallback={null}>
                <ProjectForm />
              </Suspense>
            </div>
            <div className="hidden items-center gap-2 group-has-data-[slot=designer]/layout:flex group-has-data-[slot=designer]/layout:md:hidden">
              <Separator orientation="vertical" />
              <Suspense fallback={null}>
                <V0Button />
              </Suspense>
            </div>
            <div className="flex items-center gap-2 group-has-data-[slot=designer]/layout:hidden">
              <Separator orientation="vertical" />
              <NavbarAuthActions />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
